import { useState } from 'react';
import { Contact, useUpdateContact, useContactLinks } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  FileText,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  Building2,
  Clock,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Settings,
  Save,
  Copy,
  Pencil
} from 'lucide-react';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { format, parseISO } from 'date-fns';
import { AddressAutocomplete } from './AddressAutocomplete';

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
  { value: 'website', label: 'Website' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'other', label: 'Other' },
];

interface ContactSidebarProps {
  contact: Contact;
  onBack: () => void;
}

export function ContactSidebar({ contact, onBack }: ContactSidebarProps) {
  const { imprints } = useImprints();
  const updateContact = useUpdateContact();
  const { links, addLink, deleteLink } = useContactLinks(contact.id);
  
  // Fetch team members for ASC/AE assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const [aboutOpen, setAboutOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [timezoneDialogOpen, setTimezoneDialogOpen] = useState(false);
  const [timezoneInput, setTimezoneInput] = useState('');
  
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
    assigned_asc: contact.assigned_asc || 'none',
    assigned_ae: contact.assigned_ae || 'none',
  });

  const [newLink, setNewLink] = useState({ type: 'website', url: '', label: '' });
  const [hasChanges, setHasChanges] = useState(false);

  const openTimezoneDialog = () => {
    setTimezoneInput(formData.timezone);
    setTimezoneDialogOpen(true);
  };

  const handleTimezoneOverride = () => {
    handleChange('timezone', timezoneInput);
    setTimezoneDialogOpen(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateContact.mutateAsync({
      id: contact.id,
      originalData: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        timezone: contact.timezone,
        contact_type: contact.contact_type,
        status: contact.status,
        notes: contact.notes,
        assigned_asc: contact.assigned_asc,
        assigned_ae: contact.assigned_ae,
      },
      ...formData,
      imprint_id: formData.imprint_id === 'none' ? null : formData.imprint_id,
      assigned_asc: formData.assigned_asc === 'none' ? null : formData.assigned_asc,
      assigned_ae: formData.assigned_ae === 'none' ? null : formData.assigned_ae,
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

  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'No Name';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const contactTypeLabel = CONTACT_TYPES.find(t => t.value === formData.contact_type)?.label || 'Lead';

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="p-4 border-b flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-primary hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contacts
        </Button>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary">
            Actions
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Contact Header */}
      <div className="p-4 pb-4">
        <div className="flex gap-3 mb-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{contactTypeLabel}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => navigator.clipboard.writeText(contact.email)}>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-[10px]">Note</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <Mail className="h-3.5 w-3.5" />
            <span className="text-[10px]">Email</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-[10px]">Call</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-[10px]">Task</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="text-[10px]">More</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* About this contact */}
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-t hover:bg-muted/50 text-left">
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${aboutOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium text-sm">About this contact</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-primary text-xs px-2">
                Actions
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-4">
            {/* Email */}
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="h-8 mt-1"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="text-xs text-muted-foreground">Phone number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', formatPhoneNumber(e.target.value))}
                placeholder="--"
                className="h-8 mt-1"
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
            </div>

            {/* Contact Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Contact Type</Label>
              <Select value={formData.contact_type} onValueChange={(v) => handleChange('contact_type', v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned ASC */}
            <div>
              <Label className="text-xs text-muted-foreground">Assigned A.S.C.</Label>
              <Select value={formData.assigned_asc} onValueChange={(v) => handleChange('assigned_asc', v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned AE */}
            <div>
              <Label className="text-xs text-muted-foreground">Assigned A.E.</Label>
              <Select value={formData.assigned_ae} onValueChange={(v) => handleChange('assigned_ae', v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Imprint
              </Label>
              <Select value={formData.imprint_id} onValueChange={(v) => handleChange('imprint_id', v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue placeholder="Select imprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Author Services (Default)</SelectItem>
                  {imprints.filter(imprint => imprint.name.toLowerCase() !== 'author services').map(imprint => (
                    <SelectItem key={imprint.id} value={imprint.id}>{imprint.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Address
              </Label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => handleChange('address', value)}
                onTimezoneDetected={(timezone) => handleChange('timezone', timezone)}
                placeholder="Start typing an address..."
                className="mt-1"
              />
            </div>

            {/* Timezone */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timezone
                <span className="text-[10px] text-muted-foreground/70">(auto-detected)</span>
              </Label>
              <button
                type="button"
                onClick={openTimezoneDialog}
                className="w-full h-8 mt-1 px-3 text-left text-sm border rounded-md bg-background hover:bg-muted/50 transition-colors flex items-center justify-between group"
              >
                <span className={formData.timezone ? 'text-foreground' : 'text-muted-foreground'}>
                  {formData.timezone || 'Auto-detected from address'}
                </span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Create date */}
            <div>
              <Label className="text-xs text-muted-foreground">Create date</Label>
              <p className="text-sm mt-1">
                {contact.created_at ? format(parseISO(contact.created_at), 'MM/dd/yyyy h:mm a') : '--'}
              </p>
            </div>

            {hasChanges && (
              <Button onClick={handleSave} className="w-full" size="sm" disabled={updateContact.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Links Section */}
        <Collapsible open={linksOpen} onOpenChange={setLinksOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-t hover:bg-muted/50 text-left">
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${linksOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium text-sm">Websites & Social</span>
            </div>
            <Badge variant="secondary" className="text-xs">{links.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-3">
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
                  onClick={() => deleteLink.mutateAsync(link.id!)}
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
          </CollapsibleContent>
        </Collapsible>

        {/* Notes Section */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-t hover:bg-muted/50 text-left">
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium text-sm">Notes</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add notes about this contact..."
              className="min-h-[100px] resize-none text-sm"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Timezone Override Dialog */}
      <Dialog open={timezoneDialogOpen} onOpenChange={setTimezoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Override Timezone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              The timezone is automatically detected from the address. You can manually override it here if needed.
            </p>
            <div>
              <Label htmlFor="timezone-input">Timezone</Label>
              <Input
                id="timezone-input"
                value={timezoneInput}
                onChange={(e) => setTimezoneInput(e.target.value)}
                placeholder="e.g., America/New_York"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use IANA timezone format (e.g., America/New_York, Europe/London)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimezoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTimezoneOverride}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
