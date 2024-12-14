import { Button } from '@nextui-org/button';
import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

interface HeaderProps {
  onCloseHandler: () => void;
  isResultScreen: boolean;
  onBackHandler: () => void;
  showTitle: boolean;
  iconColor: string;
}

const Header: FC<HeaderProps> = ({ onCloseHandler, onBackHandler, isResultScreen, showTitle, iconColor }): ReactElement => {
  const intl = useIntl();

  return (
    <div className='relative flex w-full items-center justify-center py-4'>
      {
        isResultScreen
        ? (
          <>
            <Button isIconOnly className='absolute left-5 top-3 bg-transparent' onClick={onBackHandler} data-pw='cs-back-button'>
              <CustomizableIcon
                  height={24}
                  width={24}
                  url={'https://cdn.visenze.com/images/back-icon.svg'}
                  color={iconColor}
                  className='cursor-pointer'
              />
            </Button>
            {showTitle && (
              <div className='wigmix-widget-title hidden md:block' data-pw='cs-widget-title'>
                {intl.formatMessage({ id: 'resultScreenTitle' })}
              </div>
            )}
          </>
        )
        : (
          <>
            {showTitle && (
              <div className='wigmix-widget-title px-16 text-center md:px-0' data-pw='cs-widget-title'>
                {intl.formatMessage({ id: 'uploadScreenTitle' })}
              </div>
            )}
          </>
        )
      }

      <Button isIconOnly className='absolute right-5 top-3 bg-transparent' onClick={onCloseHandler} data-pw='cs-close-button'>
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
