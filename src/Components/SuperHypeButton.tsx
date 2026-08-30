import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const SuperHypeButton = ({ seriesSlug, userId, isPremium, onRequireAuth, onRequirePremium }: any) => {
  const [hasSuperHyped, setHasSuperHyped] = useState(false);
  const [hypesLeft, setHypesLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- NEW: CONFIRMATION MODAL STATE ---
  const [showConfirm, setShowConfirm] = useState(false);

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
    // Added .limit(1) to prevent errors now that multiple hypes are allowed
    const { data: hypeData } = await supabase
      .from('super_hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('series_slug', seriesSlug)
      .limit(1)
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

  const initiateSuperHype = (e?: React.MouseEvent) => {
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

    if (isLoading) return;

    if (hypesLeft !== null && hypesLeft !== undefined && hypesLeft <= 0) {
      alert("You are out of Super Hypes! They will automatically replenish this Saturday.");
      return;
    }

    // Trigger the modal instead of instantly firing
    setShowConfirm(true);
  };

  const executeSuperHype = async () => {
    setShowConfirm(false);
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

  const isOutOfHypes = hypesLeft !== null && hypesLeft !== undefined && hypesLeft <= 0;
  const daysLeft = getDaysUntilReset();

  return (
    <>
      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-[#fe9a00]/10 rounded-full flex items-center justify-center mb-4 border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Flame className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Drop a Super Hype?</h2>
            <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-6">
              Are you sure you want to spend a Super Hype on this series? You can hype the same series multiple times!
            </p>
            <div className="bg-zinc-900 w-full py-3 rounded-lg border border-zinc-800 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Balance</p>
              <p className="text-lg font-black text-white">{hypesLeft} <span className="text-[#fe9a00]">Remaining</span></p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }} className="flex-1 bg-zinc-900 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={(e) => { e.stopPropagation(); executeSuperHype(); }} className="flex-1 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={initiateSuperHype}
        disabled={isLoading || (isPremium && isOutOfHypes)}
        className={`flex items-center justify-center gap-3 px-8 py-3 w-full rounded-full font-black uppercase tracking-widest transition-all ${
          (isOutOfHypes && isPremium)
            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
            : hasSuperHyped 
            ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.2)] hover:bg-zinc-900' 
            : 'bg-gradient-to-r from-yellow-500 to-[#fe9a00] text-black hover:scale-105 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
        }`}
      >
        <Flame className={`w-5 h-5 ${(isOutOfHypes && isPremium) ? 'fill-zinc-500 text-zinc-500' : hasSuperHyped ? 'fill-[#fe9a00]' : 'fill-black'}`} />
        <div className="flex flex-col text-left">
          <span className="leading-tight">
            {!isPremium ? 'SUBSCRIBE TO HYPE' : (isOutOfHypes ? 'OUT OF HYPES' : hasSuperHyped ? 'HYPE AGAIN' : 'HYPE THIS SERIES')}
          </span>
          <span className={`text-[9px] font-bold opacity-80 leading-tight ${hasSuperHyped && !isOutOfHypes ? 'text-zinc-400' : ''}`}>
            {!isPremium ? 'Pro Exclusive Feature' : (hypesLeft !== null ? `${hypesLeft} Left • Resets in ${daysLeft}d` : 'Loading...')}
          </span>
        </div>
      </button>
    </>
  );
};