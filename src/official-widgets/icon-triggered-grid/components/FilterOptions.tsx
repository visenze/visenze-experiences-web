import type { ChangeEvent, FC, ReactElement } from 'react';
import { useContext } from 'react';
import { Accordion, AccordionItem } from '@nextui-org/accordion';
import { Checkbox } from '@nextui-org/checkbox';
import { Slider } from '@nextui-org/slider';
import type { Facet } from 'visearch-javascript-sdk';
import { Button } from '@nextui-org/button';
import { useIntl } from 'react-intl';
import LeftChevronIcon from '../../../common/icons/LeftChevronIcon';
import type { FacetType } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { getFacetNameByKey, getTitleCase } from '../../../common/utils';
import type { ScreenType } from '../icon-triggered-grid';

/**
 * A component for selecting and applying product result filtering options.
 */

interface FilterOptionsProps {
  className: string;
  facets: Facet[];
  selectedFilters: Record<FacetType, any>;
  setSelectedFilters: (selectedFilters: any) => void;
  setScreen: (screen: ScreenType | null) => void;
}

const FilterOptions:FC<FilterOptionsProps> = ({ className, facets, selectedFilters, setSelectedFilters, setScreen }) => {
  const { displaySettings } = useContext(WidgetDataContext);
  const intl = useIntl();

  const showFacetValues = (facet: Facet): ReactElement | ReactElement[] => {
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
        label='Price Range'
        color='secondary'
        minValue={facet.range.min}
        maxValue={facet.range.max}
        defaultValue={[facet.range.min, facet.range.max]}
        onChangeEnd={priceRangeChangeHandler}
      />;
    }

    const facetName = getFacetNameByKey(displaySettings.productDetails, facet.key) as FacetType;
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

    return facet.items.map((item, index) => (
      <div className='flex w-full justify-between' key={item.value}>
        <Checkbox
          data-pw={`itg-${facet.key}-filter-${index}`}
          radius='none'
          value={item.value}
          color='secondary'
          onChange={updateFiltersHandler}
          isSelected={selectedFilters[facetName].has(item.value)}
        >
          <span className='wigmix-calls-to-action-text'>{item.value}</span>
        </Checkbox>
        <span className='wigmix-calls-to-action-text'>({item.count})</span>
      </div>
    ));
  };

  return (
    <div className={className}>
      <Accordion className='divide-y-1 overflow-y-auto' selectionMode='multiple'>
        {
          facets.map((facet) => (
            <AccordionItem
              classNames={{ title: 'font-bold' }}
              key={facet.key}
              title={getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}
              indicator={<LeftChevronIcon className='size-4'/>}
            >
              <div className='flex flex-col gap-y-2 px-4 pb-4'>
                {showFacetValues(facet)}
              </div>
            </AccordionItem>
          ))
        }
      </Accordion>

      {/* Back button */}
      <Button className='my-3 mr-3 w-1/4 flex-shrink-0 self-end rounded border bg-buttonPrimary px-14 text-white'
              radius='none' onClick={() => setScreen(null)} data-pw='itg-back-button'>
        <span className='text-buttonPrimary'>
          {intl.formatMessage({ id: 'iconTriggeredGrid.back' })}
        </span>
      </Button>
    </div>
  );
};

export default FilterOptions;
