import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const SuperHypeButton = ({ seriesSlug, userId, isPremium, onRequireAuth, onRequirePremium }: any) => {
  const [hasSuperHyped, setHasSuperHyped] = useState(false);
  const [hypesLeft, setHypesLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically calculate days until Saturday 12:00 AM
  const getDaysUntilReset = () => {
    const now = new Date();
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    nextSaturday.setHours(0, 0, 0, 0);
    
    if (now >= nextSaturday) {
      nextSaturday.setDate(nextSaturday.getDate() + 7);
    }
    
    const diffTime = Math.abs(nextSaturday.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (userId && seriesSlug) {
      checkSuperHypeStatus();
    } else {
      setIsLoading(false);
    }
  }, [userId, seriesSlug, isPremium]);

  const checkSuperHypeStatus = async () => {
    const { data: hypeData } = await supabase
      .from('super_hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('series_slug', seriesSlug)
      .maybeSingle();

    if (hypeData) setHasSuperHyped(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('super_hypes_left')
      .eq('id', userId)
      .maybeSingle();
      
    if (profile && profile.super_hypes_left !== undefined) {
      setHypesLeft(profile.super_hypes_left);
    }

    setIsLoading(false);
  };

  const handleSuperHype = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!isPremium) {
      if (onRequirePremium) onRequirePremium();
      return;
    }

    if (hasSuperHyped || isLoading || (hypesLeft !== null && hypesLeft !== undefined && hypesLeft <= 0)) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('super_hypes')
        .insert([{ user_id: userId, series_slug: seriesSlug }]);

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('super_hypes, super_hypes_left')
        .eq('id', userId)
        .single();
      
      if (profile && profile.super_hypes_left > 0) {
        const newHypesLeft = profile.super_hypes_left - 1;
        
        await supabase
          .from('profiles')
          .update({ 
            super_hypes_left: newHypesLeft,
            super_hypes: (profile.super_hypes || 0) + 1
          })
          .eq('id', userId);
          
        setHypesLeft(newHypesLeft);
      }

      setHasSuperHyped(true);
    } catch (err) {
      console.error("Failed to hype:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isOutOfHypes = hypesLeft !== null && hypesLeft !== undefined && hypesLeft <= 0 && !hasSuperHyped;
  const daysLeft = getDaysUntilReset();

  return (
    <button 
      onClick={handleSuperHype}
      disabled={isLoading || hasSuperHyped || (isPremium && isOutOfHypes)}
      className={`flex items-center justify-center gap-3 px-8 py-3 w-full rounded-full font-black uppercase tracking-widest transition-all ${
        hasSuperHyped 
          ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]' 
          : (isOutOfHypes && isPremium)
          ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-yellow-500 to-[#fe9a00] text-black hover:scale-105 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
      }`}
    >
      <Flame className={`w-5 h-5 ${hasSuperHyped ? 'fill-[#fe9a00]' : (isOutOfHypes && isPremium) ? 'fill-zinc-500 text-zinc-500' : 'fill-black'}`} />
      <div className="flex flex-col text-left">
        <span className="leading-tight">
          {hasSuperHyped ? 'HYPED!' : (!isPremium ? 'SUBSCRIBE TO HYPE' : (isOutOfHypes ? 'OUT OF HYPES' : 'HYPE THIS SERIES'))}
        </span>
        {!hasSuperHyped && (
          <span className="text-[9px] font-bold opacity-80 leading-tight">
            {!isPremium ? 'Pro Exclusive Feature' : (hypesLeft !== null ? `${hypesLeft} Left • Resets in ${daysLeft}d` : 'Loading...')}
          </span>
        )}
      </div>
    </button>
  );
};