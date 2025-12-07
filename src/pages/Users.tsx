import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

const USER_TYPES = [
  'Super Admin',
  'Admin',
  'Management',
  'Author Success Coach',
  'Account Executive',
] as const;

type UserType = typeof USER_TYPES[number];

interface InternalUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  work_phone: string;
  title: UserType;
}

// Mock data for internal users
const mockUsers: InternalUser[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@authorservices.com',
    mobile_phone: '(555) 123-4567',
    work_phone: '(555) 987-6543',
    title: 'Super Admin',
  },
  {
    id: '2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@authorservices.com',
    mobile_phone: '(555) 234-5678',
    work_phone: '(555) 876-5432',
    title: 'Admin',
  },
  {
    id: '3',
    first_name: 'Mike',
    last_name: 'Williams',
    email: 'mike.williams@authorservices.com',
    mobile_phone: '(555) 345-6789',
    work_phone: '(555) 765-4321',
    title: 'Management',
  },
  {
    id: '4',
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.davis@authorservices.com',
    mobile_phone: '(555) 456-7890',
    work_phone: '(555) 654-3210',
    title: 'Author Success Coach',
  },
  {
    id: '5',
    first_name: 'David',
    last_name: 'Brown',
    email: 'david.brown@authorservices.com',
    mobile_phone: '(555) 567-8901',
    work_phone: '(555) 543-2109',
    title: 'Account Executive',
  },
];

const getTitleBadgeVariant = (title: UserType): 'default' | 'secondary' | 'outline' => {
  switch (title) {
    case 'Super Admin':
      return 'default';
    case 'Admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState<InternalUser[]>(mockUsers);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile_phone: '',
    work_phone: '',
    title: '' as UserType | '',
  });

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.title.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenSheet = (user?: InternalUser) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        mobile_phone: user.mobile_phone,
        work_phone: user.work_phone,
        title: user.title,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        mobile_phone: '',
        work_phone: '',
        title: '',
      });
    }
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      mobile_phone: '',
      work_phone: '',
      title: '',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage internal team members and their roles
            </p>
          </div>
          <Button onClick={() => handleOpenSheet()}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile Phone</TableHead>
                <TableHead>Work Phone</TableHead>
                <TableHead>Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenSheet(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(user.first_name, user.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.mobile_phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.work_phone}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTitleBadgeVariant(user.title)}>
                      {user.title}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>
              {selectedUser ? 'Edit User' : 'Add User'}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseSheet}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john.smith@authorservices.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_phone">Mobile Phone</Label>
              <Input
                id="mobile_phone"
                value={formData.mobile_phone}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_phone">Work Phone</Label>
              <Input
                id="work_phone"
                value={formData.work_phone}
                onChange={(e) =>
                  setFormData({ ...formData, work_phone: e.target.value })
                }
                placeholder="(555) 987-6543"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Select
                value={formData.title}
                onValueChange={(value: UserType) =>
                  setFormData({ ...formData, title: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a title" />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseSheet}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button className="flex-1">
                {selectedUser ? 'Save Changes' : 'Add User'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
