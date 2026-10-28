export interface VoiceBridge {
  beginReply: () => boolean;
  updateLatestMessage: (text: string) => void;
  speak: (text: string, revealTarget: number, productId: string | null, narration?: boolean) => boolean;
  hasPendingSpeech: () => boolean;
  deferCommit: (commit: () => void) => void;
  forceRevealTypewriter: (text: string) => void;
  getTypewriterLength: () => number;
  resetReplyState: () => void;
  stopAudio: () => void;
  interruptSpeech: () => void;
  shouldSpeakReply: () => boolean;
  isVoiceReadingEnabledNow: () => boolean;
}

export const NULL_VOICE_BRIDGE: VoiceBridge = {
  beginReply: () => false,
  updateLatestMessage: () => {},
  speak: () => false,
  hasPendingSpeech: () => false,
  deferCommit: (commit) => commit(),
  forceRevealTypewriter: () => {},
  getTypewriterLength: () => 0,
  resetReplyState: () => {},
  stopAudio: () => {},
  interruptSpeech: () => {},
  shouldSpeakReply: () => false,
  isVoiceReadingEnabledNow: () => false,
};
