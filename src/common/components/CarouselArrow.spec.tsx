import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import CarouselArrow from './CarouselArrow';

const renderArrow = (props: Partial<React.ComponentProps<typeof CarouselArrow>> = {}): ReturnType<typeof render> => render(
  <IntlProvider locale='en' messages={{}} onError={() => undefined}>
    <CarouselArrow direction='next' {...props} />
  </IntlProvider>,
);

describe('CarouselArrow', () => {
  it('renders the next and prev buttons with their test ids and labels', () => {
    const next = renderArrow({ pwPrefix: 'stl2' });
    expect(next.getByTestId('wigmix-next-arrow').getAttribute('data-pw')).toBe('stl2-next-arrow');
    expect(next.getByLabelText('Next products')).toBeTruthy();
    const prev = renderArrow({ direction: 'prev' });
    expect(prev.getByLabelText('Previous products')).toBeTruthy();
  });

  it('sits beside the carousel by default and over its edge when inside', () => {
    expect(renderArrow().getByTestId('wigmix-next-arrow').className).toContain('-right-9');
    expect(renderArrow({ inside: true }).getAllByTestId('wigmix-next-arrow')[1].className).toContain('right-1');
    expect(renderArrow({ direction: 'prev' }).getAllByTestId('wigmix-prev-arrow')[0].className).toContain('-left-9');
  });

  it('is disabled and hidden at the end of the carousel, and forwards clicks otherwise', () => {
    const onClick = jest.fn();
    const enabled = renderArrow({ onClick });
    fireEvent.click(enabled.getAllByTestId('wigmix-next-arrow')[0]);
    expect(onClick).toHaveBeenCalledTimes(1);
    const disabled = renderArrow({ className: 'slick-arrow slick-disabled', onClick });
    const button = disabled.getAllByTestId('wigmix-next-arrow')[1] as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.className).toContain('opacity-0');
  });
});
