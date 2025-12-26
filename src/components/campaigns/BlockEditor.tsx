import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Type, Heading1, Image, MousePointer, Minus, Space, LayoutGrid, FileText, Undo2, Redo2, Hand, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { EmailBlock } from '@/types/email-blocks';
import { useBlockEditor } from '@/hooks/useBlockEditor';
import { BlockWrapper } from './blocks/BlockWrapper';
import { HeaderBlock } from './blocks/HeaderBlock';
import { TextBlock } from './blocks/TextBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { SpacerBlock } from './blocks/SpacerBlock';
import { FooterBlock } from './blocks/FooterBlock';
import { GreetingBlock } from './blocks/GreetingBlock';
import { AscContactBlock } from './blocks/AscContactBlock';
import { PropertyPanel } from './PropertyPanel';
import { findBlockIndex } from '@/lib/block-utils';

interface BlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  className?: string;
}

const BLOCK_TYPES = [
  { type: 'header', label: 'Header', icon: LayoutGrid },
  { type: 'greeting', label: 'Greeting', icon: Hand },
  { type: 'heading', label: 'Heading', icon: Heading1 },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'button', label: 'Button', icon: MousePointer },
  { type: 'asc_contact', label: 'ASC Contact CTA', icon: UserCheck },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: Space },
  { type: 'footer', label: 'Footer', icon: FileText },
] as const;

export function BlockEditor({ blocks: initialBlocks, onChange, className }: BlockEditorProps) {
  const {
    blocks,
    selectedBlockId,
    selectedBlock,
    canUndo,
    canRedo,
    undo,
    redo,
    setBlocks,
    moveBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    addBlock,
    selectBlock,
    clearSelection,
    setIsDragging,
  } = useBlockEditor({ initialBlocks });

  // Sync blocks to parent when they change
  const handleBlocksChange = (newBlocks: EmailBlock[]) => {
    onChange(newBlocks);
  };

  // Keep parent in sync
  const syncedMoveBlock = (from: number, to: number) => {
    moveBlock(from, to);
    const result = [...blocks];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    handleBlocksChange(result);
  };

  const syncedUpdateBlock = (id: string, updates: Partial<EmailBlock>) => {
    updateBlock(id, updates);
    handleBlocksChange(blocks.map(b => b.id === id ? { ...b, ...updates } as EmailBlock : b));
  };

  const syncedDeleteBlock = (id: string) => {
    deleteBlock(id);
    handleBlocksChange(blocks.filter(b => b.id !== id));
  };

  const syncedDuplicateBlock = (id: string) => {
    duplicateBlock(id);
    // The hook will handle the duplication, we sync after
  };

  const syncedAddBlock = (type: EmailBlock['type']) => {
    const newBlock = addBlock(type);
    handleBlocksChange([...blocks, newBlock]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const fromIndex = findBlockIndex(blocks, active.id as string);
      const toIndex = findBlockIndex(blocks, over.id as string);
      if (fromIndex !== -1 && toIndex !== -1) {
        syncedMoveBlock(fromIndex, toIndex);
      }
    }
  };

  const renderBlockContent = (block: EmailBlock) => {
    switch (block.type) {
      case 'header':
        return <HeaderBlock block={block} isEditing />;
      case 'greeting':
        return <GreetingBlock block={block} isEditing />;
      case 'text':
        return <TextBlock block={block} isEditing />;
      case 'heading':
        return <HeadingBlock block={block} isEditing />;
      case 'image':
        return <ImageBlock block={block} isEditing />;
      case 'button':
        return <ButtonBlock block={block} isEditing />;
      case 'asc_contact':
        return <AscContactBlock block={block} isEditing />;
      case 'divider':
        return <DividerBlock block={block} />;
      case 'spacer':
        return <SpacerBlock block={block} />;
      case 'footer':
        return <FooterBlock block={block} isEditing />;
      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main editor area */}
      <div className="flex-1 flex flex-col" onClick={() => clearSelection()}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => syncedAddBlock(type as EmailBlock['type'])}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Blocks list */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-[600px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            {blocks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border-2 border-dashed m-4 rounded-lg">
                <Plus className="h-8 w-8 mx-auto mb-2" />
                <p>No blocks yet. Add one to get started!</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="px-12 py-4 space-y-2">
                    {blocks.map((block) => (
                      <BlockWrapper
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => selectBlock(block.id)}
                        onDelete={() => syncedDeleteBlock(block.id)}
                        onDuplicate={() => syncedDuplicateBlock(block.id)}
                      >
                        {renderBlockContent(block)}
                      </BlockWrapper>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Property panel */}
      {selectedBlock && (
        <PropertyPanel
          block={selectedBlock}
          onUpdate={(updates) => syncedUpdateBlock(selectedBlock.id, updates)}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
