import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { IntlProvider } from 'react-intl';
import ChatInputBar from './ChatInputBar';

// Mock react-webcam so the CameraCaptureDrawer this component renders doesn't need a real camera.
jest.mock('react-webcam', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    __esModule: true,
    default: forwardRef((_props: any, ref: any) => {
      useImperativeHandle(ref, () => ({
        getScreenshot: jest.fn(() => 'data:image/png;base64,mockScreenshot'),
      }));
      return <video data-testid='mock-webcam' />;
    }),
  };
});

const messages = {
  askPlaceholder: 'Ask anything...',
  a11yUploadImage: 'Upload an image to search',
  a11yOpenCamera: 'Open camera',
  a11yCameraDrawer: 'Camera',
  a11yCameraPreview: 'Camera preview',
  a11yCloseCamera: 'Close camera',
  a11yTakePhoto: 'Take photo',
  a11ySwitchCamera: 'Switch camera',
  a11yStartVoiceInput: 'Start voice input',
  a11yStopVoiceInput: 'Stop recording and send',
  voiceInputError: 'Voice input unavailable',
  a11ySend: 'Send',
};

type ChatInputBarProps = ComponentProps<typeof ChatInputBar>;

const renderBar = (props: Partial<ChatInputBarProps> = {}): ReturnType<typeof render> => {
  const defaultProps: ChatInputBarProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    onImageSelect: jest.fn(),
    voiceEnabled: false,
    voiceStatus: 'idle',
    hasVoiceError: false,
    onStartVoiceRecording: jest.fn(),
    onStopVoiceRecording: jest.fn(),
    ...props,
  };
  return render(
    <IntlProvider messages={messages} locale='en' defaultLocale='en'>
      <ChatInputBar {...defaultProps} />
    </IntlProvider>,
  );
};

describe('ChatInputBar', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // The camera drawer converts the webcam's data-URL screenshot to a File via fetch(...).blob()
    // — jsdom doesn't implement fetch, so stub it the same way shopping-assistant's spec does.
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['mock'], { type: 'image/png' })),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports text changes and submits on Enter', () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    renderBar({ value: 'sneakers', onChange, onSubmit });

    const input = screen.getByPlaceholderText(messages.askPlaceholder);
    fireEvent.change(input, { target: { value: 'blue sneakers' } });
    expect(onChange).toHaveBeenCalledWith('blue sneakers');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits when the send button is clicked', () => {
    const onSubmit = jest.fn();
    renderBar({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: messages.a11ySend }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('forwards a picked file straight through to onImageSelect', () => {
    const onImageSelect = jest.fn();
    renderBar({ onImageSelect });

    const file = new File(['data'], 'shoe.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onImageSelect).toHaveBeenCalledWith(file);
  });

  it('opens the live camera drawer, captures a photo, forwards the file, and closes', async () => {
    const onImageSelect = jest.fn();
    renderBar({ onImageSelect });

    fireEvent.click(screen.getByRole('button', { name: messages.a11yOpenCamera }));
    const dialog = screen.getByRole('dialog', { name: messages.a11yCameraDrawer });
    expect(within(dialog).getByTestId('mock-webcam')).toBeTruthy();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: messages.a11yTakePhoto }));
    });

    expect(onImageSelect).toHaveBeenCalledTimes(1);
    expect(onImageSelect.mock.calls[0][0]).toBeInstanceOf(File);
    expect(screen.queryByRole('dialog', { name: messages.a11yCameraDrawer })).toBeNull();
  });

  it('closing the camera drawer restores focus to the camera button without capturing anything', () => {
    const onImageSelect = jest.fn();
    renderBar({ onImageSelect });

    const openCameraButton = screen.getByRole('button', { name: messages.a11yOpenCamera });
    fireEvent.click(openCameraButton);
    const dialog = screen.getByRole('dialog', { name: messages.a11yCameraDrawer });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: messages.a11yCameraDrawer })).toBeNull();
    expect(document.activeElement).toBe(openCameraButton);
    expect(onImageSelect).not.toHaveBeenCalled();
  });

  it('hides the voice button entirely when voice is not enabled', () => {
    renderBar({ voiceEnabled: false });
    expect(screen.queryByRole('button', { name: messages.a11yStartVoiceInput })).toBeNull();
  });

  it('clicking the mic while idle starts recording', () => {
    const onStartVoiceRecording = jest.fn();
    const onStopVoiceRecording = jest.fn();
    renderBar({ voiceEnabled: true, voiceStatus: 'idle', onStartVoiceRecording, onStopVoiceRecording });

    fireEvent.click(screen.getByRole('button', { name: messages.a11yStartVoiceInput }));

    expect(onStartVoiceRecording).toHaveBeenCalledTimes(1);
    expect(onStopVoiceRecording).not.toHaveBeenCalled();
  });

  it('clicking the mic while recording stops it, and the button is announced as pressed', () => {
    const onStartVoiceRecording = jest.fn();
    const onStopVoiceRecording = jest.fn();
    renderBar({ voiceEnabled: true, voiceStatus: 'recording', onStartVoiceRecording, onStopVoiceRecording });

    const micButton = screen.getByRole('button', { name: messages.a11yStopVoiceInput });
    expect(micButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(micButton);

    expect(onStopVoiceRecording).toHaveBeenCalledTimes(1);
    expect(onStartVoiceRecording).not.toHaveBeenCalled();
  });

  it('disables the mic button while transcribing so it cannot be toggled again mid-flight', () => {
    const onStartVoiceRecording = jest.fn();
    const onStopVoiceRecording = jest.fn();
    renderBar({ voiceEnabled: true, voiceStatus: 'transcribing', onStartVoiceRecording, onStopVoiceRecording });

    const micButton = screen.getByRole('button', { name: messages.a11yStartVoiceInput }) as HTMLButtonElement;
    expect(micButton.disabled).toBe(true);

    fireEvent.click(micButton);

    expect(onStartVoiceRecording).not.toHaveBeenCalled();
    expect(onStopVoiceRecording).not.toHaveBeenCalled();
  });

  it('surfaces the voice error message in the mic button title', () => {
    renderBar({ voiceEnabled: true, voiceStatus: 'idle', hasVoiceError: true });
    const micButton = screen.getByRole('button', { name: messages.a11yStartVoiceInput });
    expect(micButton.getAttribute('title')).toBe(messages.voiceInputError);
  });
});
