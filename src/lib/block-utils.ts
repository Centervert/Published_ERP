import type { EmailBlock, AIEmailBlock, HeaderBlock, FooterBlock } from '@/types/email-blocks';
import { getLogoForBackground } from '@/lib/color-utils';

// CAN-SPAM compliant company info (unified across system) - HARDCODED
const COMPANY_ADDRESS = 'Author Services, 555 Winderley Pl Suite 225, Maitland, FL 32751';
const COMPANY_PHONE = '866-381-2665';
const DEFAULT_REASON_TEXT = 'You received this email because you are a valued Author Services customer.';
const DEFAULT_COPYRIGHT = '© Author Services. All rights reserved.';

// Generate a unique ID for blocks
export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Interface for imprint data used in block normalization
interface ImprintData {
  name?: string;
  logo_url?: string | null;
  logo_dark_url?: string | null;
  header_image_url?: string | null;
  header_image_dark_url?: string | null;
  primary_color?: string | null;
}

// Convert AI output blocks to full blocks with IDs and normalize with imprint data
export function aiBlocksToEmailBlocks(aiBlocks: AIEmailBlock[], imprint?: ImprintData): EmailBlock[] {
  return aiBlocks.map((block) => {
    const baseBlock = {
      ...block,
      id: generateBlockId(),
    };
    
    // Normalize header blocks - prefer header_image_url over logo_url
    if (block.type === 'header') {
      const headerBlock = baseBlock as HeaderBlock;
      const bgColor = headerBlock.backgroundColor || '#ffffff';
      
      // First try header images, then fall back to logos
      let headerImageUrl: string | null = null;
      if (imprint?.header_image_url || imprint?.header_image_dark_url) {
        headerImageUrl = getLogoForBackground(bgColor, imprint?.header_image_url, imprint?.header_image_dark_url);
      } else {
        headerImageUrl = getLogoForBackground(bgColor, imprint?.logo_url, imprint?.logo_dark_url);
      }
      
      return {
        ...headerBlock,
        logoUrl: headerImageUrl,
      } as HeaderBlock;
    }
    
    // Normalize footer blocks - ALWAYS override with hardcoded CAN-SPAM compliant values
    if (block.type === 'footer') {
      const footerBlock = block as unknown as FooterBlock;
      return {
        id: baseBlock.id,
        type: 'footer',
        content: `© ${imprint?.name || 'Author Services'}. All rights reserved.`,
        companyAddress: COMPANY_ADDRESS,
        reasonText: DEFAULT_REASON_TEXT,
        showUnsubscribe: true,
        unsubscribeText: 'Unsubscribe',
        backgroundColor: footerBlock.backgroundColor || '#f9fafb',
        textColor: footerBlock.textColor || '#6b7280',
      } as FooterBlock;
    }
    
    return baseBlock;
  }) as EmailBlock[];
}

// Create a new block with default values
export function createBlock<T extends EmailBlock['type']>(
  type: T,
  overrides?: Partial<Extract<EmailBlock, { type: T }>>
): Extract<EmailBlock, { type: T }> {
  const defaults = getDefaultsForType(type);
  return {
    id: generateBlockId(),
    type,
    ...defaults,
    ...overrides,
  } as Extract<EmailBlock, { type: T }>;
}

function getDefaultsForType(type: EmailBlock['type']): Record<string, unknown> {
  switch (type) {
    case 'header':
      return { backgroundColor: '#ffffff', padding: 20 };
    case 'greeting':
      return { style: 'formal', fallbackName: 'there' };
    case 'text':
      return { content: 'Enter your text here...', fontSize: 16, color: '#333333', align: 'left', lineHeight: 1.6 };
    case 'heading':
      return { content: 'Heading', level: 2, color: '#1f2937', align: 'left' };
    case 'image':
      return { src: '', width: 'full', align: 'center', alt: '' };
    case 'button':
      return { text: 'Click Here', url: '#', backgroundColor: '#2563eb', textColor: '#ffffff', borderRadius: 4, align: 'center' };
    case 'asc_contact':
      return { headingText: 'Contact your Author Success Coach today!', showEmail: true, showPhone: true, backgroundColor: '#f0f9ff', textColor: '#1e40af', buttonColor: '#2563eb' };
    case 'divider':
      return { color: '#e5e7eb', thickness: 1, style: 'solid' };
    case 'spacer':
      return { height: 24 };
    case 'columns':
      return { columns: [{ width: '50%', blocks: [] }, { width: '50%', blocks: [] }], gap: 16 };
    case 'footer':
      return { content: '© 2025 Company Name', backgroundColor: '#f9fafb', textColor: '#6b7280', showUnsubscribe: true, unsubscribeText: 'Unsubscribe', reasonText: 'You received this email because you are a valued Author Services customer.' };
    default:
      return {};
  }
}

// Move a block in the array
export function moveBlock(blocks: EmailBlock[], fromIndex: number, toIndex: number): EmailBlock[] {
  const result = [...blocks];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

// Update a block's properties
export function updateBlock(
  blocks: EmailBlock[],
  blockId: string,
  updates: Partial<EmailBlock>
): EmailBlock[] {
  return blocks.map((block) =>
    block.id === blockId ? { ...block, ...updates } as EmailBlock : block
  );
}

// Delete a block
export function deleteBlock(blocks: EmailBlock[], blockId: string): EmailBlock[] {
  return blocks.filter((block) => block.id !== blockId);
}

// Duplicate a block
export function duplicateBlock(blocks: EmailBlock[], blockId: string): EmailBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index === -1) return blocks;
  
  const blockToDuplicate = blocks[index];
  const duplicatedBlock = {
    ...JSON.parse(JSON.stringify(blockToDuplicate)),
    id: generateBlockId(),
  } as EmailBlock;
  
  const result = [...blocks];
  result.splice(index + 1, 0, duplicatedBlock);
  return result;
}

// Insert a block at a specific position
export function insertBlock(
  blocks: EmailBlock[],
  block: EmailBlock,
  index: number
): EmailBlock[] {
  const result = [...blocks];
  result.splice(index, 0, block);
  return result;
}

// Find block index by ID
export function findBlockIndex(blocks: EmailBlock[], blockId: string): number {
  return blocks.findIndex((block) => block.id === blockId);
}

// Get block by ID
export function getBlock(blocks: EmailBlock[], blockId: string): EmailBlock | undefined {
  return blocks.find((block) => block.id === blockId);
}

// Validate blocks structure
export function validateBlocks(blocks: unknown): blocks is EmailBlock[] {
  if (!Array.isArray(blocks)) return false;
  
  const validTypes = ['header', 'greeting', 'text', 'heading', 'image', 'button', 'asc_contact', 'divider', 'spacer', 'columns', 'footer'];
  
  return blocks.every((block) => {
    if (typeof block !== 'object' || block === null) return false;
    if (!('id' in block) || !('type' in block)) return false;
    return validTypes.includes((block as EmailBlock).type);
  });
}
