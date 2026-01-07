import { useState, useRef, useCallback } from 'react';
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

export default function ContactHealth() {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  
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

  // Fetch validation statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['contact-health-stats'],
    queryFn: async (): Promise<ValidationStats> => {
      const { count: total } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      const { count: validated } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('email_validation_result', 'is', null);

      const { data: resultCounts } = await supabase
        .from('contacts')
        .select('email_validation_result')
        .not('email_validation_result', 'is', null);

      const deliverable = resultCounts?.filter(c => c.email_validation_result === 'deliverable').length || 0;
      const undeliverable = resultCounts?.filter(c => c.email_validation_result === 'undeliverable').length || 0;
      const catchAll = resultCounts?.filter(c => c.email_validation_result === 'catch_all').length || 0;
      const doNotSend = resultCounts?.filter(c => c.email_validation_result === 'do_not_send').length || 0;
      const unknown = resultCounts?.filter(c => c.email_validation_result === 'unknown').length || 0;

      const { data: riskCounts } = await supabase
        .from('contacts')
        .select('email_validation_risk')
        .not('email_validation_risk', 'is', null);

      const lowRisk = riskCounts?.filter(c => c.email_validation_risk === 'low').length || 0;
      const mediumRisk = riskCounts?.filter(c => c.email_validation_risk === 'medium').length || 0;
      const highRisk = riskCounts?.filter(c => c.email_validation_risk === 'high').length || 0;

      return {
        total: total || 0,
        validated: validated || 0,
        unvalidated: (total || 0) - (validated || 0),
        deliverable,
        undeliverable,
        catchAll,
        doNotSend,
        unknown,
        lowRisk,
        mediumRisk,
        highRisk,
      };
    },
  });

  const formatTime = (ms: number): string => {
    if (ms < 0) return 'Calculating...';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `~${days}d ${hours % 24}h`;
    if (hours > 0) return `~${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `~${minutes}m ${seconds % 60}s`;
    return `~${seconds}s`;
  };

  const calculateETA = (processed: number, total: number, startTime: number): string => {
    if (processed === 0) return 'Calculating...';
    const elapsed = Date.now() - startTime;
    const rate = processed / (elapsed / 1000); // emails per second
    const remaining = total - processed;
    const estimatedMs = (remaining / rate) * 1000;
    return formatTime(estimatedMs);
  };

  const getInitialETA = (count: number): string => {
    // Estimate based on: 5 concurrent, ~0.8s per email + 200ms delay per batch
    const batches = Math.ceil(count / CONCURRENT_REQUESTS);
    const estimatedMs = (count * ESTIMATED_EMAIL_TIME_MS) + (batches * DELAY_BETWEEN_BATCHES_MS);
    return formatTime(estimatedMs);
  };

  const startValidation = useCallback(async () => {
    isPausedRef.current = false;
    abortControllerRef.current = new AbortController();

    // Get all unvalidated contact IDs
    const { data: unvalidatedContacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id')
      .is('email_validation_result', null)
      .not('email', 'is', null);

    if (fetchError) {
      toast.error('Failed to fetch contacts: ' + fetchError.message);
      return;
    }

    if (!unvalidatedContacts || unvalidatedContacts.length === 0) {
      toast.info('No unvalidated contacts found');
      return;
    }

    const contactIds = unvalidatedContacts.map(c => c.id);
    const startTime = Date.now();

    setProgress({
      status: 'running',
      processed: 0,
      total: contactIds.length,
      deliverable: 0,
      undeliverable: 0,
      catchAll: 0,
      unknown: 0,
      errors: 0,
      startTime,
      currentBatchStart: startTime,
      estimatedTimeRemaining: getInitialETA(contactIds.length),
      rate: 0,
    });

    let processed = 0;
    let deliverable = 0;
    let undeliverable = 0;
    let catchAll = 0;
    let unknown = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < contactIds.length; i += EMAILS_PER_BATCH) {
      // Check if paused or aborted
      if (isPausedRef.current) {
        setProgress(prev => ({ ...prev, status: 'paused' }));
        return;
      }

      if (abortControllerRef.current?.signal.aborted) {
        setProgress(prev => ({ ...prev, status: 'idle' }));
        return;
      }

      const batch = contactIds.slice(i, i + EMAILS_PER_BATCH);
      
      try {
        const { data, error } = await supabase.functions.invoke('validate-email-batch', {
          body: { contactIds: batch },
        });

        if (error) {
          console.error('Batch validation error:', error);
          errors += batch.length;
        } else if (data?.results) {
          deliverable += data.results.deliverable || 0;
          undeliverable += data.results.undeliverable || 0;
          catchAll += data.results.risky || 0; // risky often includes catch-all
          unknown += data.results.unknown || 0;
          errors += data.results.failed || 0;
        }

        processed += batch.length;
        const elapsed = Date.now() - startTime;
        const rate = processed / (elapsed / 1000);

        setProgress({
          status: 'running',
          processed,
          total: contactIds.length,
          deliverable,
          undeliverable,
          catchAll,
          unknown,
          errors,
          startTime,
          currentBatchStart: Date.now(),
          estimatedTimeRemaining: calculateETA(processed, contactIds.length, startTime),
          rate,
        });

        // Refresh stats every 10 batches
        if (i % (EMAILS_PER_BATCH * 10) === 0) {
          queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
        }
      } catch (err) {
        console.error('Batch error:', err);
        errors += batch.length;
        processed += batch.length;
      }
    }

    setProgress(prev => ({
      ...prev,
      status: 'completed',
      processed,
    }));

    toast.success(`Validation complete! ${processed} emails processed.`);
    queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient]);

  const pauseValidation = useCallback(() => {
    isPausedRef.current = true;
    setProgress(prev => ({ ...prev, status: 'paused' }));
    toast.info('Validation paused. Click Resume to continue.');
  }, []);

  const resumeValidation = useCallback(async () => {
    isPausedRef.current = false;
    setProgress(prev => ({ ...prev, status: 'running' }));
    
    // Continue from where we left off
    const { data: unvalidatedContacts } = await supabase
      .from('contacts')
      .select('id')
      .is('email_validation_result', null)
      .not('email', 'is', null);

    if (!unvalidatedContacts || unvalidatedContacts.length === 0) {
      setProgress(prev => ({ ...prev, status: 'completed' }));
      toast.success('All contacts have been validated!');
      return;
    }

    // Update total to remaining
    setProgress(prev => ({
      ...prev,
      total: prev.processed + unvalidatedContacts.length,
      startTime: Date.now() - ((prev.processed / prev.rate) * 1000 || 0),
    }));

    startValidation();
  }, [startValidation]);

  const stopValidation = useCallback(() => {
    abortControllerRef.current?.abort();
    isPausedRef.current = false;
    setProgress(prev => ({ ...prev, status: 'idle' }));
    toast.info('Validation stopped.');
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
  const isPaused = progress.status === 'paused';
  const isActive = isRunning || isPaused;

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
            <>
              <Button variant="outline" onClick={pauseValidation}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="destructive" onClick={stopValidation}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button onClick={resumeValidation}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button variant="destructive" onClick={stopValidation}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

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
