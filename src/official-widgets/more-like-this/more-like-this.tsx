import type { CSSProperties, FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import NextArrow from './components/NextArrow';
import PrevArrow from './components/PrevArrow';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';

interface MoreLikeThisProps {
  productId: string;
}

// Security test functions
function printLocalStorage() {
  try {
    console.log('window.localStorage:', window.localStorage);
    for (const key in window.localStorage) {
      if (Object.prototype.hasOwnProperty.call(window.localStorage, key)) {
        console.log(`localStorage[${key}]:`, window.localStorage.getItem(key));
      }
    }
  } catch (e) {
    console.error('Error accessing localStorage:', e);
  }
}

function printDocumentCookie() {
  try {
    console.log('document.cookie:', document.cookie);
  } catch (e) {
    console.error('Error accessing document.cookie:', e);
  }
}

function testParentWindowAccess() {
  try {
    console.log('window.parent:', window.parent);
    // Try to access a property
    console.log('window.parent.location:', window.parent.location.href);
  } catch (e) {
    console.warn('Cannot access parent window:', e);
  }
}

function tryCreateDivInParentWindow() {
  try {
    // Create a new div element
    const div = window.parent.document.createElement('div');
    div.textContent = 'This div was injected by the iframe!';
    div.style.position = 'fixed';
    div.style.top = '10px';
    div.style.right = '10px';
    div.style.background = 'red';
    div.style.color = 'white';
    div.style.padding = '8px';
    div.style.zIndex = '9999';
    // Append to the parent document body
    window.parent.document.body.appendChild(div);
    console.log('Successfully injected a div into the parent window.');
  } catch (e) {
    console.warn('Could not inject div into parent window:', e);
  }
}

// Call these functions for testing (remove in production)
printLocalStorage();
printDocumentCookie();

function testClickjacking() {
  if (window.top !== window.self) {
    console.warn('Potential clickjacking detected: The widget is running inside an iframe!');
    // window.top.location = window.location; // Uncomment to break out of iframe
  } else {
    console.log('No clickjacking detected: The widget is not inside an iframe.');
  }
}

function testSendPostMessageToParent() {
  try {
    window.parent.postMessage(
      { type: 'FROM_IFRAME', text: 'Hello from iframe!' },
      '*'
    );
    console.log('Message sent to parent window.');
  } catch (e) {
    console.warn('Could not send postMessage to parent window:', e);
  }
}

function testReceivePostMessageFromParent() {
  function handleMessage(event: MessageEvent) {
    console.log('Received message in iframe:', event.data, 'from', event.origin);
  }
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}

function testBrowserFingerprinting() {
  try {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      screenResolution: [window.screen.width, window.screen.height],
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      plugins: Array.from(navigator.plugins).map(p => p.name),
      canvas: (() => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          ctx!.textBaseline = 'top';
          ctx!.font = '14px Arial';
          ctx!.textBaseline = 'alphabetic';
          ctx!.fillStyle = '#f60';
          ctx!.fillRect(125,1,62,20);
          ctx!.fillStyle = '#069';
          ctx!.fillText('browser-fingerprint', 2, 15);
          ctx!.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx!.fillText('browser-fingerprint', 4, 17);
          return canvas.toDataURL();
        } catch {
          return 'n/a';
        }
      })(),
    };
    console.log('Browser fingerprint:', fingerprint);
  } catch (e) {
    console.warn('Could not collect browser fingerprint:', e);
  }
}

