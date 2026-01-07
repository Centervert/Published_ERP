import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

export default function ContactHealth() {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ processed: 0, total: 0 });
  const [validationResults, setValidationResults] = useState<{
    deliverable: number;
    undeliverable: number;
    catchAll: number;
    unknown: number;
    errors: number;
  } | null>(null);

  // Fetch validation statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['contact-health-stats'],
    queryFn: async (): Promise<ValidationStats> => {
      // Get total count
      const { count: total } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Get validated count
      const { count: validated } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('email_validation_result', 'is', null);

      // Get counts by validation result
      const { data: resultCounts } = await supabase
        .from('contacts')
        .select('email_validation_result')
        .not('email_validation_result', 'is', null);

      const deliverable = resultCounts?.filter(c => c.email_validation_result === 'deliverable').length || 0;
      const undeliverable = resultCounts?.filter(c => c.email_validation_result === 'undeliverable').length || 0;
      const catchAll = resultCounts?.filter(c => c.email_validation_result === 'catch_all').length || 0;
      const doNotSend = resultCounts?.filter(c => c.email_validation_result === 'do_not_send').length || 0;
      const unknown = resultCounts?.filter(c => c.email_validation_result === 'unknown').length || 0;

      // Get counts by risk level
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

  // Validate all unvalidated contacts
  const validateAllMutation = useMutation({
    mutationFn: async () => {
      setIsValidating(true);
      setValidationResults(null);

      // Get all unvalidated contact IDs
      const { data: unvalidatedContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id')
        .is('email_validation_result', null)
        .not('email', 'is', null);

      if (fetchError) throw fetchError;
      if (!unvalidatedContacts || unvalidatedContacts.length === 0) {
        return { message: 'No unvalidated contacts found' };
      }

      const contactIds = unvalidatedContacts.map(c => c.id);
      setValidationProgress({ processed: 0, total: contactIds.length });

      // Process in batches of 100
      const batchSize = 100;
      let totalDeliverable = 0;
      let totalUndeliverable = 0;
      let totalCatchAll = 0;
      let totalUnknown = 0;
      let totalErrors = 0;

      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batch = contactIds.slice(i, i + batchSize);
        
        const { data, error } = await supabase.functions.invoke('validate-email-batch', {
          body: { contactIds: batch },
        });

        if (error) {
          console.error('Batch validation error:', error);
          totalErrors += batch.length;
        } else if (data?.results) {
          totalDeliverable += data.results.deliverable || 0;
          totalUndeliverable += data.results.undeliverable || 0;
          totalCatchAll += data.results.catch_all || 0;
          totalUnknown += data.results.unknown || 0;
          totalErrors += data.results.errors || 0;
        }

        setValidationProgress({ processed: Math.min(i + batchSize, contactIds.length), total: contactIds.length });
      }

      return {
        deliverable: totalDeliverable,
        undeliverable: totalUndeliverable,
        catchAll: totalCatchAll,
        unknown: totalUnknown,
        errors: totalErrors,
      };
    },
    onSuccess: (data) => {
      setIsValidating(false);
      if ('message' in data) {
        toast.info(data.message);
      } else {
        setValidationResults(data);
        toast.success('Email validation complete!');
      }
      queryClient.invalidateQueries({ queryKey: ['contact-health-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      setIsValidating(false);
      toast.error('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

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
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => validateAllMutation.mutate()}
            disabled={isValidating || stats?.unvalidated === 0}
          >
            {isValidating ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Validating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Validate All ({stats?.unvalidated || 0})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar during validation */}
      {isValidating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validating emails...</span>
                <span>
                  {validationProgress.processed} / {validationProgress.total}
                </span>
              </div>
              <Progress
                value={(validationProgress.processed / validationProgress.total) * 100}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResults && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Validation Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{validationResults.deliverable}</p>
                <p className="text-sm text-muted-foreground">Deliverable</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{validationResults.undeliverable}</p>
                <p className="text-sm text-muted-foreground">Undeliverable</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{validationResults.catchAll}</p>
                <p className="text-sm text-muted-foreground">Catch-All</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{validationResults.unknown}</p>
                <p className="text-sm text-muted-foreground">Unknown</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{validationResults.errors}</p>
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
