import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { AlertTriangle, Sparkles, ShoppingBag } from 'lucide-react';
import { useHypeEconomy } from '../HypeEconomyContext';

export const HypeButton = ({
  targetType,
  targetId,
  seriesSlug,
  userId,
  isPremium,
  initialCount = 0,
  bonusCount = 0,
  variant = 'default',
  onRequireAuth,
  onRequirePremium,
  onOpenShop,
  onToggle
}: any) => {
  const [hasHyped, setHasHyped] = useState(false);
  const [sessionHypesAdded, setSessionHypesAdded] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOutOfHypes, setShowOutOfHypes] = useState(false);

  const {
    hypesRemaining,
    vaultedHypes,
    totalAvailableHypes,
    isLoading,
    spendHype,
    spendSuperHype
  } = useHypeEconomy();

  const isSpendingVaultedGold = hypesRemaining <= 0 && vaultedHypes > 0;
  const resolvedSeriesKey = String(seriesSlug || (targetType === 'series' ? targetId : '') || '');

  const navigateToStore = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowOutOfHypes(false);
    if (onOpenShop) {
      onOpenShop();
      return;
    }
    window.location.href = `${window.location.origin}/?view=shop`;
  };

  const getDaysUntilReset = () => {
    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setUTCHours(0, 0, 0, 0);
    const daysUntilSaturday = (6 - now.getUTCDay() + 7) % 7;
    nextSaturday.setUTCDate(now.getUTCDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    return Math.ceil(Math.abs(nextSaturday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    setHasHyped(false);
    setSessionHypesAdded(0);
    setShowConfirm(false);
    setShowOutOfHypes(false);

    if (userId && targetId) {
      setIsChecking(true);
      const checkStatus = async () => {
        const table = variant === 'series-main' ? 'super_hypes' : 'hypes';
        const column = variant === 'series-main' ? 'series_slug' : 'target_id';
        const typeMatch = variant !== 'series-main' ? { target_type: targetType } : {};

        const { data } = await supabase
          .from(table)
          .select('id')
          .eq('user_id', userId)
          .eq(column, String(targetId))
          .match(typeMatch)
          .limit(1)
          .maybeSingle();

        if (data) setHasHyped(true);
        setIsChecking(false);
      };
      checkStatus();
    } else {
      setIsChecking(false);
    }
  }, [userId, targetId, targetType, variant]);

  useEffect(() => {
    const handleLiveHypeAdded = (e: any) => {
      const detail = e?.detail || {};
      const sameTarget =
        String(detail.targetId) === String(targetId) &&
        String(detail.targetType) === String(targetType);
      const sameSeries =
        resolvedSeriesKey &&
        detail.seriesKey &&
        String(detail.seriesKey) === resolvedSeriesKey &&
        (targetType === 'series' || variant === 'series-main');

      if (sameTarget || sameSeries) {
        setHasHyped(true);
        setSessionHypesAdded(prev => prev + 1);
      }
    };

    window.addEventListener('liveHypeDropped', handleLiveHypeAdded);
    return () => window.removeEventListener('liveHypeDropped', handleLiveHypeAdded);
  }, [targetId, targetType, resolvedSeriesKey, variant]);

  const initiateHype = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isChecking || isLoading) return;

    // Always open the OutOfHypesModal so both Free and PLUS users see the Store + Creator Support CTA
    if (totalAvailableHypes <= 0) {
      setShowOutOfHypes(true);
      return;
    }
    setShowConfirm(true);
  };

  const executeHype = async () => {
    setShowConfirm(false);

    const success =
      variant === 'series-main'
        ? await spendSuperHype(String(targetId))
        : await spendHype(targetType, String(targetId), seriesSlug);

    if (success) {
      window.dispatchEvent(
        new CustomEvent('liveHypeDropped', {
          detail: {
            targetId: String(targetId),
            targetType: variant === 'series-main' ? 'series' : targetType,
            seriesKey: resolvedSeriesKey || String(targetId)
          }
        })
      );
      window.dispatchEvent(new Event('hypeUpdated'));
      if (onToggle) onToggle(true);
    } else {
      alert('Failed to drop Hype. Please check your connection.');
    }
  };

  const isOutOfHypes = totalAvailableHypes <= 0;
  const displayCount = initialCount + bonusCount + sessionHypesAdded;

  const defaultButtonLabel =
    targetType === 'character'
      ? 'HYPE CHARACTER'
      : targetType === 'creator'
      ? 'HYPE CREATOR'
      : targetType === 'series'
      ? 'HYPE SERIES'
      : 'HYPE CHAPTER';

  const fullIconUrl =
    'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';
  const iconMaskStyle = {
    WebkitMaskImage: `url('${fullIconUrl}')`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: `url('${fullIconUrl}')`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center'
  };

  const OutOfHypesModal = () => {
    if (!showOutOfHypes || typeof document === 'undefined') return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
        onClick={e => {
          e.stopPropagation();
          setShowOutOfHypes(false);
        }}
      >
        <div
          className="bg-zinc-950 border-2 border-[#fe9a00] p-7 sm:p-8 rounded-3xl w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-[#fe9a00]/15 rounded-full flex items-center justify-center mb-4 border border-[#fe9a00]/40 shadow-[0_0_25px_rgba(254,154,0,0.3)]">
            <AlertTriangle className="w-8 h-8 text-[#fe9a00]" />
          </div>

          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
            Out of Active Hypes!
          </h2>

          <p className="text-zinc-300 text-xs sm:text-sm font-bold leading-relaxed mb-4">
            Your weekly Active Hypes refill in <span className="text-[#fe9a00]">{getDaysUntilReset()}d</span>. Don&apos;t want to wait? Check out the <span className="text-white font-black">AM Digital Store</span>!
          </p>

          <div className="w-full bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/60 border border-yellow-400/50 rounded-2xl p-4 mb-5 text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-300">
              <Sparkles className="w-3.5 h-3.5" /> Support Creators & Stack Gold Hypes
            </div>
            <p className="text-[11px] text-zinc-300 font-bold leading-snug">
              Every bundle purchase directly supports a Saturday AM creator and gives you <span className="text-yellow-300 font-black">Permanent Vaulted Gold Hypes</span> that never expire!
            </p>
          </div>

          <button
            onClick={navigateToStore}
            className="w-full bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.4)] mb-2.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            Visit AM Store (+Gold Hypes)
          </button>

          {!isPremium && onRequirePremium && (
            <button
              onClick={e => {
                e.stopPropagation();
                setShowOutOfHypes(false);
                onRequirePremium();
              }}
              className="w-full bg-zinc-900 border border-[#fe9a00]/50 text-[#fe9a00] hover:bg-[#fe9a00] hover:text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-colors mb-2.5 cursor-pointer"
            >
              Upgrade to PLUS ($1.99/mo • 3 Weekly Hypes)
            </button>
          )}

          <button
            onClick={e => {
              e.stopPropagation();
              setShowOutOfHypes(false);
            }}
            className="w-full bg-zinc-900/60 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>,
      document.body
    );
  };

  const ConfirmationModal = () => {
    if (!showConfirm || typeof document === 'undefined') return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
        onClick={e => {
          e.stopPropagation();
          setShowConfirm(false);
        }}
      >
        <div
          className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${
              isSpendingVaultedGold
                ? 'bg-amber-500/15 border-yellow-300 shadow-[0_0_25px_rgba(253,224,71,0.35)]'
                : 'bg-[#fe9a00]/10 border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)]'
            }`}
          >
            <div
              className={`w-10 h-10 ${
                isSpendingVaultedGold
                  ? 'bg-gradient-to-t from-amber-400 via-yellow-200 to-white drop-shadow-[0_0_10px_rgba(253,224,71,0.9)]'
                  : 'bg-[#fe9a00] drop-shadow-[0_0_8px_rgba(254,154,0,0.8)]'
              }`}
              style={iconMaskStyle}
            />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
            {isSpendingVaultedGold ? 'Drop a Vaulted Gold Hype?' : 'Drop a Hype?'}
          </h2>
          <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-5">
            {targetType === 'character'
              ? 'Are you sure you want to spend a Hype on this character?'
              : targetType === 'creator'
              ? 'Are you sure you want to spend a Hype on this creator?'
              : 'Are you sure you want to spend a Hype here?'}
          </p>

          <div className="bg-zinc-900 w-full py-3 px-4 rounded-xl border border-zinc-800 mb-6 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
              Wallet Balance (Active Spent First)
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-black text-white">
                {hypesRemaining} <span className="text-[#fe9a00]">Active</span>
              </span>
              {vaultedHypes > 0 && (
                <span className="text-sm font-black text-yellow-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> +{vaultedHypes} Vaulted Gold
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={e => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
              className="flex-1 bg-zinc-900 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                executeHype();
              }}
              className={`flex-1 font-black uppercase tracking-widest py-3 rounded-xl transition-colors cursor-pointer ${
                isSpendingVaultedGold
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black hover:from-white hover:to-white shadow-[0_0_20px_rgba(253,224,71,0.4)]'
                  : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (variant === 'series-main') {
    return (
      <>
        <div className="w-full space-y-2.5">
          <button
            onClick={initiateHype}
            disabled={isLoading}
            className={`flex items-center justify-center gap-4 px-8 py-3.5 w-full rounded-full font-black uppercase tracking-widest transition-all cursor-pointer ${
              isOutOfHypes
                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-[#fe9a00] hover:text-white'
                : hasHyped
                ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.2)] hover:bg-zinc-900'
                : 'bg-gradient-to-r from-yellow-500 to-[#fe9a00] text-black hover:scale-105 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
            }`}
          >
            <div
              className={`w-7 h-7 flex-shrink-0 ${
                isOutOfHypes ? 'bg-zinc-500' : hasHyped ? 'bg-[#fe9a00]' : 'bg-black'
              }`}
              style={iconMaskStyle}
            />
            <div className="flex flex-col text-left">
              <span className="leading-tight text-sm sm:text-base">
                {isOutOfHypes
                  ? 'OUT OF HYPES • GET MORE'
                  : hasHyped
                  ? 'HYPE AGAIN'
                  : 'HYPE THIS SERIES'}
              </span>
              <span
                className={`text-[10px] font-bold opacity-80 leading-tight ${
                  hasHyped && !isOutOfHypes ? 'text-zinc-400' : ''
                }`}
              >
                {!isLoading
                  ? `${hypesRemaining} Active${
                      vaultedHypes > 0 ? ` (+${vaultedHypes} Gold)` : ''
                    } • Resets in ${getDaysUntilReset()}d`
                  : 'Loading...'}
              </span>
            </div>
          </button>

          {/* INLINE STORE CTA BANNER WHEN USER IS AT 0 HYPES */}
          {!isLoading && isOutOfHypes && userId && (
            <div
              onClick={navigateToStore}
              className="w-full bg-gradient-to-r from-zinc-950 via-amber-950/35 to-zinc-950 border border-[#fe9a00]/60 hover:border-yellow-300 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 cursor-pointer transition-all shadow-[0_0_20px_rgba(254,154,0,0.15)] group"
            >
              <div className="text-center sm:text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center justify-center sm:justify-start gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> Want More Hypes Right Now?
                </div>
                <p className="text-[10px] text-zinc-300 font-bold leading-snug mt-0.5">
                  Every Store Bundle directly supports a creator &amp; gives you more Hypes!
                </p>
              </div>
              <span className="px-3.5 py-2 rounded-xl bg-[#fe9a00] group-hover:bg-white text-black font-black uppercase tracking-widest text-[9px] flex items-center gap-1.5 shrink-0 shadow-md transition-colors">
                <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" /> Visit Store
              </span>
            </div>
          )}
        </div>
        <ConfirmationModal />
        <OutOfHypesModal />
      </>
    );
  }

  if (variant === 'creator') {
    return (
      <>
        <button
          onClick={initiateHype}
          disabled={isLoading}
          className={`flex items-center justify-center gap-2 w-full transition-all px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest border cursor-pointer ${
            hasHyped
              ? 'bg-zinc-800 text-[#fe9a00] border-[#fe9a00]'
              : 'bg-black text-white border-zinc-700 hover:border-white hover:text-white'
          }`}
        >
          <div
            className={`w-5 h-5 flex-shrink-0 ${hasHyped ? 'bg-[#fe9a00]' : 'bg-white'}`}
            style={iconMaskStyle}
          />
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
        <button
          onClick={initiateHype}
          disabled={isLoading}
          className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${
            hasHyped
              ? 'bg-[#fe9a00]/20 border-[#fe9a00]/30'
              : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5'
          } border shadow-xl flex items-center justify-center cursor-pointer group`}
          title="Drop Hype"
        >
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-colors duration-300 ${
              hasHyped ? 'bg-[#fe9a00]' : 'bg-zinc-500 group-hover:bg-[#fe9a00]'
            }`}
            style={iconMaskStyle}
          />
          {variant === 'icon' && displayCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">
              {displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount}
            </span>
          )}
        </button>
        <ConfirmationModal />
        <OutOfHypesModal />
      </>
    );
  }

  return (
    <>
      <button
        onClick={initiateHype}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-full font-black uppercase tracking-widest transition-all text-[11px] sm:text-xs cursor-pointer transform-gpu backface-hidden whitespace-nowrap ${
          hasHyped
            ? 'bg-zinc-800 text-[#fe9a00] border-2 border-[#fe9a00] hover:bg-zinc-900'
            : 'bg-[#fe9a00] border-2 border-[#fe9a00] text-black hover:bg-white hover:border-white shadow-[0_0_15px_rgba(254,154,0,0.3)] group'
        }`}
      >
        <div
          className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
            hasHyped ? 'bg-[#fe9a00]' : 'bg-black group-hover:bg-black'
          }`}
          style={iconMaskStyle}
        />
        <span>{hasHyped ? 'HYPE AGAIN' : defaultButtonLabel}</span>
      </button>
      <ConfirmationModal />
      <OutOfHypesModal />
    </>
  );
};