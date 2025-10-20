import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';
import CloseIcon from '../../../common/icons/CloseIcon';

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
            <div className='absolute start-5 top-3 rounded-full bg-transparent p-1 hover:opacity-90'
                 onClick={onBackHandler}
                 data-pw='cs-back-button'>
              <ChevronLeftIcon color={iconColor} className='size-6 cursor-pointer' />
            </div>
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

      <div className='absolute end-5 top-3 rounded-full bg-transparent p-1 hover:opacity-90'
           onClick={onCloseHandler}
           data-testid='wigmix-close-button'
           data-pw='cs-close-button'>
        <CloseIcon color={iconColor} className='size-6 cursor-pointer' />
      </div>
    </div>
  );
};

export default Header;
