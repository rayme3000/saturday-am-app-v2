import React, { useState, useEffect, useMemo } from 'react';
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
  Zap,
  Power,
  Crop,
  Crown,
  Flame,
  Package,
  Clock,
  PlayCircle,
  BellRing,
  X,
  CreditCard,
  Layers,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import {
  isRewardedAdsFeatureEnabled,
  setRewardedAdsFeatureEnabledLocal,
  syncRewardedAdsGlobalConfig
} from '../Components/RewardedAdModal';

export type AdPlacementMode = 'rewarded_unlock' | 'timed_popup' | 'both';

export interface HouseAdAssetOption {
  id: string;
  label: string;
  type: 'card_skin' | 'avatar' | 'custom';
  image_url: string;
  signature_stamps?: any[];
}

export interface HouseAdSignaturePreview {
  creator_name: string;
  signature_url: string;
}

export interface HouseAdCampaign {
  id: string;
  enabled?: boolean;
  placementMode?: AdPlacementMode;
  rewardDurationSeconds?: number;
  popupDelaySeconds?: number;
  popupFrequency?: 'once_per_session' | 'once_per_day' | 'always';
  linkedProductId?: string;
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
  cropZoom?: number;
  cropPanX?: number;
  cropPanY?: number;
  bundleAssets?: HouseAdAssetOption[];
  avatarUrls?: string[];
  signaturePreviews?: HouseAdSignaturePreview[];
  priceLabel?: string;
  originalPriceLabel?: string;
  bonusHypes?: number;
  includeOneYrPass?: boolean;
  cardCount?: number;
}

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';
const GLOBAL_CONFIG_PATH = 'house-ads/global_config.json';

/**
 * Normalizes video URLs (converts single Imgur post links or .gifv links into direct .mp4 URLs)
 */
export const normalizeHouseAdVideoUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Convert .gifv to .mp4
  if (/\.gifv(\?.*)?$/i.test(trimmed)) {
    return trimmed.replace(/\.gifv(\?.*)?$/i, '.mp4');
  }

  // Convert direct i.imgur.com/<id>.gif to .mp4
  const directImgurMatch = trimmed.match(/^https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.(gif|mp4|webm)$/i);
  if (directImgurMatch) {
    return `https://i.imgur.com/${directImgurMatch[1]}.mp4`;
  }

  // Convert non-album imgur.com/<id> to i.imgur.com/<id>.mp4
  const singleImgurPostMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?imgur\.com\/(?!a\/|gallery\/|t\/)([a-zA-Z0-9]+)\/?$/i);
  if (singleImgurPostMatch) {
    return `https://i.imgur.com/${singleImgurPostMatch[1]}.mp4`;
  }

  return trimmed;
};

export const isImgurAlbumWebpageUrl = (rawUrl?: string): boolean => {
  if (!rawUrl) return false;
  return /^https?:\/\/(?:www\.|m\.)?imgur\.com\/(?:a|gallery)\/[a-zA-Z0-9]+/i.test(rawUrl.trim());
};

const CREATOR_ALIAS_GROUPS: string[][] = [
  ['odunze oguguo', 'whyt manga', 'whyt', 'odunze oguguo (whyt manga)'],
  ['jeyodin', 'jey odin'],
  ['raymond brown', 'rayme3000'],
  ['frank simmonds', 'effessart'],
  ['stefano romano', 'dropkickanimation'],
  ['erick pedrucci', 'eric pedrucci', 'erick perducci', 'eric perducci'],
  ['huzayfa umar', 'zayf', 'huzayfa umar (zayf)'],
  ['yvan soudy', 'staark', 'yvan soudy (staark)'],
  ['frederick l. jones', 'frederick jones', 'fred jones'],
  ['oscar fong', 'oscar ed fong'],
  ['jr de bard', 'j.r. de bard', 'jr debard']
];

const doCreatorNamesMatch = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = String(nameA).trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanB = String(nameB).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  for (const group of CREATOR_ALIAS_GROUPS) {
    const aInGroup = group.some(
      alias => cleanA === alias || cleanA.includes(alias) || alias.includes(cleanA)
    );
    const bInGroup = group.some(
      alias => cleanB === alias || cleanB.includes(alias) || alias.includes(cleanB)
    );
    if (aInGroup && bInGroup) return true;
  }
  return false;
};

