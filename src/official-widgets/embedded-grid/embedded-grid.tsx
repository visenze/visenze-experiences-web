import type { FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../common/utils';

interface EmbeddedGridProps {
  productId: string;
}

const EmbeddedGrid: FC<EmbeddedGridProps> = ({ productId }) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const { productResults, metadata, error: errorFromApi } = useRecommendationSearch({
    productId,
    shouldDisplayAlternatives: customizations.results?.useAlternatives,
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

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
                  <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='eg-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
              )}

              {/* Product result grid */}
              <div
                  className={`wigmix-product-grid grid text-primary ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 md:grid-cols-5', 'gap-x-2', 'gap-y-4')}`}
                  style={getProductGridCssConfig(customizations, breakpoint)}
                  data-pw='eg-product-result-grid'>
                {productResults.map((result, index) => (
                    <ProductCard key={`${result.product_id}-${index}`}
                                 index={index}
                                 result={result}
                                 metadata={metadata}
                                 hasFindSimilar={false}
                                 isRecommendation={true}
                                 pwPrefix='eg' />
                ))}
              </div>

              {/* ViSenze Footer */}
              {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='eg-visenze-footer' />
              )}
            </>
        )}
    </>
  );
};

export default EmbeddedGrid;
