import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, User, RotateCcw, Image as ImageIcon, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean;
  isImage?: boolean;
  imageUrl?: string;
}

interface EmailChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onRegenerate: () => void;
  onGenerateImage?: (prompt: string) => void;
  onInsertImage?: (imageUrl: string) => void;
  onUploadImage?: (file: File) => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
  isGeneratingImage?: boolean;
  isUploadingImage?: boolean;
}

export function EmailChat({ 
  messages, 
  onSendMessage, 
  onRegenerate,
  onGenerateImage,
  onInsertImage,
  onUploadImage,
  isLoading, 
  isStreaming,
  isGeneratingImage,
  isUploadingImage 
}: EmailChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming || isGeneratingImage || isUploadingImage) return;
    
    // Check if this is an image generation request
    const imageKeywords = ['generate image', 'create image', 'make image', 'generate a image', 'create a image', 'hero image', 'banner image', 'generate hero', 'create hero', 'make a hero', 'generate banner', 'create banner', 'make banner'];
    const isImageRequest = imageKeywords.some(keyword => input.toLowerCase().includes(keyword));
    
    if (isImageRequest && onGenerateImage) {
      onGenerateImage(input.trim());
    } else {
      onSendMessage(input.trim());
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      await onUploadImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const suggestions = [
    "Make the header bigger",
    "Use a different color scheme",
    "Add more white space",
    "Make it more urgent",
    "Simplify the layout",
  ];

  const imageSuggestions = [
    "Generate a hero image with books",
    "Create a banner with abstract shapes",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl",
                  message.role === 'user'
                    ? message.isImage 
                      ? "bg-primary/10 p-2"
                      : "bg-primary text-primary-foreground px-4 py-2.5"
                    : message.isImage 
                      ? "bg-muted p-2"
                      : "bg-muted px-4 py-2.5"
                )}
              >
                {message.isImage && message.imageUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={message.imageUrl} 
                      alt="Image" 
                      className="rounded-lg max-w-full h-auto"
                      style={{ maxHeight: '200px' }}
                    />
                    {message.role === 'assistant' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onInsertImage?.(message.imageUrl!)}
                          className="w-full"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Insert into Email
                        </Button>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onInsertImage?.(message.imageUrl!)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Insert into Email
                      </Button>
                    )}
                    {message.content && (
                      <p className="text-xs text-muted-foreground">{message.content}</p>
                    )}
                  </div>
                ) : message.isHtml ? (
                  <p className="text-sm text-muted-foreground italic">
                    ✓ Email design updated
                  </p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === 'user' && !message.isImage && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {(isLoading || isStreaming) && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {isStreaming ? 'Designing your email...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isGeneratingImage && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Generating image...
                  </span>
                </div>
              </div>
            </div>
          )}

          {isUploadingImage && (
            <div className="flex gap-3 justify-end">
              <div className="bg-primary/10 rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Uploading image...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Suggestions */}
      {messages.length > 0 && !isLoading && !isStreaming && !isGeneratingImage && !isUploadingImage && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 2).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {suggestion}
              </button>
            ))}
            {onGenerateImage && imageSuggestions.slice(0, 1).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onGenerateImage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                <ImageIcon className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
            <button
              onClick={onRegenerate}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isStreaming || isGeneratingImage || isUploadingImage}
            title="Upload image"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for changes or 'generate a hero image'..."
            className="min-h-[80px] max-h-[160px] resize-none"
            rows={3}
            disabled={isLoading || isStreaming || isGeneratingImage || isUploadingImage}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading || isStreaming || isGeneratingImage || isUploadingImage}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}