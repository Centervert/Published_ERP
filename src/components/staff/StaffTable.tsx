import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StaffWithUser, useStaff } from '@/hooks/useStaff';
import { useUsers, useHasRole, ROLE_DISPLAY_NAMES, AppRole } from '@/hooks/useUsers';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, Plus, MoreHorizontal, Link2, Unlink, UserCheck, UserX, Mail, ChevronDown } from 'lucide-react';
import { StaffForm } from './StaffForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const ROLE_OPTIONS: AppRole[] = ['super_admin', 'admin', 'asc', 'ae', 'marketing', 'member'];
const emailSchema = z.string().email('Please enter a valid email address');

interface StaffTableProps {
  onInvite?: (email: string, fullName: string) => void;
}

export function StaffTable({ onInvite }: StaffTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithUser | null>(null);
  const [linkingStaff, setLinkingStaff] = useState<StaffWithUser | null>(null);
  
  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: '',
    role: 'member' as AppRole,
  });

  const queryClient = useQueryClient();
  const { staff, isLoading, toggleActive, linkStaffToUser } = useStaff();
  const { users, updateUserRole } = useUsers();
  const { hasRole: canManage } = useHasRole(['super_admin', 'admin']);
  const { hasRole: canManagePortal, currentRole } = useHasRole(['super_admin']);

  // Get unique departments from staff
  const departments = useMemo(() => {
    const depts = new Set<string>();
    staff.forEach(s => {
      if (s.department) depts.add(s.department);
    });
    return Array.from(depts).sort();
  }, [staff]);

  // Get assignable roles based on current user's role
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

  const filteredStaff = staff.filter((s) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      s.full_name.toLowerCase().includes(searchLower) ||
      s.email.toLowerCase().includes(searchLower) ||
      (s.title && s.title.toLowerCase().includes(searchLower));
    
    const matchesDepartment = departmentFilter === 'all' || s.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
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

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      await updateUserRole.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleOpenInvite = (staffMember: StaffWithUser) => {
    setInviteData({
      email: staffMember.email,
      fullName: staffMember.full_name,
      role: 'member',
    });
    setIsInviteDialogOpen(true);
  };

  const handleInviteUser = async () => {
    try {
      emailSchema.parse(inviteData.email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsInviting(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteData.email,
          fullName: inviteData.fullName,
          role: inviteData.role,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`Invitation sent to ${inviteData.email}`);
      setIsInviteDialogOpen(false);
      setInviteData({ email: '', fullName: '', role: 'member' });
      // Refetch staff data to show the linked user
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  // Get users that are not already linked to any staff member
  const availableUsers = users.filter(
    (u) => !staff.some((s) => s.user_id === u.id && s.id !== linkingStaff?.id)
  );

  const cellBorderClass = "border-r border-border/50";

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
        
        {departments.length > 0 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
                <TableHead className={`whitespace-nowrap ${cellBorderClass}`}>Name</TableHead>
                <TableHead className={`whitespace-nowrap ${cellBorderClass}`}>Email</TableHead>
                <TableHead className={`whitespace-nowrap ${cellBorderClass}`}>Phone</TableHead>
                <TableHead className={`whitespace-nowrap ${cellBorderClass}`}>Title</TableHead>
                <TableHead className="whitespace-nowrap">Portal Access</TableHead>
                {canManage && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className={`whitespace-nowrap ${cellBorderClass}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(staffMember.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{staffMember.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-muted-foreground whitespace-nowrap ${cellBorderClass}`}>
                    {staffMember.email}
                  </TableCell>
                  <TableCell className={`text-muted-foreground whitespace-nowrap ${cellBorderClass}`}>
                    {staffMember.phone || '—'}
                  </TableCell>
                  <TableCell className={`text-muted-foreground whitespace-nowrap ${cellBorderClass}`}>
                    {staffMember.title || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {staffMember.user_id && staffMember.linked_user ? (
                      canManagePortal ? (
                        <Select
                          value={staffMember.linked_user.role || 'member'}
                          onValueChange={(value: AppRole) => handleRoleChange(staffMember.user_id!, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_DISPLAY_NAMES[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">
                          {ROLE_DISPLAY_NAMES[staffMember.linked_user.role as keyof typeof ROLE_DISPLAY_NAMES] || staffMember.linked_user.role}
                        </span>
                      )
                    ) : (
                      canManagePortal ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleOpenInvite(staffMember)}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Send Invite
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No access</span>
                      )
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
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

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Portal</DialogTitle>
            <DialogDescription>
              Send an email invitation to give this staff member portal access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteData.email}
                onChange={(e) =>
                  setInviteData({ ...inviteData, email: e.target.value })
                }
                placeholder="staff@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                value={inviteData.fullName}
                onChange={(e) =>
                  setInviteData({ ...inviteData, fullName: e.target.value })
                }
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value: AppRole) =>
                  setInviteData({ ...inviteData, role: value })
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
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={isInviting || !inviteData.email}>
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
