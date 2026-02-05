import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsState {
  sessionId: string;
  pageViewId: string | null;
  startTime: number;
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

const generateSessionId = (): string => {
  return crypto.randomUUID();
};

const getOrCreateSessionId = (): string => {
  const existingId = sessionStorage.getItem('giveaway_session_id');
  if (existingId) return existingId;
  
  const newId = generateSessionId();
  sessionStorage.setItem('giveaway_session_id', newId);
  return newId;
};

export const useGiveawayAnalytics = () => {
  const [searchParams] = useSearchParams();
  const analyticsRef = useRef<AnalyticsState | null>(null);
  const hasLoggedPageView = useRef(false);

  // Parse traffic source from URL params
  const getTrafficSource = useCallback(() => {
    const source = searchParams.get('source');
    const utmSource = searchParams.get('utm_source');
    
    // Priority: explicit source param > utm_source > 'direct'
    if (source) return source.toLowerCase();
    if (utmSource) return utmSource.toLowerCase();
    return 'direct';
  }, [searchParams]);

  // Log initial page view
  const logPageView = useCallback(async () => {
    if (hasLoggedPageView.current) return;
    hasLoggedPageView.current = true;

    const sessionId = getOrCreateSessionId();
    const trafficSource = getTrafficSource();
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    try {
      const { data, error } = await supabase
        .from('giveaway_page_views' as any)
        .insert({
          session_id: sessionId,
          traffic_source: trafficSource,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          user_agent: navigator.userAgent,
          questionnaire_started: false,
          questionnaire_completed: false,
          questionnaire_progress: 0,
          time_on_page_seconds: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log page view:', error);
        return;
      }

      const pageViewId = (data as any)?.id || null;

      analyticsRef.current = {
        sessionId,
        pageViewId,
        startTime: Date.now(),
        trafficSource,
        utmSource,
        utmMedium,
        utmCampaign,
      };
    } catch (err) {
      console.error('Error logging page view:', err);
    }
  }, [getTrafficSource, searchParams]);

  // Track CTA click (questionnaire started)
  const trackQuestionnaireStart = useCallback(async () => {
    if (!analyticsRef.current?.pageViewId) return;

    try {
      await supabase
        .from('giveaway_page_views' as any)
        .update({ questionnaire_started: true })
        .eq('id', analyticsRef.current.pageViewId);
    } catch (err) {
      console.error('Error tracking questionnaire start:', err);
    }
  }, []);

  // Track progress through questionnaire
  const trackProgress = useCallback(async (progress: number) => {
    if (!analyticsRef.current?.pageViewId) return;

    try {
      await supabase
        .from('giveaway_page_views' as any)
        .update({ questionnaire_progress: progress })
        .eq('id', analyticsRef.current.pageViewId);
    } catch (err) {
      console.error('Error tracking progress:', err);
    }
  }, []);

  // Track questionnaire completion
  const trackCompletion = useCallback(async () => {
    if (!analyticsRef.current?.pageViewId) return;

    const timeOnPage = Math.floor((Date.now() - analyticsRef.current.startTime) / 1000);

    try {
      await supabase
        .from('giveaway_page_views' as any)
        .update({
          questionnaire_completed: true,
          questionnaire_progress: 100,
          time_on_page_seconds: timeOnPage,
        })
        .eq('id', analyticsRef.current.pageViewId);
    } catch (err) {
      console.error('Error tracking completion:', err);
    }
  }, []);

  // Update time on page (called on unload)
  const updateTimeOnPage = useCallback(() => {
    if (!analyticsRef.current?.pageViewId) return;

    const timeOnPage = Math.floor((Date.now() - analyticsRef.current.startTime) / 1000);

    // Use sendBeacon for reliable unload tracking
    const data = JSON.stringify({
      time_on_page_seconds: timeOnPage,
    });

    navigator.sendBeacon(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/giveaway_page_views?id=eq.${analyticsRef.current.pageViewId}`,
      new Blob([data], { type: 'application/json' })
    );
  }, []);

  // Get current analytics state for form submission
  const getAnalyticsData = useCallback(() => {
    return analyticsRef.current;
  }, []);

  // Log page view on mount
  useEffect(() => {
    logPageView();

    // Track time on page when user leaves
    const handleBeforeUnload = () => {
      updateTimeOnPage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [logPageView, updateTimeOnPage]);

  return {
    trackQuestionnaireStart,
    trackProgress,
    trackCompletion,
    getAnalyticsData,
  };
};
