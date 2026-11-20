// Part of the LauncherEntry specs (see test-utils/launcher-harness.tsx for the shared setup).
import { act, fireEvent } from '@testing-library/react';
import { DEFAULT_CUSTOMIZATIONS } from '../default-config';
import { createLauncherHarness, texts } from './test-utils/launcher-harness';
import { mockFetchEventSource } from './test-utils/launcher-mocks';

jest.mock('@microsoft/fetch-event-source', () => jest.requireActual('./test-utils/launcher-mocks').fetchEventSourceModule);
jest.mock('react-webcam', () => jest.requireActual('./test-utils/launcher-mocks').webcamModule);
jest.mock('@heroui/input', () => jest.requireActual('./test-utils/launcher-mocks').heroUiInputModule);

describe('ai-assistant launcher entry — image and camera', () => {
  const harness = createLauncherHarness();
  const { renderLauncher, getTextInBody, revealAll, openEntryPointAndWait, sendMessageAndGetStreamController } = harness;

  describe('image entry point — camera-search-style upload UI', () => {
    it('shows the drag-to-search prompt and a camera link', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(getTextInBody(texts['dragImageToSearch'])).toBeTruthy();
      expect(getTextInBody(texts['useCamera'])).toBeTruthy();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
    });

    it('renders the default sample gallery images out-of-the-box', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(harness.testComponent.getByTestId('wigmix-gallery-image-1')).toBeTruthy();
    });

    it('defaults the gallery grid to 2 columns', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(harness.testComponent.getByTestId('asl-gallery-grid').className).toMatch(/grid-cols-2/);
    });

    it('applies imageUpload.galleryColumns to the gallery grid column count', () => {
      renderLauncher({
        imageUpload: { enable: true, icon: { color: '#929292', colorDark: '#929292' }, images: DEFAULT_CUSTOMIZATIONS.imageUpload?.images || [], galleryColumns: 3 },
      });
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(harness.testComponent.getByTestId('asl-gallery-grid').className).toMatch(/grid-cols-3/);
    });

    it('does not render the preset image gallery when imageUpload images are configured empty', () => {
      renderLauncher({ imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [] } });
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(harness.testComponent.queryByTestId('wigmix-gallery-image-1')).toBeNull();
    });

    it('sends a selected gallery image as the initial chat message, as an im_url with no client-side fetch', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn();
      mockFetchEventSource.mockImplementation(async () => {});
      try {
        renderLauncher({
          imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [{ url: 'https://example.com/shoe.jpg', label: 'Shoes' }] },
        });
        openEntryPointAndWait('a11yOpenImageSearch');
        await act(async () => {
          fireEvent.click(harness.testComponent.getByAltText('Shoes'));
        });
        expect(global.fetch).not.toHaveBeenCalled();
        const [calledUrl] = mockFetchEventSource.mock.calls[0];
        expect(decodeURIComponent(calledUrl as string)).toContain('im_url=https://example.com/shoe.jpg');
        const uploadedImage = harness.testComponent.getByAltText(texts['a11yUploadedImage']) as HTMLImageElement;
        expect(uploadedImage.src).toBe('https://example.com/shoe.jpg');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('main chat surface — camera drawer', () => {
    it('opens a camera drawer over the chat footer and sends the captured photo into the chat', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' })),
      }) as unknown as typeof fetch;
      mockFetchEventSource.mockImplementation(async () => {});
      try {
        renderLauncher();
        openEntryPointAndWait('a11yOpenAskAi');
        act(() => {
          fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
        });
        act(() => {
          fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yOpenCamera'] }));
        });
        expect(harness.testComponent.getByTestId('mock-webcam')).toBeTruthy();
        expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
        await act(async () => {
          fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yTakePhoto'] }));
        });
        expect(mockFetchEventSource).toHaveBeenCalled();
        expect(harness.testComponent.queryByTestId('mock-webcam')).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('image upload while a search is already in progress', () => {
    it('disables the "Add image" trigger while waiting on a reply, and re-enables it once one arrives', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const addImageButton = harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] }) as HTMLButtonElement;
      expect(addImageButton.disabled).toBe(false);
      const stream = sendMessageAndGetStreamController('Find me a jacket');
      expect(addImageButton.disabled).toBe(true);
      act(() => {
        fireEvent.click(addImageButton);
      });
      expect(harness.testComponent.queryByText(texts['a11yUploadImage'])).toBeNull();
      expect(harness.testComponent.queryByText(texts['a11yOpenCamera'])).toBeNull();
      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Here is a great jacket' });
      stream.closeStream();
      await revealAll();
      expect(addImageButton.disabled).toBe(false);
    });
  });

  describe('chat footer — combined image icon', () => {
    it('shows a single "Add image" trigger instead of separate camera/upload buttons', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] })).toBeTruthy();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(harness.testComponent.queryByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeNull();
    });

    it('reveals "Open camera" and "Upload image" options when the Add image trigger is clicked', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      expect(harness.testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('closes the menu without opening the camera or upload picker when clicking outside it', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      act(() => {
        fireEvent.mouseDown(document.body);
      });
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(harness.testComponent.queryByTestId('mock-webcam')).toBeNull();
    });

    it('closes the menu when Escape is pressed', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      act(() => {
        fireEvent.keyDown(document.body, { key: 'Escape' });
      });
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
    });
  });
});
