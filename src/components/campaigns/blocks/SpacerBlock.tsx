import type { SpacerBlock as SpacerBlockType } from '@/types/email-blocks';

interface SpacerBlockProps {
  block: SpacerBlockType;
}

export function SpacerBlock({ block }: SpacerBlockProps) {
  return (
    <div
      className="flex items-center justify-center text-xs text-muted-foreground border border-dashed border-muted-foreground/30 mx-4 my-1 rounded"
      style={{ height: block.height }}
    >
      {block.height}px
    </div>
  );
}
