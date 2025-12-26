import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetUpload } from './AssetUpload';
import { useCompany, Company } from '@/hooks/useCompany';
import { Loader2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website_url: z.string().url('Valid URL required').optional().or(z.literal('')),
  legal_address: z.string().min(1, 'Address is required for CAN-SPAM compliance'),
  phone: z.string().min(1, 'Phone is required'),
  footer_copyright_template: z.string().optional(),
  footer_reason_template: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanySettingsSheetProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
}

const getDefaultValues = (company: Company | null): CompanyFormValues => ({
  name: company?.name || '',
  website_url: company?.website_url || '',
  legal_address: company?.legal_address || '',
  phone: company?.phone || '',
  footer_copyright_template: company?.footer_copyright_template || '© {year} {company_name}. All rights reserved.',
  footer_reason_template: company?.footer_reason_template || 'You received this email because you are a valued {company_name} customer.',
});

export function CompanySettingsSheet({ open, onClose, company }: CompanySettingsSheetProps) {
  const { updateCompany, uploadAsset } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<{
    logo?: File;
    logo_dark?: File;
    icon?: File;
    favicon?: File;
  }>({});

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: getDefaultValues(company),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(company));
      setPendingAssets({});
    }
  }, [open, company, form]);

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      const assetUrls: Record<string, string> = {};

      // Upload pending assets
      for (const [key, file] of Object.entries(pendingAssets)) {
        if (file) {
          const url = await uploadAsset(file, key);
          assetUrls[`${key}_url`] = url;
        }
      }

      const payload = {
        name: values.name,
        website_url: values.website_url || null,
        legal_address: values.legal_address,
        phone: values.phone,
        footer_copyright_template: values.footer_copyright_template || null,
        footer_reason_template: values.footer_reason_template || null,
        logo_url: assetUrls.logo_url || company?.logo_url || null,
        logo_dark_url: assetUrls.logo_dark_url || company?.logo_dark_url || null,
        icon_url: assetUrls.icon_url || company?.icon_url || null,
        favicon_url: assetUrls.favicon_url || company?.favicon_url || null,
      };

      await updateCompany.mutateAsync(payload);
      onClose();
    } catch (error) {
      console.error('Failed to save company settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Parent Company</SheetTitle>
          <SheetDescription>
            Configure your parent company's identity, compliance info, and assets.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>

              <TabsContent value="identity" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Author Services" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://authorservices.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4 mt-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>CAN-SPAM Compliance:</strong> These values are used in email footers and must be accurate to comply with anti-spam regulations.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="legal_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Company Name, Street Address, City, State ZIP"
                          rows={2}
                        />
                      </FormControl>
                      <FormDescription>
                        Full mailing address as required by CAN-SPAM
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="866-381-2665" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="footer_copyright_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Copyright Template</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="© {year} {company_name}. All rights reserved." />
                      </FormControl>
                      <FormDescription>
                        Use {'{year}'} and {'{company_name}'} as placeholders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="footer_reason_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Reason Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="You received this email because you are a valued {company_name} customer."
                          rows={2}
                        />
                      </FormControl>
                      <FormDescription>
                        Explains why the recipient is receiving the email. Use {'{company_name}'} as a placeholder.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="assets" className="space-y-4 mt-4">
                <AssetUpload
                  label="Logo (Light Background)"
                  value={company?.logo_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, logo: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, logo: undefined }))}
                />

                <AssetUpload
                  label="Logo (Dark Background)"
                  value={company?.logo_dark_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, logo_dark: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, logo_dark: undefined }))}
                />

                <AssetUpload
                  label="Icon"
                  value={company?.icon_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, icon: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, icon: undefined }))}
                />

                <AssetUpload
                  label="Favicon"
                  value={company?.favicon_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, favicon: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, favicon: undefined }))}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
