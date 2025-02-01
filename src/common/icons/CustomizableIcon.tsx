import type { FC, ReactElement } from 'react';

interface CustomizableIconProps {
  url: string;
  color?: string;
  height?: number;
  width?: number;
  className?: string;
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
