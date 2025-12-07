import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Prediction {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

export function usePlacesAutocomplete() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-autocomplete', {
          body: { input, sessionToken: sessionTokenRef.current },
        });

        if (error) throw error;
        setPredictions(data.predictions || []);
      } catch (err) {
        console.error('Places autocomplete error:', err);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const selectPlace = useCallback((prediction: Prediction) => {
    // Generate new session token after selection (as per Google's billing recommendations)
    sessionTokenRef.current = crypto.randomUUID();
    setPredictions([]);
    return prediction.description;
  }, []);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    predictions,
    isLoading,
    search,
    selectPlace,
    clearPredictions,
  };
}
