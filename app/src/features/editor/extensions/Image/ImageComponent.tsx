import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import Moveable from 'react-moveable';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Square, Circle, Settings2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageAlignSelector } from './ImageAlignSelector';
import type { ImageDisplayMode, ImageAlign, ImageShape } from './types';

export function ImageComponent({ node, updateAttributes, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [, forceUpdate] = useState({});

  // Subscribe to selection updates to properly track direct selection
  useEffect(() => {
    const handleSelectionUpdate = () => forceUpdate({});
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Check if this specific node is directly selected (not just within a parent selection)
  const isDirectlySelected = useMemo(() => {
    if (!selected) return false;
    const { selection } = editor.state;
    const pos = getPos();
    // Verify it's a NodeSelection pointing to this exact node
    return (
      selection instanceof NodeSelection &&
      typeof pos === 'number' &&
      selection.anchor === pos
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to selection changes, not full state
  }, [selected, editor.state.selection, getPos]);

  // Check if editor is in editable mode (not read-only/published)
  const isEditorEditable = editor.isEditable

  const { src, alt, title, width, height, displayMode, align, shape, injectableId, injectableLabel } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    displayMode: ImageDisplayMode;
    align: ImageAlign;
    shape: ImageShape;
    injectableId?: string;
    injectableLabel?: string;
  };

  // Obtener el ancho máximo disponible del contenedor del editor
  const getMaxWidth = useCallback(() => {
    const editorContainer = containerRef.current?.closest('.ProseMirror');
    if (editorContainer) {
      return editorContainer.clientWidth;
    }
    return 700; // Fallback
  }, []);

  const handleAlignChange = useCallback(
    (newDisplayMode: ImageDisplayMode, newAlign: ImageAlign) => {
      updateAttributes({ displayMode: newDisplayMode, align: newAlign });
    },
    [updateAttributes]
  );

  const handleShapeToggle = useCallback(() => {
    const newShape: ImageShape = shape === 'square' ? 'circle' : 'square';

    if (newShape === 'circle' && width && height && width !== height) {
      const size = Math.min(width, height);
      updateAttributes({ shape: newShape, width: size, height: size });
    } else {
      updateAttributes({ shape: newShape });
    }
  }, [shape, width, height, updateAttributes]);

  const handleEdit = useCallback(() => {
    editor.view.dom.dispatchEvent(
      new CustomEvent('editor:edit-image', {
        bubbles: true,
        detail: { src, shape, injectableId, injectableLabel },
      })
    );
  }, [editor, src, shape, injectableId, injectableLabel]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditorEditable) return;
    handleEdit();
  }, [isEditorEditable, handleEdit]);

  const handleResize = useCallback(
    (e: { width: number; height: number; target: HTMLElement }) => {
      const maxWidth = getMaxWidth();
      let newWidth = e.width;
      let newHeight = e.height;

      // Limitar al ancho máximo de la página
      if (newWidth > maxWidth) {
        if (shape === 'circle') {
          const ratio = e.width / e.height;
          newHeight = maxWidth / ratio;
        }
        newWidth = maxWidth;
      }

      e.target.style.width = `${newWidth}px`;
      e.target.style.height = `${newHeight}px`;
    },
    [getMaxWidth, shape]
  );

  const handleResizeEnd = useCallback(
    (e: { target: HTMLElement }) => {
      let newWidth = parseFloat(e.target.style.width);
      let newHeight = parseFloat(e.target.style.height);

      if (shape === 'circle') {
        const size = Math.max(newWidth, newHeight);
        newWidth = size;
        newHeight = size;
      }

      updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) });
    },
    [shape, updateAttributes]
  );

  useEffect(() => {
    if (imageRef.current) {
      if (width) imageRef.current.style.width = `${width}px`;
      if (height) imageRef.current.style.height = `${height}px`;
    }
  }, [width, height]);

  // Establecer dimensiones iniciales cuando la imagen carga (si no están definidas)
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);

    if (!width || !height) {
      const img = imageRef.current;
      if (!img) return;

      const maxWidth = getMaxWidth();
      let newWidth = img.naturalWidth;
      let newHeight = img.naturalHeight;

      // Limitar al ancho de la página si es muy grande
      if (newWidth > maxWidth) {
        const ratio = newWidth / newHeight;
        newWidth = maxWidth;
        newHeight = newWidth / ratio;
      }

      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    }
  }, [width, height, getMaxWidth, updateAttributes]);

  // Use inline styles for dynamic layout (block vs inline/float)
  const containerStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (displayMode === 'block') {
      styles.display = 'flex';
      if (align === 'left') {
        styles.justifyContent = 'flex-start';
      } else if (align === 'center') {
        styles.justifyContent = 'center';
      } else if (align === 'right') {
        styles.justifyContent = 'flex-end';
      }
    } else {
      // inline/float mode - texto envuelve la imagen
      styles.marginBottom = '0.5rem';

      if (align === 'left') {
        styles.float = 'left';
        styles.marginRight = '1rem';
      } else if (align === 'right') {
        styles.float = 'right';
        styles.marginLeft = '1rem';
      } else {
        // center fallback
        styles.display = 'inline-block';
        styles.verticalAlign = 'top';
      }
    }

    return styles;
  }, [displayMode, align]);

  const imageStyles = cn(
    'cursor-pointer transition-shadow',
    shape === 'circle' && 'rounded-full',
    isDirectlySelected && 'ring-2 ring-primary ring-offset-2'
  );

  return (
    <NodeViewWrapper
      as="div"
      data-display-mode={displayMode}
      className={cn('relative group', displayMode === 'block' ? 'my-2' : 'mt-0')}
      style={containerStyles}
      ref={containerRef}
    >
      <div className="relative">
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title}
          className={imageStyles}
          style={{ maxWidth: 'none', marginTop: 0, marginBottom: 0 }}
          onLoad={handleImageLoad}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />


        {isEditorEditable && (isDirectlySelected || isResizing) && imageLoaded && (
          <>
            {isDirectlySelected && <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
              <ImageAlignSelector
                displayMode={displayMode}
                align={align}
                onChange={handleAlignChange}
              />
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', shape === 'square' && 'bg-accent')}
                onClick={handleShapeToggle}
                title={t('editor.image.square')}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', shape === 'circle' && 'bg-accent')}
                onClick={handleShapeToggle}
                title={t('editor.image.circle')}
              >
                <Circle className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleEdit}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('editor.image.configure')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
                title={t('editor.image.deleteImage')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>}

            <Moveable
              key={`${shape}-${displayMode}`}
              target={imageRef}
              resizable
              keepRatio={shape === 'circle'}
              throttleResize={0}
              renderDirections={
                displayMode === 'inline'
                  ? ['e', 'se', 's', 'sw', 'w']
                  : shape === 'circle'
                    ? ['nw', 'ne', 'sw', 'se']
                    : ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
              }
              onResizeStart={(e) => {
                setIsResizing(true);
                e.setMax([getMaxWidth(), Infinity]);
              }}
              onResize={({ width: w, height: h, target, drag }) => {
                if (displayMode === 'block') {
                  target.style.transform = `translate(${drag.translate[0]}px, 0px)`;
                }
                handleResize({ width: w, height: h, target: target as HTMLElement });
              }}
              onResizeEnd={({ target }) => {
                setIsResizing(false);
                target.style.transform = '';
                handleResizeEnd({ target: target as HTMLElement });
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
