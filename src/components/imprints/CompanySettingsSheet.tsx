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
import { DualAssetUpload } from './DualAssetUpload';
import { ColorPicker } from './ColorPicker';
import { GoogleFontSelector } from './GoogleFontSelector';
import { useCompany, Company } from '@/hooks/useCompany';
import { Loader2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website_url: z.string().url('Valid URL required').optional().or(z.literal('')),
  legal_address: z.string().min(1, 'Address is required for CAN-SPAM compliance'),
  phone: z.string().min(1, 'Phone is required'),
  footer_copyright_template: z.string().optional(),
  footer_reason_template: z.string().optional(),
  // Branding fields
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
  heading_font: z.string().optional(),
  body_font: z.string().optional(),
  // Email defaults
  from_name: z.string().optional(),
  from_email: z.string().email('Valid email required').optional().or(z.literal('')),
  brand_voice: z.string().optional(),
  tagline: z.string().optional(),
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
  // Branding
  primary_color: company?.primary_color || '#1a1a2e',
  secondary_color: company?.secondary_color || '#16213e',
  accent_color: company?.accent_color || '#0f3460',
  background_color: company?.background_color || '#ffffff',
  text_color: company?.text_color || '#333333',
  heading_font: company?.heading_font || 'Roboto',
  body_font: company?.body_font || 'Open Sans',
  // Email defaults
  from_name: company?.from_name || '',
  from_email: company?.from_email || '',
  brand_voice: company?.brand_voice || '',
  tagline: company?.tagline || '',
});

