import { useState } from 'react';
import { useContactNotes, ContactNote } from '@/hooks/useContactNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { Plus, FileText, Loader2, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
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
  const { notes, isLoading, addNote, updateNote, deleteNote } = useContactNotes({ contactId, dealId });

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
              onUpdate={async (content) => { await updateNote.mutateAsync({ id: note.id, content }); }}
              onDelete={() => deleteNote.mutate(note.id)}
              isUpdating={updateNote.isPending}
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
  onUpdate: (content: string) => Promise<void>;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function NoteItem({ note, onUpdate, onDelete, isUpdating, isDeleting }: NoteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  
  const date = parseISO(note.created_at);
  const isLongNote = note.content.length > 200;
  const displayContent = isLongNote && !isExpanded 
    ? note.content.slice(0, 200) + '...' 
    : note.content;

  const handleSave = async () => {
    if (!editContent.trim()) return;
    await onUpdate(editContent.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };
  
  return (
    <div className="rounded-lg border bg-card overflow-hidden group">
      {/* Left accent border via pseudo-element */}
      <div className="border-l-4 border-primary/60 pl-4 pr-3 py-3">
        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!editContent.trim() || isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p 
              className="text-sm whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
              onClick={() => setIsEditing(true)}
              title="Click to edit"
            >
              {displayContent}
            </p>
            
            {isLongNote && !isEditing && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary text-sm font-medium mt-2 hover:underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
        
        {/* Divider */}
        {!isEditing && (
          <div className="border-t mt-3 pt-3 flex items-end justify-between">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>{format(date, 'MMM d yyyy, h:mma')}</div>
              {note.created_by_name && (
                <div>Created by: {note.created_by_name}</div>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
        )}
      </div>
    </div>
  );
}
