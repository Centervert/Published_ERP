import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'phone' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function EditableCell({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = '—',
  className,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setEditValue(formatted);
  };

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-sm">Saving...</span>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <Select
        value={value}
        onValueChange={async (newValue) => {
          setIsSaving(true);
          try {
            await onSave(newValue);
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <SelectTrigger className="h-8 w-auto min-w-[100px] border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={type === 'phone' ? handlePhoneChange : (e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 w-full min-w-[120px] text-sm"
        placeholder={placeholder}
      />
    );
  }

  const displayValue = value || placeholder;

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors min-h-[32px] flex items-center',
        !value && 'text-muted-foreground',
        className
      )}
    >
      {displayValue}
    </div>
  );
}
