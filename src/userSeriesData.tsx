import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

// 1. Create the Context
const SeriesContext = createContext(null);

// 2. Create the Provider Wrapper
export const SeriesProvider = ({ children }) => {
  const [seriesList, setSeriesList] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [vaultAvatars, setVaultAvatars] = useState([]);
  const [cardSkins, setCardSkins] = useState([]);
  const [vaultFrames, setVaultFrames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllGlobalData = async () => {
      setIsLoading(true);
      try {
        // CONCURRENT FETCHING: Grab everything the app needs at the exact same time
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

        // Lock data into the global cache
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
    };

    fetchAllGlobalData();
  }, []);

  return (
    <SeriesContext.Provider value={{ 
      seriesList, 
      magazines, 
      vaultAvatars, 
      cardSkins, 
      vaultFrames, 
      isLoading 
    }}>
      {children}
    </SeriesContext.Provider>
  );
};

// 3. Export the hook so components can read the cache
export const useSeriesData = () => useContext(SeriesContext);