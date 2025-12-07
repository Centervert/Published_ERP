import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload } from 'lucide-react';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { CreateContactSheet } from '@/components/contacts/CreateContactSheet';
import { ImportCSVDialog } from '@/components/contacts/ImportCSVDialog';
import { ListsManager } from '@/components/contacts/ListsManager';
import { TagsManager } from '@/components/contacts/TagsManager';
import { useAuth } from '@/contexts/AuthContext';

export default function Contacts() {
  const { user } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [contactTab, setContactTab] = useState<'all' | 'my'>('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Contact records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create contact
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="h-auto p-0 bg-transparent border-b rounded-none w-full justify-start gap-6">
          <TabsTrigger 
            value="contacts" 
            className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
          >
            Contacts
          </TabsTrigger>
          <TabsTrigger 
            value="lists"
            className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
          >
            Lists
          </TabsTrigger>
          <TabsTrigger 
            value="tags"
            className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
          >
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-6">
          {/* Contact Sub-tabs */}
          <Tabs value={contactTab} onValueChange={(v) => setContactTab(v as 'all' | 'my')}>
            <TabsList className="h-auto p-0 bg-transparent border-b-0 gap-4 mb-4">
              <TabsTrigger 
                value="all" 
                className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
              >
                All Contacts
              </TabsTrigger>
              <TabsTrigger 
                value="my"
                className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
              >
                My Contacts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <ContactsTable filterByUser={null} />
            </TabsContent>

            <TabsContent value="my" className="mt-0">
              <ContactsTable filterByUser={user?.id || null} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="lists">
          <ListsManager />
        </TabsContent>

        <TabsContent value="tags">
          <TagsManager />
        </TabsContent>
      </Tabs>

      <CreateContactSheet open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ImportCSVDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
