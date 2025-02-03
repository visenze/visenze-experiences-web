import type { CSSProperties, FC, HTMLProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import root from 'react-shadow';
import { HeroUIProvider } from '@heroui/system';
import useStyles from './hooks/use-styles';
import { WidgetDataContext } from '../types/contexts';

const createRootStyle: (fontFamily?: string) => CSSProperties = (fontFamily) => ({
  position: 'relative',
  fontFamily: fontFamily || '',
  letterSpacing: 'inherit',
  display: 'block',
});

const rootContainerStyle: CSSProperties = {
  display: 'block',
};

export const RootContext = createContext<HTMLElement | null>(null);

const StyleLoader: FC<{ rootNode: HTMLElement | null; children: ReactNode }> = ({ rootNode, children }) => {
  useStyles(rootNode);
  return <>{children}</>;
};

const Style: FC = () => {
  const { widgetClient } = useContext(WidgetDataContext);
  const onRefChange = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      const template = document.head.querySelector(`#vi_template__${widgetClient.widgetType}`) as HTMLTemplateElement;
      const styleTag = template.shadowRoot?.getElementById(`vi_style__${widgetClient.widgetType}__${widgetClient.widgetVersion}`) as HTMLStyleElement;
      // Convert HeroUI CSS variable values from rem to px
      ref.innerHTML = styleTag.innerHTML.replace(/(\d*\.?\d+)rem/g, (_, val) => `${parseFloat(val) * 16}px`);
    }
  }, []);
  return <style ref={onRefChange}></style>;
};

interface ShadowWrapperProps {
  darkMode: boolean;
  fontFamily: string;
  children: ReactNode;
}

const ShadowWrapper: FC<ShadowWrapperProps> = ({ darkMode, fontFamily, children }) => {
  const [rootNode, setRootNode] = useState<HTMLElement | null>(null);

  const onRefChange = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      setRootNode(ref);

      if (darkMode) {
        ref.classList.add('dark');
        ref.style.colorScheme = 'dark';
      } else {
        ref.classList.add('light');
        ref.style.colorScheme = 'light';
      }
    }
  }, []);

  const ShadowRootHost = root['div'] as FC<HTMLProps<HTMLDivElement>>;

  useEffect(() => {
    if (rootNode) {
      if (darkMode) {
        rootNode.classList.remove('light');
        rootNode.classList.add('dark');
        rootNode.style.colorScheme = 'dark';
      } else {
        rootNode.classList.remove('dark');
        rootNode.classList.add('light');
        rootNode.style.colorScheme = 'light';
      }
    }
  }, [darkMode]);

  return (
    <ShadowRootHost style={rootContainerStyle}>
      <Style></Style>
      <div className='wigmix-shadow-root' ref={onRefChange} style={createRootStyle(fontFamily)}>
        <RootContext.Provider value={rootNode}>
          <StyleLoader rootNode={rootNode}>
            <HeroUIProvider>{children}</HeroUIProvider>
          </StyleLoader>
        </RootContext.Provider>
      </div>
    </ShadowRootHost>
  );
};

export default ShadowWrapper;
