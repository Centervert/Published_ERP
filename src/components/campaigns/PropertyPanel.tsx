import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import type { EmailBlock } from '@/types/email-blocks';

interface PropertyPanelProps {
  block: EmailBlock;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onClose: () => void;
}

export function PropertyPanel({ block, onUpdate, onClose }: PropertyPanelProps) {
  return (
    <div className="w-72 border-l bg-background p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold capitalize">{block.type} Properties</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {renderPropertiesForBlock(block, onUpdate)}
      </div>
    </div>
  );
}

function renderPropertiesForBlock(
  block: EmailBlock,
  onUpdate: (updates: Partial<EmailBlock>) => void
) {
  switch (block.type) {
    case 'header':
      return (
        <>
          <PropertyField label="Logo URL">
            <Input
              value={block.logoUrl || ''}
              onChange={(e) => onUpdate({ logoUrl: e.target.value })}
              placeholder="https://..."
            />
          </PropertyField>
          <PropertyField label="Background Color">
            <ColorInput
              value={block.backgroundColor || '#ffffff'}
              onChange={(v) => onUpdate({ backgroundColor: v })}
            />
          </PropertyField>
          <PropertyField label="Padding">
            <Input
              type="number"
              value={block.padding || 20}
              onChange={(e) => onUpdate({ padding: parseInt(e.target.value) || 20 })}
            />
          </PropertyField>
        </>
      );

    case 'text':
      return (
        <>
          <PropertyField label="Content">
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={4}
            />
          </PropertyField>
          <PropertyField label="Font Size">
            <Input
              type="number"
              value={block.fontSize || 16}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 16 })}
            />
          </PropertyField>
          <PropertyField label="Color">
            <ColorInput
              value={block.color || '#333333'}
              onChange={(v) => onUpdate({ color: v })}
            />
          </PropertyField>
          <PropertyField label="Alignment">
            <AlignSelect value={block.align || 'left'} onChange={(v) => onUpdate({ align: v })} />
          </PropertyField>
          <PropertyField label="Font Weight">
            <Select
              value={block.fontWeight || 'normal'}
              onValueChange={(v) => onUpdate({ fontWeight: v as 'normal' | 'bold' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </PropertyField>
        </>
      );

    case 'heading':
      return (
        <>
          <PropertyField label="Content">
            <Input
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </PropertyField>
          <PropertyField label="Level">
            <Select
              value={String(block.level)}
              onValueChange={(v) => onUpdate({ level: parseInt(v) as 1 | 2 | 3 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1 - Large</SelectItem>
                <SelectItem value="2">H2 - Medium</SelectItem>
                <SelectItem value="3">H3 - Small</SelectItem>
              </SelectContent>
            </Select>
          </PropertyField>
          <PropertyField label="Color">
            <ColorInput
              value={block.color || '#1f2937'}
              onChange={(v) => onUpdate({ color: v })}
            />
          </PropertyField>
          <PropertyField label="Alignment">
            <AlignSelect value={block.align || 'left'} onChange={(v) => onUpdate({ align: v })} />
          </PropertyField>
        </>
      );

    case 'image':
      return (
        <>
          <PropertyField label="Image URL">
            <Input
              value={block.src}
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://..."
            />
          </PropertyField>
          <PropertyField label="Alt Text">
            <Input
              value={block.alt || ''}
              onChange={(e) => onUpdate({ alt: e.target.value })}
              placeholder="Describe the image"
            />
          </PropertyField>
          <PropertyField label="Width">
            <Select
              value={block.width === 'full' ? 'full' : 'custom'}
              onValueChange={(v) => onUpdate({ width: v === 'full' ? 'full' : 300 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Width</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </PropertyField>
          {block.width !== 'full' && (
            <PropertyField label="Width (px)">
              <Input
                type="number"
                value={typeof block.width === 'number' ? block.width : 300}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 300 })}
              />
            </PropertyField>
          )}
          <PropertyField label="Link URL">
            <Input
              value={block.link || ''}
              onChange={(e) => onUpdate({ link: e.target.value })}
              placeholder="https://..."
            />
          </PropertyField>
          <PropertyField label="Alignment">
            <AlignSelect value={block.align || 'center'} onChange={(v) => onUpdate({ align: v })} />
          </PropertyField>
          <PropertyField label="Full Bleed">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Edge-to-edge image</span>
              <Switch
                checked={block.fullBleed || false}
                onCheckedChange={(v) => onUpdate({ fullBleed: v })}
              />
            </div>
          </PropertyField>
        </>
      );

    case 'button':
      return (
        <>
          <PropertyField label="Button Text">
            <Input
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
          </PropertyField>
          <PropertyField label="URL">
            <Input
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
            />
          </PropertyField>
          <PropertyField label="Background Color">
            <ColorInput
              value={block.backgroundColor || '#2563eb'}
              onChange={(v) => onUpdate({ backgroundColor: v })}
            />
          </PropertyField>
          <PropertyField label="Text Color">
            <ColorInput
              value={block.textColor || '#ffffff'}
              onChange={(v) => onUpdate({ textColor: v })}
            />
          </PropertyField>
          <PropertyField label="Border Radius">
            <Input
              type="number"
              value={block.borderRadius || 4}
              onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 4 })}
            />
          </PropertyField>
          <PropertyField label="Alignment">
            <AlignSelect value={block.align || 'center'} onChange={(v) => onUpdate({ align: v })} />
          </PropertyField>
          <PropertyField label="Full Width">
            <Switch
              checked={block.fullWidth || false}
              onCheckedChange={(v) => onUpdate({ fullWidth: v })}
            />
          </PropertyField>
        </>
      );

    case 'divider':
      return (
        <>
          <PropertyField label="Color">
            <ColorInput
              value={block.color || '#e5e7eb'}
              onChange={(v) => onUpdate({ color: v })}
            />
          </PropertyField>
          <PropertyField label="Thickness">
            <Input
              type="number"
              value={block.thickness || 1}
              onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) || 1 })}
            />
          </PropertyField>
          <PropertyField label="Style">
            <Select
              value={block.style || 'solid'}
              onValueChange={(v) => onUpdate({ style: v as 'solid' | 'dashed' | 'dotted' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </PropertyField>
        </>
      );

    case 'spacer':
      return (
        <PropertyField label="Height (px)">
          <Input
            type="number"
            value={block.height}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 24 })}
          />
        </PropertyField>
      );

    case 'footer':
      return (
        <>
          <PropertyField label="Content">
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={2}
            />
          </PropertyField>
          <PropertyField label="Background Color">
            <ColorInput
              value={block.backgroundColor || '#f9fafb'}
              onChange={(v) => onUpdate({ backgroundColor: v })}
            />
          </PropertyField>
          <PropertyField label="Text Color">
            <ColorInput
              value={block.textColor || '#6b7280'}
              onChange={(v) => onUpdate({ textColor: v })}
            />
          </PropertyField>
          <PropertyField label="Show Unsubscribe">
            <Switch
              checked={block.showUnsubscribe !== false}
              onCheckedChange={(v) => onUpdate({ showUnsubscribe: v })}
            />
          </PropertyField>
          {block.showUnsubscribe !== false && (
            <PropertyField label="Unsubscribe Text">
              <Input
                value={block.unsubscribeText || 'Unsubscribe'}
                onChange={(e) => onUpdate({ unsubscribeText: e.target.value })}
              />
            </PropertyField>
          )}
        </>
      );

    default:
      return <p className="text-sm text-muted-foreground">No properties available</p>;
  }
}

function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-9 rounded border cursor-pointer"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
}

function AlignSelect({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right';
  onChange: (v: 'left' | 'center' | 'right') => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="left">Left</SelectItem>
        <SelectItem value="center">Center</SelectItem>
        <SelectItem value="right">Right</SelectItem>
      </SelectContent>
    </Select>
  );
}
