import type { FooterBlock as FooterBlockType } from '@/types/email-blocks';

interface FooterBlockProps {
  block: FooterBlockType;
  isEditing?: boolean;
}

export function FooterBlock({ block, isEditing }: FooterBlockProps) {
  const textColor = block.textColor || '#6b7280';
  
  return (
    <div
      className="p-6 text-center"
      style={{
        backgroundColor: block.backgroundColor || '#f9fafb',
        color: textColor,
      }}
    >
      {/* Main content */}
      <p className="m-0 mb-3 text-sm">{block.content}</p>
      
      {/* Company address for CAN-SPAM compliance */}
      {block.companyAddress && (
        <p className="m-0 mb-3 text-xs" style={{ color: textColor }}>
          {block.companyAddress}
        </p>
      )}
      
      {/* Reason for receiving email */}
      {block.reasonText && (
        <p className="m-0 mb-3 text-xs italic" style={{ color: textColor }}>
          {block.reasonText}
        </p>
      )}
      
      {/* Links row */}
      <div className="flex items-center justify-center gap-3 text-xs">
        {block.showUnsubscribe !== false && (
          <a
            href="#"
            className="underline"
            style={{ color: textColor }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            {block.unsubscribeText || 'Unsubscribe'}
          </a>
        )}
        {block.privacyUrl && (
          <>
            <span style={{ color: textColor }}>|</span>
            <a
              href={block.privacyUrl}
              className="underline"
              style={{ color: textColor }}
              onClick={(e) => isEditing && e.preventDefault()}
            >
              Privacy Policy
            </a>
          </>
        )}
      </div>
    </div>
  );
}
