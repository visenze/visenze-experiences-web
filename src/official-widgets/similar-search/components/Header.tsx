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
    <div className='relative flex w-full items-center py-4 pl-8 lg:rounded-t-3xl'>
      {showTitle && (
        <div className='wigmix-widget-title hidden md:block' data-pw='ss-widget-title'>
          {intl.formatMessage({ id: 'widgetTitle' })}
        </div>
      )}

      <div className='absolute right-4 top-2 rounded-full bg-transparent p-1 hover:opacity-90 md:right-5 md:top-4'
           onClick={onCloseHandler}
           data-testid='wigmix-close-button'
           data-pw='ss-close-button'>
        <CloseIcon className='size-6 cursor-pointer' color={iconColor} />
      </div>
    </div>
  );
};

export default Header;
