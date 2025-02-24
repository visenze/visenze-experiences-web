export type SearchImage = ImageUrl | ImageFile | ImageDataUrl;

export type SearchImageOrPid = SearchImage | Pid;

export interface Pid {
  pid: string;
}

export interface ImageUrl {
  imgUrl: string;
}

export interface ImageFile {
  files: File[];
}

export interface ImageDataUrl {
  file: string;
}

export const isPid = (image: SearchImageOrPid): image is Pid => {
  return !!(image as Pid).pid;
};

export const isImageUrl = (image: SearchImage | SearchImageOrPid): image is ImageUrl => {
  return !!(image as ImageUrl).imgUrl;
};

export const isImageFile = (image: SearchImage | SearchImageOrPid): image is ImageFile => {
  return !!(image as ImageFile).files;
};

export const isImageDataUrl = (image: SearchImage | SearchImageOrPid): image is ImageDataUrl => {
  return !!(image as ImageDataUrl).file;
};
