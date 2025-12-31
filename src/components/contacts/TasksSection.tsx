import { useState } from 'react';
import { useContactTasks, ContactTask } from '@/hooks/useContactTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { 
  Plus, 
  CheckSquare, 
  Loader2, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  AlertCircle,
  PhoneCall,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TasksSectionProps {
  contactId: string;
  dealId?: string | null;
  emptyMessage?: string;
}

export function TasksSection({ 
  contactId, 
  dealId,
  emptyMessage = 'No callback tasks yet',
}: TasksSectionProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { tasks, isLoading, addTask, updateTask, toggleComplete, deleteTask } = useContactTasks({ contactId, dealId });

  return (
    <div className="space-y-4">
      {/* Add Task Button */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Callback
        </Button>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PhoneCall className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">{emptyMessage}</p>
          <p className="text-xs text-muted-foreground">Create callback reminders to follow up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={() => toggleComplete.mutate({ id: task.id, completed: !task.completed })}
              onUpdate={async (updates) => {
                await updateTask.mutateAsync({ id: task.id, ...updates });
              }}
              onDelete={() => deleteTask.mutate(task.id)}
              isUpdating={updateTask.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={async (data) => {
          await addTask.mutateAsync({ ...data, dealId });
          setShowAddDialog(false);
        }}
        isPending={addTask.isPending}
      />
    </div>
  );
}

interface TaskItemProps {
  task: ContactTask;
  onToggle: () => void;
  onUpdate: (updates: Partial<ContactTask>) => Promise<void>;
  onDelete: () => void;
  isUpdating: boolean;
}

function TaskItem({ task, onToggle, onUpdate, onDelete, isUpdating }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>(
    (task.priority as 'low' | 'medium' | 'high') || 'medium'
  );

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !task.completed;
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    await onUpdate({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      due_date: editDueDate || null,
      priority: editPriority,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.due_date || '');
    setEditPriority((task.priority as 'low' | 'medium' | 'high') || 'medium');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-md border bg-card space-y-3">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Callback title..."
            autoFocus
          />
        </div>
        
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Add details..."
            className="resize-none"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={editPriority} onValueChange={(v) => setEditPriority(v as typeof editPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-2">
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isUpdating}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!editTitle.trim() || isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border bg-card group ${task.completed ? 'opacity-60' : ''}`}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div 
        className="flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'text-destructive' : isDueToday ? 'text-amber-600' : 'text-muted-foreground'
            }`}>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>{format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {task.priority && task.priority !== 'medium' && (
            <Badge 
              variant={task.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {task.priority}
            </Badge>
          )}
        </div>
      </div>
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
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { title: string; description?: string; due_date?: string; priority?: 'low' | 'medium' | 'high' }) => Promise<void>;
  isPending: boolean;
  defaultTitle?: string;
  defaultDueDate?: string;
}

export function AddTaskDialog({ open, onOpenChange, onAdd, isPending, defaultTitle = '', defaultDueDate = '' }: AddTaskDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Reset form when defaults change (e.g., when opened with voicemail callback)
  useState(() => {
    setTitle(defaultTitle);
    setDueDate(defaultDueDate);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Add Callback Reminder
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Follow up call, Return voicemail..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add context for the callback..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">Callback Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Callback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
