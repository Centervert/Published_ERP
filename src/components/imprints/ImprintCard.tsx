import { Imprint } from '@/hooks/useImprints';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ImprintCardProps {
  imprint: Imprint;
  onEdit: () => void;
  onDelete: () => void;
}

export function ImprintCard({ imprint, onEdit, onDelete }: ImprintCardProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const assetLinks = [
    { label: 'Logo', url: imprint.logo_url },
    { label: 'Logo (Dark)', url: imprint.logo_dark_url },
    { label: 'Icon', url: imprint.icon_url },
    { label: 'Header', url: imprint.header_image_url },
    { label: 'Footer', url: imprint.footer_image_url },
  ].filter(a => a.url);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {imprint.logo_url ? (
              <img 
                src={imprint.logo_url} 
                alt={imprint.name}
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <div 
                className="h-10 w-10 rounded flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: imprint.primary_color }}
              >
                {imprint.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{imprint.name}</h3>
              <p className="text-sm text-muted-foreground">{imprint.from_email}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Color Palette */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
          <div className="flex gap-1">
            {[
              imprint.primary_color,
              imprint.secondary_color,
              imprint.accent_color,
              imprint.background_color,
              imprint.text_color,
            ].map((color, i) => (
              <button
                key={i}
                className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => copyToClipboard(color, 'Color')}
                title={`Click to copy: ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Typography</p>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {imprint.heading_font}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {imprint.body_font}
            </Badge>
          </div>
        </div>

        {/* Asset Links */}
        {assetLinks.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Asset Links</p>
            <div className="space-y-1">
              {assetLinks.map((asset) => (
                <div key={asset.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{asset.label}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(asset.url!, 'URL')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      asChild
                    >
                      <a href={asset.url!} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tagline */}
        {imprint.tagline && (
          <p className="text-sm italic text-muted-foreground">"{imprint.tagline}"</p>
        )}
      </CardContent>
    </Card>
  );
}
