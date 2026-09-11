import { cn } from '@heroui/theme';
import type { FC } from 'react';

interface ToastProps {
  message: string;
  className?: string;
}

// A visible, transient error banner. Deliberately dumb: it renders whenever a caller passes a
// message and disappears the instant the caller stops (see use-voice.ts's own auto-clearing
// `hasSpeechOutputError` timer) — no dismiss timer or visibility state lives in here.
// Fixed to the chat panel (which is itself a full-viewport overlay — see FullScreenChatContainer):
// top-right on larger screens, a full-width top banner on small/mobile screens where a corner
// toast would be too easy to miss.
const Toast: FC<ToastProps> = ({ message, className }) => (
  <div
    role='alert'
    className={cn(
      'pointer-events-none fixed inset-x-4 top-4 z-20 flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end',
      className,
    )}
  >
    <div className='pointer-events-auto rounded-lg bg-red-600 px-3 py-2 text-center text-sm text-white shadow-lg dark:bg-red-500'>
      {message}
    </div>
  </div>
);

export default Toast;
