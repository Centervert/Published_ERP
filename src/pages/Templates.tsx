import { useState } from 'react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Trash2, Edit, Loader2, Eye, Code } from 'lucide-react';
import { format } from 'date-fns';

export default function Templates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTemplate.mutateAsync({ name: newName.trim() });
    setNewName('');
    setCreateDialogOpen(false);
  };

  const handleDelete = async (template: Template) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      await deleteTemplate.mutateAsync(template.id);
    }
  };

  if (editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={async (updates) => {
          await updateTemplate.mutateAsync({ id: editingTemplate.id, ...updates });
          setEditingTemplate(null);
        }}
        onCancel={() => setEditingTemplate(null)}
        isSaving={updateTemplate.isPending}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Design reusable email templates
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates yet</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      {template.subject || 'No subject set'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-4">
                  Updated {format(new Date(template.updated_at), 'MMM d, yyyy')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Give your template a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Welcome Email"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createTemplate.isPending}>
              {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateEditorProps {
  template: Template;
  onSave: (updates: Partial<Template>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function TemplateEditor({ template, onSave, onCancel, isSaving }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || '');
  const [htmlContent, setHtmlContent] = useState(template.html_content);
  const [previewText, setPreviewText] = useState(template.preview_text || '');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleSave = () => {
    onSave({
      name,
      subject,
      html_content: htmlContent,
      preview_text: previewText,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Template</h1>
          <p className="text-muted-foreground">{template.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Welcome to {{FIRST_NAME}}!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview">Preview Text</Label>
            <Input
              id="preview"
              placeholder="Text shown in email preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
          </div>
        </div>
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Available Placeholders:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <code className="px-2 py-1 bg-muted rounded">{'{{FIRST_NAME}}'}</code>
            <code className="px-2 py-1 bg-muted rounded">{'{{LAST_NAME}}'}</code>
            <code className="px-2 py-1 bg-muted rounded">{'{{EMAIL}}'}</code>
            <code className="px-2 py-1 bg-muted rounded">{'{{UNSUBSCRIBE_URL}}'}</code>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="code" className="w-full">
        <TabsList>
          <TabsTrigger value="code">
            <Code className="mr-1 h-4 w-4" />
            HTML Code
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="code" className="mt-4">
          <Textarea
            className="min-h-[500px] font-mono text-sm"
            placeholder="Paste your HTML email template here..."
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-4">
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
            >
              Desktop
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
            >
              Mobile
            </Button>
          </div>
          <div className="flex justify-center">
            <div
              className={`border rounded-lg overflow-hidden bg-white ${
                previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-3xl'
              }`}
            >
              {htmlContent ? (
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-[600px] border-0"
                  title="Email Preview"
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Add HTML content to see preview
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
