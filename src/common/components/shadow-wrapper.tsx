import { HeroUIProvider } from '@heroui/system';
import type { CSSProperties, FC, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Renders a host `<div>` with an open shadow root and portals `children` into it.
 * Replaces `react-shadow`, which also bundled `react-dom/server` for an SSR mode the widgets never use.
 *
 * An existing shadow root is reused (StrictMode / re-mount double-invocation). If `attachShadow` fails, nothing is rendered,
 * on purpose and as with `react-shadow`: rendering into the light DOM instead would inject the widget's full Tailwind CSS
 * (including its preflight reset) into the host page and restyle the merchant's site.
 */
export const ShadowRootHost: FC<{ style: CSSProperties; children: ReactNode }> = ({ style, children }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    try {
      setShadowRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
    } catch (error) {
      console.error('Rezolve widget: unable to attach shadow root', error);
    }
  }, []);

  return (
    <div ref={hostRef} style={style}>
      {shadowRoot && createPortal(children, shadowRoot)}
    </div>
  );
};

const StyleLoader: FC<{ rootNode: HTMLElement | null; children: ReactNode }> = ({ rootNode, children }) => {
  useStyles(rootNode);
  return <>{children}</>;
};

const Style: FC = () => {
  const { widgetClient } = useContext(WidgetDataContext);
  const onRefChange = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      // Every loaded bundle adds its own `vi_template__<type>` holder (see webpack.util.js), so when two versions of the same
      // widget run on one page there are several holders with the same id. Search all of them for this version's styles.
      const styleId = `vi_style__${widgetClient.widgetType}__${widgetClient.widgetVersion}`;
      const styleTag = Array.from(document.head.querySelectorAll(`#vi_template__${widgetClient.widgetType}`))
        .map((template) => template.shadowRoot?.getElementById(styleId))
        .find((tag): tag is HTMLElement => !!tag);
      if (!styleTag) {
        console.warn(`Rezolve widget: styles ${styleId} not found`);
        return;
      }
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
