import type { GreetingBlock as GreetingBlockType } from '@/types/email-blocks';

interface GreetingBlockProps {
  block: GreetingBlockType;
  isEditing?: boolean;
}

// Get a preview greeting based on current time (for visual editor)
function getPreviewGreeting(style: 'formal' | 'casual' = 'formal'): string {
  const hour = new Date().getHours();
  
  if (style === 'casual') {
    if (hour < 12) return 'Hey';
    if (hour < 17) return 'Hey';
    return 'Hey';
  }
  
  // Formal style
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingBlock({ block, isEditing }: GreetingBlockProps) {
  const greeting = getPreviewGreeting(block.style);
  const previewName = 'Sarah'; // Placeholder name for preview
  
  return (
    <div className="py-2 px-1">
      <p className="m-0 text-base" style={{ fontSize: 16, lineHeight: 1.6 }}>
        {greeting}, <span className="font-medium">{previewName}</span>
      </p>
      {isEditing && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          Personalized with recipient's first name and time of send
        </p>
      )}
    </div>
  );
}
