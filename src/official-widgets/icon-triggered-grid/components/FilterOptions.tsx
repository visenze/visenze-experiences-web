import type { ChangeEvent, FC, ReactElement } from 'react';
import { useContext } from 'react';
import { Accordion, AccordionItem } from '@heroui/accordion';
import { Checkbox } from '@heroui/checkbox';
import { Slider } from '@heroui/slider';
import type { Facet } from 'visearch-javascript-sdk';
import { Button } from '@heroui/button';
import { useIntl } from 'react-intl';
import type { FacetType } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { getFacetNameByKey, getTitleCase } from '../../../common/utils';
import { ScreenType } from '../icon-triggered-grid';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

/**
 * A component for selecting and applying product result filtering options.
 */

interface FilterOptionsProps {
  className: string;
  facets: Facet[];
  selectedFilters: Record<FacetType, any>;
  setSelectedFilters: (selectedFilters: any) => void;
  setScreen: (screen: ScreenType) => void;
}

const FilterOptions: FC<FilterOptionsProps> = ({ className, facets, selectedFilters, setSelectedFilters, setScreen }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { displaySettings, customizations } = widgetConfig;
  const intl = useIntl();

  const showFacet = (facet: Facet): boolean => {
    if (!facet.range && !facet.items) {
      return false;
    }
    if (facet.range && facet.range.min === facet.range.max) {
      return false;
    }
    if (facet.items && !facet.items.filter((i) => i.value).length) {
      return false;
    }
    return true;
  };

  const showFacetValues = (facet: Facet): ReactElement | ReactElement[] => {
    const facetName = getFacetNameByKey(displaySettings.productDetails, facet.key) as FacetType;

    const priceRangeChangeHandler = (value: number | number[]): void => {
      setSelectedFilters((currentFilters: Record<FacetType, any>) => {
        let newPriceRange: number[] = [];
        if (Array.isArray(value)) {
          newPriceRange = value;
        } else {
          newPriceRange = [value, value];
        }
        return { ...currentFilters, price: newPriceRange };
      });
    };

    if (facet.range) {
      return <Slider
        label={`${getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))} Range`}
        color='secondary'
        minValue={facet.range.min}
        maxValue={facet.range.max}
        defaultValue={selectedFilters[facetName]?.length ? selectedFilters[facetName] : [facet.range.min, facet.range.max]}
        onChangeEnd={priceRangeChangeHandler}
      />;
    }

    const updateFiltersHandler = (event: ChangeEvent<HTMLInputElement>): void => {
      setSelectedFilters((currentFilters: Record<FacetType, any>) => {
        const newSet = new Set(currentFilters[facetName]);
        if (event.target.checked) {
          newSet.add(event.target.value);
        } else {
          newSet.delete(event.target.value);
        }

        return { ...currentFilters, [facetName]: newSet };
      });
    };

    return facet.items.filter((i) => i.value).map((item) => (
      <div className='flex w-full justify-between' key={item.value}>
        <Checkbox
          radius='none'
          value={item.value}
          color='secondary'
          onChange={updateFiltersHandler}
          isSelected={selectedFilters[facetName].has(item.value)}
        >
          <span className='text-primary'>{item.value}</span>
        </Checkbox>
        <span className='text-primary'>({item.count})</span>
      </div>
    ));
  };

  return (
    <div className={className}>
      <Accordion className='divide-y-1 overflow-y-auto' selectionMode='multiple'>
        {
          facets.map((facet) => (showFacet(facet) ? (
            <AccordionItem
              classNames={{ title: 'font-bold text-primary' }}
              key={facet.key}
              title={getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}
              indicator={
                <ChevronLeftIcon className='size-5'
                                 color={darkMode
                                   ? customizations.generalLayout?.fontColorDark
                                   : customizations.generalLayout?.fontColor} />
              }
            >
              <div className='flex flex-col gap-y-2 px-4 pb-4'>
                {showFacetValues(facet)}
              </div>
            </AccordionItem>
          ) : <></>))
        }
      </Accordion>

      {/* Back button */}
      <Button className='my-3 mr-3 w-1/4 flex-shrink-0 self-end rounded bg-buttonPrimary px-14'
              radius='none' onClick={() => setScreen(ScreenType.RESULT)} data-pw='itg-back-button'>
        <span className='text-buttonPrimary'>
          {intl.formatMessage({ id: 'back' })}
        </span>
      </Button>
    </div>
  );
};

export default FilterOptions;
