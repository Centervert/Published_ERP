import { useState } from 'react';
import { Contact, ContactLink, useUpdateContact, useContactLinks } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock, 
  Building2, 
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { formatPhoneNumber } from '@/lib/phone-utils';

const CONTACT_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'author', label: 'Author' },
  { value: 'bad', label: 'Bad' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complained', label: 'Complained' },
];

const LINK_TYPES = [
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'linkedin', label: 'LinkedIn', icon: LinkIcon },
  { value: 'twitter', label: 'Twitter/X', icon: LinkIcon },
  { value: 'facebook', label: 'Facebook', icon: LinkIcon },
  { value: 'instagram', label: 'Instagram', icon: LinkIcon },
  { value: 'amazon', label: 'Amazon', icon: LinkIcon },
  { value: 'other', label: 'Other', icon: LinkIcon },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  unsubscribed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  complained: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

interface ContactInfoPanelProps {
  contact: Contact;
}

export function ContactInfoPanel({ contact }: ContactInfoPanelProps) {
  const { imprints } = useImprints();
  const updateContact = useUpdateContact();
  const { links, addLink, deleteLink } = useContactLinks(contact.id);
  
  const [formData, setFormData] = useState({
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email,
    phone: contact.phone || '',
    address: contact.address || '',
    timezone: contact.timezone || '',
    contact_type: contact.contact_type || 'lead',
    imprint_id: contact.imprint_id || 'none',
    status: contact.status || 'active',
    notes: contact.notes || '',
  });

  const [newLink, setNewLink] = useState({ type: 'website', url: '', label: '' });
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateContact.mutateAsync({
      id: contact.id,
      ...formData,
      imprint_id: formData.imprint_id === 'none' ? null : formData.imprint_id,
    });
    setHasChanges(false);
  };

  const handleAddLink = async () => {
    if (!newLink.url) return;
    await addLink.mutateAsync({
      contact_id: contact.id,
      link_type: newLink.type,
      url: newLink.url,
      label: newLink.label || null,
    });
    setNewLink({ type: 'website', url: '', label: '' });
  };

  const handleDeleteLink = async (linkId: string) => {
    await deleteLink.mutateAsync(linkId);
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Contact Information</CardTitle>
            <Badge variant="secondary" className={statusColors[formData.status]}>
              {formData.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="First name"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Last name"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              type="email"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange('phone', formatPhoneNumber(e.target.value))}
              placeholder="(555) 123-4567"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Address
            </Label>
            <Input
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Address"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Timezone
              </Label>
              <Input
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                placeholder="e.g. EST"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={formData.contact_type} onValueChange={(v) => handleChange('contact_type', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Imprint
            </Label>
            <Select value={formData.imprint_id} onValueChange={(v) => handleChange('imprint_id', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select imprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Author Services</SelectItem>
                {imprints.map(imprint => (
                  <SelectItem key={imprint.id} value={imprint.id}>{imprint.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasChanges && (
            <Button onClick={handleSave} className="w-full" size="sm" disabled={updateContact.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Websites & Social</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate flex-1"
              >
                {link.label || link.url}
              </a>
              <span className="text-xs text-muted-foreground">{link.link_type}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDeleteLink(link.id!)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="pt-2 border-t space-y-2">
            <div className="flex gap-2">
              <Select value={newLink.type} onValueChange={(v) => setNewLink(p => ({ ...p, type: v }))}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newLink.url}
                onChange={(e) => setNewLink(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="h-8 text-xs flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={newLink.label}
                onChange={(e) => setNewLink(p => ({ ...p, label: e.target.value }))}
                placeholder="Label (optional)"
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" className="h-8" onClick={handleAddLink} disabled={!newLink.url}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Add notes about this contact..."
            className="min-h-[120px] resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
