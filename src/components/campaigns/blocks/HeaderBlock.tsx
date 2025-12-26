import type { HeaderBlock as HeaderBlockType } from '@/types/email-blocks';
import { getLogoForBackground } from '@/lib/color-utils';

interface HeaderBlockProps {
  block: HeaderBlockType;
  isEditing?: boolean;
  logoUrl?: string;
  logoDarkUrl?: string;
  headerImageUrl?: string;
  headerImageDarkUrl?: string;
}

export function HeaderBlock({ block, isEditing, logoUrl, logoDarkUrl, headerImageUrl, headerImageDarkUrl }: HeaderBlockProps) {
  const bgColor = block.backgroundColor || '#ffffff';
  
  // Prefer header images over logos, with smart selection based on background color
  let displayImage: string | undefined;
  if (block.logoUrl) {
    // Block has explicit logoUrl set (from AI generation)
    displayImage = block.logoUrl;
  } else if (headerImageUrl || headerImageDarkUrl) {
    // Use header images if available
    displayImage = getLogoForBackground(bgColor, headerImageUrl, headerImageDarkUrl);
  } else {
    // Fall back to logos
    displayImage = getLogoForBackground(bgColor, logoUrl, logoDarkUrl);
  }

  return (
    <div
      className="p-4 text-center"
      style={{ backgroundColor: bgColor }}
    >
      {displayImage ? (
        <img
          src={displayImage}
          alt="Header"
          className="max-h-24 w-auto mx-auto"
        />
      ) : (
        <div className="h-16 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
          {isEditing ? 'Click to add header image' : 'No header image set'}
        </div>
      )}
    </div>
  );
}