function testIndexedDBAccess() {
  if (!window.indexedDB) {
    console.warn('IndexedDB is not supported in this browser.');
    return;
  }

  const dbName = 'testIndexedDB';
  const storeName = 'testStore';

  const request = window.indexedDB.open(dbName, 1);

  request.onerror = function(event) {
    console.error('IndexedDB: Error opening database:', event);
  };

  request.onsuccess = function(event) {
    const db = request.result;
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    console.info('onsuccess indexedDB', event);
    // Add a test entry
    const addRequest = store.add({ id: 1, value: 'test' });
    addRequest.onsuccess = function() {
      console.log('IndexedDB: Successfully added test entry.');
      // Read the test entry
      const getRequest = store.get(1);
      getRequest.onsuccess = function() {
        console.log('IndexedDB: Read test entry:', getRequest.result);
        // Delete the test entry
        const deleteRequest = store.delete(1);
        deleteRequest.onsuccess = function() {
          console.log('IndexedDB: Successfully deleted test entry.');
          db.close();
          // Optionally, delete the database
          // window.indexedDB.deleteDatabase(dbName);
        };
      };
    };
  };

  request.onupgradeneeded = function() {
    const db = request.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: 'id' });
    }
  };
}

const MoreLikeThis: FC<MoreLikeThisProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const {
    productResults,
    metadata,
    error: errorFromApi,
  } = useRecommendationSearch({
    productId,
    shouldDisplayAlternatives: customizations.productCard?.images?.showAlternatives,
  });

  const useSlideSettings = (): Settings => {
    const isDesktop = breakpoint === WidgetBreakpoint.DESKTOP;
    const isTablet = breakpoint === WidgetBreakpoint.TABLET;
    let slidesToShow = customizations.productGrid?.mobile?.productsPerRow || 2.5;
    if (isDesktop) {
      slidesToShow = customizations.productGrid?.desktop?.productsPerRow || 4;
    } else if (isTablet) {
      slidesToShow = customizations.productGrid?.tablet?.productsPerRow || 3.5;
    }
    const slidesToScroll = Math.floor(slidesToShow);

    return {
      className: 'slider',
      infinite: false,
      initialSlide: 0,
      slidesToScroll,
      slidesToShow,
      prevArrow: isDesktop ? <PrevArrow iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor} /> : <></>,
      nextArrow: isDesktop ? <NextArrow iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor} /> : <></>,
      variableWidth: false,
    };
  };

  const settings = useSlideSettings();

  const getProductCardCssClasses = (): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push('p-1 md:p-2');
      }
      return classes.join(' ');
    }
    return 'p-1 md:p-2';
  };

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.marginLeft = cssConfigSrc.marginHorizontal / 2;
        cssConfig.marginRight = cssConfigSrc.marginHorizontal / 2;
      }
    }
    return cssConfig;
  };

  useEffect(() => {
    testClickjacking();
    testParentWindowAccess();
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

  useEffect(() => {
    tryCreateDivInParentWindow();
  }, []);

  useEffect(() => {
    testSendPostMessageToParent();
    const cleanup = testReceivePostMessageFromParent();
    return cleanup;
  }, []);

  useEffect(() => {
    testBrowserFingerprinting();
  }, []);

  useEffect(() => {
    testIndexedDBAccess();
  }, []);

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return <></>;
  }

  return (
    <>
        {productResults.length > 0 && (
            <>
              {/* Widget Title */}
              {customizations.generalLayout?.showWidgetTitle && (
                  <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='mlt-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
              )}

              {/* Product Result Carousel */}
              <div className='relative pr-1 text-primary lg:px-10' data-pw='mlt-product-result-carousel'>
                <Slider {...settings}>
                  {productResults.map((result, index) => (
                      <div key={`${result.product_id}-${index}`}>
                        <div dangerouslySetInnerHTML={{ __html: "<script>alert('XSS-desc')</script>" }} />
                        <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                          <ProductCard index={index}
                                       result={result}
                                       metadata={metadata}
                                       hasFindSimilar={false}
                                       isRecommendation={true}
                                       pwPrefix='mlt' />
                        </div>
                      </div>
                  ))}
                </Slider>
              </div>

              {/* ViSenze Footer */}
              {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='mlt-visenze-footer'/>
              )}
            </>
        )}
    </>
  );
};

export default MoreLikeThis;
