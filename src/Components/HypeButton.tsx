import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame, AlertTriangle } from 'lucide-react';
import { useHypeEconomy } from '../HypeEconomyContext';

export const HypeButton = ({ targetType, targetId, seriesSlug, userId, isPremium, initialCount = 0, bonusCount = 0, variant = 'default', onRequireAuth, onRequirePremium, onToggle }: any) => {
  const [hasHyped, setHasHyped] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOutOfHypes, setShowOutOfHypes] = useState(false); // NEW STATE FOR EMPTY MODAL

  const { hypesRemaining, isLoading, spendHype, spendSuperHype } = useHypeEconomy();

  const getDaysUntilReset = () => {
    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setUTCHours(0, 0, 0, 0);
    const daysUntilSaturday = (6 - now.getUTCDay() + 7) % 7;
    nextSaturday.setUTCDate(now.getUTCDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    return Math.ceil(Math.abs(nextSaturday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (userId && targetId) {
      const checkStatus = async () => {
        const table = variant === 'series-main' ? 'super_hypes' : 'hypes';
        const column = variant === 'series-main' ? 'series_slug' : 'target_id';
        const typeMatch = variant !== 'series-main' ? { target_type: targetType } : {};

        const { data } = await supabase.from(table).select('id').eq('user_id', userId).eq(column, String(targetId)).match(typeMatch).limit(1).maybeSingle();
        if (data) setHasHyped(true);
        setIsChecking(false);
      };
      checkStatus();
    } else {
      setIsChecking(false);
    }
  }, [userId, targetId, targetType, variant]);

  const initiateHype = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId) { if (onRequireAuth) onRequireAuth(); return; }
    if (variant === 'series-main' && !isPremium) { if (onRequirePremium) onRequirePremium(); return; }
    if (isChecking || isLoading) return;
    
    if (hypesRemaining <= 0) {
      setShowOutOfHypes(true); // TRIGGER IN-APP MODAL INSTEAD OF NATIVE ALERT
      return;
    }
    setShowConfirm(true);
  };

  const executeHype = async () => {
    setShowConfirm(false);
    
    const success = variant === 'series-main' 
      ? await spendSuperHype(String(targetId))
      : await spendHype(targetType, String(targetId), seriesSlug);

    if (success) {
      setHasHyped(true);
      if (onToggle) onToggle(true);
    } else {
      alert("Failed to drop Hype. Please check your connection.");
    }
  };

  const isOutOfHypes = hypesRemaining <= 0;
  const displayCount = initialCount + bonusCount + (hasHyped ? 1 : 0);

  // THE NEW IN-APP "EMPTY" MODAL
  const OutOfHypesModal = () => showOutOfHypes && (
    <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowOutOfHypes(false); }}>
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Out of Hypes</h2>
        <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8">
          You've used all your Hypes for the week! Your balance will automatically replenish on <span className="text-[#fe9a00]">Saturday EST</span>.
        </p>
        <button onClick={(e) => { e.stopPropagation(); setShowOutOfHypes(false); }} className="w-full bg-zinc-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-zinc-800 transition-colors shadow-lg">
          Got it
        </button>
      </div>
    </div>
  );

  const ConfirmationModal = () => showConfirm && (
    <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}>
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-[#fe9a00]/10 rounded-full flex items-center justify-center mb-4 border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
          <Flame className="w-8 h-8 text-[#fe9a00]" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Drop a Hype?</h2>
        <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-6">
          Are you sure you want to spend a Hype here? You can hype the same item multiple times!
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

  if (variant === 'series-main') {
    return (
      <>
        <button onClick={initiateHype} disabled={isLoading || (isPremium && isOutOfHypes)} className={`flex items-center justify-center gap-3 px-8 py-3 w-full rounded-full font-black uppercase tracking-widest transition-all ${(isOutOfHypes && isPremium) ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed' : hasHyped ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.2)] hover:bg-zinc-900' : 'bg-gradient-to-r from-yellow-500 to-[#fe9a00] text-black hover:scale-105 shadow-[0_0_20px_rgba(254,154,0,0.4)]'}`}>
          <Flame className={`w-5 h-5 ${(isOutOfHypes && isPremium) ? 'fill-zinc-500 text-zinc-500' : hasHyped ? 'fill-[#fe9a00]' : 'fill-black'}`} />
          <div className="flex flex-col text-left">
            <span className="leading-tight">{!isPremium ? 'SUBSCRIBE TO HYPE' : (isOutOfHypes ? 'OUT OF HYPES' : hasHyped ? 'HYPE AGAIN' : 'HYPE THIS SERIES')}</span>
            <span className={`text-[9px] font-bold opacity-80 leading-tight ${hasHyped && !isOutOfHypes ? 'text-zinc-400' : ''}`}>{!isPremium ? 'Pro Exclusive Feature' : (!isLoading ? `${hypesRemaining} Left • Resets in ${getDaysUntilReset()}d` : 'Loading...')}</span>
          </div>
        </button>
        <ConfirmationModal />
        <OutOfHypesModal />
      </>
    );
  }

  if (variant === 'creator') {
    return (
      <>
        <button onClick={initiateHype} disabled={isLoading} className={`flex items-center justify-center gap-2 w-full transition-all px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest border ${hasHyped ? 'bg-zinc-800 text-[#fe9a00] border-[#fe9a00]' : 'bg-black text-white border-zinc-700 hover:border-white hover:text-white'}`}>
          <Flame className={`w-4 h-4 ${hasHyped ? 'fill-[#fe9a00]' : ''}`} />
          {hasHyped ? 'HYPE AGAIN' : 'HYPE CREATOR'}
        </button>
        <ConfirmationModal />
        <OutOfHypesModal />
      </>
    );
  }

  if (variant === 'icon' || variant === 'chapter-hype-icon') {
    return (
      <>
        <button onClick={initiateHype} disabled={isLoading} className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${hasHyped ? 'bg-[#fe9a00]/20 border-[#fe9a00]/30' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5'} border shadow-xl flex items-center justify-center cursor-pointer`} title="Drop Hype">
          <Flame className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${hasHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-zinc-500 hover:text-[#fe9a00]'}`} />
          {variant === 'icon' && displayCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">{displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount}</span>}
        </button>
        <ConfirmationModal />
        <OutOfHypesModal />
      </>
    );
  }

  return (
    <>
      <button onClick={initiateHype} disabled={isLoading} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase tracking-widest transition-all text-xs ${hasHyped ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]' : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'}`}>
        <Flame className={`w-4 h-4 ${hasHyped ? 'fill-[#fe9a00]' : ''}`} />
        {hasHyped ? 'HYPE AGAIN' : 'HYPE'}
      </button>
      <ConfirmationModal />
      <OutOfHypesModal />
    </>
  );
};