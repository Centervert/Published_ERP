import { useState } from 'react';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EditableCell } from './EditableCell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Search, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  unsubscribed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  complained: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const contactTypeColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  author: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  bad: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const CONTACT_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'author', label: 'Author' },
  { value: 'bad', label: 'Bad' },
];

export function ContactsTable() {
  const { contacts, isLoading, updateContact, deleteContact } = useContacts();
  const { imprints } = useImprints();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [imprintFilter, setImprintFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.includes(search);
    
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    const matchesType = typeFilter === 'all' || contact.contact_type === typeFilter;
    const matchesImprint = imprintFilter === 'all' || 
      (imprintFilter === 'none' && !contact.imprint_id) ||
      contact.imprint_id === imprintFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesImprint;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (contact: Contact) => {
    if (confirm(`Delete ${contact.email}?`)) {
      await deleteContact.mutateAsync(contact.id);
    }
  };

  const handleUpdateField = async (contactId: string, field: string, value: string) => {
    await updateContact.mutateAsync({ id: contactId, [field]: value || null });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="author">Author</SelectItem>
            <SelectItem value="bad">Bad</SelectItem>
          </SelectContent>
        </Select>
        <Select value={imprintFilter} onValueChange={setImprintFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Imprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Imprints</SelectItem>
            <SelectItem value="none">Author Services</SelectItem>
            {imprints.map(imprint => (
              <SelectItem key={imprint.id} value={imprint.id}>
                {imprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>No contacts found</p>
          {search && <p className="text-sm">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Imprint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.first_name || ''}
                      onSave={(value) => handleUpdateField(contact.id, 'first_name', value)}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.last_name || ''}
                      onSave={(value) => handleUpdateField(contact.id, 'last_name', value)}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.email}
                      onSave={(value) => handleUpdateField(contact.id, 'email', value)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.phone || ''}
                      onSave={(value) => handleUpdateField(contact.id, 'phone', value)}
                      type="phone"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.contact_type || 'lead'}
                      onSave={(value) => handleUpdateField(contact.id, 'contact_type', value)}
                      type="select"
                      options={CONTACT_TYPES}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={contact.imprint_id || 'none'}
                      onSave={(value) => handleUpdateField(contact.id, 'imprint_id', value === 'none' ? '' : value)}
                      type="select"
                      options={[
                        { value: 'none', label: 'Author Services' },
                        ...imprints.map(i => ({ value: i.id, label: i.name }))
                      ]}
                      placeholder="Author Services"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[contact.status] || ''}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(contact.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(contact)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
    </div>
  );
}
