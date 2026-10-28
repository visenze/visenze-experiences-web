import { type FC, useEffect, useRef } from 'react';
import { ensureOpen, useAssistantSession } from './assistant-session';
import type { EntryProps } from './entry-props';
import PromptBoxPanel from '../components/PromptBoxPanel';

// The inline prompt box: whatever is asked here goes to the shared conversation and shows the shared drawer.
const PromptBoxEntry: FC<EntryProps> = ({ productId }) => {
  const { chat, store } = useAssistantSession();

  // Every interaction makes this box the active entry, with its product id: the store then sends that
  // id with follow-ups that carry none (typed in the drawer, its suggestion chips, voice).
  const show = (): void => {
    store.setActiveEntry('prompt-box', productId);
    ensureOpen(store);
  };

  // A data-pid change (e.g. a single-page app moving to another product) while this box is still the
  // active entry goes with the next follow-up. Only when the active product is still this box's
  // previous one, so a change on another prompt box of the placement never takes over.
  const previousProductId = useRef(productId);
  useEffect(() => {
    const previous = previousProductId.current;
    previousProductId.current = productId;
    if (previous !== productId && store.getActiveEntry() === 'prompt-box' && store.getActiveProductId() === (previous || undefined)) {
      store.setActiveEntry('prompt-box', productId);
    }
  }, [productId, store]);

  // The box's own sends also carry the product id per message, which wins over everything else.
  const send = (message: string): void => {
    if (!message.trim()) {
      return;
    }
    show();
    chat.sendMessage(message, productId ? { pid: productId } : undefined);
  };

  return (
    <PromptBoxPanel
      productId={productId}
      message={chat.message}
      setMessage={chat.setMessage}
      // Before any session exists nothing is in flight, so the box is usable; sending opens one.
      // (The store starts with allowUserInput false until open() — nothing opens the session on mount
      // here, since that would also show the drawer.)
      allowUserInput={chat.allowUserInput || !chat.chatId}
      hasConversation={chat.chats.length > 0}
      onSend={send}
      onNewChat={chat.newChat}
    />
  );
};

export default PromptBoxEntry;
