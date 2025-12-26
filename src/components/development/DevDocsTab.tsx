import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useDevDocumentVersions, DevDocumentVersion } from '@/hooks/useDevDocuments';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Edit2, Save, X, History, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevDocsTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

export function DevDocsTab({ documentId, isAdmin }: DevDocsTabProps) {
  const { versions, latestVersion, createVersion, isLoading } = useDevDocumentVersions(documentId);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DevDocumentVersion | null>(null);

  const handleStartEdit = () => {
    setEditContent(latestVersion?.content_md || '');
    setChangeSummary('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!documentId || !editContent.trim()) {
      toast.error('Content is required');
      return;
    }

    try {
      await createVersion.mutateAsync({
        documentId,
        content_md: editContent,
        change_summary: changeSummary || undefined,
      });
      toast.success('New version saved');
      setIsEditing(false);
      setEditContent('');
      setChangeSummary('');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
    setChangeSummary('');
  };

  const viewVersion = (version: DevDocumentVersion) => {
    setSelectedVersion(version);
    setShowHistory(false);
  };

  const displayedContent = selectedVersion?.content_md || latestVersion?.content_md;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  if (!latestVersion && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documentation</h2>
          {isAdmin && (
            <Button size="sm" onClick={handleStartEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No documentation yet. {isAdmin ? 'Click "Create Document" to get started.' : ''}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Documentation</h2>
          {!isEditing && latestVersion && (
            <Badge variant="outline" className="text-xs">
              v{latestVersion.version_number}
            </Badge>
          )}
          {selectedVersion && selectedVersion.id !== latestVersion?.id && (
            <Badge variant="secondary" className="text-xs">
              Viewing v{selectedVersion.version_number}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && versions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History ({versions.length})
            </Button>
          )}
          {selectedVersion && selectedVersion.id !== latestVersion?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedVersion(null)}
            >
              Back to Latest
            </Button>
          )}
          {isAdmin && !isEditing && (
            <Button size="sm" onClick={handleStartEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1">
          {isEditing ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Content (Markdown)</label>
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Write your documentation in Markdown..."
                    className="mt-1 min-h-[500px] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Change Summary (optional)</label>
                  <Input
                    value={changeSummary}
                    onChange={e => setChangeSummary(e.target.value)}
                    placeholder="Brief description of changes"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={createVersion.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {createVersion.isPending ? 'Saving...' : 'Save Version'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {displayedContent ? (
                  <MarkdownRenderer content={displayedContent} />
                ) : (
                  <p className="text-muted-foreground">No content</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Version History Panel */}
        {showHistory && !isEditing && (
          <Card className="w-72 shrink-0">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History
              </h3>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {versions.map(version => (
                    <div
                      key={version.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id || (!selectedVersion && version.id === latestVersion?.id)
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                      onClick={() => viewVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          v{version.version_number}
                        </Badge>
                        {version.id === latestVersion?.id && (
                          <Badge className="text-xs">Latest</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {version.change_summary && (
                        <p className="text-xs mt-2 line-clamp-2">{version.change_summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
