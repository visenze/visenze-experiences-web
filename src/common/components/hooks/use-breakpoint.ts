import { useMediaQuery } from 'react-responsive';
import { useContext } from 'react';
import { WidgetDataContext } from '../../types/contexts';
import { WidgetBreakpoint } from '../../types/constants';

const useBreakpoint = (): WidgetBreakpoint => {
  const { customizations } = useContext(WidgetDataContext);
  if (!customizations || !customizations.breakpoints) {
    return WidgetBreakpoint.DESKTOP;
  }

  const isMobile = useMediaQuery(customizations.breakpoints.mobile);
  const isTablet = useMediaQuery(customizations.breakpoints.tablet);

  if (isMobile) {
    return WidgetBreakpoint.MOBILE;
  }
  if (isTablet) {
    return WidgetBreakpoint.TABLET;
  }
  return WidgetBreakpoint.DESKTOP;
};

export default useBreakpoint;
