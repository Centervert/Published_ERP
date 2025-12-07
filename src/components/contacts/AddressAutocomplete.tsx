import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onTimezoneDetected?: (timezone: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ 
  value, 
  onChange,
  onTimezoneDetected,
  placeholder = "Start typing an address...",
  className 
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const { predictions, isLoading, search, selectPlace, getTimezoneForPlace, clearPredictions } = usePlacesAutocomplete();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        clearPredictions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearPredictions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    search(newValue);
    setShowDropdown(true);
  };

  const handleSelect = async (prediction: { placeId: string; description: string }) => {
    const address = selectPlace(prediction);
    setInputValue(address);
    onChange(address);
    setShowDropdown(false);

    // Auto-detect timezone if callback provided
    if (onTimezoneDetected) {
      const result = await getTimezoneForPlace(prediction.placeId);
      if (result?.timezone) {
        onTimezoneDetected(result.timezone);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={cn("h-8", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-start gap-2 transition-colors"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{prediction.mainText}</div>
                <div className="text-xs text-muted-foreground truncate">{prediction.secondaryText}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
