import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export const useSeriesData = () => {
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('series')
          // --- THE FIX IS RIGHT HERE ---
          // This tells Supabase to join the creators table and grab the is_visible flag!
          .select('*, creators:series_creators(*)') 
          .order('display_order', { ascending: true }); 

        if (error) throw error;
        if (data) {
          console.log("🚨 RAW SUPABASE DATA:", data); 
          setSeriesList(data);
        }
      } catch (error) {
        console.error("Error fetching series data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, []);

  return { seriesList, isLoading };
};