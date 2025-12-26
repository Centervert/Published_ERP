import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, ExternalLink, Loader2, Sun, Moon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface DualAssetUploadProps {
  label: string;
  lightValue: string | null;
  darkValue: string | null;
  onLightChange: (file: File | null) => void;
  onDarkChange: (file: File | null) => void;
  onLightClear: () => void;
  onDarkClear: () => void;
  accept?: string;
  isUploading?: boolean;
}

export function DualAssetUpload({ 
  label, 
  lightValue,
  darkValue,
  onLightChange,
  onDarkChange,
  onLightClear,
  onDarkClear,
  accept = 'image/*',
  isUploading = false 
}: DualAssetUploadProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [lightPreview, setLightPreview] = useState<string | null>(null);
  const [darkPreview, setDarkPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = mode === 'light' ? lightValue : darkValue;
  const currentPreview = mode === 'light' ? lightPreview : darkPreview;
  const displayUrl = currentPreview || currentValue;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mode === 'light') {
          setLightPreview(reader.result as string);
          onLightChange(file);
        } else {
          setDarkPreview(reader.result as string);
          onDarkChange(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    if (mode === 'light') {
      setLightPreview(null);
      onLightClear();
    } else {
      setDarkPreview(null);
      onDarkClear();
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const hasLightAsset = lightPreview || lightValue;
  const hasDarkAsset = darkPreview || darkValue;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as 'light' | 'dark')}>
          <ToggleGroupItem value="light" aria-label="Light background" className="gap-1.5 px-3">
            <Sun className="h-4 w-4" />
            <span className="text-xs">Light</span>
            {hasLightAsset && <span className="h-2 w-2 rounded-full bg-green-500" />}
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Dark background" className="gap-1.5 px-3">
            <Moon className="h-4 w-4" />
            <span className="text-xs">Dark</span>
            {hasDarkAsset && <span className="h-2 w-2 rounded-full bg-green-500" />}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div 
        className={`rounded-lg p-3 transition-colors ${
          mode === 'light' ? 'bg-white border' : 'bg-slate-800 border-slate-700'
        }`}
      >
        {displayUrl ? (
          <div className="flex items-center gap-3">
            <img 
              src={displayUrl} 
              alt={`${label} (${mode})`} 
              className="h-12 max-w-[200px] object-contain rounded"
            />
            <div className="flex-1 min-w-0">
              {currentValue && !currentPreview && (
                <a 
                  href={currentValue} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-sm hover:underline flex items-center gap-1 truncate ${
                    mode === 'light' ? 'text-primary' : 'text-blue-400'
                  }`}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{currentValue}</span>
                </a>
              )}
              {currentPreview && (
                <span className={`text-sm ${mode === 'light' ? 'text-muted-foreground' : 'text-slate-400'}`}>
                  New file selected
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${mode === 'dark' ? 'text-slate-300 hover:bg-slate-700' : ''}`}
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              mode === 'light' 
                ? 'hover:border-primary/50' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className={`h-8 w-8 mx-auto animate-spin ${mode === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
            ) : (
              <Upload className={`h-8 w-8 mx-auto ${mode === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
            )}
            <p className={`mt-2 text-sm ${mode === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>
              {isUploading ? 'Uploading...' : `Upload for ${mode} background`}
            </p>
          </div>
        )}
      </div>

      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
