import { createContext, type CSSProperties, type FC, type ReactNode, useCallback, useContext, useState } from 'react';
import root from 'react-shadow';
import { NextUIProvider } from '@nextui-org/system';
import useStyles from './hooks/use-styles';
import { WidgetDataContext } from '../types/contexts';

const createRootStyle: (fontFamily?: string) => CSSProperties = (fontFamily) => ({
  position: 'relative',
  fontFamily: fontFamily || 'inherit',
  letterSpacing: 'inherit',
  display: 'block',
});

const rootContainerStyle: CSSProperties = {
  display: 'block',
};

export const RootContext = createContext<HTMLElement | null>(null);

const StyleLoader: FC<{ rootNode: HTMLElement | null, children: ReactNode }> = ({ rootNode, children }) => {
  useStyles(rootNode);
  return <>{children}</>;
};

const Style: FC = () => {
  const { widgetClient } = useContext(WidgetDataContext);
  const onRefChange = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      const template = document.head.querySelector(`#vi_template__${widgetClient.widgetType}`) as HTMLTemplateElement;
      const styleTag = template.shadowRoot?.getElementById(`vi_style__${widgetClient.widgetType}__${widgetClient.widgetVersion}`) as HTMLStyleElement;
      // Convert NextUI CSS variable values from rem to px
      ref.innerHTML = styleTag.innerHTML.replace(/(\d*\.?\d+)rem/g, (_, val) => `${parseFloat(val) * 16}px`);
    }
  }, []);
  return <style ref={onRefChange}></style>;
};

const ShadowWrapper: FC<{ fontFamily: string, children: ReactNode }> = ({ fontFamily, children }) => {
  const [rootNode, setRootNode] = useState<HTMLElement | null>(null);

  const onRefChange = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      setRootNode(ref);

      ref.className = 'light';
      ref.style.colorScheme = 'light';
    }
  }, []);

  return (
    <root.div style={rootContainerStyle}>
      <Style></Style>
      <div ref={onRefChange} style={createRootStyle(fontFamily)}>
        <RootContext.Provider value={rootNode}>
          <StyleLoader rootNode={rootNode}>
            <NextUIProvider>{children}</NextUIProvider>
          </StyleLoader>
        </RootContext.Provider>
      </div>
    </root.div>
  );
};

export default ShadowWrapper;
