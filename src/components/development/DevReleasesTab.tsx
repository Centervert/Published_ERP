import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useReleases, DevItem } from '@/hooks/useDevItems';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Plus, Calendar, Rocket, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevReleasesTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

export function DevReleasesTab({ documentId, isAdmin }: DevReleasesTabProps) {
  const { items: releases, createItem } = useReleases(documentId);
  const [selectedRelease, setSelectedRelease] = useState<DevItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRelease, setNewRelease] = useState({
    title: '',
    body_md: '',
  });

  const handleCreateRelease = async () => {
    if (!documentId || !newRelease.title) {
      toast.error('Title is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        document_id: documentId,
        item_type: 'release',
        title: newRelease.title,
        body_md: newRelease.body_md,
        status: null,
        severity: null,
        owner_name: null,
        owner_user_id: null,
        due_date: null,
        phase: null,
        related_type: null,
        related_id: null,
        tags: null,
        priority: null,
        is_archived: false,
      });
      toast.success('Release note created');
      setIsAddingNew(false);
      setNewRelease({ title: '', body_md: '' });
    } catch (error) {
      toast.error('Failed to create release note');
    }
  };

  // Sort releases by date, newest first
  const sortedReleases = [...releases].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Release Notes</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Release Note
          </Button>
        )}
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {sortedReleases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No release notes yet
            </CardContent>
          </Card>
        ) : (
          sortedReleases.map(release => (
            <Card
              key={release.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedRelease(release)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{release.title}</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(release.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardHeader>
              {release.body_md && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {release.body_md.slice(0, 150)}
                    {release.body_md.length > 150 && '...'}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Release Detail Sheet */}
      <Sheet open={!!selectedRelease} onOpenChange={open => !open && setSelectedRelease(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              {selectedRelease?.title}
            </SheetTitle>
            <SheetDescription>
              Released {selectedRelease && format(new Date(selectedRelease.created_at), 'MMMM d, yyyy')}
            </SheetDescription>
          </SheetHeader>

          {selectedRelease?.body_md && (
            <div className="mt-6">
              <MarkdownRenderer content={selectedRelease.body_md} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Release Sheet */}
      <Sheet open={isAddingNew} onOpenChange={setIsAddingNew}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Release Note</SheetTitle>
            <SheetDescription>
              Document what shipped, what changed, and what's next
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newRelease.title}
                onChange={e => setNewRelease({ ...newRelease, title: e.target.value })}
                placeholder="e.g., Week of Dec 23 - Campaign System Updates"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Content (Markdown)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Use sections like "What Shipped", "What Changed", "What's Next"
              </p>
              <Textarea
                value={newRelease.body_md}
                onChange={e => setNewRelease({ ...newRelease, body_md: e.target.value })}
                placeholder={`## What Shipped
- Feature 1
- Feature 2

## What Changed
- Change 1
- Change 2

## What's Next
- Upcoming work`}
                className="mt-1 min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateRelease}
                disabled={createItem.isPending}
              >
                {createItem.isPending ? 'Creating...' : 'Create Release Note'}
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
