import { ImageIcon } from 'lucide-react';
import type { ImageGalleryTabProps } from './types';

export function ImageGalleryTab(_props: ImageGalleryTabProps) {
  return (
    <div className="min-h-[280px] flex flex-col items-center justify-center text-muted-foreground">
      <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">Galería de imágenes</h3>
      <p className="text-sm text-center max-w-[300px]">
        Esta funcionalidad estará disponible próximamente.
        Por ahora, puedes insertar imágenes usando una URL.
      </p>
    </div>
  );
}
