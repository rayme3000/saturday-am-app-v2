import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Zap, UserPlus, Sparkles, Crown, Layers, PenTool, Flame } from 'lucide-react';
import { supabase, trackTelemetry } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// Fallback Rotating Copy Pool (Used ONLY if 0 cards exist in `upsell_popups`)
export const DEFAULT_PLUS_UPSELL_MESSAGES = [
  {
    id: 'default_plus_vault',
    badge: 'UNLOCK THE FULL VAULT',
    title: "DON'T STOP AT THE CLIFFHANGER!",
    message:
      'Unlock every single chapter, Completed Run, and exclusive One-Shot in the Saturday AM Vault for less than a soda — just $1.99/mo!',
    cta: 'Unlock Every Chapter ($1.99)'
  },
  {
    id: 'default_plus_early_access',
    badge: '12-HOUR VIP EARLY ACCESS',
    title: 'READ NEW DROPS FIRST!',
    message:
      'Why wait? PLUS members unlock weekly chapter drops 12 hours before everyone else — with 100% ad-free reading across all your devices.',
    cta: 'Get VIP Early Access ($1.99)'
  },
  {
    id: 'default_plus_loadout',
    badge: 'ULTIMATE FAN LOADOUT',
    title: 'SUPERCHARGE YOUR PROFILE!',
    message:
      'Stand out in the comments and leaderboards with animated border frames, exclusive Hype Card skins, and 3x Weekly Super Hypes!',
    cta: 'Upgrade My Loadout ($1.99)'
  },
  {
    id: 'default_plus_creators',
    badge: 'BACK DIVERSE CREATORS',
    title: 'FUEL THE MANGA REVOLUTION!',
    message:
      'Your $1.99/mo membership directly supports independent global manga creators while unlocking unlimited, ad-free binging across the entire app.',
    cta: 'Join Saturday AM+ ($1.99)'
  },
  {
    id: 'default_plus_ad_free',
    badge: '100% AD-FREE BINGING',
    title: 'ZERO ADS. ZERO LIMITS.',
    message:
      'Skip the daily unlock timers forever! Binge Apple Black, Clock Striker, Bully Eater, and 30+ hit series back-to-back without interruptions.',
    cta: 'Go Ad-Free for $1.99/mo'
  }
];

export const DEFAULT_VISITOR_UPSELL_MESSAGES = [
  {
    id: 'default_visitor_pass',
    badge: 'FREE READER PASS',
    title: 'UNLOCK FREE CHAPTERS NOW!',
    message:
      'Create your free Saturday AM account in 10 seconds to unlock Chapters 1–3, save series to your bookshelf, and claim your Virtual Hype Card!',
    cta: 'Create Free Account'
  },
  {
    id: 'default_visitor_hype_card',
    badge: 'JOIN THE SQUAD',
    title: 'CLAIM YOUR HYPE CARD!',
    message:
      'Sign up free to equip character avatars, drop weekly Hypes on your favorite series, and join the community discussion!',
    cta: 'Sign Up Free'
  }
];

export const UPSELL_ATTRIBUTION_STORAGE_KEY = 'am_active_upsell_popup_attribution';

export interface UpsellPopupAttribution {
  popup_id: string;
  popup_title: string;
  popup_badge: string;
  popup_cta: string;
  popup_type: 'command_center_card' | 'event_bundle_popup' | 'default_fallback';
  audience_mode: 'visitor' | 'plus';
  clicked_at: string;
}

export const saveUpsellPopupAttribution = (attr: UpsellPopupAttribution) => {
  try {
    localStorage.setItem(UPSELL_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attr));
  } catch {
    // ignore storage errors
  }
};

