import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle, XCircle, Clock, FileJson } from "lucide-react";
import { useContactExport } from "@/hooks/useContactExport";

export function ContactExportCard() {
  const {
    startExport,
    checkExistingJob,
    downloadFile,
    downloadAll,
    isStarting,
    isPolling,
    currentJob,
    downloadInfo,
    progress,
  } = useContactExport();

  // Check for existing jobs on mount
  useEffect(() => {
    checkExistingJob();
  }, [checkExistingJob]);

  const getStatusIcon = () => {
    if (!currentJob) return null;
    
    switch (currentJob.status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (!currentJob) return null;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "outline",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[currentJob.status] || "secondary"} className="gap-1">
        {getStatusIcon()}
        {currentJob.status}
      </Badge>
    );
  };

  const isWorking = isStarting || isPolling || currentJob?.status === "processing" || currentJob?.status === "pending";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Export All Contacts
        </CardTitle>
        <CardDescription>
          Export all 423,000+ contacts as JSON files. The export runs in the background 
          and saves files to storage — no timeouts, no browser connection required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Start Export Button */}
        <Button 
          onClick={startExport} 
          disabled={isWorking}
          className="w-full sm:w-auto"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : isPolling || (currentJob?.status === "processing") ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Start Export
            </>
          )}
        </Button>

        {/* Current Job Status */}
        {currentJob && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Export Status</span>
              {getStatusBadge()}
            </div>

            {/* Progress Bar */}
            {(currentJob.status === "processing" || currentJob.status === "completed") && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Batch {currentJob.completed_batches} of {currentJob.total_batches}
                  </span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Rows:</span>
                <span className="ml-2 font-medium">{currentJob.total_rows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Files:</span>
                <span className="ml-2 font-medium">{currentJob.total_batches}</span>
              </div>
            </div>

            {/* Error Display */}
            {currentJob.status === "failed" && currentJob.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {currentJob.error}
              </div>
            )}
          </div>
        )}

        {/* Download Section */}
        {downloadInfo && downloadInfo.downloads.length > 0 && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-primary">
                Ready to Download
              </span>
              <Button size="sm" onClick={downloadAll} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download All ({downloadInfo.downloads.length} files)
              </Button>
            </div>

            <div className="space-y-2">
              {downloadInfo.downloads.map((file) => (
                <div 
                  key={file.filename} 
                  className="flex items-center justify-between rounded-md bg-background/50 p-2"
                >
                  <span className="text-sm font-mono">{file.filename}</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => downloadFile(file.url, file.filename)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Download links expire in 1 hour. Start a new export to regenerate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
