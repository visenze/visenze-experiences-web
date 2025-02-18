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
  if (color && color !== 'DEFAULT_ICON_COLOR') {
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
             backgroundImage: `url(${url})`,
             backgroundRepeat: 'no-repeat',
             backgroundPosition: 'center',
             backgroundSize: 'contain',
           }}/>
  );
};

export default CustomizableIcon;
