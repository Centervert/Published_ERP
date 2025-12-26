import { useState } from 'react';
import { StaffWithUser, useStaff } from '@/hooks/useStaff';
import { useUsers } from '@/hooks/useUsers';
import { useHasRole } from '@/hooks/useUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, Plus, MoreHorizontal, Link2, Unlink, UserCheck, UserX, Check, Minus } from 'lucide-react';
import { StaffForm } from './StaffForm';

export function StaffTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithUser | null>(null);
  const [linkingStaff, setLinkingStaff] = useState<StaffWithUser | null>(null);

  const { staff, isLoading, toggleActive, linkStaffToUser } = useStaff();
  const { users } = useUsers();
  const { hasRole: canManage } = useHasRole(['super_admin', 'admin']);

  const filteredStaff = staff.filter((s) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(searchLower) ||
      s.email.toLowerCase().includes(searchLower) ||
      (s.title && s.title.toLowerCase().includes(searchLower))
    );
  });

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const handleEdit = (staffMember: StaffWithUser) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStaff(null);
  };

  const handleLinkUser = async (staffId: string, userId: string) => {
    await linkStaffToUser.mutateAsync({ staffId, userId });
    setLinkingStaff(null);
  };

  const handleUnlinkUser = async (staffId: string) => {
    await linkStaffToUser.mutateAsync({ staffId, userId: null });
  };

  // Get users that are not already linked to any staff member
  const availableUsers = users.filter(
    (u) => !staff.some((s) => s.user_id === u.id && s.id !== linkingStaff?.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        )}
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
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Phone</TableHead>
                <TableHead className="whitespace-nowrap">Title</TableHead>
                <TableHead className="whitespace-nowrap">Portal</TableHead>
                {canManage && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(staffMember.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{staffMember.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {staffMember.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {staffMember.phone || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {staffMember.title || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            {staffMember.user_id ? (
                              staffMember.active !== false ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-amber-500" />
                              )
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {staffMember.user_id 
                            ? (staffMember.active !== false ? 'Active portal user' : 'Inactive portal user')
                            : 'No portal access'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {canManage && (
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(staffMember)}>
                            Edit
                          </DropdownMenuItem>
                          {staffMember.user_id ? (
                            <DropdownMenuItem onClick={() => handleUnlinkUser(staffMember.id)}>
                              <Unlink className="h-4 w-4 mr-2" />
                              Unlink User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setLinkingStaff(staffMember)}>
                              <Link2 className="h-4 w-4 mr-2" />
                              Link to User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleActive.mutateAsync({
                              id: staffMember.id,
                              active: !staffMember.active,
                            })}
                          >
                            {staffMember.active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredStaff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No staff members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Staff Form Sheet */}
      <StaffForm
        open={isFormOpen}
        onClose={handleCloseForm}
        staff={editingStaff}
      />

      {/* Link User Dialog */}
      {linkingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              Link {linkingStaff.full_name} to User Account
            </h3>
            <Select onValueChange={(userId) => handleLinkUser(linkingStaff.id, userId)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user account" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setLinkingStaff(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
