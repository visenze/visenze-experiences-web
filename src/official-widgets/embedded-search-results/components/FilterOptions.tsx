import React, { useContext, type ChangeEvent, type FC, type ReactElement } from 'react';
import { Accordion, AccordionItem } from '@nextui-org/accordion';
import type { Facet } from 'visearch-javascript-sdk';
import { Slider } from '@nextui-org/slider';
import { Checkbox } from '@nextui-org/checkbox';
import type { FacetType } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import LeftChevronIcon from '../../../common/icons/LeftChevronIcon';
import { getFacetNameByKey, getTitleCase } from '../../../common/utils';

interface FilterOptionsProps {
  facets: Facet[];
  selectedFilters: Record<FacetType, any>;
  setSelectedFilters: React.Dispatch<React.SetStateAction<Record<FacetType, any>>>;
}

const FilterOptions: FC<FilterOptionsProps> = ({ facets, selectedFilters, setSelectedFilters }) => {
  const { displaySettings } = useContext(WidgetDataContext);

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

    return facet.items.map((item) => (
      <div className='flex w-full justify-between' key={item.value}>
        <Checkbox
          radius='none'
          value={item.value}
          color='secondary'
          onChange={updateFiltersHandler}
          isSelected={selectedFilters[facetName].has(item.value)}
        >
          <span>{item.value}</span>
        </Checkbox>
        <span>({item.count})</span>
      </div>
    ));
  };

  return (
    <div className='md:justify-none flex h-full flex-col justify-between gap-y-2 p-1 md:h-[unset]'>
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
    </div>
  );
};

export default FilterOptions;
