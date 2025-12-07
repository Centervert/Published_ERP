import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload } from 'lucide-react';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { CreateContactSheet } from '@/components/contacts/CreateContactSheet';
import { ImportCSVDialog } from '@/components/contacts/ImportCSVDialog';
import { ListsManager } from '@/components/contacts/ListsManager';
import { TagsManager } from '@/components/contacts/TagsManager';

export default function Contacts() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your email subscribers and contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">All Contacts</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <ContactsTable />
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
