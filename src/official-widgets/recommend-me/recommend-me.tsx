import { type FC, useContext, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Input } from '@heroui/input';
import { useIntl } from 'react-intl';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import useRecommendMe from '../../common/components/hooks/use-recommend-me';
import Carousel from './components/Carousel';
import CarouselLoader from './components/CarouselLoader';
import { Actions, Category } from '../../common/types/tracking-constants';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import type { ProcessedProduct } from '../../common/types/product';

interface RecommendMeProps {
  productId: string;
}

interface CarouselHistory {
  carouselId: string;
  productResults: ProcessedProduct[];
  metadata: Record<string, any>;
  query: string;
}

const RecommendMe: FC<RecommendMeProps> = ({ productId }) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [searchBarValue, setSearchBarValue] = useState('');
  const [query, setQueryValue] = useState('');
  const [carouselHistory, setCarouselHistory] = useState<CarouselHistory[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const root = useContext(RootContext);
  const intl = useIntl();

  const {
    productResults,
    recommendMeWithQuery,
    isStreaming,
    requestId,
  } = useRecommendMe({
    productId,
  });

  const removeFromHistory = (carouselId: string): void => {
    setCarouselHistory((prev) => prev.filter((carousel) => carousel.carouselId !== carouselId));
  };

  useEffect(() => {
    if (query && !isStreaming) {
      // Send Result Load event if there are product results returned
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
      };
      widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      widgetClient.setLastTrackingMeta(requestMetadata);
      setMetadata(requestMetadata);

      // Prepend newly created carousel to carousel history
      const carouselId = uuid();
      setCarouselHistory((prev) => [
        {
          carouselId,
          productResults,
          metadata: requestMetadata,
          query,
        },
        ...prev,
      ]);
    }
  }, [isStreaming]);

  if (!root) {
    return <></>;
  }

  return (
    <>
        {customizations.generalLayout?.showWidgetTitle && (
          <div className='wigmix-widget-title py-4 text-primary' data-pw='rm-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
        )}

        {/* Search input bar with Recommend me button */}
        <div className='flex'>
          <div
            className='w-48 rounded-l bg-buttonPrimary px-3 py-2 font-semibold cursor-pointer hover:opacity-90'
            onClick={() => {
              if (!searchBarValue) {
                return;
              }
              setQueryValue(searchBarValue);
              recommendMeWithQuery(searchBarValue);
            }}
            data-pw='rm-recommend-me-button'
          >
            <span className='text-buttonPrimary'>{intl.formatMessage({ id: 'searchBarButton' })}</span>
          </div>
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
            && <CarouselLoader results={productResults} metadata={metadata} searchValue={query} />
          }
        </div>
        <div className='flex flex-col'>
          {carouselHistory.map((entry) => (
              <Carousel key={entry.carouselId}
                        results={entry.productResults}
                        metadata={entry.metadata}
                        searchValue={entry.query}
                        removeFromHistory={() => removeFromHistory(entry.carouselId)} />
          ))}
        </div>
    </>
  );
};

export default RecommendMe;
