import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExportJob {
  id: string;
  table_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_rows: number;
  total_batches: number;
  completed_batches: number;
  batch_size: number;
  file_paths: string[];
  error: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface DownloadInfo {
  jobId: string;
  totalRows: number;
  totalBatches: number;
  downloads: { filename: string; url: string }[];
}

export function useContactExport() {
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const { toast } = useToast();

  const startExport = useCallback(async () => {
    setIsStarting(true);
    setDownloadInfo(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("export-contacts", {
        body: { action: "start" },
      });

      if (error) throw error;

      if (data.error) {
        if (data.jobId) {
          // Export already in progress, poll for status
          toast({
            title: "Export in progress",
            description: "An export is already running. Checking status...",
          });
          await pollJobStatus(data.jobId);
          return;
        }
        throw new Error(data.error);
      }

      toast({
        title: "Export started",
        description: "Processing 423,000+ contacts in the background...",
      });

      // Start polling for status
      await pollJobStatus(data.jobId);

    } catch (error) {
      console.error("Start export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to start export",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }, [toast]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    setIsPolling(true);
    
    const poll = async (): Promise<ExportJob | null> => {
      try {
        const { data, error } = await supabase.functions.invoke("export-contacts", {
          body: { action: "status", jobId },
        });

        if (error) throw error;
        
        const job = data as ExportJob;
        setCurrentJob(job);

        if (job.status === "pending" || job.status === "processing") {
          // Continue polling every 3 seconds
          await new Promise(resolve => setTimeout(resolve, 3000));
          return poll();
        }

        return job;
      } catch (error) {
        console.error("Poll error:", error);
        return null;
      }
    };

    try {
      const finalJob = await poll();
      
      if (finalJob?.status === "completed") {
        toast({
          title: "Export completed!",
          description: `Successfully exported ${finalJob.total_rows.toLocaleString()} contacts in ${finalJob.total_batches} file(s).`,
        });
        // Automatically get download links
        await getDownloadLinks(finalJob.id);
      } else if (finalJob?.status === "failed") {
        toast({
          title: "Export failed",
          description: finalJob.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsPolling(false);
    }
  }, [toast]);

  const getDownloadLinks = useCallback(async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("export-contacts", {
        body: { action: "download", jobId },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setDownloadInfo(data as DownloadInfo);

    } catch (error) {
      console.error("Get download links error:", error);
      toast({
        title: "Failed to get download links",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast]);

  const downloadFile = useCallback((url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const downloadAll = useCallback(() => {
    if (!downloadInfo) return;
    
    // Download files with a small delay between each
    downloadInfo.downloads.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.url, file.filename);
      }, index * 500);
    });
  }, [downloadInfo, downloadFile]);

  const checkExistingJob = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("export-contacts", {
        body: { action: "status" },
      });

      if (error) throw error;

      const jobs = data.jobs as ExportJob[];
      
      // Find any pending/processing job
      const activeJob = jobs.find(j => j.status === "pending" || j.status === "processing");
      if (activeJob) {
        setCurrentJob(activeJob);
        // Resume polling
        pollJobStatus(activeJob.id);
        return;
      }

      // Find most recent completed job
      const completedJob = jobs.find(j => j.status === "completed");
      if (completedJob) {
        setCurrentJob(completedJob);
        await getDownloadLinks(completedJob.id);
      }
    } catch (error) {
      console.error("Check existing job error:", error);
    }
  }, [pollJobStatus, getDownloadLinks]);

  const progress = currentJob 
    ? Math.round((currentJob.completed_batches / Math.max(currentJob.total_batches, 1)) * 100)
    : 0;

  return {
    startExport,
    checkExistingJob,
    downloadFile,
    downloadAll,
    isStarting,
    isPolling,
    currentJob,
    downloadInfo,
    progress,
  };
}
