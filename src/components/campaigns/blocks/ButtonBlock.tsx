import type { ButtonBlock as ButtonBlockType } from '@/types/email-blocks';

interface ButtonBlockProps {
  block: ButtonBlockType;
  isEditing?: boolean;
}

export function ButtonBlock({ block, isEditing }: ButtonBlockProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[block.align || 'center'];

  const buttonStyle: React.CSSProperties = {
    backgroundColor: block.backgroundColor || '#2563eb',
    color: block.textColor || '#ffffff',
    borderRadius: block.borderRadius || 4,
    padding: '12px 24px',
    display: 'inline-block',
    fontWeight: 'bold',
    fontSize: 16,
    textDecoration: 'none',
    width: block.fullWidth ? '100%' : 'auto',
    textAlign: 'center',
  };

  return (
    <div className={`px-4 py-2 ${alignClass}`}>
      <span
        style={buttonStyle}
        className="cursor-pointer"
        onClick={(e) => {
          if (isEditing) {
            e.preventDefault();
          }
        }}
      >
        {block.text}
      </span>
    </div>
  );
}
