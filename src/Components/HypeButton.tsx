import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, userId, initialCount = 0, bonusCount = 0, variant = 'default', onRequireAuth }: any) => {
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
  }, [userId, targetId]);

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
      else alert("Please log in or create a Free Account to drop hypes!");
      return;
    }

    if (isProcessing.current) return;
    isProcessing.current = true;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const previousIsHyped = isHyped;
    const targetString = String(targetId);

    setIsHyped(!previousIsHyped);
    setLocalCount((prev: number) => previousIsHyped ? Math.max(0, prev - 1) : prev + 1);

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
      console.error("Error saving hype to database:", error);
    }

    setTimeout(() => {
      if (isMounted.current) isProcessing.current = false;
    }, 500);
  };

  // --- THE FIX: We dynamically add the bonus page hypes to the core series hypes ---
  const displayCount = localCount + bonusCount;
  const formattedHype = displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount.toString();

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleHype}
        className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isHyped ? 'bg-[#fe9a00]/20' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'} border border-white/5 shadow-xl group flex items-center justify-center cursor-pointer`}
        title="Hype this Page"
      >
        <Flame 
          className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-white/70 group-hover:text-white'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} 
        />
        {displayCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">
            {formattedHype}
          </span>
        )}
      </button>
    );
  }

  return (
    <button 
      onClick={handleHype}
      className={`flex items-center justify-center transition-all duration-300 group gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border cursor-pointer ${isHyped ? 'border-[#fe9a00] bg-zinc-900 shadow-[0_0_15px_rgba(254,154,0,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-[#fe9a00]'}`}
    >
      <Flame 
        className={`w-5 h-5 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'group-hover:fill-[#fe9a00] text-zinc-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} 
      />
      <span>{formattedHype} HYPE</span>
    </button>
  );
};