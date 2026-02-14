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
import {
  BLOCK_ALIGN_OPTIONS,
  WRAP_ALIGN_OPTIONS,
  IMAGE_ALIGN_OPTIONS,
  type ImageDisplayMode,
  type ImageAlign,
  type ImageAlignOption,
} from './types';

interface ImageAlignSelectorProps {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  onChange: (displayMode: ImageDisplayMode, align: ImageAlign) => void;
}

function WrapLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="8" height="10" rx="1" />
      <line x1="14" y1="5" x2="21" y2="5" />
      <line x1="14" y1="9" x2="21" y2="9" />
      <line x1="3" y1="17" x2="21" y2="17" />
      <line x1="3" y1="21" x2="16" y2="21" />
    </svg>
  );
}

function WrapRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="13" y="3" width="8" height="10" rx="1" />
      <line x1="3" y1="5" x2="10" y2="5" />
      <line x1="3" y1="9" x2="10" y2="9" />
      <line x1="3" y1="17" x2="21" y2="17" />
      <line x1="3" y1="21" x2="16" y2="21" />
    </svg>
  );
}

const ICON_MAP = {
  'block-left': AlignLeft,
  'block-center': AlignCenter,
  'block-right': AlignRight,
  'wrap-left': WrapLeftIcon,
  'wrap-right': WrapRightIcon,
} as const;

function getCurrentIcon(displayMode: ImageDisplayMode, align: ImageAlign) {
  const option = IMAGE_ALIGN_OPTIONS.find(
    (o) => o.displayMode === displayMode && o.align === align
  );
  return option ? ICON_MAP[option.icon] : AlignCenter;
}

function OptionButton({
  option,
  isActive,
  onSelect,
}: {
  option: ImageAlignOption;
  isActive: boolean;
  onSelect: (option: ImageAlignOption) => void;
}) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[option.icon];
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', isActive && 'bg-accent')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option)}
      title={t(option.labelKey)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export function ImageAlignSelector({
  displayMode,
  align,
  onChange,
}: ImageAlignSelectorProps) {
  const CurrentIcon = getCurrentIcon(displayMode, align);

  const handleSelect = useCallback(
    (option: ImageAlignOption) => {
      onChange(option.displayMode, option.align);
    },
    [onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(e) => e.preventDefault()}
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-1">
          {BLOCK_ALIGN_OPTIONS.map((option) => (
            <OptionButton
              key={option.icon}
              option={option}
              isActive={displayMode === option.displayMode && align === option.align}
              onSelect={handleSelect}
            />
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          {WRAP_ALIGN_OPTIONS.map((option) => (
            <OptionButton
              key={option.icon}
              option={option}
              isActive={displayMode === option.displayMode && align === option.align}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
