import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/giveaway-constants';

interface GiveawayFileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
}

export const GiveawayFileUpload = ({ file, onFileChange, error }: GiveawayFileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setValidationError('File size must be less than 25MB');
      return false;
    }

    // Check file type
    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = acceptedTypes.includes(file.type) || 
                       ['.pdf', '.doc', '.docx', '.rtf'].includes(`.${fileExtension}`);
    
    if (!isValidType) {
      setValidationError('Please upload a PDF, DOCX, DOC, or RTF file');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      onFileChange(droppedFile);
    }
  }, [onFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      onFileChange(selectedFile);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onFileChange]);

  const handleRemove = useCallback(() => {
    onFileChange(null);
    setValidationError(null);
  }, [onFileChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayError = validationError || error;

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
            isDragging
              ? 'border-[#FFA76C] bg-[#FFA76C]/5'
              : displayError
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-[#FFA76C]/50 hover:bg-gray-50'
          )}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.rtf"
            onChange={handleFileSelect}
            className="hidden"
            id="manuscript-upload"
          />
          <label htmlFor="manuscript-upload" className="cursor-pointer">
            <Upload className={cn(
              'w-12 h-12 mx-auto mb-4',
              isDragging ? 'text-[#FFA76C]' : 'text-gray-400'
            )} />
            <p className="text-lg font-medium text-[#171927] mb-2">
              {isDragging ? 'Drop your file here' : 'Upload your manuscript'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-400">
              PDF, DOCX, DOC, or RTF • Max 25MB
            </p>
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-[#FFA76C]/10 border border-[#FFA76C]/20 rounded-xl">
          <div className="w-12 h-12 bg-[#FFA76C] rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[#171927]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#171927] truncate">{file.name}</p>
            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="flex-shrink-0 text-gray-400 hover:text-red-500"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};
