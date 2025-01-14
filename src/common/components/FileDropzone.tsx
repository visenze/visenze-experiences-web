import type { FC, ReactNode } from 'react';
import { useContext } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import type { SearchImage } from '../types/image';
import { WidgetDataContext } from '../types/contexts';
import { Actions, Category, Labels } from '../types/tracking-constants';

interface FileDropzoneProps {
  onImageUpload: (image: SearchImage) => void;
  children: ReactNode;
  name?: string;
}

const FileDropzone: FC<FileDropzoneProps> = ({ onImageUpload, children, name }) => {
  const { productSearch } = useContext(WidgetDataContext);
  const MAX_IMAGE_FILE_SIZE = 10000000;

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]): void => {
    if (fileRejections.length > 0) {
      productSearch.sendEvent(Actions.ERROR, {
        cat: Category.UPLOAD,
        label: Labels.SEARCH_ERROR,
      });
      return;
    }

    const image = acceptedFiles[0];
    if (!image || image.size > MAX_IMAGE_FILE_SIZE) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any): void => {
      productSearch.sendEvent(Actions.CLICK, {
        cat: Category.UPLOAD,
        label: Labels.UPLOAD,
      });
      onImageUpload({ files: [acceptedFiles[0]], file: e.target.result });
    };
    reader.readAsDataURL(image);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/png': [],
      'image/jpeg': [],
      'image/jpg': [],
      'image/gif': [],
    },
    onDrop,
  });

  return (
    <div className='cursor-pointer' {...getRootProps()}>
      <input {...getInputProps()} data-pw={`${name}-dropzone`} />
      {children}
    </div>
  );
};

export default FileDropzone;
