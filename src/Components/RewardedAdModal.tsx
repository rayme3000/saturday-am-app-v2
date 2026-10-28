import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  ExternalLink,
  X,
  ShoppingBag,
  Gamepad2,
  Zap
} from 'lucide-react';
import { supabase } from '../supabase';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: () => Promise<void> | void;
  onUpgradeClick: () => void;
  chapterNumber?: number;
  seriesTitle?: string;
}

export interface HouseAdCampaign {
  id: string;
  enabled?: boolean;
  badge: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  ctaLabel: string;
  videoUrl?: string;
  backgroundImageUrl?: string;
  logoImageUrl?: string;
  featureImageUrl?: string;
  bgOverlayOpacity?: number; // 0 to 95
  accentColor?: string;
  clickUrl?: string;
  actionType: 'external_url' | 'in_app_plus_upgrade';
}

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';
const GOOGLE_REWARDED_AD_UNIT_PATH = '';
const GLOBAL_CONFIG_PATH = 'house-ads/global_config.json';

// Defaults to FALSE (Disabled) so you can push code live while still working on your ads!
export const isRewardedAdsFeatureEnabled = (): boolean => {
  try {
    const val = localStorage.getItem('am_rewarded_ads_enabled');
    if (val === null) return false; // Default OFF until explicitly enabled
    return val === 'true';
  } catch {
    return false;
  }
};

export const setRewardedAdsFeatureEnabledLocal = (enabled: boolean) => {
  try {
    localStorage.setItem('am_rewarded_ads_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('rewardedAdsConfigChanged', { detail: { enabled } }));
  } catch (e) {
    console.warn('Unable to save rewarded ads flag locally:', e);
  }
};

// Syncs global enable/disable flag & campaigns from Supabase Storage so all live users get your setting
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
        localStorage.setItem('am_rewarded_ads_enabled', enabled ? 'true' : 'false');
        if (Array.isArray(json?.campaigns) && json.campaigns.length > 0) {
          localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(json.campaigns));
        }
        return { enabled, campaigns: json?.campaigns };
      }
    }
  } catch {
    // Fallback to localStorage if global config file hasn't been created yet
  }
  return { enabled: isRewardedAdsFeatureEnabled() };
};

export const DEFAULT_HOUSE_AD_CAMPAIGNS: HouseAdCampaign[] = [
  {
    id: 'saturday_shop',
    enabled: true,
    badge: 'Official Merch & Print',
    headline: 'THE SATURDAY SHOP',
    subheadline: 'Wear the Hype. Collect the Graphic Novels.',
    bullets: [
      'Official Print Graphic Novels (Apple Black, Clock Striker, Hammer)',
      'Exclusive Streetwear, Hoodies, Tees & Collectibles',
      'Direct Support for Saturday AM Creators'
    ],
    ctaLabel: 'Shop Now',
    videoUrl: '',
    backgroundImageUrl: '',
    logoImageUrl: '',
    featureImageUrl: '',
    bgOverlayOpacity: 65,
    accentColor: '#fe9a00',
    clickUrl: 'https://www.saturday-am.com/shop',
    actionType: 'external_url'
  },
  {
    id: 'battle_manga_game',
    enabled: true,
    badge: 'Upcoming Video Game',
    headline: 'SATURDAY AM: BATTLE MANGA',
    subheadline: 'Your Favorite Heroes. One Explosive Arena.',
    bullets: [
      '2D Tag-Team Anime Fighter Featuring Saturday AM All-Stars',
      'Unleash Ultimate Hype Attacks & Custom Assists',
      'Add to Your Wishlist Today to Support Launch!'
    ],
    ctaLabel: 'Wishlist Now',
    videoUrl: '',
    backgroundImageUrl: '',
    logoImageUrl: '',
    featureImageUrl: '',
    bgOverlayOpacity: 65,
    accentColor: '#fe9a00',
    clickUrl: 'https://www.saturday-am.com',
    actionType: 'external_url'
  },
  {
    id: 'manga_hype_plus',
    enabled: true,
    badge: 'Saturday AM+ PLUS',
    headline: 'MANGA HYPE PLUS ($1.99/MO)',
    subheadline: 'Read Without Limits. 100% Ad-Free.',
    bullets: [
      'Unlock Every Chapter Across All Series Immediately',
      '⚡ 12-Hour Early Access to All Mon / Wed / Sat Drops',
      '24/7 Access to the Completed Runs Vault + Exclusive Hypes'
    ],
    ctaLabel: 'Upgrade ($1.99/mo)',
    videoUrl: '',
    backgroundImageUrl: '',
    logoImageUrl: `${CLOUDFLARE_BASE_URL}/other%20icons/AM%20Hype%20icon%20full.png`,
    featureImageUrl: '',
    bgOverlayOpacity: 70,
    accentColor: '#fe9a00',
    actionType: 'in_app_plus_upgrade'
  }
];

