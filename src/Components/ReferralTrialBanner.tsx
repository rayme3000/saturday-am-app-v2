import React, { useState, useEffect, useRef } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { getCreatorReferralCodeVariants } from '../MainViews/CreatorStudio';

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
  const hasTriggeredExpirySync = useRef(false);

  const isTrialing =
    Boolean(currentUser?.id) &&
    String(currentUser?.subscription_status || '').toLowerCase() === 'trialing' &&
    Boolean(currentUser?.trial_ends_at);

  const trialEndMs = currentUser?.trial_ends_at
    ? new Date(currentUser.trial_ends_at).getTime()
    : 0;

  const remainingMs = trialEndMs - nowMs;

  // Hide automatically when MangaReader opens for distraction-free reading
  useEffect(() => {
    const handleReaderToggle = (e: any) => {
      setIsReaderOpen(Boolean(e?.detail?.isOpen));
    };
    window.addEventListener('readerToggled', handleReaderToggle);
    return () => window.removeEventListener('readerToggled', handleReaderToggle);
  }, []);

  // Tick every second only while an active trial banner is visible
  useEffect(() => {
    if (!isTrialing || remainingMs <= 0) return;
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
  }, [isTrialing, trialEndMs, remainingMs]);

  // Resolve human-readable Creator Name from trial_referred_by_name or VIP-... code
  useEffect(() => {
    if (!isTrialing) return;

    const storedName = String(currentUser?.trial_referred_by_name || '').trim();
    if (storedName && !storedName.toUpperCase().startsWith('VIP-')) {
      setResolvedCreatorName(storedName);
      return;
    }

    const code = String(currentUser?.referred_by_code || storedName || '')
      .trim()
      .toUpperCase();
    if (!code) {
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
          getCreatorReferralCodeVariants(r.name).includes(code)
        );
        if (match?.name) {
          setResolvedCreatorName(match.name);
        } else {
          setResolvedCreatorName(code.replace(/^VIP-/, ''));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isTrialing, currentUser?.trial_referred_by_name, currentUser?.referred_by_code]);

  if (
    !isTrialing ||
    isNaN(trialEndMs) ||
    remainingMs <= 0 ||
    isReaderOpen ||
    currentView === 'admin'
  ) {
    return null;
  }

  const displayCreator = resolvedCreatorName || 'Saturday AM Creator';
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
          <span className="text-zinc-400 md:hidden">
            • $20/yr after unless canceled
          </span>
        </div>

        <button
          type="button"
          onClick={onManageClick}
          className="px-2.5 py-1 rounded-full bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase tracking-widest transition-colors shrink-0 cursor-pointer"
        >
          Manage
        </button>
      </div>
      {/* Subtle spacer so top page buttons are never covered while banner is active */}
      <div className="h-9 sm:h-8 w-full shrink-0" />
    </>
  );
};