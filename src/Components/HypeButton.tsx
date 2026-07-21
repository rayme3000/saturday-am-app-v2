import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, userId, initialCount = 0, variant = 'default', onRequireAuth }: any) => {
  const [isHyped, setIsHyped] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (userId && targetId) {
      checkIfHyped();
    } else {
      setLocalCount(initialCount);
    }
  }, [userId, targetId, initialCount]);

  const checkIfHyped = async () => {
    setIsLoading(true);
    
    // 1. Check if THIS user has already hyped it
    const { data } = await supabase
      .from('hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    
    if (data) setIsHyped(true);

    // 2. Fetch the LIVE total count from the database
    const { count } = await supabase
      .from('hypes')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (count !== null && count > 0) {
      setLocalCount(count);
    } else if (initialCount > 0 && count === 0) {
      setLocalCount(initialCount); 
    }

    setIsLoading(false);
  };

  const handleHype = async (e: any) => {
    // STOP the click from accidentally turning the page in the MangaReader
    if (e) e.stopPropagation();

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      else alert("Please log in or create a Free Account to drop hypes!");
      return;
    }

    // --- SATISFYING ANIMATION TRIGGER ---
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    // --- OPTIMISTIC UI UPDATE ---
    const previousIsHyped = isHyped;
    const previousCount = localCount;

    setIsHyped(!previousIsHyped);
    setLocalCount((prev: number) => previousIsHyped ? Math.max(0, prev - 1) : prev + 1);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_hypes')
        .eq('id', userId)
        .maybeSingle(); 
      
      const currentTotalHypes = profile?.total_hypes || 0;

      if (previousIsHyped) {
        const { error: err1 } = await supabase
          .from('hypes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId);
        if (err1) throw err1;
        
        await supabase
          .from('profiles')
          .update({ total_hypes: Math.max(0, currentTotalHypes - 1) })
          .eq('id', userId);
        
      } else {
        const { error: err2 } = await supabase
          .from('hypes')
          .insert([{ user_id: userId, target_type: targetType, target_id: targetId }]);
        if (err2) throw err2;
        
        await supabase
          .from('profiles')
          .update({ total_hypes: currentTotalHypes + 1 })
          .eq('id', userId);
      }
    } catch (error) {
      console.error("Error updating hype:", error);
      setIsHyped(previousIsHyped);
      setLocalCount(previousCount);
    }
  };

  const formattedHype = localCount >= 1000 ? (localCount / 1000).toFixed(1) + 'K' : localCount.toString();

  // --- ICON-ONLY VARIANT (Used inside the Manga Reader) ---
  if (variant === 'icon') {
    return (
      <button 
        onClick={handleHype}
        disabled={isLoading}
        className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isHyped ? 'bg-[#fe9a00]/20' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'} border border-white/5 shadow-xl group flex items-center justify-center`}
        title="Hype this Page"
      >
        <Flame 
          className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-white/70 group-hover:text-white'} ${isAnimating ? 'scale-[1.7] -translate-y-1 rotate-12 drop-shadow-[0_0_15px_rgba(254,154,0,0.8)]' : 'scale-100'}`} 
        />
        {/* Number Badge */}
        {localCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md">
            {formattedHype}
          </span>
        )}
      </button>
    );
  }

  // --- DEFAULT VARIANT (Used on Series Pages) ---
  return (
    <button 
      onClick={handleHype}
      disabled={isLoading}
      className={`flex items-center justify-center transition-all duration-300 group gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border ${isHyped ? 'border-[#fe9a00] bg-zinc-900 shadow-[0_0_15px_rgba(254,154,0,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-[#fe9a00]'}`}
    >
      <Flame 
        className={`w-5 h-5 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'group-hover:fill-[#fe9a00] text-zinc-400'} ${isAnimating ? 'scale-[1.7] -translate-y-1 rotate-12 drop-shadow-[0_0_15px_rgba(254,154,0,0.8)]' : 'scale-100'}`} 
      />
      <span>{formattedHype} HYPE</span>
    </button>
  );
};