import { type FC, useContext, useEffect, useState } from 'react';
import ResultsPage from './components/ResultsPage';
import SearchBarWithDropdown from './components/SearchBarWithDropdown';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { ProcessedProduct } from '../../common/types/product';

interface SearchResultsPageProps {
  // no properties at the moment
}

const SearchResultsPage: FC<SearchResultsPageProps> = () => {
  const [searchBarValue, setSearchBarValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProcessedProduct | null>(null);
  const root = useContext(RootContext);

  const { productResults, autocompleteWithQuery, multisearchWithParams, autocompleteResults, metadata, error } = useImageMultisearch({
    image: undefined,
    boxData: undefined,
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
        <div className='flex size-full flex-col items-center text-primary'>
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
              metadata={metadata}
              handleMultisearchWithQuery={handleMultisearchWithQuery}
              handleMultisearchWithProduct={handleMultisearchWithProduct}
              activeProduct={activeProduct}
              setActiveProduct={setActiveProduct}
            />
          )}
        </div>
    </>
  );
};

export default SearchResultsPage;
