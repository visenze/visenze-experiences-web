import { type FC, type RefObject } from 'react';
import ChatInputFooter from './ChatInputFooter';
import ProductsPane from './ProductsPane';
import ChatWindow from '../../../common/components/chat/ChatWindow';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import type { SearchImage } from '../../../common/types/image';

interface SplitLayoutProps {
  chat: UseChatResult;
  darkMode: boolean;
  fontColorLight?: string;
  fontColorDark?: string;
  chatCameraEnabled: boolean;
  imageUploadIconUrl?: string;
  chatInputRef: RefObject<HTMLTextAreaElement>;
  openChatCameraButtonRef: RefObject<HTMLButtonElement>;
  showChatCameraCapture: boolean;
  setShowChatCameraCapture: (show: boolean) => void;
  closeChatCameraCapture: () => void;
  handleChatImage: (image: SearchImage) => void;
  handleSend: () => void;
}

const SplitLayout: FC<SplitLayoutProps> = ({
  chat, darkMode, fontColorLight, fontColorDark, chatCameraEnabled, imageUploadIconUrl,
  chatInputRef, openChatCameraButtonRef, showChatCameraCapture, setShowChatCameraCapture,
  closeChatCameraCapture, handleChatImage, handleSend,
}) => (
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
      <ChatInputFooter
        chat={chat}
        darkMode={darkMode}
        fontColorLight={fontColorLight}
        fontColorDark={fontColorDark}
        chatCameraEnabled={chatCameraEnabled}
        imageUploadIconUrl={imageUploadIconUrl}
        chatInputRef={chatInputRef}
        openChatCameraButtonRef={openChatCameraButtonRef}
        showChatCameraCapture={showChatCameraCapture}
        setShowChatCameraCapture={setShowChatCameraCapture}
        closeChatCameraCapture={closeChatCameraCapture}
        handleChatImage={handleChatImage}
        handleSend={handleSend}
      />
    </div>
    <ProductsPane
      breadcrumbs={chat.breadcrumbs}
      activeBreadcrumbId={chat.activeBreadcrumbId}
      setActiveBreadcrumb={chat.setActiveBreadcrumb}
      streamingProducts={chat.streamingProducts}
      streamingRequestId={chat.streamingRequestId}
      wishlistPids={chat.wishlistPids}
      setIsInWishlist={chat.setIsInWishlist}
    />
  </div>
);

export default SplitLayout;
