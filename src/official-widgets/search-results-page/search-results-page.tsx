import { memo, useContext, useEffect, useState } from 'react';
import type { ProductCardsConfig, WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import ResultsPage from './components/ResultsPage';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import { WidgetResultContext } from '../../common/types/contexts';
import type { ProcessedProduct } from '../../common/types/product';
import SearchBarWithDropdown from './components/SearchBarWithDropdown';

const SearchResultsPage = memo((props: { config: WidgetConfig; productSearch: WidgetClient }) => {
  const { config, productSearch } = props;
  const [searchBarValue, setSearchBarValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProcessedProduct | null>(null);
  const root = useContext(RootContext);

  const { productResults, autocompleteWithQuery, multisearchWithParams, autocompleteResults, metadata, error } = useImageMultisearch({
      image: undefined,
      boxData: undefined,
      config,
      productSearch,
    });

  const handleMultisearchWithQuery = (query: string): void => {
    setSearchBarValue(query);
    multisearchWithParams({ q: query, im_url: activeProduct?.im_url || '' });
    setShowDropdown(false);
  };

  const handleMultisearchWithProduct = (product?: ProcessedProduct): void => {
    multisearchWithParams({ q: searchBarValue, im_url: product?.im_url || activeProduct?.im_url || '' });
    setShowDropdown(false);
  };

  useEffect(() => {
    autocompleteWithQuery(searchBarValue);
  }, [searchBarValue]);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  if (!root) {
    return <></>;
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        <div className='flex size-full flex-col items-center bg-primary'>
          {/* Search bar with autocomplete dropdown */}
          <SearchBarWithDropdown
            searchBarValue={searchBarValue}
            setSearchBarValue={setSearchBarValue}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            autocompleteResults={autocompleteResults}
            handleMultisearchWithQuery={handleMultisearchWithQuery}
            handleMultisearchWithProduct={handleMultisearchWithProduct}
          />
          {/* Results page */}
          {productResults.length > 0 && (
            <ResultsPage
              autocompleteResults={autocompleteResults}
              results={productResults}
              handleMultisearchWithQuery={handleMultisearchWithQuery}
              handleMultisearchWithProduct={handleMultisearchWithProduct}
              activeProduct={activeProduct}
              setActiveProduct={setActiveProduct}
              productCustomizations={config.customizations.productCards || ({} as ProductCardsConfig)}
            />
          )}
        </div>
      </WidgetResultContext.Provider>
    </>
  );
});

export default SearchResultsPage;
