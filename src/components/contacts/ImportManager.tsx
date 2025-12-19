import { useState } from 'react';
import { useImportJobs, ImportJob } from '@/hooks/useImportJobs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    mapping: { variant: 'outline', icon: <FileText className="h-3 w-3" /> },
    processing: { variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: 'secondary', icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
    failed: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function JobRow({ job, onDelete, onViewErrors }: { 
  job: ImportJob; 
  onDelete: (id: string) => void;
  onViewErrors: (job: ImportJob) => void;
}) {
  const progress = job.total_rows > 0 
    ? Math.round((job.processed_rows / job.total_rows) * 100) 
    : 0;

  const hasErrors = job.errors && job.errors.length > 0;
  const hasWarnings = job.warnings && job.warnings.length > 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{job.file_name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={job.status} />
      </TableCell>
      <TableCell>
        {job.status === 'processing' ? (
          <div className="w-32">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {job.processed_rows} / {job.total_rows}
            </div>
          </div>
        ) : (
          <span className="text-sm">{job.total_rows} rows</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-600">{job.successful_rows} ✓</span>
          {job.failed_rows > 0 && (
            <span className="text-red-600">{job.failed_rows} ✗</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {(hasErrors || hasWarnings) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onViewErrors(job)}
              className="h-8"
            >
              {hasErrors ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="ml-1 text-xs">
                {hasErrors ? `${job.errors.length} errors` : 'Warnings'}
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(job.id)}
            className="h-8 w-8"
            disabled={job.status === 'processing'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ImportManager() {
  const { jobs, isLoading, deleteJob } = useImportJobs();
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteJob.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No imports yet</h3>
        <p className="text-muted-foreground text-sm">
          Use the "Import CSV" button to start importing contacts
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Results</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <JobRow 
              key={job.id} 
              job={job} 
              onDelete={(id) => setDeleteConfirmId(id)}
              onViewErrors={setSelectedJob}
            />
          ))}
        </TableBody>
      </Table>

      {/* Error/Warning Details Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              {selectedJob?.file_name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedJob?.warnings && selectedJob.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Warnings
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {selectedJob.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedJob?.errors && selectedJob.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Errors ({selectedJob.errors.length})
                </h4>
                <ul className="space-y-1 text-sm">
                  {selectedJob.errors.map((err, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="font-mono text-xs">Row {err.row}:</span> {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete import record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the import history. Contacts that were already imported will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
