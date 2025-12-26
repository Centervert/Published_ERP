import type { HeaderBlock as HeaderBlockType } from '@/types/email-blocks';
import { getLogoForBackground } from '@/lib/color-utils';

interface HeaderBlockProps {
  block: HeaderBlockType;
  isEditing?: boolean;
  logoUrl?: string;
  logoDarkUrl?: string;
}

export function HeaderBlock({ block, isEditing, logoUrl, logoDarkUrl }: HeaderBlockProps) {
  const bgColor = block.backgroundColor || '#ffffff';
  // Choose logo based on background color
  const displayLogo = block.logoUrl || getLogoForBackground(bgColor, logoUrl, logoDarkUrl);

  return (
    <div
      className="p-4 text-center"
      style={{ backgroundColor: bgColor }}
    >
      {displayLogo ? (
        <img
          src={displayLogo}
          alt="Logo"
          className="max-h-24 w-auto mx-auto"
        />
      ) : (
        <div className="h-16 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
          {isEditing ? 'Click to add logo' : 'No logo set'}
        </div>
      )}
    </div>
  );
}
