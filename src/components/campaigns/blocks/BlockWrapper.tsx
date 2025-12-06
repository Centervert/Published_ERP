import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailBlock } from '@/types/email-blocks';
import { Button } from '@/components/ui/button';

interface BlockWrapperProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  children: React.ReactNode;
}

export function BlockWrapper({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  children,
}: BlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative border-2 rounded-lg transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-transparent hover:border-muted-foreground/30',
        isDragging && 'opacity-50 z-50'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Drag handle and actions */}
      <div
        className={cn(
          'absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 transition-opacity',
          (isSelected || isDragging) ? 'opacity-100' : 'group-hover:opacity-100'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Block actions on right */}
      <div
        className={cn(
          'absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 transition-opacity',
          isSelected ? 'opacity-100' : 'group-hover:opacity-100'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Block content */}
      <div className="p-2">
        {children}
      </div>

      {/* Block type label */}
      <div
        className={cn(
          'absolute -top-3 left-2 px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground opacity-0 transition-opacity',
          (isSelected || isDragging) ? 'opacity-100' : 'group-hover:opacity-100'
        )}
      >
        {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
      </div>
    </div>
  );
}
