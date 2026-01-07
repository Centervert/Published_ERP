import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedContacts } from '@/hooks/usePaginatedContacts';
import { useDeleteContact, LeadSource } from '@/hooks/useContacts';
import { LeadSourceBadge, LEAD_SOURCE_OPTIONS } from './LeadSourceBadge';
import { useActiveStaff } from '@/hooks/useStaff';
import { BulkValidationDialog } from './BulkValidationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Search, Trash2, Loader2, ChevronLeft, ChevronRight, Info, ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ContactsTableProps {
  filterByUser: string | null;
}

const ITEMS_PER_PAGE = 25;

export function ContactsTable({ filterByUser }: ContactsTableProps) {
  const navigate = useNavigate();
  const deleteContact = useDeleteContact();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkValidationOpen, setBulkValidationOpen] = useState(false);

  // Debounce search input (150ms for snappy response with trigram indexes)
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [search]);

  // Use server-side pagination
  const { contacts, totalCount, totalPages, isLoading, isFetching } = usePaginatedContacts({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    search: debouncedSearch,
    statusFilter,
    typeFilter,
    sourceFilter,
    validationFilter,
    filterByUser,
  });

  // Fetch staff members for displaying assigned names
  const { data: staffMembers = [] } = useActiveStaff();

  // Create a map for quick lookup
  const staffMemberMap = useMemo(() => {
    return new Map(staffMembers.map(m => [m.id, m.full_name]));
  }, [staffMembers]);

  const handleRowClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
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

  const handleDelete = async (contact: { id: string; email: string }) => {
    if (confirm(`Delete ${contact.email}?`)) {
      await deleteContact.mutateAsync(contact.id);
    }
  };

  const getContactTypeLabel = (type: string | null) => {
    switch (type) {
      case 'lead': return 'Lead';
      case 'author': return 'Author';
      case 'bad': return 'Bad';
      default: return 'Lead';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active': return 'Active';
      case 'unsubscribed': return 'Unsubscribed';
      case 'bounced': return 'Bounced';
      case 'complained': return 'Complained';
      default: return 'Active';
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return first + last || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Format large numbers with commas
  const formatNumber = (num: number) => num.toLocaleString();

  // Calculate showing range
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  if (isLoading && !contacts.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Filters:</span>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="author">Author</SelectItem>
            <SelectItem value="bad">Bad</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCE_OPTIONS.map((source) => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={validationFilter} onValueChange={(v) => { setValidationFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Email Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Emails</SelectItem>
            <SelectItem value="unvalidated">Unvalidated</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="deliverable">Deliverable</SelectItem>
            <SelectItem value="undeliverable">Undeliverable</SelectItem>
            <SelectItem value="risky">Risky</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Bulk validation button */}
        {selectedIds.size > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setBulkValidationOpen(true)}
            className="h-9"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Validate {selectedIds.size} selected
          </Button>
        )}
        
        {/* Total count display */}
        <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          {debouncedSearch ? (
            <span>{formatNumber(totalCount)} results</span>
          ) : (
            <span>{formatNumber(totalCount)} total contacts</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 h-10"
        />
        {/* Loading indicator when searching */}
        {isFetching && search.trim() && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>No contacts found</p>
          {debouncedSearch && <p className="text-sm">Try adjusting your search</p>}
        </div>
      ) : (
        <>
          {/* Fixed height container to prevent pagination button movement */}
          <div className="border rounded-lg overflow-x-auto bg-card min-h-[600px] flex flex-col">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">NAME</TableHead>
                  <TableHead className="font-semibold">TYPE</TableHead>
                  <TableHead className="font-semibold">STATUS</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      ASSIGNED ASC
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Author Success Coach</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      ASSIGNED AE
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Account Executive</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">SOURCE</TableHead>
                  <TableHead className="font-semibold">DATE CREATED</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—';
                  const initials = getInitials(contact.first_name, contact.last_name);
                  const avatarColor = getAvatarColor(displayName);
                  
                  return (
                    <TableRow 
                      key={contact.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(contact.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${avatarColor}`}>
                            {initials}
                          </div>
                          <span className="font-medium text-primary hover:underline">
                            {displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getContactTypeLabel(contact.contact_type)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getStatusLabel(contact.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.staff_asc_id 
                          ? staffMemberMap.get(contact.staff_asc_id) || '--' 
                          : contact.assigned_asc_text || '--'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.staff_ae_id 
                          ? staffMemberMap.get(contact.staff_ae_id) || '--' 
                          : contact.assigned_ae_text || '--'}
                      </TableCell>
                      <TableCell>
                        <LeadSourceBadge source={contact.lead_source} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(contact.created_at), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
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
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Loading overlay for pagination */}
            {isFetching && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Pagination - fixed position relative to container */}
          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">
              Showing {formatNumber(showingFrom)} - {formatNumber(showingTo)} of {formatNumber(totalCount)}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || isFetching}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isFetching}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm">Page</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  className="w-16 h-8 text-center"
                />
                <span className="text-sm text-muted-foreground">of {formatNumber(totalPages)}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isFetching}
                className="h-8 px-3"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || isFetching}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <BulkValidationDialog
        open={bulkValidationOpen}
        onOpenChange={setBulkValidationOpen}
        contactIds={Array.from(selectedIds)}
      />
    </div>
  );
}
