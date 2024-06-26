import type { FC, ReactElement } from 'react';

const TrashIcon: FC<{ className?: string, onClickHandler?: () => void }> = ({ className, onClickHandler }): ReactElement => (
  <div className={className} onClick={onClickHandler} data-pw='trash-icon'>
    <img src='https://cdn.visenze.com/images/trash-icon.svg'/>
  </div>
);

export default TrashIcon;
