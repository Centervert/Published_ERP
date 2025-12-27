import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFeatures, DevItem } from '@/hooks/useDevItems';
import { 
  ChevronDown, 
  Plus, 
  Target, 
  CheckCircle, 
  Circle, 
  Calendar,
  Users,
  Link as LinkIcon,
  Edit,
  Layers,
  Loader2
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { toast } from 'sonner';

interface DevFeaturesTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'bg-gray-500' },
  { id: 'marketing', label: 'Marketing', color: 'bg-purple-500' },
  { id: 'crm', label: 'CRM', color: 'bg-blue-500' },
  { id: 'back-office', label: 'Back Office', color: 'bg-amber-500' },
  { id: 'finance', label: 'Finance', color: 'bg-green-500' },
  { id: 'project-management', label: 'Project Mgmt', color: 'bg-pink-500' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'proposed', label: 'Planned' },
  { id: 'open', label: 'In Development' },
  { id: 'closed', label: 'Live' },
  { id: 'deprecated', label: 'Deprecated' },
];

const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'closed': return 'bg-green-500';
    case 'open': return 'bg-blue-500';
    case 'proposed': return 'bg-gray-400';
    case 'deprecated': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'closed': return 'Live';
    case 'open': return 'In Development';
    case 'proposed': return 'Planned';
    case 'deprecated': return 'Deprecated';
    default: return 'Planned';
  }
};

const getCategoryColor = (category: string) => {
  return CATEGORIES.find(c => c.id === category)?.color || 'bg-gray-500';
};

const getCategoryLabel = (category: string) => {
  return CATEGORIES.find(c => c.id === category)?.label || category;
};

