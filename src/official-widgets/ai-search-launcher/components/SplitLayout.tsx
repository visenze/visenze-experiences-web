import { type FC, type RefObject } from 'react';
import ProductsPane from './ProductsPane';
import ChatComposer from '../../../common/components/chat/ChatComposer';
import ChatWindow from '../../../common/components/chat/ChatWindow';
import type { UseChatResult } from '../../../common/components/chat/use-chat';

interface SplitLayoutProps {
  chat: UseChatResult;
  chatCameraEnabled: boolean;
  chatInputRef: RefObject<HTMLInputElement>;
}

const SplitLayout: FC<SplitLayoutProps> = ({ chat, chatCameraEnabled, chatInputRef }) => (
  <div className='flex size-full min-h-0' data-testid='asl-split-layout'>
    <div className='flex min-w-[340px] w-[400px] min-h-0 flex-col border-r border-neutral-300 dark:border-neutral-800'>
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

export default SplitLayout;