export function CompanySettingsSheet({ open, onClose, company }: CompanySettingsSheetProps) {
  const { updateCompany, uploadAsset } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<{
    logo?: File;
    logo_dark?: File;
    icon?: File;
    header_image?: File;
    header_image_dark?: File;
    footer_image?: File;
  }>({});
  const [clearedAssets, setClearedAssets] = useState<Set<string>>(new Set());

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: getDefaultValues(company),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(company));
      setPendingAssets({});
      setClearedAssets(new Set());
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
        // Branding
        primary_color: values.primary_color || null,
        secondary_color: values.secondary_color || null,
        accent_color: values.accent_color || null,
        background_color: values.background_color || null,
        text_color: values.text_color || null,
        heading_font: values.heading_font || null,
        body_font: values.body_font || null,
        // Email defaults
        from_name: values.from_name || null,
        from_email: values.from_email || null,
        brand_voice: values.brand_voice || null,
        tagline: values.tagline || null,
        // Assets - use new upload, or keep existing unless cleared
        logo_url: assetUrls.logo_url || (clearedAssets.has('logo') ? null : company?.logo_url) || null,
        logo_dark_url: assetUrls.logo_dark_url || (clearedAssets.has('logo_dark') ? null : company?.logo_dark_url) || null,
        // Icon and favicon share the same file
        icon_url: assetUrls.icon_url || (clearedAssets.has('icon') ? null : company?.icon_url) || null,
        favicon_url: assetUrls.icon_url || (clearedAssets.has('icon') ? null : company?.icon_url) || null,
        header_image_url: assetUrls.header_image_url || (clearedAssets.has('header_image') ? null : company?.header_image_url) || null,
        header_image_dark_url: assetUrls.header_image_dark_url || (clearedAssets.has('header_image_dark') ? null : (company as any)?.header_image_dark_url) || null,
        footer_image_url: assetUrls.footer_image_url || (clearedAssets.has('footer_image') ? null : company?.footer_image_url) || null,
      };

      await updateCompany.mutateAsync(payload);
      onClose();
    } catch (error) {
      console.error('Failed to save company settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedColors = form.watch(['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color']);
  const watchedFonts = form.watch(['heading_font', 'body_font']);

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Parent Company</SheetTitle>
          <SheetDescription>
            Configure your parent company's identity, branding, compliance info, and email defaults.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
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

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your publishing partner" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="branding" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Primary Color"
                          value={field.value || '#1a1a2e'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Secondary Color"
                          value={field.value || '#16213e'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accent_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Accent Color"
                          value={field.value || '#0f3460'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="background_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Background Color"
                          value={field.value || '#ffffff'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="text_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Text Color"
                          value={field.value || '#333333'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <FormField
                    control={form.control}
                    name="heading_font"
                    render={({ field }) => (
                      <FormItem>
                        <GoogleFontSelector
                          label="Heading Font"
                          value={field.value || 'Roboto'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body_font"
                    render={({ field }) => (
                      <FormItem>
                        <GoogleFontSelector
                          label="Body Font"
                          value={field.value || 'Open Sans'}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Live Preview */}
                <div className="rounded-lg border p-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-3">Preview</p>
                  <div 
                    className="p-4 rounded"
                    style={{ backgroundColor: watchedColors[3] || '#ffffff' }}
                  >
                    <h3 
                      className="text-lg font-semibold mb-2"
                      style={{ 
                        color: watchedColors[0] || '#1a1a2e',
                        fontFamily: watchedFonts[0] || 'Roboto'
                      }}
                    >
                      Sample Heading
                    </h3>
                    <p 
                      style={{ 
                        color: watchedColors[4] || '#333333',
                        fontFamily: watchedFonts[1] || 'Open Sans'
                      }}
                    >
                      This is how your body text will appear in emails.
                    </p>
                    <button
                      type="button"
                      className="mt-3 px-4 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: watchedColors[2] || '#0f3460' }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="from_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default From Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Author Services" />
                      </FormControl>
                      <FormDescription>
                        Used when no specific sender is assigned
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default From Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="noreply@authorservices.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand_voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Voice</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Professional, supportive, and author-focused..."
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe your brand's tone and voice for AI-generated content
                      </FormDescription>
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

              <TabsContent value="assets" className="space-y-6 mt-4">
                <DualAssetUpload
                  label="Company Logo"
                  lightValue={clearedAssets.has('logo') ? null : (company?.logo_url || null)}
                  darkValue={clearedAssets.has('logo_dark') ? null : (company?.logo_dark_url || null)}
                  onLightChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, logo: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('logo'); return n; });
                  }}
                  onDarkChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, logo_dark: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('logo_dark'); return n; });
                  }}
                  onLightClear={() => {
                    setPendingAssets(prev => ({ ...prev, logo: undefined }));
                    setClearedAssets(prev => new Set(prev).add('logo'));
                  }}
                  onDarkClear={() => {
                    setPendingAssets(prev => ({ ...prev, logo_dark: undefined }));
                    setClearedAssets(prev => new Set(prev).add('logo_dark'));
                  }}
                />

                <DualAssetUpload
                  label="Email Header Image"
                  lightValue={clearedAssets.has('header_image') ? null : (company?.header_image_url || null)}
                  darkValue={clearedAssets.has('header_image_dark') ? null : ((company as any)?.header_image_dark_url || null)}
                  onLightChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, header_image: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('header_image'); return n; });
                  }}
                  onDarkChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, header_image_dark: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('header_image_dark'); return n; });
                  }}
                  onLightClear={() => {
                    setPendingAssets(prev => ({ ...prev, header_image: undefined }));
                    setClearedAssets(prev => new Set(prev).add('header_image'));
                  }}
                  onDarkClear={() => {
                    setPendingAssets(prev => ({ ...prev, header_image_dark: undefined }));
                    setClearedAssets(prev => new Set(prev).add('header_image_dark'));
                  }}
                />

                <AssetUpload
                  label="Icon / Favicon (shared)"
                  value={clearedAssets.has('icon') ? null : (company?.icon_url || null)}
                  onChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, icon: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('icon'); return n; });
                  }}
                  onClear={() => {
                    setPendingAssets(prev => ({ ...prev, icon: undefined }));
                    setClearedAssets(prev => new Set(prev).add('icon'));
                  }}
                />

                <AssetUpload
                  label="Email Footer Image"
                  value={clearedAssets.has('footer_image') ? null : (company?.footer_image_url || null)}
                  onChange={(file) => {
                    setPendingAssets(prev => ({ ...prev, footer_image: file || undefined }));
                    setClearedAssets(prev => { const n = new Set(prev); n.delete('footer_image'); return n; });
                  }}
                  onClear={() => {
                    setPendingAssets(prev => ({ ...prev, footer_image: undefined }));
                    setClearedAssets(prev => new Set(prev).add('footer_image'));
                  }}
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