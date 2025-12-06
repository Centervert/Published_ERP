import type { FooterBlock as FooterBlockType } from '@/types/email-blocks';

interface FooterBlockProps {
  block: FooterBlockType;
  isEditing?: boolean;
}

export function FooterBlock({ block, isEditing }: FooterBlockProps) {
  return (
    <div
      className="p-4 text-center"
      style={{
        backgroundColor: block.backgroundColor || '#f9fafb',
        color: block.textColor || '#6b7280',
      }}
    >
      <p className="m-0 mb-2 text-sm">{block.content}</p>
      {block.showUnsubscribe !== false && (
        <a
          href="#"
          className="text-xs underline"
          style={{ color: block.textColor || '#6b7280' }}
          onClick={(e) => isEditing && e.preventDefault()}
        >
          {block.unsubscribeText || 'Unsubscribe'}
        </a>
      )}
    </div>
  );
}
