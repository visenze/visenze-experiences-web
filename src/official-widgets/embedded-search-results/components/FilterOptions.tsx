import React, { useContext, type ChangeEvent, type FC, type ReactElement, useState, useEffect, useRef } from 'react';
import { Accordion, AccordionItem } from '@heroui/accordion';
import type { Facet } from 'visearch-javascript-sdk';
import { Slider } from '@heroui/slider';
import { Checkbox } from '@heroui/checkbox';
import type { FacetType } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { getFacetNameByKey, getTitleCase } from '../../../common/utils';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

interface FilterOptionsProps {
  facets: Facet[];
  selectedFilters: Record<FacetType, any>;
  setSelectedFilters: React.Dispatch<React.SetStateAction<Record<FacetType, any>>>;
  displayAsDropdown: boolean;
}

const ChevronDownIcon = (): ReactElement => (
      <svg fill='none' height='14' viewBox='0 0 24 24' width='14' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17.9188 8.17969H11.6888H6.07877C5.11877 8.17969 4.63877 9.33969 5.31877 10.0197L10.4988 15.1997C11.3288
             16.0297 12.6788 16.0297 13.5088 15.1997L15.4788 13.2297L18.6888 10.0197C19.3588 9.33969 18.8788 8.17969
              17.9188 8.17969Z'
            fill='currentColor'
        />
      </svg>
  );

const FilterOptions: FC<FilterOptionsProps> = ({ facets, selectedFilters, setSelectedFilters, displayAsDropdown }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { displaySettings, customizations } = widgetConfig;
  const [shownFacets, setShownFacets] = useState<Record<string, boolean>>({});

  const showFacetValues = (facet: Facet, coloredText: boolean): ReactElement | ReactElement[] => {
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
          <span className={`${coloredText ? 'text-primary' : ''}`}>{item.value}</span>
        </Checkbox>
      </div>
    ));
  };

  const useOutsideAlerter = (ref: any, facet: string): void => {
    useEffect(() => {
      const handleClickOutside = (event: any): void => {
        if (ref.current && !ref.current.contains(event.target)) {
          setShownFacets((prev) => ({
            ...prev,
            [facet]: false,
          }));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return (): void => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  };

  const OutsideAlerter = (props: any): ReactElement => {
    const wrapperRef = useRef(null);
    useOutsideAlerter(wrapperRef, props.facet);

    return <div ref={wrapperRef}>{props.children}</div>;
  };

  if (displayAsDropdown) {
    return (
        <div className='flex w-8/12'>
          {facets.map((facet) => (
              <div key={facet.key} className='w-2/6 p-1'>
                <div className='w-full border-y border-y-gray-300 py-2'
                     onClick={() => {
                       setShownFacets((prev) => {
                         const originalValueForFacet = prev[facet.key];
                         const newState: Record<string, boolean> = {};
                         Object.keys(prev).forEach((f) => {
                           newState[f] = false;
                         });
                         newState[facet.key] = !originalValueForFacet;
                         return newState;
                       });
                     }}>
                  <div className='flex cursor-pointer items-center justify-between text-primary hover:opacity-80'>
                    <span>
                      {getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}
                    </span>
                    <ChevronDownIcon />
                  </div>
                </div>
                {shownFacets[facet.key] && (
                    <OutsideAlerter facet={facet.key}>
                      <div className='absolute z-20 mt-1 w-3/12 rounded border-gray-300 bg-gray-100 p-3 text-black'>
                        {showFacetValues(facet, false)}
                      </div>
                    </OutsideAlerter>
                )}
              </div>
          ))}
        </div>
    );
  }
  return (
    <div className='md:justify-none flex h-full flex-col justify-between gap-y-2 p-1 md:h-[unset]'>
      <Accordion className='divide-y-1 overflow-y-auto' selectionMode='multiple'>
        {
          facets.map((facet) => (
            <AccordionItem
              classNames={{ title: 'font-bold text-primary' }}
              key={facet.key}
              title={getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}
              indicator={
                <ChevronLeftIcon className='size-5' color={customizations.generalLayout?.fontColor} />
              }
            >
              <div className='flex flex-col gap-y-2 px-4 pb-4'>
                {showFacetValues(facet, true)}
              </div>
            </AccordionItem>
          ))
        }
      </Accordion>
    </div>
  );
};

export default FilterOptions;
