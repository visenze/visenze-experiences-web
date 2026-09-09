import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, memo, type MutableRefObject, useContext } from 'react';
import { useIntl } from 'react-intl';
import { PRODUCT_IMAGE_MAX_HEIGHT_CLASS } from './constants';
import { processMessageForDisplay } from './message-formatting';
import ProductGrid from './ProductGrid';
import type { Chat } from './use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import SparklesIcon from '../../icons/SparklesIcon';
import UserIcon from '../../icons/UserIcon';
import { WidgetDataContext } from '../../types/contexts';
import { isImageDataUrl, isImageUrl, type SearchImageOrPid } from '../../types/image';

interface ChatRowProps {
  chat: Chat;
  focusedProductId: string | null;
  streamingRequestId: string;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
  pwPrefix: string;
  productDisplayMode: 'grid' | 'hint';
  activeRequestId: string | null;
  onSelectTurn?: (requestId: string) => void;
  productGridClasses: string;
  productGridCssConfig: CSSProperties;
  viewedProductIdsRef: MutableRefObject<Set<string>>;
}

const getFile = (image: SearchImageOrPid | undefined): string => {
  if (!image) {
    return '';
  }
  if (isImageDataUrl(image)) {
    return image.file;
  }
  if (isImageUrl(image)) {
    return image.imgUrl;
  }
  return '';
};

// One turn of the conversation (a user message, bot reply, or product results). Split out of
// ChatWindow and memoized so historical turns skip re-rendering while an in-progress reply
// streams in — without this, every past turn (including re-running processMessageForDisplay's
// regex chain on unchanged text) redid its work on every single streamed token, since ChatWindow
// itself must re-render each token as `latestMessage` changes.
const ChatRow: FC<ChatRowProps> = ({
  chat, focusedProductId, streamingRequestId, wishlistPids, setIsInWishlist, pwPrefix,
  productDisplayMode, activeRequestId, onSelectTurn, productGridClasses, productGridCssConfig, viewedProductIdsRef,
}) => {
  const intl = useIntl();
  const { widgetConfig } = useContext(WidgetDataContext);
  const chatbotConfig = widgetConfig.customizations.chatbot;

  return (
    <div className={cn(
        'w-full flex flex-col',
        chat.author === 'user' ? 'items-end' : '',
    )}>
      {chat.author === 'user' && chat.image && (
        <div className='flex gap-1 max-w-9/10'>
          <div className='mb-2 w-fit rounded-lg'>
            <img
              alt={intl.formatMessage({ id: 'a11yUploadedImage' })}
              className='max-w-full h-auto rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700'
              style={{ maxHeight: '200px' }}
              src={getFile(chat.image)}
            />
          </div>
          {!chatbotConfig?.hideAvatar && (
            <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
              bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
              <UserIcon className='size-6' />
            </div>
          )}
        </div>
      )}
      {chat.author === 'user' && chat.messages.map((message, cidx) => (
        <div
          className='flex min-w-0 gap-1 max-w-9/10'
          key={`chat-user-message-${cidx}`}>
          <div
            className='mb-2 min-w-0 break-words bg-sky-900 dark:bg-sky-100 p-2 text-sm text-white dark:text-neutral-800
              rounded-lg border border-neutral-100 dark:border-neutral-800'
          >
            {message}
          </div>
          {!chatbotConfig?.hideAvatar && (
            <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
              bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
              <UserIcon className='size-6' />
            </div>
          )}
        </div>
      ))}
      {chat.author === 'bot' && chat.messages.map((message, cidx) => (
        <div
          className='flex min-w-0 gap-1 max-w-9/10'
          key={`chat-bot-message-${cidx}`}>
          {!chatbotConfig?.hideAvatar && (
            <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
              bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
              <SparklesIcon className='size-5' />
            </div>
          )}
          <div
            className='mb-2 min-w-0 break-words bg-gray-100 dark:bg-neutral-800 p-2 text-sm
              text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-100 dark:border-neutral-800'
            dangerouslySetInnerHTML={{
              __html: processMessageForDisplay(message),
            }}
          />
        </div>
      ))}
      {chat.author === 'products' && (
        productDisplayMode === 'hint' ? (
          <button
            type='button'
            onClick={() => onSelectTurn?.(chat.requestId)}
            className={cn(
                'w-fit text-left text-sm underline decoration-dotted cursor-pointer bg-transparent border-0 p-0',
                chat.requestId === activeRequestId ? 'font-semibold text-blue-900 dark:text-blue-50' : 'text-neutral-600 dark:text-neutral-400',
                FOCUS_VISIBLE_CLASSES,
            )}
          >
            {intl.formatMessage({ id: 'hintResultsShown' }, { count: (chat.products || []).length })}
          </button>
        ) : (
          <ProductGrid
            products={chat.products || []}
            requestId={chat.requestId}
            focusedProductId={focusedProductId}
            focusedRequestId={streamingRequestId}
            wishlistPids={wishlistPids}
            setIsInWishlist={setIsInWishlist}
            pwPrefix={pwPrefix}
            imageClasses={PRODUCT_IMAGE_MAX_HEIGHT_CLASS}
            className={cn('grid', productGridClasses)}
            style={productGridCssConfig}
            viewedProductIdsRef={viewedProductIdsRef}
          />
        )
      )}
    </div>
  );
};

export default memo(ChatRow);
