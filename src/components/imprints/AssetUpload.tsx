import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, ExternalLink, Loader2 } from 'lucide-react';

interface AssetUploadProps {
  label: string;
  value: string | null;
  onChange: (file: File | null) => void;
  onClear: () => void;
  accept?: string;
  isUploading?: boolean;
}

export function AssetUpload({ 
  label, 
  value, 
  onChange, 
  onClear, 
  accept = 'image/*',
  isUploading = false 
}: AssetUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear();
  };

  const displayUrl = preview || value;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {displayUrl ? (
          <div className="relative group">
            <div className="border rounded-lg p-2 bg-muted/50">
              <div className="flex items-center gap-3">
                <img 
                  src={displayUrl} 
                  alt={label} 
                  className="h-12 w-12 object-contain rounded"
                />
                <div className="flex-1 min-w-0">
                  {value && !preview && (
                    <a 
                      href={value} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{value}</span>
                    </a>
                  )}
                  {preview && (
                    <span className="text-sm text-muted-foreground">New file selected</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleClear}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
          </div>
        )}
        <Input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
