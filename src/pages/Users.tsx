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
import { Search, X, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useUsers, ROLE_DISPLAY_NAMES, AppRole, useHasRole } from '@/hooks/useUsers';

const ROLE_OPTIONS: AppRole[] = ['super_admin', 'admin', 'asc', 'ae', 'member'];

const getRoleBadgeVariant = (role: AppRole): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'super_admin':
      return 'default';
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    title: '',
    role: '' as AppRole | '',
  });

  const { users, isLoading, updateUserRole, updateUserProfile } = useUsers();
  const { hasRole: canManageRoles, currentRole } = useHasRole(['super_admin', 'admin']);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = user.full_name || '';
    const email = user.email || '';
    const roleDisplay = ROLE_DISPLAY_NAMES[user.role] || '';
    
    return (
      fullName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      roleDisplay.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenSheet = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUserId(userId);
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        title: user.title || '',
        role: user.role,
      });
      setIsSheetOpen(true);
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedUserId(null);
    setFormData({
      full_name: '',
      phone: '',
      title: '',
      role: '',
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    // Update profile info
    await updateUserProfile.mutateAsync({
      userId: selectedUserId,
      updates: {
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        title: formData.title || undefined,
      },
    });

    // Update role if changed and user has permission
    const currentUser = users.find((u) => u.id === selectedUserId);
    if (formData.role && formData.role !== currentUser?.role && canManageRoles) {
      // Super admin can assign any role, admin can only assign non-super_admin roles
      const canAssignThisRole = 
        currentRole === 'super_admin' || 
        (currentRole === 'admin' && formData.role !== 'super_admin');
      
      if (canAssignThisRole) {
        await updateUserRole.mutateAsync({
          userId: selectedUserId,
          role: formData.role,
        });
      }
    }

    handleCloseSheet();
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return '??';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Determine which roles the current user can assign
  const getAssignableRoles = (): AppRole[] => {
    if (currentRole === 'super_admin') {
      return ROLE_OPTIONS;
    }
    if (currentRole === 'admin') {
      return ROLE_OPTIONS.filter((r) => r !== 'super_admin');
    }
    return [];
  };

  const assignableRoles = getAssignableRoles();

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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenSheet(user.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.full_name || 'No name'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.title || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {ROLE_DISPLAY_NAMES[user.role]}
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
          )}
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Edit User</SheetTitle>
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
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Senior Author Success Coach"
              />
            </div>

            {canManageRoles && assignableRoles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: AppRole) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_DISPLAY_NAMES[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentRole === 'super_admin' 
                    ? 'As Super Admin, you can assign any role.'
                    : 'As Admin, you can assign roles except Super Admin.'}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseSheet}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSave}
                disabled={updateUserProfile.isPending || updateUserRole.isPending}
              >
                {(updateUserProfile.isPending || updateUserRole.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
