export type ImageDisplayMode = 'block' | 'inline';
export type ImageAlign = 'left' | 'center' | 'right';
export type ImageShape = 'square' | 'circle';

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  shape: ImageShape;
}

export interface ImageAlignOption {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  labelKey: string;
  icon: 'block-left' | 'block-center' | 'block-right' | 'wrap-left' | 'wrap-right';
}

export const BLOCK_ALIGN_OPTIONS: ImageAlignOption[] = [
  { displayMode: 'block', align: 'left', labelKey: 'editor.image.alignments.blockLeft', icon: 'block-left' },
  { displayMode: 'block', align: 'center', labelKey: 'editor.image.alignments.blockCenter', icon: 'block-center' },
  { displayMode: 'block', align: 'right', labelKey: 'editor.image.alignments.blockRight', icon: 'block-right' },
];

export const WRAP_ALIGN_OPTIONS: ImageAlignOption[] = [
  { displayMode: 'inline', align: 'left', labelKey: 'editor.image.alignments.wrapLeft', icon: 'wrap-left' },
  { displayMode: 'inline', align: 'right', labelKey: 'editor.image.alignments.wrapRight', icon: 'wrap-right' },
];

export const IMAGE_ALIGN_OPTIONS: ImageAlignOption[] = [
  ...BLOCK_ALIGN_OPTIONS,
  ...WRAP_ALIGN_OPTIONS,
];

export const DEFAULT_IMAGE_ATTRS: Omit<ImageAttributes, 'src'> = {
  displayMode: 'block',
  align: 'center',
  shape: 'square',
  width: undefined,
  height: undefined,
  alt: undefined,
  title: undefined,
};
