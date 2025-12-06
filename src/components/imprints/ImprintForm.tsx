import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from './ColorPicker';
import { GoogleFontSelector } from './GoogleFontSelector';
import { AssetUpload } from './AssetUpload';
import { useImprints, Imprint } from '@/hooks/useImprints';
import { Loader2 } from 'lucide-react';

const imprintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  from_name: z.string().min(1, 'From name is required'),
  from_email: z.string().email('Valid email required'),
  reply_to_email: z.string().email('Valid email required').optional().or(z.literal('')),
  primary_color: z.string(),
  secondary_color: z.string(),
  accent_color: z.string(),
  background_color: z.string(),
  text_color: z.string(),
  heading_font: z.string(),
  body_font: z.string(),
  brand_voice: z.string().optional(),
  tagline: z.string().optional(),
  website_url: z.string().url('Valid URL required').optional().or(z.literal('')),
});

type ImprintFormValues = z.infer<typeof imprintSchema>;

interface ImprintFormProps {
  open: boolean;
  onClose: () => void;
  imprint?: Imprint | null;
}

export function ImprintForm({ open, onClose, imprint }: ImprintFormProps) {
  const { createImprint, updateImprint, uploadAsset } = useImprints();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<{
    logo?: File;
    logo_dark?: File;
    icon?: File;
    header_image?: File;
    footer_image?: File;
  }>({});

  const form = useForm<ImprintFormValues>({
    resolver: zodResolver(imprintSchema),
    defaultValues: {
      name: imprint?.name || '',
      slug: imprint?.slug || '',
      from_name: imprint?.from_name || '',
      from_email: imprint?.from_email || '',
      reply_to_email: imprint?.reply_to_email || '',
      primary_color: imprint?.primary_color || '#1a1a2e',
      secondary_color: imprint?.secondary_color || '#16213e',
      accent_color: imprint?.accent_color || '#0f3460',
      background_color: imprint?.background_color || '#ffffff',
      text_color: imprint?.text_color || '#333333',
      heading_font: imprint?.heading_font || 'Roboto',
      body_font: imprint?.body_font || 'Open Sans',
      brand_voice: imprint?.brand_voice || '',
      tagline: imprint?.tagline || '',
      website_url: imprint?.website_url || '',
    },
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    form.setValue('name', name);
    if (!imprint) {
      form.setValue('slug', generateSlug(name));
    }
  };

  const onSubmit = async (values: ImprintFormValues) => {
    setIsSubmitting(true);
    try {
      const assetUrls: Record<string, string> = {};
      const slug = values.slug;

      // Upload pending assets
      for (const [key, file] of Object.entries(pendingAssets)) {
        if (file) {
          const url = await uploadAsset(file, slug, key);
          assetUrls[`${key}_url`] = url;
        }
      }

      const payload = {
        ...values,
        reply_to_email: values.reply_to_email || null,
        website_url: values.website_url || null,
        brand_voice: values.brand_voice || null,
        tagline: values.tagline || null,
        logo_url: assetUrls.logo_url || imprint?.logo_url || null,
        logo_dark_url: assetUrls.logo_dark_url || imprint?.logo_dark_url || null,
        icon_url: assetUrls.icon_url || imprint?.icon_url || null,
        header_image_url: assetUrls.header_image_url || imprint?.header_image_url || null,
        footer_image_url: assetUrls.footer_image_url || imprint?.footer_image_url || null,
      };

      if (imprint) {
        await updateImprint.mutateAsync({ id: imprint.id, ...payload });
      } else {
        await createImprint.mutateAsync({
          name: values.name,
          slug: values.slug,
          from_name: values.from_name,
          from_email: values.from_email,
          reply_to_email: values.reply_to_email || null,
          primary_color: values.primary_color,
          secondary_color: values.secondary_color,
          accent_color: values.accent_color,
          background_color: values.background_color,
          text_color: values.text_color,
          heading_font: values.heading_font,
          body_font: values.body_font,
          brand_voice: values.brand_voice || null,
          tagline: values.tagline || null,
          website_url: values.website_url || null,
          logo_url: assetUrls.logo_url || null,
          logo_dark_url: assetUrls.logo_dark_url || null,
          icon_url: assetUrls.icon_url || null,
          header_image_url: assetUrls.header_image_url || null,
          footer_image_url: assetUrls.footer_image_url || null,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save imprint:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{imprint ? 'Edit Imprint' : 'Create New Imprint'}</SheetTitle>
          <SheetDescription>
            Configure your brand's identity, colors, fonts, and email settings.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="typography">Typography</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imprint Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Xulon Press"
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="xulon-press" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Xulon Press" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="xulon@news.authorservices.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reply_to_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reply-To Email (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="support@xulonpress.com" />
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
                      <FormLabel>Website URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://xulonpress.com" />
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
                      <FormLabel>Tagline (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Publishing your legacy" />
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
                      <FormLabel>Brand Voice (for AI)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Professional, warm, encouraging..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          label="Primary Color"
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
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
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
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
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
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
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
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
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Color Preview */}
                <div className="mt-6 p-4 rounded-lg border">
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <div 
                    className="p-4 rounded"
                    style={{ backgroundColor: form.watch('background_color') }}
                  >
                    <div 
                      className="text-lg font-bold mb-2"
                      style={{ 
                        color: form.watch('primary_color'),
                        fontFamily: form.watch('heading_font')
                      }}
                    >
                      Sample Heading
                    </div>
                    <p 
                      style={{ 
                        color: form.watch('text_color'),
                        fontFamily: form.watch('body_font')
                      }}
                    >
                      This is sample body text showing your brand colors.
                    </p>
                    <button
                      type="button"
                      className="mt-2 px-4 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: form.watch('accent_color') }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="typography" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="heading_font"
                  render={({ field }) => (
                    <FormItem>
                      <GoogleFontSelector
                        label="Heading Font"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
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
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Typography Preview */}
                <div className="mt-6 p-4 rounded-lg border">
                  <p className="text-sm font-medium mb-3">Typography Preview</p>
                  <div 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: form.watch('heading_font') }}
                  >
                    Heading Preview
                  </div>
                  <p 
                    className="text-base"
                    style={{ fontFamily: form.watch('body_font') }}
                  >
                    This is body text in your selected font. The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="assets" className="space-y-4 mt-4">
                <AssetUpload
                  label="Logo"
                  value={imprint?.logo_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, logo: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, logo: undefined }))}
                />

                <AssetUpload
                  label="Logo (Dark Background)"
                  value={imprint?.logo_dark_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, logo_dark: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, logo_dark: undefined }))}
                />

                <AssetUpload
                  label="Icon / Favicon"
                  value={imprint?.icon_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, icon: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, icon: undefined }))}
                />

                <AssetUpload
                  label="Email Header Image"
                  value={imprint?.header_image_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, header_image: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, header_image: undefined }))}
                />

                <AssetUpload
                  label="Email Footer Image"
                  value={imprint?.footer_image_url || null}
                  onChange={(file) => setPendingAssets(prev => ({ ...prev, footer_image: file || undefined }))}
                  onClear={() => setPendingAssets(prev => ({ ...prev, footer_image: undefined }))}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {imprint ? 'Update Imprint' : 'Create Imprint'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
