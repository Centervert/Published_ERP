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
  Pencil,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { format, parseISO } from 'date-fns';
import { AddressAutocomplete } from './AddressAutocomplete';
import { CreateDealDialog } from './CreateDealDialog';

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
  onSelectTab?: (tab: string) => void;
}

export function ContactSidebar({ contact, onBack, onSelectTab }: ContactSidebarProps) {
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
  
  const [linksOpen, setLinksOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [timezoneDialogOpen, setTimezoneDialogOpen] = useState(false);
  const [timezoneInput, setTimezoneInput] = useState('');
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  
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
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead': return 'bg-blue-100 text-blue-700';
      case 'author': return 'bg-green-100 text-green-700';
      case 'bad': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="px-6 h-[57px] border-b flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-primary hover:text-primary -ml-2">
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

      {/* Contact Header - Info Section */}
      <div className="p-6">
        {/* Avatar and Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-base font-semibold flex-shrink-0">
            {initials}
          </div>
          <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
        </div>

        {/* Quick Actions - right below name */}
        <div className="flex gap-1 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1"
            onClick={() => onSelectTab?.('notes')}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="text-[10px]">Note</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1"
            onClick={() => onSelectTab?.('contact')}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-[10px]">Contact</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1"
            onClick={() => onSelectTab?.('tasks')}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-[10px]">Task</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1"
            onClick={() => setDealDialogOpen(true)}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-[10px]">Deal</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 flex-1">
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="text-[10px]">More</span>
          </Button>
        </div>

        {/* Key Info Grid */}
        <div className="space-y-2 mb-4">
          {/* Type - Inline Select */}
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Type</span>
            <div className="flex-1 flex justify-end">
              <Select value={formData.contact_type} onValueChange={(v) => handleChange('contact_type', v)}>
                <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-sm font-medium focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-sm ${getTypeColor(formData.contact_type)}`}>
                    {contactTypeLabel}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status - Inline Select */}
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Status</span>
            <div className="flex-1 flex justify-end">
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-sm focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                  <span className="text-sm">{STATUS_OPTIONS.find(s => s.value === formData.status)?.label || 'Active'}</span>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ASC */}
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">A.S.C.</span>
            <div className="flex-1 flex justify-end">
              <Select 
                value={formData.assigned_asc || 'none'} 
                onValueChange={(v) => handleChange('assigned_asc', v === 'none' ? null : v)}
              >
                <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-sm focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                  <span className="text-sm">
                    {formData.assigned_asc && formData.assigned_asc !== 'none'
                      ? teamMembers.find(m => m.id === formData.assigned_asc)?.full_name || teamMembers.find(m => m.id === formData.assigned_asc)?.email || '--'
                      : '--'}
                  </span>
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
          </div>

          {/* AE */}
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">A.E.</span>
            <div className="flex-1 flex justify-end">
              <Select 
                value={formData.assigned_ae || 'none'} 
                onValueChange={(v) => handleChange('assigned_ae', v === 'none' ? null : v)}
              >
                <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-sm focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                  <span className="text-sm">
                    {formData.assigned_ae && formData.assigned_ae !== 'none'
                      ? teamMembers.find(m => m.id === formData.assigned_ae)?.full_name || teamMembers.find(m => m.id === formData.assigned_ae)?.email || '--'
                      : '--'}
                  </span>
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
          </div>

          {/* Created */}
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Created</span>
            <span className="text-sm flex-1 text-right">
              {contact.created_at ? format(parseISO(contact.created_at), 'MMM d, yyyy') : '--'}
            </span>
          </div>
        </div>

        {/* Contact Info - Inline Editable */}
        <div className="space-y-2.5 pt-3 border-t">
          {/* Name */}
          <div className="flex items-center group min-h-[28px]">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Name</span>
            <div className="flex-1">
              {editingField === 'name' ? (
                <div className="flex gap-2">
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="First"
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Input
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Last"
                    className="h-7 text-sm"
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                  />
                </div>
              ) : (
                <span 
                  onClick={() => setEditingField('name')}
                  className="text-sm hover:text-primary transition-colors cursor-pointer block"
                >
                  {displayName || <span className="text-muted-foreground">Add name</span>}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start group min-h-[28px]">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">Email</span>
            <div className="flex-1 min-w-0">
              {editingField === 'email' ? (
                <Input
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="h-7 text-sm w-full"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
              ) : (
                <div className="flex items-start gap-1">
                  <span 
                    onClick={() => setEditingField('email')}
                    className="text-sm hover:text-primary transition-colors cursor-pointer break-all"
                  >
                    {formData.email || <span className="text-muted-foreground">Add email</span>}
                  </span>
                  {formData.email && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5" onClick={() => navigator.clipboard.writeText(formData.email)}>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center group min-h-[28px]">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Phone</span>
            <div className="flex-1">
              {editingField === 'phone' ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', formatPhoneNumber(e.target.value))}
                  className="h-7 text-sm w-full"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
              ) : (
                <span 
                  onClick={() => setEditingField('phone')}
                  className="text-sm hover:text-primary transition-colors cursor-pointer"
                >
                  {formData.phone || <span className="text-muted-foreground">Add phone</span>}
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start group min-h-[28px]">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">Address</span>
            <div className="flex-1">
              {editingField === 'address' ? (
                <div>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(value) => handleChange('address', value)}
                    onTimezoneDetected={(timezone) => handleChange('timezone', timezone)}
                    placeholder="Start typing an address..."
                    className="h-7 text-sm"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs mt-1"
                    onClick={() => setEditingField(null)}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <span 
                  onClick={() => setEditingField('address')}
                  className="text-sm hover:text-primary transition-colors cursor-pointer"
                >
                  {formData.address || <span className="text-muted-foreground">Add address</span>}
                </span>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="flex items-center group min-h-[28px]">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Timezone</span>
            <span 
              onClick={openTimezoneDialog}
              className="text-sm hover:text-primary transition-colors flex-1 cursor-pointer"
            >
              {formData.timezone || <span className="text-muted-foreground">Auto-detect</span>}
            </span>
          </div>

          {/* Save Button - shown when there are changes */}
          {hasChanges && (
            <div className="pt-2">
              <Button onClick={handleSave} className="w-full" size="sm" disabled={updateContact.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="flex-1 overflow-y-auto">

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

        {/* System Assignment */}
        <Collapsible open={assignmentOpen} onOpenChange={setAssignmentOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-t hover:bg-muted/50 text-left">
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${assignmentOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium text-sm">System & Assignment</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-4">
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

            {/* Imprint */}
            <div>
              <Label className="text-xs text-muted-foreground">Imprint</Label>
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

            {hasChanges && (
              <Button onClick={handleSave} className="w-full" size="sm" disabled={updateContact.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
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

      {/* Create Deal Dialog */}
      <CreateDealDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        contactId={contact.id}
        contactName={displayName}
      />
    </div>
  );
}
