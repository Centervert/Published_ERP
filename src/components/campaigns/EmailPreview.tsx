import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Mail } from 'lucide-react';

interface EmailPreviewProps {
  html: string;
  isStreaming?: boolean;
}

export function EmailPreview({ html, isStreaming }: EmailPreviewProps) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <span className="text-sm font-medium">Preview</span>
        <Tabs value={view} onValueChange={(v) => setView(v as 'desktop' | 'mobile')}>
          <TabsList className="h-8">
            <TabsTrigger value="desktop" className="h-6 px-2 text-xs gap-1">
              <Monitor className="h-3 w-3" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="h-6 px-2 text-xs gap-1">
              <Smartphone className="h-3 w-3" />
              Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        <div 
          className={`mx-auto transition-all duration-300 ${
            view === 'desktop' ? 'max-w-[600px]' : 'max-w-[375px]'
          }`}
        >
          {html ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Email Header Bar */}
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">Email Preview</span>
                </div>
              </div>
              
              {/* Email Content - Scrollable */}
              <div 
                className="overflow-auto"
                style={{ maxHeight: view === 'desktop' ? '600px' : '700px' }}
              >
                <iframe
                  srcDoc={html}
                  className={`w-full border-0 transition-opacity ${
                    isStreaming ? 'opacity-70' : 'opacity-100'
                  }`}
                  style={{ 
                    minHeight: view === 'desktop' ? '600px' : '700px',
                    height: 'auto'
                  }}
                  title="Email Preview"
                  onLoad={(e) => {
                    // Auto-resize iframe to content height
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument) {
                      const height = iframe.contentDocument.body.scrollHeight;
                      iframe.style.height = `${Math.max(height, view === 'desktop' ? 600 : 700)}px`;
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-muted-foreground">No preview yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fill out the form to generate your email
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Generating...</span>
          </div>
        </div>
      )}
    </div>
  );
}
