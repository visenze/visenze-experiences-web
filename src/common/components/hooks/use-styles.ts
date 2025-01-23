import { useContext, useEffect, useState } from 'react';
import { WidgetDataContext } from '../../types/contexts';

/**
 * Copy styles from the temp shadow dom into widget shadow dom
 */
const useStyles = (root: HTMLElement | null): void => {
  const [customCssElement, setCustomCssElement] = useState<HTMLStyleElement | null>(null);
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations, platformSettings } = widgetConfig;
  const styleTag = document.getElementById(`vi__${widgetClient.widgetType.toLowerCase()}__${widgetClient.widgetVersion.toLowerCase()}`);

  useEffect(() => {
    if (root) {
      if (styleTag) {
        const style = document.createElement('style');
        style.innerHTML = styleTag.innerHTML;
        root.appendChild(style);
      }
      if (customizations && customizations.customCss) {
        const customCss = document.createElement('style');
        customCss.id = 'wigmix-custom-css-user';
        customCss.innerHTML = customizations.customCss;
        root.appendChild(customCss);
        setCustomCssElement(customCss);
      }
      if (platformSettings && platformSettings.customCss) {
        const platformCustomCss = document.createElement('style');
        platformCustomCss.id = `wigmix-custom-css-platform-${platformSettings.platformName.toLowerCase()}`;
        platformCustomCss.innerHTML = platformSettings.customCss;
        root.appendChild(platformCustomCss);
      }
    }
  }, [root]);

  useEffect(() => {
    if (customCssElement) {
      customCssElement.innerHTML = customizations.customCss || '';
    } else if (root) {
      const customCss = document.createElement('style');
      customCss.id = 'wigmix-custom-css-user';
      customCss.innerHTML = customizations.customCss || '';
      root.appendChild(customCss);
      setCustomCssElement(customCss);
    }
  }, [customizations.customCss]);
};

export default useStyles;
