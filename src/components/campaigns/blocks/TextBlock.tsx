import type { TextBlock as TextBlockType } from '@/types/email-blocks';

interface TextBlockProps {
  block: TextBlockType;
  isEditing?: boolean;
  onChange?: (content: string) => void;
}

export function TextBlock({ block, isEditing, onChange }: TextBlockProps) {
  const style: React.CSSProperties = {
    fontSize: block.fontSize || 16,
    color: block.color || '#333333',
    textAlign: block.align || 'left',
    fontWeight: block.fontWeight || 'normal',
    lineHeight: block.lineHeight || 1.6,
  };

  if (isEditing && onChange) {
    return (
      <div
        className="px-4 py-2 min-h-[2em] outline-none"
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }

  return (
    <p className="px-4 py-2 m-0" style={style}>
      {block.content}
    </p>
  );
}
