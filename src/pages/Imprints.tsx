import { useState } from 'react';
import { useImprints, Imprint } from '@/hooks/useImprints';
import { useCompany } from '@/hooks/useCompany';
import { ImprintForm } from '@/components/imprints/ImprintForm';
import { ImprintsTable } from '@/components/imprints/ImprintsTable';
import { CompanyCard } from '@/components/imprints/CompanyCard';
import { CompanySettingsSheet } from '@/components/imprints/CompanySettingsSheet';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Loader2, Building2 } from 'lucide-react';

export default function Imprints() {
  const { imprints, isLoading, deleteImprint } = useImprints();
  const { company, isLoading: isLoadingCompany } = useCompany();
  const [formOpen, setFormOpen] = useState(false);
  const [editingImprint, setEditingImprint] = useState<Imprint | null>(null);
  const [deletingImprint, setDeletingImprint] = useState<Imprint | null>(null);
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false);

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

  if (isLoading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Parent Company Section */}
      {company && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Parent Company</h2>
            <p className="text-sm text-muted-foreground">
              The parent organization that owns all imprints
            </p>
          </div>
          <CompanyCard company={company} onEdit={() => setCompanySettingsOpen(true)} />
        </section>
      )}

      {/* Imprints Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Imprints</h2>
            <p className="text-sm text-muted-foreground">
              Publishing brands and their visual identity
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Imprint
          </Button>
        </div>

        {imprints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-muted/30">
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
          <ImprintsTable
            imprints={imprints}
            onEdit={handleEdit}
            onDelete={setDeletingImprint}
          />
        )}
      </section>

      <ImprintForm
        open={formOpen}
        onClose={handleCloseForm}
        imprint={editingImprint}
      />

      <CompanySettingsSheet
        open={companySettingsOpen}
        onClose={() => setCompanySettingsOpen(false)}
        company={company || null}
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
