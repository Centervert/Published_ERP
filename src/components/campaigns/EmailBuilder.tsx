import { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailPromptForm, EmailPromptData, ImageSource } from './EmailPromptForm';
import { EmailChat, ChatMessage } from './EmailChat';
import { EmailPreview } from './EmailPreview';
import { BlockEditor } from './BlockEditor';
import { useToast } from '@/hooks/use-toast';
import { X, Check, MessageSquare, MousePointer } from 'lucide-react';
import { Imprint } from '@/hooks/useImprints';
import { supabase } from '@/integrations/supabase/client';
import type { EmailBlock } from '@/types/email-blocks';
import { renderBlocksToPreviewHtml } from '@/lib/block-renderer';
import { aiBlocksToEmailBlocks } from '@/lib/block-utils';

interface EmailBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imprint: Imprint | null;
  initialHtml?: string;
  initialBlocks?: EmailBlock[];
  onSave: (html: string, blocks: EmailBlock[]) => void;
}

type EditorMode = 'chat' | 'visual';

export function EmailBuilder({ 
  open, 
  onOpenChange, 
  imprint, 
  initialHtml,
  initialBlocks,
  onSave 
}: EmailBuilderProps) {
  const { toast } = useToast();
  const hasExistingContent = (initialBlocks && initialBlocks.length > 0) || !!initialHtml;
  const [mode, setMode] = useState<EditorMode>(hasExistingContent ? 'visual' : 'chat');
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks || []);
  const [html, setHtml] = useState(initialHtml || '');
  const [messages, setMessages] = useState<ChatMessage[]>(
    hasExistingContent 
      ? [{ 
          id: 'existing-content', 
          role: 'assistant' as const, 
          content: 'You have existing email content. Switch to Visual Edit mode to modify blocks, or use the chat to make changes with AI.' 
        }] 
      : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(hasExistingContent);
  const [lastPromptData, setLastPromptData] = useState<EmailPromptData | null>(null);

  // Update HTML preview when blocks change
  useEffect(() => {
    if (blocks.length > 0 && imprint) {
      const previewHtml = renderBlocksToPreviewHtml(blocks, {
        imprint: {
          primaryColor: imprint.primary_color || undefined,
          secondaryColor: imprint.secondary_color || undefined,
          accentColor: imprint.accent_color || undefined,
          backgroundColor: imprint.background_color || undefined,
          textColor: imprint.text_color || undefined,
          headingFont: imprint.heading_font || undefined,
          bodyFont: imprint.body_font || undefined,
          logoUrl: imprint.logo_url || undefined,
          logoDarkUrl: imprint.logo_dark_url || undefined,
          websiteUrl: imprint.website_url || undefined,
        },
      });
      setHtml(previewHtml);
    }
  }, [blocks, imprint]);

  const streamBlocksResponse = useCallback(async (body: object) => {
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
    let fullJson = "";
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
            fullJson += content;
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
            fullJson += content;
          }
        } catch { /* ignore */ }
      }
    }

    return fullJson;
  }, []);

  const parseBlocksFromAI = useCallback((jsonString: string): EmailBlock[] => {
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanJson = jsonString.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();
      
      // Try to extract valid JSON by finding the matching closing brace
      // This handles cases where AI adds extra text after the JSON
      if (cleanJson.startsWith('{')) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let endIndex = -1;
        
        for (let i = 0; i < cleanJson.length; i++) {
          const char = cleanJson[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\' && inString) {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
        }
        
        if (endIndex > 0) {
          cleanJson = cleanJson.slice(0, endIndex);
        }
      }

      const parsed = JSON.parse(cleanJson);
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        // Pass imprint data for block normalization (including dark logo)
        return aiBlocksToEmailBlocks(parsed.blocks, imprint ? {
          name: imprint.name,
          logo_url: imprint.logo_url,
          logo_dark_url: imprint.logo_dark_url,
          header_image_url: imprint.header_image_url,
          header_image_dark_url: imprint.header_image_dark_url,
          primary_color: imprint.primary_color,
        } : undefined);
      }
      return [];
    } catch (e) {
      console.error('Failed to parse blocks from AI:', e, jsonString);
      return [];
    }
  }, [imprint]);

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
    if (blocks.length === 0) {
      toast({
        title: "No email content",
        description: "Generate an email first, then insert images.",
        variant: "destructive",
      });
      return;
    }

    // Add image block after header or at the beginning
    const headerIndex = blocks.findIndex(b => b.type === 'header');
    const insertIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
    
    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      src: imageUrl,
      alt: 'Email image',
      width: 'full',
      align: 'center',
    });
    
    setBlocks(newBlocks);
    
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
    setBlocks([]);

    try {
      const fullJson = await streamBlocksResponse({
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
        ctaType: data.ctaType,
        includeGreeting: data.includeGreeting,
        tone: data.tone,
        outputFormat: 'blocks',
      });

      let newBlocks = parseBlocksFromAI(fullJson);
      
      // Handle image based on source
      if (data.imageSource !== 'none') {
        let imageUrl: string | null = null;
        
        if (data.imageSource === 'generate' && data.imagePrompt) {
          setIsGeneratingImage(true);
          try {
            const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;
            const resp = await fetch(IMAGE_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ 
                prompt: data.imagePrompt,
                style: data.imageStyle,
              }),
            });

            if (!resp.ok) {
              const error = await resp.json();
              throw new Error(error.error || `Error: ${resp.status}`);
            }

            const imgData = await resp.json();
            imageUrl = imgData.imageUrl;
          } catch (error) {
            console.error('Error generating image:', error);
            toast({
              title: "Image generation failed",
              description: "Email was created, but the image couldn't be generated.",
              variant: "destructive",
            });
          } finally {
            setIsGeneratingImage(false);
          }
        } else if (data.imageSource === 'url' && data.imageUrl) {
          imageUrl = data.imageUrl;
        } else if (data.imageSource === 'upload' && data.imageFile) {
          setIsUploadingImage(true);
          try {
            const timestamp = Date.now();
            const randomId = crypto.randomUUID().slice(0, 8);
            const ext = data.imageFile.name.split('.').pop() || 'png';
            const fileName = `uploads/${timestamp}-${randomId}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('email-assets')
              .upload(fileName, data.imageFile, {
                contentType: data.imageFile.type,
                cacheControl: '3600',
              });

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            const { data: publicUrlData } = supabase.storage
              .from('email-assets')
              .getPublicUrl(fileName);

            imageUrl = publicUrlData.publicUrl;
          } catch (error) {
            console.error('Error uploading image:', error);
            toast({
              title: "Image upload failed",
              description: "Email was created, but the image couldn't be uploaded.",
              variant: "destructive",
            });
          } finally {
            setIsUploadingImage(false);
          }
        }
        
        // Insert image block after header
        if (imageUrl) {
          const headerIndex = newBlocks.findIndex(b => b.type === 'header');
          const insertIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
          
          const imageBlock: EmailBlock = {
            id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'image',
            src: imageUrl,
            alt: 'Email hero image',
            width: 'full',
            align: 'center',
          };
          
          newBlocks = [
            ...newBlocks.slice(0, insertIndex),
            imageBlock,
            ...newBlocks.slice(insertIndex),
          ];
        }
      }
      
      setBlocks(newBlocks);

      // Add initial messages to chat
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();
      
      const imageInfo = data.imageSource !== 'none' 
        ? data.imageSource === 'generate' 
          ? ' I also generated a hero image for you.'
          : ' I also added your hero image.'
        : '';
      
      setMessages([
        {
          id: userMsgId,
          role: 'user',
          content: `Create a ${data.emailType} email about: ${data.description}`,
        },
        {
          id: assistantMsgId,
          role: 'assistant',
          content: `I've created your email with ${newBlocks.length} blocks.${imageInfo} You can switch to Visual Edit mode to drag, reorder, and customize each block.`,
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
    if (!imprint) return;

    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: message }]);
    
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Build conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.isImage ? `[Image was generated: ${m.imageUrl}]` : m.content,
      }));

      // Add current blocks as context
      conversationHistory.push({
        role: 'assistant',
        content: `Current email blocks: ${JSON.stringify({ blocks })}`,
      });

      const fullJson = await streamBlocksResponse({
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
        emailType: lastPromptData?.emailType || 'general',
        description: lastPromptData?.description || 'Edit existing email content',
        keyPoints: lastPromptData?.keyPoints,
        callToAction: lastPromptData?.callToAction,
        tone: lastPromptData?.tone || 'professional',
        conversationHistory,
        followUpMessage: message,
        outputFormat: 'blocks',
      });

      const newBlocks = parseBlocksFromAI(fullJson);
      if (newBlocks.length > 0) {
        setBlocks(newBlocks);
      }

      const assistantMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, { 
        id: assistantMsgId, 
        role: 'assistant', 
        content: `Updated! The email now has ${newBlocks.length} blocks.` 
      }]);
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
      setBlocks([]);
      setHtml('');
      handleInitialSubmit(lastPromptData);
    }
  };

  const handleBlocksChange = (newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
  };

  const handleSave = () => {
    if (blocks.length > 0 || html) {
      onSave(html, blocks);
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
      setBlocks(initialBlocks || []);
      setHtml(initialHtml || '');
      setLastPromptData(null);
      setMode('chat');
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-full p-0 flex flex-col"
        style={{ maxWidth: '100vw' }}
        hideCloseButton
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
          
          {/* Mode Toggle */}
          {hasGenerated && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as EditorMode)} className="mx-4">
              <TabsList>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="visual" className="gap-2">
                  <MousePointer className="h-4 w-4" />
                  Visual Edit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button onClick={handleSave} disabled={blocks.length === 0 && !html}>
            <Check className="mr-2 h-4 w-4" />
            Use This Design
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {mode === 'chat' ? (
            <>
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
            </>
          ) : (
            /* Visual Editor Mode */
            <BlockEditor
              blocks={blocks}
              onChange={handleBlocksChange}
              className="flex-1"
              logoUrl={imprint?.logo_url || undefined}
              logoDarkUrl={imprint?.logo_dark_url || undefined}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
