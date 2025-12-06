import type { DividerBlock as DividerBlockType } from '@/types/email-blocks';

interface DividerBlockProps {
  block: DividerBlockType;
}

export function DividerBlock({ block }: DividerBlockProps) {
  const style: React.CSSProperties = {
    borderTop: `${block.thickness || 1}px ${block.style || 'solid'} ${block.color || '#e5e7eb'}`,
    margin: 0,
  };

  return (
    <div className="px-4 py-2">
      <hr style={style} />
    </div>
  );
}
