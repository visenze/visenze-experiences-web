import { Button } from '@nextui-org/button';
import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import CloseIcon from '../../../common/icons/CloseIcon';
import BackIcon from '../../../common/icons/BackIcon';

interface HeaderProps {
  onCloseHandler: () => void;
  isResultScreen?: boolean;
  onBackHandler?: () => void;
}

const Header: FC<HeaderProps> = ({ onCloseHandler, onBackHandler, isResultScreen = false }): ReactElement => {
  const intl = useIntl();

  return (
    <div className='relative flex w-full items-center justify-center bg-primary py-4'>
      {
        isResultScreen
        ? (
          <>
            <Button isIconOnly className='absolute left-5 top-3 bg-transparent' onClick={onBackHandler} data-pw='cs-back-button'>
              <BackIcon className='size-6'/>
            </Button>
            <p className='wigmix-widget-title hidden text-2xl text-primary md:block' data-pw='cs-widget-title'>
              {intl.formatMessage({ id: 'resultScreenTitle' })}
            </p>
          </>
        )
        : (
          <p className='wigmix-widget-title px-16 text-center text-primary md:px-0' data-pw='cs-widget-title'>
            {intl.formatMessage({ id: 'uploadScreenTitle' })}
          </p>
        )
      }

      <Button isIconOnly className='absolute right-5 top-3 bg-transparent' onClick={onCloseHandler} data-pw='cs-close-button'>
        <CloseIcon className='size-6'/>
      </Button>
    </div>
  );
};

export default Header;
