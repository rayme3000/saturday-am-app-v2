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
          .select('*')
          .order('display_order', { ascending: true }); // THIS is the magic sorting line

        if (error) throw error;
        if (data) setSeriesList(data);
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