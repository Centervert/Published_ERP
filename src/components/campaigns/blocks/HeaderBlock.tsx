import type { HeaderBlock as HeaderBlockType } from '@/types/email-blocks';

interface HeaderBlockProps {
  block: HeaderBlockType;
  isEditing?: boolean;
}

export function HeaderBlock({ block, isEditing }: HeaderBlockProps) {
  return (
    <div
      className="p-4 text-center"
      style={{ backgroundColor: block.backgroundColor || '#ffffff' }}
    >
      {block.logoUrl ? (
        <img
          src={block.logoUrl}
          alt="Logo"
          className="max-h-16 w-auto mx-auto"
        />
      ) : (
        <div className="h-16 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
          {isEditing ? 'Click to add logo' : 'No logo set'}
        </div>
      )}
    </div>
  );
}
