import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { CroppingContext } from '../../types/contexts';
import type { BoxData } from '../../types/product';

interface CroppingProviderProps {
  children: ReactNode;
  boxData?: BoxData;
  setBoxData?: (data: BoxData) => void;
}

const CroppingProvider: FC<CroppingProviderProps> = ({ children, boxData, setBoxData }) => {
  const [selectedHotspot, setSelectedHotspot] = useState(-1);

  return (
    <CroppingContext.Provider value={{ selectedHotspot, setSelectedHotspot, boxData, setBoxData }}>
      {children}
    </CroppingContext.Provider>
  );
};

export default CroppingProvider;
