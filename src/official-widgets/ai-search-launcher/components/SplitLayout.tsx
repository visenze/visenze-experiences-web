import { type FC, type RefObject, useContext } from 'react';
import ProductsPane from './ProductsPane';
import ChatComposer from '../../../common/components/chat/ChatComposer';
import ChatWindow from '../../../common/components/chat/ChatWindow';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { WidgetDataContext } from '../../../common/types/contexts';

interface SplitLayoutProps {
  chat: UseChatResult;
  chatCameraEnabled: boolean;
  chatInputRef: RefObject<HTMLInputElement>;
}

// Defaults when `customizations.chat.splitLayout` (paneWidth/divider) is unset — match this
// component's previous hardcoded w-[400px]/border-neutral-300/dark:border-neutral-800 look.
const DEFAULT_PANE_WIDTH = 400;

const SplitLayout: FC<SplitLayoutProps> = ({ chat, chatCameraEnabled, chatInputRef }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const splitLayout = widgetConfig.customizations.chat?.splitLayout;
  const paneWidth = splitLayout?.paneWidth ?? DEFAULT_PANE_WIDTH;
  const divider = splitLayout?.divider;
  const dividerColor = darkMode ? divider?.colorDark : divider?.color;

  return (
    <div className='flex size-full min-h-0' data-testid='asl-split-layout'>
      <div
        data-testid='asl-split-chat-pane'
        className='flex min-w-[340px] min-h-0 flex-col border-r border-neutral-300 dark:border-neutral-800'
        style={{
          width: `${paneWidth}px`,
          borderRightColor: dividerColor || undefined,
          borderRightWidth: divider?.width ? `${divider.width}px` : undefined,
        }}
      >
        <ChatWindow
          isWaiting={chat.isWaiting}
          chats={chat.chats}
          latestMessage={chat.typewriterText}
          suggestions={chat.suggestions}
          showAllSuggestions={chat.showAllSuggestions}
          setShowAllSuggestions={chat.setShowAllSuggestions}
          sendMessage={chat.sendMessage}
          streamingProducts={chat.streamingProducts}
          streamingRequestId={chat.streamingRequestId}
          focusedProductId={chat.focusedProductId}
          wishlistPids={chat.wishlistPids}
          setIsInWishlist={chat.setIsInWishlist}
          pwPrefix='asl'
          productDisplayMode='hint'
          activeRequestId={chat.activeBreadcrumbId}
          onSelectTurn={chat.setActiveBreadcrumb}
        />
        <ChatComposer chat={chat} chatInputRef={chatInputRef} chatCameraEnabled={chatCameraEnabled} />
      </div>
      <ProductsPane
        breadcrumbs={chat.breadcrumbs}
        activeBreadcrumbId={chat.activeBreadcrumbId}
        onTrailSelect={chat.setActiveBreadcrumb}
        streamingProducts={chat.streamingProducts}
        streamingRequestId={chat.streamingRequestId}
        focusedProductId={chat.focusedProductId}
        wishlistPids={chat.wishlistPids}
        setIsInWishlist={chat.setIsInWishlist}
      />
    </div>
  );
};

export default SplitLayout;
