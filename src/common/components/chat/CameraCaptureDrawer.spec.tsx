import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import CameraCaptureDrawer from './CameraCaptureDrawer';

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
  a11yCameraDrawer: 'Camera',
  a11yCameraPreview: 'Camera preview',
  a11yCloseCamera: 'Close camera',
  a11yTakePhoto: 'Take photo',
  a11ySwitchCamera: 'Switch camera',
};

const renderDrawer = (
  onClose: jest.Mock = jest.fn(),
  onCapture: jest.Mock = jest.fn(),
): ReturnType<typeof render> => render(
  <IntlProvider messages={messages} locale='en' defaultLocale='en'>
    <CameraCaptureDrawer iconColor='#4285f4' onClose={onClose} onCapture={onCapture} />
  </IntlProvider>,
);

describe('CameraCaptureDrawer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // The component converts the webcam's data-URL screenshot to a File via fetch(...).blob() —
    // jsdom doesn't implement fetch, so stub it the same way shopping-assistant's spec does.
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['mock'], { type: 'image/png' })),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders a labelled dialog with the webcam preview and focuses the close button', () => {
    renderDrawer();
    const dialog = screen.getByRole('dialog', { name: messages.a11yCameraDrawer });
    expect(screen.getByTestId('mock-webcam')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: messages.a11yCloseCamera }));
    expect(dialog).toBeTruthy();
  });

  it('capturing a photo converts the screenshot to a File and calls onCapture then onClose', async () => {
    const onClose = jest.fn();
    const onCapture = jest.fn();
    renderDrawer(onClose, onCapture);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: messages.a11yTakePhoto }));
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    const captured = onCapture.mock.calls[0][0];
    expect(captured.files[0]).toBeInstanceOf(File);
    expect(captured.file).toBe('data:image/png;base64,mockScreenshot');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closing via the close button calls onClose without capturing', () => {
    const onClose = jest.fn();
    const onCapture = jest.fn();
    renderDrawer(onClose, onCapture);

    fireEvent.click(screen.getByRole('button', { name: messages.a11yCloseCamera }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('pressing Escape closes the drawer', () => {
    const onClose = jest.fn();
    renderDrawer(onClose);

    fireEvent.keyDown(screen.getByRole('dialog', { name: messages.a11yCameraDrawer }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus cycling between close, take-photo, and switch-camera', () => {
    renderDrawer();
    const dialog = screen.getByRole('dialog', { name: messages.a11yCameraDrawer });
    const closeButton = screen.getByRole('button', { name: messages.a11yCloseCamera });
    const takePhotoButton = screen.getByRole('button', { name: messages.a11yTakePhoto });
    const switchCameraButton = screen.getByRole('button', { name: messages.a11ySwitchCamera });

    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(takePhotoButton);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(switchCameraButton);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(switchCameraButton);
  });

  it('switching the camera does not throw and keeps the preview mounted', () => {
    renderDrawer();
    const switchCameraButton = screen.getByRole('button', { name: messages.a11ySwitchCamera });

    fireEvent.click(switchCameraButton);

    expect(screen.getByTestId('mock-webcam')).toBeTruthy();
  });
});
