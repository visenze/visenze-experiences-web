import { memo, useContext, useEffect, useState } from 'react';
import { Button } from '@nextui-org/button';
import { v4 as uuid } from 'uuid';
import { Input } from '@nextui-org/input';
import { useIntl } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext } from '../../common/types/contexts';
import useRecommendMe from '../../common/components/hooks/use-recommend-me';
import Carousel from './components/Carousel';
import CarouselLoader from './components/CarouselLoader';
import { Actions, Category } from '../../common/types/tracking-constants';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';

const RecommendMe = memo((props: {
  config: WidgetConfig;
  productSearch: WidgetClient;
  productId: string;
}) => {
  const { config, productSearch, productId } = props;
  const [searchBarValue, setSearchBarValue] = useState('');
  const [query, setQueryValue] = useState('');
  const [carouselHistory, setCarouselHistory] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const root = useContext(RootContext);
  const intl = useIntl();

  const {
    productResults,
    recommendMeWithQuery,
    isStreaming,
    requestId,
  } = useRecommendMe({
    config,
    productSearch,
    productId,
  });

  const removeFromHistory = (carouselId: string): void => {
    setCarouselHistory((prev) => prev.filter((carousel) => carousel.key !== carouselId));
  };

  useEffect(() => {
    if (query && !isStreaming) {
      // Send Result Load event if there are product results returned
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
      };
      productSearch.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      productSearch.setLastTrackingMeta(requestMetadata);
      setMetadata(requestMetadata);

      // Prepend newly created carousel to carousel history
      const carouselId = uuid();
      setCarouselHistory((prev) => [
        <Carousel key={carouselId} results={productResults} searchValue={query} removeFromHistory={removeFromHistory.bind(this, carouselId)} />,
        ...prev,
      ]);
    }
  }, [isStreaming]);

  if (!root) {
    return <></>;
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        {config.customizations.generalLayout?.showWidgetTitle && (
          <div className='wigmix-widget-title py-4 text-primary' data-pw='rm-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
        )}

        {/* Search input bar with Recommend me button */}
        <div className='flex'>
          <Button
            className='w-48 rounded-l bg-buttonPrimary px-3 py-2 font-semibold'
            radius='none'
            disabled={!searchBarValue}
            onClick={() => {
              setQueryValue(searchBarValue);
              recommendMeWithQuery(searchBarValue);
            }}
            data-pw='rm-recommend-me-button'
          >
            <span className='text-buttonPrimary'>{intl.formatMessage({ id: 'searchBarButton' })}</span>
          </Button>
          <Input
            classNames={{
              inputWrapper: 'border-l-0 rounded-r bg-default-100 text-black',
            }}
            disabled={isStreaming}
            isClearable
            maxLength={QUERY_MAX_CHARACTER_LENGTH}
            autoComplete='off'
            variant='bordered'
            radius='none'
            value={searchBarValue}
            placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
            onValueChange={(value) => {
              setSearchBarValue(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchBarValue) {
                setQueryValue(searchBarValue);
                recommendMeWithQuery(searchBarValue);
              }
            }}
            data-pw='rm-recommend-me-search-bar'
          />
         </div>

        {/* Product card carousels */}
        <div className='flex flex-col'>
          {
            isStreaming
            && <CarouselLoader results={productResults} searchValue={query} />
          }
        </div>
        <div className='flex flex-col'>
          { ...carouselHistory }
        </div>
      </WidgetResultContext.Provider>
    </>
  );
});

export default RecommendMe;