export function DevFeaturesTab({ documentId, isAdmin }: DevFeaturesTabProps) {
  const { items: features, isLoading, createItem, updateItem } = useFeatures(documentId);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [openFeatures, setOpenFeatures] = useState<string[]>([]);
  const [editingFeature, setEditingFeature] = useState<DevItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    title: '',
    category: 'marketing',
    status: 'proposed',
    phase: '',
    due_date: '',
    owner_name: '',
    body_md: '',
  });

  const toggleFeature = (id: string) => {
    setOpenFeatures(prev =>
      prev.includes(id)
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  };

  const filteredFeatures = features.filter(f => {
    const categoryMatch = selectedCategory === 'all' || f.tags?.includes(selectedCategory);
    const statusMatch = selectedStatus === 'all' || f.status === selectedStatus;
    return categoryMatch && statusMatch;
  });

  // Group features by category
  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    const category = feature.tags?.[0] || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, DevItem[]>);

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'marketing',
      status: 'proposed',
      phase: '',
      due_date: '',
      owner_name: '',
      body_md: '',
    });
  };

  const handleAddFeature = async () => {
    if (!documentId || !formData.title.trim()) return;
    
    try {
      await createItem.mutateAsync({
        document_id: documentId,
        item_type: 'feature',
        title: formData.title,
        body_md: formData.body_md || null,
        status: formData.status as any,
        phase: formData.phase || null,
        due_date: formData.due_date || null,
        owner_name: formData.owner_name || null,
        tags: [formData.category],
        is_archived: false,
        severity: null,
        owner_user_id: null,
        related_type: null,
        related_id: null,
        priority: null,
      });
      toast.success('Feature added');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to add feature');
    }
  };

  const handleUpdateFeature = async () => {
    if (!editingFeature) return;
    
    try {
      await updateItem.mutateAsync({
        id: editingFeature.id,
        title: formData.title,
        body_md: formData.body_md || null,
        status: formData.status as any,
        phase: formData.phase || null,
        due_date: formData.due_date || null,
        owner_name: formData.owner_name || null,
        tags: [formData.category],
      });
      toast.success('Feature updated');
      setEditingFeature(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update feature');
    }
  };

  const openEditSheet = (feature: DevItem) => {
    setFormData({
      title: feature.title,
      category: feature.tags?.[0] || 'marketing',
      status: feature.status || 'proposed',
      phase: feature.phase || '',
      due_date: feature.due_date?.split('T')[0] || '',
      owner_name: feature.owner_name || '',
      body_md: feature.body_md || '',
    });
    setEditingFeature(feature);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Feature Roadmap</h2>
          <p className="text-sm text-muted-foreground">
            Track capabilities across categories with goals, timelines, and status
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Feature</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Feature Name</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Omnichannel Campaign Manager"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposed">Planned</SelectItem>
                        <SelectItem value="open">In Development</SelectItem>
                        <SelectItem value="closed">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phase">Phase / Timeline</Label>
                    <Input
                      id="phase"
                      value={formData.phase}
                      onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                      placeholder="e.g., Q1 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Target Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="owner_name">Owners</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                      placeholder="e.g., Tyler, Justin"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="body_md">Description (Markdown)</Label>
                    <Textarea
                      id="body_md"
                      value={formData.body_md}
                      onChange={(e) => setFormData(prev => ({ ...prev, body_md: e.target.value }))}
                      placeholder="## Overview&#10;Description of the feature...&#10;&#10;## Current State&#10;- ✅ What's done&#10;&#10;## Planned&#10;- What's next"
                      rows={12}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddFeature} disabled={!formData.title.trim()}>
                    Add Feature
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="h-8"
            >
              {cat.id !== 'all' && (
                <span className={`h-2 w-2 rounded-full ${cat.color} mr-2`} />
              )}
              {cat.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Features List */}
      {Object.keys(groupedFeatures).length === 0 ? (
        <Card className="p-8 text-center">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No features found</p>
          {isAdmin && (
            <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first feature
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <div key={category} className="space-y-3">
              {selectedCategory === 'all' && (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${getCategoryColor(category)}`} />
                  <h3 className="font-medium">{getCategoryLabel(category)}</h3>
                  <Badge variant="secondary" className="text-xs">{categoryFeatures.length}</Badge>
                </div>
              )}
              
              <div className="space-y-3">
                {categoryFeatures.map(feature => (
                  <Card key={feature.id}>
                    <Collapsible
                      open={openFeatures.includes(feature.id)}
                      onOpenChange={() => toggleFeature(feature.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`h-3 w-3 rounded-full shrink-0 ${getStatusColor(feature.status)}`} />
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base truncate">{feature.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getStatusLabel(feature.status)}
                                  </Badge>
                                  {feature.phase && (
                                    <span className="text-xs">{feature.phase}</span>
                                  )}
                                  {feature.due_date && (
                                    <span className="text-xs flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(feature.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditSheet(feature);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <ChevronDown className={`h-5 w-5 transition-transform ${openFeatures.includes(feature.id) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {/* Owners */}
                          {feature.owner_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{feature.owner_name}</span>
                            </div>
                          )}
                          
                          {/* Body content */}
                          {feature.body_md ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <MarkdownRenderer content={feature.body_md} />
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No description yet. {isAdmin && 'Click edit to add details.'}
                            </p>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={!!editingFeature} onOpenChange={(open) => !open && setEditingFeature(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Feature</SheetTitle>
            <SheetDescription>Update feature details and documentation</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-title">Feature Name</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposed">Planned</SelectItem>
                    <SelectItem value="open">In Development</SelectItem>
                    <SelectItem value="closed">Live</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-phase">Phase / Timeline</Label>
                <Input
                  id="edit-phase"
                  value={formData.phase}
                  onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                  placeholder="e.g., Q1 2025"
                />
              </div>
              <div>
                <Label htmlFor="edit-due_date">Target Date</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-owner_name">Owners</Label>
                <Input
                  id="edit-owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                  placeholder="e.g., Tyler, Justin"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-body_md">Description (Markdown)</Label>
                <Textarea
                  id="edit-body_md"
                  value={formData.body_md}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_md: e.target.value }))}
                  rows={16}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingFeature(null)}>Cancel</Button>
              <Button onClick={handleUpdateFeature} disabled={!formData.title.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
