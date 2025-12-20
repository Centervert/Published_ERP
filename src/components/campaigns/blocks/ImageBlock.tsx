import type { ImageBlock as ImageBlockType } from '@/types/email-blocks';
import { ImageIcon } from 'lucide-react';

interface ImageBlockProps {
  block: ImageBlockType;
  isEditing?: boolean;
}

export function ImageBlock({ block, isEditing }: ImageBlockProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[block.align || 'center'];

  const width = block.width === 'full' ? '100%' : `${block.width}px`;
  const paddingClass = block.fullBleed ? '' : 'px-4 py-2';

  if (!block.src) {
    return (
      <div className={`${paddingClass} ${alignClass}`}>
        <div 
          className="inline-flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 text-muted-foreground"
          style={{ width: block.width === 'full' ? '100%' : 'auto' }}
        >
          <ImageIcon className="h-8 w-8" />
          <span>{isEditing ? 'Click to add image' : 'No image set'}</span>
        </div>
      </div>
    );
  }

  const img = (
    <img
      src={block.src}
      alt={block.alt || ''}
      className="max-w-full h-auto"
      style={{ width }}
    />
  );

  return (
    <div className={`${paddingClass} ${alignClass}`}>
      {block.link ? (
        <a href={block.link} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
