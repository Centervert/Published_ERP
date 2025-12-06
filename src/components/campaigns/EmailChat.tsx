import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, User, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean;
}

interface EmailChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onRegenerate: () => void;
  isLoading: boolean;
  isStreaming: boolean;
}

export function EmailChat({ 
  messages, 
  onSendMessage, 
  onRegenerate,
  isLoading, 
  isStreaming 
}: EmailChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestions = [
    "Make the header bigger",
    "Use a different color scheme",
    "Add more white space",
    "Make it more urgent",
    "Simplify the layout",
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
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.isHtml ? (
                  <p className="text-sm text-muted-foreground italic">
                    ✓ Email design updated
                  </p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === 'user' && (
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
        </div>
      </ScrollArea>

      {/* Quick Suggestions */}
      {messages.length > 0 && !isLoading && !isStreaming && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
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
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for changes... (e.g., 'Make the button green')"
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading || isStreaming}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
