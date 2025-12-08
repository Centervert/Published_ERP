import { useState, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, X, Loader2, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  Product, 
  ProductCategory, 
  PRODUCT_CATEGORY_LABELS 
} from '@/hooks/useProducts';
import { useHasRole } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_OPTIONS: ProductCategory[] = ['format', 'bundle', 'package', 'service', 'add_on'];

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function parseCurrency(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'service' as ProductCategory,
    cost_price: '',
    min_price: '',
    retail_price: '',
    is_package: false,
    active: true,
  });

  const { data: products = [], isLoading } = useProducts({ 
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    activeOnly: false 
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const { hasRole: canSeeCost } = useHasRole(['super_admin', 'admin']);
  const { hasRole: canManage } = useHasRole(['super_admin', 'admin']);

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      (product.description || '').toLowerCase().includes(searchLower)
    );
  });

  const handleOpenSheet = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category: product.category,
        cost_price: product.cost_price?.toString() || '',
        min_price: product.min_price?.toString() || '',
        retail_price: product.retail_price?.toString() || '',
        is_package: product.is_package,
        active: product.active,
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: 'service',
        cost_price: '',
        min_price: '',
        retail_price: '',
        is_package: false,
        active: true,
      });
    }
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedProduct(null);
  };

  const handleSave = async () => {
    if (!formData.sku || !formData.name) {
      toast.error('SKU and Name are required');
      return;
    }

    const productData = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      cost_price: parseCurrency(formData.cost_price) ?? undefined,
      min_price: parseCurrency(formData.min_price) ?? undefined,
      retail_price: parseCurrency(formData.retail_price) ?? undefined,
      is_package: formData.is_package,
      active: formData.active,
    };

    if (selectedProduct) {
      await updateProduct.mutateAsync({
        productId: selectedProduct.id,
        updates: productData,
      });
    } else {
      await createProduct.mutateAsync(productData);
    }

    handleCloseSheet();
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    await deleteProduct.mutateAsync(selectedProduct.id);
    handleCloseSheet();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
      
      // Parse data rows
      const data = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || '';
        });
        return row;
      }).filter(row => row.sku__ || row.name); // Filter out empty rows

      setImportData(data);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Map CSV data to product format
      const productsToInsert = importData
        .filter(row => row.sku__ && row.name)
        .map(row => ({
          sku: row.sku__ || row.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: row.name || 'Unnamed Product',
          description: row.description || null,
          category: mapCategory(row.category || row.type || ''),
          cost_price: parseCurrency(row.cost),
          min_price: parseCurrency(row.min_price),
          retail_price: parseCurrency(row.retail_price),
          is_package: false,
          active: true,
          created_by: user.id,
        }));

      if (productsToInsert.length === 0) {
        toast.error('No valid products found in CSV');
        return;
      }

      // Insert in batches
      const batchSize = 50;
      let successCount = 0;
      
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('products')
          .upsert(batch, { onConflict: 'sku', ignoreDuplicates: false });
        
        if (error) {
          console.error('Batch insert error:', error);
        } else {
          successCount += batch.length;
        }
      }

      toast.success(`Imported ${successCount} products`);
      setIsImportDialogOpen(false);
      setImportData([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import products');
    } finally {
      setIsImporting(false);
    }
  };

  const mapCategory = (category: string): ProductCategory => {
    const lower = category.toLowerCase();
    if (lower.includes('format')) return 'format';
    if (lower.includes('bundle')) return 'bundle';
    if (lower.includes('package')) return 'package';
    if (lower.includes('add')) return 'add_on';
    return 'service';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage product catalog and pricing
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => handleOpenSheet()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ProductCategory | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {PRODUCT_CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  {canSeeCost && <TableHead className="text-right">Cost</TableHead>}
                  <TableHead className="text-right">Min Price</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenSheet(product)}
                  >
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PRODUCT_CATEGORY_LABELS[product.category]}
                      </Badge>
                    </TableCell>
                    {canSeeCost && (
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(product.cost_price)}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(product.min_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.retail_price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canSeeCost ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit/Add Product Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>{selectedProduct ? 'Edit Product' : 'Add Product'}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={handleCloseSheet} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="A16001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v: ProductCategory) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {PRODUCT_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="AI Audiobook Publishing Services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {canSeeCost && (
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost</Label>
                  <Input
                    id="cost_price"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="$0.00"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="min_price">Min Price</Label>
                <Input
                  id="min_price"
                  value={formData.min_price}
                  onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                  placeholder="$0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retail_price">Retail Price</Label>
                <Input
                  id="retail_price"
                  value={formData.retail_price}
                  onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                  placeholder="$0.00"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Is Package</Label>
                <p className="text-xs text-muted-foreground">Contains other products</p>
              </div>
              <Switch
                checked={formData.is_package}
                onCheckedChange={(checked) => setFormData({ ...formData, is_package: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Available for proposals</p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              {selectedProduct && canManage && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteProduct.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={handleCloseSheet}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createProduct.isPending || updateProduct.isPending}
              >
                {(createProduct.isPending || updateProduct.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Products
            </DialogTitle>
            <DialogDescription>
              Review the products to be imported from your CSV file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{row.sku__ || row.sku || '—'}</TableCell>
                    <TableCell>{row.name || '—'}</TableCell>
                    <TableCell className="text-right">{row.cost || '—'}</TableCell>
                    <TableCell className="text-right">{row.min_price || '—'}</TableCell>
                    <TableCell className="text-right">{row.retail_price || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {importData.length > 20 && (
            <p className="text-sm text-muted-foreground">
              Showing first 20 of {importData.length} products
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {importData.length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
