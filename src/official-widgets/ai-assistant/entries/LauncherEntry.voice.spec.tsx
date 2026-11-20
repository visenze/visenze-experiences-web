// Part of the LauncherEntry specs (see test-utils/launcher-harness.tsx for the shared setup).
import { act, fireEvent } from '@testing-library/react';
import { DEFAULT_CUSTOMIZATIONS } from '../default-config';
import { aiGreeting, createLauncherHarness, texts, withChatbot, withLauncher } from './test-utils/launcher-harness';

jest.mock('@microsoft/fetch-event-source', () => jest.requireActual('./test-utils/launcher-mocks').fetchEventSourceModule);
jest.mock('react-webcam', () => jest.requireActual('./test-utils/launcher-mocks').webcamModule);
jest.mock('@heroui/input', () => jest.requireActual('./test-utils/launcher-mocks').heroUiInputModule);

describe('ai-assistant launcher entry — voice', () => {
  const harness = createLauncherHarness();
  const { renderLauncher, getTextInBody, revealAll, openEntryPointAndWait, sendMessageAndGetStreamController, installSpeechRecognition } = harness;

  describe('mic entry screen — recording controls', () => {
    let mockRecognitionInstances: MockSpeechRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;

      interimResults = false;

      onresult: ((event: any) => void) | null = null;

      onerror: ((event: any) => void) | null = null;

      onend: (() => void) | null = null;

      start = jest.fn();

      stop = jest.fn();

      abort = jest.fn();

      constructor() {
        mockRecognitionInstances.push(this);
      }
    }

    const getMicButton = (): HTMLElement => harness.testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true });
    const voiceOn = withChatbot({ voiceEnabled: true });

    beforeEach(() => {
      mockRecognitionInstances = [];
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    afterEach(() => {
      delete (window as any).SpeechRecognition;
    });

    it('gives the mic button a visible circular border', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      expect(micButton.className).toMatch(/rounded-full/);
      expect(micButton.className).toMatch(/\bborder\b/);
      expect(micButton.className).not.toMatch(/border-0/);
    });

    it('applies generalLayout.border to the mic button', () => {
      renderLauncher({ ...voiceOn, generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 2, color: '#123456', colorDark: '#654321' } } });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      expect(micButton.style.borderColor).toBe('#123456');
      expect(micButton.style.borderWidth).toBe('2px');
    });

    it('uses chatbot.inputBar.voiceRecordingColor for the recording-state icon', () => {
      renderLauncher(withChatbot({ voiceEnabled: true, inputBar: { ...DEFAULT_CUSTOMIZATIONS.chatbot?.inputBar, voiceRecordingColor: '#123456' } }));
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      act(() => {
        fireEvent.click(micButton);
      });
      const recordingIcon = micButton.querySelector('.animate-pulse') as HTMLElement;
      expect(recordingIcon.style.color).toBe('rgb(18, 52, 86)');
    });

    it('starts recording immediately when clicked', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      expect(mockRecognitionInstances).toHaveLength(1);
      expect(mockRecognitionInstances[0].start).toHaveBeenCalled();
    });

    it('does not stop recording before the default 5-second duration elapses', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(4900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
    });

    it('automatically stops recording once the default 5-second duration elapses', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(5310);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('honours aiAssistant.launcher.voiceRecordingMaxDurationSeconds instead of the default', () => {
      renderLauncher({ ...voiceOn, ...withLauncher({ voiceRecordingMaxDurationSeconds: 2 }) });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(1900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(2310 - 1900);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('a set aiAssistant.launcher duration wins over the ai-search-launcher customizations.launcher duration', () => {
      renderLauncher({ ...voiceOn, ...withLauncher({ voiceRecordingMaxDurationSeconds: 8 }), launcher: { voiceRecordingMaxDurationSeconds: 2 } });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(7900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });
  });

  describe('greeting playback', () => {
    it('shows the configured ai greeting as a bot chat bubble when Ask AI opens', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(aiGreeting).toBeTruthy();
      expect(getTextInBody(aiGreeting)).toBeTruthy();
    });

    it('resets the visible chat state and replays the greeting when the new-chat button is clicked', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const stream = sendMessageAndGetStreamController('Hello');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Hi there!' });
      stream.closeStream();
      await revealAll();
      expect(getTextInBody('Hi there!')).toBeTruthy();
      act(() => {
        fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yStartNewChat'] }));
      });
      expect(getTextInBody('Hi there!')).toBeNull();
      expect(getTextInBody(aiGreeting)).toBeTruthy();
    });
  });

  describe('mute control', () => {
    it('toggles its own aria-pressed/label state when clicked', () => {
      renderLauncher(withChatbot({ voiceEnabled: true, startMuted: false }));
      openEntryPointAndWait('a11yOpenAskAi');
      const muteButton = harness.testComponent.getByRole('button', { name: texts['a11yToggleMute'] });
      expect(muteButton.getAttribute('aria-pressed')).toBe('false');
      act(() => {
        fireEvent.click(muteButton);
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yEnableMute'] })).toBe(muteButton);
      expect(muteButton.getAttribute('aria-pressed')).toBe('true');
      act(() => {
        fireEvent.click(muteButton);
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yToggleMute'] }).getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('configurable voice and camera controls', () => {
    it('hides the in-chat footer camera button (but keeps upload) when chatCameraEnabled is disabled', () => {
      renderLauncher(withLauncher({ chatCameraEnabled: false }));
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(harness.testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('hides the in-chat footer mic button and the mute toggle when voiceEnabled is disabled', () => {
      const restore = installSpeechRecognition();
      try {
        renderLauncher(withChatbot({ voiceEnabled: false }));
        openEntryPointAndWait('a11yOpenAskAi');
        expect(harness.testComponent.queryByRole('button', { name: texts['a11yTapToRecord'], hidden: true })).toBeNull();
        expect(harness.testComponent.queryByRole('button', { name: texts['a11yToggleMute'] })).toBeNull();
      } finally {
        restore();
      }
    });
  });
});
