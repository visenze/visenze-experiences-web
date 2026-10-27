import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ResolvedOptionField } from './add-to-cart-options';
import AddToCartOptionsPanel from './AddToCartOptionsPanel';
import { COMMON_TEXTS } from '../../locales/locale';
import { WidgetDataContext } from '../../types/contexts';
import type { WidgetClient, WidgetConfig } from '../../wigmix-core';

describe('AddToCartOptionsPanel', () => {
  const fields: ResolvedOptionField[] = [
    { key: 'size', label: 'Size', layout: 'CAROUSEL', values: ['5', '5.5', '6'] },
    { key: 'width', label: 'Width', layout: 'RADIO', values: ['Regular', 'Wide'] },
    { key: 'color', label: 'Colour', layout: 'DROPDOWN', values: ['Black', 'White'] },
  ];
  const widgetConfig = {
    customizations: {
      productCard: { addToCart: { enable: true, layout: 'TEXT', backgroundColor: '#000000', color: '#FFFFFF' } },
    },
  } as unknown as WidgetConfig;

  const renderPanel = (
    onConfirm = jest.fn(() => Promise.resolve()),
    onClose = jest.fn(),
    panelFields: ResolvedOptionField[] = fields,
    productTitle = 'H-Street',
  ): void => {
    render(
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient: {} as WidgetClient, darkMode: false, locale: 'en' }}>
        <IntlProvider messages={{ ...COMMON_TEXTS['en'], addToCart: 'Add to cart' }} locale='en' defaultLocale='en'>
          <AddToCartOptionsPanel productTitle={productTitle} fields={panelFields} onConfirm={onConfirm} onClose={onClose} />
        </IntlProvider>
      </WidgetDataContext.Provider>,
    );
  };

  it('renders the prompt and one control per layout', () => {
    renderPanel();
    expect(screen.getByText('We\'re here to help! Please choose from the available options for H-Street.')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Size' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Width' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Colour' })).toBeTruthy();
    expect(screen.getByText('Select Colour')).toBeTruthy();
  });

  it('shows a label on every field and the title as is', () => {
    renderPanel(undefined, undefined, fields, 'Nike Air Max Black');
    expect(screen.getByText('We\'re here to help! Please choose from the available options for Nike Air Max Black.')).toBeTruthy();
    ['Size', 'Width', 'Colour'].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
  });

  it('enables the confirm button only once every field has a value, then passes the selection', async () => {
    const onConfirm = jest.fn(() => Promise.resolve());
    renderPanel(onConfirm);
    const confirm = screen.getByTestId('wigmix-add-to-cart-options-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: '5.5' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Wide' }));
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByRole('combobox', { name: 'Colour' }));
    fireEvent.click(screen.getByRole('option', { name: 'White' }));
    expect(confirm.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(confirm);
    });
    expect(onConfirm).toHaveBeenCalledWith({ size: '5.5', width: 'Wide', color: 'White' });
  });

  it('shows a single drop-down value without a drop-down, already selected', async () => {
    const onConfirm = jest.fn(() => Promise.resolve());
    renderPanel(onConfirm, undefined, [
      { key: 'size', label: 'Size', layout: 'CAROUSEL', values: ['5', '6'] },
      { key: 'color', label: 'Colour', layout: 'DROPDOWN', values: ['Black/Pelé Yellow'] },
    ]);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByTestId('wigmix-add-to-cart-option-single').textContent).toBe('Colour: Black/Pelé Yellow');

    fireEvent.click(screen.getByRole('radio', { name: '6' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-add-to-cart-options-confirm'));
    });
    expect(onConfirm).toHaveBeenCalledWith({ size: '6', color: 'Black/Pelé Yellow' });
  });

  it('moves the selection with arrow keys', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    fireEvent.keyDown(screen.getByRole('radio', { name: '5' }), { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: '5.5' }).getAttribute('aria-checked')).toBe('true');
  });

  it('closes with the close button and with Escape', () => {
    const onClose = jest.fn();
    renderPanel(undefined, onClose);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('radio', { name: '5' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
