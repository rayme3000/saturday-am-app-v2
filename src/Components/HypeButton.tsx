import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Heart } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, userId, initialCount = 0, bonusCount = 0, variant = 'default', onRequireAuth, onToggle }: any) => {
  const [isHyped, setIsHyped] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isProcessing = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (userId && targetId) {
      checkIfHyped();
    } else {
      setLocalCount(initialCount);
    }
    return () => { isMounted.current = false; };
  }, [userId, targetId, initialCount]);

  const checkIfHyped = async () => {
    if (!targetId || !userId) return;
    
    const targetString = String(targetId);
    
    const { data } = await supabase
      .from('hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetString)
      .maybeSingle();
    
    if (isMounted.current && !isProcessing.current) {
      if (data) setIsHyped(true);
      else setIsHyped(false);
    }

    const { count } = await supabase
      .from('hypes')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetString);

    if (isMounted.current && !isProcessing.current) {
      if (count !== null && count > 0) {
        setLocalCount(count);
      } else if (initialCount > 0 && count === 0) {
        setLocalCount(initialCount); 
      }
    }
  };

  const handleHype = async (e: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      else alert("Please log in or create a Free Account to like this!");
      return;
    }

    if (isProcessing.current) return;
    isProcessing.current = true;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const previousIsHyped = isHyped;
    const newIsHyped = !previousIsHyped;
    const targetString = String(targetId);

    setIsHyped(newIsHyped);
    setLocalCount((prev: number) => previousIsHyped ? Math.max(0, prev - 1) : prev + 1);

    // --- NEW: Instantly inform the parent component of the change ---
    if (onToggle) onToggle(newIsHyped);

    try {
      if (previousIsHyped) {
        await supabase
          .from('hypes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetString);
      } else {
        await supabase
          .from('hypes')
          .insert([{ user_id: userId, target_type: targetType, target_id: targetString }]);
      }

      supabase.from('profiles').select('total_hypes').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data) {
          const newTotal = previousIsHyped ? Math.max(0, data.total_hypes - 1) : data.total_hypes + 1;
          supabase.from('profiles').update({ total_hypes: newTotal }).eq('id', userId).then();
        }
      });

    } catch (error) {
      console.error("Error saving like to database:", error);
    }

    setTimeout(() => {
      if (isMounted.current) isProcessing.current = false;
    }, 500);
  };

  const displayCount = localCount + (bonusCount || 0);
  const formattedHype = displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount.toString();

  if (variant === 'chapter-action-icon') {
    return (
      <button 
        onClick={handleHype}
        className="flex p-1.5 sm:p-2.5 rounded-full text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-all"
        title="Like Chapter"
      >
        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isHyped ? 'fill-red-500 text-red-500' : 'group-hover:text-red-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
      </button>
    );
  }

  if (variant === 'mini') {
    return (
      <button 
        onClick={handleHype}
        className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full transition-all border ${isHyped ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-zinc-900/80 border-zinc-800 hover:border-red-500/50'}`}
        title="Like this Chapter"
      >
        <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${isHyped ? 'fill-red-500 text-red-500' : 'text-zinc-500 group-hover:text-red-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
        <span className={`text-[8px] sm:text-[9px] font-bold transition-colors ${isHyped ? 'text-red-400' : 'text-zinc-300'}`}>{formattedHype}</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleHype}
        className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isHyped ? 'bg-red-500/20 border-red-500/30' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5'} border shadow-xl group flex items-center justify-center cursor-pointer`}
        title="Like this Page"
      >
        <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isHyped ? 'fill-red-500 text-red-500' : 'text-white/70 group-hover:text-white'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(239,68,68,1)]' : 'scale-100'}`} />
        {displayCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">
            {formattedHype}
          </span>
        )}
      </button>
    );
  }

  return (
    <button 
      onClick={handleHype}
      className={`flex items-center justify-center transition-all duration-300 group gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border cursor-pointer ${isHyped ? 'border-red-500 bg-zinc-900 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-red-500'}`}
    >
      <Heart className={`w-5 h-5 transition-all duration-300 ${isHyped ? 'fill-red-500 text-red-500' : 'group-hover:fill-red-500 text-zinc-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(239,68,68,1)]' : 'scale-100'}`} />
      <span>{formattedHype} LIKE</span>
    </button>
  );
};