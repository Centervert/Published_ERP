import { useState } from 'react';
import { useImprints, Imprint } from '@/hooks/useImprints';
import { ImprintForm } from '@/components/imprints/ImprintForm';
import { ImprintCard } from '@/components/imprints/ImprintCard';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Loader2, Building2 } from 'lucide-react';

export default function Imprints() {
  const { imprints, isLoading, deleteImprint } = useImprints();
  const [formOpen, setFormOpen] = useState(false);
  const [editingImprint, setEditingImprint] = useState<Imprint | null>(null);
  const [deletingImprint, setDeletingImprint] = useState<Imprint | null>(null);

  const handleEdit = (imprint: Imprint) => {
    setEditingImprint(imprint);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingImprint(null);
  };

  const handleDelete = async () => {
    if (deletingImprint) {
      await deleteImprint.mutateAsync(deletingImprint.id);
      setDeletingImprint(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imprints</h1>
          <p className="text-muted-foreground">Manage your publishing brands and their visual identity</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Imprint
        </Button>
      </div>

      {imprints.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No imprints yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first imprint to start managing brand identities
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Imprint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {imprints.map((imprint) => (
            <ImprintCard
              key={imprint.id}
              imprint={imprint}
              onEdit={() => handleEdit(imprint)}
              onDelete={() => setDeletingImprint(imprint)}
            />
          ))}
        </div>
      )}

      <ImprintForm
        open={formOpen}
        onClose={handleCloseForm}
        imprint={editingImprint}
      />

      <AlertDialog open={!!deletingImprint} onOpenChange={() => setDeletingImprint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Imprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingImprint?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
