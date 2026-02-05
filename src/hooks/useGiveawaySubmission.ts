import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneNumber } from '@/lib/phone-utils';

export interface GiveawayFormData {
  // Demographics
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  
  // Referral
  referrerName: string;
  referrerEmail: string;
  
  // Book info
  genres: string[];
  otherGenre: string;
  marketingServicesUsed: string[];
  primaryMarketingReason: string;
  hasPublishedBefore: boolean | null;
  writingStage: string;
  marketingConfidence: string;
  
  // File
  manuscriptFile: File | null;
}

export const initialFormData: GiveawayFormData = {
  name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  referrerName: '',
  referrerEmail: '',
  genres: [],
  otherGenre: '',
  marketingServicesUsed: [],
  primaryMarketingReason: '',
  hasPublishedBefore: null,
  writingStage: '',
  marketingConfidence: '',
  manuscriptFile: null,
};

interface SubmissionResult {
  success: boolean;
  referralCode?: string;
  error?: string;
}

interface AnalyticsData {
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useGiveawaySubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadManuscript = async (file: File): Promise<{ path: string; fileName: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `manuscripts/${fileName}`;

      const { error } = await supabase.storage
        .from('giveaway-manuscripts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      return { path: filePath, fileName: file.name };
    } catch (err) {
      console.error('Error uploading manuscript:', err);
      return null;
    }
  };

  const submitEntry = async (
    formData: GiveawayFormData,
    analyticsData: AnalyticsData | null
  ): Promise<SubmissionResult> => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // 1. Upload manuscript file
      let manuscriptPath = '';
      let manuscriptFileName = '';

      if (formData.manuscriptFile) {
        setUploadProgress(10);
        const uploadResult = await uploadManuscript(formData.manuscriptFile);
        
        if (!uploadResult) {
          return { success: false, error: 'Failed to upload manuscript file. Please try again.' };
        }
        
        manuscriptPath = uploadResult.path;
        manuscriptFileName = uploadResult.fileName;
        setUploadProgress(50);
      }

      // 2. Generate referral code
      const referralCode = generateReferralCode();
      setUploadProgress(60);

      // 3. Prepare genres array (include "other" if specified)
      const genres = [...formData.genres];
      if (formData.genres.includes('other') && formData.otherGenre) {
        genres.push(`other: ${formData.otherGenre}`);
      }

      // 4. Insert entry
      const { error } = await supabase
        .from('giveaway_entries' as any)
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          phone_normalized: normalizePhoneNumber(formData.phone),
          city: formData.city.trim() || null,
          state: formData.state || null,
          referrer_name: formData.referrerName.trim() || null,
          referrer_email: formData.referrerEmail.trim().toLowerCase() || null,
          genres,
          marketing_services_used: formData.marketingServicesUsed,
          primary_marketing_reason: formData.primaryMarketingReason.trim(),
          has_published_before: formData.hasPublishedBefore,
          writing_stage: formData.writingStage,
          marketing_confidence: formData.marketingConfidence,
          manuscript_file_path: manuscriptPath || null,
          manuscript_file_name: manuscriptFileName || null,
          traffic_source: analyticsData?.trafficSource || 'direct',
          utm_source: analyticsData?.utmSource || null,
          utm_medium: analyticsData?.utmMedium || null,
          utm_campaign: analyticsData?.utmCampaign || null,
          referral_code: referralCode,
          user_agent: navigator.userAgent,
        });

      setUploadProgress(100);

      if (error) {
        console.error('Submission error:', error);
        
        // Check for duplicate entry
        if (error.code === '23505') {
          return { success: false, error: 'You have already entered this giveaway with this email address.' };
        }
        
        return { success: false, error: 'Failed to submit entry. Please try again.' };
      }

      return { success: true, referralCode };
    } catch (err) {
      console.error('Error submitting entry:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEntry,
    isSubmitting,
    uploadProgress,
  };
};
