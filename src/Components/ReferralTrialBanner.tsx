import React, { useState, useEffect, useRef } from 'react';
import { Clock, Sparkles, Gift, ArrowRight, X } from 'lucide-react';
import { supabase } from '../supabase';
import { getCreatorReferralCodeVariants } from '../MainViews/CreatorStudio';
import {
  getActiveReferralAttribution,
  REFERRAL_INVITE_DISMISSED_KEY
} from '../referralAttribution';

interface ReferralTrialBannerProps {
  currentUser: any;
  currentView: string;
  onManageClick: () => void;
}

const formatTrialCountdown = (diffMs: number): string => {
  if (diffMs <= 0) return '0m 00s';
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${minutes}m ${pad(seconds)}s`;
};

export const ReferralTrialBanner: React.FC<ReferralTrialBannerProps> = ({
  currentUser,
  currentView,
  onManageClick
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [resolvedCreatorName, setResolvedCreatorName] = useState<string>('');
  const [attributionTick, setAttributionTick] = useState(0);
  const [dismissedInviteCode, setDismissedInviteCode] = useState<string>(() => {
    try {
      return sessionStorage.getItem(REFERRAL_INVITE_DISMISSED_KEY) || '';
    } catch {
      return '';
    }
  });
  const hasTriggeredExpirySync = useRef(false);

  // Stage 2: Active Stripe Trial (Card is on file, 72h clock ticking)
  const isTrialing =
    Boolean(currentUser?.id) &&
    String(currentUser?.subscription_status || '').toLowerCase() === 'trialing' &&
    Boolean(currentUser?.trial_ends_at);

  const trialEndMs = currentUser?.trial_ends_at
    ? new Date(currentUser.trial_ends_at).getTime()
    : 0;

  const remainingMs = trialEndMs - nowMs;
  const isActiveStage2Trial = isTrialing && !isNaN(trialEndMs) && remainingMs > 0;

  // Stage 1: Creator Link Clicked, No Card on File Yet (Eligible for 3-Day Free Trial)
  const activeAttribution = getActiveReferralAttribution(currentUser);
  const hasAlreadyUsedTrial =
    Boolean(currentUser?.has_used_referral_trial) ||
    Boolean(currentUser?.trial_started_at) ||
    Boolean(currentUser?.trial_ends_at) ||
    Boolean(currentUser?.referral_commission_paid_at);

  const isEligibleStage1Invite =
    !isActiveStage2Trial &&
    !currentUser?.is_premium &&
    !hasAlreadyUsedTrial &&
    Boolean(activeAttribution?.code) &&
    dismissedInviteCode !== activeAttribution?.code;

  // Listen for live ?ref=VIP-... link clicks in the same tab
  useEffect(() => {
    const handleRefUpdate = () => {
      try {
        setDismissedInviteCode(sessionStorage.getItem(REFERRAL_INVITE_DISMISSED_KEY) || '');
      } catch {
        setDismissedInviteCode('');
      }
      setAttributionTick(t => t + 1);
    };
    window.addEventListener('referralAttributionUpdated', handleRefUpdate);
    window.addEventListener('profileUpdated', handleRefUpdate);
    return () => {
      window.removeEventListener('referralAttributionUpdated', handleRefUpdate);
      window.removeEventListener('profileUpdated', handleRefUpdate);
    };
  }, []);

  // Hide automatically when MangaReader opens for distraction-free reading
  useEffect(() => {
    const handleReaderToggle = (e: any) => {
      setIsReaderOpen(Boolean(e?.detail?.isOpen));
    };
    window.addEventListener('readerToggled', handleReaderToggle);
    return () => window.removeEventListener('readerToggled', handleReaderToggle);
  }, []);

  // Tick every second only while an active Stage 2 trial banner is visible
  useEffect(() => {
    if (!isActiveStage2Trial) return;
    hasTriggeredExpirySync.current = false;
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (trialEndMs > 0 && current >= trialEndMs && !hasTriggeredExpirySync.current) {
        hasTriggeredExpirySync.current = true;
        window.dispatchEvent(new Event('profileUpdated'));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActiveStage2Trial, trialEndMs]);

  // Resolve human-readable Creator Name for either Stage 1 or Stage 2
  const targetCodeToResolve = isActiveStage2Trial
    ? String(currentUser?.referred_by_code || '').trim().toUpperCase()
    : String(activeAttribution?.code || '').trim().toUpperCase();

  useEffect(() => {
    if (!isActiveStage2Trial && !isEligibleStage1Invite) return;

    if (isActiveStage2Trial) {
      const storedName = String(currentUser?.trial_referred_by_name || '').trim();
      if (storedName && !storedName.toUpperCase().startsWith('VIP-')) {
        setResolvedCreatorName(storedName);
        return;
      }
    }

    if (!targetCodeToResolve) {
      setResolvedCreatorName('a Saturday AM Creator');
      return;
    }

    let cancelled = false;
    supabase
      .from('series_creators')
      .select('name')
      .then(({ data }) => {
        if (cancelled) return;
        const match = (data || []).find((r: any) =>
          getCreatorReferralCodeVariants(r.name).includes(targetCodeToResolve)
        );
        if (match?.name) {
          setResolvedCreatorName(match.name);
        } else {
          setResolvedCreatorName(targetCodeToResolve.replace(/^VIP-/, ''));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isActiveStage2Trial,
    isEligibleStage1Invite,
    currentUser?.trial_referred_by_name,
    targetCodeToResolve,
    attributionTick
  ]);

  if (isReaderOpen || currentView === 'admin') {
    return null;
  }

  const displayCreator = resolvedCreatorName || 'Saturday AM Creator';

  // ============================================================================
  // STAGE 2 BANNER: CARD ON FILE • ACTIVE 72-HOUR TRIAL COUNTDOWN
  // ============================================================================
  if (isActiveStage2Trial) {
    const countdownText = formatTrialCountdown(remainingMs);
    return (
      <>
        <div className="fixed top-0 inset-x-0 z-[5500] h-9 sm:h-8 bg-zinc-950/95 backdrop-blur-md border-b border-[#fe9a00]/50 px-3 sm:px-5 flex items-center justify-between gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar text-[10px] sm:text-[11px] font-bold text-zinc-200 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-[#fe9a00] shrink-0" />
            <span>
              Welcome! Enjoy your <strong className="text-white">3-Day PLUS Trial</strong> via{' '}
              <strong className="text-[#fe9a00]">{displayCreator}</strong>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1 text-[#fe9a00] font-mono font-black">
              <Clock className="w-3 h-3 shrink-0" />
              {countdownText} left
            </span>
            <span className="text-zinc-600 hidden md:inline">•</span>
            <span className="text-zinc-400 hidden md:inline">
              Card billed <strong className="text-zinc-200">$20/yr</strong> after trial unless canceled
            </span>
            <span className="text-zinc-400 md:hidden">• $20/yr after unless canceled</span>
          </div>

          <button
            type="button"
            onClick={onManageClick}
            className="px-2.5 py-1 rounded-full bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase tracking-widest transition-colors shrink-0 cursor-pointer"
          >
            Manage
          </button>
        </div>
        <div className="h-9 sm:h-8 w-full shrink-0" />
      </>
    );
  }

  // ============================================================================
  // STAGE 1 BANNER: LINK CLICKED • NO CARD YET • INVITE TO CLAIM 3-DAY FREE TRIAL
  // ============================================================================
  if (isEligibleStage1Invite && !['sub', 'settings', 'legal'].includes(currentView)) {
    const handleClaimTrialClick = () => {
      window.history.pushState({ view: 'sub' }, '', '/?view=sub');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'sub' } }));
    };

    const handleDismissInvite = () => {
      const code = activeAttribution?.code || 'dismissed';
      setDismissedInviteCode(code);
      try {
        sessionStorage.setItem(REFERRAL_INVITE_DISMISSED_KEY, code);
      } catch {
        // Ignore storage errors
      }
    };

    return (
      <>
        <div className="fixed top-0 inset-x-0 z-[5500] h-9 sm:h-8 bg-gradient-to-r from-emerald-950/95 via-zinc-950/95 to-emerald-950/95 backdrop-blur-md border-b border-emerald-500/50 px-3 sm:px-5 flex items-center justify-between gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
          <div
            onClick={handleClaimTrialClick}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar text-[10px] sm:text-[11px] font-bold text-zinc-100 whitespace-nowrap cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-[#fe9a00]">{displayCreator}</strong> unlocked a{' '}
              <strong className="text-emerald-400">3-Day Free PLUS Trial</strong> for you!
            </span>
            <span className="text-zinc-400 hidden sm:inline">
              • Read the entire manga vault 100% ad-free
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClaimTrialClick}
              className="px-2.5 py-1 rounded-full bg-emerald-400 hover:bg-white text-black text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.35)]"
            >
              <span>Claim Trial</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={handleDismissInvite}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="h-9 sm:h-8 w-full shrink-0" />
      </>
    );
  }

  return null;
};