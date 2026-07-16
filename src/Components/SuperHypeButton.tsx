import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export const SuperHypeButton = ({ seriesSlug, userId, isPremium = false, onRequirePremium, onRequireAuth }: any) => {
  const [superHypesLeft, setSuperHypesLeft] = useState(0);
  const [hasSuperHypedThis, setHasSuperHypedThis] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const MAX_HYPES = isPremium ? 5 : 3;

  useEffect(() => {
    if (userId && seriesSlug) {
      checkHypeStatus();
    } else {
      setIsLoading(false);
    }
  }, [userId, seriesSlug, isPremium]);

  const checkHypeStatus = async () => {
    setIsLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('super_hypes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    const { data: specificHype } = await supabase
      .from('super_hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('series_slug', seriesSlug)
      .single();

    const usedHypes = count || 0;
    setSuperHypesLeft(MAX_HYPES - usedHypes);
    setHasSuperHypedThis(!!specificHype);
    setIsLoading(false);
  };

  const handleSuperHype = async () => {
    // 1. Auth check
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    // 2. Premium check
    if (!isPremium && !hasSuperHypedThis && superHypesLeft <= 0) {
        if (onRequirePremium) onRequirePremium();
        return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      // Fetch their current Super Hype total from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('super_hypes')
        .eq('id', userId)
        .single();
      
      const currentSuperHypes = profile?.super_hypes || 0;

      if (hasSuperHypedThis) {
        // Remove super hype record from the series
        await supabase
          .from('super_hypes')
          .delete()
          .eq('user_id', userId)
          .eq('series_slug', seriesSlug);
        
        // Subtract 1 from their profile stats
        await supabase
          .from('profiles')
          .update({ super_hypes: Math.max(0, currentSuperHypes - 1) })
          .eq('id', userId);
        
        setHasSuperHypedThis(false);
        setSuperHypesLeft(prev => prev + 1);
      } else {
        // Add super hype record to the series
        await supabase
          .from('super_hypes')
          .insert([{ user_id: userId, series_slug: seriesSlug }]);
        
        // Add +1 to their profile stats!
        await supabase
          .from('profiles')
          .update({ super_hypes: currentSuperHypes + 1 })
          .eq('id', userId);
        
        setHasSuperHypedThis(true);
        setSuperHypesLeft(prev => prev - 1);
      }
    } catch (error) {
      console.error("Error updating super hype:", error);
    }
    
    setIsLoading(false);
  };

  return (
    <button 
      onClick={handleSuperHype}
      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${
        hasSuperHypedThis 
          ? 'bg-gradient-to-r from-[#fe9a00] to-red-600 text-black shadow-[0_0_30px_rgba(254,154,0,0.6)] hover:scale-105'
          : 'bg-zinc-900 border border-[#fe9a00]/50 text-[#fe9a00] hover:bg-[#fe9a00]/10 hover:scale-105 shadow-[0_0_15px_rgba(254,154,0,0.1)]'
      }`}
    >
      <img 
        src="/crown.png" 
        alt="Super Hype" 
        className={`w-6 h-6 transition-all ${
          hasSuperHypedThis 
            ? 'invert brightness-0' 
            : 'brightness-0 invert sepia saturate-[7000%] hue-rotate-[1deg]'
        }`}
      />
      <div className="flex flex-col items-start">
        <span className="text-[14px] italic leading-tight">
          {hasSuperHypedThis ? 'SUPER HYPED!' : 'SUPER HYPE'}
        </span>
        <span className="text-[9px] opacity-80 leading-tight uppercase tracking-widest">
          {superHypesLeft}/{MAX_HYPES} left for the mon.
        </span>
      </div>
    </button>
  );
};