import { Contact } from '@/hooks/useContacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  Sparkles, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Plus,
  Building2,
  Briefcase
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';

interface ContactSummaryPanelProps {
  contact: Contact;
}

export function ContactSummaryPanel({ contact }: ContactSummaryPanelProps) {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [companiesOpen, setCompaniesOpen] = useState(true);
  const [dealsOpen, setDealsOpen] = useState(true);

  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'this contact';

  return (
    <div className="flex flex-col h-full">
      {/* AI Summary Section */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 border-b hover:bg-muted/50 text-left">
          <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />
          <span className="font-medium text-sm">Contact summary</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Contact summary
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                    <Sparkles className="h-3 w-3 mr-0.5" />
                    AI
                  </Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Generated {format(new Date(), 'MMM d, yyyy')}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                {contact.first_name ? `${contact.first_name} is a ` : 'This is a '}
                {contact.contact_type || 'lead'} contact 
                {contact.created_at && ` added on ${format(parseISO(contact.created_at), 'MMMM d, yyyy')}`}.
                {contact.notes ? ` Notes: ${contact.notes.slice(0, 100)}...` : ' No additional notes recorded.'}
              </p>
              
              <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-3 text-primary border-primary/30">
                <Sparkles className="h-4 w-4 mr-2" />
                Ask a question
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Companies Section */}
      <Collapsible open={companiesOpen} onOpenChange={setCompaniesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-b hover:bg-muted/50 text-left">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${companiesOpen ? '' : '-rotate-90'}`} />
            <span className="font-medium text-sm">Companies (0)</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-primary text-xs px-2">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No companies associated</p>
            <Button variant="link" size="sm" className="text-primary mt-1">
              Associate a company
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Deals Section */}
      <Collapsible open={dealsOpen} onOpenChange={setDealsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 border-b hover:bg-muted/50 text-left">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${dealsOpen ? '' : '-rotate-90'}`} />
            <span className="font-medium text-sm">Deals (0)</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-primary text-xs px-2">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Track the revenue opportunities associated with {displayName}.
            </p>
            <Button variant="link" size="sm" className="text-primary mt-1">
              Create a deal
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
