import { useState } from 'react';
import { useContactNotes, ContactNote } from '@/hooks/useContactNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { Plus, FileText, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotesSectionProps {
  contactId: string;
  dealId?: string | null;
  placeholder?: string;
  emptyMessage?: string;
}

export function NotesSection({ 
  contactId, 
  dealId,
  placeholder = 'Add a note about this contact...',
  emptyMessage = 'No notes yet',
}: NotesSectionProps) {
  const [noteText, setNoteText] = useState('');
  const { notes, isLoading, addNote, deleteNote } = useContactNotes({ contactId, dealId });

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    
    await addNote.mutateAsync({
      content: noteText.trim(),
      dealId,
    });
    
    setNoteText('');
  };

  return (
    <div className="space-y-6">
      {/* Add Note Input */}
      <div>
        <Textarea 
          placeholder={placeholder}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button 
            size="sm" 
            onClick={handleAddNote}
            disabled={!noteText.trim() || addNote.isPending}
          >
            {addNote.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteItem 
              key={note.id} 
              note={note} 
              onDelete={() => deleteNote.mutate(note.id)}
              isDeleting={deleteNote.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteItemProps {
  note: ContactNote;
  onDelete: () => void;
  isDeleting: boolean;
}

function NoteItem({ note, onDelete, isDeleting }: NoteItemProps) {
  const date = parseISO(note.created_at);
  
  return (
    <div className="p-3 rounded-md border bg-card group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>{format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}</span>
        {note.created_by_name && (
          <>
            <span>•</span>
            <span>by {note.created_by_name}</span>
          </>
        )}
      </div>
    </div>
  );
}
