import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Mail,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  Shield,
  AlertOctagon,
  Info,
  Clock,
  Square,
} from 'lucide-react';

interface ValidationStats {
  total: number;
  validated: number;
  unvalidated: number;
  deliverable: number;
  undeliverable: number;
  catchAll: number;
  doNotSend: number;
  unknown: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
}

interface ValidationProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  processed: number;
  total: number;
  deliverable: number;
  undeliverable: number;
  catchAll: number;
  unknown: number;
  errors: number;
  startTime: number | null;
  currentBatchStart: number | null;
  estimatedTimeRemaining: string;
  rate: number; // emails per second
}

// Constants for rate limiting info
const EMAILS_PER_BATCH = 100;
const CONCURRENT_REQUESTS = 5;
const DELAY_BETWEEN_BATCHES_MS = 200;
const ESTIMATED_EMAIL_TIME_MS = 800; // ~0.8s per email on average
const MAX_CONSECUTIVE_ERRORS = 10; // Stop after this many consecutive errors

// Format time helper (outside component for stable reference)
const formatTime = (ms: number): string => {
  if (ms < 0 || !isFinite(ms)) return 'Calculating...';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `~${days}d ${hours % 24}h`;
  if (hours > 0) return `~${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `~${minutes}m ${seconds % 60}s`;
  return `~${seconds}s`;
};

export default function ContactHealth() {
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const [progress, setProgress] = useState<ValidationProgress>({
    status: 'idle',
    processed: 0,
    total: 0,
    deliverable: 0,
    undeliverable: 0,
    catchAll: 0,
    unknown: 0,
    errors: 0,
    startTime: null,
    currentBatchStart: null,
    estimatedTimeRemaining: '',
    rate: 0,
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
    };
  }, []);

  // Fetch validation statistics using optimized RPC function
  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contact-health-stats'],
    queryFn: async (): Promise<ValidationStats> => {
      const { data, error } = await supabase.rpc('get_contact_health_stats' as any);

      if (error) {
        console.error('Failed to fetch contact health stats:', error);
        throw new Error('Failed to load contact health statistics');
      }

      const result = data as Record<string, string>;
      const total = parseInt(result.total) || 0;
      const validated = parseInt(result.validated) || 0;

      return {
        total,
        validated,
        unvalidated: total - validated,
        deliverable: parseInt(result.deliverable) || 0,
        undeliverable: parseInt(result.undeliverable) || 0,
        catchAll: parseInt(result.catchAll) || 0,
        doNotSend: parseInt(result.doNotSend) || 0,
        unknown: parseInt(result.unknown) || 0,
        lowRisk: parseInt(result.lowRisk) || 0,
        mediumRisk: parseInt(result.mediumRisk) || 0,
        highRisk: parseInt(result.highRisk) || 0,
      };
    },
  });

  const getInitialETA = (count: number): string => {
    // Estimate based on: 5 concurrent, ~0.8s per email + 200ms delay per batch
    const batches = Math.ceil(count / CONCURRENT_REQUESTS);
    const estimatedMs = (count * ESTIMATED_EMAIL_TIME_MS) + (batches * DELAY_BETWEEN_BATCHES_MS);
    return formatTime(estimatedMs);
  };

  // Continuous validation loop - calls edge function repeatedly until done
  const runValidationLoop = useCallback(async (initialTotal: number) => {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalDeliverable = 0;
    let totalUndeliverable = 0;
    let totalRisky = 0;
    let totalUnknown = 0;
    let totalErrors = 0;
    let consecutiveErrors = 0;

    while (isRunningRef.current && isMountedRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('validate-email-batch', {
          body: { validateAll: true },
        });

        if (!isMountedRef.current) return;

        if (error) {
          console.error('Chunk validation error:', error);
          consecutiveErrors++;
          totalErrors++;
          
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            isRunningRef.current = false;
            setProgress(prev => ({ ...prev, status: 'error' }));
            toast.error(`Validation stopped after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Please try again later.`);
            queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (!data.success) {
          console.error('Chunk failed:', data.error);
          consecutiveErrors++;
          totalErrors++;
          
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            isRunningRef.current = false;
            setProgress(prev => ({ ...prev, status: 'error' }));
            toast.error(`Validation stopped after ${MAX_CONSECUTIVE_ERRORS} consecutive errors.`);
            queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Reset consecutive error counter on success
        consecutiveErrors = 0;

        const { chunkResults, complete } = data;
        
        totalProcessed += chunkResults.processed;
        totalDeliverable += chunkResults.deliverable;
        totalUndeliverable += chunkResults.undeliverable;
        totalRisky += chunkResults.risky;
        totalUnknown += chunkResults.unknown;
        totalErrors += chunkResults.failed;

        const elapsed = Date.now() - startTime;
        const rate = totalProcessed > 0 ? totalProcessed / (elapsed / 1000) : 0;
        const remaining = chunkResults.remaining;

        if (isMountedRef.current) {
          setProgress(prev => ({
            ...prev,
            processed: initialTotal - remaining,
            total: initialTotal,
            deliverable: totalDeliverable,
            undeliverable: totalUndeliverable,
            catchAll: totalRisky,
            unknown: totalUnknown,
            errors: totalErrors,
            rate,
            estimatedTimeRemaining: rate > 0 ? formatTime((remaining / rate) * 1000) : 'Calculating...',
          }));
        }

        if (complete || remaining === 0) {
          isRunningRef.current = false;
          if (isMountedRef.current) {
            setProgress(prev => ({ ...prev, status: 'completed' }));
            toast.success(`Validation complete! Processed ${totalProcessed.toLocaleString()} emails.`);
          }
          queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          return;
        }
      } catch (err) {
        console.error('Validation loop error:', err);
        consecutiveErrors++;
        totalErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          isRunningRef.current = false;
          if (isMountedRef.current) {
            setProgress(prev => ({ ...prev, status: 'error' }));
            toast.error(`Validation stopped due to repeated errors.`);
          }
          queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
          return;
        }
        
        // Brief pause before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // User stopped the validation or component unmounted
    if (isMountedRef.current) {
      setProgress(prev => ({ ...prev, status: 'idle' }));
      toast.info('Validation stopped.');
    }
    queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
  }, [queryClient]);

  const startValidation = useCallback(async () => {
    if (isRunningRef.current) return;

    // Get total count of unvalidated contacts
    const { count: totalUnvalidated, error: countError } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .is('email_validation_result', null)
      .not('email', 'is', null);

    if (countError) {
      toast.error('Failed to count contacts: ' + countError.message);
      return;
    }

    if (!totalUnvalidated || totalUnvalidated === 0) {
      toast.info('No unvalidated contacts found');
      return;
    }

    const startTime = Date.now();
    isRunningRef.current = true;

    setProgress({
      status: 'running',
      processed: 0,
      total: totalUnvalidated,
      deliverable: 0,
      undeliverable: 0,
      catchAll: 0,
      unknown: 0,
      errors: 0,
      startTime,
      currentBatchStart: startTime,
      estimatedTimeRemaining: getInitialETA(totalUnvalidated),
      rate: 0,
    });

    toast.success(`Starting validation of ${totalUnvalidated.toLocaleString()} contacts...`);
    
    // Start the continuous validation loop
    runValidationLoop(totalUnvalidated);
  }, [runValidationLoop]);

  const stopValidation = useCallback(() => {
    isRunningRef.current = false;
    setProgress(prev => ({ ...prev, status: 'idle' }));
    toast.info('Stopping validation...');
    queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
  }, [queryClient]);

  const validationPercentage = stats ? Math.round((stats.validated / stats.total) * 100) : 0;
  const healthScore = stats
    ? Math.round(((stats.deliverable + stats.catchAll * 0.5) / Math.max(stats.validated, 1)) * 100)
    : 0;

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const isRunning = progress.status === 'running';
  const isActive = isRunning;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Health Report</h1>
          <p className="text-muted-foreground">
            Monitor and improve your email list quality
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isActive}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {!isActive && (
            <div className="flex items-center gap-2">
              <Button
                onClick={startValidation}
                disabled={stats?.unvalidated === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Validate All ({stats?.unvalidated?.toLocaleString() || 0})
              </Button>
              {stats?.unvalidated && stats.unvalidated > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{getInitialETA(stats.unvalidated)}</span>
                      <Info className="h-4 w-4 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Why does this take so long?</p>
                    <p className="text-sm">
                      To protect your Mailgun account from rate limiting, we validate emails 
                      at a controlled pace: {CONCURRENT_REQUESTS} concurrent requests with 
                      {DELAY_BETWEEN_BATCHES_MS}ms delays between batches. This ensures 
                      reliable results without hitting API limits.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {isRunning && (
            <Button variant="outline" onClick={stopValidation}>
              <Square className="h-4 w-4 mr-2" />
              Stop Validation
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertOctagon className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Failed to load statistics</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred while fetching contact health data.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress Panel during validation */}
      {isActive && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isRunning ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Pause className="h-5 w-5 text-yellow-600" />
                )}
                {isRunning ? 'Validating Emails...' : 'Validation Paused'}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>ETA: {progress.estimatedTimeRemaining}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Processing at ~{progress.rate.toFixed(1)} emails/sec. 
                        Rate limited to {CONCURRENT_REQUESTS} concurrent requests 
                        to avoid Mailgun API limits.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Badge variant="outline">
                  {progress.rate.toFixed(1)} emails/sec
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
                  {' '}({Math.round((progress.processed / progress.total) * 100)}%)
                </span>
              </div>
              <Progress value={(progress.processed / progress.total) * 100} className="h-3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-green-600">{progress.deliverable}</p>
                <p className="text-xs text-muted-foreground">Deliverable</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-red-600">{progress.undeliverable}</p>
                <p className="text-xs text-muted-foreground">Undeliverable</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-yellow-600">{progress.catchAll}</p>
                <p className="text-xs text-muted-foreground">Risky</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-gray-600">{progress.unknown}</p>
                <p className="text-xs text-muted-foreground">Unknown</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-orange-600">{progress.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Results */}
      {progress.status === 'completed' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Validation Complete
            </CardTitle>
            <CardDescription>
              Processed {progress.processed.toLocaleString()} emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{progress.deliverable}</p>
                <p className="text-sm text-muted-foreground">Deliverable</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{progress.undeliverable}</p>
                <p className="text-sm text-muted-foreground">Undeliverable</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{progress.catchAll}</p>
                <p className="text-sm text-muted-foreground">Risky</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{progress.unknown}</p>
                <p className="text-sm text-muted-foreground">Unknown</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{progress.errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total?.toLocaleString() || '—'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.validated?.toLocaleString() || 0} validated ({validationPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {stats?.validated ? `${healthScore}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.validated ? getHealthScoreLabel(healthScore) : 'No validated contacts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unvalidated</CardTitle>
            <AlertOctagon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.unvalidated?.toLocaleString() || '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Contacts pending validation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Results Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Validation Results
            </CardTitle>
            <CardDescription>Breakdown by email deliverability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Deliverable</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.deliverable?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {stats?.validated ? Math.round((stats.deliverable / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Undeliverable</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.undeliverable?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {stats?.validated ? Math.round((stats.undeliverable / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Catch-All</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.catchAll?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {stats?.validated ? Math.round((stats.catchAll / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Do Not Send</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.doNotSend?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {stats?.validated ? Math.round((stats.doNotSend / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Unknown</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.unknown?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    {stats?.validated ? Math.round((stats.unknown / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>Breakdown by risk level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Low Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.lowRisk?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {stats?.validated ? Math.round((stats.lowRisk / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.mediumRisk?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {stats?.validated ? Math.round((stats.mediumRisk / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">High Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.highRisk?.toLocaleString() || 0}</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {stats?.validated ? Math.round((stats.highRisk / stats.validated) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Validation Coverage</h4>
              <Progress value={validationPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {validationPercentage}% of contacts have been validated
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
