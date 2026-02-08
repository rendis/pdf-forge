import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGE_ALIGN_OPTIONS, type ImageDisplayMode, type ImageAlign } from './types';

interface ImageAlignSelectorProps {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  onChange: (displayMode: ImageDisplayMode, align: ImageAlign) => void;
}

const ICON_MAP = {
  'block-left': AlignLeft,
  'block-center': AlignCenter,
  'block-right': AlignRight,
} as const;

function getCurrentIcon(displayMode: ImageDisplayMode, align: ImageAlign) {
  const option = IMAGE_ALIGN_OPTIONS.find(
    (o) => o.displayMode === displayMode && o.align === align
  );
  return option ? ICON_MAP[option.icon] : AlignCenter;
}

export function ImageAlignSelector({
  displayMode,
  align,
  onChange,
}: ImageAlignSelectorProps) {
  const { t } = useTranslation();
  const CurrentIcon = getCurrentIcon(displayMode, align);

  const handleSelect = useCallback(
    (option: (typeof IMAGE_ALIGN_OPTIONS)[number]) => {
      onChange(option.displayMode, option.align);
    },
    [onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {IMAGE_ALIGN_OPTIONS.map((option) => {
            const Icon = ICON_MAP[option.icon];
            const isActive = displayMode === option.displayMode && align === option.align;
            return (
              <Button
                key={option.icon}
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isActive && 'bg-accent')}
                onClick={() => handleSelect(option)}
                title={t(option.labelKey)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
