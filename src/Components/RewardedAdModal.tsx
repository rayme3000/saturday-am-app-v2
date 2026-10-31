import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Volume2,
  VolumeX,
  ExternalLink,
  Zap,
  Lock,
  CheckCircle2,
  Sparkles,
  Film
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  DEFAULT_HOUSE_AD_CAMPAIGNS,
  HouseAdVisualSlide,
  loadSavedHouseAdCampaigns
} from '../AmCommandCenter/HouseAdBuilder';
import type { HouseAdCampaign } from '../AmCommandCenter/HouseAdBuilder';

const STORAGE_ENABLED_KEY = 'am_rewarded_ads_enabled_v2';
const STORAGE_ROTATION_KEY = 'am_house_ad_rotation_idx';
const GLOBAL_CONFIG_PATH = 'house-ads/global_config.json';

export const AD_UNLOCK_DURATION_MS = 12 * 60 * 60 * 1000; // 12 Hours
export const MAX_DAILY_AD_UNLOCKS = 3; // Max 3 ad unlocks per 24h rolling window
const LOCAL_UNLOCK_TIMESTAMPS_KEY = 'am_temp_unlock_timestamps_v2';

// Helper: Read local unlock timestamps map { [chapterId]: timestampMs }
export const getLocalUnlockTimestamps = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(LOCAL_UNLOCK_TIMESTAMPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
};

// Helper: Record a new chapter unlock timestamp locally
export const recordLocalChapterUnlock = (chapterId: string | number) => {
  try {
    const current = getLocalUnlockTimestamps();
    current[String(chapterId)] = Date.now();
    localStorage.setItem(LOCAL_UNLOCK_TIMESTAMPS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
};

export const isRewardedAdsFeatureEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_ENABLED_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore
  }
  return false;
};

export const setRewardedAdsFeatureEnabledLocal = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('rewardedAdsConfigChanged', { detail: { enabled } })
    );
  } catch {
    // ignore
  }
};

