import { useState, useMemo } from 'react';
import { Check, ChevronDown, Info, AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipientSummary } from './RecipientSummary';
import { 
  useRecipientHealthCounts, 
  EmailQualityFilter, 
  RecipientHealthCounts,
  getSendableCount 
} from '@/hooks/useRecipientHealthCounts';

interface List {
  id: string;
  name: string;
}

interface Imprint {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

interface RecipientSelectorProps {
  lists: List[];
  imprints: Imprint[];
  selectedListIds: string[];
  selectedImprintIds: string[];
  qualityFilter: EmailQualityFilter;
  onListChange: (listIds: string[]) => void;
  onImprintChange: (imprintIds: string[]) => void;
  onQualityFilterChange: (filter: EmailQualityFilter) => void;
  onConfirm: () => void;
}

type AudienceSource = 'all' | 'lists' | 'imprints';

export function RecipientSelector({
  lists,
  imprints,
  selectedListIds,
  selectedImprintIds,
  qualityFilter,
  onListChange,
  onImprintChange,
  onQualityFilterChange,
  onConfirm,
}: RecipientSelectorProps) {
  const { data: healthCounts, isLoading } = useRecipientHealthCounts();
  const [audienceSource, setAudienceSource] = useState<AudienceSource>(
    selectedListIds.length > 0 ? 'lists' : selectedImprintIds.length > 0 ? 'imprints' : 'all'
  );

  // Calculate totals based on selection
  const selectedCounts = useMemo(() => {
    if (!healthCounts) {
      return { sendable: 0, notValidated: 0, excluded: 0 };
    }

    if (audienceSource === 'all') {
      return healthCounts.total;
    }

    if (audienceSource === 'lists' && selectedListIds.length > 0) {
      return selectedListIds.reduce(
        (acc, listId) => {
          const counts = healthCounts.byList[listId] || { sendable: 0, notValidated: 0, excluded: 0 };
          return {
            sendable: acc.sendable + counts.sendable,
            notValidated: acc.notValidated + counts.notValidated,
            excluded: acc.excluded + counts.excluded,
          };
        },
        { sendable: 0, notValidated: 0, excluded: 0 }
      );
    }

    if (audienceSource === 'imprints' && selectedImprintIds.length > 0) {
      return selectedImprintIds.reduce(
        (acc, imprintId) => {
          const counts = healthCounts.byImprint[imprintId] || { sendable: 0, notValidated: 0, excluded: 0 };
          return {
            sendable: acc.sendable + counts.sendable,
            notValidated: acc.notValidated + counts.notValidated,
            excluded: acc.excluded + counts.excluded,
          };
        },
        { sendable: 0, notValidated: 0, excluded: 0 }
      );
    }

    return { sendable: 0, notValidated: 0, excluded: 0 };
  }, [healthCounts, audienceSource, selectedListIds, selectedImprintIds]);

  const handleAudienceSourceChange = (value: AudienceSource) => {
    setAudienceSource(value);
    if (value === 'all') {
      onListChange([]);
      onImprintChange([]);
    } else if (value === 'lists') {
      onImprintChange([]);
    } else if (value === 'imprints') {
      onListChange([]);
    }
  };

  const toggleList = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      onListChange(selectedListIds.filter(id => id !== listId));
    } else {
      onListChange([...selectedListIds, listId]);
    }
  };

  const toggleImprint = (imprintId: string) => {
    if (selectedImprintIds.includes(imprintId)) {
      onImprintChange(selectedImprintIds.filter(id => id !== imprintId));
    } else {
      onImprintChange([...selectedImprintIds, imprintId]);
    }
  };

  const qualityFilterOptions: { value: EmailQualityFilter; label: string; description: string; icon: React.ReactNode; warning?: string }[] = [
    {
      value: 'validated_only',
      label: 'Validated only',
      description: 'Only send to verified deliverable emails',
      icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
    },
    {
      value: 'include_unvalidated',
      label: 'Validated + Unvalidated',
      description: 'Include contacts pending validation',
      icon: <Shield className="h-4 w-4 text-amber-600" />,
      warning: 'Higher bounce risk',
    },
    {
      value: 'include_risky',
      label: 'Include risky emails',
      description: 'Include catch-all and unknown results',
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
      warning: 'May harm sender reputation',
    },
  ];

  const currentQualityOption = qualityFilterOptions.find(o => o.value === qualityFilter)!;

  return (
    <div className="space-y-4 py-4">
      {/* Audience Source */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Audience Source</Label>
        <Select value={audienceSource} onValueChange={(v) => handleAudienceSourceChange(v as AudienceSource)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <span>All Contacts</span>
                {healthCounts && (
                  <Badge variant="secondary" className="text-xs">
                    {getSendableCount(healthCounts.total, qualityFilter).toLocaleString()} sendable
                  </Badge>
                )}
              </div>
            </SelectItem>
            {lists.length > 0 && (
              <SelectItem value="lists">
                <span>Select Lists...</span>
              </SelectItem>
            )}
            {imprints.length > 0 && (
              <SelectItem value="imprints">
                <span>Select Imprints...</span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* List Selection */}
      {audienceSource === 'lists' && lists.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Lists</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onListChange(selectedListIds.length === lists.length ? [] : lists.map(l => l.id))}
            >
              {selectedListIds.length === lists.length ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <ScrollArea className="h-48 rounded-md border">
            <div className="p-2 space-y-1">
              {lists.map((list) => {
                const counts = healthCounts?.byList[list.id] || { sendable: 0, notValidated: 0, excluded: 0 };
                const sendable = getSendableCount(counts, qualityFilter);
                const excluded = qualityFilter === 'validated_only' 
                  ? counts.excluded + counts.notValidated 
                  : counts.excluded;
                
                return (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleList(list.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedListIds.includes(list.id)}
                        onCheckedChange={() => toggleList(list.id)}
                      />
                      <span className="text-sm">{list.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 text-xs">
                        {sendable.toLocaleString()}
                      </Badge>
                      {excluded > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 text-xs">
                          {excluded.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Imprint Selection */}
      {audienceSource === 'imprints' && imprints.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Imprints</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onImprintChange(selectedImprintIds.length === imprints.length ? [] : imprints.map(i => i.id))}
            >
              {selectedImprintIds.length === imprints.length ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <ScrollArea className="h-48 rounded-md border">
            <div className="p-2 space-y-1">
              {imprints.map((imprint) => {
                const counts = healthCounts?.byImprint[imprint.id] || { sendable: 0, notValidated: 0, excluded: 0 };
                const sendable = getSendableCount(counts, qualityFilter);
                const excluded = qualityFilter === 'validated_only' 
                  ? counts.excluded + counts.notValidated 
                  : counts.excluded;
                
                return (
                  <div
                    key={imprint.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleImprint(imprint.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedImprintIds.includes(imprint.id)}
                        onCheckedChange={() => toggleImprint(imprint.id)}
                      />
                      <div className="flex items-center gap-2">
                        {imprint.logo_url ? (
                          <img src={imprint.logo_url} alt="" className="h-4 w-4 object-contain" />
                        ) : (
                          <div 
                            className="h-4 w-4 rounded text-[8px] text-white flex items-center justify-center font-bold"
                            style={{ backgroundColor: imprint.primary_color || '#6b7280' }}
                          >
                            {imprint.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm">{imprint.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 text-xs">
                        {sendable.toLocaleString()}
                      </Badge>
                      {excluded > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 text-xs">
                          {excluded.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Email Quality Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Email Quality Filter</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls which contacts are included based on email validation status. "Validated only" is recommended to maintain good deliverability.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                {currentQualityOption.icon}
                <span>{currentQualityOption.label}</span>
                {currentQualityOption.warning && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400">
                    {currentQualityOption.warning}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-1">
              {qualityFilterOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 ${qualityFilter === option.value ? 'bg-muted' : ''}`}
                  onClick={() => onQualityFilterChange(option.value)}
                >
                  <div className="mt-0.5">{option.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{option.label}</span>
                      {option.value === 'validated_only' && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    {option.warning && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {option.warning}
                      </p>
                    )}
                  </div>
                  {qualityFilter === option.value && (
                    <Check className="h-4 w-4 text-primary mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Recipient Summary */}
      {healthCounts && (
        <RecipientSummary
          sendable={selectedCounts.sendable}
          excluded={selectedCounts.excluded}
          notValidated={selectedCounts.notValidated}
          exclusionReasons={healthCounts.exclusionReasons}
          qualityFilter={qualityFilter}
        />
      )}

      {/* Warning for high unvalidated percentage */}
      {healthCounts && qualityFilter !== 'validated_only' && selectedCounts.notValidated > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {Math.round((selectedCounts.notValidated / (selectedCounts.sendable + selectedCounts.notValidated)) * 100)}% of recipients have not been validated
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                This may result in high bounce rates and could harm your sender reputation.
              </p>
            </div>
          </div>
        </div>
      )}

      <Button size="sm" onClick={onConfirm} className="w-full">
        Confirm Recipients
      </Button>
    </div>
  );
}
