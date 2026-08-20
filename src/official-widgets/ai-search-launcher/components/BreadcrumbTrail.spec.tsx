import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import BreadcrumbTrail from './BreadcrumbTrail';

const messages = { a11yBreadcrumbTrail: 'Search refinement steps', a11ySelectResultSet: 'Show results for: {label}' };

describe('BreadcrumbTrail', () => {
  it('renders one crumb per breadcrumb and highlights the active one', () => {
    const { getByRole } = render(
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <BreadcrumbTrail
          breadcrumbs={[
            { requestId: 'req-1', label: 'blue jeans', products: [] },
            { requestId: 'req-2', label: 'cropped', products: [] },
          ]}
          activeBreadcrumbId='req-2'
          onSelect={jest.fn()}
        />
      </IntlProvider>,
    );
    const activeCrumb = getByRole('button', { name: /cropped/ });
    expect(activeCrumb.getAttribute('aria-current')).toBe('true');
    const inactiveCrumb = getByRole('button', { name: /blue jeans/ });
    expect(inactiveCrumb.getAttribute('aria-current')).toBeNull();
  });

  it('calls onSelect with the clicked crumb\'s requestId', () => {
    const onSelect = jest.fn();
    const { getByRole } = render(
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <BreadcrumbTrail
          breadcrumbs={[{ requestId: 'req-1', label: 'blue jeans', products: [] }]}
          activeBreadcrumbId='req-1'
          onSelect={onSelect}
        />
      </IntlProvider>,
    );
    fireEvent.click(getByRole('button', { name: /blue jeans/ }));
    expect(onSelect).toHaveBeenCalledWith('req-1');
  });

  it('renders nothing when there are no breadcrumbs', () => {
    const { queryByRole } = render(
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <BreadcrumbTrail breadcrumbs={[]} activeBreadcrumbId={null} onSelect={jest.fn()} />
      </IntlProvider>,
    );
    expect(queryByRole('navigation')).toBeNull();
  });
});
