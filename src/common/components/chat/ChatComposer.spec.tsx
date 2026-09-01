import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { IntlProvider } from 'react-intl';
import ChatComposer from './ChatComposer';
import type { UseChatResult } from './use-chat';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';

const messages = {
  a11yChatInput: 'Chat input',
  chatBoxPlaceholder: 'Ask a question',
  a11yAddImage: 'Add image',
  a11yOpenCamera: 'Open camera',
  a11yUploadImage: 'Upload image',
  a11yStopVoiceInput: 'Stop voice input',
  a11yTranscribingVoice: 'Transcribing voice message',
  a11yListening: 'Listening',
  a11yHoldMicInstructions: 'Hold to record',
  holdMicToRecord: 'Hold to record',
  voiceInputError: 'Voice input error',
  a11ySendMessage: 'Send message',
};

const createMockChat = (overrides: Partial<UseChatResult> = {}): UseChatResult => ({
  chats: [],
  isWaiting: false,
  allowUserInput: true,
  message: '',
  setMessage: jest.fn(),
  showAllSuggestions: false,
  setShowAllSuggestions: jest.fn(),
  suggestions: [],
  streamingProducts: [],
  streamingRequestId: '',
  focusedProductId: null,
  typewriterText: '',
  hasStartedChat: true,
  isOpen: true,
  open: jest.fn(),
  close: jest.fn(),
  reopen: jest.fn(),
  newChat: jest.fn(),
  sendMessage: jest.fn(),
  wishlistPids: [],
  setIsInWishlist: jest.fn(),
  voiceEnabled: false,
  speechOutputEnabled: false,
  voiceStatus: 'idle',
  liveTranscript: '',
  hasVoiceError: false,
  isVoiceReadingEnabled: true,
  toggleVoiceReading: jest.fn(),
  isSpeechPlaying: false,
  startVoiceRecording: jest.fn(),
  stopRecording: jest.fn(),
  hasPendingSpeech: jest.fn(() => false),
  playGreeting: jest.fn(),
  breadcrumbs: [],
  activeBreadcrumbId: null,
  setActiveBreadcrumb: jest.fn(),
  ...overrides,
});

const renderComposer = (chat: UseChatResult, chatCameraEnabled = true): ReturnType<typeof render> => {
  const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');
  const chatInputRef = createRef<HTMLInputElement>();
  return render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <ChatComposer chat={chat} chatInputRef={chatInputRef} chatCameraEnabled={chatCameraEnabled} />
      </IntlProvider>
    </WidgetDataContext.Provider>,
  );
};

describe('ChatComposer image upload (once a chat is already in progress)', () => {
  it('keeps the file input mounted long enough to receive a file picked via the native dialog', async () => {
    const chat = createMockChat();
    renderComposer(chat);

    // Open the "Add image" popover (mirrors: chat already started, user taps the image trigger).
    fireEvent.click(screen.getByLabelText('Add image'));

    // Grab the underlying file input before clicking the "Upload image" menu item — this is the
    // same node the browser's native file dialog will (asynchronously) fire a change event on.
    const input = screen.getByTestId('wigmix-asl-chat-upload-dropzone') as HTMLInputElement;

    // Click the "Upload image" menu item's visible row (not the input) — this is what a real user
    // does to launch the native file picker.
    fireEvent.click(screen.getByText('Upload image'));

    // The native OS file dialog resolves asynchronously, well after this click handler returns.
    // Simulate that by firing the change event on the same input node afterwards.
    const file = new File(['(binary)'], 'shoe.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalled());
    expect(chat.sendMessage).toHaveBeenCalledWith(undefined, expect.objectContaining({ files: [file] }));
  });
});

describe('ChatComposer image upload while a search is already in progress', () => {
  it('disables the "Add image" trigger (with the camera+upload popover) so a new image cannot be started', () => {
    const chat = createMockChat({ allowUserInput: false });
    renderComposer(chat);

    const addImageButton = screen.getByLabelText('Add image') as HTMLButtonElement;
    expect(addImageButton.disabled).toBe(true);

    // Disabled buttons don't fire click handlers in the browser — react-dropzone's own onClick
    // (which opens the native file picker) is likewise unreachable, but assert the popover really
    // can't be opened at all, not just that the trigger looks disabled.
    fireEvent.click(addImageButton);
    expect(screen.queryByText('Upload image')).toBeNull();
    expect(screen.queryByText('Open camera')).toBeNull();
  });

  it('disables the upload dropzone directly when the camera entry point is off', () => {
    const chat = createMockChat({ allowUserInput: false });
    renderComposer(chat, false);

    const input = screen.getByTestId('wigmix-asl-chat-upload-dropzone') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const file = new File(['(binary)'], 'shoe.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it('re-enables the "Add image" trigger once the search completes', () => {
    const chat = createMockChat({ allowUserInput: false });
    const { rerender } = renderComposer(chat, true);
    expect((screen.getByLabelText('Add image') as HTMLButtonElement).disabled).toBe(true);

    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');
    const chatInputRef = createRef<HTMLInputElement>();
    rerender(
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
        <IntlProvider messages={messages} locale='en' defaultLocale='en'>
          <ChatComposer chat={{ ...chat, allowUserInput: true }} chatInputRef={chatInputRef} chatCameraEnabled />
        </IntlProvider>
      </WidgetDataContext.Provider>,
    );

    expect((screen.getByLabelText('Add image') as HTMLButtonElement).disabled).toBe(false);
  });
});
