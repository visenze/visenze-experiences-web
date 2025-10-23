import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import ResultScreen from './screens/ResultScreen';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import useRecommendMe from '../../common/components/hooks/use-recommend-me';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import { type SearchImageOrPid } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';

enum ScreenType {
  LOADING = 'loading',
  RESULT = 'result',
  ERROR = 'error',
}

interface SlideOutDrawerProps {
  pid: string;
  renderModalWithoutPortal?: boolean;
}

const SlideOutDrawer: FC<SlideOutDrawerProps> = ({ pid, renderModalWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const intl = useIntl();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.LOADING);
  const [imageUrl, setImageUrl] = useState('');
  const [isWaitingForRm, setIsWaitingForRm] = useState(false);
  const [rmProductResults, setRmProductResults] = useState<ProcessedProduct[]>();
  const [isComplementary, setIsComplementary] = useState(false);
  const root = useContext(RootContext);

  const {
    mainImageUrl,
    productResults,
    metadata,
    error: errorFromApi,
  } = useImageMultisearch({
    image,
    boxData: undefined,
    isComplementary,
  });

  const {
    productResults: productResultsFromRm,
    recommendMeWithQuery,
    isStreaming,
  } = useRecommendMe({
    productId: pid,
  });

  const onModalClose = (): void => {
    setDialogVisible(false);
    if (productResults.length > 0) {
      widgetClient.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        ...metadata,
      });
    }
  };

  const onTextSearch = (text: string): void => {
    if (isWaitingForRm) {
      return;
    }
    if (!text) {
      setRmProductResults(undefined);
      return;
    }
    setIsWaitingForRm(true);
    recommendMeWithQuery(text);
  };

  const openWidgetPopup = (): void => {
    setDialogVisible(true);
    widgetClient.forceErrorState = (): void => {
      setError('Sample error message here');
    };
  };

  const onPopupIconClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    widgetClient.sendEvent(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    openWidgetPopup();
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.ERROR:
        return (
          <div className='flex size-full flex-col items-center justify-center gap-1 text-center'>
            <div className='font-bold'>{intl.formatMessage({ id: 'errorDescription' })}</div>
            <div>{error}</div>
            <button
              className='mt-3 w-fit rounded-md bg-buttonPrimary px-5 py-2 text-buttonPrimary'
              data-testid='wigmix-back'
              onClick={() => {
                onModalClose();
              }}>
              {intl.formatMessage({ id: 'back' })}
            </button>
          </div>
        );
      case ScreenType.RESULT:
        return (
          <ResultScreen
            productResults={rmProductResults || productResults}
            imageUrl={imageUrl}
            metadata={metadata}
            onModalClose={onModalClose}
            onTextSearch={onTextSearch}
            onSimilarSearch={() => {
              if (isWaitingForRm) {
                return;
              }
              setRmProductResults(undefined);
              setIsComplementary(false);
            }}
            onComplementarySearch={() => {
              if (isWaitingForRm) {
                return;
              }
              setRmProductResults(undefined);
              setIsComplementary(true);
            }}
            isStreaming={isWaitingForRm}
          />
        );
      case ScreenType.LOADING:
        return (
          <div className='flex h-full items-center justify-center'>
            <img className='w-48 md:w-60' src='https://cdn.visenze.com/images/loading-results.gif' />
          </div>
        );
      default:
        return <></>;
    }
  };

  useEffect(() => {
    if (!productResults.length && dialogVisible) {
      setImage({ pid });
    }
  }, [dialogVisible]);

  useEffect(() => {
    widgetClient.registerWidgetOpener((id, bypassIdCheck) => {
      if (id === pid || bypassIdCheck) {
        openWidgetPopup();
      }
    });
    widgetClient.registerWidgetCloser(() => {
      setDialogVisible(false);
    });
  }, []);

  useEffect(() => {
    if (productResults.length > 0) {
      setScreen(ScreenType.RESULT);
    }
  }, [productResults]);

  useEffect(() => {
    if (productResultsFromRm?.length) {
      setRmProductResults(productResultsFromRm);
    } else {
      setRmProductResults(undefined);
    }
  }, [productResultsFromRm]);

  useEffect(() => {
    setIsWaitingForRm(isStreaming);
  }, [isStreaming]);

  useEffect(() => {
    if (mainImageUrl) {
      setImageUrl(mainImageUrl);
    }
  }, [mainImageUrl]);

  useEffect(() => {
    if (error) {
      setScreen(ScreenType.ERROR);
    }
  }, [error]);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

  if (!root) {
    return <></>;
  }

  return (
    <>
      <PopupTriggerButton
        config={customizations.popup}
        text={intl.formatMessage({ id: 'triggerCTA' })}
        darkMode={darkMode}
        onClick={onPopupIconClick}
        defaultIcon={
          <MagnifyingGlassIcon
            color={
              darkMode
                ? customizations.popup?.triggerIcon?.colorDark || ''
                : customizations.popup?.triggerIcon?.color || ''
            }
            className='wigmix-popup-trigger-icon default size-6'
          />
        }
      />

      <ViSenzeModal
        open={dialogVisible}
        layout={breakpoint}
        onClose={onModalClose}
        renderWithoutPortal={!!renderModalWithoutPortal}
        position={customizations.popup?.position || 'right'}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        placementId={`${appSettings.placementId}`}>
        {getScreen()}
      </ViSenzeModal>
    </>
  );
};

export default SlideOutDrawer;
