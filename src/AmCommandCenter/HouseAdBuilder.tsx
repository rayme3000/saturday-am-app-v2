import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  Upload,
  CheckCircle2,
  ExternalLink,
  ShoppingBag,
  Gamepad2,
  Zap,
  Power
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  isRewardedAdsFeatureEnabled,
  setRewardedAdsFeatureEnabledLocal,
  syncRewardedAdsGlobalConfig
} from '../Components/RewardedAdModal';

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
  bgOverlayOpacity?: number;
  accentColor?: string;
  clickUrl?: string;
  actionType: 'external_url' | 'in_app_plus_upgrade';
}

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';
const GLOBAL_CONFIG_PATH = 'house-ads/global_config.json';

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

      <div className="relative z-10 flex items-center justify-between gap-4 h-full">
        <div className={`flex flex-col justify-between h-full ${ad.featureImageUrl ? 'w-7/12' : 'w-full'}`}>
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

export const HouseAdBuilder: React.FC<{
  setIsDirty?: (dirty: boolean) => void;
  Dropzone?: any;
}> = ({ setIsDirty, Dropzone }) => {
  const [campaigns, setCampaigns] = useState<HouseAdCampaign[]>(() => loadSavedHouseAdCampaigns());
  const [rewardedAdsEnabled, setRewardedAdsEnabled] = useState<boolean>(() =>
    isRewardedAdsFeatureEnabled()
  );
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    syncRewardedAdsGlobalConfig().then(
      (res: { enabled: boolean; campaigns?: HouseAdCampaign[] }) => {
        setRewardedAdsEnabled(res.enabled);
        if (res.campaigns && res.campaigns.length > 0) {
          setCampaigns(res.campaigns);
        }
      }
    );
  }, []);

  const persistGlobalConfigToStorage = async (
    nextEnabled: boolean,
    nextCampaigns: HouseAdCampaign[]
  ) => {
    try {
      const payload = JSON.stringify(
        {
          rewardedAdsEnabled: nextEnabled,
          campaigns: nextCampaigns,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      );
      const blob = new Blob([payload], { type: 'application/json' });
      await supabase.storage
        .from('assets')
        .upload(GLOBAL_CONFIG_PATH, blob, { upsert: true, contentType: 'application/json' });
    } catch (e) {
      console.warn('Global config storage sync fallback to localStorage:', e);
    }
  };

  const handleToggleMasterFeature = async () => {
    const nextState = !rewardedAdsEnabled;
    setRewardedAdsEnabled(nextState);
    setRewardedAdsFeatureEnabledLocal(nextState);
    await persistGlobalConfigToStorage(nextState, campaigns);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  const activeCampaign = campaigns[selectedIdx] || campaigns[0];

  const updateActiveCampaign = (patch: Partial<HouseAdCampaign>) => {
    if (setIsDirty) setIsDirty(true);
    setCampaigns(prev =>
      prev.map((item, idx) => (idx === selectedIdx ? { ...item, ...patch } : item))
    );
  };

  const handleBulletChange = (bulletIdx: number, value: string) => {
    const nextBullets = [...(activeCampaign.bullets || ['', '', ''])];
    nextBullets[bulletIdx] = value;
    updateActiveCampaign({ bullets: nextBullets });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'backgroundImageUrl' | 'logoImageUrl' | 'featureImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(targetField);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `house-ads/${activeCampaign.id}_${targetField}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        if (data?.publicUrl) {
          updateActiveCampaign({ [targetField]: data.publicUrl });
          setUploadingField(null);
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateActiveCampaign({ [targetField]: reader.result });
        }
        setUploadingField(null);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingField(null);
    }
  };

  const handleAddCampaign = () => {
    const newCamp: HouseAdCampaign = {
      id: `custom_ad_${Date.now()}`,
      enabled: true,
      badge: 'Featured Spotlight',
      headline: 'NEW SATURDAY AM SPOTLIGHT',
      subheadline: 'Official Announcement & Special Offer',
      bullets: [
        'Add your first highlight point here',
        'Add your second highlight point here',
        'Add your third highlight point here'
      ],
      ctaLabel: 'Learn More',
      videoUrl: '',
      backgroundImageUrl: '',
      logoImageUrl: '',
      featureImageUrl: '',
      bgOverlayOpacity: 65,
      accentColor: '#fe9a00',
      clickUrl: 'https://www.saturday-am.com',
      actionType: 'external_url'
    };
    setCampaigns(prev => [...prev, newCamp]);
    setSelectedIdx(campaigns.length);
    if (setIsDirty) setIsDirty(true);
  };

  const handleDeleteCampaign = async (idxToRemove: number) => {
    if (campaigns.length <= 1) return alert('Keep at least 1 active spotlight campaign.');
    if (!window.confirm('Delete this ad campaign?')) return;
    const next = campaigns.filter((_, i) => i !== idxToRemove);
    setCampaigns(next);
    setSelectedIdx(0);
    localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(next));
    await persistGlobalConfigToStorage(rewardedAdsEnabled, next);
  };

  const handleSaveAll = async () => {
    localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(campaigns));
    setRewardedAdsFeatureEnabledLocal(rewardedAdsEnabled);
    await persistGlobalConfigToStorage(rewardedAdsEnabled, campaigns);
    if (setIsDirty) setIsDirty(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all 3 campaigns back to default text and settings?')) return;
    setCampaigns(DEFAULT_HOUSE_AD_CAMPAIGNS);
    setSelectedIdx(0);
    localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(DEFAULT_HOUSE_AD_CAMPAIGNS));
    await persistGlobalConfigToStorage(rewardedAdsEnabled, DEFAULT_HOUSE_AD_CAMPAIGNS);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-6xl space-y-6 text-white animate-fade-in">
      {/* MASTER FEATURE ENABLE / DISABLE BANNER */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          rewardedAdsEnabled
            ? 'bg-emerald-950/40 border-emerald-500/50'
            : 'bg-zinc-950/90 border-amber-500/40'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              rewardedAdsEnabled
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-white">
                Video Reward Ads Feature:
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                  rewardedAdsEnabled
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-800 text-amber-400 border border-amber-500/40'
                }`}
              >
                {rewardedAdsEnabled ? 'LIVE / ENABLED' : 'DISABLED (PLUS PAYWALL ONLY)'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
              {rewardedAdsEnabled
                ? 'Free users clicking Chapters 4+ can watch a 15-second spotlight to unlock chapters for 24 hours.'
                : 'Currently turned OFF for live users. Clicking locked Chapters 4+ shows the standard PLUS ($1.99/mo) upgrade prompt while you finish building your ads below.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMasterFeature}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all ${
            rewardedAdsEnabled
              ? 'bg-zinc-900 hover:bg-red-950 text-red-400 border border-red-500/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          }`}
        >
          <Power className="w-4 h-4" />
          {rewardedAdsEnabled ? 'Disable Video Reward Ads' : 'Enable Video Reward Ads'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Saturday AM • In-House Rewarded Ad Studio
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-wider text-white">
            15-Second Spotlight & Video Ad Builder
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Drop in background art, transparent PNG logos, character/merch cutouts, or 15s MP4 videos for your rotating chapter-unlock ads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2.5 rounded-xl bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Ad Campaigns
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Saved! Global Video Reward Ad settings and campaigns have been synced.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {campaigns.map((camp, idx) => (
          <button
            key={camp.id}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer border ${
              selectedIdx === idx
                ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-md'
                : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <span>#{idx + 1} • {camp.headline}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={handleAddCampaign}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-black/60 border border-zinc-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#fe9a00]">
              Editing Campaign #{selectedIdx + 1}
            </span>
            {campaigns.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteCampaign(selectedIdx)}
                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Campaign
              </button>
            )}
          </div>

          <div className="space-y-5 bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
              <ImageIcon className="w-4 h-4 text-[#fe9a00]" /> Visual Assets (Drag & Drop or Paste URL)
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  1. Full-Bleed Background Art (16:9 Key Art / Banner)
                </label>
                {activeCampaign.backgroundImageUrl && (
                  <button
                    type="button"
                    onClick={() => updateActiveCampaign({ backgroundImageUrl: '' })}
                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Clear Image
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL or upload below..."
                  value={activeCampaign.backgroundImageUrl || ''}
                  onChange={e => updateActiveCampaign({ backgroundImageUrl: e.target.value })}
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                />
                {!Dropzone && (
                  <label className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'backgroundImageUrl' ? '...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, 'backgroundImageUrl')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {Dropzone && (
                <Dropzone
                  label={activeCampaign.backgroundImageUrl ? 'Replace Background Banner' : '+ Upload 16:9 Background Art'}
                  height="p-3"
                  folderPath="house-ads"
                  onUploadComplete={(url: string) => updateActiveCampaign({ backgroundImageUrl: url })}
                />
              )}
            </div>

            {activeCampaign.backgroundImageUrl && (
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  <span>Background Darkening Overlay (For Text Readability)</span>
                  <span className="text-[#fe9a00]">{activeCampaign.bgOverlayOpacity ?? 65}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={95}
                  value={activeCampaign.bgOverlayOpacity ?? 65}
                  onChange={e => updateActiveCampaign({ bgOverlayOpacity: Number(e.target.value) })}
                  className="w-full accent-[#fe9a00]"
                />
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  2. Custom Logo PNG (Replaces Top-Left Icon Box)
                </label>
                {activeCampaign.logoImageUrl && (
                  <button
                    type="button"
                    onClick={() => updateActiveCampaign({ logoImageUrl: '' })}
                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Clear Logo
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste transparent PNG logo URL or upload below..."
                  value={activeCampaign.logoImageUrl || ''}
                  onChange={e => updateActiveCampaign({ logoImageUrl: e.target.value })}
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                />
                {!Dropzone && (
                  <label className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'logoImageUrl' ? '...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, 'logoImageUrl')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {Dropzone && (
                <Dropzone
                  label={activeCampaign.logoImageUrl ? 'Replace Logo PNG' : '+ Upload Transparent Logo PNG'}
                  height="p-3"
                  folderPath="house-ads"
                  onUploadComplete={(url: string) => updateActiveCampaign({ logoImageUrl: url })}
                />
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  3. Right-Side Featured Cutout PNG (Optional Merch / Character / Books Image)
                </label>
                {activeCampaign.featureImageUrl && (
                  <button
                    type="button"
                    onClick={() => updateActiveCampaign({ featureImageUrl: '' })}
                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Clear Cutout
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste right-side character or product PNG URL or upload below..."
                  value={activeCampaign.featureImageUrl || ''}
                  onChange={e => updateActiveCampaign({ featureImageUrl: e.target.value })}
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                />
                {!Dropzone && (
                  <label className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'featureImageUrl' ? '...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, 'featureImageUrl')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {Dropzone && (
                <Dropzone
                  label={activeCampaign.featureImageUrl ? 'Replace Right-Side Cutout' : '+ Upload Right-Side Character / Product Cutout'}
                  height="p-3"
                  folderPath="house-ads"
                  onUploadComplete={(url: string) => updateActiveCampaign({ featureImageUrl: url })}
                />
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> Optional 15s Video (.MP4 URL — Overrides Slide When Ready)
              </label>
              <input
                type="text"
                placeholder="Leave blank to use visual slide above, or paste .mp4 URL when ready..."
                value={activeCampaign.videoUrl || ''}
                onChange={e => updateActiveCampaign({ videoUrl: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Top Badge Label
              </label>
              <input
                type="text"
                value={activeCampaign.badge}
                onChange={e => updateActiveCampaign({ badge: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Main Headline
              </label>
              <input
                type="text"
                value={activeCampaign.headline}
                onChange={e => updateActiveCampaign({ headline: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Subheadline
            </label>
            <input
              type="text"
              value={activeCampaign.subheadline}
              onChange={e => updateActiveCampaign({ subheadline: e.target.value })}
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              3 Spotlight Bullet Points
            </label>
            {[0, 1, 2].map(bIdx => (
              <input
                key={bIdx}
                type="text"
                placeholder={`Bullet Point #${bIdx + 1}`}
                value={activeCampaign.bullets?.[bIdx] || ''}
                onChange={e => handleBulletChange(bIdx, e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={activeCampaign.ctaLabel}
                onChange={e => updateActiveCampaign({ ctaLabel: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Button Action
              </label>
              <select
                value={activeCampaign.actionType}
                onChange={e =>
                  updateActiveCampaign({
                    actionType: e.target.value as 'external_url' | 'in_app_plus_upgrade'
                  })
                }
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              >
                <option value="external_url">Open External Website</option>
                <option value="in_app_plus_upgrade">Open In-App PLUS Upgrade</option>
              </select>
            </div>

            {activeCampaign.actionType === 'external_url' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={activeCampaign.clickUrl || ''}
                  onChange={e => updateActiveCampaign({ clickUrl: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE 16:9 MODAL PREVIEW */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-black/80 border border-zinc-800 rounded-2xl p-4 space-y-3 sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Modal Preview
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                16:9 Aspect Ratio
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase tracking-widest">
                    {activeCampaign.badge}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                    Unlocking in 14s...
                  </span>
                </div>
              </div>

              <div className="relative w-full aspect-video bg-black overflow-hidden">
                <HouseAdVisualSlide ad={activeCampaign} />
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-20">
                  <div className="h-full bg-[#fe9a00] w-1/3" />
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] truncate">
                    {activeCampaign.badge}
                  </p>
                  <p className="text-xs font-bold text-white truncate">{activeCampaign.headline}</p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                  {activeCampaign.ctaLabel} <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
              💡 <strong>Pro Tip:</strong> Drop a 16:9 key-art image into <strong>#1 Background Art</strong> and a transparent PNG logo into <strong>#2 Custom Logo</strong>—it will immediately transform the card into a full-art game/shop trailer!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};