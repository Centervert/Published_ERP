import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Loader2, UserPlus, Mail } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useHasRole, ROLE_DISPLAY_NAMES, AppRole } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { StaffTable } from '@/components/staff/StaffTable';

const ROLE_OPTIONS: AppRole[] = ['super_admin', 'admin', 'asc', 'ae', 'marketing', 'member'];

const emailSchema = z.string().email('Please enter a valid email address');

export default function Staff() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: '',
    role: 'member' as AppRole,
  });

  const { hasRole: canManageRoles, currentRole } = useHasRole(['super_admin', 'admin']);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and portal access
            </p>
          </div>
          {canManageRoles && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>

        <StaffTable />
      </div>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an email invitation to give a staff member portal access. They'll receive a link to set up their account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
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
    </DashboardLayout>
  );
}
