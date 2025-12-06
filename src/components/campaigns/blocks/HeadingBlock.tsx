import type { HeadingBlock as HeadingBlockType } from '@/types/email-blocks';

interface HeadingBlockProps {
  block: HeadingBlockType;
  isEditing?: boolean;
  onChange?: (content: string) => void;
}

export function HeadingBlock({ block, isEditing, onChange }: HeadingBlockProps) {
  const sizes = { 1: 28, 2: 24, 3: 20 };
  const fontSize = sizes[block.level] || 24;

  const style: React.CSSProperties = {
    fontSize,
    color: block.color || '#1f2937',
    textAlign: block.align || 'left',
    fontWeight: 'bold',
    margin: 0,
  };

  const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;

  if (isEditing && onChange) {
    return (
      <div
        className="px-4 py-2 min-h-[1em] outline-none"
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
      >
        {block.content}
      </div>
    );
  }

  return (
    <Tag className="px-4 py-2" style={style}>
      {block.content}
    </Tag>
  );
}
