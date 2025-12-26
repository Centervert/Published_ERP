import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useDevMeetings, DevMeeting } from '@/hooks/useDevMeetings';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Plus, Calendar, Users, FileText, CheckCircle, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevMeetingsTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

export function DevMeetingsTab({ documentId, isAdmin }: DevMeetingsTabProps) {
  const { meetings, createMeeting, updateMeeting } = useDevMeetings(documentId);
  const [selectedMeeting, setSelectedMeeting] = useState<DevMeeting | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meeting_date: '',
    attendees: '',
    notes_md: '',
    outcomes_md: '',
    action_items_md: '',
  });

  const handleCreateMeeting = async () => {
    if (!documentId || !newMeeting.title) {
      toast.error('Title is required');
      return;
    }

    try {
      await createMeeting.mutateAsync({
        document_id: documentId,
        title: newMeeting.title,
        meeting_date: newMeeting.meeting_date || null,
        attendees: newMeeting.attendees ? newMeeting.attendees.split(',').map(a => a.trim()) : null,
        notes_md: newMeeting.notes_md || null,
        outcomes_md: newMeeting.outcomes_md || null,
        action_items_md: newMeeting.action_items_md || null,
      });
      toast.success('Meeting created');
      setIsAddingNew(false);
      setNewMeeting({
        title: '',
        meeting_date: '',
        attendees: '',
        notes_md: '',
        outcomes_md: '',
        action_items_md: '',
      });
    } catch (error) {
      toast.error('Failed to create meeting');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Meetings</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Meeting
          </Button>
        )}
      </div>

      {/* Meetings List */}
      <div className="grid gap-4">
        {meetings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No meetings recorded yet
            </CardContent>
          </Card>
        ) : (
          meetings.map(meeting => (
            <Card
              key={meeting.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedMeeting(meeting)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{meeting.title}</CardTitle>
                  {meeting.meeting_date && (
                    <Badge variant="outline" className="shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{meeting.attendees.join(', ')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Meeting Detail Sheet */}
      <Sheet open={!!selectedMeeting} onOpenChange={open => !open && setSelectedMeeting(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedMeeting?.title}</SheetTitle>
            <SheetDescription>
              {selectedMeeting?.meeting_date &&
                format(new Date(selectedMeeting.meeting_date), 'MMMM d, yyyy')}
            </SheetDescription>
          </SheetHeader>

          {selectedMeeting && (
            <div className="space-y-6 mt-6">
              {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    Attendees
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.attendees.map(attendee => (
                      <Badge key={attendee} variant="secondary">{attendee}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMeeting.notes_md && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <MarkdownRenderer content={selectedMeeting.notes_md} />
                  </div>
                </div>
              )}

              {selectedMeeting.outcomes_md && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Outcomes
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <MarkdownRenderer content={selectedMeeting.outcomes_md} />
                  </div>
                </div>
              )}

              {selectedMeeting.action_items_md && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <ListTodo className="h-4 w-4 text-blue-500" />
                    Action Items
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <MarkdownRenderer content={selectedMeeting.action_items_md} />
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Meeting Sheet */}
      <Sheet open={isAddingNew} onOpenChange={setIsAddingNew}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Meeting</SheetTitle>
            <SheetDescription>
              Record a new meeting with notes and outcomes
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newMeeting.title}
                  onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  placeholder="Meeting title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={newMeeting.meeting_date}
                  onChange={e => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Attendees (comma-separated)</label>
              <Input
                value={newMeeting.attendees}
                onChange={e => setNewMeeting({ ...newMeeting, attendees: e.target.value })}
                placeholder="Tyler, Justin, Angelica"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes (Markdown)</label>
              <Textarea
                value={newMeeting.notes_md}
                onChange={e => setNewMeeting({ ...newMeeting, notes_md: e.target.value })}
                placeholder="Meeting notes..."
                className="mt-1 min-h-[120px] font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Outcomes (Markdown)</label>
              <Textarea
                value={newMeeting.outcomes_md}
                onChange={e => setNewMeeting({ ...newMeeting, outcomes_md: e.target.value })}
                placeholder="Key decisions and outcomes..."
                className="mt-1 min-h-[100px] font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Action Items (Markdown)</label>
              <Textarea
                value={newMeeting.action_items_md}
                onChange={e => setNewMeeting({ ...newMeeting, action_items_md: e.target.value })}
                placeholder="- [ ] Action item 1\n- [ ] Action item 2"
                className="mt-1 min-h-[100px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateMeeting}
                disabled={createMeeting.isPending}
              >
                {createMeeting.isPending ? 'Creating...' : 'Create Meeting'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
