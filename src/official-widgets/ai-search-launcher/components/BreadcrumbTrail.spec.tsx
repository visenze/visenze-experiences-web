import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import BreadcrumbTrail from './BreadcrumbTrail';
import type { BreadcrumbTurn } from '../../../common/components/chat/use-chat';

const messages = {
  a11yBreadcrumbTrail: 'Search refinement steps',
  a11ySelectResultSet: 'Show results for: {label}',
  a11yShowMoreBreadcrumbs: 'Show {count} more searches',
  a11yHiddenBreadcrumbs: 'Hidden searches',
};

const renderTrail = (breadcrumbs: BreadcrumbTurn[], activeBreadcrumbId: string | null, onSelect = jest.fn()): ReturnType<typeof render> => render(
  <IntlProvider messages={messages} locale='en' defaultLocale='en'>
    <BreadcrumbTrail breadcrumbs={breadcrumbs} activeBreadcrumbId={activeBreadcrumbId} onSelect={onSelect} />
  </IntlProvider>,
);

const makeCrumb = (n: number): BreadcrumbTurn => ({ requestId: `req-${n}`, label: `search ${n}`, products: [] });

describe('BreadcrumbTrail', () => {
  it('renders one crumb per breadcrumb and highlights the active one as non-interactive text', () => {
    const { getByRole, getByText } = renderTrail(
      [
        { requestId: 'req-1', label: 'blue jeans', products: [] },
        { requestId: 'req-2', label: 'cropped', products: [] },
      ],
      'req-2',
    );
    const activeCrumb = getByText('cropped').closest('[aria-current]') as HTMLElement;
    expect(activeCrumb.tagName).toBe('SPAN');
    expect(activeCrumb.getAttribute('aria-current')).toBe('true');
    const inactiveCrumb = getByRole('button', { name: /blue jeans/ });
    expect(inactiveCrumb.getAttribute('aria-current')).toBeNull();
  });

  it('calls onSelect with the clicked crumb\'s requestId', () => {
    const onSelect = jest.fn();
    const { getByRole } = renderTrail(
      [{ requestId: 'req-1', label: 'blue jeans', products: [] }, { requestId: 'req-2', label: 'cropped', products: [] }],
      'req-2',
      onSelect,
    );
    fireEvent.click(getByRole('button', { name: /blue jeans/ }));
    expect(onSelect).toHaveBeenCalledWith('req-1');
  });

  it('renders nothing when there are no breadcrumbs', () => {
    const { queryByRole } = renderTrail([], null);
    expect(queryByRole('navigation')).toBeNull();
  });

  it('sets a title attribute with the full label for tooltip-on-hover, for both active and inactive crumbs', () => {
    const longLabel = 'a very long search query that should be truncated visually but not in the tooltip';
    const { getByRole, getByText } = renderTrail(
      [{ requestId: 'req-1', label: longLabel, products: [] }, { requestId: 'req-2', label: 'cropped', products: [] }],
      'req-2',
    );
    expect(getByRole('button', { name: new RegExp(longLabel) }).getAttribute('title')).toBe(longLabel);
    expect(getByText('cropped').closest('[title]')?.getAttribute('title')).toBe('cropped');
  });

  it('does not collapse the trail when there are 4 or fewer breadcrumbs', () => {
    const breadcrumbs = Array.from({ length: 4 }, (_unused, i) => makeCrumb(i + 1));
    const { queryByText, getByRole } = renderTrail(breadcrumbs, 'req-4');
    expect(queryByText('•••')).toBeNull();
    breadcrumbs.slice(0, 3).forEach((crumb) => {
      expect(getByRole('button', { name: new RegExp(crumb.label) })).not.toBeNull();
    });
  });

  it('collapses the middle breadcrumbs behind a "more" chip when there are more than 4, keeping the first two and last two', () => {
    const breadcrumbs = Array.from({ length: 9 }, (_unused, i) => makeCrumb(i + 1));
    const { getByText, getByRole, queryByRole } = renderTrail(breadcrumbs, 'req-9');

    // First two searches stay visible.
    expect(getByRole('button', { name: /search 1$/ })).not.toBeNull();
    expect(getByRole('button', { name: /search 2$/ })).not.toBeNull();
    // The last two stay visible (req-8 is a button, req-9 is active/non-button).
    expect(getByRole('button', { name: /search 8$/ })).not.toBeNull();
    expect(getByText('search 9').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
    // Middle searches (3 through 7) are hidden behind the chip.
    ['search 3', 'search 4', 'search 5', 'search 6', 'search 7'].forEach((label) => {
      expect(queryByRole('button', { name: new RegExp(`${label}$`) })).toBeNull();
    });
    expect(getByText('•••')).not.toBeNull();
  });

  it('opens a popover listing the hidden breadcrumbs when the "more" chip is clicked, and selecting one calls onSelect', () => {
    const onSelect = jest.fn();
    const breadcrumbs = Array.from({ length: 9 }, (_unused, i) => makeCrumb(i + 1));
    const { getByText, getByRole, queryByRole } = renderTrail(breadcrumbs, 'req-9', onSelect);

    expect(queryByRole('menu')).toBeNull();
    fireEvent.click(getByText('•••'));
    expect(getByRole('menu')).not.toBeNull();

    const hiddenItem = getByRole('menuitem', { name: /search 3$/ });
    fireEvent.click(hiddenItem);
    expect(onSelect).toHaveBeenCalledWith('req-3');
    expect(queryByRole('menu')).toBeNull();
  });

  it('closes the popover when clicking outside of it', () => {
    const breadcrumbs = Array.from({ length: 9 }, (_unused, i) => makeCrumb(i + 1));
    const { getByText, getByRole, queryByRole } = renderTrail(breadcrumbs, 'req-9');

    fireEvent.click(getByText('•••'));
    expect(getByRole('menu')).not.toBeNull();

    fireEvent.mouseDown(document.body);
    expect(queryByRole('menu')).toBeNull();
  });

  it('closes the popover when Escape is pressed', () => {
    const breadcrumbs = Array.from({ length: 9 }, (_unused, i) => makeCrumb(i + 1));
    const { getByText, getByRole, queryByRole } = renderTrail(breadcrumbs, 'req-9');

    fireEvent.click(getByText('•••'));
    expect(getByRole('menu')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('menu')).toBeNull();
  });

  it('shows a left fade once the trail has been scrolled away from the start', () => {
    const breadcrumbs = [makeCrumb(1), makeCrumb(2)];
    const { container } = renderTrail(breadcrumbs, 'req-2');
    const scrollContainer = container.querySelector('nav > div > div') as HTMLDivElement;
    // jsdom does not compute layout, so scrollWidth/clientWidth/scrollLeft are stubbed directly to
    // simulate a trail that overflows and has been scrolled partway through.
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 100, configurable: true });

    expect(container.querySelector('[aria-hidden="true"].bg-gradient-to-r')).toBeNull();
    fireEvent.scroll(scrollContainer);
    expect(container.querySelector('[aria-hidden="true"].bg-gradient-to-r')).not.toBeNull();
    expect(container.querySelector('[aria-hidden="true"].bg-gradient-to-l')).not.toBeNull();
  });
});
