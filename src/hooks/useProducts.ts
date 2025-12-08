import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProductCategory = 'format' | 'bundle' | 'package' | 'service' | 'add_on';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  cost_price: number | null;
  min_price: number | null;
  retail_price: number | null;
  is_package: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PackageItem {
  id: string;
  package_id: string;
  item_id: string;
  quantity: number;
  created_at: string | null;
  // Joined data
  item?: Product;
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  format: 'Format',
  bundle: 'Bundle',
  package: 'Package',
  service: 'Service',
  add_on: 'Add-On',
};

export function useProducts(filters?: { category?: ProductCategory; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.activeOnly !== false) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((product) => ({
        ...product,
        category: product.category as ProductCategory,
      }));
    },
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        category: data.category as ProductCategory,
      };
    },
    enabled: !!productId,
  });
}

export function usePackageItems(packageId: string) {
  return useQuery({
    queryKey: ['package-items', packageId],
    queryFn: async (): Promise<PackageItem[]> => {
      const { data, error } = await supabase
        .from('package_items')
        .select(`
          *,
          item:products!package_items_item_id_fkey(*)
        `)
        .eq('package_id', packageId);

      if (error) throw error;

      return (data || []).map((pi) => ({
        ...pi,
        item: pi.item ? {
          ...pi.item,
          category: pi.item.category as ProductCategory,
        } : undefined,
      }));
    },
    enabled: !!packageId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      sku: string;
      name: string;
      description?: string;
      category: ProductCategory;
      cost_price?: number;
      min_price?: number;
      retail_price?: number;
      is_package?: boolean;
      active?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      updates,
    }: {
      productId: string;
      updates: Partial<{
        sku: string;
        name: string;
        description: string;
        category: ProductCategory;
        cost_price: number;
        min_price: number;
        retail_price: number;
        is_package: boolean;
        active: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    },
  });
}

export function useAddPackageItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      itemId,
      quantity = 1,
    }: {
      packageId: string;
      itemId: string;
      quantity?: number;
    }) => {
      const { data, error } = await supabase
        .from('package_items')
        .insert({
          package_id: packageId,
          item_id: itemId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['package-items', variables.packageId] });
      toast.success('Item added to package');
    },
    onError: (error) => {
      console.error('Error adding package item:', error);
      toast.error('Failed to add item to package');
    },
  });
}

export function useRemovePackageItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, itemId }: { packageId: string; itemId: string }) => {
      const { error } = await supabase
        .from('package_items')
        .delete()
        .eq('package_id', packageId)
        .eq('item_id', itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['package-items', variables.packageId] });
      toast.success('Item removed from package');
    },
    onError: (error) => {
      console.error('Error removing package item:', error);
      toast.error('Failed to remove item from package');
    },
  });
}
