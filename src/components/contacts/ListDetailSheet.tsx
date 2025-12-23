import { useState, useMemo } from 'react';
import { useLists, useListContacts, useContacts, List } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, UserPlus, Save, Users } from 'lucide-react';

interface ListDetailSheetProps {
  list: List | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListDetailSheet({ list, open, onOpenChange }: ListDetailSheetProps) {
  const { updateList } = useLists();
  const { contacts: listContacts, isLoading: loadingContacts, removeContactFromList, addContactToList } = useListContacts(list?.id || null);
  const { contacts: allContacts } = useContacts();
  
  const [name, setName] = useState(list?.name || '');
  const [description, setDescription] = useState(list?.description || '');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Reset form when list changes
  useState(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
    }
  });

  // Get contacts not already in the list
  const availableContacts = useMemo(() => {
    const listContactIds = new Set(listContacts.map(c => c.id));
    return allContacts.filter(c => !listContactIds.has(c.id));
  }, [allContacts, listContacts]);

  // Filter available contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchValue.trim()) return availableContacts.slice(0, 50);
    const lower = searchValue.toLowerCase();
    return availableContacts.filter(c => 
      c.email.toLowerCase().includes(lower) ||
      (c.first_name && c.first_name.toLowerCase().includes(lower)) ||
      (c.last_name && c.last_name.toLowerCase().includes(lower))
    ).slice(0, 50);
  }, [availableContacts, searchValue]);

  const handleSave = async () => {
    if (!list || !name.trim()) return;
    await updateList.mutateAsync({ id: list.id, name: name.trim(), description: description.trim() || undefined });
  };

  const handleAddContact = async (contactId: string) => {
    if (!list) return;
    await addContactToList.mutateAsync({ listId: list.id, contactId });
    setAddContactOpen(false);
    setSearchValue('');
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!list) return;
    await removeContactFromList.mutateAsync({ listId: list.id, contactId });
  };

  const hasChanges = list && (name !== list.name || (description || '') !== (list.description || ''));

  if (!list) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit List</SheetTitle>
          <SheetDescription>
            Update list details and manage contacts
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* List Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="List name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={updateList.isPending} size="sm">
                {updateList.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            )}
          </div>

          {/* Contacts in List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Contacts ({listContacts.length})</span>
              </div>
              <Popover open={addContactOpen} onOpenChange={setAddContactOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command>
                    <CommandInput 
                      placeholder="Search contacts..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No contacts found</CommandEmpty>
                      <CommandGroup>
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.email}
                            onSelect={() => handleAddContact(contact.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {contact.first_name || contact.last_name 
                                  ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                                  : contact.email}
                              </span>
                              {(contact.first_name || contact.last_name) && (
                                <span className="text-xs text-muted-foreground">{contact.email}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              {loadingContacts ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : listContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Users className="h-6 w-6 mb-2" />
                  <p className="text-sm">No contacts in this list</p>
                </div>
              ) : (
                <div className="divide-y">
                  {listContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {contact.first_name || contact.last_name 
                            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                            : contact.email}
                        </p>
                        {(contact.first_name || contact.last_name) && (
                          <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveContact(contact.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
