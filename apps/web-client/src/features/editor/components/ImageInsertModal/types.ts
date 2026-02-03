import type { ImageShape } from '../../extensions/Image/types';

export type ImageInsertTab = 'url' | 'gallery' | 'variable';

export interface ImageInsertResult {
  src: string;
  alt?: string;
  isBase64: boolean;
  shape?: ImageShape;
  injectableId?: string;
  injectableLabel?: string;
}

export interface ImagePreviewState {
  src: string | null;
  isLoading: boolean;
  error: string | null;
  isBase64: boolean;
}

export interface ImageInsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (result: ImageInsertResult) => void;
  initialShape?: ImageShape;
  initialImage?: ImageInsertResult;
}

export interface ImageUrlTabProps {
  onImageReady: (result: ImageInsertResult | null) => void;
  onOpenCropper: (imageSrc: string) => void;
  currentImage: ImageInsertResult | null;
}

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (croppedImage: string, shape: ImageShape) => void;
  maxWidth?: number;
  maxHeight?: number;
  initialShape?: ImageShape;
}

export interface ImageGalleryTabProps {
  onSelect: (result: ImageInsertResult) => void;
}

export interface ImageVariableTabProps {
  onSelect: (result: ImageInsertResult) => void;
  currentSelection?: string;
  hasUrlSelection?: boolean;  // True when user selected a URL (to reset variable selection)
}
