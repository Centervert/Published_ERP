import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Loader2, Image, Link, Upload, X, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailPromptFormProps {
  onSubmit: (data: EmailPromptData) => void;
  isLoading: boolean;
}

export type ImageSource = 'none' | 'generate' | 'url' | 'upload';

export interface EmailPromptData {
  emailType: string;
  description: string;
  keyPoints: string;
  callToAction: string;
  tone: string;
  imageSource: ImageSource;
  imageStyle?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageFile?: File;
}

const emailTypes = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'sale', label: 'Sale / Promotion' },
  { value: 'product-launch', label: 'Product Launch' },
  { value: 'event', label: 'Event Invitation' },
  { value: 'update', label: 'Update / News' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'other', label: 'Other' },
];

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly & Warm' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'formal', label: 'Formal' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
];

const imageStyles = [
  { value: 'photorealistic', label: 'Photorealistic', description: 'Real photography style' },
  { value: 'illustration', label: 'Illustration', description: 'Digital art style' },
  { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple design' },
  { value: 'abstract', label: 'Abstract', description: 'Abstract patterns' },
  { value: 'watercolor', label: 'Watercolor', description: 'Artistic watercolor' },
  { value: 'flat-design', label: 'Flat Design', description: 'Modern flat graphics' },
];

export function EmailPromptForm({ onSubmit, isLoading }: EmailPromptFormProps) {
  const [emailType, setEmailType] = useState('');
  const [description, setDescription] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [tone, setTone] = useState('professional');
  
  // Image options
  const [imageSource, setImageSource] = useState<ImageSource>('none');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      emailType,
      description,
      keyPoints,
      callToAction,
      tone,
      imageSource,
      imageStyle: imageSource === 'generate' ? imageStyle : undefined,
      imagePrompt: imageSource === 'generate' ? imagePrompt : undefined,
      imageUrl: imageSource === 'url' ? imageUrl : undefined,
      imageFile: imageSource === 'upload' ? imageFile || undefined : undefined,
    });
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setUrlError(null);
    
    if (url && !url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      if (url.match(/^https?:\/\/.+/)) {
        // URL looks valid but might not be an image - try to load it
        setImagePreview(url);
      } else {
        setUrlError('Please enter a valid image URL');
        setImagePreview(null);
      }
    } else if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    setUrlError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEnhancePrompt = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter a description first');
      return;
    }
    
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-image-prompt', {
        body: { prompt: imagePrompt, style: imageStyle }
      });
      
      if (error) throw error;
      
      if (data?.enhancedPrompt) {
        setImagePrompt(data.enhancedPrompt);
        toast.success('Prompt enhanced!');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      toast.error('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const isValid = emailType && description;
  const isImageValid = imageSource === 'none' || 
    (imageSource === 'generate' && imagePrompt) ||
    (imageSource === 'url' && imageUrl && !urlError) ||
    (imageSource === 'upload' && imageFile);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Let's create your email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below and our AI will design a beautiful email for you.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email-type">What type of email is this? *</Label>
        <Select value={emailType} onValueChange={setEmailType}>
          <SelectTrigger id="email-type">
            <SelectValue placeholder="Select email type" />
          </SelectTrigger>
          <SelectContent>
            {emailTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What is this email about? *</Label>
        <Textarea
          id="description"
          placeholder="e.g., We're announcing our summer book sale with 30% off all titles..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="key-points">Key points or requested copy (optional)</Label>
        <Textarea
          id="key-points"
          placeholder="• Discount: 30% off all books&#10;• Dates: June 1-15&#10;• Use code: SUMMER30"
          value={keyPoints}
          onChange={(e) => setKeyPoints(e.target.value)}
          rows={3}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Add each point on a new line</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cta">Call to action (optional)</Label>
        <Input
          id="cta"
          placeholder="e.g., Shop Now, Learn More, Register Today"
          value={callToAction}
          onChange={(e) => setCallToAction(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger id="tone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tones.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hero Image Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-medium">Hero Image (optional)</Label>
        </div>
        
        <RadioGroup
          value={imageSource}
          onValueChange={(value) => {
            setImageSource(value as ImageSource);
            clearImageSelection();
          }}
          className="grid grid-cols-2 gap-2"
        >
          <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="none" id="img-none" />
            <Label htmlFor="img-none" className="cursor-pointer text-sm">No image</Label>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="generate" id="img-generate" />
            <Label htmlFor="img-generate" className="cursor-pointer text-sm flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Generate with AI
            </Label>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="url" id="img-url" />
            <Label htmlFor="img-url" className="cursor-pointer text-sm flex items-center gap-1">
              <Link className="h-3 w-3" /> Image URL
            </Label>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="upload" id="img-upload" />
            <Label htmlFor="img-upload" className="cursor-pointer text-sm flex items-center gap-1">
              <Upload className="h-3 w-3" /> Upload
            </Label>
          </div>
        </RadioGroup>

        {/* Generate with AI Options */}
        {imageSource === 'generate' && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="image-style">Style</Label>
              <Select value={imageStyle} onValueChange={setImageStyle}>
                <SelectTrigger id="image-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex flex-col">
                        <span>{style.label}</span>
                        <span className="text-xs text-muted-foreground">{style.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="image-prompt">Describe your image *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !imagePrompt.trim()}
                  className="h-7 text-xs"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-3 w-3" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="image-prompt"
                placeholder="e.g., books and coffee → AI will enhance it for you"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Image URL Input */}
        {imageSource === 'url' && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL *</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>
            
            {imagePreview && !urlError && (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-lg border"
                  onError={() => {
                    setUrlError('Could not load image from this URL');
                    setImagePreview(null);
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearImageSelection}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upload Image */}
        {imageSource === 'upload' && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            {!imagePreview ? (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearImageSelection}
                >
                  <X className="h-3 w-3" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2 truncate">{imageFile?.name}</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>


      <Button
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!isValid || !isImageValid || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Email
          </>
        )}
      </Button>
    </form>
  );
}
