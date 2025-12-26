import { Mail, Phone, User } from 'lucide-react';
import type { AscContactBlock as AscContactBlockType } from '@/types/email-blocks';

interface AscContactBlockProps {
  block: AscContactBlockType;
  isEditing?: boolean;
}

export function AscContactBlock({ block, isEditing }: AscContactBlockProps) {
  const bgColor = block.backgroundColor || '#f0f9ff';
  const textColor = block.textColor || '#1e40af';
  const buttonColor = block.buttonColor || '#2563eb';
  const headingText = block.headingText || 'Contact your Author Success Coach today!';
  const showEmail = block.showEmail !== false;
  const showPhone = block.showPhone !== false;
  
  // Preview data
  const previewAsc = {
    name: 'Tyler Amos',
    email: 'tyler@authorservices.com',
    phone: '(555) 123-4567',
  };
  
  return (
    <div 
      className="rounded-lg p-6 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <h3 
        className="text-lg font-semibold mb-4"
        style={{ color: textColor }}
      >
        {headingText}
      </h3>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        <User className="h-5 w-5" style={{ color: textColor }} />
        <span className="font-medium text-base" style={{ color: textColor }}>
          {previewAsc.name}
        </span>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4">
        {showEmail && (
          <a 
            href={`mailto:${previewAsc.email}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium"
            style={{ backgroundColor: buttonColor }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
        {showPhone && (
          <a 
            href={`tel:${previewAsc.phone}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium"
            style={{ backgroundColor: buttonColor }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            <Phone className="h-4 w-4" />
            {previewAsc.phone}
          </a>
        )}
      </div>
      
      {isEditing && (
        <p className="text-xs text-muted-foreground mt-4 italic">
          Personalized with recipient's assigned Author Success Coach
        </p>
      )}
    </div>
  );
}
