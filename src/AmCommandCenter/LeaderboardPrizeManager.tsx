import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Crown,
  Plus,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Package,
  Crop,
  Monitor,
  Smartphone,
  CheckCircle2,
  X,
  XCircle,
  Eye,
  Check,
  CreditCard,
  Layers,
  Loader2,
  Calendar,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import {
  DEFAULT_LEADERBOARD_PRIZES_CONFIG,
  SAT_AM_SHOP_LOGO_URL,
  GOLD_HYPE_ICON_URL,
  STORE_DISCOUNT_PRESETS,
  normalizeFivePrizeTiers,
  normalizeGrandPrizeItems,
  type ShopLogoCorner,
  type ContestBannerEdge,
  type GrandPrizeStackItem,
  type LeaderboardPrizesConfig,
  type LeaderboardPrizeTierConfig,
  type PastWinnerRecord,
  type PastWinnersMonthEntry
} from '../MainViews/Leaderboard';

const DEFAULT_SHOPIFY_DOMAIN = 'shopsaturdayam.com';

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

const matchCreatorNames = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = String(nameA).trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanB = String(nameB).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  for (const group of CREATOR_ALIAS_GROUPS) {
    const aIn = group.some(a => cleanA === a || cleanA.includes(a) || a.includes(cleanA));
    const bIn = group.some(b => cleanB === b || cleanB.includes(b) || b.includes(cleanB));
    if (aIn && bIn) return true;
  }
  return false;
};

const toSlideLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const UPCOMING_SCHEDULE_MONTHS = [
  { key: 'default', label: 'Default / Evergreen Template (Fallback)' },
  { key: '2026-11', label: 'November 2026 Contest' },
  { key: '2026-12', label: 'December 2026 Contest' },
  { key: '2027-01', label: 'January 2027 Contest' },
  { key: '2027-02', label: 'February 2027 Contest' },
  { key: '2027-03', label: 'March 2027 Contest' },
  { key: '2027-04', label: 'April 2027 Contest' }
];

interface StudioAssetOption {
  id: string;
  label: string;
  type: 'card_skin' | 'avatar' | 'series_art';
  image_url: string;
}

interface StudioSignature {
  creator_name: string;
  signature_url: string;
}

interface CatalogDropdownOption {
  optionKey: string;
  group: 'shopify_merch' | 'store_bundle' | 'card_skin' | 'avatar';
  itemType: 'physical' | 'digital';
  label: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  productUrl?: string;
}

const loadCorsImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const WinnerFulfillmentAndSocialStudio = ({
  config,
  setConfig,
  activeSlice,
  leaderboardHeroUrl
}: {
  config: LeaderboardPrizesConfig;
  setConfig: React.Dispatch<React.SetStateAction<LeaderboardPrizesConfig>>;
  activeSlice: any;
  leaderboardHeroUrl?: string;
}) => {
  const [liveTop5, setLiveTop5] = useState<PastWinnerRecord[]>([]);
  const [loadingTop5, setLoadingTop5] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [selectedSocialMonthKey, setSelectedSocialMonthKey] = useState<string>('live');

  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      startIso: startOfMonth.toISOString()
    };
  }, []);

  const fetchLiveTop5Standings = useCallback(async () => {
    setLoadingTop5(true);
    try {
      const { startIso } = currentMonthInfo;
      const [
        { data: profiles },
        { data: reads },
        { data: hypes },
        { data: comments },
        { data: reacts },
        { data: sLikes },
        { data: cLikes },
        { data: tips }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_frame_id, fandom_score, role, is_admin, email, linked_creator_name'),
        supabase.from('completed_reads').select('user_id, chapter_id, created_at').gte('created_at', startIso),
        supabase.from('hypes').select('user_id, target_type, created_at').neq('target_type', 'comment').gte('created_at', startIso),
        supabase.from('series_comments').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('page_reacts').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('series_likes').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('chapter_likes').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('creator_tips').select('user_id, amount_dollars, created_at').gte('created_at', startIso)
      ]);

      const excludedRoles = new Set(['creator', 'core_creator', 'staff', 'influencer', 'admin', 'moderator']);
      const validFanMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        const uname = String(p.username || '').trim();
        const role = String(p.role || 'reader').toLowerCase();
        if (
          !uname ||
          p.is_admin ||
          p.linked_creator_name ||
          excludedRoles.has(role) ||
          uname.toLowerCase().includes('test') ||
          String(p.email || '').toLowerCase().includes('test')
        ) {
          return;
        }
        validFanMap.set(String(p.id), p);
      });

      const scores = new Map<string, number>();
      const loginDays = new Map<string, Set<string>>();

      const addPts = (uid: any, pts: number, dt?: any) => {
        const id = String(uid || '');
        if (!validFanMap.has(id)) return;
        scores.set(id, (scores.get(id) || 0) + pts);
        if (dt) {
          const dayKey = String(dt).slice(0, 10);
          if (!loginDays.has(id)) loginDays.set(id, new Set());
          loginDays.get(id)!.add(dayKey);
        }
      };

      (tips || []).forEach((t: any) => addPts(t.user_id, Math.max(10, Number(t.amount_dollars || 5) * 2), t.created_at));
      const seenReads = new Set<string>();
      (reads || []).forEach((r: any) => {
        const k = `${r.user_id}_${r.chapter_id}`;
        if (!seenReads.has(k)) {
          seenReads.add(k);
          addPts(r.user_id, 10, r.created_at);
        }
      });
      (hypes || []).forEach((h: any) => addPts(h.user_id, 10, h.created_at));
      (comments || []).forEach((c: any) => addPts(c.user_id, 3, c.created_at));
      (reacts || []).forEach((pr: any) => addPts(pr.user_id, 2, pr.created_at));
      (sLikes || []).forEach((l: any) => addPts(l.user_id, 1, l.created_at));
      (cLikes || []).forEach((l: any) => addPts(l.user_id, 1, l.created_at));

      loginDays.forEach((dSet, uid) => {
        scores.set(uid, (scores.get(uid) || 0) + dSet.size * 5);
      });

      const candidates: any[] = [];
      validFanMap.forEach((p, id) => {
        const s = scores.get(id) || 0;
        if (s > 0 || Number(p.fandom_score || 0) > 0) {
          candidates.push({
            user_id: id,
            username: p.username,
            avatar_url: p.avatar_url || '',
            frame_id: p.avatar_frame_id || 'none',
            score: s,
            lifetime: Number(p.fandom_score || 0)
          });
        }
      });

      candidates.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.lifetime - a.lifetime));

      const top5: PastWinnerRecord[] = candidates.slice(0, 5).map((c, idx) => {
        const place = (idx + 1) as 1 | 2 | 3 | 4 | 5;
        const matchedTier = (activeSlice.tiers || []).find((t: any) => t.place === place);
        const itemSummary = Array.isArray(matchedTier?.prizeItems) && matchedTier.prizeItems.length > 0
          ? matchedTier.prizeItems.map((it: any) => it.title).filter(Boolean).join(' + ')
          : '';
        return {
          rank: place,
          user_id: c.user_id,
          username: c.username,
          avatar_url: c.avatar_url,
          frame_id: c.frame_id,
          score: c.score,
          prizeTitle: matchedTier?.title || itemSummary || `Rank #${place} Prize`
        };
      });

      setLiveTop5(top5);
    } finally {
      setLoadingTop5(false);
    }
  }, [currentMonthInfo, activeSlice.tiers]);

  useEffect(() => {
    fetchLiveTop5Standings();
  }, [fetchLiveTop5Standings]);

  const handleFinalizeAndAutoDropWinners = async () => {
    if (liveTop5.length === 0) return alert('No Top 5 standings found to finalize yet.');
    if (
      !window.confirm(
        `Finalize ${currentMonthInfo.monthLabel} Top 5 Winners?\n\nThis will:\n1. Instantly unlock every digital reward (Store Bundles, Card Skins, Avatars, Signatures & Bonus Gold Hypes) assigned to each winner's rank.\n2. Trigger their Gold Dot Congrats Notification on the Home Page.\n3. Add ${currentMonthInfo.monthLabel} to the "See Past Winners" Hall of Fame & 1:1 Social Graphic!`
      )
    )
      return;

    setIsAwarding(true);
    try {
      const { data: allStoreProds } = await supabase.from('in_app_store_products').select('*');
      const storeProdById = new Map<string, any>();
      (allStoreProds || []).forEach((sp: any) => storeProdById.set(`store_${sp.id}`, sp));

      for (const winner of liveTop5) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, unlocked_skins, unlocked_avatars, unlocked_autographs, vaulted_hypes, is_premium')
          .eq('id', winner.user_id)
          .maybeSingle();

        if (!prof) continue;

        const unlockedSkins = new Set<string>(Array.isArray(prof.unlocked_skins) ? prof.unlocked_skins : []);
        const unlockedAvatars = new Set<string>(Array.isArray(prof.unlocked_avatars) ? prof.unlocked_avatars : []);
        const unlockedAutos = new Set<string>(Array.isArray(prof.unlocked_autographs) ? prof.unlocked_autographs : []);
        let bonusHypesToAdd = 0;

        const applyLinkedOptionKey = (
          optKey?: string,
          imgUrl?: string,
          rankPlace: number = 1
        ) => {
          if (!optKey || optKey.startsWith('shopify_')) return;
          if (optKey.startsWith('skin_')) {
            unlockedSkins.add(optKey.replace('skin_', ''));
          } else if (optKey.startsWith('avatar_') && imgUrl) {
            unlockedAvatars.add(imgUrl);
          } else if (optKey.startsWith('store_')) {
            const prod = storeProdById.get(optKey);
            if (prod) {
              const skinIds: string[] = Array.isArray(prod.card_skin_ids)
                ? prod.card_skin_ids.filter(Boolean)
                : [];
              const avUrls: string[] = Array.isArray(prod.avatar_urls)
                ? prod.avatar_urls.filter(Boolean)
                : [];

              const maxSkins = rankPlace === 1 ? skinIds.length : rankPlace === 2 ? 1 : 0;
              const maxAvatars = rankPlace <= 3 ? 5 : 1;

              skinIds.slice(0, maxSkins).forEach((id: string) => {
                unlockedSkins.add(String(id));
              });
              avUrls.slice(0, maxAvatars).forEach((u: string) => {
                unlockedAvatars.add(String(u));
              });

              if (rankPlace === 1) {
                (Array.isArray(prod.autograph_creators) ? prod.autograph_creators : []).forEach(
                  (a: string) => {
                    if (a) unlockedAutos.add(String(a));
                  }
                );
              }
            }
          }
        };

        const tierCfg = (activeSlice.tiers || []).find((t: any) => t.place === winner.rank);
        const tierGoldBonus = Number(
          tierCfg?.goldHypesBonus ??
            (winner.rank === 1 ? 5 : winner.rank === 2 ? 3 : winner.rank === 3 ? 2 : 1)
        );
        bonusHypesToAdd += tierGoldBonus;

        const tierPrizeItems: GrandPrizeStackItem[] = Array.isArray(tierCfg?.prizeItems)
          ? tierCfg.prizeItems
          : winner.rank === 1
          ? activeSlice.grandPrizeItems || []
          : [];

        if (tierPrizeItems.length > 0) {
          tierPrizeItems.forEach(item =>
            applyLinkedOptionKey(item.linkedStoreProductId, item.imageUrl, winner.rank)
          );
        } else if (tierCfg) {
          applyLinkedOptionKey(tierCfg.linkedStoreProductId, tierCfg.imageUrl, winner.rank);
          if ((tierCfg as any).secondaryStoreProductId) {
            applyLinkedOptionKey((tierCfg as any).secondaryStoreProductId, tierCfg.imageUrl, winner.rank);
          }
        }

        await supabase
          .from('profiles')
          .update({
            unlocked_skins: Array.from(unlockedSkins),
            unlocked_avatars: Array.from(unlockedAvatars),
            unlocked_autographs: Array.from(unlockedAutos),
            vaulted_hypes: Number(prof.vaulted_hypes || 0) + bonusHypesToAdd
          })
          .eq('id', winner.user_id);

        await supabase.from('app_notifications').insert([
          {
            title: `🏆 Congrats! #${winner.rank} Super Fan Winner!`,
            message: `You finished #${winner.rank} in the ${currentMonthInfo.monthLabel} Monthly Fandom Prize Pool! Your digital rewards (${winner.prizeTitle}) and +${tierGoldBonus} Gold Hypes are now unlocked in your Profile!`,
            thumbnail_url:
              winner.avatar_url ||
              'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png',
            link_target: 'profile',
            source_key: `winner_${currentMonthInfo.monthKey}_${winner.user_id}`
          }
        ]);
      }

      const newHistoryEntry: PastWinnersMonthEntry = {
        monthKey: currentMonthInfo.monthKey,
        monthLabel: currentMonthInfo.monthLabel,
        seasonTitle: activeSlice.seasonTitle,
        heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
        finalizedAt: new Date().toISOString(),
        winners: liveTop5
      };

      const existingHistory = Array.isArray(config.pastWinnersHistory)
        ? config.pastWinnersHistory.filter((h: PastWinnersMonthEntry) => h.monthKey !== currentMonthInfo.monthKey)
        : [];
      const updatedHistory = [newHistoryEntry, ...existingHistory].slice(0, 6);

      const nextConfig: LeaderboardPrizesConfig = {
        ...config,
        pastWinnersHistory: updatedHistory
      };

      setConfig(nextConfig);
      localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(nextConfig));
      await supabase.from('app_settings').upsert({
        id: 1,
        leaderboard_prizes_config: nextConfig
      });

      setSelectedSocialMonthKey(currentMonthInfo.monthKey);
      alert(
        `SUCCESS! Finalized ${currentMonthInfo.monthLabel} Top 5 Super Fans, auto-dropped their digital bundle items & Gold Hypes, and activated their Home Page Gold Dot notifications!`
      );
    } catch (err: any) {
      alert('Error finalizing winners: ' + err.message);
    } finally {
      setIsAwarding(false);
    }
  };

  const pastHistory: PastWinnersMonthEntry[] = Array.isArray(config.pastWinnersHistory)
    ? config.pastWinnersHistory
    : [];
  const activeSocialEntry =
    selectedSocialMonthKey === 'live'
      ? {
          monthKey: currentMonthInfo.monthKey,
          monthLabel: currentMonthInfo.monthLabel,
          seasonTitle: activeSlice.seasonTitle,
          heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
          winners: liveTop5
        }
      : pastHistory.find((h: PastWinnersMonthEntry) => h.monthKey === selectedSocialMonthKey) || {
          monthKey: currentMonthInfo.monthKey,
          monthLabel: currentMonthInfo.monthLabel,
          seasonTitle: activeSlice.seasonTitle,
          heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
          winners: liveTop5
        };

  const socialWinners: PastWinnerRecord[] = activeSocialEntry.winners || [];
  const firstPlace = socialWinners[0];
  const runnersUp = socialWinners.slice(1, 5);

  return (
    <div className="bg-black border-2 border-[#fe9a00]/60 rounded-2xl p-6 space-y-6 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
            🏆 Automated Winner Fulfillment &amp; Social Studio
          </span>
          <h3 className="text-lg font-black italic uppercase text-white">
            3. Finalize Monthly Winners &amp; 1:1 Social Media Graphic
          </h3>
          <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
            Instantly drops linked digital rewards &amp; Gold Hypes into winners&apos; profiles, lights up their Home Page Gold Dot, updates &ldquo;See Past Winners&rdquo;, and builds your 1:1 Social Graphic!
          </p>
        </div>

        <button
          type="button"
          disabled={isAwarding || loadingTop5 || liveTop5.length === 0}
          onClick={handleFinalizeAndAutoDropWinners}
          className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(254,154,0,0.5)] cursor-pointer shrink-0 disabled:opacity-40"
        >
          {isAwarding
            ? 'Finalizing & Dropping Prizes...'
            : `🏆 Finalize ${currentMonthInfo.monthLabel} & Auto-Drop Prizes`}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            1:1 Social Graphic Month:
          </span>
          <select
            value={selectedSocialMonthKey}
            onChange={e => setSelectedSocialMonthKey(e.target.value)}
            className="bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-black text-white cursor-pointer"
          >
            <option value="live">
              Live Current Standings ({currentMonthInfo.monthLabel})
            </option>
            {pastHistory.map((h: PastWinnersMonthEntry) => (
              <option key={h.monthKey} value={h.monthKey}>
                Finalized: {h.monthLabel} ({h.seasonTitle})
              </option>
            ))}
          </select>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          📸 Exact 1:1 Square Frame Below — Ready to Screenshot for Instagram, X &amp; Discord!
        </span>
      </div>

      <div className="flex justify-center py-2 overflow-x-auto">
        <div className="relative w-[520px] h-[520px] aspect-square rounded-none overflow-hidden bg-zinc-950 border-2 border-[#fe9a00] shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col justify-between p-6 select-none shrink-0">
          <img
            src={
              activeSocialEntry.heroBannerUrl ||
              leaderboardHeroUrl ||
              activeSlice.heroBannerUrl ||
              DEFAULT_LEADERBOARD_PRIZES_CONFIG.heroBannerUrl
            }
            alt="Winners Backdrop"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-65 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/45 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest inline-block mb-1 shadow">
                {activeSocialEntry.monthLabel} • Monthly Fandom Prize Pool
              </span>
              <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-lg">
                TOP 5 SUPER FANS
              </h4>
            </div>
            <img
              src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png"
              alt="Saturday AM"
              className="h-9 object-contain drop-shadow-lg"
            />
          </div>

          {firstPlace ? (
            <div className="relative z-10 my-auto py-3">
              <div className="bg-gradient-to-r from-amber-950/85 via-black/90 to-black/90 border-2 border-[#fe9a00] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_0_35px_rgba(254,154,0,0.35)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        firstPlace.avatar_url ||
                        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png'
                      }
                      alt={firstPlace.username}
                      className="w-16 h-16 rounded-full object-cover border-[3px] border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                    />
                    <span className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-yellow-400 text-black font-black italic text-xs flex items-center justify-center border-2 border-black shadow">
                      #1
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1">
                      <Crown className="w-3 h-3 fill-yellow-400" /> #1 SUPER FAN GRAND PRIZE CHAMPION
                    </span>
                    <h5 className="text-xl font-black italic uppercase text-white truncate leading-tight mt-0.5">
                      {firstPlace.username}
                    </h5>
                    <span className="text-[9px] font-bold text-zinc-300 block truncate mt-0.5">
                      {firstPlace.prizeTitle}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3 border-l border-white/15">
                  <span className="text-lg font-black italic text-[#fe9a00] block leading-none">
                    {(firstPlace.score || 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                    Monthly Pts
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {runnersUp.map((w: PastWinnerRecord) => (
                  <div
                    key={w.rank}
                    className="bg-black/80 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-black italic text-[#fe9a00] w-5 shrink-0">
                        #{w.rank}
                      </span>
                      <img
                        src={
                          w.avatar_url ||
                          'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png'
                        }
                        alt={w.username}
                        className="w-9 h-9 rounded-full object-cover border border-[#fe9a00] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase text-white block truncate">
                          {w.username}
                        </span>
                        <span className="text-[8px] font-bold text-zinc-400 block truncate">
                          {(w.score || 0).toLocaleString()} Monthly Pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative z-10 my-auto text-center py-12">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {loadingTop5 ? 'Calculating Live Top 5...' : 'No Monthly Standings Yet'}
              </p>
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between pt-2.5 border-t border-white/15 text-[9px] font-black uppercase tracking-widest text-zinc-300">
            <span>Read &amp; Compete on the Saturday AM App</span>
            <span className="text-[#fe9a00]">MANGAHYPE.COM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LeaderboardPrizeManager = ({ Dropzone, setIsDirty }: any) => {
  const {
    seriesList: contextSeriesList = [],
    cardSkins: contextSkins = [],
    vaultAvatars: contextAvatars = []
  } = useSeriesData();

  // --- 1. UNIVERSAL HERO BANNER SLIDES STATE ---
  const [slides, setSlides] = useState<any[]>([]);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [dbSkins, setDbSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [creatorSignatures, setCreatorSignatures] = useState<any[]>([]);
  const [isSavingSlides, setIsSavingSlides] = useState<boolean>(false);

  // Studio Composer State
  const [activeStudioSlideId, setActiveStudioSlideId] = useState<any | null>(null);
  const [studioSourceMode, setStudioSourceMode] = useState<'store' | 'series' | 'custom'>('store');
  const [studioProductId, setStudioProductId] = useState<string>('');
  const [studioSeriesSlug, setStudioSeriesSlug] = useState<string>('');
  const [studioBgUrl, setStudioBgUrl] = useState<string>('');
  const [activeCropDevice, setActiveCropDevice] = useState<'pc' | 'mobile'>('pc');

  const [pcZoom, setPcZoom] = useState<number>(112);
  const [pcPanX, setPcPanX] = useState<number>(50);
  const [pcPanY, setPcPanY] = useState<number>(30);
  const [pcVignette, setPcVignette] = useState<number>(40);

  const [mobileZoom, setMobileZoom] = useState<number>(118);
  const [mobilePanX, setMobilePanX] = useState<number>(50);
  const [mobilePanY, setMobilePanY] = useState<number>(25);
  const [mobileVignette, setMobileVignette] = useState<number>(45);

  const [studioBadge, setStudioBadge] = useState<string>('#1 SUPER FAN PRIZE POOL');
  const [studioHeadline, setStudioHeadline] = useState<string>('TOP 5 SUPER FAN DROP');
  const [, setStudioSubheadline] = useState<string>('');
  const [studioPriceLabel, setStudioPriceLabel] = useState<string>('$50 OFF SHOP');
  const [, setStudioOrigPriceLabel] = useState<string>('');
  const [studioCtaLabel, setStudioCtaLabel] = useState<string>('SEE ALL PRIZES');
  const [studioAvatars, setStudioAvatars] = useState<string[]>([]);
  const [, setStudioSigs] = useState<StudioSignature[]>([]);
  const [studioBonusHypes, setStudioBonusHypes] = useState<number>(5);
  const [, setStudioIncludePass] = useState<boolean>(false);
  const [, setStudioCardCount] = useState<number>(0);
  const [studioEdgePosition, setStudioEdgePosition] = useState<ContestBannerEdge>('bottom');
  const [studioHeaderPosition, setStudioHeaderPosition] = useState<'top' | 'bottom'>('top');
  const [isGeneratingBanners, setIsGeneratingBanners] = useState<boolean>(false);

  // --- 2. LEADERBOARD PRIZE POOL STATE ---
  const [config, setConfig] = useState<LeaderboardPrizesConfig>(() => {
    try {
      const cached = localStorage.getItem('am_leaderboard_prizes_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.tiers)) {
          const normGrand = normalizeGrandPrizeItems(parsed.grandPrizeItems);
          return {
            ...DEFAULT_LEADERBOARD_PRIZES_CONFIG,
            ...parsed,
            grandPrizeItems: normGrand,
            tiers: normalizeFivePrizeTiers(parsed.tiers, normGrand),
            scheduledMonths: parsed.scheduledMonths || {},
            pastWinnersHistory: Array.isArray(parsed.pastWinnersHistory)
              ? parsed.pastWinnersHistory
              : []
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_LEADERBOARD_PRIZES_CONFIG;
  });

  const [storeCatalogOptions, setStoreCatalogOptions] = useState<CatalogDropdownOption[]>([]);
  const [shopifyCount, setShopifyCount] = useState<number>(0);

  const [selectedScheduleKey, setSelectedScheduleKey] = useState<string>('default');
  const [customMonthInput, setCustomMonthInput] = useState<string>('');
  const [previewAllPrizesModal, setPreviewAllPrizesModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchPrizeStoreCatalog = useCallback(async () => {
    const [
      { data: slideData },
      { data: freshSeriesData },
      { data: settingsData },
      { data: storeProds },
      { data: themedBundles },
      { data: cardSkinsRes },
      { data: vaultSkinsRes },
      { data: avatarsRes },
      { data: sigsData }
    ] = await Promise.all([
      supabase.from('hero_slides').select('*').order('id', { ascending: true }),
      supabase.from('series').select('*').order('title', { ascending: true }),
      supabase
        .from('app_settings')
        .select('leaderboard_prizes_config, shopify_domain')
        .eq('id', 1)
        .maybeSingle(),
      supabase.from('in_app_store_products').select('*').order('created_at', { ascending: false }),
      supabase.from('themed_annual_bundles').select('*').order('created_at', { ascending: false }),
      supabase.from('card_skins').select('*').order('created_at', { ascending: false }),
      supabase.from('vault_card_skins').select('*').order('created_at', { ascending: false }),
      supabase.from('vault_avatars').select('*').order('created_at', { ascending: false }),
      supabase.from('creator_signatures').select('creator_name, signature_url')
    ]);

    // Fetch Live Physical Merch from Shopify Storefront Feed
    const rawDomain = settingsData?.shopify_domain || DEFAULT_SHOPIFY_DOMAIN;
    const cleanDomain = String(rawDomain)
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    let liveShopifyProducts: any[] = [];
    try {
      const shopRes = await fetch(`https://${cleanDomain}/products.json?limit=250`);
      if (shopRes.ok) {
        const shopJson = await shopRes.json();
        if (Array.isArray(shopJson?.products)) {
          liveShopifyProducts = shopJson.products;
        }
      }
    } catch (err) {
      console.warn('Shopify catalog sync note:', err);
    }
    setShopifyCount(liveShopifyProducts.length);

    const effectiveSeries =
      freshSeriesData && freshSeriesData.length > 0 ? freshSeriesData : contextSeriesList;
    setAllSeries(effectiveSeries);
    if (effectiveSeries.length > 0 && !studioSeriesSlug) {
      setStudioSeriesSlug(effectiveSeries[0].slug);
    }

    if (storeProds && storeProds.length > 0) {
      setStoreProducts(storeProds);
      if (!studioProductId) setStudioProductId(String(storeProds[0].id));
    }
    setDbSkins([...(cardSkinsRes || []), ...(vaultSkinsRes || [])]);
    if (avatarsRes) setDbAvatars(avatarsRes);
    if (sigsData) setCreatorSignatures(sigsData);

    if (slideData && slideData.length > 0) {
      setSlides(
        slideData.map((s: any) => {
          const rawType = String(s.link_type || 'series');
          const [placementPart, actualType] = rawType.includes('::')
            ? rawType.split('::')
            : ['home', rawType];
          return {
            id: s.id,
            placement: placementPart || 'home',
            desktop_url: s.desktop_url || '',
            mobile_url: s.mobile_url || '',
            linkType: actualType || 'series',
            linkTarget: s.link_target || '',
            startsAt: toSlideLocalInput(s.starts_at),
            endsAt: toSlideLocalInput(s.ends_at)
          };
        })
      );
    } else {
      setSlides([
        {
          id: Date.now(),
          placement: 'home',
          linkType: 'series',
          linkTarget: '',
          desktop_url: '',
          mobile_url: '',
          startsAt: '',
          endsAt: ''
        }
      ]);
    }

    if (settingsData?.leaderboard_prizes_config) {
      const raw = settingsData.leaderboard_prizes_config;
      const normGrand = normalizeGrandPrizeItems(raw.grandPrizeItems);
      setConfig({
        ...DEFAULT_LEADERBOARD_PRIZES_CONFIG,
        ...raw,
        grandPrizeItems: normGrand,
        tiers: normalizeFivePrizeTiers(raw.tiers, normGrand),
        scheduledMonths: raw.scheduledMonths || {},
        pastWinnersHistory: Array.isArray(raw.pastWinnersHistory)
          ? raw.pastWinnersHistory
          : []
      });
    }

    const skinMap = new Map<string, any>();
    [...(cardSkinsRes || []), ...(vaultSkinsRes || []), ...(contextSkins || [])].forEach(
      (sk: any) => {
        if (sk && sk.id && sk.image_url) {
          skinMap.set(String(sk.id), sk);
        }
      }
    );
    const allSkins = Array.from(skinMap.values());

    const avatarMap = new Map<string, any>();
    [...(avatarsRes || []), ...(contextAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) {
        avatarMap.set(String(av.image_url), av);
      }
    });
    const allAvatars = Array.from(avatarMap.values());

    const builtOptions: CatalogDropdownOption[] = [];

    // 1. Live Shopify Physical Merch Options
    liveShopifyProducts.forEach((sp: any) => {
      const imgUrl =
        sp.images?.[0]?.src ||
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png';
      const price = sp.variants?.[0]?.price ? `$${sp.variants[0].price}` : '';
      const cat = String(sp.product_type || 'PHYSICAL MERCH').toUpperCase();
      builtOptions.push({
        optionKey: `shopify_${sp.id}`,
        group: 'shopify_merch',
        itemType: 'physical',
        label: `🛍️ [Shopify Merch] ${sp.title}${price ? ` (${price})` : ''}`,
        tag: cat.length <= 18 ? cat : 'PHYSICAL MERCH',
        title: sp.title || 'Saturday AM Physical Merch',
        description: `${sp.title} from Saturday AM Shop (Winner must cover their own shipping).`,
        imageUrl: imgUrl,
        productUrl: `https://${cleanDomain}/products/${sp.handle}`
      });
    });

    const seenTitles = new Set<string>();

    // 2. In-App Store & Contest Bundles
    (storeProds || []).forEach((prod: any) => {
      const skinIds: string[] = Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : [];
      const firstSkin = allSkins.find(s => String(s.id) === String(skinIds[0]));
      const avUrls: string[] = Array.isArray(prod.avatar_urls) ? prod.avatar_urls : [];
      const resolvedImg =
        firstSkin?.image_url ||
        prod.card_skin_url ||
        prod.background_avatar_url ||
        avUrls[0] ||
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';

      const isContest =
        !prod.is_active && String(prod.promo_badge || '').toUpperCase().includes('CONTEST');
      const typeTag =
        prod.product_type === 'bundle'
          ? 'BUNDLE'
          : prod.product_type === 'avatar_pack'
          ? 'AVATAR PACK'
          : 'CARD SKIN';

      seenTitles.add(String(prod.title || '').trim().toLowerCase());

      builtOptions.push({
        optionKey: `store_${prod.id}`,
        group: 'store_bundle',
        itemType: 'digital',
        label: `${isContest ? '🏆 [Contest-Only]' : '🛒 [In-App Store]'} ${prod.title} (${typeTag})`,
        tag: typeTag,
        title: prod.title || 'Store Bundle',
        description:
          prod.description ||
          `Includes ${skinIds.length > 0 ? `${skinIds.length} Card Skin(s), ` : ''}${
            avUrls.length > 0 ? `${avUrls.length} Avatar(s) ` : ''
          }from the Saturday AM Vault.`,
        imageUrl: resolvedImg
      });
    });

    (themedBundles || []).forEach((tb: any) => {
      const lowerTitle = String(tb.title || '').trim().toLowerCase();
      if (!lowerTitle || seenTitles.has(lowerTitle)) return;
      seenTitles.add(lowerTitle);

      const avUrls: string[] = Array.isArray(tb.avatar_urls) ? tb.avatar_urls : [];
      const resolvedImg =
        tb.card_skin_url ||
        avUrls[0] ||
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';

      builtOptions.push({
        optionKey: `themed_${tb.id}`,
        group: 'store_bundle',
        itemType: 'digital',
        label: `${tb.is_active ? '🛒 [Bundle]' : '🏆 [Contest Bundle]'} ${tb.title}`,
        tag: 'BUNDLE',
        title: tb.title,
        description: tb.subtitle || 'Collector Hype Card & Avatar Bundle.',
        imageUrl: resolvedImg
      });
    });

    // 3. Vault Card Skins
    allSkins.forEach((sk: any) => {
      builtOptions.push({
        optionKey: `skin_${sk.id}`,
        group: 'card_skin',
        itemType: 'digital',
        label: `🃏 [Card Skin] ${sk.name}${sk.creator_name ? ` by ${sk.creator_name}` : ''}`,
        tag: 'CARD SKIN',
        title: `${sk.name} Hype Card Skin`,
        description: `Exclusive "${sk.name}" collector Hype Card Skin for your profile.`,
        imageUrl: sk.image_url
      });
    });

    // 4. Vault Character Avatars
    allAvatars.forEach((av: any, idx: number) => {
      builtOptions.push({
        optionKey: `avatar_${av.id || idx}`,
        group: 'avatar',
        itemType: 'digital',
        label: `👤 [Avatar] ${av.name || 'Character Avatar'}${
          av.series_title ? ` (${av.series_title})` : ''
        }`,
        tag: 'AVATAR',
        title: `${av.name || 'Exclusive'} Character Avatar`,
        description: `Exclusive "${av.name || 'Character'}" profile avatar unlock.`,
        imageUrl: av.image_url
      });
    });

    setStoreCatalogOptions(builtOptions);
  }, [contextSeriesList, contextSkins, contextAvatars, studioProductId, studioSeriesSlug]);

  useEffect(() => {
    fetchPrizeStoreCatalog();
    window.addEventListener('vaultUpdated', fetchPrizeStoreCatalog);
    return () => window.removeEventListener('vaultUpdated', fetchPrizeStoreCatalog);
  }, [fetchPrizeStoreCatalog]);

  const allMasterSkins = useMemo(() => {
    const map = new Map<string, any>();
    [...(contextSkins || []), ...(dbSkins || [])].forEach((sk: any) => {
      if (sk && sk.id && sk.image_url) map.set(String(sk.id), sk);
    });
    return Array.from(map.values());
  }, [contextSkins, dbSkins]);

  const allMasterAvatars = useMemo(() => {
    const map = new Map<string, any>();
    [...(contextAvatars || []), ...(dbAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) map.set(String(av.image_url), av);
    });
    return Array.from(map.values());
  }, [contextAvatars, dbAvatars]);

  const buildProductAssets = useCallback(
    (prod: any): StudioAssetOption[] => {
      if (!prod) return [];
      const list: StudioAssetOption[] = [];
      const seen = new Set<string>();

      const rawSkinIds: string[] = [
        ...(Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : []),
        prod.card_skin_id,
        prod.card_skin_2_id
      ]
        .filter(Boolean)
        .map(String);

      rawSkinIds.forEach((id, idx) => {
        const sk = allMasterSkins.find(s => String(s.id) === String(id));
        if (sk?.image_url && !seen.has(sk.image_url)) {
          seen.add(sk.image_url);
          list.push({
            id: `skin_${sk.id}`,
            label: sk.name || `Hype Card #${idx + 1}`,
            type: 'card_skin',
            image_url: sk.image_url
          });
        }
      });

      const avUrls: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      avUrls.forEach((url, idx) => {
        if (seen.has(url)) return;
        seen.add(url);
        const matchedAv = allMasterAvatars.find(a => a.image_url === url);
        const cleanName = matchedAv?.name
          ? matchedAv.name.replace(/mmwog/i, '').trim()
          : `Avatar #${idx + 1}`;
        list.push({
          id: `av_${idx}_${url.slice(-8)}`,
          label: cleanName,
          type: 'avatar',
          image_url: url
        });
      });

      return list;
    },
    [allMasterSkins, allMasterAvatars]
  );

  const selectedStudioProduct = useMemo(() => {
    return (
      storeProducts.find(p => String(p.id) === String(studioProductId)) ||
      storeProducts[0] ||
      null
    );
  }, [storeProducts, studioProductId]);

  const selectedStudioSeries = useMemo(() => {
    return (
      allSeries.find(s => String(s.slug) === String(studioSeriesSlug)) ||
      allSeries[0] ||
      null
    );
  }, [allSeries, studioSeriesSlug]);

  const studioProductAssets = useMemo(() => {
    return buildProductAssets(selectedStudioProduct);
  }, [selectedStudioProduct, buildProductAssets]);

  const studioCardAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'card_skin'),
    [studioProductAssets]
  );

  const studioAvatarAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'avatar'),
    [studioProductAssets]
  );

  const activeSlice = useMemo(() => {
    const existingMonth =
      selectedScheduleKey !== 'default'
        ? config.scheduledMonths?.[selectedScheduleKey]
        : null;
    const src = existingMonth || config;

    const normGrand = normalizeGrandPrizeItems(src.grandPrizeItems || config.grandPrizeItems);
    const normTiers = normalizeFivePrizeTiers(src.tiers || config.tiers, normGrand);

    return {
      contestTheme: src.contestTheme ?? config.contestTheme ?? 'Monthly Fandom Prize Pool',
      seasonTitle: src.seasonTitle || config.seasonTitle,
      seasonSubtitle: src.seasonSubtitle || config.seasonSubtitle,
      heroBannerUrl:
        src.heroBannerUrl ||
        config.heroBannerUrl ||
        DEFAULT_LEADERBOARD_PRIZES_CONFIG.heroBannerUrl,
      grandPrizeItems:
        Array.isArray(normTiers[0]?.prizeItems) && normTiers[0].prizeItems.length > 0
          ? normTiers[0].prizeItems
          : normGrand,
      tiers: normTiers
    };
  }, [config, selectedScheduleKey]);

  // Resolves the primary physical merch photo from Rank #1 for the 1.58:1 Contest Banner square box
  const primaryBannerPhysicalMerchUrl = useMemo(() => {
    const rank1Items: GrandPrizeStackItem[] =
      activeSlice.tiers?.[0]?.prizeItems || activeSlice.grandPrizeItems || [];
    const firstPhysical = rank1Items.find(
      it =>
        it.itemType === 'physical' ||
        String(it.linkedStoreProductId || '').startsWith('shopify_')
    );
    return (
      firstPhysical?.imageUrl ||
      rank1Items[0]?.imageUrl ||
      config?.grandPrizeItems?.[0]?.imageUrl ||
      ''
    );
  }, [activeSlice, config]);

  const loadProductIntoBannerStudio = useCallback(
    (prod: any) => {
      if (!prod) return;
      const assets = buildProductAssets(prod);
      const cards = assets.filter(a => a.type === 'card_skin');
      const avatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      const autographs: string[] = Array.isArray(prod.autograph_creators)
        ? prod.autograph_creators.filter(Boolean)
        : [];

      const matchedSigs: StudioSignature[] = autographs
        .map(cName => {
          const found = creatorSignatures.find(
            s => s.signature_url && matchCreatorNames(cName, s.creator_name)
          );
          return found ? { creator_name: cName, signature_url: found.signature_url } : null;
        })
        .filter(Boolean) as StudioSignature[];

      const price = Number(prod.listed_price_dollars || 0);
      const normalPrice = Number(prod.normal_price_dollars || 0);
      const isContestBundle = !prod.is_active && String(prod.promo_badge || '').toUpperCase().includes('CONTEST');
      const priceLabel = isContestBundle ? '$50 OFF SHOP' : price === 0 ? 'FREE' : `$${price}`;
      const origLabel = normalPrice > price && normalPrice > 0 ? `$${normalPrice}` : '';

      const bonusHypes = Number(prod.bonus_vaulted_hypes || (isContestBundle ? 5 : 0));
      const includePass = Boolean(prod.include_1yr_sub);

      const subParts: string[] = [];
      if (includePass) subParts.push('1-Yr VIP Pass');
      if (bonusHypes > 0) subParts.push(`+${bonusHypes} Gold Hypes`);
      if (cards.length > 0) subParts.push(`${cards.length} Hype Card Skins`);
      if (avatars.length > 0) subParts.push(`${avatars.length} Exclusive Avatars`);

      setStudioBgUrl(cards[0]?.image_url || assets[0]?.image_url || avatars[0] || '');
      setPcZoom(100);
      setPcPanX(50);
      setPcPanY(50);
      setPcVignette(35);

      setMobileZoom(118);
      setMobilePanX(50);
      setMobilePanY(25);
      setMobileVignette(45);

      setStudioBadge(prod.promo_badge || (isContestBundle ? '#1 SUPER FAN PRIZE POOL' : 'SPECIAL STORE DROP'));
      setStudioHeadline(String(prod.title || 'SPECIAL EDITION DROP').toUpperCase());
      setStudioSubheadline(
        subParts.join(' • ') || prod.description || 'Limited-Time Digital Loadout Drop'
      );
      setStudioPriceLabel(priceLabel);
      setStudioOrigPriceLabel(origLabel);
      setStudioCtaLabel(isContestBundle ? 'SEE ALL PRIZES' : price === 0 ? 'CLAIM FREE' : `UNLOCK (${priceLabel})`);
      setStudioAvatars(avatars);
      setStudioSigs(matchedSigs);
      setStudioBonusHypes(bonusHypes);
      setStudioIncludePass(includePass);
      setStudioCardCount(cards.length);
    },
    [buildProductAssets, creatorSignatures]
  );

  const loadSeriesIntoBannerStudio = useCallback((seriesObj: any) => {
    if (!seriesObj) return;
    setStudioBgUrl(seriesObj.cover_url || seriesObj.character_url || '');
    setPcZoom(108);
    setPcPanX(50);
    setPcPanY(25);
    setPcVignette(45);
    setMobileZoom(110);
    setMobilePanX(50);
    setMobilePanY(20);
    setMobileVignette(45);
    setStudioBadge('FEATURED MANGA SERIES');
    setStudioHeadline(String(seriesObj.title || 'FEATURED SERIES').toUpperCase());
    setStudioSubheadline(
      seriesObj.creator_name
        ? `By ${seriesObj.creator_name} • Read Now on Saturday AM`
        : 'Read the Latest Chapters Now on Saturday AM'
    );
    setStudioPriceLabel('');
    setStudioOrigPriceLabel('');
    setStudioCtaLabel('START READING');
    setStudioAvatars([]);
    setStudioSigs([]);
    setStudioBonusHypes(0);
    setStudioIncludePass(false);
    setStudioCardCount(0);
  }, []);

  const openStudioForSlide = (slideId: any) => {
    if (activeStudioSlideId === slideId) {
      setActiveStudioSlideId(null);
      return;
    }
    setActiveStudioSlideId(slideId);
    const defaultProd =
      storeProducts.find(p => String(p.id) === String(studioProductId)) || storeProducts[0];
    if (defaultProd) {
      setStudioSourceMode('store');
      setStudioProductId(String(defaultProd.id));
      loadProductIntoBannerStudio(defaultProd);
    } else if (allSeries[0]) {
      setStudioSourceMode('series');
      setStudioSeriesSlug(allSeries[0].slug);
      loadSeriesIntoBannerStudio(allSeries[0]);
    }
  };

  // --- CONTEST BANNER CANVAS GENERATOR (EXACT SAME LAYOUT PRESERVED!) ---
  const renderBannerCanvasToBlob = async (
    mode: 'desktop' | 'mobile',
    slideId?: any
  ): Promise<Blob | null> => {
    const targetId = slideId ?? activeStudioSlideId;
    const activeSlideObj = slides.find((s: any) => String(s.id) === String(targetId));
    const isHypeCardRatio =
      activeSlideObj?.placement === 'leaderboard' ||
      String(studioBadge || '').toUpperCase().includes('CONTEST') ||
      String(studioBadge || '').toUpperCase().includes('SUPER FAN') ||
      String(studioBadge || '').toUpperCase().includes('PRIZE') ||
      String(studioCtaLabel || '').toUpperCase().includes('PRIZE');

    const effectiveMode = isHypeCardRatio ? 'desktop' : mode;
    const W = isHypeCardRatio ? 1580 : effectiveMode === 'desktop' ? 1800 : 900;
    const H = isHypeCardRatio ? 1000 : effectiveMode === 'desktop' ? 600 : 1350;

    const activeZoom = effectiveMode === 'desktop' ? pcZoom : mobileZoom;
    const activePanX = effectiveMode === 'desktop' ? pcPanX : mobilePanX;
    const activePanY = effectiveMode === 'desktop' ? pcPanY : mobilePanY;
    const activeVig = effectiveMode === 'desktop' ? pcVignette : mobileVignette;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    const bgImg = await loadCorsImage(studioBgUrl);
    if (bgImg) {
      const imgRatio = bgImg.width / Math.max(1, bgImg.height);
      const canvasRatio = W / H;
      let baseW = W;
      let baseH = H;
      if (imgRatio > canvasRatio) {
        baseH = H;
        baseW = H * imgRatio;
      } else {
        baseW = W;
        baseH = W / imgRatio;
      }
      const zoomFactor = Math.max(1, activeZoom / 100);
      const drawW = baseW * zoomFactor;
      const drawH = baseH * zoomFactor;

      const offsetX = (W - drawW) * (activePanX / 100);
      const offsetY = (H - drawH) * (activePanY / 100);
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    }

    const vigAlpha = Math.min(0.92, Math.max(0.2, activeVig / 100));
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.26);
    topGrad.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.85})`);
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.26);

    const botGrad = ctx.createLinearGradient(0, H * 0.68, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, `rgba(0,0,0,${vigAlpha})`);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);

    const cardThumbUrls = studioCardAssets.slice(0, 2).map(c => c.image_url);
    const physicalMerchUrl = primaryBannerPhysicalMerchUrl;

    const [loadedAvatars, loadedCards, physicalMerchImg, shopLogoImg, hypeFlameImg] =
      await Promise.all([
        Promise.all(studioAvatars.slice(0, 5).map(u => loadCorsImage(u))),
        Promise.all(cardThumbUrls.map(u => loadCorsImage(u))),
        loadCorsImage(physicalMerchUrl),
        loadCorsImage(SAT_AM_SHOP_LOGO_URL),
        loadCorsImage(GOLD_HYPE_ICON_URL)
      ]);
    const validAvatars = loadedAvatars.filter(Boolean) as HTMLImageElement[];
    const validCards = loadedCards.filter(Boolean) as HTMLImageElement[];

    const barMargin = effectiveMode === 'desktop' ? 28 : 24;
    const isHorizontalItems = studioEdgePosition === 'bottom' || studioEdgePosition === 'top';
    const itemsStripH = effectiveMode === 'desktop' ? 170 : 130;
    const headerRowH = effectiveMode === 'desktop' ? 58 : 66;

    let headerRowY = studioHeaderPosition === 'top' ? barMargin : H - barMargin - headerRowH;

    if (isHorizontalItems && studioHeaderPosition === studioEdgePosition) {
      if (studioEdgePosition === 'bottom') {
        headerRowY = H - barMargin - itemsStripH - headerRowH - 18;
      } else {
        headerRowY = barMargin;
      }
    }

    if (studioHeadline || studioCtaLabel) {
      const hCenterY = headerRowY + headerRowH / 2;
      let leftX = barMargin;
      let rightX = W - barMargin;

      if (!isHorizontalItems && studioEdgePosition === 'left') {
        leftX += (effectiveMode === 'desktop' ? 310 : 250) + 20;
      } else if (!isHorizontalItems && studioEdgePosition === 'right') {
        rightX -= (effectiveMode === 'desktop' ? 310 : 250) + 20;
      }

      if (studioCtaLabel) {
        ctx.font = `900 ${effectiveMode === 'desktop' ? 16 : 18}px sans-serif`;
        const ctaTxt = studioCtaLabel.toUpperCase();
        const ctaW = ctx.measureText(ctaTxt).width + 44;
        const ctaH = effectiveMode === 'desktop' ? 50 : 56;
        const ctaX = rightX - ctaW;

        ctx.fillStyle = '#fe9a00';
        drawRoundedRect(ctx, ctaX, hCenterY - ctaH / 2, ctaW, ctaH, ctaH / 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ctaTxt, ctaX + ctaW / 2, hCenterY + 1);
        ctx.textAlign = 'left';
        rightX = ctaX - 20;
      }

      if (studioHeadline) {
        const maxHeadW = Math.max(240, rightX - leftX);
        let headFont = effectiveMode === 'desktop' ? 40 : 34;
        ctx.font = `900 italic ${headFont}px sans-serif`;
        while (ctx.measureText(studioHeadline.toUpperCase()).width > maxHeadW && headFont > 20) {
          headFont -= 2;
          ctx.font = `900 italic ${headFont}px sans-serif`;
        }
        const textW = Math.min(maxHeadW, ctx.measureText(studioHeadline.toUpperCase()).width);
        const pillW = textW + 36;
        const pillH = effectiveMode === 'desktop' ? 52 : 56;

        ctx.fillStyle = 'rgba(9,9,11,0.82)';
        drawRoundedRect(ctx, leftX, hCenterY - pillH / 2, pillW, pillH, 16);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(254,154,0,0.5)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(studioHeadline.toUpperCase(), leftX + 18, hCenterY + 2);
      }
    }

    const drawGoldTintedFlame = (x: number, y: number, w: number, h: number) => {
      if (!hypeFlameImg) return;
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.ceil(w));
      off.height = Math.max(1, Math.ceil(h));
      const octx = off.getContext('2d');
      if (!octx) return;
      octx.drawImage(hypeFlameImg, 0, 0, off.width, off.height);
      octx.globalCompositeOperation = 'source-in';
      const grad = octx.createLinearGradient(0, 0, 0, off.height);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#facc15');
      grad.addColorStop(1, '#fe9a00');
      octx.fillStyle = grad;
      octx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(off, x, y, w, h);
    };

    const cleanShopValue =
      String(studioPriceLabel || '$50')
        .toUpperCase()
        .replace(/\b(OFF|SHOP|STORE|CODE|COUPON)\b/g, '')
        .trim() || String(studioPriceLabel || '$50').toUpperCase();

    if (isHorizontalItems) {
      const cardH = effectiveMode === 'desktop' ? 162 : 122;
      const cardW = Math.round(cardH * 1.58);
      const cardGap = effectiveMode === 'desktop' ? 16 : 12;

      const rowBottomY =
        studioEdgePosition === 'top'
          ? (studioHeaderPosition === 'top' ? headerRowY + headerRowH + 16 : barMargin) + cardH
          : H - barMargin;
      const cardTopY = rowBottomY - cardH;
      const baselineBottomY = rowBottomY - 4;

      let curX = barMargin;
      validCards.forEach(cImg => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 6;
        drawRoundedRect(ctx, curX, cardTopY, cardW, cardH, 18);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(cImg, curX, cardTopY, cardW, cardH);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, curX, cardTopY, cardW, cardH, 18);
        ctx.stroke();
        ctx.restore();

        curX += cardW + cardGap;
      });

      const stackPillW = effectiveMode === 'desktop' ? 210 : 164;
      const stackPillH = effectiveMode === 'desktop' ? 66 : 52;
      const stackGap = effectiveMode === 'desktop' ? 10 : 8;
      const totalStackH = stackPillH * 2 + stackGap;

      let rightEdgeX = W - barMargin;
      const stackX = rightEdgeX - stackPillW;
      const topPillY = baselineBottomY - totalStackH;
      const botPillY = baselineBottomY - stackPillH;

      if (studioPriceLabel) {
        const topCenterY = topPillY + stackPillH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(10,10,12,0.95)';
        drawRoundedRect(ctx, stackX, topPillY, stackPillW, stackPillH, 20);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, stackX, topPillY, stackPillW, stackPillH, 20);
        ctx.stroke();

        const logoW = shopLogoImg ? (effectiveMode === 'desktop' ? 76 : 58) : 0;
        const logoH = shopLogoImg ? (effectiveMode === 'desktop' ? 44 : 34) : 0;
        if (shopLogoImg) {
          ctx.drawImage(
            shopLogoImg,
            stackX + 16,
            topCenterY - logoH / 2,
            logoW,
            logoH
          );
        }

        ctx.font = `900 italic ${effectiveMode === 'desktop' ? 32 : 24}px sans-serif`;
        ctx.fillStyle = '#fe9a00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          cleanShopValue,
          stackX + logoW + (stackPillW - logoW) / 2,
          topCenterY + 2
        );
        ctx.textAlign = 'left';
      }

      if (studioBonusHypes > 0) {
        const botCenterY = botPillY + stackPillH / 2;
        const hTxt = `+${studioBonusHypes} HYPES`;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(56,29,6,0.95)';
        drawRoundedRect(ctx, stackX, botPillY, stackPillW, stackPillH, stackPillH / 2);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        drawRoundedRect(ctx, stackX, botPillY, stackPillW, stackPillH, stackPillH / 2);
        ctx.stroke();

        const flameW = hypeFlameImg ? (effectiveMode === 'desktop' ? 28 : 22) : 0;
        const flameH = hypeFlameImg ? (effectiveMode === 'desktop' ? 32 : 26) : 0;
        if (hypeFlameImg) {
          drawGoldTintedFlame(
            stackX + 20,
            botCenterY - flameH / 2,
            flameW,
            flameH
          );
        }

        ctx.font = `900 ${effectiveMode === 'desktop' ? 22 : 18}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          hTxt,
          stackX + flameW + 10 + (stackPillW - flameW - 10) / 2,
          botCenterY + 2
        );
        ctx.textAlign = 'left';
      }

      rightEdgeX = stackX - (effectiveMode === 'desktop' ? 18 : 12);

      if (physicalMerchImg) {
        const merchBoxSize = totalStackH;
        const merchX = rightEdgeX - merchBoxSize;
        const merchY = baselineBottomY - merchBoxSize;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 5;
        drawRoundedRect(ctx, merchX, merchY, merchBoxSize, merchBoxSize, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(physicalMerchImg, merchX, merchY, merchBoxSize, merchBoxSize);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, merchX, merchY, merchBoxSize, merchBoxSize, 16);
        ctx.stroke();
        ctx.restore();

        rightEdgeX = merchX - (effectiveMode === 'desktop' ? 20 : 14);
      }

      if (validAvatars.length > 0) {
        const avSize = effectiveMode === 'desktop' ? 114 : 86;
        const avStep = effectiveMode === 'desktop' ? 76 : 58;
        const totalAvW = avSize + (validAvatars.length - 1) * avStep;

        const availCenterStart = curX + 4;
        const availCenterEnd = rightEdgeX - 4;
        const centeredStartX = Math.max(
          availCenterStart,
          availCenterStart + (availCenterEnd - availCenterStart - totalAvW) / 2
        );
        const avCenterY = baselineBottomY - avSize / 2;

        validAvatars.forEach((avImg, idx) => {
          const cx = centeredStartX + idx * avStep + avSize / 2;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.88)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = '#09090b';
          ctx.fill();
          ctx.clip();
          ctx.drawImage(avImg, cx - avSize / 2, avCenterY - avSize / 2, avSize, avSize);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#fe9a00';
          ctx.stroke();
        });
      }
    } else {
      const railW = effectiveMode === 'desktop' ? 340 : 280;
      const railX = studioEdgePosition === 'left' ? barMargin : W - barMargin - railW;
      const centerX = railX + railW / 2;
      let curY = H * 0.18;
      ctx.textAlign = 'center';

      if (validCards.length > 0) {
        const cardH = 92;
        const cardW = Math.round(cardH * 1.58);
        const gap = 12;
        const totalCardsW = validCards.length * cardW + (validCards.length - 1) * gap;
        let startCardX = centerX - totalCardsW / 2;

        validCards.forEach(cImg => {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 18;
          drawRoundedRect(ctx, startCardX, curY, cardW, cardH, 12);
          ctx.clip();
          ctx.drawImage(cImg, startCardX, curY, cardW, cardH);
          ctx.restore();

          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fe9a00';
          drawRoundedRect(ctx, startCardX, curY, cardW, cardH, 12);
          ctx.stroke();
          startCardX += cardW + gap;
        });
        curY += cardH + 20;
      }

      if (validAvatars.length > 0) {
        const avSize = 74;
        const avStep = 54;
        const totalW = avSize + (validAvatars.length - 1) * avStep;
        const startX = centerX - totalW / 2;
        const avY = curY + avSize / 2;
        validAvatars.forEach((avImg, idx) => {
          const cx = startX + idx * avStep + avSize / 2;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(cx, avY, avSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avImg, cx - avSize / 2, avY - avSize / 2, avSize, avSize);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(cx, avY, avSize / 2, 0, Math.PI * 2);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#fe9a00';
          ctx.stroke();
        });
        curY += avSize + 20;
      }

      if (physicalMerchImg) {
        const mSize = 110;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        drawRoundedRect(ctx, centerX - mSize / 2, curY, mSize, mSize, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(physicalMerchImg, centerX - mSize / 2, curY, mSize, mSize);
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, centerX - mSize / 2, curY, mSize, mSize, 14);
        ctx.stroke();
        curY += mSize + 18;
      }

      if (studioPriceLabel) {
        const badgeW = railW - 36;
        const badgeH = 58;
        ctx.fillStyle = 'rgba(10,10,12,0.95)';
        drawRoundedRect(ctx, centerX - badgeW / 2, curY, badgeW, badgeH, 20);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        ctx.stroke();
        ctx.font = '900 italic 28px sans-serif';
        ctx.fillStyle = '#fe9a00';
        ctx.fillText(cleanShopValue, centerX + 34, curY + badgeH / 2 + 2);
        if (shopLogoImg) {
          ctx.drawImage(shopLogoImg, centerX - badgeW / 2 + 22, curY + 10, 68, 38);
        }
        curY += badgeH + 12;
      }

      if (studioBonusHypes > 0) {
        const hW = railW - 36;
        const hH = 56;
        ctx.fillStyle = 'rgba(56,29,6,0.95)';
        drawRoundedRect(ctx, centerX - hW / 2, curY, hW, hH, 28);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        ctx.stroke();
        ctx.font = '900 20px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`+${studioBonusHypes} HYPES`, centerX + 14, curY + hH / 2 + 2);
        if (hypeFlameImg) {
          drawGoldTintedFlame(centerX - hW / 2 + 22, curY + 12, 26, 30);
        }
      }
      ctx.textAlign = 'left';
    }

    return new Promise(resolve => {
      canvas.toBlob(
        blob => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(blob);
        },
        'image/webp',
        0.88
      );
    });
  };

  const persistSlidesToDatabase = async (slidesToSave: any[]) => {
    const { error: slideDelErr } = await supabase
      .from('hero_slides')
      .delete()
      .not('id', 'is', null);
    if (slideDelErr) throw slideDelErr;

    const validSlides = slidesToSave
      .filter((s: any) => s.desktop_url || s.mobile_url)
      .map((slide: any) => {
        const p = slide.placement || 'home';
        const baseType = slide.linkType || 'series';
        return {
          desktop_url: slide.desktop_url,
          mobile_url: slide.mobile_url,
          link_type: p === 'home' ? baseType : `${p}::${baseType}`,
          link_target: slide.linkTarget || '',
          starts_at: slide.startsAt ? new Date(slide.startsAt).toISOString() : null,
          ends_at: slide.endsAt ? new Date(slide.endsAt).toISOString() : null
        };
      });

    if (validSlides.length > 0) {
      let { error: slideInsErr } = await supabase.from('hero_slides').insert(validSlides);
      if (slideInsErr && String(slideInsErr.message || '').includes('starts_at')) {
        const fallbackSlides = validSlides.map(({ starts_at, ends_at, ...rest }: any) => rest);
        const retry = await supabase.from('hero_slides').insert(fallbackSlides);
        slideInsErr = retry.error;
      }
      if (slideInsErr) throw slideInsErr;
    }
  };

  const handleGenerateAndApplyBanners = async (slideId: any, silent = false) => {
    if (!studioBgUrl) {
      if (!silent) alert('Please select or upload background artwork first!');
      return;
    }

    setIsGeneratingBanners(true);
    try {
      const [desktopBlob, mobileBlob] = await Promise.all([
        renderBannerCanvasToBlob('desktop', slideId),
        renderBannerCanvasToBlob('mobile', slideId)
      ]);

      if (!desktopBlob || !mobileBlob) {
        throw new Error('Could not generate banner images.');
      }

      const ts = Date.now();
      const desktopPath = `hero-banners/store_hero_pc_${ts}.webp`;
      const mobilePath = `hero-banners/store_hero_mobile_${ts}.webp`;

      const [upDesktop, upMobile] = await Promise.all([
        supabase.storage
          .from('assets')
          .upload(desktopPath, desktopBlob, {
            upsert: true,
            contentType: 'image/webp',
            cacheControl: '31536000'
          }),
        supabase.storage
          .from('assets')
          .upload(mobilePath, mobileBlob, {
            upsert: true,
            contentType: 'image/webp',
            cacheControl: '31536000'
          })
      ]);

      let desktopFinalUrl = '';
      let mobileFinalUrl = '';

      if (!upDesktop.error) {
        desktopFinalUrl =
          supabase.storage.from('assets').getPublicUrl(desktopPath).data?.publicUrl || '';
      }
      if (!upMobile.error) {
        mobileFinalUrl =
          supabase.storage.from('assets').getPublicUrl(mobilePath).data?.publicUrl || '';
      }

      if (!desktopFinalUrl) desktopFinalUrl = URL.createObjectURL(desktopBlob);
      if (!mobileFinalUrl) mobileFinalUrl = URL.createObjectURL(mobileBlob);

      const currentSlideObj = slides.find((s: any) => s.id === slideId);
      const isContestLook =
        currentSlideObj?.placement === 'leaderboard' ||
        String(studioBadge || '').toUpperCase().includes('CONTEST') ||
        String(studioBadge || '').toUpperCase().includes('SUPER FAN') ||
        String(studioCtaLabel || '').toUpperCase().includes('PRIZE');

      const resolvedPlacement = isContestLook
        ? 'leaderboard'
        : currentSlideObj?.placement || 'home';

      const nextLinkType =
        studioSourceMode === 'series' && resolvedPlacement !== 'leaderboard'
          ? 'series'
          : 'external';
      const nextLinkTarget =
        resolvedPlacement === 'leaderboard'
          ? '/?view=leaderboard'
          : studioSourceMode === 'series' && selectedStudioSeries
          ? selectedStudioSeries.slug
          : selectedStudioProduct
          ? `/?view=shop&item=${encodeURIComponent(
              selectedStudioProduct.slug || selectedStudioProduct.id
            )}`
          : `/?view=shop`;

      const autoStartsAt =
        resolvedPlacement === 'home' && selectedStudioProduct?.available_from
          ? toSlideLocalInput(selectedStudioProduct.available_from)
          : undefined;
      const autoEndsAt =
        resolvedPlacement === 'home' && selectedStudioProduct?.available_until
          ? toSlideLocalInput(selectedStudioProduct.available_until)
          : undefined;

      const now = new Date();
      const liveCurrentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const isFutureScheduledLeaderboard =
        resolvedPlacement === 'leaderboard' &&
        selectedScheduleKey !== 'default' &&
        selectedScheduleKey !== liveCurrentMonthKey;

      if (!isFutureScheduledLeaderboard) {
        const updatedSlides = slides.map((s: any) =>
          s.id === slideId
            ? {
                ...s,
                placement: resolvedPlacement,
                desktop_url: desktopFinalUrl,
                mobile_url: mobileFinalUrl,
                linkType: nextLinkType,
                linkTarget: nextLinkTarget,
                startsAt: autoStartsAt || s.startsAt || '',
                endsAt: autoEndsAt || s.endsAt || ''
              }
            : s
        );

        setSlides(updatedSlides);
        await persistSlidesToDatabase(updatedSlides);
      }

      if (resolvedPlacement === 'leaderboard') {
        const generatedHeroUrl = desktopFinalUrl || mobileFinalUrl || config.heroBannerUrl;
        let nextConfig: LeaderboardPrizesConfig;

        if (selectedScheduleKey !== 'default') {
          const prevMonthSlice = config.scheduledMonths?.[selectedScheduleKey] || {
            contestTheme: activeSlice.contestTheme,
            seasonTitle: activeSlice.seasonTitle,
            seasonSubtitle: activeSlice.seasonSubtitle,
            heroBannerUrl: generatedHeroUrl,
            grandPrizeItems: activeSlice.grandPrizeItems,
            tiers: activeSlice.tiers
          };
          nextConfig = {
            ...config,
            scheduledMonths: {
              ...(config.scheduledMonths || {}),
              [selectedScheduleKey]: {
                ...prevMonthSlice,
                heroBannerUrl: generatedHeroUrl
              }
            }
          };
        } else {
          nextConfig = {
            ...config,
            heroBannerUrl: generatedHeroUrl
          };
        }

        setConfig(nextConfig);
        localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(nextConfig));
        await supabase.from('app_settings').upsert({
          id: 1,
          leaderboard_prizes_config: nextConfig
        });
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      if (setIsDirty) setIsDirty(false);
      setActiveStudioSlideId(null);

      if (!silent) {
        alert(
          resolvedPlacement === 'leaderboard'
            ? 'SUCCESS! PC & Mobile Contest Banners generated and published live to the Leaderboard Top Fans tab!'
            : 'SUCCESS! PC & Mobile Hero Banners generated and saved live!'
        );
      }
    } catch (err: any) {
      if (!silent) {
        alert('Failed to generate hero banners: ' + (err.message || 'Please try again.'));
      }
    } finally {
      setIsGeneratingBanners(false);
    }
  };

  const addSlide = () => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    setSlides(prev => [
      ...prev,
      {
        id: newId,
        placement: 'leaderboard',
        linkType: 'external',
        linkTarget: '/?view=leaderboard',
        desktop_url: '',
        mobile_url: '',
        startsAt: '',
        endsAt: ''
      }
    ]);
    openStudioForSlide(newId);
    if (setIsDirty) setIsDirty(true);

    setTimeout(() => {
      const el = document.getElementById(`hero-slide-card-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  const removeSlide = (idToRemove: any) => {
    if (!window.confirm('Delete this hero slide?')) return;
    setSlides(prev => prev.filter((slide: any) => slide.id !== idToRemove));
    if (setIsDirty) setIsDirty(true);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    if (setIsDirty) setIsDirty(true);
  };

  const updateSlide = (id: any, field: string, value: any) => {
    setSlides(prev =>
      prev.map((slide: any) => (slide.id === id ? { ...slide, [field]: value } : slide))
    );
    if (setIsDirty) setIsDirty(true);
  };

  const handleSaveHeroSlides = async () => {
    setIsSavingSlides(true);
    try {
      await persistSlidesToDatabase(slides);
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchPrizeStoreCatalog();
      if (setIsDirty) setIsDirty(false);
      alert('SUCCESS! All Hero Banners saved across the app!');
    } catch (err: any) {
      alert('Failed to save Hero Banners: ' + err.message);
    } finally {
      setIsSavingSlides(false);
    }
  };

  const renderLiveBannerPreview = (mode: 'desktop' | 'mobile') => {
    const activeSlideObj = slides.find((s: any) => String(s.id) === String(activeStudioSlideId));
    const isHypeCardMode = activeSlideObj?.placement === 'leaderboard';
    const effectiveMode = isHypeCardMode ? 'desktop' : mode;

    const zoom = (effectiveMode === 'desktop' ? pcZoom : mobileZoom) / 100;
    const panX = effectiveMode === 'desktop' ? pcPanX : mobilePanX;
    const panY = effectiveMode === 'desktop' ? pcPanY : mobilePanY;
    const isHorizontal = studioEdgePosition === 'bottom' || studioEdgePosition === 'top';

    const HeaderRow = (
      <div className="relative z-10 w-full flex items-center justify-between gap-2 pointer-events-none">
        {studioHeadline ? (
          <div className="px-3.5 py-1.5 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-[#fe9a00]/60 shadow-lg max-w-[68%]">
            <span
              className={`font-black italic uppercase tracking-tight text-white block truncate ${
                effectiveMode === 'desktop' ? 'text-sm sm:text-base' : 'text-xs'
              }`}
            >
              {studioHeadline}
            </span>
          </div>
        ) : (
          <div />
        )}

        {studioCtaLabel && (
          <span
            className={`px-3.5 py-1.5 rounded-full bg-[#fe9a00] text-black font-black uppercase tracking-wider shadow-[0_0_15px_rgba(254,154,0,0.5)] shrink-0 ${
              effectiveMode === 'desktop' ? 'text-[9px] sm:text-[10px]' : 'text-[8px]'
            }`}
          >
            {studioCtaLabel}
          </span>
        )}
      </div>
    );

    const cleanPreviewShopVal =
      String(studioPriceLabel || '$50')
        .toUpperCase()
        .replace(/\b(OFF|SHOP|STORE|CODE|COUPON)\b/g, '')
        .trim() || String(studioPriceLabel || '$50').toUpperCase();

    const previewPhysicalMerchUrl = primaryBannerPhysicalMerchUrl;

    const ItemsBar = (
      <div
        className={`relative z-10 pointer-events-none ${
          isHorizontal
            ? 'w-full flex items-end justify-between gap-2 pt-2'
            : 'w-[48%] flex flex-col items-center text-center gap-2.5 my-auto'
        }`}
      >
        <div className="flex items-end gap-1.5 sm:gap-2 shrink-0">
          {studioCardAssets.slice(0, 2).map(card => (
            <div
              key={card.id}
              className="h-12 sm:h-[68px] aspect-[1.58] rounded-xl overflow-hidden border-2 border-[#fe9a00] bg-black shadow-[0_8px_24px_rgba(0,0,0,0.9)] shrink-0"
            >
              <img
                src={card.image_url}
                alt={card.label}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {studioAvatars.length > 0 && (
          <div className="flex items-center -space-x-2.5 sm:-space-x-3 shrink-0 pb-0.5">
            {studioAvatars.slice(0, 5).map((u, idx) => (
              <img
                key={idx}
                src={u}
                alt=""
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
              />
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 shrink-0">
          {previewPhysicalMerchUrl && (
            <div className="w-14 h-14 sm:w-[66px] sm:h-[66px] rounded-xl overflow-hidden border-2 border-[#fe9a00] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.9)] shrink-0">
              <img
                src={previewPhysicalMerchUrl}
                alt="Physical Item"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0">
            {studioPriceLabel && (
              <span className="h-6 sm:h-[30px] px-2.5 sm:px-3 rounded-xl bg-zinc-950/95 border-2 border-[#fe9a00] text-[#fe9a00] text-xs sm:text-sm font-black italic uppercase flex items-center justify-between gap-1.5 shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
                <img
                  src={SAT_AM_SHOP_LOGO_URL}
                  alt="Sat AM Shop"
                  className="h-3.5 sm:h-4 w-auto object-contain"
                />
                <span>{cleanPreviewShopVal}</span>
              </span>
            )}

            {studioBonusHypes > 0 && (
              <span className="h-6 sm:h-[30px] px-2.5 sm:px-3 rounded-full bg-[#381d06]/95 border-2 border-yellow-400 text-white text-[9px] sm:text-[10px] font-black uppercase flex items-center justify-center gap-1 shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
                <span
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline-block shrink-0 bg-gradient-to-b from-yellow-200 via-yellow-400 to-[#fe9a00]"
                  style={{
                    WebkitMaskImage: `url('${GOLD_HYPE_ICON_URL}')`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: `url('${GOLD_HYPE_ICON_URL}')`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                +{studioBonusHypes} HYPES
              </span>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div
        onClick={() => setActiveCropDevice(isHypeCardMode || mode === 'desktop' ? 'pc' : 'mobile')}
        className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all bg-zinc-950 select-none shadow-2xl flex flex-col justify-between cursor-pointer ${
          isHypeCardMode
            ? 'aspect-[1.58] p-3.5 sm:p-4'
            : mode === 'desktop'
            ? 'aspect-[3/1] p-2.5 sm:p-3.5'
            : 'aspect-[2/3] max-w-[240px] mx-auto p-2.5'
        } ${
          isHypeCardMode ||
          (mode === 'desktop' && activeCropDevice === 'pc') ||
          (mode === 'mobile' && activeCropDevice === 'mobile')
            ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/40'
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
      >
        {studioBgUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={studioBgUrl}
              alt="Hero Preview"
              className="w-full h-full object-cover transition-transform duration-150"
              style={{
                objectPosition: `${panX}% ${panY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${panX}% ${panY}%`
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-1.5 w-full">
          {studioHeaderPosition === 'top' && HeaderRow}
          {studioEdgePosition === 'top' && ItemsBar}
        </div>

        {!isHorizontal && (
          <div
            className={`relative z-10 w-full flex my-auto ${
              studioEdgePosition === 'left' ? 'justify-start' : 'justify-end'
            }`}
          >
            {ItemsBar}
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-1.5 w-full mt-auto">
          {studioHeaderPosition === 'bottom' && HeaderRow}
          {studioEdgePosition === 'bottom' && ItemsBar}
        </div>
      </div>
    );
  };

  // --- UNIFIED 5-TIER PRIZE BUILDER HELPERS ---
  const commitUpdatedTiers = (nextTiers: LeaderboardPrizeTierConfig[]) => {
    const rank1Items =
      Array.isArray(nextTiers[0]?.prizeItems) && nextTiers[0].prizeItems.length > 0
        ? nextTiers[0].prizeItems
        : activeSlice.grandPrizeItems;

    setConfig((prev: LeaderboardPrizesConfig) => {
      if (selectedScheduleKey === 'default') {
        return {
          ...prev,
          grandPrizeItems: rank1Items,
          tiers: nextTiers
        };
      }
      const prevMonth = prev.scheduledMonths?.[selectedScheduleKey] || {
        contestTheme: prev.contestTheme,
        seasonTitle: prev.seasonTitle,
        seasonSubtitle: prev.seasonSubtitle,
        heroBannerUrl: prev.heroBannerUrl,
        grandPrizeItems: rank1Items,
        tiers: nextTiers
      };
      return {
        ...prev,
        scheduledMonths: {
          ...(prev.scheduledMonths || {}),
          [selectedScheduleKey]: {
            ...prevMonth,
            grandPrizeItems: rank1Items,
            tiers: nextTiers
          }
        }
      };
    });
    if (setIsDirty) setIsDirty(true);
  };

  const rebuildTierSummaryAndPerks = (tier: LeaderboardPrizeTierConfig): LeaderboardPrizeTierConfig => {
    const items = tier.prizeItems || [];
    const autoPerks: string[] = items.map(it =>
      it.shippingNote ? `${it.title} (Winner covers shipping)` : it.title
    );
    if (tier.storeDiscountLabel?.trim()) {
      autoPerks.push(
        tier.storeDiscountLabel.includes('SHOP')
          ? `Saturday AM ${tier.storeDiscountLabel}`
          : tier.storeDiscountLabel
      );
    }
    if (Number(tier.goldHypesBonus || 0) > 0) {
      autoPerks.push(
        `+${tier.goldHypesBonus} Gold Hype${Number(tier.goldHypesBonus) > 1 ? 's' : ''}`
      );
    }

    const summaryParts = items.map(it => it.title).filter(Boolean);
    const nextTitle =
      summaryParts.length > 0
        ? summaryParts.join(' + ')
        : tier.title || `${tier.rankLabel} Prize`;

    return {
      ...tier,
      title: nextTitle,
      imageUrl: items[0]?.imageUrl || tier.imageUrl,
      linkedStoreProductId: items[0]?.linkedStoreProductId || '',
      perks: autoPerks
    };
  };

  const updateTierMeta = (
    place: 1 | 2 | 3 | 4 | 5,
    patch: Partial<LeaderboardPrizeTierConfig>
  ) => {
    const nextTiers = activeSlice.tiers.map((t: LeaderboardPrizeTierConfig) => {
      if (t.place !== place) return t;
      return rebuildTierSummaryAndPerks({ ...t, ...patch });
    });
    commitUpdatedTiers(nextTiers);
  };

  const handleAddPrizeRowToTier = (place: 1 | 2 | 3 | 4 | 5) => {
    const nextTiers = activeSlice.tiers.map((t: LeaderboardPrizeTierConfig) => {
      if (t.place !== place) return t;
      const existing = Array.isArray(t.prizeItems) ? t.prizeItems : [];
      const newItem: GrandPrizeStackItem = {
        id: `t${place}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        tag: place === 1 ? 'PHYSICAL MERCH' : 'DIGITAL PRIZE',
        title: place === 1 ? 'Select Shopify or Store Prize' : 'Select Store / Vault Prize',
        description: '',
        imageUrl:
          'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png',
        linkedStoreProductId: '',
        itemType: place === 1 ? 'physical' : 'digital',
        shippingNote: place === 1,
        showShopLogo: place === 1,
        shopLogoCorner: 'top-right'
      };
      return rebuildTierSummaryAndPerks({
        ...t,
        prizeItems: [...existing, newItem]
      });
    });
    commitUpdatedTiers(nextTiers);
  };

  const handleRemovePrizeRowFromTier = (place: 1 | 2 | 3 | 4 | 5, itemIdx: number) => {
    const nextTiers = activeSlice.tiers.map((t: LeaderboardPrizeTierConfig) => {
      if (t.place !== place) return t;
      const existing = Array.isArray(t.prizeItems) ? t.prizeItems : [];
      const filtered = existing.filter((_, idx) => idx !== itemIdx);
      return rebuildTierSummaryAndPerks({
        ...t,
        prizeItems: filtered
      });
    });
    commitUpdatedTiers(nextTiers);
  };

  const handleUpdatePrizeRowInTier = (
    place: 1 | 2 | 3 | 4 | 5,
    itemIdx: number,
    patch: Partial<GrandPrizeStackItem>
  ) => {
    const nextTiers = activeSlice.tiers.map((t: LeaderboardPrizeTierConfig) => {
      if (t.place !== place) return t;
      const existing = Array.isArray(t.prizeItems) ? t.prizeItems : [];
      const updatedItems = existing.map((it, idx) =>
        idx === itemIdx ? { ...it, ...patch } : it
      );
      return rebuildTierSummaryAndPerks({
        ...t,
        prizeItems: updatedItems
      });
    });
    commitUpdatedTiers(nextTiers);
  };

  const handleSelectCatalogProductForPrizeRow = (
    place: 1 | 2 | 3 | 4 | 5,
    itemIdx: number,
    optionKey: string
  ) => {
    if (!optionKey) {
      handleUpdatePrizeRowInTier(place, itemIdx, {
        linkedStoreProductId: '',
        itemType: 'custom'
      });
      return;
    }
    const found = storeCatalogOptions.find(o => o.optionKey === optionKey);
    if (!found) return;

    const isPhysical = found.itemType === 'physical';
    handleUpdatePrizeRowInTier(place, itemIdx, {
      linkedStoreProductId: found.optionKey,
      itemType: found.itemType,
      tag: found.tag,
      title: found.title,
      description: found.description,
      imageUrl: found.imageUrl,
      productUrl: found.productUrl || '',
      shippingNote: isPhysical,
      showShopLogo: isPhysical
    });
  };

  const handleClearScheduledMonth = (monthKey: string) => {
    if (
      !window.confirm(
        `Remove custom schedule for ${monthKey} and revert it to the Default Template?`
      )
    )
      return;
    setConfig((prev: LeaderboardPrizesConfig) => {
      const nextMap = { ...(prev.scheduledMonths || {}) };
      delete nextMap[monthKey];
      return { ...prev, scheduledMonths: nextMap };
    });
    if (setIsDirty) setIsDirty(true);
  };

  const handleSavePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    if (activeStudioSlideId && studioBgUrl) {
      await handleGenerateAndApplyBanners(activeStudioSlideId, true);
    } else {
      await persistSlidesToDatabase(slides);
    }

    try {
      localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(config));
    } catch {
      // ignore
    }

    const { error } = await supabase.from('app_settings').upsert({
      id: 1,
      leaderboard_prizes_config: config
    });

    setIsSaving(false);

    if (error) {
      setSaveMessage('Saved to local staging preview!');
    } else {
      setSaveMessage(
        selectedScheduleKey === 'default'
          ? 'Contest Prizes (#1–#5) saved live!'
          : `Scheduled Contest Prizes for ${selectedScheduleKey} saved!`
      );
    }
    if (setIsDirty) setIsDirty(false);
    setTimeout(() => setSaveMessage(null), 5000);
  };

  const scheduledMonthKeys = Object.keys(config.scheduledMonths || {}).sort();

  const shopifyMerchOpts = storeCatalogOptions.filter(o => o.group === 'shopify_merch');
  const storeBundleOpts = storeCatalogOptions.filter(o => o.group === 'store_bundle');
  const cardSkinOpts = storeCatalogOptions.filter(o => o.group === 'card_skin');
  const avatarOpts = storeCatalogOptions.filter(o => o.group === 'avatar');

  const activeLeaderboardHeroUrl = useMemo(() => {
    const lbSlide = slides.find((s: any) => s.placement === 'leaderboard');
    return lbSlide?.desktop_url || lbSlide?.mobile_url || activeSlice.heroBannerUrl;
  }, [slides, activeSlice.heroBannerUrl]);

  const renderShopDiscountBadge = (label?: string) => {
    if (!label || !label.trim()) return null;
    return (
      <div className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-[#fe9a00] shadow-[0_0_12px_rgba(254,154,0,0.3)] shrink-0">
        <img
          src={SAT_AM_SHOP_LOGO_URL}
          alt="Sat AM Shop"
          className="h-4 w-auto object-contain shrink-0"
        />
        <span className="text-[9px] font-black uppercase tracking-wider text-[#fe9a00] whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  };

  const renderGoldHypesBadge = (count?: number) => {
    const num = Number(count || 0);
    if (num <= 0) return null;
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/90 border border-yellow-400 text-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.3)] shrink-0">
        <img
          src={GOLD_HYPE_ICON_URL}
          alt="Gold Hypes"
          className="w-3.5 h-3.5 object-contain shrink-0"
        />
        <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
          +{num} Gold Hype{num > 1 ? 's' : ''}
        </span>
      </div>
    );
  };

  const renderUnifiedCatalogDropdown = (
    selectedValue: string | undefined,
    onSelect: (optionKey: string) => void
  ) => (
    <select
      value={selectedValue || ''}
      onChange={e => onSelect(e.target.value)}
      className="w-full bg-zinc-900 border border-[#fe9a00]/60 rounded-lg px-3 py-2 text-xs font-bold text-white cursor-pointer focus:outline-none focus:border-[#fe9a00]"
    >
      <option value="">✍️ Custom / Manual Photo Upload</option>
      {shopifyMerchOpts.length > 0 && (
        <optgroup label={`🛍️ Live Shopify Physical Merch (${shopifyMerchOpts.length})`}>
          {shopifyMerchOpts.map(opt => (
            <option key={opt.optionKey} value={opt.optionKey}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      {storeBundleOpts.length > 0 && (
        <optgroup label={`🛒 In-App Store & Contest Bundles (${storeBundleOpts.length})`}>
          {storeBundleOpts.map(opt => (
            <option key={opt.optionKey} value={opt.optionKey}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      {cardSkinOpts.length > 0 && (
        <optgroup label={`🃏 Vault Hype Card Skins (${cardSkinOpts.length})`}>
          {cardSkinOpts.map(opt => (
            <option key={opt.optionKey} value={opt.optionKey}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      {avatarOpts.length > 0 && (
        <optgroup label={`👤 Vault Character Avatars (${avatarOpts.length})`}>
          {avatarOpts.map(opt => (
            <option key={opt.optionKey} value={opt.optionKey}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-6xl animate-fade-in space-y-8">
      {/* FULL POPUP PREVIEW MODAL */}
      {previewAllPrizesModal && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewAllPrizesModal(false)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_60px_rgba(254,154,0,0.3)] relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAllPrizesModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black italic uppercase text-[#fe9a00] mb-4">
              All Prizes Popup Preview (Ranks #1 – #5)
            </h3>

            <div className="space-y-4">
              {activeSlice.tiers.map((tier: LeaderboardPrizeTierConfig) => {
                const isFirst = tier.place === 1;
                const items = tier.prizeItems || [];
                return (
                  <div
                    key={tier.place}
                    className={`rounded-2xl p-4 border ${
                      isFirst
                        ? 'bg-gradient-to-b from-amber-950/35 via-black to-black border-2 border-[#fe9a00]'
                        : 'bg-black border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                        {isFirst && <Crown className="w-3.5 h-3.5 fill-black" />}
                        {tier.rankLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {renderShopDiscountBadge(tier.storeDiscountLabel)}
                        {renderGoldHypesBadge(tier.goldHypesBonus)}
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div
                        className={`grid grid-cols-1 ${
                          items.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                        } gap-3 mb-3`}
                      >
                        {items.map((item, idx) => {
                          const isPureLogo = item.imageUrl === SAT_AM_SHOP_LOGO_URL;
                          const isPhysical =
                            item.itemType === 'physical' ||
                            String(item.linkedStoreProductId || '').startsWith('shopify_');
                          const cornerClass =
                            item.shopLogoCorner === 'top-left'
                              ? 'top-2 left-2'
                              : item.shopLogoCorner === 'bottom-left'
                              ? 'bottom-2 left-2'
                              : item.shopLogoCorner === 'bottom-right'
                              ? 'bottom-2 right-2'
                              : 'top-2 right-2';

                          return (
                            <div
                              key={item.id || idx}
                              className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
                            >
                              <div
                                className={`relative w-full aspect-[7/5] overflow-hidden flex items-center justify-center ${
                                  isPhysical && !isPureLogo ? 'bg-white' : 'bg-black'
                                }`}
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className={`w-full h-full ${
                                    isPureLogo
                                      ? 'object-contain p-4 bg-gradient-to-br from-zinc-900 via-black to-amber-950/40'
                                      : isPhysical
                                      ? 'object-contain p-2'
                                      : 'object-cover'
                                  }`}
                                />
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase shadow z-10">
                                  {item.tag}
                                </span>
                                {item.showShopLogo && !isPureLogo && (
                                  <div
                                    className={`absolute ${cornerClass} z-20 bg-black/85 backdrop-blur-md border border-[#fe9a00] rounded-lg px-1.5 py-1 shadow-lg pointer-events-none`}
                                  >
                                    <img
                                      src={SAT_AM_SHOP_LOGO_URL}
                                      alt="Sat AM Shop"
                                      className="h-4 w-auto object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5 flex flex-col gap-0.5">
                                <h4 className="text-xs font-black uppercase text-white leading-snug">
                                  {item.title}
                                </h4>
                                {item.shippingNote && (
                                  <span className="text-[9px] font-bold text-amber-400">
                                    * Winner covers shipping
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {Array.isArray(tier.perks) && tier.perks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-zinc-800/80">
                        {tier.perks.map((perk, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-700 text-[9px] font-black uppercase tracking-wider text-zinc-200"
                          >
                            ✓ {perk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Unified Hero Banner &amp; Contest Studio
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              1.58:1 Contest Banner Maker • Simple #1–#5 Prize Blocks • Live Shopify Merch ({shopifyCount}) + In-App Store Dropdown
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPrizeStoreCatalog}
            className="px-3 py-2 rounded-xl bg-black hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-black uppercase tracking-widest cursor-pointer"
          >
            ↻ Sync Shopify &amp; Vault ({storeCatalogOptions.length})
          </button>

          <button
            type="button"
            onClick={() => setPreviewAllPrizesModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" /> Test Prizes Popup (#1–#5)
          </button>
        </div>
      </div>

      {/* =====================================================================
          PART 1: UNIVERSAL HERO & CONTEST BANNER MAKER (UNCHANGED LAYOUT)
      ===================================================================== */}
      <div className="bg-black border-2 border-[#fe9a00]/60 p-5 sm:p-6 rounded-2xl space-y-5 shadow-[0_0_30px_rgba(254,154,0,0.1)]">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <ImageIcon className="w-5 h-5 text-[#fe9a00]" />
            <div>
              <h3 className="font-black uppercase italic tracking-widest text-[#fe9a00] text-sm">
                1. Universal Hero Banner Maker ({slides.length} Active Slides)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Target Home Page, Leaderboard, Store, Creators, or Characters • Leaderboard Contest Banners attach to your selected Contest Month ({selectedScheduleKey === 'default' ? 'Live / Default' : selectedScheduleKey})!
              </p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900 border border-[#fe9a00]/60 rounded-xl px-3 py-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                🗓️ Active Contest Month:
              </span>
              <select
                value={selectedScheduleKey}
                onChange={e => setSelectedScheduleKey(e.target.value)}
                className="bg-black border border-zinc-700 rounded-lg px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
              >
                {UPCOMING_SCHEDULE_MONTHS.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                    {config.scheduledMonths?.[m.key]?.heroBannerUrl ? ' 🖼️ (Banner Scheduled)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSlide}
              className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Banner Slide
            </button>

            <button
              type="button"
              onClick={handleSaveHeroSlides}
              disabled={isSavingSlides}
              className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] hover:bg-white text-black px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(254,154,0,0.35)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSavingSlides ? 'Saving Banners...' : 'Save All Hero Banners'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {slides.map((slide: any, index: number) => {
            const isStudioOpen = activeStudioSlideId === slide.id;
            const nowMs = Date.now();
            const startMs = slide.startsAt ? new Date(slide.startsAt).getTime() : null;
            const endMs = slide.endsAt ? new Date(slide.endsAt).getTime() : null;
            const isScheduledFuture = Boolean(startMs && !isNaN(startMs) && startMs > nowMs);
            const isExpiredSlide = Boolean(endMs && !isNaN(endMs) && endMs <= nowMs);

            return (
              <div
                key={slide.id}
                id={`hero-slide-card-${slide.id}`}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl relative group space-y-4 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest bg-[#fe9a00]/10 border border-[#fe9a00]/30 px-2.5 py-1 rounded">
                      Slide #{index + 1}
                    </span>

                    <select
                      value={slide.placement || 'home'}
                      onChange={e => updateSlide(slide.id, 'placement', e.target.value)}
                      className="bg-zinc-900 border border-[#fe9a00]/60 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-[#fe9a00]"
                    >
                      <option value="home">🏠 Target: Home Page Carousel</option>
                      <option value="leaderboard">🏆 Target: Leaderboard Hero</option>
                      <option value="store">🛒 Target: In-App Store Hero</option>
                      <option value="creators">🎨 Target: Creators Page Hero</option>
                      <option value="characters">⚔️ Target: Characters Page Hero</option>
                    </select>

                    {isScheduledFuture && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded">
                        🗓️ Scheduled ({new Date(slide.startsAt).toLocaleString()})
                      </span>
                    )}
                    {isExpiredSlide && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded">
                        Ended ({new Date(slide.endsAt).toLocaleString()})
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openStudioForSlide(slide.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isStudioOpen
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.35)]'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-[#fe9a00] border-[#fe9a00]/50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isStudioOpen
                        ? 'Close Banner Composer'
                        : '✨ Open Visual Banner Composer (PC & Mobile)'}
                    </button>

                    {isStudioOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSlide(slide.id, 'placement', 'leaderboard');
                          setStudioBadge('#1 SUPER FAN PRIZE POOL');
                          setStudioHeadline('TOP 5 SUPER FAN DROP');
                          setStudioSubheadline(
                            '1–2x Physical Items • 2x Hype Cards + 5x Avatars • $50 Shop Code • +5 Gold Hypes'
                          );
                          setStudioPriceLabel('$50');
                          setStudioBonusHypes(5);
                          setStudioCtaLabel('SEE ALL PRIZES');
                          setStudioEdgePosition('bottom');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        🏆 Load #1 Super Fan Contest Strip
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlide(slide.id)}
                        className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                        title="Delete Slide"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* VISUAL BANNER COMPOSER */}
                {isStudioOpen && (
                  <div className="bg-gradient-to-b from-black via-zinc-900/90 to-black border-2 border-[#fe9a00] rounded-2xl p-5 space-y-5 shadow-[0_0_40px_rgba(254,154,0,0.2)] animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Choose Banner Source (Auto-Fills Art, 5x Avatars, Copy &amp; Destination)
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('store');
                              if (selectedStudioProduct) loadProductIntoBannerStudio(selectedStudioProduct);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'store'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            🛒 From Store Item / Contest Bundle
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('series');
                              if (selectedStudioSeries) loadSeriesIntoBannerStudio(selectedStudioSeries);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'series'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            📚 From Manga Series
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('custom');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'custom'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            🎨 Custom Upload / From Scratch
                          </button>
                        </div>
                      </div>

                      <div className="min-w-[260px]">
                        {studioSourceMode === 'store' && (
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Select Store Item / Bundle (Loads 5x Avatars &amp; Cards):
                            </label>
                            <select
                              value={studioProductId}
                              onChange={e => {
                                const nextId = e.target.value;
                                setStudioProductId(nextId);
                                const found = storeProducts.find(p => String(p.id) === String(nextId));
                                if (found) loadProductIntoBannerStudio(found);
                              }}
                              className="w-full bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                            >
                              {storeProducts.map(prod => (
                                <option key={prod.id} value={prod.id}>
                                  {prod.title} (${prod.listed_price_dollars ?? 0})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {studioSourceMode === 'series' && (
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Select Manga Series:
                            </label>
                            <select
                              value={studioSeriesSlug}
                              onChange={e => {
                                const nextSlug = e.target.value;
                                setStudioSeriesSlug(nextSlug);
                                const found = allSeries.find(s => String(s.slug) === String(nextSlug));
                                if (found) loadSeriesIntoBannerStudio(found);
                              }}
                              className="w-full bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                            >
                              {allSeries.map((s: any) => (
                                <option key={s.slug} value={s.slug}>
                                  {s.title} {s.creator_name ? `(${s.creator_name})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {studioSourceMode === 'custom' && (
                          <Dropzone
                            label="Upload Custom Edge-to-Edge Hero Art"
                            height="p-2.5"
                            folderPath="hero-banners"
                            onUploadComplete={(url: string) => setStudioBgUrl(url)}
                          />
                        )}
                      </div>
                    </div>

                    {studioSourceMode === 'store' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Click Any Included Hype Card ({studioCardAssets.length}) or Upload Custom Photo as Edge-to-Edge Hero BG:
                          </span>
                          <div className="w-64">
                            <Dropzone
                              label="+ Or Upload Custom BG Photo"
                              height="p-1.5"
                              folderPath="hero-banners"
                              onUploadComplete={(url: string) => setStudioBgUrl(url)}
                            />
                          </div>
                        </div>

                        {studioCardAssets.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {studioCardAssets.map(card => {
                              const active = studioBgUrl === card.image_url;
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => setStudioBgUrl(card.image_url)}
                                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                    active
                                      ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
                                      : 'border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  <div className="w-full aspect-[1.58] bg-zinc-900 overflow-hidden relative">
                                    <img
                                      src={card.image_url}
                                      alt={card.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    {active && (
                                      <span className="absolute top-1.5 right-1.5 bg-emerald-400 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                        ✓ Active BG
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-white truncate w-full px-2 py-1 text-left bg-zinc-950">
                                    {card.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {studioAvatarAssets.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                              <Layers className="w-3 h-3 text-purple-400" /> Included Character Avatars ({studioAvatarAssets.length}) — Automatically Displayed in Edge Strip (Click Any to Use as BG):
                            </span>
                            <div className="grid grid-cols-5 gap-2">
                              {studioAvatarAssets.map(av => {
                                const active = studioBgUrl === av.image_url;
                                return (
                                  <button
                                    key={av.id}
                                    type="button"
                                    onClick={() => setStudioBgUrl(av.image_url)}
                                    className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                      active
                                        ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50'
                                        : 'border-zinc-800 hover:border-zinc-600'
                                    }`}
                                  >
                                    <div className="w-full aspect-square bg-zinc-900 overflow-hidden relative">
                                      <img
                                        src={av.image_url}
                                        alt={av.label}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      {active && (
                                        <span className="absolute top-1 right-1 bg-emerald-400 text-black text-[7px] font-black uppercase px-1 rounded">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-zinc-300 truncate w-full px-1 py-1 text-center bg-zinc-950">
                                      {av.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {studioSourceMode === 'series' && selectedStudioSeries && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {[
                          { label: 'Series Cover Art', url: selectedStudioSeries.cover_url },
                          { label: 'Character / Secondary Art', url: selectedStudioSeries.character_url },
                          { label: 'Sticker Art', url: selectedStudioSeries.sticker_url }
                        ]
                          .filter(item => Boolean(item.url))
                          .map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setStudioBgUrl(item.url)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase cursor-pointer ${
                                studioBgUrl === item.url
                                  ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                              }`}
                            >
                              <img src={item.url} alt="" className="w-6 h-6 rounded object-cover" />
                              <span>{item.label}</span>
                            </button>
                          ))}

                        <div className="flex-1 min-w-[200px]">
                          <Dropzone
                            label="Or Upload Custom Background Art for Series"
                            height="p-2"
                            folderPath="hero-banners"
                            onUploadComplete={(url: string) => setStudioBgUrl(url)}
                          />
                        </div>
                      </div>
                    )}

                    {/* CROP SLIDERS + 4-EDGE SELECTOR + LIVE PREVIEWS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2 border-t border-zinc-800">
                      <div className="lg:col-span-5 bg-black/70 border border-zinc-800 rounded-xl p-4 space-y-4">
                        {slide.placement === 'leaderboard' ? (
                          <div className="bg-zinc-950 p-2 rounded-xl border border-[#fe9a00]/50 text-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center justify-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5" />
                              <Smartphone className="w-3.5 h-3.5" />
                              Unified PC &amp; Mobile Crop (1.58:1 Hype Card Ratio)
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setActiveCropDevice('pc')}
                              className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeCropDevice === 'pc'
                                  ? 'bg-[#fe9a00] text-black shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" /> PC Crop (3:1)
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveCropDevice('mobile')}
                              className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeCropDevice === 'mobile'
                                  ? 'bg-[#fe9a00] text-black shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Smartphone className="w-3.5 h-3.5" /> Mobile Crop (2:3)
                            </button>
                          </div>
                        )}

                        {activeCropDevice === 'pc' ? (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> PC / Desktop Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPcZoom(112);
                                  setPcPanX(50);
                                  setPcPanY(30);
                                  setPcVignette(40);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset PC Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Zoom</span>
                                  <span className="text-[#fe9a00]">{pcZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={pcZoom}
                                  onChange={e => setPcZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Edge Shade</span>
                                  <span className="text-[#fe9a00]">{pcVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={pcVignette}
                                  onChange={e => setPcVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan X</span>
                                  <span className="text-[#fe9a00]">{pcPanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanX}
                                  onChange={e => setPcPanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan Y</span>
                                  <span className="text-[#fe9a00]">{pcPanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanY}
                                  onChange={e => setPcPanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> Mobile (2:3) Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileZoom(118);
                                  setMobilePanX(50);
                                  setMobilePanY(25);
                                  setMobileVignette(45);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset Mobile Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Zoom</span>
                                  <span className="text-[#fe9a00]">{mobileZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={mobileZoom}
                                  onChange={e => setMobileZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Edge Shade</span>
                                  <span className="text-[#fe9a00]">{mobileVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={mobileVignette}
                                  onChange={e => setMobileVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan X</span>
                                  <span className="text-[#fe9a00]">{mobilePanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanX}
                                  onChange={e => setMobilePanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan Y</span>
                                  <span className="text-[#fe9a00]">{mobilePanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanY}
                                  onChange={e => setMobilePanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                1. Headline + &ldquo;See All Prizes&rdquo; Row
                              </label>
                              <div className="grid grid-cols-2 gap-1">
                                {(
                                  [
                                    { id: 'top', label: '⬆ Top Row' },
                                    { id: 'bottom', label: '⬇ Bottom Row' }
                                  ] as const
                                ).map(pos => (
                                  <button
                                    key={pos.id}
                                    type="button"
                                    onClick={() => setStudioHeaderPosition(pos.id)}
                                    className={`py-1.5 rounded-lg text-[8px] font-black uppercase border cursor-pointer ${
                                      studioHeaderPosition === pos.id
                                        ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                    }`}
                                  >
                                    {pos.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                2. Reward Items Bar Edge
                              </label>
                              <div className="grid grid-cols-4 gap-1">
                                {(
                                  [
                                    { id: 'bottom', label: '⬇ Bot' },
                                    { id: 'top', label: '⬆ Top' },
                                    { id: 'left', label: '⬅ Left' },
                                    { id: 'right', label: '➡ Right' }
                                  ] as const
                                ).map(ed => (
                                  <button
                                    key={ed.id}
                                    type="button"
                                    onClick={() => setStudioEdgePosition(ed.id)}
                                    className={`py-1.5 rounded-lg text-[8px] font-black uppercase border cursor-pointer ${
                                      studioEdgePosition === ed.id
                                        ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                    }`}
                                  >
                                    {ed.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Top / Edge Pill Badge
                              </label>
                              <input
                                type="text"
                                value={studioBadge}
                                onChange={e => setStudioBadge(e.target.value)}
                                placeholder="#1 SUPER FAN DROP"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Headline
                              </label>
                              <input
                                type="text"
                                value={studioHeadline}
                                onChange={e => setStudioHeadline(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                Shop Badge ($50 Off)
                              </label>
                              <input
                                type="text"
                                value={studioPriceLabel}
                                onChange={e => setStudioPriceLabel(e.target.value)}
                                placeholder="$50 OFF SHOP"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-[#fe9a00]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-yellow-400 mb-1">
                                Gold Hypes (+5)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={studioBonusHypes}
                                onChange={e => setStudioBonusHypes(Number(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-yellow-300"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Button Label
                              </label>
                              <input
                                type="text"
                                value={studioCtaLabel}
                                onChange={e => setStudioCtaLabel(e.target.value)}
                                placeholder="SEE ALL PRIZES"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-[#fe9a00]"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingBanners}
                          onClick={() => handleGenerateAndApplyBanners(slide.id)}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingBanners ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Generating PC &amp; Mobile Banners...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-black" /> Generate &amp; Apply PC + Mobile Banners
                            </>
                          )}
                        </button>
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5" />
                              {slide.placement === 'leaderboard'
                                ? `Unified PC & Mobile Contest Banner Preview (1.58:1 Hype Card Ratio • Edge: ${studioEdgePosition.toUpperCase()})`
                                : `Live PC / Desktop Hero Preview (3:1 Widescreen • Edge: ${studioEdgePosition.toUpperCase()})`}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400">
                              Zoom: {pcZoom}% • X: {pcPanX}% • Y: {pcPanY}%
                            </span>
                          </div>
                          {renderLiveBannerPreview('desktop')}
                        </div>

                        {slide.placement !== 'leaderboard' && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5" /> Live Mobile Hero Preview (2:3 Vertical • Edge: {studioEdgePosition.toUpperCase()})
                              </span>
                              <span className="text-[9px] font-bold uppercase text-zinc-400">
                                Zoom: {mobileZoom}% • X: {mobilePanX}% • Y: {mobilePanY}%
                              </span>
                            </div>
                            {renderLiveBannerPreview('mobile')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      {slide.placement === 'leaderboard'
                        ? 'PC Contest Banner (Hype Card 1.58:1 Ratio)'
                        : 'Desktop Banner (Wide 3:1)'}
                    </span>
                    {slide.desktop_url && (
                      <img
                        src={slide.desktop_url}
                        loading="lazy"
                        alt="Desktop Preview"
                        className={`w-full ${
                          slide.placement === 'leaderboard' ? 'aspect-[1.58]' : 'aspect-[3/1]'
                        } object-cover rounded-lg mb-2 border border-zinc-700`}
                      />
                    )}
                    <Dropzone
                      label={slide.desktop_url ? 'Replace Desktop' : '+ Upload Desktop Banner'}
                      height="p-3"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => {
                        updateSlide(slide.id, 'desktop_url', url);
                        if (slide.placement === 'leaderboard') {
                          updateSlide(slide.id, 'mobile_url', url);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      {slide.placement === 'leaderboard'
                        ? 'Mobile Contest Banner (Same 1.58:1 Hype Card Ratio)'
                        : 'Mobile Banner (Vertical 2:3)'}
                    </span>
                    {slide.mobile_url && (
                      <img
                        src={slide.mobile_url}
                        loading="lazy"
                        alt="Mobile Preview"
                        className={`${
                          slide.placement === 'leaderboard'
                            ? 'w-full aspect-[1.58]'
                            : 'w-28 aspect-[2/3] mx-auto'
                        } object-cover rounded-lg mb-2 border border-zinc-700`}
                      />
                    )}
                    <Dropzone
                      label={slide.mobile_url ? 'Replace Mobile' : '+ Upload Mobile Banner'}
                      height="p-3"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 mt-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Click Destination Link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={slide.linkType}
                      onChange={e => updateSlide(slide.id, 'linkType', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs sm:w-1/3 focus:border-[#fe9a00]"
                    >
                      <option value="series">Specific Series</option>
                      <option value="external">Store Drop / Web URL</option>
                    </select>
                    {slide.linkType === 'external' ? (
                      <input
                        type="text"
                        placeholder="https://... or /?view=shop"
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      />
                    ) : (
                      <select
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      >
                        <option value="">-- Select Series --</option>
                        {allSeries.map((s: any) => (
                          <option key={s.slug} value={s.slug}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" /> Go Live At (Optional Auto-Start)
                    </label>
                    <input
                      type="datetime-local"
                      value={slide.startsAt || ''}
                      onChange={e => updateSlide(slide.id, 'startsAt', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-[#fe9a00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" /> Auto-End At (Optional Expiry)
                    </label>
                    <input
                      type="datetime-local"
                      value={slide.endsAt || ''}
                      onChange={e => updateSlide(slide.id, 'endsAt', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-[#fe9a00]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          PART 2: SIMPLIFIED 5-BLOCK PRIZE BUILDER (#1 – #5) WITH LIVE SHOPIFY
      ===================================================================== */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> 2. Simplified Monthly Prize Builder (Ranks #1 – #5)
            </span>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              Each Rank (#1–#5) has its own block • Click <strong className="text-white">&ldquo;+ Add Prize&rdquo;</strong> as many times as you want to stack Shopify physical merch, Store Bundles, Card Skins, or Avatars!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedScheduleKey}
              onChange={e => setSelectedScheduleKey(e.target.value)}
              className="bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-black text-white cursor-pointer"
            >
              {UPCOMING_SCHEDULE_MONTHS.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label}
                  {config.scheduledMonths?.[m.key] ? ' ✓ (Scheduled)' : ''}
                </option>
              ))}
              {scheduledMonthKeys
                .filter(k => !UPCOMING_SCHEDULE_MONTHS.some(m => m.key === k))
                .map(k => (
                  <option key={k} value={k}>
                    {k} Contest ✓ (Scheduled)
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-1">
              <input
                type="month"
                value={customMonthInput}
                onChange={e => setCustomMonthInput(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (customMonthInput) setSelectedScheduleKey(customMonthInput);
                }}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[9px] font-black uppercase tracking-widest cursor-pointer"
              >
                Jump
              </button>
            </div>
          </div>
        </div>

        {selectedScheduleKey !== 'default' && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] font-bold text-emerald-200">
              🛡️ <strong className="uppercase text-emerald-400">Safe Mode ({selectedScheduleKey}):</strong>{' '}
              {config.scheduledMonths?.[selectedScheduleKey]
                ? `Editing saved schedule for ${selectedScheduleKey}. Your Default / Live contest is untouched.`
                : `${selectedScheduleKey} is not scheduled yet. Editing any block below creates a separate ${selectedScheduleKey} schedule!`}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfig((prev: LeaderboardPrizesConfig) => ({
                    ...prev,
                    scheduledMonths: {
                      ...(prev.scheduledMonths || {}),
                      [selectedScheduleKey]: {
                        contestTheme: 'Monthly Fandom Prize Pool',
                        seasonTitle: `${selectedScheduleKey} Super Fan Drop`,
                        seasonSubtitle: prev.seasonSubtitle,
                        heroBannerUrl: '',
                        grandPrizeItems: normalizeGrandPrizeItems(
                          DEFAULT_LEADERBOARD_PRIZES_CONFIG.grandPrizeItems
                        ),
                        tiers: normalizeFivePrizeTiers(
                          DEFAULT_LEADERBOARD_PRIZES_CONFIG.tiers
                        )
                      }
                    }
                  }));
                  if (setIsDirty) setIsDirty(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-white text-black font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
              >
                🧹 Reset {selectedScheduleKey} to Template
              </button>
              {config.scheduledMonths?.[selectedScheduleKey] && (
                <button
                  type="button"
                  onClick={() => handleClearScheduledMonth(selectedScheduleKey)}
                  className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800 text-[9px] font-black uppercase cursor-pointer"
                >
                  Delete Schedule
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {saveMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500 rounded-xl p-3.5 text-emerald-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 5 UNIFORM RANK BLOCKS (#1 THROUGH #5) */}
      <form onSubmit={handleSavePrizes} className="space-y-5">
        {activeSlice.tiers.map((tier: LeaderboardPrizeTierConfig) => {
          const isRank1 = tier.place === 1;
          const items = Array.isArray(tier.prizeItems) ? tier.prizeItems : [];

          return (
            <div
              key={tier.place}
              className={`rounded-2xl p-5 space-y-4 border ${
                isRank1
                  ? 'bg-gradient-to-b from-amber-950/20 via-black to-black border-2 border-[#fe9a00]'
                  : 'bg-black border-zinc-800'
              }`}
            >
              {/* BLOCK HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black italic uppercase tracking-wider flex items-center gap-1.5 ${
                      isRank1
                        ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.4)]'
                        : 'bg-zinc-900 text-[#fe9a00] border border-[#fe9a00]/40'
                    }`}
                  >
                    {isRank1 && <Crown className="w-3.5 h-3.5 fill-black" />}
                    Rank #{tier.place} Super Fan
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">
                    ({items.length} Prize{items.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {renderShopDiscountBadge(tier.storeDiscountLabel)}
                  {renderGoldHypesBadge(tier.goldHypesBonus)}

                  <button
                    type="button"
                    onClick={() => handleAddPrizeRowToTier(tier.place)}
                    className="px-3.5 py-2 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-[0_0_15px_rgba(254,154,0,0.3)] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Prize to #{tier.place}
                  </button>
                </div>
              </div>

              {/* UNLIMITED PRIZE ROWS */}
              {items.length === 0 ? (
                <div className="bg-zinc-950/70 border border-dashed border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-[11px] font-bold text-zinc-400">
                    No item cards on Rank #{tier.place} yet — click{' '}
                    <strong className="text-[#fe9a00]">&ldquo;+ Add Prize to #{tier.place}&rdquo;</strong>{' '}
                    to add a Shopify physical item, Store Bundle, Card Skin, or Avatar!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, itemIdx) => {
                    const isPhysical =
                      item.itemType === 'physical' ||
                      String(item.linkedStoreProductId || '').startsWith('shopify_');

                    return (
                      <div
                        key={item.id || itemIdx}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row gap-4 items-start md:items-center"
                      >
                        {/* THUMBNAIL + UPLOAD */}
                        <div className="w-full md:w-36 shrink-0 space-y-1.5">
                          <div
                            className={`relative w-full aspect-[7/5] rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center ${
                              isPhysical ? 'bg-white' : 'bg-black'
                            }`}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className={`w-full h-full ${
                                isPhysical ? 'object-contain p-1.5' : 'object-cover'
                              }`}
                            />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#fe9a00] text-black text-[7px] font-black uppercase shadow">
                              {item.tag}
                            </span>
                            {item.showShopLogo && (
                              <img
                                src={SAT_AM_SHOP_LOGO_URL}
                                alt=""
                                className="absolute top-1 right-1 h-3.5 w-auto bg-black/85 rounded px-1 py-0.5 border border-[#fe9a00]"
                              />
                            )}
                          </div>
                          <Dropzone
                            label="Custom Photo"
                            height="p-1.5"
                            folderPath="leaderboard-prizes"
                            onUploadComplete={(url: string) =>
                              handleUpdatePrizeRowInTier(tier.place, itemIdx, { imageUrl: url })
                            }
                          />
                        </div>

                        {/* DROPDOWN + EDITABLE TITLE + TOGGLES */}
                        <div className="flex-1 w-full space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                              Prize #{itemIdx + 1} — Pick from Live Shopify or In-App Vault:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePrizeRowFromTier(tier.place, itemIdx)}
                              className="text-zinc-500 hover:text-red-400 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          {renderUnifiedCatalogDropdown(item.linkedStoreProductId, optKey =>
                            handleSelectCatalogProductForPrizeRow(tier.place, itemIdx, optKey)
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[8px] font-black uppercase text-zinc-400 mb-0.5">
                                Badge Tag
                              </label>
                              <input
                                type="text"
                                value={item.tag}
                                onChange={e =>
                                  handleUpdatePrizeRowInTier(tier.place, itemIdx, {
                                    tag: e.target.value.toUpperCase()
                                  })
                                }
                                placeholder="PHYSICAL MERCH"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-[#fe9a00]"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[8px] font-black uppercase text-zinc-400 mb-0.5">
                                Display Title
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e =>
                                  handleUpdatePrizeRowInTier(tier.place, itemIdx, {
                                    title: e.target.value
                                  })
                                }
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pt-0.5">
                            <label className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.shippingNote)}
                                onChange={e =>
                                  handleUpdatePrizeRowInTier(tier.place, itemIdx, {
                                    shippingNote: e.target.checked,
                                    itemType: e.target.checked ? 'physical' : item.itemType
                                  })
                                }
                                className="accent-[#fe9a00]"
                              />
                              <span>Physical Item (Winner covers shipping)</span>
                            </label>

                            <label className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.showShopLogo)}
                                onChange={e =>
                                  handleUpdatePrizeRowInTier(tier.place, itemIdx, {
                                    showShopLogo: e.target.checked
                                  })
                                }
                                className="accent-[#fe9a00]"
                              />
                              <span>Sat AM Shop Corner Logo</span>
                            </label>

                            {item.showShopLogo && (
                              <select
                                value={item.shopLogoCorner || 'top-right'}
                                onChange={e =>
                                  handleUpdatePrizeRowInTier(tier.place, itemIdx, {
                                    shopLogoCorner: e.target.value as ShopLogoCorner
                                  })
                                }
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[8px] font-black uppercase text-[#fe9a00] cursor-pointer"
                              >
                                <option value="top-right">↗ Top-Right</option>
                                <option value="top-left">↖ Top-Left</option>
                                <option value="bottom-right">↘ Bottom-Right</option>
                                <option value="bottom-left">↙ Bottom-Left</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SHOP COUPON + GOLD HYPES ROW */}
              <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                    Saturday AM Shop Coupon Code (Blank = None)
                  </label>
                  <input
                    type="text"
                    value={tier.storeDiscountLabel}
                    onChange={e =>
                      updateTierMeta(tier.place, { storeDiscountLabel: e.target.value })
                    }
                    placeholder="e.g. $50 OFF SHOP CODE or 10% OFF SHOP CODE"
                    className="w-full bg-zinc-900 border border-[#fe9a00]/50 rounded-lg px-3 py-2 text-xs font-black text-[#fe9a00]"
                  />
                </div>

                <div className="md:col-span-5">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                    1-Click Shop Coupon Presets:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {STORE_DISCOUNT_PRESETS.slice(0, 5).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          updateTierMeta(tier.place, { storeDiscountLabel: preset })
                        }
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 text-[8px] font-black uppercase transition-colors cursor-pointer"
                      >
                        {preset.replace(' SHOP CODE', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-yellow-400 mb-1">
                    Bonus Gold Hypes
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tier.goldHypesBonus ?? 0}
                    onChange={e =>
                      updateTierMeta(tier.place, {
                        goldHypesBonus: Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                    className="w-full bg-zinc-900 border border-yellow-400/50 rounded-lg px-3 py-2 text-xs font-black text-yellow-300"
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.35)]"
        >
          {isSaving
            ? 'Saving Super Fan Contest Prizes...'
            : selectedScheduleKey === 'default'
            ? 'Save All Ranks (#1 – #5) Live'
            : `Save Scheduled Prizes (#1 – #5) for ${selectedScheduleKey}`}
        </button>
      </form>

      {/* PART 3: WINNER AUTO-FULFILLMENT & 1:1 SOCIAL MEDIA GRAPHIC STUDIO */}
      <WinnerFulfillmentAndSocialStudio
        config={config}
        setConfig={setConfig}
        activeSlice={activeSlice}
        leaderboardHeroUrl={activeLeaderboardHeroUrl}
      />
    </div>
  );
};