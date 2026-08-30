import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Heart, Flame } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, seriesSlug, userId, initialCount = 0, bonusCount = 0, variant = 'default', onRequireAuth, onToggle }: any) => {
  const [isHyped, setIsHyped] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [hypesRemaining, setHypesRemaining] = useState(5); 
  
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
    
    const { data } = await supabase.from('hypes').select('id').eq('user_id', userId).eq('target_type', targetType).eq('target_id', targetString).limit(1).maybeSingle();
    
    if (isMounted.current && !isProcessing.current) {
      if (data) setIsHyped(true);
      else setIsHyped(false);
    }

    const { count } = await supabase.from('hypes').select('*', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetString);

    if (isMounted.current && !isProcessing.current) {
      if (count !== null && count > 0) {
        setLocalCount(count);
      } else if (initialCount > 0 && count === 0) {
        setLocalCount(initialCount); 
      }
    }
  };

  const initiateHype = (e: any) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      else alert("Please log in or create a Free Account to hype this!");
      return;
    }
    
    if (hypesRemaining <= 0) {
      alert("You are out of Hypes! They will automatically replenish this Saturday.");
      return;
    }

    if (isProcessing.current) return;
    setShowConfirm(true); 
  };

  const executeHype = async () => {
    setShowConfirm(false);
    isProcessing.current = true;
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const targetString = String(targetId);

    setIsHyped(true); 
    setLocalCount((prev: number) => prev + 1);
    
    if (hypesRemaining > 0) {
      setHypesRemaining(prev => prev - 1);
    }

    if (onToggle) onToggle(true);

    try {
      await supabase.from('hypes').insert([{ user_id: userId, target_type: targetType, target_id: targetString }]);
      
      supabase.from('profiles').select('total_hypes, fandom_score').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data) {
          supabase.from('profiles').update({ 
            total_hypes: data.total_hypes + 1,
            fandom_score: (data.fandom_score || 0) + 5
          }).eq('id', userId).then();
        }
      });

      // --- NEW: INJECT SCORE DIRECTLY INTO THE SERIES BIG 3 TRACKER ---
      if (seriesSlug) {
        supabase.from('series').select('weekly_hype, total_hype').eq('slug', seriesSlug).maybeSingle().then(({ data: seriesData }) => {
          if (seriesData) {
            supabase.from('series').update({
              weekly_hype: (seriesData.weekly_hype || 0) + 5,
              total_hype: (seriesData.total_hype || 0) + 5
            }).eq('slug', seriesSlug).then();
          }
        });
      }

    } catch (error) {
      console.error("Error saving hype to database:", error);
    }

    setTimeout(() => { if (isMounted.current) isProcessing.current = false; }, 500);
  };

  const displayCount = localCount + (bonusCount || 0);
  const formattedHype = displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount.toString();

  const ConfirmationModal = () => showConfirm && (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}>
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-[#fe9a00]/10 rounded-full flex items-center justify-center mb-4 border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
          <Flame className="w-8 h-8 text-[#fe9a00]" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Drop a Hype?</h2>
        <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-6">
          Are you sure you want to spend a Hype on this? You can hype the same item multiple times!
        </p>
        <div className="bg-zinc-900 w-full py-3 rounded-lg border border-zinc-800 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Balance</p>
          <p className="text-lg font-black text-white">{hypesRemaining} <span className="text-[#fe9a00]">Remaining</span></p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }} className="flex-1 bg-zinc-900 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
          <button onClick={(e) => { e.stopPropagation(); executeHype(); }} className="flex-1 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]">Confirm</button>
        </div>
      </div>
    </div>
  );

  // THE NEW FLAME ICON FOR THE CHAPTER ROW
  if (variant === 'chapter-hype-icon') {
    return (
      <>
        <button onClick={initiateHype} className="flex p-1.5 sm:p-2.5 rounded-full text-zinc-500 hover:text-[#fe9a00] hover:bg-zinc-800 transition-all" title="Hype Chapter">
          <Flame className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'group-hover:text-[#fe9a00]'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
        </button>
        <ConfirmationModal />
      </>
    );
  }

  if (variant === 'chapter-action-icon') {
    return (
      <>
        <button onClick={initiateHype} className="flex p-1.5 sm:p-2.5 rounded-full text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-all" title="Like Chapter">
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isHyped ? 'fill-red-500 text-red-500' : 'group-hover:text-red-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
        </button>
        <ConfirmationModal />
      </>
    );
  }

  if (variant === 'mini') {
    return (
      <>
        <button onClick={initiateHype} className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full transition-all border ${isHyped ? 'bg-[#fe9a00]/10 border-[#fe9a00]/30 shadow-[0_0_8px_rgba(254,154,0,0.3)]' : 'bg-zinc-900/80 border-zinc-800 hover:border-[#fe9a00]/50'}`} title="Hype this Chapter">
          <Flame className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-zinc-500 group-hover:text-[#fe9a00]'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
          <span className={`text-[8px] sm:text-[9px] font-bold transition-colors ${isHyped ? 'text-[#fe9a00]' : 'text-zinc-300'}`}>{formattedHype}</span>
        </button>
        <ConfirmationModal />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <button onClick={initiateHype} className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isHyped ? 'bg-[#fe9a00]/20 border-[#fe9a00]/30' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5'} border shadow-xl group flex items-center justify-center cursor-pointer`} title="Hype this Page">
          <Flame className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-white/70 group-hover:text-white'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} />
          {displayCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">{formattedHype}</span>}
        </button>
        <ConfirmationModal />
      </>
    );
  }

  return (
    <>
      <button onClick={initiateHype} className={`flex items-center justify-center transition-all duration-300 group gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border cursor-pointer ${isHyped ? 'border-[#fe9a00] bg-[#fe9a00]/10 shadow-[0_0_15px_rgba(254,154,0,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-[#fe9a00]'}`}>
        <Flame className={`w-5 h-5 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'group-hover:fill-[#fe9a00] text-zinc-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} />
        <span className={isHyped ? 'text-[#fe9a00]' : 'text-white'}>{formattedHype} {isHyped ? 'HYPE AGAIN' : 'HYPE'}</span>
      </button>
      <ConfirmationModal />
    </>
  );
};