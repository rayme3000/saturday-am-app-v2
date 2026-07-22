import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const SuperHypeButton = ({ seriesSlug, userId, isPremium, onRequirePremium, onRequireAuth }: any) => {
  const [hasSuperHyped, setHasSuperHyped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId && seriesSlug) {
      checkSuperHypeStatus();
    } else {
      setIsLoading(false);
    }
  }, [userId, seriesSlug]);

  const checkSuperHypeStatus = async () => {
    const { data } = await supabase
      .from('super_hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('series_slug', seriesSlug)
      .maybeSingle();

    if (data) setHasSuperHyped(true);
    setIsLoading(false);
  };

  const handleSuperHype = async () => {
    // 1. Check Auth
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    // 2. Enforce Paywall for Free Users
    if (!isPremium) {
      if (onRequirePremium) onRequirePremium();
      return;
    }

    // 3. Prevent Duplicate Hypes
    if (hasSuperHyped || isLoading) return;

    setIsLoading(true);

    try {
      // Create the Super Hype
      const { error } = await supabase
        .from('super_hypes')
        .insert([{ user_id: userId, series_slug: seriesSlug }]);

      if (error) throw error;

      // Update User Profile Stats
      const { data: profile } = await supabase.from('profiles').select('super_hypes_left').eq('id', userId).single();
      
      if (profile && profile.super_hypes_left > 0) {
        await supabase
          .from('profiles')
          .update({ super_hypes_left: profile.super_hypes_left - 1 })
          .eq('id', userId);
      }

      setHasSuperHyped(true);
    } catch (err) {
      console.error("Failed to super hype:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSuperHype}
      disabled={isLoading || hasSuperHyped}
      className={`flex items-center gap-3 px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all ${
        hasSuperHyped 
          ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]' 
          : 'bg-gradient-to-r from-yellow-500 to-[#fe9a00] text-black hover:scale-105 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
      }`}
    >
      <Flame className={`w-5 h-5 ${hasSuperHyped ? 'fill-[#fe9a00]' : 'fill-black'}`} />
      <div className="flex flex-col text-left">
        <span className="leading-tight">{hasSuperHyped ? 'SUPER HYPED!' : 'SUPER HYPE'}</span>
        {!hasSuperHyped && <span className="text-[9px] font-bold opacity-80 leading-tight">Pro Exclusive</span>}
      </div>
    </button>
  );
};