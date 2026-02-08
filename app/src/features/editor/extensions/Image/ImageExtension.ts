import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageComponent } from './ImageComponent';
import type { ImageDisplayMode, ImageAlign, ImageShape } from './types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
        displayMode?: ImageDisplayMode;
        align?: ImageAlign;
        shape?: ImageShape;
        injectableId?: string;
        injectableLabel?: string;
      }) => ReturnType;
      setImageAlign: (options: {
        displayMode: ImageDisplayMode;
        align: ImageAlign;
      }) => ReturnType;
      setImageSize: (options: { width: number; height: number }) => ReturnType;
      setImageShape: (shape: ImageShape) => ReturnType;
    };
  }
}

export const ImageExtension = Node.create({
  name: 'customImage',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      displayMode: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-display-mode') || 'block',
        renderHTML: (attributes) => ({
          'data-display-mode': attributes.displayMode,
        }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
        }),
      },
      shape: {
        default: 'square',
        parseHTML: (element) => element.getAttribute('data-shape') || 'square',
        renderHTML: (attributes) => ({
          'data-shape': attributes.shape,
        }),
      },
      injectableId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-injectable-id') || null,
        renderHTML: (attributes) => attributes.injectableId
          ? { 'data-injectable-id': attributes.injectableId }
          : {},
      },
      injectableLabel: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-injectable-label') || null,
        renderHTML: (attributes) => attributes.injectableLabel
          ? { 'data-injectable-label': attributes.injectableLabel }
          : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-type': 'image' }),
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt, title: HTMLAttributes.title }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt,
              title: options.title,
              width: options.width,
              height: options.height,
              displayMode: options.displayMode || 'block',
              align: options.align || 'center',
              shape: options.shape || 'square',
              injectableId: options.injectableId || null,
              injectableLabel: options.injectableLabel || null,
            },
          });
        },

      setImageAlign:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            displayMode: options.displayMode,
            align: options.align,
          });
        },

      setImageSize:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            width: options.width,
            height: options.height,
          });
        },

      setImageShape:
        (shape) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { shape });
        },
    };
  },
});