export const syncRewardedAdsGlobalConfig = async (): Promise<{
  enabled: boolean;
  campaigns?: HouseAdCampaign[];
}> => {
  try {
    const { data } = supabase.storage.from('assets').getPublicUrl(GLOBAL_CONFIG_PATH);
    if (data?.publicUrl) {
      const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const enabled = Boolean(json?.rewardedAdsEnabled);
        localStorage.setItem(STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
        if (Array.isArray(json?.campaigns) && json.campaigns.length > 0) {
          localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(json.campaigns));
        }
        return { enabled, campaigns: json?.campaigns };
      }
    }
  } catch {
    // Fallback to local storage state
  }
  return {
    enabled: isRewardedAdsFeatureEnabled(),
    campaigns: loadSavedHouseAdCampaigns()
  };
};

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: () => void;
  onUpgradeClick: () => void;
  chapterNumber?: number | string;
  seriesTitle?: string;
  dailyUnlocksUsed?: number;
  maxDailyUnlocks?: number;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
  onUpgradeClick,
  chapterNumber,
  seriesTitle,
  dailyUnlocksUsed = 0,
  maxDailyUnlocks = MAX_DAILY_AD_UNLOCKS
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const [adSourceMode, setAdSourceMode] = useState<'checking_gam' | 'in_house'>('in_house');
  const [activeCampaign, setActiveCampaign] = useState<HouseAdCampaign>(
    () => DEFAULT_HOUSE_AD_CAMPAIGNS[0]
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pick the next active campaign in rotation when the modal opens (prioritizing video campaigns on first view)
  useEffect(() => {
    if (!isOpen) return;

    setSecondsLeft(15);
    setIsCompleted(false);
    setVideoFailed(false);

    const allCampaigns = loadSavedHouseAdCampaigns().filter(c => c.enabled !== false);
    const pool = allCampaigns.length > 0 ? allCampaigns : DEFAULT_HOUSE_AD_CAMPAIGNS;

    let nextIdx = 0;
    try {
      const savedIdx = parseInt(localStorage.getItem(STORAGE_ROTATION_KEY) || '0', 10);
      nextIdx = isNaN(savedIdx) ? 0 : savedIdx % pool.length;
      localStorage.setItem(STORAGE_ROTATION_KEY, String((nextIdx + 1) % pool.length));
    } catch {
      nextIdx = 0;
    }

    setActiveCampaign(pool[nextIdx] || pool[0]);

    // GAM / Ad Network Waterfall Check:
    // If Google Publisher Tags (GAM) rewarded ad slot is configured on window, attempt GAM fill first;
    // on no-fill, ad-blocker, or if GAM is not yet configured, immediately run the In-House campaign!
    const win = window as any;
    if (win.googletag && win.amGamRewardedSlotReady) {
      setAdSourceMode('checking_gam');
      const fallbackTimer = setTimeout(() => {
        setAdSourceMode('in_house');
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    } else {
      setAdSourceMode('in_house');
    }
  }, [isOpen]);

  // 15-Second Countdown Timer
  useEffect(() => {
    if (!isOpen || adSourceMode === 'checking_gam') return;

    if (secondsLeft <= 0) {
      setIsCompleted(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsLeft, adSourceMode]);

  // Ensure video plays smoothly when modal opens (falls back to muted autoplay if browser blocks unmuted autoplay)
  useEffect(() => {
    if (!isOpen || !activeCampaign?.videoUrl || videoFailed) return;
    const vid = videoRef.current;
    if (!vid) return;

    vid.currentTime = 0;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            setVideoFailed(true);
          });
        }
      });
    }
  }, [isOpen, activeCampaign?.videoUrl, videoFailed]);

  const progressPercentage = useMemo(() => {
    return Math.min(100, Math.max(0, ((15 - secondsLeft) / 15) * 100));
  }, [secondsLeft]);

  if (!isOpen) return null;

  const remainingAfterThis = Math.max(0, maxDailyUnlocks - dailyUnlocksUsed - 1);
  const hasActiveVideo = Boolean(activeCampaign?.videoUrl && !videoFailed);

  const handleCtaClick = () => {
    if (activeCampaign.actionType === 'in_app_plus_upgrade') {
      onUpgradeClick();
      return;
    }
    if (activeCampaign.clickUrl) {
      window.open(activeCampaign.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[8500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-zinc-950 border-2 border-[#fe9a00]/60 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(254,154,0,0.2)] flex flex-col relative">
        {/* TOP STATUS HEADER BAR */}
        <div className="px-4 sm:px-6 py-3.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              {hasActiveVideo ? <Film className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {activeCampaign.badge || 'Saturday AM Spotlight'}
            </span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-200">
              {isCompleted
                ? `Chapter ${chapterNumber || ''} Unlocked (12h)!`
                : `Unlocking Ch. ${chapterNumber || ''} in ${secondsLeft}s...`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Daily Ad Unlock Counter Pill */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 border border-zinc-700 text-[9px] font-black uppercase tracking-widest text-zinc-300">
              <Zap className="w-3 h-3 text-[#fe9a00]" />
              Daily Unlocks: {Math.max(0, maxDailyUnlocks - dailyUnlocksUsed)}/{maxDailyUnlocks} Left
            </span>

            {hasActiveVideo && (
              <button
                type="button"
                onClick={() => setIsMuted(prev => !prev)}
                className="p-2 rounded-full bg-black/80 border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#fe9a00]" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-black/80 border border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 16:9 VIDEO OR VISUAL SPOTLIGHT STAGE */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          {hasActiveVideo ? (
            <video
              ref={videoRef}
              key={activeCampaign.videoUrl}
              src={activeCampaign.videoUrl}
              autoPlay
              playsInline
              muted={isMuted}
              loop
              onError={() => setVideoFailed(true)}
              onClick={handleCtaClick}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : (
            <div onClick={handleCtaClick} className="w-full h-full cursor-pointer">
              <HouseAdVisualSlide ad={activeCampaign} />
            </div>
          )}

          {/* Subtle Bottom Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/90 z-30">
            <div
              className="h-full bg-gradient-to-r from-[#fe9a00] to-yellow-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* CAMPAIGN INFO & ACTION FOOTER */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-t border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                {activeCampaign.badge}
              </p>
              <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white truncate">
                {activeCampaign.headline}
              </h3>
              <p className="text-xs text-zinc-400 font-bold truncate">
                {activeCampaign.subheadline}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCtaClick}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-white text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 font-black uppercase uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
            >
              <span>{activeCampaign.ctaLabel || 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PRIMARY UNLOCK OR UPGRADE ACTIONS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              disabled={!isCompleted}
              onClick={onRewardEarned}
              className={`flex-1 py-3.5 px-5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
                isCompleted
                  ? 'bg-[#fe9a00] hover:bg-white text-black shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Read {seriesTitle ? `${seriesTitle} ` : ''}Ch. {chapterNumber} Now (12h Unlock)
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 animate-pulse text-[#fe9a00]" />
                  <span>Wait {secondsLeft}s to Unlock Chapter (12h)...</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onUpgradeClick}
              className="py-3.5 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Skip Ads • Go PLUS ($1.99)</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest pt-1">
            <span>12-Hour Chapter Access</span>
            <span>
              {isCompleted
                ? `${remainingAfterThis} of ${maxDailyUnlocks} daily ad unlocks remaining after this`
                : `Daily Unlocks Remaining Today: ${Math.max(0, maxDailyUnlocks - dailyUnlocksUsed)}/${maxDailyUnlocks}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};