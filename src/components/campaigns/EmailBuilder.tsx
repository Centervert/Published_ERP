import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmailPromptForm, EmailPromptData } from './EmailPromptForm';
import { EmailChat, ChatMessage } from './EmailChat';
import { EmailPreview } from './EmailPreview';
import { useToast } from '@/hooks/use-toast';
import { X, Check } from 'lucide-react';
import { Imprint } from '@/hooks/useImprints';
import { supabase } from '@/integrations/supabase/client';

interface EmailBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imprint: Imprint | null;
  initialHtml?: string;
  onSave: (html: string) => void;
}

export function EmailBuilder({ 
  open, 
  onOpenChange, 
  imprint, 
  initialHtml,
  onSave 
}: EmailBuilderProps) {
  const { toast } = useToast();
  const [html, setHtml] = useState(initialHtml || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastPromptData, setLastPromptData] = useState<EmailPromptData | null>(null);

  const streamResponse = useCallback(async (body: object) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email`;
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || `Error: ${resp.status}`);
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullHtml = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullHtml += content;
            // Update preview in real-time
            setHtml(fullHtml);
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullHtml += content;
            setHtml(fullHtml);
          }
        } catch { /* ignore */ }
      }
    }

    return fullHtml;
  }, []);

  const handleGenerateImage = async (prompt: string) => {
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: prompt }]);
    
    setIsGeneratingImage(true);

    try {
      const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;
      
      const resp = await fetch(IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || `Error: ${resp.status}`);
      }

      const data = await resp.json();
      
      const assistantMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: data.description || 'Image generated successfully',
        isImage: true,
        imageUrl: data.imageUrl,
      }]);

      toast({
        title: "Image generated",
        description: "Click 'Insert into Email' to add it to your design.",
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error generating image",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setIsUploadingImage(true);

    try {
      const timestamp = Date.now();
      const randomId = crypto.randomUUID().slice(0, 8);
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `uploads/${timestamp}-${randomId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('email-assets')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('email-assets')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      const userMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        content: 'Uploaded image',
        isImage: true,
        imageUrl,
      }]);

      toast({
        title: "Image uploaded",
        description: "Click 'Insert into Email' to add it to your design.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error uploading image",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInsertImage = (imageUrl: string) => {
    if (!html) {
      toast({
        title: "No email content",
        description: "Generate an email first, then insert images.",
        variant: "destructive",
      });
      return;
    }

    // Insert image after the logo/header section or at the beginning of body
    const imgTag = `<tr><td align="center" style="padding: 20px 0;"><img src="${imageUrl}" alt="Email hero image" style="max-width: 100%; height: auto; display: block; border-radius: 8px;" /></td></tr>`;
    
    let newHtml = html;
    
    // Try to find a good insertion point after logo or at start of body
    const bodyMatch = html.match(/<body[^>]*>/i);
    const logoMatch = html.match(/<img[^>]*logo[^>]*>/i);
    
    if (logoMatch) {
      // Insert after the row containing the logo
      const logoIndex = html.indexOf(logoMatch[0]);
      const nextTrClose = html.indexOf('</tr>', logoIndex);
      if (nextTrClose !== -1) {
        newHtml = html.slice(0, nextTrClose + 5) + imgTag + html.slice(nextTrClose + 5);
      }
    } else if (bodyMatch) {
      // Insert after first <table> or <tbody>
      const tbodyMatch = html.match(/<tbody[^>]*>/i);
      if (tbodyMatch) {
        const index = html.indexOf(tbodyMatch[0]) + tbodyMatch[0].length;
        newHtml = html.slice(0, index) + imgTag + html.slice(index);
      }
    }
    
    setHtml(newHtml);
    
    toast({
      title: "Image inserted",
      description: "The image has been added to your email.",
    });
  };

  const handleInitialSubmit = async (data: EmailPromptData) => {
    if (!imprint) {
      toast({
        title: "No imprint selected",
        description: "Please select an imprint/brand first.",
        variant: "destructive",
      });
      return;
    }

    setLastPromptData(data);
    setIsLoading(true);
    setIsStreaming(true);
    setHtml('');

    try {
      const fullHtml = await streamResponse({
        imprint: {
          name: imprint.name,
          tagline: imprint.tagline,
          brand_voice: imprint.brand_voice,
          primary_color: imprint.primary_color,
          secondary_color: imprint.secondary_color,
          accent_color: imprint.accent_color,
          background_color: imprint.background_color,
          text_color: imprint.text_color,
          heading_font: imprint.heading_font,
          body_font: imprint.body_font,
          logo_url: imprint.logo_url,
          header_image_url: imprint.header_image_url,
          footer_image_url: imprint.footer_image_url,
          website_url: imprint.website_url,
        },
        emailType: data.emailType,
        description: data.description,
        keyPoints: data.keyPoints,
        callToAction: data.callToAction,
        tone: data.tone,
      });

      // Add initial messages to chat
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();
      
      setMessages([
        {
          id: userMsgId,
          role: 'user',
          content: `Create a ${data.emailType} email about: ${data.description}`,
        },
        {
          id: assistantMsgId,
          role: 'assistant',
          content: fullHtml,
          isHtml: true,
        },
      ]);
      
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Error generating email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleChatMessage = async (message: string) => {
    if (!imprint || !lastPromptData) return;

    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: message }]);
    
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Build conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.isHtml ? `[Previous email HTML was generated]` : m.isImage ? `[Image was generated: ${m.imageUrl}]` : m.content,
      }));

      // Add current HTML as context
      conversationHistory.push({
        role: 'assistant',
        content: `Here is the current email HTML:\n${html}`,
      });

      const fullHtml = await streamResponse({
        imprint: {
          name: imprint.name,
          tagline: imprint.tagline,
          brand_voice: imprint.brand_voice,
          primary_color: imprint.primary_color,
          secondary_color: imprint.secondary_color,
          accent_color: imprint.accent_color,
          background_color: imprint.background_color,
          text_color: imprint.text_color,
          heading_font: imprint.heading_font,
          body_font: imprint.body_font,
          logo_url: imprint.logo_url,
          header_image_url: imprint.header_image_url,
          footer_image_url: imprint.footer_image_url,
          website_url: imprint.website_url,
        },
        emailType: lastPromptData.emailType,
        description: lastPromptData.description,
        keyPoints: lastPromptData.keyPoints,
        callToAction: lastPromptData.callToAction,
        tone: lastPromptData.tone,
        conversationHistory,
        followUpMessage: message,
      });

      const assistantMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: fullHtml, isHtml: true }]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleRegenerate = () => {
    if (lastPromptData) {
      setMessages([]);
      setHasGenerated(false);
      setHtml('');
      handleInitialSubmit(lastPromptData);
    }
  };

  const handleSave = () => {
    if (html) {
      onSave(html);
      onOpenChange(false);
      toast({
        title: "Design saved",
        description: "Your email content has been updated.",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setMessages([]);
      setHasGenerated(false);
      setHtml(initialHtml || '');
      setLastPromptData(null);
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-full p-0 flex flex-col"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
            <div>
              <SheetHeader className="p-0">
                <SheetTitle className="text-left">Email Builder</SheetTitle>
              </SheetHeader>
              {imprint && (
                <p className="text-sm text-muted-foreground">
                  Using {imprint.name} branding
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={!html}>
            <Check className="mr-2 h-4 w-4" />
            Use This Design
          </Button>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Chat/Form */}
          <div className="w-[400px] border-r flex flex-col overflow-hidden">
            {!hasGenerated ? (
              <div className="overflow-auto">
                <EmailPromptForm 
                  onSubmit={handleInitialSubmit} 
                  isLoading={isLoading} 
                />
              </div>
            ) : (
              <EmailChat
                messages={messages}
                onSendMessage={handleChatMessage}
                onRegenerate={handleRegenerate}
                onGenerateImage={handleGenerateImage}
                onInsertImage={handleInsertImage}
                onUploadImage={handleUploadImage}
                isLoading={isLoading}
                isStreaming={isStreaming}
                isGeneratingImage={isGeneratingImage}
                isUploadingImage={isUploadingImage}
              />
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 relative overflow-hidden">
            <EmailPreview html={html} isStreaming={isStreaming} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
