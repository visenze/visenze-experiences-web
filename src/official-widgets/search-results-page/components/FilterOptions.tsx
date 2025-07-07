import { Checkbox } from '@heroui/checkbox';
import { Slider } from '@heroui/slider';
import React, { type ChangeEvent, type FC, type ReactElement, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { Facet } from 'visearch-javascript-sdk';
import ChevronDownIcon from '../../../common/icons/ChevronDownIcon';
import type { FacetType } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { getFacetNameByKey, getTitleCase } from '../../../common/utils';

interface FilterOptionsProps {
  facets: Facet[];
  selectedFilters: Record<FacetType, any>;
  setSelectedFilters: React.Dispatch<React.SetStateAction<Record<FacetType, any>>>;
  displayAsDropdown: boolean;
}

export const showFacet = (facet: Facet): boolean => {
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

const FilterOptions: FC<FilterOptionsProps> = ({ facets, selectedFilters, setSelectedFilters, displayAsDropdown }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { displaySettings, customizations } = widgetConfig;
  const [shownFacets, setShownFacets] = useState<Record<string, boolean>>({});
  const intl = useIntl();

  const showFacetValues = (facet: Facet, coloredText: boolean): ReactElement | ReactElement[] => {
    const facetName = getFacetNameByKey(displaySettings.productDetails, facet.key) as FacetType;

    const priceRangeChangeHandler = (value: number | number[]): void => {
      setSelectedFilters((currentFilters: Record<FacetType, any>) => {
        let newPriceRange: number[] = [];
        if (Array.isArray(value)) {
          newPriceRange = value;
        } else {
          newPriceRange = [value, value];
        }
        return { ...currentFilters, [facetName]: newPriceRange };
      });
    };

    if (facet.range) {
      return (
        <Slider
          label='Price Range'
          color='secondary'
          minValue={facet.range.min}
          maxValue={facet.range.max}
          defaultValue={
            selectedFilters[facetName]?.length ? selectedFilters[facetName] : [facet.range.min, facet.range.max]
          }
          style={{
            color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor,
          }}
          onChangeEnd={priceRangeChangeHandler}
        />
      );
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

    return facet.items
      .filter((i) => i.value)
      .map((item) => (
        <div className='mb-1 flex w-full justify-between' key={item.value}>
          <Checkbox
            radius='none'
            value={item.value}
            color='secondary'
            onChange={updateFiltersHandler}
            isSelected={selectedFilters[facetName].has(item.value)}
            classNames={{
              base: 'w-full max-w-full',
            }}
            data-testid='wigmix-filter-checkbox'>
            <span className={`${coloredText ? 'text-primary' : 'text-black'}`}>{item.value}</span>
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
      <div className='flex w-8/12 flex-wrap'>
        {facets.map((facet) => (showFacet(facet) ? (
            <div key={facet.key} className='w-2/6 p-1'>
              <div
                className='w-full border-y border-y-gray-300 py-2'
                data-testid={`wigmix-filter-${facet.key}`}
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
                  <span>{getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}</span>
                  <ChevronDownIcon />
                </div>
              </div>
              {shownFacets[facet.key] && (
                <OutsideAlerter facet={facet.key}>
                  <div className='absolute z-20 mt-1 w-3/12 rounded p-3 text-black'>
                    {showFacetValues(facet, false)}
                  </div>
                </OutsideAlerter>
              )}
            </div>
          ) : (
            <></>
          )
        ))}
      </div>
    );
  }
  return (
    <div className='md:justify-none flex h-full flex-col justify-between gap-y-2 p-4 lg:p-0 md:h-[unset]'>
      <div
        className='border-b border-b-gray-300 pb-3'
        style={{
          color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor,
        }}
      >
        {intl.formatMessage({ id: 'filter' })}
      </div>
      {facets.map((facet) => (
        <div data-testid={`wigmix-filter-${facet.key}`} key={facet.key}>
          <div
            style={{
              color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor,
            }}>
            <p>{getTitleCase(getFacetNameByKey(displaySettings.productDetails, facet.key))}</p>
          </div>
          <div className='flex flex-col gap-y-2 p-4'>{showFacetValues(facet, true)}</div>
        </div>
      ))}
    </div>
  );
};

export default FilterOptions;
