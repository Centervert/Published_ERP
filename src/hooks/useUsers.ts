import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Map database roles to display names
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  asc: 'Author Success Coach',
  ae: 'Account Executive',
  member: 'Member',
};

// Map display names back to database roles
export const DISPLAY_NAME_TO_ROLE: Record<string, string> = {
  'Super Admin': 'super_admin',
  'Admin': 'admin',
  'Author Success Coach': 'asc',
  'Account Executive': 'ae',
  'Member': 'member',
};

export type AppRole = 'super_admin' | 'admin' | 'asc' | 'ae' | 'member';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: AppRole;
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map<string, AppRole>();
      roles?.forEach((r) => {
        roleMap.set(r.user_id, r.role as AppRole);
      });

      // Combine profiles with roles
      return (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        title: profile.title,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        role: roleMap.get(profile.id) || 'member',
      }));
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('User role updated');
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    },
  });

  const updateUserProfile = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { full_name?: string; phone?: string; title?: string };
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('User profile updated');
    },
    onError: (error) => {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update user profile');
    },
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole,
    updateUserProfile,
  };
}

export function useCurrentUserRole() {
  return useQuery({
    queryKey: ['current-user-role'],
    queryFn: async (): Promise<AppRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return (roleData?.role as AppRole) || 'member';
    },
  });
}

export function useHasRole(requiredRoles: AppRole[]) {
  const { data: currentRole, isLoading } = useCurrentUserRole();

  return {
    hasRole: currentRole ? requiredRoles.includes(currentRole) : false,
    isLoading,
    currentRole,
  };
}
