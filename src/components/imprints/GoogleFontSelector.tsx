import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleFontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Popular Google Fonts for email compatibility
const popularFonts = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Poppins',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'PT Sans',
  'Noto Sans',
  'Nunito',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Inter',
  'Quicksand',
  'Mukta',
  'Roboto Condensed',
  'Roboto Slab',
  'Lora',
  'PT Serif',
  'Libre Baskerville',
  'Crimson Text',
  'Josefin Sans',
  'Cabin',
  'Arimo',
  'Titillium Web',
  'Fira Sans',
];

export function GoogleFontSelector({ label, value, onChange }: GoogleFontSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  // Load font preview
  useEffect(() => {
    if (value && !loadedFonts.has(value)) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${value.replace(/ /g, '+')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      setLoadedFonts(prev => new Set([...prev, value]));
    }
  }, [value, loadedFonts]);

  const loadFontPreview = (font: string) => {
    if (!loadedFonts.has(font)) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      setLoadedFonts(prev => new Set([...prev, font]));
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            style={{ fontFamily: value }}
          >
            {value || "Select font..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search fonts..." />
            <CommandList>
              <CommandEmpty>No font found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {popularFonts.map((font) => (
                  <CommandItem
                    key={font}
                    value={font}
                    onSelect={() => {
                      onChange(font);
                      setOpen(false);
                    }}
                    onMouseEnter={() => loadFontPreview(font)}
                    style={{ fontFamily: loadedFonts.has(font) ? font : undefined }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === font ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {font}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
