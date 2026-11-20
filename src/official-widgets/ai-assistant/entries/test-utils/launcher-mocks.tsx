import { forwardRef, type ReactElement, useImperativeHandle } from 'react';

// Shared module-level mocks for the LauncherEntry specs. jest.mock calls must live in each spec file (they are
// hoisted per file), but their factories come from here: a spec does
//   jest.mock('@microsoft/fetch-event-source', () => jest.requireActual('./launcher-mocks').fetchEventSourceModule);
// This file imports no widget code, so it can never form an import cycle with the mocked modules.

export const mockFetchEventSource = jest.fn();

export const fetchEventSourceModule = {
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
};

export const webcamModule = {
  __esModule: true,
  default: forwardRef((_props: any, ref: any): ReactElement => {
    useImperativeHandle(ref, () => ({
      getScreenshot: jest.fn(() => 'data:image/png;base64,mockScreenshot'),
    }));
    return <video data-testid='mock-webcam' />;
  }),
};

export const heroUiInputModule = {
  Textarea: (props: any): ReactElement => (
    <div data-testid='chat-textarea-wrapper'>
      <textarea
        data-testid='chat-textarea'
        aria-label={props['aria-label']}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
      {props.endContent && <div data-testid='chat-submit-button'>{props.endContent}</div>}
    </div>
  ),
  Input: (props: any): ReactElement => (
    <div data-testid='chat-textarea-wrapper'>
      <input
        data-testid='chat-textarea'
        aria-label={props['aria-label']}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
      {props.endContent && <div data-testid='chat-submit-button'>{props.endContent}</div>}
    </div>
  ),
};