export const DEFAULT_HOUSE_AD_CAMPAIGNS: HouseAdCampaign[] = [
  {
    id: 'saturday_shop',
    enabled: true,
    placementMode: 'both',
    rewardDurationSeconds: 15,
    popupDelaySeconds: 5,
    popupFrequency: 'once_per_session',
    badge: 'Official Merch & Print',
    headline: 'THE SATURDAY SHOP',
    subheadline: 'Wear the Hype • Collect the Graphic Novels',
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
    bgOverlayOpacity: 35,
    cropZoom: 110,
    cropPanX: 50,
    cropPanY: 35,
    accentColor: '#fe9a00',
    clickUrl: 'https://www.saturday-am.com/shop',
    actionType: 'external_url'
  },
  {
    id: 'battle_manga_game',
    enabled: true,
    placementMode: 'rewarded_unlock',
    rewardDurationSeconds: 15,
    popupDelaySeconds: 8,
    popupFrequency: 'once_per_session',
    badge: 'Upcoming Video Game',
    headline: 'SATURDAY AM: BATTLE MANGA',
    subheadline: '2D Tag-Team Anime Fighter • Wishlist Today',
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
    bgOverlayOpacity: 35,
    cropZoom: 110,
    cropPanX: 50,
    cropPanY: 35,
    accentColor: '#fe9a00',
    clickUrl: 'https://www.saturday-am.com',
    actionType: 'external_url'
  },
  {
    id: 'manga_hype_plus',
    enabled: true,
    placementMode: 'both',
    rewardDurationSeconds: 15,
    popupDelaySeconds: 6,
    popupFrequency: 'once_per_session',
    badge: 'Saturday AM+ PLUS',
    headline: 'MANGA HYPE PLUS ($1.99/MO)',
    subheadline: 'Read Without Limits • 12-Hr Early Access • 100% Ad-Free',
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
    bgOverlayOpacity: 40,
    cropZoom: 110,
    cropPanX: 50,
    cropPanY: 35,
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

export const getActiveTimedPopupCampaigns = (): HouseAdCampaign[] => {
  return loadSavedHouseAdCampaigns().filter(
    c =>
      c.enabled !== false &&
      (c.placementMode === 'timed_popup' || c.placementMode === 'both')
  );
};

export const HouseAdVisualSlide: React.FC<{
  ad: HouseAdCampaign;
  allowAudio?: boolean;
}> = ({ ad, allowAudio = false }) => {
  const [isMuted, setIsMuted] = useState<boolean>(!allowAudio);
  const [videoLoadFailed, setVideoLoadFailed] = useState<boolean>(false);

  const resolvedVideoUrl = useMemo(
    () => normalizeHouseAdVideoUrl(ad.videoUrl),
    [ad.videoUrl]
  );

  useEffect(() => {
    setVideoLoadFailed(false);
  }, [resolvedVideoUrl]);

  useEffect(() => {
    setIsMuted(!allowAudio);
  }, [allowAudio]);

  const overlayOpacity = (ad.bgOverlayOpacity ?? 35) / 100;
  const accent = ad.accentColor || '#fe9a00';

  const avatars = ad.avatarUrls || [];
  const sigs = ad.signaturePreviews || [];
  const bundleAssets = ad.bundleAssets || [];
  const primaryHeroArt =
    ad.backgroundImageUrl ||
    bundleAssets[0]?.image_url ||
    ad.featureImageUrl ||
    avatars[0] ||
    '';

  const zoom = (ad.cropZoom ?? 115) / 100;
  const panX = ad.cropPanX ?? 50;
  const panY = ad.cropPanY ?? 35;

  const showVideoPlayer =
    Boolean(resolvedVideoUrl) &&
    !isImgurAlbumWebpageUrl(resolvedVideoUrl) &&
    !videoLoadFailed;

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-zinc-950 select-none flex flex-col justify-between"
      style={{ containerType: 'inline-size' }}
    >
      {showVideoPlayer ? (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <video
            key={resolvedVideoUrl}
            src={resolvedVideoUrl}
            poster={primaryHeroArt || undefined}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            // @ts-expect-error referrerPolicy is supported in modern browsers for Imgur/CDN MP4s
            referrerPolicy="no-referrer"
            onError={() => setVideoLoadFailed(true)}
            className={`w-full h-full ${
              (ad.cropZoom ?? 100) > 100 ? 'object-cover' : 'object-contain'
            } transition-transform duration-200 pointer-events-none`}
            style={{
              objectPosition: `${panX}% ${panY}%`,
              transform: `scale(${(ad.cropZoom ?? 100) / 100})`,
              transformOrigin: `${panX}% ${panY}%`
            }}
          />
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsMuted(prev => !prev);
            }}
            className="absolute bottom-3 right-3 z-30 p-2 rounded-full bg-black/80 hover:bg-[#fe9a00] text-white hover:text-black border border-white/20 transition-colors cursor-pointer shadow-lg"
            title={isMuted ? 'Unmute Video' : 'Mute Video'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : primaryHeroArt ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={primaryHeroArt}
            alt={ad.headline}
            className="w-full h-full object-cover transition-transform duration-200"
            style={{
              objectPosition: `${panX}% ${panY}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${panX}% ${panY}%`
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-amber-950/35 to-black pointer-events-none" />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${Math.min(
            0.65,
            overlayOpacity * 0.55
          )}) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 64%, rgba(0,0,0,${Math.min(
            0.95,
            0.55 + overlayOpacity * 0.45
          )}) 100%)`
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-2 p-3 sm:p-4 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5">
          {ad.logoImageUrl && (
            <img
              src={ad.logoImageUrl}
              alt="Logo"
              className="h-6 sm:h-7 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mr-1"
            />
          )}
          {ad.includeOneYrPass && (
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-[#fe9a00]/80 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Crown className="w-2.5 h-2.5 text-[#fe9a00]" /> 1-Yr Pass
            </span>
          )}
          {Number(ad.bonusHypes) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-950/90 backdrop-blur-md border border-yellow-300 text-yellow-200 text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Flame className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" /> +{ad.bonusHypes} Gold Hypes
            </span>
          )}
          {Number(ad.cardCount) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-zinc-100 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
              {ad.cardCount} Card Skin{Number(ad.cardCount) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {ad.priceLabel && (
          <div className="px-2.5 py-1 rounded-xl bg-black/90 backdrop-blur-md border-2 border-[#fe9a00] flex items-baseline gap-1.5 shadow-[0_0_20px_rgba(254,154,0,0.4)] shrink-0">
            {ad.originalPriceLabel && (
              <span className="text-[9px] font-black italic text-zinc-400 line-through">
                {ad.originalPriceLabel}
              </span>
            )}
            <span className="text-sm sm:text-base font-black italic text-[#fe9a00] leading-none">
              {ad.priceLabel}
            </span>
          </div>
        )}
      </div>

      <div
        className={`relative z-10 w-full px-3.5 sm:px-4 pb-3 pt-6 flex items-end justify-between gap-2.5 pointer-events-none ${
          showVideoPlayer ? 'pr-12' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <h3
            className="font-black italic uppercase tracking-tight text-white leading-[1.08] drop-shadow-[0_2px_10px_rgba(0,0,0,0.98)] break-words line-clamp-2"
            style={{
              fontSize: 'clamp(0.8rem, 3.2cqi, 1.2rem)'
            }}
          >
            {ad.headline}
          </h3>
          {ad.subheadline && (
            <p
              className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)] line-clamp-1"
              style={{ color: accent }}
            >
              {ad.subheadline}
            </p>
          )}
        </div>

        {(avatars.length > 0 || sigs.length > 0) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {avatars.length > 0 && (
              <div className="flex -space-x-2">
                {avatars.slice(0, 5).map((avUrl, idx) => (
                  <img
                    key={idx}
                    src={avUrl}
                    alt="Avatar"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-md"
                  />
                ))}
              </div>
            )}

            {sigs.map((sig, idx) =>
              sig?.signature_url ? (
                <div
                  key={idx}
                  className="bg-black/85 border border-[#fe9a00]/50 rounded-lg px-1.5 py-0.5 flex flex-col items-center"
                >
                  <div className="w-10 sm:w-12 h-4 flex items-center justify-center">
                    <div
                      className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500"
                      style={{
                        WebkitMaskImage: `url('${sig.signature_url}')`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskImage: `url('${sig.signature_url}')`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center'
                      }}
                    />
                  </div>
                  <span className="text-[5px] font-black uppercase tracking-widest text-[#fe9a00] truncate max-w-[58px]">
                    {sig.creator_name}
                  </span>
                </div>
              ) : null
            )}
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
  const { cardSkins: seriesDataSkins = [], vaultAvatars: seriesDataAvatars = [] } = useSeriesData();

  const [campaigns, setCampaigns] = useState<HouseAdCampaign[]>(() => loadSavedHouseAdCampaigns());
  const [rewardedAdsEnabled, setRewardedAdsEnabled] = useState<boolean>(() =>
    isRewardedAdsFeatureEnabled()
  );
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string>('');
  const [showAllSkinsLibrary, setShowAllSkinsLibrary] = useState<boolean>(false);

  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [dbSkins, setDbSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [creatorSignatures, setCreatorSignatures] = useState<any[]>([]);
  const [selectedImportProductId, setSelectedImportProductId] = useState<string>('');

  const [testModalMode, setTestModalMode] = useState<'rewarded' | 'timed_popup' | null>(null);
  const [testCountdown, setTestCountdown] = useState<number>(15);

  useEffect(() => {
    syncRewardedAdsGlobalConfig().then(
      (res: { enabled: boolean; campaigns?: HouseAdCampaign[] }) => {
        setRewardedAdsEnabled(res.enabled);
        if (res.campaigns && res.campaigns.length > 0) {
          setCampaigns(res.campaigns);
        }
      }
    );

    Promise.all([
      supabase
        .from('in_app_store_products')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('card_skins').select('*'),
      supabase.from('vault_card_skins').select('*'),
      supabase.from('vault_avatars').select('*'),
      supabase.from('creator_signatures').select('creator_name, signature_url')
    ]).then(([prodsRes, cardSkinsRes, vaultSkinsRes, avatarsRes, sigsRes]) => {
      const prods = prodsRes.data || [];
      if (prods.length > 0) {
        setStoreProducts(prods);
        setSelectedImportProductId(String(prods[0].id));
      }
      const combinedDbSkins = [
        ...(cardSkinsRes.data || []),
        ...(vaultSkinsRes.data || [])
      ];
      setDbSkins(combinedDbSkins);
      if (avatarsRes.data) setDbAvatars(avatarsRes.data);
      if (sigsRes.data) setCreatorSignatures(sigsRes.data);
    });
  }, []);

  const allMasterSkins = useMemo(() => {
    const map = new Map<string, any>();
    [...(seriesDataSkins || []), ...(dbSkins || [])].forEach((sk: any) => {
      if (sk && sk.id && sk.image_url) {
        map.set(String(sk.id), sk);
      }
    });
    return Array.from(map.values());
  }, [seriesDataSkins, dbSkins]);

  const allMasterAvatars = useMemo(() => {
    const map = new Map<string, any>();
    [...(seriesDataAvatars || []), ...(dbAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) {
        map.set(String(av.image_url), av);
      }
    });
    return Array.from(map.values());
  }, [seriesDataAvatars, dbAvatars]);

  useEffect(() => {
    if (!testModalMode) return;
    if (testCountdown <= 0) return;
    const t = setInterval(() => {
      setTestCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [testModalMode, testCountdown]);

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
    window.dispatchEvent(new Event('houseAdsUpdated'));
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

  const buildBundleAssetOptions = useMemo(() => {
    return (prod: any): HouseAdAssetOption[] => {
      if (!prod) return [];
      const options: HouseAdAssetOption[] = [];
      const seenUrls = new Set<string>();

      const rawSkinIds: string[] = [
        ...(Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : []),
        prod.card_skin_id,
        prod.card_skin_2_id
      ]
        .filter(Boolean)
        .map(String);

      rawSkinIds.forEach((id, idx) => {
        const sk = allMasterSkins.find(s => String(s.id) === String(id));
        if (sk?.image_url && !seenUrls.has(sk.image_url)) {
          seenUrls.add(sk.image_url);
          options.push({
            id: `skin_${sk.id}`,
            label: sk.name || `Hype Card #${idx + 1}`,
            type: 'card_skin',
            image_url: sk.image_url,
            signature_stamps: Array.isArray(sk.signature_stamps) ? sk.signature_stamps : []
          });
        }
      });

      [
        { url: prod.card_skin_url, name: prod.card_skin_name || 'Hype Card #1' },
        { url: prod.card_skin_2_url, name: prod.card_skin_2_name || 'Hype Card #2' }
      ].forEach((directCard, idx) => {
        if (directCard.url && !seenUrls.has(directCard.url)) {
          seenUrls.add(directCard.url);
          options.push({
            id: `direct_skin_${idx}`,
            label: directCard.name,
            type: 'card_skin',
            image_url: directCard.url
          });
        }
      });

      const avUrls: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      avUrls.forEach((url, idx) => {
        if (seenUrls.has(url)) return;
        seenUrls.add(url);
        const matchedAv = allMasterAvatars.find(a => a.image_url === url);
        const cleanAvName = matchedAv?.name
          ? matchedAv.name.replace(/mmwog/i, '').trim()
          : `Avatar #${idx + 1}`;
        options.push({
          id: `avatar_${idx}_${url.slice(-10)}`,
          label: cleanAvName,
          type: 'avatar',
          image_url: url
        });
      });

      return options;
    };
  }, [allMasterSkins, allMasterAvatars]);

  const handleImportFromStoreProduct = (productId: string) => {
    const prod = storeProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    const allBundleAssets = buildBundleAssetOptions(prod);
    const skinAssets = allBundleAssets.filter(a => a.type === 'card_skin');
    const avatars: string[] = Array.isArray(prod.avatar_urls)
      ? prod.avatar_urls.filter(Boolean)
      : [];

    const autographs: string[] = Array.isArray(prod.autograph_creators)
      ? prod.autograph_creators.filter(Boolean)
      : [];

    const matchedSigs: HouseAdSignaturePreview[] = autographs
      .map(cName => {
        const found = creatorSignatures.find(
          s => s.signature_url && doCreatorNamesMatch(cName, s.creator_name)
        );
        return found ? { creator_name: cName, signature_url: found.signature_url } : null;
      })
      .filter(Boolean) as HouseAdSignaturePreview[];

    const price = Number(prod.listed_price_dollars || 0);
    const normalPrice = Number(prod.normal_price_dollars || 0);
    const priceLabel = price === 0 ? 'FREE' : `$${price}`;
    const originalPriceLabel =
      normalPrice > price && normalPrice > 0 ? `$${normalPrice}` : '';

    const primaryArt =
      skinAssets[0]?.image_url || allBundleAssets[0]?.image_url || avatars[0] || '';
    const bonusHypes = Number(prod.bonus_vaulted_hypes || 0);
    const includePass = Boolean(prod.include_1yr_sub);

    const subtitleParts: string[] = [];
    if (includePass) subtitleParts.push('1-Yr VIP Pass');
    if (bonusHypes > 0) subtitleParts.push(`+${bonusHypes} Gold Hypes`);
    if (skinAssets.length > 0) subtitleParts.push(`${skinAssets.length} Card Skins`);
    if (avatars.length > 0) subtitleParts.push(`${avatars.length} Avatars`);

    updateActiveCampaign({
      linkedProductId: String(prod.id),
      placementMode: activeCampaign.placementMode || 'both',
      badge: prod.promo_badge || 'SPECIAL EDITION DROP',
      headline: String(prod.title || 'SPECIAL BUNDLE').toUpperCase(),
      subheadline:
        subtitleParts.join(' • ') || prod.description || 'Limited-Time Collector Drop',
      ctaLabel: price === 0 ? 'Claim Free' : `Unlock (${priceLabel})`,
      backgroundImageUrl: primaryArt,
      bgOverlayOpacity: 35,
      cropZoom: 112,
      cropPanX: 50,
      cropPanY: 30,
      bundleAssets: allBundleAssets,
      avatarUrls: avatars,
      signaturePreviews: matchedSigs,
      priceLabel,
      originalPriceLabel,
      bonusHypes,
      includeOneYrPass: includePass,
      cardCount:
        skinAssets.length ||
        (Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids.length : 0),
      actionType: 'external_url',
      clickUrl: `/?view=shop&item=${encodeURIComponent(prod.slug || prod.id)}`
    });
  };

  const activeProductObj = useMemo(() => {
    const targetId = selectedImportProductId || activeCampaign.linkedProductId;
    return (
      storeProducts.find(p => String(p.id) === String(targetId)) || storeProducts[0] || null
    );
  }, [storeProducts, selectedImportProductId, activeCampaign.linkedProductId]);

  const liveBundleAssets = useMemo(() => {
    const fromProd = activeProductObj ? buildBundleAssetOptions(activeProductObj) : [];
    const savedAssets = activeCampaign.bundleAssets || [];
    const mergedMap = new Map<string, HouseAdAssetOption>();
    [...fromProd, ...savedAssets].forEach(item => {
      if (item && item.image_url) {
        mergedMap.set(item.image_url, item);
      }
    });
    return Array.from(mergedMap.values());
  }, [activeProductObj, buildBundleAssetOptions, activeCampaign.bundleAssets]);

  const includedHypeCardAssets = useMemo(
    () => liveBundleAssets.filter(a => a.type === 'card_skin'),
    [liveBundleAssets]
  );

  const includedAvatarAssets = useMemo(
    () => liveBundleAssets.filter(a => a.type === 'avatar'),
    [liveBundleAssets]
  );

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'backgroundImageUrl' | 'logoImageUrl'
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

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploadError('');
    setUploadingField('videoUrl');
    try {
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const contentType =
        file.type || (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4');
      const filePath = `house-ads/${activeCampaign.id}_video_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { upsert: true, contentType });

      if (!uploadError) {
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        if (data?.publicUrl) {
          updateActiveCampaign({ videoUrl: data.publicUrl });
          setUploadingField(null);
          e.target.value = '';
          return;
        }
      }

      // Local object URL fallback for immediate preview if bucket has size/policy restrictions
      const localPreviewUrl = URL.createObjectURL(file);
      updateActiveCampaign({ videoUrl: localPreviewUrl });
      if (uploadError) {
        setVideoUploadError(
          `Previewing locally (${uploadError.message}). For permanent hosting, upload to Cloudflare R2 and paste the .mp4 link.`
        );
      }
    } catch (err: any) {
      setVideoUploadError(err?.message || 'Failed to upload video file.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleAddCampaign = () => {
    const newCamp: HouseAdCampaign = {
      id: `custom_ad_${Date.now()}`,
      enabled: true,
      placementMode: 'both',
      rewardDurationSeconds: 15,
      popupDelaySeconds: 5,
      popupFrequency: 'once_per_session',
      badge: 'Featured Spotlight',
      headline: 'NEW SATURDAY AM SPOTLIGHT',
      subheadline: 'Official Announcement & Special Offer',
      bullets: [],
      ctaLabel: 'Learn More',
      videoUrl: '',
      backgroundImageUrl: '',
      logoImageUrl: '',
      bgOverlayOpacity: 35,
      cropZoom: 112,
      cropPanX: 50,
      cropPanY: 35,
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
    window.dispatchEvent(new Event('houseAdsUpdated'));
  };

  const handleSaveAll = async () => {
    localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(campaigns));
    setRewardedAdsFeatureEnabledLocal(rewardedAdsEnabled);
    await persistGlobalConfigToStorage(rewardedAdsEnabled, campaigns);
    sessionStorage.removeItem('am_timed_popup_shown_session');
    window.dispatchEvent(new Event('houseAdsUpdated'));
    if (setIsDirty) setIsDirty(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all campaigns back to default text and settings?')) return;
    setCampaigns(DEFAULT_HOUSE_AD_CAMPAIGNS);
    setSelectedIdx(0);
    localStorage.setItem('am_house_ad_campaigns_v2', JSON.stringify(DEFAULT_HOUSE_AD_CAMPAIGNS));
    await persistGlobalConfigToStorage(rewardedAdsEnabled, DEFAULT_HOUSE_AD_CAMPAIGNS);
    window.dispatchEvent(new Event('houseAdsUpdated'));
  };

  const currentPlacement: AdPlacementMode = activeCampaign.placementMode || 'both';
  const hasImgurAlbumUrl = isImgurAlbumWebpageUrl(activeCampaign.videoUrl);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-6xl space-y-6 text-white animate-fade-in">
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
                In-House Ads &amp; Popups Master Switch:
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
                ? 'Active campaigns below will run as 15s Chapter-Unlock Reward Ads, Timed Promo Popups, or Both based on each campaign’s Delivery Mode.'
                : 'Currently turned OFF for live users. Click "Enable Ads & Popups" on the right to make your ads and popups show up on the live app!'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMasterFeature}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shrink-0 cursor-pointer transition-all ${
            rewardedAdsEnabled
              ? 'bg-zinc-900 hover:bg-red-950 text-red-400 border border-red-500/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          }`}
        >
          <Power className="w-4 h-4" />
          {rewardedAdsEnabled ? 'Disable Ads & Popups' : 'Enable Ads & Popups'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Saturday AM • In-House Ad &amp; Promo Popup Studio
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-wider text-white">
            Cinematic Spotlight &amp; Timed Popup Builder
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Import any Store Bundle, visually pick any included Hype Card or Avatar (or upload an .MP4 video) as your BG art, and choose whether it runs as a Video Reward Ad or Timed Popup!
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
            <Save className="w-4 h-4" /> Save Campaigns
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Saved! Global Video Reward Ad &amp; Timed Popup campaigns have been synced.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {campaigns.map((camp, idx) => {
          const pMode = camp.placementMode || 'both';
          const modeTag =
            pMode === 'rewarded_unlock'
              ? '🎬 Reward Ad'
              : pMode === 'timed_popup'
              ? '⏱️ Timed Popup'
              : '⚡ Reward + Popup';
          return (
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
              <span>
                #{idx + 1} • {camp.headline.slice(0, 22)}
              </span>
              <span
                className={`text-[8px] px-1.5 py-0.5 rounded ${
                  selectedIdx === idx
                    ? 'bg-black/20 text-black'
                    : 'bg-zinc-900 text-[#fe9a00]'
                }`}
              >
                {modeTag}
              </span>
            </button>
          );
        })}

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

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#fe9a00]" /> 1. Campaign Delivery Mode (Reward Ad vs. Timed Popup)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'rewarded_unlock',
                  title: 'Video Reward Ad',
                  desc: '15s countdown to unlock Ch. 4+',
                  icon: PlayCircle
                },
                {
                  id: 'timed_popup',
                  title: 'Timed Promo Popup',
                  desc: 'Normal popup modal w/ Close X',
                  icon: BellRing
                },
                {
                  id: 'both',
                  title: 'Use for Both',
                  desc: 'Runs in Reward Ads & Popups',
                  icon: Zap
                }
              ].map(opt => {
                const Icon = opt.icon;
                const active = currentPlacement === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      updateActiveCampaign({ placementMode: opt.id as AdPlacementMode })
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-[#fe9a00]/15 border-[#fe9a00] text-white shadow-[0_0_15px_rgba(254,154,0,0.2)]'
                        : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#fe9a00]">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.title}</span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 mt-1 block">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
              {(currentPlacement === 'rewarded_unlock' || currentPlacement === 'both') && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Reward Ad Countdown (Sec)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={activeCampaign.rewardDurationSeconds ?? 15}
                    onChange={e =>
                      updateActiveCampaign({
                        rewardDurationSeconds: Math.max(5, Number(e.target.value) || 15)
                      })
                    }
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-black text-[#fe9a00]"
                  />
                </div>
              )}

              {(currentPlacement === 'timed_popup' || currentPlacement === 'both') && (
                <>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Popup Delay After Load (Sec)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={activeCampaign.popupDelaySeconds ?? 5}
                      onChange={e =>
                        updateActiveCampaign({
                          popupDelaySeconds: Math.max(0, Number(e.target.value) || 0)
                        })
                      }
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-black text-[#fe9a00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Popup Frequency
                    </label>
                    <select
                      value={activeCampaign.popupFrequency || 'once_per_session'}
                      onChange={e =>
                        updateActiveCampaign({
                          popupFrequency: e.target.value as any
                        })
                      }
                      className="w-full bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                    >
                      <option value="once_per_session">Once Per Session</option>
                      <option value="once_per_day">Once Per Day</option>
                      <option value="always">Every Page Visit</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-zinc-950 via-amber-950/25 to-zinc-950 border-2 border-[#fe9a00]/60 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> 2. Import Store Product &amp; Pick Background Art
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                {storeProducts.length} Products
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedImportProductId}
                onChange={e => setSelectedImportProductId(e.target.value)}
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
              >
                {storeProducts.length === 0 ? (
                  <option value="">No store products found</option>
                ) : (
                  storeProducts.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.title} (${prod.listed_price_dollars ?? 0} •{' '}
                      {prod.product_type === 'bundle' ? 'Bundle' : prod.product_type})
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                disabled={!selectedImportProductId}
                onClick={() => handleImportFromStoreProduct(selectedImportProductId)}
                className="px-4 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(254,154,0,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" /> Auto-Fill from Product
              </button>
            </div>

            <div className="pt-3 border-t border-zinc-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Included Hype Card Art ({includedHypeCardAssets.length}) — Click to Use as Hero BG:
                </span>
                {allMasterSkins.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSkinsLibrary(prev => !prev)}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-[#fe9a00] underline cursor-pointer"
                  >
                    {showAllSkinsLibrary
                      ? 'Hide Full Card Skin Vault'
                      : `Browse All ${allMasterSkins.length} Card Skins`}
                  </button>
                )}
              </div>

              {includedHypeCardAssets.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {includedHypeCardAssets.map(cardAsset => {
                    const isSelectedBg =
                      activeCampaign.backgroundImageUrl === cardAsset.image_url;
                    return (
                      <button
                        key={cardAsset.id}
                        type="button"
                        onClick={() =>
                          updateActiveCampaign({
                            backgroundImageUrl: cardAsset.image_url,
                            bundleAssets: liveBundleAssets
                          })
                        }
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                          isSelectedBg
                            ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.45)]'
                            : 'border-zinc-700 hover:border-[#fe9a00]'
                        }`}
                      >
                        <div className="w-full aspect-[1.58] bg-zinc-900 overflow-hidden relative">
                          <img
                            src={cardAsset.image_url}
                            alt={cardAsset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[7px] font-black uppercase tracking-widest shadow">
                            Hype Card Art
                          </span>
                          {isSelectedBg && (
                            <span className="absolute top-1.5 right-1.5 bg-emerald-400 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded shadow">
                              ✓ Active BG
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-black italic uppercase tracking-wider text-white truncate w-full px-2.5 py-1.5 text-left bg-zinc-950">
                          {cardAsset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-400 font-bold bg-black/50 border border-zinc-800 rounded-xl p-3">
                  Click <strong>&ldquo;Browse All {allMasterSkins.length} Card Skins&rdquo;</strong> on the right to pick any Hype Card artwork from your Vault!
                </div>
              )}

              {showAllSkinsLibrary && allMasterSkins.length > 0 && (
                <div className="bg-black/80 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                    All Vault Hype Card Skins ({allMasterSkins.length}) — Click Any Card to Use Its Art:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {allMasterSkins.map((sk: any) => {
                      const isSelectedBg = activeCampaign.backgroundImageUrl === sk.image_url;
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() =>
                            updateActiveCampaign({
                              backgroundImageUrl: sk.image_url
                            })
                          }
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-zinc-950 ${
                            isSelectedBg
                              ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/40'
                              : 'border-zinc-800 hover:border-zinc-500'
                          }`}
                        >
                          <div className="w-full aspect-[1.58] bg-zinc-900 overflow-hidden relative">
                            <img
                              src={sk.image_url}
                              alt={sk.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isSelectedBg && (
                              <span className="absolute top-1 right-1 bg-emerald-400 text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded">
                                ✓ Active
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] font-black uppercase text-zinc-200 truncate w-full px-2 py-1 text-center">
                            {sk.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {includedAvatarAssets.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-purple-400" /> Included Character Avatars ({includedAvatarAssets.length}) — Click to Use as Hero BG:
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {includedAvatarAssets.map(avAsset => {
                    const isSelectedBg = activeCampaign.backgroundImageUrl === avAsset.image_url;
                    return (
                      <button
                        key={avAsset.id}
                        type="button"
                        onClick={() =>
                          updateActiveCampaign({
                            backgroundImageUrl: avAsset.image_url,
                            bundleAssets: liveBundleAssets
                          })
                        }
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                          isSelectedBg
                            ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50'
                            : 'border-zinc-800 hover:border-zinc-600 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="w-full aspect-square bg-zinc-900 overflow-hidden relative">
                          <img
                            src={avAsset.image_url}
                            alt={avAsset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelectedBg && (
                            <span className="absolute top-1 right-1 bg-emerald-400 text-black text-[6px] font-black uppercase px-1 rounded">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[7px] font-black uppercase text-zinc-300 truncate w-full px-1 py-1 text-center bg-zinc-950">
                          {avAsset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                <Crop className="w-4 h-4 text-[#fe9a00]" /> 3. Crop, Zoom &amp; Pan Selected Background Art / Video
              </span>
              <button
                type="button"
                onClick={() =>
                  updateActiveCampaign({
                    cropZoom: 105,
                    cropPanX: 50,
                    cropPanY: 35,
                    bgOverlayOpacity: 30
                  })
                }
                className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
              >
                Reset Crop
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  <span>Art / Video Zoom</span>
                  <span className="text-[#fe9a00]">{activeCampaign.cropZoom ?? 115}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={250}
                  value={activeCampaign.cropZoom ?? 115}
                  onChange={e => updateActiveCampaign({ cropZoom: Number(e.target.value) })}
                  className="w-full accent-[#fe9a00]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  <span>Horizontal Pan (X)</span>
                  <span className="text-[#fe9a00]">{activeCampaign.cropPanX ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={activeCampaign.cropPanX ?? 50}
                  onChange={e => updateActiveCampaign({ cropPanX: Number(e.target.value) })}
                  className="w-full accent-[#fe9a00]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  <span>Vertical Pan (Y)</span>
                  <span className="text-[#fe9a00]">{activeCampaign.cropPanY ?? 35}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={activeCampaign.cropPanY ?? 35}
                  onChange={e => updateActiveCampaign({ cropPanY: Number(e.target.value) })}
                  className="w-full accent-[#fe9a00]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                <span>Bottom Vignette Shade (For Headline Contrast)</span>
                <span className="text-[#fe9a00]">{activeCampaign.bgOverlayOpacity ?? 35}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                value={activeCampaign.bgOverlayOpacity ?? 35}
                onChange={e => updateActiveCampaign({ bgOverlayOpacity: Number(e.target.value) })}
                className="w-full accent-[#fe9a00]"
              />
            </div>
          </div>

          <div className="space-y-4 bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
              <ImageIcon className="w-4 h-4 text-[#fe9a00]" /> Custom Upload or Video Override (Optional)
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Custom Background Image URL (Or click a Hype Card / Avatar above)
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
                  placeholder="Paste image URL or upload..."
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
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> Optional .MP4 Video Ad (Plays video instead of still art)
                </label>
                {activeCampaign.videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveCampaign({ videoUrl: '' });
                      setVideoUploadError('');
                    }}
                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Clear Video
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste direct .mp4 URL or click Upload .MP4..."
                  value={activeCampaign.videoUrl || ''}
                  onChange={e => {
                    setVideoUploadError('');
                    updateActiveCampaign({
                      videoUrl: normalizeHouseAdVideoUrl(e.target.value)
                    });
                  }}
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                />

                <label className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingField === 'videoUrl' ? 'Uploading...' : 'Upload .MP4'}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {hasImgurAlbumUrl && (
                <div className="bg-amber-950/70 border border-amber-500/60 text-amber-200 rounded-xl p-2.5 text-[10px] font-bold flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Imgur Album Link Detected (`imgur.com/a/...`):</strong> Imgur album webpages hide the actual `.mp4` filename. Either click <strong className="text-emerald-400">&ldquo;Upload .MP4&rdquo;</strong> on the right to upload your video file directly from your PC, or right-click the playing video on Imgur and select <strong className="text-white">&ldquo;Copy video address&rdquo;</strong> (`https://i.imgur.com/...mp4`).
                  </span>
                </div>
              )}

              {videoUploadError && (
                <p className="text-[10px] text-amber-300 font-bold">{videoUploadError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Main Headline (Auto-scales so full title is always visible)
              </label>
              <input
                type="text"
                value={activeCampaign.headline}
                onChange={e => updateActiveCampaign({ headline: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Subheadline / Perks Strip
              </label>
              <input
                type="text"
                value={activeCampaign.subheadline}
                onChange={e => updateActiveCampaign({ subheadline: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Price Tag Badge
              </label>
              <input
                type="text"
                placeholder="e.g. $24.99"
                value={activeCampaign.priceLabel || ''}
                onChange={e => updateActiveCampaign({ priceLabel: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-[#fe9a00] font-black"
              />
            </div>
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
                <option value="external_url">Open URL / Store Item Link</option>
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

        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-black/80 border border-zinc-800 rounded-2xl p-4 space-y-3.5 sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Modal Preview (Cinematic Hero Crop)
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                {currentPlacement === 'rewarded_unlock'
                  ? 'Reward Ad Mode'
                  : currentPlacement === 'timed_popup'
                  ? 'Timed Popup Mode'
                  : 'Reward + Popup'}
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase tracking-widest">
                    {activeCampaign.badge}
                  </span>
                  {currentPlacement === 'timed_popup' ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                      Featured Store Drop
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                      Unlocking in {activeCampaign.rewardDurationSeconds ?? 15}s...
                    </span>
                  )}
                </div>

                {currentPlacement === 'timed_popup' && (
                  <span className="p-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                    <X className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div className="relative w-full aspect-video bg-black overflow-hidden">
                <HouseAdVisualSlide ad={activeCampaign} />
                {currentPlacement !== 'timed_popup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-20">
                    <div className="h-full bg-[#fe9a00] w-1/3" />
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                    {activeCampaign.badge}
                  </p>
                  <p className="text-xs font-black text-white leading-snug break-words">
                    {activeCampaign.headline}
                  </p>
                </div>
                <span className="px-3.5 py-2 rounded-xl bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0 shadow-[0_0_15px_rgba(254,154,0,0.3)]">
                  {activeCampaign.ctaLabel} <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTestCountdown(activeCampaign.rewardDurationSeconds ?? 15);
                  setTestModalMode('rewarded');
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Test as Reward Ad
              </button>

              <button
                type="button"
                onClick={() => {
                  setTestCountdown(0);
                  setTestModalMode('timed_popup');
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" /> Test Timed Popup
              </button>
            </div>
          </div>
        </div>
      </div>

      {testModalMode && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setTestModalMode(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl overflow-hidden max-w-2xl w-full shadow-[0_0_60px_rgba(254,154,0,0.35)]"
          >
            <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest">
                  {activeCampaign.badge}
                </span>
                {testModalMode === 'rewarded' ? (
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    {testCountdown > 0
                      ? `Chapter Unlocking in ${testCountdown}s...`
                      : '✓ Chapter Unlocked!'}
                  </span>
                ) : (
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    Special Event Spotlight
                  </span>
                )}
              </div>

              {(testModalMode === 'timed_popup' || testCountdown === 0) && (
                <button
                  type="button"
                  onClick={() => setTestModalMode(null)}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative w-full aspect-video bg-black overflow-hidden">
              <HouseAdVisualSlide ad={activeCampaign} allowAudio={true} />
            </div>

            <div className="p-5 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                  {activeCampaign.badge}
                </span>
                <h4 className="text-base sm:text-lg font-black italic uppercase text-white leading-snug break-words">
                  {activeCampaign.headline}
                </h4>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCampaign.clickUrl) {
                      window.open(activeCampaign.clickUrl, '_blank');
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(254,154,0,0.4)] cursor-pointer"
                >
                  {activeCampaign.ctaLabel} <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTestModalMode(null)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-black uppercase tracking-widest border border-zinc-800 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};