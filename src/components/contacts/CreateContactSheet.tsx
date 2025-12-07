import { useState } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X, Globe, BookOpen, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { z } from 'zod';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const CONTACT_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'author', label: 'Author' },
  { value: 'bad', label: 'Bad' },
];

const LINK_TYPES = [
  { value: 'author_website', label: 'Author Website', icon: Globe },
  { value: 'amazon', label: 'Amazon Author Page', icon: BookOpen },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'goodreads', label: 'Goodreads', icon: BookOpen },
  { value: 'other', label: 'Other', icon: Globe },
];

const contactSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  contact_type: z.string().optional(),
  imprint_id: z.string().optional(),
  notes: z.string().optional(),
});

interface ContactLink {
  type: string;
  url: string;
  label?: string;
}

interface CreateContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactSheet({ open, onOpenChange }: CreateContactSheetProps) {
  const { createContact } = useContacts();
  const { imprints } = useImprints();
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    timezone: '',
    contact_type: 'lead',
    imprint_id: '',
    notes: '',
  });
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      address: '',
      timezone: '',
      contact_type: 'lead',
      imprint_id: '',
      notes: '',
    });
    setLinks([]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      contactSchema.parse(formData);

      await createContact.mutateAsync({
        email: formData.email,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        timezone: formData.timezone || undefined,
        contact_type: formData.contact_type || undefined,
        imprint_id: formData.imprint_id || undefined,
        notes: formData.notes || undefined,
        links: links.length > 0 ? links : undefined,
      });
      
      resetForm();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }));
  };

  const addLink = () => {
    setLinks(prev => [...prev, { type: 'author_website', url: '' }]);
  };

  const updateLink = (index: number, field: keyof ContactLink, value: string) => {
    setLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ));
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const getLinkIcon = (type: string) => {
    const linkType = LINK_TYPES.find(lt => lt.value === type);
    return linkType?.icon || Globe;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Contact</SheetTitle>
          <SheetDescription>
            Add a new contact to your CRM.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={handlePhoneChange}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State 12345"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Time Zone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Type */}
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <Select
              value={formData.contact_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contact_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Imprint/Group */}
          <div className="space-y-2">
            <Label>Imprint / Group</Label>
            <Select
              value={formData.imprint_id || 'none'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, imprint_id: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Author Services (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Author Services (default)</SelectItem>
                {imprints.map((imprint) => (
                  <SelectItem key={imprint.id} value={imprint.id}>
                    {imprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Websites & Social */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Websites & Social</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {links.map((link, index) => {
              const Icon = getLinkIcon(link.type);
              return (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={link.type}
                    onValueChange={(value) => updateLink(index, 'type', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_TYPES.map((lt) => (
                        <SelectItem key={lt.value} value={lt.value}>
                          <div className="flex items-center gap-2">
                            <lt.icon className="h-4 w-4" />
                            {lt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this contact..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Contact
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