export const loadSavedHouseAdCampaigns = (): HouseAdCampaign[] => {
  try {
    const raw = localStorage.getItem('am_house_ad_campaigns_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved house ad campaigns:', e);
  }
  return DEFAULT_HOUSE_AD_CAMPAIGNS;
};

// Reusable Visual Card Renderer (Used in both the live Modal and the Command Center Preview!)
export const HouseAdVisualSlide: React.FC<{ ad: HouseAdCampaign }> = ({ ad }) => {
  const overlayOpacity = (ad.bgOverlayOpacity ?? 65) / 100;
  const accent = ad.accentColor || '#fe9a00';

  return (
    <div
      className={`w-full h-full relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none ${
        ad.id === 'saturday_shop'
          ? 'bg-gradient-to-br from-zinc-950 via-amber-950/40 to-black'
          : ad.id === 'battle_manga_game'
          ? 'bg-gradient-to-br from-zinc-950 via-red-950/50 to-black'
          : 'bg-gradient-to-br from-zinc-950 via-purple-950/50 to-amber-950/30'
      }`}
    >
      <style>{`
        @keyframes slowPanZoom {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1%, -1%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        .animate-ken-burns {
          animation: slowPanZoom 16s ease-in-out infinite;
        }
      `}</style>

      {/* Optional Full-Bleed Animated Background Image */}
      {ad.backgroundImageUrl && (
        <>
          <img
            src={ad.backgroundImageUrl}
            alt={ad.headline}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns pointer-events-none"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      {/* Main Content Layout (Left Copy + Optional Right Product/Character Cutout) */}
      <div className="relative z-10 flex items-center justify-between gap-4 h-full">
        <div className={`flex flex-col justify-between h-full ${ad.featureImageUrl ? 'w-7/12' : 'w-full'}`}>
          {/* Top Header: Custom Logo OR Fallback Icon + Headline */}
          <div className="flex items-center gap-3">
            {ad.logoImageUrl ? (
              <img
                src={ad.logoImageUrl}
                alt="Logo"
                className="h-10 sm:h-12 w-auto max-w-[130px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${accent}25`,
                  borderColor: `${accent}66`,
                  color: accent
                }}
              >
                {ad.id === 'saturday_shop' ? (
                  <ShoppingBag className="w-5 h-5" />
                ) : ad.id === 'battle_manga_game' ? (
                  <Gamepad2 className="w-5 h-5" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black italic uppercase tracking-tight text-white leading-tight drop-shadow-md">
                {ad.headline}
              </h3>
              <p
                className="text-[10px] sm:text-xs font-bold mt-0.5 drop-shadow"
                style={{ color: accent }}
              >
                {ad.subheadline}
              </p>
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="space-y-1.5 my-2">
            {(ad.bullets || []).filter(Boolean).map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[10px] sm:text-xs font-bold text-zinc-100 bg-black/65 backdrop-blur-sm border border-white/10 px-2.5 py-1.5 rounded-lg shadow-sm"
              >
                <span className="font-black" style={{ color: accent }}>
                  ★
                </span>
                <span className="leading-snug">{b}</span>
              </div>
            ))}
          </div>

          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-300 drop-shadow">
            Tap "{ad.ctaLabel}" below to check it out!
          </div>
        </div>

        {/* Optional Right-Side Featured Graphic / Merch / Character Cutout */}
        {ad.featureImageUrl && (
          <div className="w-5/12 h-full flex items-center justify-center relative">
            <img
              src={ad.featureImageUrl}
              alt="Featured Art"
              className="max-h-[170px] sm:max-h-[200px] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
  onUpgradeClick,
  chapterNumber,
  seriesTitle
}) => {
  const [step, setStep] = useState<'choice' | 'playing' | 'completed'>('choice');
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [activeAd, setActiveAd] = useState<HouseAdCampaign>(DEFAULT_HOUSE_AD_CAMPAIGNS[0]);
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const adUnitPath = localStorage.getItem('am_gam_rewarded_unit') || GOOGLE_REWARDED_AD_UNIT_PATH;

  useEffect(() => {
    if (isOpen) {
      setStep('choice');
      setSecondsLeft(15);
      setUnlocking(false);
      setVideoFailed(false);

      const allCampaigns = loadSavedHouseAdCampaigns().filter(c => c.enabled !== false);
      const safePool = allCampaigns.length > 0 ? allCampaigns : DEFAULT_HOUSE_AD_CAMPAIGNS;

      const lastIndex = parseInt(localStorage.getItem('am_house_ad_rotation_idx') || '-1', 10);
      const nextIndex = (lastIndex + 1) % safePool.length;
      localStorage.setItem('am_house_ad_rotation_idx', String(nextIndex));

      setActiveAd(safePool[nextIndex] || safePool[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step !== 'playing') return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCompleteReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleStartRewardedAd = () => {
    const w = window as any;
    if (adUnitPath && w.googletag && w.googletag.cmd) {
      try {
        w.googletag.cmd.push(() => {
          const rewardedSlot = w.googletag.defineOutOfPageSlot(
            adUnitPath,
            w.googletag.enums.OutOfPageFormat.REWARDED
          );
          if (rewardedSlot) {
            rewardedSlot.addService(w.googletag.pubads());
            w.googletag.pubads().addEventListener('rewardedSlotReady', (evt: any) => {
              evt.makeRewardedVisible();
            });
            w.googletag.pubads().addEventListener('rewardedSlotGranted', () => {
              handleCompleteReward();
            });
            w.googletag.pubads().addEventListener('rewardedSlotClosed', () => {
              w.googletag.destroySlots([rewardedSlot]);
            });
            w.googletag.display(rewardedSlot);
            return;
          }
        });
      } catch (err) {
        console.warn('GPT Rewarded fallback to house ad:', err);
      }
    }

    setSecondsLeft(15);
    setStep('playing');
  };

  const handleCompleteReward = async () => {
    setStep('completed');
    setUnlocking(true);
    try {
      await onRewardEarned();
    } finally {
      setUnlocking(false);
    }
  };

  if (!isOpen) return null;

  const hasValidVideo = Boolean(activeAd.videoUrl && activeAd.videoUrl.trim() !== '' && !videoFailed);

  return (
    <div
      className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* STEP 1: PAYWALL CHOICE */}
        {step === 'choice' && (
          <div className="p-7 flex flex-col items-center text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-zinc-900 border border-[#fe9a00]/40 rounded-full flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(254,154,0,0.2)]">
              <Lock className="w-7 h-7 text-[#fe9a00]" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-1">
              {seriesTitle ? `${seriesTitle} • ` : ''}Chapter {chapterNumber || ''}
            </span>
            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mb-2">
              Unlock This Chapter
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
              Watch a quick 15-second spotlight to unlock this chapter for <span className="text-white">24 hours</span>, or upgrade to <span className="text-[#fe9a00]">Manga Hype PLUS</span> for ad-free access to the entire vault!
            </p>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleStartRewardedAd}
                className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 border-2 border-[#fe9a00] text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(254,154,0,0.15)]"
              >
                <Play className="w-4 h-4 fill-[#fe9a00] text-[#fe9a00]" />
                Watch 15s Spotlight • Unlock Free (24h)
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">OR</span>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>

              <button
                type="button"
                onClick={onUpgradeClick}
                className="w-full py-3.5 px-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.3)]"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                Upgrade to PLUS ($1.99/mo) — Go Ad-Free
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 15-SECOND VIDEO OR CUSTOM IMAGE/LOGO PROMO */}
        {step === 'playing' && (
          <div className="flex flex-col bg-black">
            <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest">
                  {activeAd.badge}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  Unlocking in {secondsLeft}s...
                </span>
              </div>

              {hasValidVideo && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {hasValidVideo ? (
                <video
                  ref={videoRef}
                  src={activeAd.videoUrl}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onError={() => setVideoFailed(true)}
                  onEnded={handleCompleteReward}
                  className="w-full h-full object-cover"
                />
              ) : (
                <HouseAdVisualSlide ad={activeAd} />
              )}

              {/* Bottom 15s Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-20">
                <div
                  className="h-full bg-[#fe9a00] transition-all duration-1000 ease-linear"
                  style={{ width: `${((15 - secondsLeft) / 15) * 100}%` }}
                />
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] truncate">
                  {activeAd.badge}
                </p>
                <p className="text-xs font-bold text-white truncate">{activeAd.headline}</p>
              </div>

              {activeAd.actionType === 'in_app_plus_upgrade' ? (
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="px-3.5 py-2 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(254,154,0,0.3)]"
                >
                  <Sparkles className="w-3 h-3 fill-black" /> {activeAd.ctaLabel}
                </button>
              ) : (
                <a
                  href={activeAd.clickUrl || 'https://www.saturday-am.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0"
                >
                  {activeAd.ctaLabel} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: UNLOCK COMPLETE */}
        {step === 'completed' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black italic uppercase text-white mb-1">
              Chapter Unlocked for 24 Hours!
            </h3>
            <p className="text-xs font-bold text-zinc-400">
              {unlocking ? 'Opening Manga Reader...' : 'Enjoy your chapter!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};