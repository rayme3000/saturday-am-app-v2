import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const SeriesContext = createContext<any>(null);

export const SeriesProvider = ({ children }: { children: React.ReactNode }) => {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [magazines, setMagazines] = useState<any[]>([]);
  const [vaultAvatars, setVaultAvatars] = useState<any[]>([]);
  const [cardSkins, setCardSkins] = useState<any[]>([]);
  const [vaultFrames, setVaultFrames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllGlobalData = useCallback(async () => {
    try {
      const [
        seriesRes,
        magazinesRes,
        avatarsRes,
        skinsRes,
        framesRes
      ] = await Promise.all([
        supabase.from('series').select('*, creators:series_creators(*)').order('display_order', { ascending: true }),
        supabase.from('magazines').select('*').order('publish_date', { ascending: false }),
        supabase.from('avatars').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('card_skins').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('avatar_frames').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);

      if (seriesRes.error) throw seriesRes.error;

      if (seriesRes.data) setSeriesList(seriesRes.data);
      if (magazinesRes.data) setMagazines(magazinesRes.data);
      if (avatarsRes.data) setVaultAvatars(avatarsRes.data);
      if (skinsRes.data) setCardSkins(skinsRes.data);
      if (framesRes.data) setVaultFrames(framesRes.data);
    } catch (error) {
      console.error("Global cache fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSeriesData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*, creators:series_creators(*)')
        .order('display_order', { ascending: true });
      if (!error && data) {
        setSeriesList(data);
      }
    } catch (err) {
      console.error("Failed to refresh series cache:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllGlobalData();
    window.addEventListener('seriesUpdated', refreshSeriesData);
    return () => window.removeEventListener('seriesUpdated', refreshSeriesData);
  }, [fetchAllGlobalData, refreshSeriesData]);

  return (
    <SeriesContext.Provider value={{ 
      seriesList, 
      magazines, 
      vaultAvatars, 
      cardSkins, 
      vaultFrames, 
      isLoading,
      refreshSeriesData 
    }}>
      {children}
    </SeriesContext.Provider>
  );
};

export const useSeriesData = () => useContext(SeriesContext);