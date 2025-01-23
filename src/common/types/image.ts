export type SearchImage = ImageUrl | ImageFile | ImageDataUrl;

export interface ImageUrl {
  imgUrl: string;
}

export interface ImageFile {
  files: File[];
}

export interface ImageDataUrl {
  file: string;
}

export const isImageUrl = (image: SearchImage): image is ImageUrl => {
  return (image as ImageUrl).imgUrl !== undefined;
};

export const isImageFile = (image: SearchImage): image is ImageFile => {
  return (image as ImageFile).files !== undefined;
};

export const isImageDataUrl = (image: SearchImage): image is ImageDataUrl => {
  return (image as ImageDataUrl).file !== undefined;
};
