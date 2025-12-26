import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Staff {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  title: string | null;
  department: string | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffWithUser extends Staff {
  linked_user?: {
    id: string;
    full_name: string | null;
    email: string;
    role?: string | null;
  } | null;
}

export function useStaff(departmentFilter?: string) {
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff', departmentFilter],
    queryFn: async (): Promise<StaffWithUser[]> => {
      let query = supabase
        .from('staff')
        .select('*')
        .order('full_name');

      if (departmentFilter) {
        query = query.eq('department', departmentFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch linked user profiles and roles
      const userIds = (data || [])
        .filter(s => s.user_id)
        .map(s => s.user_id as string);

      let profiles: Record<string, { id: string; full_name: string | null; email: string; role?: string | null }> = {};
      
      if (userIds.length > 0) {
        // Fetch profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        // Fetch roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        const rolesMap: Record<string, string> = {};
        if (rolesData) {
          rolesData.forEach(r => {
            rolesMap[r.user_id] = r.role;
          });
        }
        
        if (profilesData) {
          profiles = Object.fromEntries(profilesData.map(p => [p.id, { 
            ...p, 
            role: rolesMap[p.id] || null 
          }]));
        }
      }

      return (data || []).map(s => ({
        ...s,
        linked_user: s.user_id ? profiles[s.user_id] || null : null,
      }));
    },
  });

  const createStaff = useMutation({
    mutationFn: async (newStaff: Omit<Staff, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('staff')
        .insert([newStaff])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added');
    },
    onError: (error: any) => {
      console.error('Error creating staff:', error);
      toast.error(error.message || 'Failed to add staff member');
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated');
    },
    onError: (error: any) => {
      console.error('Error updating staff:', error);
      toast.error(error.message || 'Failed to update staff member');
    },
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed');
    },
    onError: (error: any) => {
      console.error('Error deleting staff:', error);
      toast.error(error.message || 'Failed to remove staff member');
    },
  });

  const linkStaffToUser = useMutation({
    mutationFn: async ({ staffId, userId }: { staffId: string; userId: string | null }) => {
      const { data, error } = await supabase
        .from('staff')
        .update({ user_id: userId })
        .eq('id', staffId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member linked to user account');
    },
    onError: (error: any) => {
      console.error('Error linking staff to user:', error);
      toast.error(error.message || 'Failed to link staff to user');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('staff')
        .update({ active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(data.active ? 'Staff member activated' : 'Staff member deactivated');
    },
    onError: (error: any) => {
      console.error('Error toggling staff status:', error);
      toast.error(error.message || 'Failed to update staff status');
    },
  });

  return {
    staff,
    isLoading,
    error,
    createStaff,
    updateStaff,
    deleteStaff,
    linkStaffToUser,
    toggleActive,
  };
}

// Hook to get active staff for dropdowns
export function useActiveStaff() {
  return useQuery({
    queryKey: ['staff', 'active'],
    queryFn: async (): Promise<Staff[]> => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('active', true)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });
}
