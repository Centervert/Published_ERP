import { useState } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';

interface EmailPromptFormProps {
  onSubmit: (data: EmailPromptData) => void;
  isLoading: boolean;
}

export interface EmailPromptData {
  emailType: string;
  description: string;
  keyPoints: string;
  callToAction: string;
  tone: string;
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

export function EmailPromptForm({ onSubmit, isLoading }: EmailPromptFormProps) {
  const [emailType, setEmailType] = useState('');
  const [description, setDescription] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [tone, setTone] = useState('professional');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      emailType,
      description,
      keyPoints,
      callToAction,
      tone,
    });
  };

  const isValid = emailType && description;

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
        <Label htmlFor="key-points">Key points to include (optional)</Label>
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

      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!isValid || isLoading}
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
