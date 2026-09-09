import { render } from '@testing-library/react';
import { RootContext } from '../shadow-wrapper';
import ViSenzeModal from './visenze-modal';

describe('ViSenzeModal', () => {
  const baseProps = {
    open: true,
    onClose: jest.fn(),
    layout: 'desktop' as const,
    placementId: '1234',
    darkMode: false,
    fontFamily: '',
    renderWithoutPortal: true,
  };

  it('defaults to the panel variant', () => {
    render(
      <RootContext.Provider value={document.body}>
        <ViSenzeModal {...baseProps} position='left'>
          <div>content</div>
        </ViSenzeModal>
      </RootContext.Provider>,
    );
    const modal = document.body.querySelector('.wigmix-modal') as HTMLElement;
    expect(modal.className).toContain('wigmix-modal-variant-panel');
    expect(modal.className).not.toContain('wigmix-modal-variant-floating-card');
  });

  it('applies the floating-card variant and size when requested', () => {
    render(
      <RootContext.Provider value={document.body}>
        <ViSenzeModal {...baseProps} position='center' variant='floating-card' floatingSize={{ width: 400, height: 600 }}>
          <div>content</div>
        </ViSenzeModal>
      </RootContext.Provider>,
    );
    const modal = document.body.querySelector('.wigmix-modal') as HTMLElement;
    expect(modal.className).toContain('wigmix-modal-variant-floating-card');
    expect(modal.style.getPropertyValue('--wigmix-floating-width')).toBe('400px');
    expect(modal.style.getPropertyValue('--wigmix-floating-height')).toBe('600px');
  });
});
