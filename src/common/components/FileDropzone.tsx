import type { FC, ReactNode } from 'react';
import { useContext } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { WidgetDataContext } from '../types/contexts';
import type { SearchImage } from '../types/image';
import { Actions, Category, Labels } from '../types/tracking-constants';

const FOCUS_VISIBLE_CLASSES = 'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:focus-within:outline-blue-300';

interface FileDropzoneProps {
  onImageUpload: (image: SearchImage) => void;
  children: ReactNode;
  name?: string;
  ariaLabel?: string;
}

const FileDropzone: FC<FileDropzoneProps> = ({ onImageUpload, children, name, ariaLabel }) => {
  const { widgetClient } = useContext(WidgetDataContext);
  const MAX_IMAGE_FILE_SIZE = 10000000;

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]): void => {
    if (fileRejections.length > 0) {
      widgetClient.sendEvent(Actions.ERROR, {
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
      widgetClient.sendEvent(Actions.CLICK, {
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
    <div
      className={`cursor-pointer h-full ${FOCUS_VISIBLE_CLASSES}`}
      {...getRootProps({ tabIndex: -1 })}>
      <input
        {...getInputProps({ 'aria-label': ariaLabel, 'tabIndex': 0 })}
        data-testid={`wigmix-${name}-dropzone`}
        data-pw={`${name}-dropzone`}
      />
      {children}
    </div>
  );
};

export default FileDropzone;