export const getPendingUpsellPopupAttribution = (): UpsellPopupAttribution | null => {
  try {
    const raw = localStorage.getItem(UPSELL_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.popup_id) return null;
    // Attribution window: 48 hours from click
    const clickedMs = new Date(parsed.clicked_at || 0).getTime();
    if (!isNaN(clickedMs) && Date.now() - clickedMs > 48 * 60 * 60 * 1000) {
      localStorage.removeItem(UPSELL_ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearUpsellPopupAttribution = () => {
  try {
    localStorage.removeItem(UPSELL_ATTRIBUTION_STORAGE_KEY);
  } catch {
    // ignore
  }
};

// Detects generic hardcoded App.tsx strings so they NEVER override your Command Center cards
function isGenericDefaultUpsellText(text?: string): boolean {
  if (!text) return true;
  const lower = text.trim().toLowerCase();
  return (
    lower === 'enjoying saturday am?' ||
    lower === 'start reading free' ||
    lower.includes('upgrade to saturday am+ for $1.99/mo to get 3 weekly super hypes') ||
    lower.includes('create a free saturday am account to read standard chapters') ||
    lower.includes('upgrade to saturday am+ plus ($1.99/mo) to unlock the entire chapter vault')
  );
}

// Cycles through every card in a shuffled deck before repeating any card
function pickNextFromDeck(length: number, deckKey: string): number {
  if (length <= 1) return 0;
  try {
    const raw = sessionStorage.getItem(deckKey);
    let queue: number[] = raw ? JSON.parse(raw) : [];
    queue = queue.filter(i => typeof i === 'number' && i >= 0 && i < length);

    if (queue.length === 0) {
      const indices = Array.from({ length }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const lastShown = parseInt(sessionStorage.getItem(`${deckKey}_last`) || '-1', 10);
      if (indices.length > 1 && indices[0] === lastShown) {
        const swap = indices[0];
        indices[0] = indices[indices.length - 1];
        indices[indices.length - 1] = swap;
      }
      queue = indices;
    }

    const nextIdx = queue.shift()!;
    sessionStorage.setItem(deckKey, JSON.stringify(queue));
    sessionStorage.setItem(`${deckKey}_last`, String(nextIdx));
    return nextIdx;
  } catch {
    return Math.floor(Math.random() * length);
  }
}

let cachedUpsellPopups: any[] | null = null;

export const PromoModal = ({
  userTier,
  onClose,
  onAction,
  customMessage,
  customTitle,
  forceMode
}: any) => {
  const { seriesList = [] } = useSeriesData();
  const [showBetaInput, setShowBetaInput] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  const [featuredBundle, setFeaturedBundle] = useState<any | null>(null);
  const [alreadyOwnsBundle, setAlreadyOwnsBundle] = useState(false);
  const [customCampaigns, setCustomCampaigns] = useState<any[]>(cachedUpsellPopups || []);
  const [isLoaded, setIsLoaded] = useState<boolean>(Boolean(cachedUpsellPopups));

  const loggedImpressionRef = useRef<string | null>(null);

  const isVisitor = forceMode ? forceMode === 'visitor' : userTier === 'visitor';

  // Ignore generic App.tsx strings so Command Center cards always take priority
  const hasSpecificContextualMessage =
    Boolean(customMessage) && !isGenericDefaultUpsellText(customMessage);
  const hasSpecificContextualTitle =
    Boolean(customTitle) && !isGenericDefaultUpsellText(customTitle);

  useEffect(() => {
    let isMounted = true;

    const loadPopupData = async () => {
      const [{ data: bundles }, { data: popups }] = await Promise.all([
        supabase
          .from('themed_annual_bundles')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('upsell_popups')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (!isMounted) return;

      if (Array.isArray(popups)) {
        cachedUpsellPopups = popups;
        setCustomCampaigns(popups);
      }
      setIsLoaded(true);

      if (!bundles || bundles.length === 0 || hasSpecificContextualMessage) return;

      const now = Date.now();
      const validBundle = bundles.find((b: any) => {
        if (b.available_from && now < new Date(b.available_from).getTime()) return false;
        if (b.available_until && now > new Date(b.available_until).getTime()) return false;
        return true;
      });

      if (!validBundle) return;

      // If you have custom upsell popups in Command Center, only show the Event Bundle 20% of the time
      if (Array.isArray(popups) && popups.length > 0 && Math.random() > 0.2) {
        return;
      }

      setFeaturedBundle(validBundle);

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user && validBundle.card_skin_url) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('card_skin, unlocked_skins')
          .eq('id', user.id)
          .maybeSingle();
        if (prof) {
          const owned: string[] = Array.isArray(prof.unlocked_skins)
            ? prof.unlocked_skins.map(String)
            : [];
          if (
            prof.card_skin === validBundle.card_skin_url ||
            owned.includes(String(validBundle.card_skin_id)) ||
            owned.includes(String(validBundle.card_skin_url))
          ) {
            setAlreadyOwnsBundle(true);
          }
        }
      }
    };

    loadPopupData();
    return () => {
      isMounted = false;
    };
  }, [hasSpecificContextualMessage]);

  // Select a Command Center card (keeping its exact Art + Badge + Headline + Copy + CTA paired together!)
  const selectedVariant = useMemo(() => {
    const audienceFiltered = customCampaigns.filter(c =>
      isVisitor
        ? c.target_audience === 'visitor_signup' || c.target_audience === 'both'
        : c.target_audience === 'plus_upsell' || c.target_audience === 'both'
    );

    // If audience-specific pool is empty, use all active Command Center cards
    const activePool = audienceFiltered.length > 0 ? audienceFiltered : customCampaigns;

    if (activePool.length > 0) {
      const deckKey = isVisitor ? 'am_upsell_deck_visitor' : 'am_upsell_deck_plus';
      const pickedIdx = pickNextFromDeck(activePool.length, deckKey);
      const card = activePool[pickedIdx];

      return {
        id: String(card.id || `cc_${pickedIdx}`),
        popupType: 'command_center_card' as const,
        badge: card.badge_text || (isVisitor ? 'FREE READER PASS' : 'SATURDAY AM+ PLUS'),
        title: hasSpecificContextualTitle ? customTitle : card.title,
        message: hasSpecificContextualMessage ? customMessage : card.message,
        cta: card.cta_text || (isVisitor ? 'Create Free Account' : 'Upgrade to PLUS ($1.99)'),
        imageUrl: card.image_url || ''
      };
    }

    // Fallback ONLY if 0 cards exist in `upsell_popups`
    const copyPool = isVisitor ? DEFAULT_VISITOR_UPSELL_MESSAGES : DEFAULT_PLUS_UPSELL_MESSAGES;
    const copyIdx = pickNextFromDeck(copyPool.length, 'am_fallback_copy_deck');
    const baseCopy = copyPool[copyIdx];

    const seriesArtUrls = (seriesList || [])
      .map((s: any) => s.cover_url || s.banner_url)
      .filter(Boolean);
    const artIdx = pickNextFromDeck(seriesArtUrls.length, 'am_fallback_art_deck');

    return {
      id: baseCopy.id,
      popupType: 'default_fallback' as const,
      badge: baseCopy.badge,
      title: hasSpecificContextualTitle ? customTitle : baseCopy.title,
      message: hasSpecificContextualMessage ? customMessage : baseCopy.message,
      cta: baseCopy.cta,
      imageUrl: seriesArtUrls[artIdx] || ''
    };
  }, [
    customCampaigns,
    isVisitor,
    seriesList,
    customMessage,
    customTitle,
    hasSpecificContextualMessage,
    hasSpecificContextualTitle
  ]);

  const isBundleActiveModal = Boolean(
    featuredBundle && !alreadyOwnsBundle && !hasSpecificContextualMessage
  );

  // Track Upsell Popup Impression once when the modal renders
  useEffect(() => {
    if (!isLoaded) return;
    if (!featuredBundle && userTier === 'premium' && !forceMode) return;
    if (featuredBundle && alreadyOwnsBundle && !hasSpecificContextualMessage) return;

    const activePopupId = isBundleActiveModal
      ? `bundle_popup_${featuredBundle.id || featuredBundle.title}`
      : selectedVariant.id;
    const activePopupTitle = isBundleActiveModal ? featuredBundle.title : selectedVariant.title;
    const activePopupBadge = isBundleActiveModal
      ? featuredBundle.theme_badge || 'LIMITED EDITION DROP'
      : selectedVariant.badge;

    if (loggedImpressionRef.current === activePopupId) return;
    loggedImpressionRef.current = activePopupId;

    trackTelemetry('upsell_popup_impression', {
      popup_id: activePopupId,
      popup_title: activePopupTitle,
      popup_badge: activePopupBadge,
      popup_type: isBundleActiveModal ? 'event_bundle_popup' : selectedVariant.popupType,
      audience_mode: isVisitor ? 'visitor' : 'plus'
    });
  }, [
    isLoaded,
    isBundleActiveModal,
    featuredBundle,
    alreadyOwnsBundle,
    hasSpecificContextualMessage,
    selectedVariant,
    userTier,
    forceMode,
    isVisitor
  ]);

  if (!featuredBundle && userTier === 'premium' && !forceMode) return null;
  if (featuredBundle && alreadyOwnsBundle && !hasSpecificContextualMessage) return null;
  if (!isLoaded) return null;

  // ============================================================================
  // 1. SPECIAL EVENT BUNDLE POP-UP AD (WHEN SELECTED)
  // ============================================================================
  if (featuredBundle && !hasSpecificContextualMessage) {
    const price = Number(featuredBundle.price_dollars || 24.99);
    const normalPrice = Number(featuredBundle.original_price_dollars || 35);
    const hasDiscount = normalPrice > price && normalPrice > 0;
    const discountPct = hasDiscount
      ? Math.round(((normalPrice - price) / normalPrice) * 100)
      : 0;
    const avatars: string[] = Array.isArray(featuredBundle.avatar_urls)
      ? featuredBundle.avatar_urls.filter(Boolean)
      : [];
    const cards = [
      featuredBundle.card_skin_url
        ? { url: featuredBundle.card_skin_url, name: featuredBundle.card_skin_name || 'Card #1' }
        : null,
      featuredBundle.card_skin_2_url
        ? { url: featuredBundle.card_skin_2_url, name: featuredBundle.card_skin_2_name || 'Card #2' }
        : null
    ].filter(Boolean) as { url: string; name: string }[];
    const autographs = [
      featuredBundle.creator_autograph,
      featuredBundle.creator_autograph_2
    ].filter(Boolean);
    const bonusHypes = Number(featuredBundle.bonus_hypes || 0);

    const handleGoToBundleInStore = () => {
      const popupId = `bundle_popup_${featuredBundle.id || featuredBundle.title}`;
      const attribution: UpsellPopupAttribution = {
        popup_id: popupId,
        popup_title: featuredBundle.title || 'Special Bundle Popup',
        popup_badge: featuredBundle.theme_badge || 'LIMITED EDITION DROP',
        popup_cta: `Get Bundle ($${price})`,
        popup_type: 'event_bundle_popup',
        audience_mode: isVisitor ? 'visitor' : 'plus',
        clicked_at: new Date().toISOString()
      };
      saveUpsellPopupAttribution(attribution);
      trackTelemetry('upsell_popup_cta_click', attribution);

      if (onClose) onClose();
      window.history.pushState({ view: 'shop' }, '', '/?view=shop');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'shop' } }));
    };

    return (
      <div
        className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-2 border-[#fe9a00] p-6 sm:p-7 rounded-3xl w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.3)] relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 bg-[#fe9a00]/25 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 relative z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest shadow-md">
              <Sparkles className="w-3 h-3 fill-black" />
              {featuredBundle.theme_badge || 'LIMITED EDITION DROP'}
            </span>
            {discountPct > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest shadow-md">
                SAVE {discountPct}% OFF
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-tight mb-1 relative z-10">
            {featuredBundle.title}
          </h2>

          {cards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 w-full my-3 relative z-10">
              {cards.map((c, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-[1.58] rounded-xl overflow-hidden border-2 border-[#fe9a00] shadow-[0_8px_20px_rgba(0,0,0,0.8)] ${
                    cards.length === 1 ? 'col-span-2 max-w-[240px] mx-auto w-full' : ''
                  }`}
                >
                  <img src={c.url} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white block truncate">
                      {c.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {avatars.length > 0 && (
            <div className="flex flex-col items-center my-2 relative z-10">
              <div className="flex items-center justify-center -space-x-2.5 mb-1">
                {avatars.slice(0, 5).map((avUrl, idx) => (
                  <img
                    key={idx}
                    src={avUrl}
                    alt={`Avatar ${idx + 1}`}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900 shadow-lg"
                  />
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                Includes {avatars.length} Exclusive Character Avatars
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1.5 my-3 relative z-10">
            <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#fe9a00]" /> 1-Yr Pass
            </span>
            {cards.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#fe9a00]" /> {cards.length} Hype Card{cards.length > 1 ? 's' : ''}
              </span>
            )}
            {autographs.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-[#fe9a00] flex items-center gap-1">
                <PenTool className="w-3 h-3" /> {autographs.join(' & ')}
              </span>
            )}
            {bonusHypes > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-yellow-300/80 text-[9px] font-black uppercase tracking-wider text-yellow-200 flex items-center gap-1 shadow-[0_0_12px_rgba(253,224,71,0.3)]">
                <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" /> +{bonusHypes} Gold Hypes
              </span>
            )}
          </div>

          <div className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-3.5 mt-1 mb-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Special Bundle Price
              </span>
              <div className="flex items-baseline gap-2">
                {hasDiscount && (
                  <span className="text-sm font-black italic text-zinc-500 line-through">
                    ${normalPrice}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-black italic text-[#fe9a00]">
                  ${price}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToBundleInStore}
              className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] to-yellow-400 hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(254,154,0,0.45)] transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              Get Bundle (${price})
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. VISUAL ARTWORK + MATCHED COMMAND CENTER COPY UPSELL MODAL
  // ============================================================================
  const handlePrimaryUpsellClick = () => {
    const attribution: UpsellPopupAttribution = {
      popup_id: selectedVariant.id,
      popup_title: selectedVariant.title,
      popup_badge: selectedVariant.badge,
      popup_cta: selectedVariant.cta,
      popup_type: selectedVariant.popupType,
      audience_mode: isVisitor ? 'visitor' : 'plus',
      clicked_at: new Date().toISOString()
    };
    saveUpsellPopupAttribution(attribution);
    trackTelemetry('upsell_popup_cta_click', {
      ...attribution,
      entered_promo_code: betaCode || null
    });
    onAction(betaCode);
  };

  return (
    <div
      className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-2 border-[#fe9a00]/80 rounded-3xl w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP VISUAL ARTWORK BANNER (16:9 / 1200x675) */}
        <div className="relative w-full aspect-[16/9] bg-zinc-900 overflow-hidden">
          {selectedVariant.imageUrl ? (
            <img
              src={selectedVariant.imageUrl}
              alt={selectedVariant.title}
              className="w-full h-full object-cover object-top scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#fe9a00]/30 via-zinc-900 to-black flex items-center justify-center">
              {isVisitor ? (
                <UserPlus className="w-12 h-12 text-[#fe9a00]" />
              ) : (
                <Zap className="w-12 h-12 text-[#fe9a00]" />
              )}
            </div>
          )}

          {/* Smooth Gradient Blend into Card Body */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-black/20 pointer-events-none" />

          {/* Floating Top-Left Pill Badge */}
          <div className="absolute top-3.5 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#fe9a00]/60 text-[#fe9a00] text-[9px] font-black uppercase tracking-widest shadow-lg">
              <Sparkles className="w-3 h-3 fill-[#fe9a00]" />
              {selectedVariant.badge}
            </span>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-black/75 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL TEXT & CTA BODY */}
        <div className="px-6 sm:px-8 pb-7 pt-2 w-full flex flex-col items-center -mt-4 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-3 drop-shadow-md">
            {selectedVariant.title}
          </h2>

          <p className="text-zinc-300 text-xs sm:text-sm font-bold leading-relaxed mb-5 max-w-sm">
            {selectedVariant.message}
          </p>

          {/* Optional Promo / Gift Code Input */}
          <div className="w-full mb-4 flex flex-col items-center justify-center">
            {!showBetaInput ? (
              <button
                type="button"
                onClick={() => setShowBetaInput(true)}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#fe9a00] transition-colors cursor-pointer"
              >
                + Have a Promo or Gift Code?
              </button>
            ) : (
              <div className="w-full animate-fade-in relative">
                <input
                  type="text"
                  placeholder="ENTER CODE"
                  value={betaCode}
                  onChange={e => setBetaCode(e.target.value.toUpperCase())}
                  maxLength={24}
                  className="w-full bg-black border border-zinc-700 focus:border-[#fe9a00] text-[#fe9a00] text-center font-black uppercase tracking-widest text-xs py-2.5 px-4 rounded-xl focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrimaryUpsellClick}
            className="w-full font-black uppercase tracking-widest text-xs sm:text-sm py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.4)] bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>{selectedVariant.cta}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-3.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};