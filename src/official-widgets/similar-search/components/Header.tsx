import { Button } from '@heroui/button';
import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

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

      <Button isIconOnly className='absolute right-4 top-2 bg-transparent md:right-5 md:top-4' onClick={onCloseHandler}
              data-pw='ss-close-button'>
        <CustomizableIcon
            height={24}
            width={24}
            url={'https://cdn.visenze.com/images/close-icon.svg'}
            color={iconColor}
            className='wigmix-close-popup-icon cursor-pointer'
        />
      </Button>
    </div>
  );
};

export default Header;
