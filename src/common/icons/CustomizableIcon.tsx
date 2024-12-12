import type { FC, ReactElement } from 'react';
import type { Icon } from '../visenze-core';

interface CustomizableIconProps extends Icon {
  height?: number;
  width?: number;
  className?: string
  onClickHandler?: (event: any) => void;
}

const CustomizableIcon: FC<CustomizableIconProps> = ({ url, color, height, width, className, onClickHandler }): ReactElement => {
  if (color) {
    return (
        <div onClick={onClickHandler}
             className={className}
             style={{
               height,
               width,
               backgroundColor: color,
               mask: `url(${url}) no-repeat center / contain`,
             }}/>
    );
  }
  return (
      <div onClick={onClickHandler}
           className={className}
           style={{
             height,
             width,
             background: `url(${url}) no-repeat center / contain`,
           }}/>
  );
};

export default CustomizableIcon;
