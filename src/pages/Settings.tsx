import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalBounced: number;
    inserted: number;
    matchedContacts: number;
  } | null>(null);

  const handleImportBounces = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('import-bounce-events', {
        body: { csvData: text }
      });

      if (error) throw error;

      setImportResult(data);
      toast.success(`Imported ${data.inserted} bounce events`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import bounce events');
    } finally {
      setIsImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
            />
          </div>
          <Button disabled>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>
            Configure your default sending settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-name">Default From Name</Label>
            <Input
              id="from-name"
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-email">Default From Email</Label>
            <Input
              id="from-email"
              type="email"
              placeholder="hello@yourcompany.com"
            />
          </div>
          <Button disabled>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Bounce Events</CardTitle>
          <CardDescription>
            Import bounce data from Resend CSV export. This will extract bounced emails and add them to your email events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="bounce-csv" className="cursor-pointer">
              <Button asChild disabled={isImporting}>
                <span>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resend CSV
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <Input
              id="bounce-csv"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportBounces}
              disabled={isImporting}
            />
          </div>
          
          {importResult && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <p className="font-medium">Import Complete</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Bounced</p>
                  <p className="font-semibold text-lg">{importResult.totalBounced}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">New Records Added</p>
                  <p className="font-semibold text-lg text-green-600">{importResult.inserted}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Matched Contacts</p>
                  <p className="font-semibold text-lg">{importResult.matchedContacts}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
