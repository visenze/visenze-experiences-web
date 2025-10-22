import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import CloseIcon from '../../../common/icons/CloseIcon';

interface HeaderProps {
  onCloseHandler: () => void;
  showTitle: boolean;
  iconColor: string;
}

const Header: FC<HeaderProps> = ({ onCloseHandler, showTitle, iconColor }): ReactElement => {
  const intl = useIntl();

  return (
    <div className='relative flex w-full items-center border-b border-gray-200 py-4 ps-4 lg:rounded-t-3xl'>
      {showTitle && (
        <div className='wigmix-widget-title' data-pw='sod-widget-title'>
          {intl.formatMessage({ id: 'widgetTitle' })}
        </div>
      )}

      <div
        className='absolute end-4 top-2 rounded-full bg-transparent p-1 hover:opacity-90 md:end-5 md:top-4'
        onClick={onCloseHandler}
        data-testid='wigmix-close-button'
        data-pw='sod-close-button'>
        <CloseIcon className='size-6 cursor-pointer' color={iconColor} />
      </div>
    </div>
  );
};

export default Header;
