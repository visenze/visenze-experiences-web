import { render } from '@testing-library/react';
import ProductGridSkeleton from './ProductGridSkeleton';

describe('ProductGridSkeleton', () => {
  it('renders a fixed number of placeholder cards, hidden from assistive tech', () => {
    const { container, getByTestId } = render(<ProductGridSkeleton className='my-grid-class' />);

    const root = getByTestId('asl-product-grid-skeleton');
    expect(root.className).toBe('my-grid-class');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('[data-testid="asl-product-grid-skeleton"] > *').length).toBeGreaterThan(0);
  });
});
