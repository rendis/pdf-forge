import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Crop, Loader2, AlertCircle, ImageIcon, Shuffle } from 'lucide-react';
import type { ImageUrlTabProps, ImagePreviewState } from './types';

const URL_REGEX = /^https?:\/\/.+/i;
const DEBOUNCE_MS = 500;

const generateTestImageUrl = () => {
  const seed = Math.random().toString(36).substring(7);
  return `https://picsum.photos/seed/${seed}/400/300`;
};

export function ImageUrlTab({
  onImageReady,
  onOpenCropper,
  currentImage,
}: ImageUrlTabProps) {
  const [url, setUrl] = useState(currentImage?.src ?? '');
  const [preview, setPreview] = useState<ImagePreviewState>({
    src: currentImage?.src ?? null,
    isLoading: false,
    error: null,
    isBase64: currentImage?.isBase64 ?? false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadImage = useCallback((imageUrl: string) => {
    if (!URL_REGEX.test(imageUrl)) {
      setPreview({
        src: null,
        isLoading: false,
        error: 'URL no válida. Debe comenzar con http:// o https://',
        isBase64: false,
      });
      onImageReady(null);
      return;
    }

    setPreview((prev) => ({ ...prev, isLoading: true, error: null }));

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setPreview({
        src: imageUrl,
        isLoading: false,
        error: null,
        isBase64: false,
      });
      onImageReady({
        src: imageUrl,
        isBase64: false,
      });
    };

    img.onerror = () => {
      setPreview({
        src: null,
        isLoading: false,
        error: 'No se pudo cargar la imagen. Verifica la URL.',
        isBase64: false,
      });
      onImageReady(null);
    };

    img.src = imageUrl;
  }, [onImageReady]);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setPreview({
        src: null,
        isLoading: false,
        error: null,
        isBase64: false,
      });
      onImageReady(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      loadImage(value.trim());
    }, DEBOUNCE_MS);
  }, [loadImage, onImageReady]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Reset URL when currentImage becomes an injector (user selected variable in other tab)
  // Don't reset if currentImage is null or is a URL image - preserve state when navigating tabs
  useEffect(() => {
    if (currentImage?.injectableId) {
      // User selected an injector in variable tab - clear URL state
      setUrl('');
      setPreview({
        src: null,
        isLoading: false,
        error: null,
        isBase64: false,
      });
    }
  }, [currentImage?.injectableId]);

  const handleCropClick = useCallback(() => {
    if (preview.src) {
      onOpenCropper(preview.src);
    }
  }, [preview.src, onOpenCropper]);

  const handleGenerateTestImage = useCallback(() => {
    const testUrl = generateTestImageUrl();
    setUrl(testUrl);
    loadImage(testUrl);
  }, [loadImage]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="image-url">URL de la imagen</Label>
        <div className="flex gap-2">
          <Input
            id="image-url"
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateTestImage}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imagen de prueba</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
        {preview.isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Cargando imagen...</span>
          </div>
        )}

        {preview.error && (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <span className="text-sm text-center px-4">{preview.error}</span>
          </div>
        )}

        {!preview.isLoading && !preview.error && !preview.src && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
            <span className="text-sm">Ingresa una URL para ver la vista previa</span>
          </div>
        )}

        {!preview.isLoading && !preview.error && preview.src && (
          <img
            src={preview.src}
            alt="Vista previa"
            className="max-h-[200px] max-w-full object-contain"
            crossOrigin="anonymous"
          />
        )}
      </div>

      {preview.src && !preview.isLoading && !preview.error && (
        <Button
          variant="outline"
          onClick={handleCropClick}
          className="w-full"
        >
          <Crop className="h-4 w-4 mr-2" />
          Recortar imagen
        </Button>
      )}
    </div>
  );
}
