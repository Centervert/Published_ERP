// Email Block Type Definitions

export interface BaseBlock {
  id: string;
  type: string;
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  logoUrl?: string;
  backgroundColor?: string;
  padding?: number;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  lineHeight?: number;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt?: string;
  width?: number | 'full';
  align?: 'left' | 'center' | 'right';
  link?: string;
  fullBleed?: boolean;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  align?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  color?: string;
  thickness?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number;
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  columns: {
    width: string;
    blocks: EmailBlock[];
  }[];
  gap?: number;
}

export interface FooterBlock extends BaseBlock {
  type: 'footer';
  content: string;
  backgroundColor?: string;
  textColor?: string;
  showUnsubscribe?: boolean;
  unsubscribeText?: string;
  companyAddress?: string;
  reasonText?: string;
  privacyUrl?: string;
}

export interface GreetingBlock extends BaseBlock {
  type: 'greeting';
  style?: 'formal' | 'casual';
  fallbackName?: string;
}

export interface AscContactBlock extends BaseBlock {
  type: 'asc_contact';
  headingText?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | HeadingBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | FooterBlock
  | GreetingBlock
  | AscContactBlock;

export interface EmailDocument {
  blocks: EmailBlock[];
  globalStyles?: {
    backgroundColor?: string;
    fontFamily?: string;
    maxWidth?: number;
  };
}

// Block factory defaults
export const DEFAULT_BLOCK_STYLES: Record<EmailBlock['type'], Partial<EmailBlock>> = {
  header: { backgroundColor: '#ffffff', padding: 20 },
  text: { fontSize: 16, color: '#333333', align: 'left', lineHeight: 1.6 },
  heading: { level: 2, color: '#1f2937', align: 'left' },
  image: { width: 'full', align: 'center', alt: '' },
  button: { backgroundColor: '#2563eb', textColor: '#ffffff', borderRadius: 4, align: 'center' },
  divider: { color: '#e5e7eb', thickness: 1, style: 'solid' },
  spacer: { height: 24 },
  columns: { gap: 16 },
  footer: { backgroundColor: '#f9fafb', textColor: '#6b7280', showUnsubscribe: true, unsubscribeText: 'Unsubscribe', companyAddress: 'Author Services, 555 Winderley Pl Suite 225, Maitland, FL 32751', reasonText: 'You received this email because you are a valued Author Services customer.' },
  greeting: { style: 'formal', fallbackName: 'there' },
  asc_contact: { headingText: 'Contact your Author Success Coach today!', showEmail: true, showPhone: true, backgroundColor: '#f0f9ff', textColor: '#1e40af', buttonColor: '#2563eb' },
};

// AI Output format (what the AI generates - without IDs)
export interface AIEmailBlock {
  type: EmailBlock['type'];
  [key: string]: unknown;
}

export interface AIEmailOutput {
  blocks: AIEmailBlock[];
}
