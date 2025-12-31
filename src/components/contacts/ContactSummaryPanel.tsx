import { Contact } from '@/hooks/useContacts';
import { useBooks, useAddBook, useDeleteBook } from '@/hooks/useBooks';
import { useDealsByContact, DEAL_STAGE_LABELS } from '@/hooks/useDeals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ChevronDown, 
  Sparkles, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Plus,
  Briefcase,
  BookOpen,
  Trash2,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CreateDealDialog } from '@/components/contacts/CreateDealDialog';

interface ContactSummaryPanelProps {
  contact: Contact;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_production', label: 'In Production' },
  { value: 'published', label: 'Published' },
];

const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case 'published':
      return 'default';
    case 'in_production':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function ContactSummaryPanel({ contact }: ContactSummaryPanelProps) {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [dealsOpen, setDealsOpen] = useState(true);
  const [booksOpen, setBooksOpen] = useState(true);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookStatus, setNewBookStatus] = useState('draft');

  const { books, isLoading: booksLoading } = useBooks(contact.id);
  const addBook = useAddBook();
  const deleteBook = useDeleteBook();
  
  const { data: deals = [], isLoading: dealsLoading } = useDealsByContact(contact.id);

  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'this contact';

  const handleAddBook = async () => {
    if (!newBookTitle.trim()) return;
    
    await addBook.mutateAsync({
      contactId: contact.id,
      title: newBookTitle.trim(),
      status: newBookStatus,
    });
    
    setNewBookTitle('');
    setNewBookStatus('draft');
    setAddBookOpen(false);
  };

  const handleDeleteBook = async (bookId: string) => {
    await deleteBook.mutateAsync({ id: bookId, contactId: contact.id });
  };

  return (
    <div className="flex flex-col h-full">
      {/* AI Summary Section */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-6 h-[57px] border-b hover:bg-muted/50 text-left">
          <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />
          <span className="font-medium text-sm">Contact summary</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Contact summary
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                    <Sparkles className="h-3 w-3 mr-0.5" />
                    AI
                  </Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Generated {format(new Date(), 'MMM d, yyyy')}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                {contact.first_name ? `${contact.first_name} is a ` : 'This is a '}
                {contact.contact_type || 'lead'} contact 
                {contact.created_at && ` added on ${format(parseISO(contact.created_at), 'MMMM d, yyyy')}`}.
                {contact.notes ? ` Notes: ${contact.notes.slice(0, 100)}...` : ' No additional notes recorded.'}
              </p>
              
              <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-3 text-primary border-primary/30">
                <Sparkles className="h-4 w-4 mr-2" />
                Ask a question
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Books Section */}
      <Collapsible open={booksOpen} onOpenChange={setBooksOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-4 border-b hover:bg-muted/50 text-left">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${booksOpen ? '' : '-rotate-90'}`} />
            <span className="font-medium text-sm">Books ({books.length})</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-primary text-xs px-2"
            onClick={(e) => {
              e.stopPropagation();
              setAddBookOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-6">
          {booksLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Track the books published by {displayName}.
              </p>
              <Button 
                variant="link" 
                size="sm" 
                className="text-primary mt-1"
                onClick={() => setAddBookOpen(true)}
              >
                Add a book
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {books.map((book) => (
                <div 
                  key={book.id} 
                  className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{book.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(book.status)} className="text-xs">
                      {STATUS_OPTIONS.find(s => s.value === book.status)?.label || 'Draft'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteBook(book.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Deals Section */}
      <Collapsible open={dealsOpen} onOpenChange={setDealsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-4 border-b hover:bg-muted/50 text-left">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${dealsOpen ? '' : '-rotate-90'}`} />
            <span className="font-medium text-sm">Deals ({deals.length})</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-primary text-xs px-2"
            onClick={(e) => {
              e.stopPropagation();
              setAddDealOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-6">
          {dealsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Track the revenue opportunities associated with {displayName}.
              </p>
              <Button 
                variant="link" 
                size="sm" 
                className="text-primary mt-1"
                onClick={() => setAddDealOpen(true)}
              >
                Create a deal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div 
                  key={deal.id} 
                  className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{DEAL_STAGE_LABELS[deal.stage]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      ${deal.total_value?.toLocaleString() || '0'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Create Deal Dialog */}
      <CreateDealDialog
        open={addDealOpen}
        onOpenChange={setAddDealOpen}
        contactId={contact.id}
        contactName={displayName}
      />

      {/* Add Book Dialog */}
      <Dialog open={addBookOpen} onOpenChange={setAddBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter book title"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newBookStatus} onValueChange={setNewBookStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBookOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddBook} 
              disabled={!newBookTitle.trim() || addBook.isPending}
            >
              {addBook.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}