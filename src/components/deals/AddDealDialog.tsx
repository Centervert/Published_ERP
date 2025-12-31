import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Search, Loader2, User, Plus, ArrowLeft, Check } from 'lucide-react';
import { useContactSearch, ContactSearchResult } from '@/hooks/useContactSearch';
import { useContacts } from '@/hooks/useContacts';
import { useCreateDeal, DEAL_STAGE_LABELS, DealStage } from '@/hooks/useDeals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogStep = 'search' | 'create-contact' | 'configure';

interface SelectedContact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface NewContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// Initial stages that can be selected when creating a deal
const INITIAL_STAGES: DealStage[] = ['new', 'outreach', 'contacted'];

export function AddDealDialog({ open, onOpenChange }: AddDealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createContact } = useContacts();
  const createDeal = useCreateDeal();

  // State
  const [step, setStep] = useState<DialogStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [newContact, setNewContact] = useState<NewContactForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [stage, setStage] = useState<DealStage>('new');
  const [assignedAsc, setAssignedAsc] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('search');
      setSearchQuery('');
      setDebouncedSearch('');
      setSelectedContact(null);
      setNewContact({ firstName: '', lastName: '', email: '', phone: '' });
      setStage('new');
      setAssignedAsc('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Set default assignee to current user
  useEffect(() => {
    if (user?.id && !assignedAsc) {
      setAssignedAsc(user.id);
    }
  }, [user?.id, assignedAsc]);

  // Fetch contact search results
  const { data: searchResults = [], isLoading: isSearching } = useContactSearch({
    search: debouncedSearch,
    enabled: step === 'search' && debouncedSearch.length > 0,
  });

  // Fetch team members for ASC assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles-for-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Format contact name for display
  const formatContactName = (contact: ContactSearchResult) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
    return name || contact.email;
  };

  // Handle contact selection from search results
  const handleSelectContact = (contact: ContactSearchResult) => {
    setSelectedContact({
      id: contact.id,
      name: formatContactName(contact),
      email: contact.email,
      phone: contact.phone,
    });
    setStep('configure');
  };

  // Handle "Create new contact" click
  const handleCreateNewClick = () => {
    // Pre-fill email if search looks like an email
    if (debouncedSearch.includes('@')) {
      setNewContact(prev => ({ ...prev, email: debouncedSearch }));
    } else {
      // Try to parse as name
      const parts = debouncedSearch.trim().split(' ');
      if (parts.length >= 2) {
        setNewContact(prev => ({
          ...prev,
          firstName: parts[0],
          lastName: parts.slice(1).join(' '),
        }));
      } else if (parts.length === 1 && parts[0]) {
        setNewContact(prev => ({ ...prev, firstName: parts[0] }));
      }
    }
    setStep('create-contact');
  };

  // Handle contact creation
  const handleCreateContact = async () => {
    if (!newContact.email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address for the new contact.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createContact.mutateAsync({
        email: newContact.email.trim().toLowerCase(),
        first_name: newContact.firstName.trim() || null,
        last_name: newContact.lastName.trim() || null,
        phone: newContact.phone.trim() || null,
      });

      setSelectedContact({
        id: created.id,
        name: [newContact.firstName, newContact.lastName].filter(Boolean).join(' ') || newContact.email,
        email: newContact.email,
        phone: newContact.phone || null,
      });
      setStep('configure');
    } catch (error: any) {
      // Check if it's a duplicate email error
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        // Try to find the existing contact
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id, email, first_name, last_name, phone')
          .eq('email', newContact.email.trim().toLowerCase())
          .limit(1);

        if (existingContacts && existingContacts.length > 0) {
          const existing = existingContacts[0];
          toast({
            title: 'Contact already exists',
            description: `Using existing contact: ${formatContactName(existing)}`,
          });
          setSelectedContact({
            id: existing.id,
            name: formatContactName(existing),
            email: existing.email,
            phone: existing.phone,
          });
          setStep('configure');
          return;
        }
      }
      toast({
        title: 'Error creating contact',
        description: error?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deal creation
  const handleCreateDeal = async () => {
    if (!selectedContact) return;

    setIsSubmitting(true);
    try {
      await createDeal.mutateAsync({
        contact_id: selectedContact.id,
        stage,
        assigned_asc: assignedAsc || null,
        notes: notes.trim() || null,
      });

      toast({
        title: 'Deal created',
        description: `Deal created for ${selectedContact.name}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating deal',
        description: error?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render contact search step
  const renderSearchStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Search for an existing contact or create a new one
      </div>
      <Command className="border rounded-lg" shouldFilter={false}>
        <CommandInput
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-64">
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isSearching && debouncedSearch && searchResults.length === 0 && (
            <CommandEmpty>No contacts found</CommandEmpty>
          )}
          {!isSearching && searchResults.length > 0 && (
            <CommandGroup heading="Contacts">
              {searchResults.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => handleSelectContact(contact)}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {formatContactName(contact)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {contact.email}
                      {contact.phone && ` • ${contact.phone}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              onSelect={handleCreateNewClick}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2 text-primary" />
              <span className="text-primary font-medium">Create new contact</span>
              {debouncedSearch && (
                <span className="text-muted-foreground ml-1">
                  "{debouncedSearch}"
                </span>
              )}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );

  // Render create contact step
  const renderCreateContactStep = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setStep('search')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </button>
      
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={newContact.firstName}
              onChange={(e) => setNewContact(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={newContact.lastName}
              onChange={(e) => setNewContact(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Doe"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={newContact.phone}
            onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
    </div>
  );

  // Render configure deal step
  const renderConfigureStep = () => (
    <div className="space-y-4">
      {/* Selected contact display */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{selectedContact?.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {selectedContact?.email}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedContact(null);
            setStep('search');
          }}
        >
          Change
        </Button>
      </div>

      {/* Deal configuration fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stage">Initial Stage</Label>
          <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
            <SelectTrigger id="stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INITIAL_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DEAL_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedAsc">Assign to ASC</Label>
          <Select value={assignedAsc} onValueChange={setAssignedAsc}>
            <SelectTrigger id="assignedAsc">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name || member.email}
                  {member.id === user?.id && ' (me)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this deal..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' && 'Create New Deal'}
            {step === 'create-contact' && 'Create New Contact'}
            {step === 'configure' && 'Configure Deal'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && renderSearchStep()}
        {step === 'create-contact' && renderCreateContactStep()}
        {step === 'configure' && renderConfigureStep()}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'create-contact' && (
            <Button
              onClick={handleCreateContact}
              disabled={isSubmitting || !newContact.email.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create & Continue
            </Button>
          )}
          {step === 'configure' && (
            <Button
              onClick={handleCreateDeal}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Deal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}