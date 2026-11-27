import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import {
  ArrowLeft, DollarSign, Sparkles, Flame, BookOpen, KeyRound, Copy, Check,
  ExternalLink, Heart, RefreshCw, Award, Eye, QrCode, Download, X, Link2, Gift, Plus, Trash2, MessageSquare, Zap, Users, ChevronDown, ChevronUp, Crown, Calendar, MapPin, Share2, Crop, Code2, Clock
} from 'lucide-react';
import { resolveCreatorStripeAccountId, normalizeCreatorKey } from './CreatorsPage';
import { ThumbnailCropperModal } from '../Components/UploadTools';
import { MangaReader, normalizeMangaPageUrl } from './MangaReader';

const MAX_AUTHOR_NOTES_PER_PAGE = 3;
const MAX_SHARE_NODES_PER_PAGE = 1;

interface CreatorStudioProps {
  currentUser: any;
  onBack: () => void;
  onNavigate: (data: any) => void;
}

const STAFF_CREATOR_EMAILS = [
  'demetrene.billups@gmail.com',
  'saturdayam.writer@gmail.com',
  'saturday.editorial@gmail.com'
];

const CREATOR_IDENTITY_ALIAS_MAP: Record<string, string> = {
  'rayme3000': 'Raymond Brown',
  'rayme3000@gmail.com': 'Raymond Brown',
  'effessart': 'Frank Simmonds',
  'fsimmonds4@gmail.com': 'Frank Simmonds',
  'dropkickanimation': 'Stefano Romano',
  'dropkickanimation@gmail.com': 'Stefano Romano',
  'saturday.editorial@gmail.com': 'Austin Harvey-Younis',
  'odunze.oguguo@yahoo.com': 'Odunze Oguguo (Whyt Manga)',
  'whytmanga': 'Odunze Oguguo (Whyt Manga)',
  'whyt manga': 'Odunze Oguguo (Whyt Manga)',
  'oscar.edfong@gmail.com': 'Oscar Fong',
  'erickpedrucciandre@yahoo.com': 'Erick Pedrucci',
  'jeyodin@gmail.com': 'JeyOdin',
  'jeyodin': 'JeyOdin',
  'publisher@saturday-am.com': 'Frederick L. Jones'
};

export const buildCreatorReferralCode = (rawCreatorName?: string): string => {
  const withoutParens = String(rawCreatorName || 'AM')
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const clean = withoutParens.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return `VIP-${clean || 'AM'}`;
};

export const getCreatorReferralCodeVariants = (rawCreatorName?: string): string[] => {
  const variants = new Set<string>();
  const primary = buildCreatorReferralCode(rawCreatorName);
  variants.add(primary);
  variants.add(primary.replace(/^VIP-/, ''));

  const parenMatch = String(rawCreatorName || '').match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const aliasCode = buildCreatorReferralCode(parenMatch[1]);
    variants.add(aliasCode);
    variants.add(aliasCode.replace(/^VIP-/, ''));
  }

  const rawFull = String(rawCreatorName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  if (rawFull) {
    variants.add(`VIP-${rawFull}`);
    variants.add(rawFull);
  }

  return Array.from(variants);
};

const getCurrentMonthKeyAndExpiry = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999).toISOString();
  return { monthKey, monthLabel, endOfMonth };
};

const getNormalizedSeriesKeys = (val: string): string[] => {
  const raw = String(val || '').toLowerCase().trim();
  if (!raw) return [];

  const k1 = raw
    .replace(/\+/g, '-')
    .replace(/one[\s-]*shot/g, 'oneshot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const k2 = raw
    .replace(/\+/g, '-plus-')
    .replace(/one[\s-]*shot/g, 'one-shot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const k3 = raw.replace(/[^a-z0-9]+/g, '');

  return Array.from(new Set([k1, k2, k3])).filter(Boolean);
};

export const CREATOR_EXACT_SERIES_MAP: Record<string, string[]> = {
  'raymond brown': ['bully-eater', 'bully-eater-annual-oneshot', 'bully-eater-annual-one-shot'],
  'rayme3000': ['bully-eater', 'bully-eater-annual-oneshot', 'bully-eater-annual-one-shot'],
  'odunze oguguo': [
    'apple-black',
    'apple-black-origins',
    'apple-black-light-novel',
    'apple-black-annual-oneshot',
    'apple-black-annual-one-shot'
  ],
  'whyt manga': [
    'apple-black',
    'apple-black-origins',
    'apple-black-light-novel',
    'apple-black-annual-oneshot',
    'apple-black-annual-one-shot'
  ],
  'odunze oguguo (whyt manga)': [
    'apple-black',
    'apple-black-origins',
    'apple-black-light-novel',
    'apple-black-annual-oneshot',
    'apple-black-annual-one-shot'
  ],
  'kiba fabio augusto': ['apple-black-annual-oneshot', 'apple-black-annual-one-shot'],
  'stephanie williams': ['apple-black-origins', 'apple-black-light-novel'],
  'frederick l. jones': [
    'clock-striker',
    'clock-striker-annual-oneshot',
    'clock-striker-annual-one-shot',
    'fan-x-boy',
    'saturday-wars',
    'mmwog',
    'the-massively-multiplayer-world-of-ghosts',
    'the-massively-multiplayer-world-of-ghosts-mmwog',
    'yellow-stringer',
    'yellow-stringer-annual-oneshot',
    'yellow-stringer-annual-one-shot'
  ],
  'issaka galadima': ['clock-striker'],
  'mike saharat srimuang': ['clock-striker-annual-oneshot', 'clock-striker-annual-one-shot'],
  'frank simmonds': ['fan-x-boy', 'fanboy'],
  'effessart': ['fan-x-boy', 'fanboy'],
  'kristina andabak': ['grimmheim'],
  'erick pedrucci': [
    'gun-bone',
    'gun-plus-bone',
    'hammer-annual-oneshot',
    'hammer-annual-one-shot'
  ],
  'fred tornager': ['gunhild'],
  'jeyodin': ['hammer', 'hammer-annual-oneshot', 'hammer-annual-one-shot'],
  'bon idle': ['henshin'],
  'stefano romano': ['maximo', 'maximo-world-warrior'],
  'pap souleye fall': ['oblivion-rouge'],
  'huzayfa umar': ['orisha'],
  'zayf': ['orisha'],
  'huzayfa umar (zayf)': ['orisha'],
  'yvan soudy': ['redskin', 'red-skin'],
  'staark': ['redskin', 'red-skin'],
  'yvan soudy (staark)': ['redskin', 'red-skin'],
  'eddy frye': ['saturday-wars'],
  'morganne walker': ['soul-beat'],
  'oscar fong': [
    'mmwog',
    'the-massively-multiplayer-world-of-ghosts',
    'the-massively-multiplayer-world-of-ghosts-mmwog'
  ],
  'tony dawkins': ['titan-king'],
  'jr de bard': ['underground'],
  'goeffrey jean-louis': ['yellow-stringer'],
  'angélica rosales': ['yellow-stringer-annual-oneshot', 'yellow-stringer-annual-one-shot'],
  'angelica rosales': ['yellow-stringer-annual-oneshot', 'yellow-stringer-annual-one-shot'],
  'austin harvey-younis': ['zarqa'],
  'vee': ['zarqa'],
  'staniel russell': ['zephyr']
};

const doesSeriesAuthorMatchCreator = (seriesAuthorRaw: string, creatorParts: string[]): boolean => {
  if (!seriesAuthorRaw) return false;
  const authorSegments = seriesAuthorRaw
    .toLowerCase()
    .split(/[,&/•|]+|\band\b/i)
    .map(seg => normalizeCreatorKey(seg))
    .filter(Boolean);

  return creatorParts.some(part => {
    const cleanPart = normalizeCreatorKey(part);
    if (!cleanPart || cleanPart.length < 3) return false;
    return authorSegments.some(seg => seg === cleanPart || seg.includes(cleanPart) || cleanPart.includes(seg));
  });
};

type ActivityFilterType = 'all' | 'comments' | 'smart_reacts' | 'hypes_likes' | 'characters';

interface StudioActivityItem {
  id: string;
  category: 'comments' | 'smart_reacts' | 'hypes_likes' | 'characters';
  typeLabel: string;
  userName: string;
  avatarUrl?: string;
  seriesTitle: string;
  seriesObj?: any;
  chapterId?: string;
  chapterNumber?: number;
  pageIndex?: number;
  characterName?: string;
  characterHeadshot?: string;
  text?: string;
  createdAt: string;
}

const DEFAULT_VISIBLE_CHAPTERS = 10;

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ currentUser, onBack, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [uniqueCreatorNames, setUniqueCreatorNames] = useState<string[]>([]);
  const [selectedCreatorName, setSelectedCreatorName] = useState<string>('');
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [tips, setTips] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<StudioActivityItem[]>([]);
  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<'activity' | 'tips'>('activity');
  const [activityFilter, setActivityFilter] = useState<ActivityFilterType>('all');
  const [referredAnnualCount, setReferredAnnualCount] = useState<number>(0);

  const [bingoPin, setBingoPin] = useState<string>('');
  const [oneTimePins, setOneTimePins] = useState<any[]>([]);
  const [generatingPin, setGeneratingPin] = useState(false);
  const [generatingOneTimePin, setGeneratingOneTimePin] = useState(false);

  const [monthlyGiftCodes, setMonthlyGiftCodes] = useState<any[]>([]);
  const [generatingMonthlyGift, setGeneratingMonthlyGift] = useState(false);

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [selectedBioSeriesSlug, setSelectedBioSeriesSlug] = useState<string>('');
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [chapterStatsMap, setChapterStatsMap] = useState<Record<string, { hypes: number; reacts: number }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const [isSeriesSectionOpen, setIsSeriesSectionOpen] = useState<boolean>(true);
  const [visibleChaptersBySeries, setVisibleChaptersBySeries] = useState<Record<string, number>>({});

  // --- CREATOR HOTSPOT STUDIO STATE (COLLAPSIBLE • READ-ONLY PAGES • 3 AUTHOR NOTES + 1 PANEL SHARE MAX/PAGE) ---
  const [isHotspotStudioOpen, setIsHotspotStudioOpen] = useState<boolean>(false);
  const [allCreatorChapters, setAllCreatorChapters] = useState<any[]>([]);
  const [studioSeriesSlug, setStudioSeriesSlug] = useState<string>('');
  const [studioChapterId, setStudioChapterId] = useState<string>('');
  const [studioPages, setStudioPages] = useState<string[]>([]);
  const [studioHotspots, setStudioHotspots] = useState<any[]>([]);
  const [loadingStudioPages, setLoadingStudioPages] = useState<boolean>(false);
  const [activeStudioPageIdx, setActiveStudioPageIdx] = useState<number | null>(null);
  const [studioMode, setStudioMode] = useState<'info' | 'share'>('info');
  const [studioDraft, setStudioDraft] = useState<{ x: number; y: number; id?: any } | null>(null);
  const [studioContent, setStudioContent] = useState<string>('');
  const [savingHotspot, setSavingHotspot] = useState<boolean>(false);
  const [cropPanelSourceUrl, setCropPanelSourceUrl] = useState<string | null>(null);
  const [isStudioReaderPreviewOpen, setIsStudioReaderPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!studioChapterId) {
      setStudioPages([]);
      setStudioHotspots([]);
      return;
    }
    let cancelled = false;
    const loadChapterPagesAndNodes = async () => {
      setLoadingStudioPages(true);
      try {
        const [{ data: pRows }, { data: hRows }] = await Promise.all([
          supabase
            .from('pages')
            .select('image_url, page_order')
            .eq('chapter_id', studioChapterId)
            .order('page_order', { ascending: true }),
          supabase
            .from('page_hotspots')
            .select('*')
            .eq('chapter_id', studioChapterId)
        ]);
        if (!cancelled) {
          setStudioPages((pRows || []).map((p: any) => p.image_url));
          setStudioHotspots(hRows || []);
        }
      } finally {
        if (!cancelled) setLoadingStudioPages(false);
      }
    };
    loadChapterPagesAndNodes();
    return () => {
      cancelled = true;
    };
  }, [studioChapterId]);

  const openCreatorPageHotspotModal = (pageIndex: number, preferredMode: 'info' | 'share') => {
    setActiveStudioPageIdx(pageIndex);
    setStudioMode(preferredMode);

    if (preferredMode === 'share') {
      const existingShare = studioHotspots.find(
        h => Number(h.page_index) === pageIndex && h.icon_type === 'share'
      );
      if (existingShare) {
        setStudioDraft({
          x: existingShare.x_percent,
          y: existingShare.y_percent,
          id: existingShare.id
        });
        setStudioContent(existingShare.content || '');
        return;
      }
    }
    setStudioDraft(null);
    setStudioContent('');
  };

  const handleCreatorCanvasClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeStudioPageIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (studioDraft?.id) {
      setStudioDraft({ ...studioDraft, x, y });
      return;
    }

    const pageNodes = studioHotspots.filter(h => Number(h.page_index) === activeStudioPageIdx);
    const infoCount = pageNodes.filter(h => h.icon_type !== 'share').length;
    const shareCount = pageNodes.filter(h => h.icon_type === 'share').length;

    if (studioMode === 'info' && infoCount >= MAX_AUTHOR_NOTES_PER_PAGE) {
      alert(
        `Limit reached: Up to ${MAX_AUTHOR_NOTES_PER_PAGE} Author Note nodes are allowed per page. Click an existing gold pin on this page to edit or delete it!`
      );
      return;
    }

    if (studioMode === 'share' && shareCount >= MAX_SHARE_NODES_PER_PAGE) {
      const existingShare = pageNodes.find(h => h.icon_type === 'share');
      if (existingShare) {
        setStudioDraft({ x, y, id: existingShare.id });
        setStudioContent(existingShare.content || '');
        return;
      }
    }

    setStudioDraft({ x, y });
    if (studioMode === 'info') setStudioContent('');
  };

  const handleSaveCreatorHotspot = async () => {
    if (!studioDraft || activeStudioPageIdx === null || !studioChapterId) return;

    if (studioMode === 'info' && !studioContent.trim()) {
      return alert('Please type your Author Comment before saving.');
    }
    if (studioMode === 'share' && (!studioContent || !studioContent.startsWith('http'))) {
      return alert('Please click "Crop Panel to Share" so fans get a crisp panel preview!');
    }

    if (!studioDraft.id) {
      const pageNodes = studioHotspots.filter(h => Number(h.page_index) === activeStudioPageIdx);
      if (
        studioMode === 'info' &&
        pageNodes.filter(h => h.icon_type !== 'share').length >= MAX_AUTHOR_NOTES_PER_PAGE
      ) {
        return alert(`Maximum of ${MAX_AUTHOR_NOTES_PER_PAGE} Author Notes per page reached.`);
      }
      if (
        studioMode === 'share' &&
        pageNodes.filter(h => h.icon_type === 'share').length >= MAX_SHARE_NODES_PER_PAGE
      ) {
        return alert(`Maximum of ${MAX_SHARE_NODES_PER_PAGE} Panel Share node per page reached.`);
      }
    }

    setSavingHotspot(true);
    try {
      const payload = {
        chapter_id: studioChapterId,
        page_index: activeStudioPageIdx,
        x_percent: studioDraft.x,
        y_percent: studioDraft.y,
        title: studioMode === 'share' ? 'Hype Share' : 'Author Comments',
        content: studioContent.trim(),
        icon_type: studioMode
      };

      if (studioDraft.id) {
        const { data, error } = await supabase
          .from('page_hotspots')
          .update(payload)
          .eq('id', studioDraft.id)
          .select()
          .single();
        if (error) throw error;
        setStudioHotspots(prev =>
          prev.map(h => (String(h.id) === String(studioDraft.id) ? data : h))
        );
      } else {
        const { data, error } = await supabase
          .from('page_hotspots')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setStudioHotspots(prev => [...prev, data]);
      }
      setStudioDraft(null);
      setStudioContent('');
    } catch (err: any) {
      alert('Could not save node: ' + err.message);
    } finally {
      setSavingHotspot(false);
    }
  };

  const handleDeleteCreatorHotspot = async (id: any) => {
    if (!window.confirm('Delete this node from the page?')) return;
    setSavingHotspot(true);
    try {
      const { error } = await supabase.from('page_hotspots').delete().eq('id', id);
      if (error) throw error;
      setStudioHotspots(prev => prev.filter(h => String(h.id) !== String(id)));
      if (studioDraft && String(studioDraft.id) === String(id)) {
        setStudioDraft(null);
        setStudioContent('');
      }
    } catch (err: any) {
      alert('Could not delete node: ' + err.message);
    } finally {
      setSavingHotspot(false);
    }
  };

  const isAdmin = Boolean(currentUser?.is_admin);
  const userEmail = String(currentUser?.email || '').trim().toLowerCase();
  const rawRole = String(currentUser?.role || (isAdmin ? 'staff' : 'creator')).toLowerCase();

  const effectiveRole = useMemo(() => {
    if (STAFF_CREATOR_EMAILS.includes(userEmail) || rawRole === 'staff') return 'staff';
    if (rawRole === 'influencer') return 'influencer';
    return 'creator';
  }, [userEmail, rawRole]);

  const commissionPerSale = effectiveRole === 'influencer' ? 2 : 5;

  // Strictly private to Raymond Brown's logged-in account AND hidden when peeking at other creators
  const isRayDevOwner = useMemo(() => {
    const uname = String(currentUser?.username || '').trim().toLowerCase();
    const isLoggedInAsRay = userEmail === 'rayme3000@gmail.com' || uname === 'rayme3000';
    if (!isLoggedInAsRay) return false;

    const cleanSelected = normalizeCreatorKey(selectedCreatorName || '');
    return (
      !cleanSelected ||
      cleanSelected === 'raymond brown' ||
      cleanSelected === 'rayme3000'
    );
  }, [userEmail, currentUser?.username, selectedCreatorName]);

  const [devPeriod, setDevPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');
  const [devLedgerRows, setDevLedgerRows] = useState<any[]>([]);
  const [devSubProfiles, setDevSubProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!isRayDevOwner) {
      setDevLedgerRows([]);
      setDevSubProfiles([]);
      return;
    }
    let active = true;
    Promise.all([
      supabase
        .from('store_payout_ledger')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select(
          'id, username, email, role, is_admin, is_premium, subscription_tier, referred_plan, stripe_subscription_id, subscribed_at, created_at'
        )
        .eq('is_premium', true)
    ]).then(([ledgerRes, profsRes]) => {
      if (!active) return;
      if (ledgerRes.data) setDevLedgerRows(ledgerRes.data);
      if (profsRes.data) setDevSubProfiles(profsRes.data);
    });
    return () => {
      active = false;
    };
  }, [isRayDevOwner, loading]);

  const devCutMetrics = useMemo(() => {
    if (!isRayDevOwner) return null;

    // Anchor period windows to the latest server DB timestamp if the local PC clock is ahead of real-world UTC
    const allServerTimes = [
      ...devLedgerRows.map((r: any) => (r.created_at ? new Date(r.created_at).getTime() : 0)),
      ...devSubProfiles.map((p: any) => {
        const d = p.subscribed_at || p.created_at;
        return d ? new Date(d).getTime() : 0;
      })
    ].filter(t => !isNaN(t) && t > 0);
    const latestServerMs = allServerTimes.length > 0 ? Math.max(...allServerTimes) : Date.now();
    const refNow =
      Date.now() - latestServerMs > 48 * 60 * 60 * 1000 ? new Date(latestServerMs) : new Date();

    const startOfDay = new Date(
      refNow.getFullYear(),
      refNow.getMonth(),
      refNow.getDate()
    ).getTime();
    const startOfWeek = startOfDay - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfDay - 30 * 24 * 60 * 60 * 1000;

    const bundleBuyerIds = new Set<string>();
    const bundleBuyerEmails = new Set<string>();

    interface DevCutEvent {
      id: string;
      source: 'Store / Bundle' | 'PLUS Subscription';
      label: string;
      buyer: string;
      grossDollars: number;
      devCutDollars: number;
      timestampMs: number;
      isoDate: string;
    }

    const events: DevCutEvent[] = [];

    devLedgerRows.forEach((row: any) => {
      if (row.user_id) bundleBuyerIds.add(String(row.user_id));
      if (row.user_email) bundleBuyerEmails.add(String(row.user_email).trim().toLowerCase());

      const gross = Number(row.gross_amount_dollars || 0);
      const devCut =
        row.dev_allocation_dollars !== null && row.dev_allocation_dollars !== undefined
          ? Number(row.dev_allocation_dollars)
          : Number((gross * 0.075).toFixed(2));
      if (devCut <= 0) return;

      const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
      events.push({
        id: `store_${row.id}`,
        source: 'Store / Bundle',
        label: row.product_title || 'Store Drop',
        buyer: row.user_email || 'Fan Purchase',
        grossDollars: gross,
        devCutDollars: devCut,
        timestampMs: isNaN(ts) ? 0 : ts,
        isoDate: row.created_at || ''
      });
    });

    const staffEmails = new Set([
      'odunze.oguguo@yahoo.com',
      'saturday.editorial@gmail.com',
      'demetrene.billups@gmail.com',
      'publisher@saturday-am.com',
      'rayme3000@gmail.com',
      'saturdayam.writer@gmail.com',
      'dropkickanimation@gmail.com',
      'fsimmonds4@gmail.com'
    ]);

    devSubProfiles.forEach((p: any) => {
      const uid = String(p.id || '');
      const em = String(p.email || '').trim().toLowerCase();
      const uname = String(p.username || '').trim().toLowerCase();
      const role = String(p.role || 'reader').trim().toLowerCase();

      // Skip staff/test accounts and avoid double-counting users whose PLUS sub came from a Store Bundle
      if (
        Boolean(p.is_admin) ||
        ['creator', 'core_creator', 'staff', 'influencer', 'admin', 'moderator'].includes(role) ||
        staffEmails.has(em) ||
        uname.includes('test') ||
        em.includes('test')
      ) {
        return;
      }
      if (bundleBuyerIds.has(uid) || (em && bundleBuyerEmails.has(em))) {
        return;
      }

      const planRaw = String(p.subscription_tier || p.referred_plan || 'monthly').toLowerCase();
      const isAnnual = planRaw === 'annual' || planRaw === 'yearly';
      const gross = isAnnual ? 20.0 : 1.99;
      const devCut = Number((gross * 0.075).toFixed(2));
      const rawDate = p.subscribed_at || p.created_at || '';
      const ts = rawDate ? new Date(rawDate).getTime() : 0;

      events.push({
        id: `sub_${uid}`,
        source: 'PLUS Subscription',
        label: isAnnual ? 'Annual PLUS ($20/yr)' : 'Monthly PLUS ($1.99/mo)',
        buyer: p.username || em || 'PLUS Subscriber',
        grossDollars: gross,
        devCutDollars: devCut,
        timestampMs: isNaN(ts) ? 0 : ts,
        isoDate: rawDate
      });
    });

    events.sort((a, b) => b.timestampMs - a.timestampMs);

    const calcTotals = (minTimeMs: number) => {
      const matching = minTimeMs > 0 ? events.filter(e => e.timestampMs >= minTimeMs) : events;
      const storeCut = matching
        .filter(e => e.source === 'Store / Bundle')
        .reduce((s, e) => s + e.devCutDollars, 0);
      const subCut = matching
        .filter(e => e.source === 'PLUS Subscription')
        .reduce((s, e) => s + e.devCutDollars, 0);
      const grossVol = matching.reduce((s, e) => s + e.grossDollars, 0);
      return {
        totalCut: storeCut + subCut,
        storeCut,
        subCut,
        grossVol,
        count: matching.length,
        items: matching
      };
    };

    const byPeriod = {
      day: calcTotals(startOfDay),
      week: calcTotals(startOfWeek),
      month: calcTotals(startOfMonth),
      all: calcTotals(0)
    };

    return {
      byPeriod,
      active: byPeriod[devPeriod]
    };
  }, [isRayDevOwner, devLedgerRows, devSubProfiles, devPeriod]);

  const { monthKey: currentMonthKey, monthLabel: currentMonthLabel } = useMemo(
    () => getCurrentMonthKeyAndExpiry(),
    []
  );

  const currentMonthGiftCodeRow = useMemo(() => {
    return monthlyGiftCodes.find((row: any) => {
      const rowMonthKey =
        row.gift_month_key ||
        row.bundle_config?.gift_month_key ||
        (row.created_at
          ? `${new Date(row.created_at).getFullYear()}-${String(
              new Date(row.created_at).getMonth() + 1
            ).padStart(2, '0')}`
          : '');
      return rowMonthKey === currentMonthKey;
    });
  }, [monthlyGiftCodes, currentMonthKey]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    const initCreators = async () => {
      const { data: creatorsData } = await supabase
        .from('series_creators')
        .select('*')
        .order('name', { ascending: true });

      const rows = creatorsData || [];

      const dedupedMap = new Map<string, string>();
      rows.forEach((r: any) => {
        const raw = String(r.name || r.creator_name || '').trim().replace(/\s+/g, ' ');
        if (!raw) return;
        const key = normalizeCreatorKey(raw);
        const displayName = key === 'erick pedrucci' ? 'Erick Pedrucci' : raw;
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, displayName);
        }
      });

      const uniqueNames = Array.from(dedupedMap.values()).sort((a, b) => a.localeCompare(b));
      setUniqueCreatorNames(uniqueNames);

      const linked = String(currentUser?.linked_creator_name || '').trim();
      if (linked) {
        const normLinked = normalizeCreatorKey(linked);
        setSelectedCreatorName(dedupedMap.get(normLinked) || linked);
        return;
      }

      const uEmail = String(currentUser?.email || '').trim().toLowerCase();
      const userName = String(currentUser?.username || '').trim().toLowerCase();
      const fullName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim().toLowerCase();

      const aliasMatch = CREATOR_IDENTITY_ALIAS_MAP[uEmail] || CREATOR_IDENTITY_ALIAS_MAP[userName];
      if (aliasMatch) {
        const normAlias = normalizeCreatorKey(aliasMatch);
        setSelectedCreatorName(dedupedMap.get(normAlias) || aliasMatch);
        return;
      }

      const exactRow = rows.find((c: any) => {
        const cName = normalizeCreatorKey(c.name || c.creator_name || '');
        const cEmail = String(c.email || '').trim().toLowerCase();
        if (uEmail && cEmail && cEmail === uEmail) return true;
        if (fullName && cName && cName === fullName) return true;
        if (userName && cName && cName === userName) return true;
        return false;
      });

      const matchedRow =
        exactRow ||
        rows.find((c: any) => {
          const cName = String(c.name || c.creator_name || '').trim().toLowerCase();
          if (fullName && fullName.length >= 4 && cName && (cName.includes(fullName) || fullName.includes(cName))) return true;
          if (userName && userName.length >= 4 && cName && (cName.includes(userName) || userName.includes(cName))) return true;
          return false;
        });

      if (matchedRow) {
        const key = normalizeCreatorKey(matchedRow.name || matchedRow.creator_name);
        setSelectedCreatorName(dedupedMap.get(key) || String(matchedRow.name || matchedRow.creator_name).trim());
      } else if (currentUser?.username) {
        setSelectedCreatorName(currentUser.username);
      } else if (uniqueNames.length > 0) {
        setSelectedCreatorName(uniqueNames[0]);
      }
    };

    initCreators();
  }, [currentUser]);

  const referralSlug = useMemo(() => {
    const base = (selectedCreatorName || currentUser?.username || 'creator')
      .replace(/\([^)]*\)/g, '')
      .trim();
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }, [selectedCreatorName, currentUser?.username]);

  const referralCode = useMemo(() => {
    return buildCreatorReferralCode(selectedCreatorName || currentUser?.username || 'AM');
  }, [selectedCreatorName, currentUser?.username]);

  const activeSeriesObj = useMemo(() => {
    if (seriesList.length === 0) return null;
    if (selectedBioSeriesSlug) {
      const found = seriesList.find((s: any) => s.slug === selectedBioSeriesSlug);
      if (found) return found;
    }
    return seriesList[0];
  }, [seriesList, selectedBioSeriesSlug]);

  const activeSeriesSlug = activeSeriesObj?.slug || '';
  const vipReferralLink = activeSeriesSlug
    ? `https://www.mangahype.com/?series=${encodeURIComponent(activeSeriesSlug)}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`
    : `https://www.mangahype.com/?ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=16&color=000000&bgcolor=fe9a00&data=${encodeURIComponent(vipReferralLink)}`;

  const handleDownloadQrCode = async () => {
    try {
      const response = await fetch(qrCodeImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `SaturdayAM_${referralCode}_${activeSeriesSlug || 'VIP'}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrCodeImageUrl, '_blank');
    }
  };

  const fetchCreatorStudioData = useCallback(async (targetName: string) => {
    if (!targetName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cleanName = targetName.trim();
      const normKey = normalizeCreatorKey(cleanName);

      const parenMatch = cleanName.match(/^(.+?)\s*\((.+?)\)$/);
      const nameParts = parenMatch
        ? [normKey, normalizeCreatorKey(parenMatch[1]), normalizeCreatorKey(parenMatch[2])]
        : [normKey];

      const { data: allCreatorRows } = await supabase
        .from('series_creators')
        .select('*');

      const cRows = (allCreatorRows || []).filter((r: any) => {
        const rRaw = String(r.name || r.creator_name || '').trim();
        const rKey = normalizeCreatorKey(rRaw);
        const rParen = rRaw.match(/^(.+?)\s*\((.+?)\)$/);
        const rParts = rParen
          ? [rKey, normalizeCreatorKey(rParen[1]), normalizeCreatorKey(rParen[2])]
          : [rKey];
        return nameParts.some(part => part && rParts.some(rp => rp === part || rp.includes(part) || part.includes(rp)));
      });

      const dbStripe = cRows.find((r: any) => r.stripe_account_id)?.stripe_account_id || '';
      const resolvedStripeId = resolveCreatorStripeAccountId(cleanName, dbStripe);

      setCreatorProfile({
        ...(cRows[0] || { name: cleanName }),
        name: cleanName,
        stripe_account_id: resolvedStripeId
      });

      const { data: allTipsData } = await supabase
        .from('creator_tips')
        .select('*')
        .order('created_at', { ascending: false });

      const myTips = (allTipsData || []).filter((t: any) => {
        const tCreator = normalizeCreatorKey(t.creator_name);
        return nameParts.some(part => part && tCreator && (tCreator === part || tCreator.includes(part) || part.includes(tCreator)));
      });
      setTips(myTips);

      const validCodeVariants = getCreatorReferralCodeVariants(cleanName);
      const { data: refSubs } = await supabase
        .from('profiles')
        .select('id, referred_by_code')
        .eq('is_premium', true)
        .not('referred_by_code', 'is', null);

      const matchedRefCount = (refSubs || []).filter((r: any) => {
        const codeUsed = String(r.referred_by_code || '').trim().toUpperCase();
        return validCodeVariants.includes(codeUsed);
      }).length;
      setReferredAnnualCount(matchedRefCount);

      const searchName = parenMatch ? parenMatch[1].trim() : cleanName;
      const [{ data: pinRows }, { data: giftCodeRows }] = await Promise.all([
        supabase
          .from('bingo_codes')
          .select('*')
          .ilike('creator_name', `%${searchName}%`)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('promo_codes')
          .select('*')
          .ilike('creator_name', `%${searchName}%`)
          .order('created_at', { ascending: false })
          .limit(24)
      ]);

      const allPins = Array.isArray(pinRows) ? pinRows : [];
      const latestEventPin = allPins.find((p: any) => Number(p.max_uses || 999999) > 1);
      const singleUseList = allPins.filter((p: any) => Number(p.max_uses) === 1);

      setBingoPin(latestEventPin?.code || latestEventPin?.pin || '');
      setOneTimePins(singleUseList);

      const filteredGiftCodes = (giftCodeRows || []).filter(
        (r: any) =>
          Boolean(r.gift_month_key) ||
          Boolean(r.bundle_config?.is_creator_monthly_gift) ||
          String(r.code || '').startsWith('GIFT-')
      );
      setMonthlyGiftCodes(filteredGiftCodes);

      const { data: allSeries } = await supabase
        .from('series')
        .select('*')
        .order('display_order', { ascending: true });

      const orderedAuditKeys: string[] = [];
      nameParts.forEach(part => {
        if (CREATOR_EXACT_SERIES_MAP[part]) {
          CREATOR_EXACT_SERIES_MAP[part].forEach(slugOrTitle => {
            getNormalizedSeriesKeys(slugOrTitle).forEach(k => {
              if (!orderedAuditKeys.includes(k)) orderedAuditKeys.push(k);
            });
          });
        }
      });

      const dbLinkedKeys = new Set<string>();
      cRows.forEach((row: any) => {
        if (row.series_slug) {
          getNormalizedSeriesKeys(row.series_slug).forEach(k => dbLinkedKeys.add(k));
        }
      });

      const isWhytCreator = nameParts.some(p => p.includes('odunze') || p.includes('whyt'));
      const isErickCreator = nameParts.some(p => p.includes('erick') || p.includes('pedrucci') || p.includes('perducci'));

      const filteredSeries = (allSeries || []).filter((s: any) => {
        const sKeys = [
          ...getNormalizedSeriesKeys(s.slug),
          ...getNormalizedSeriesKeys(s.title)
        ];
        const sAuthorRaw = String(s.creator_name || s.author || '').trim();

        if (sKeys.some(k => orderedAuditKeys.includes(k))) return true;
        if (sKeys.some(k => dbLinkedKeys.has(k))) return true;
        if (doesSeriesAuthorMatchCreator(sAuthorRaw, nameParts)) return true;
        if (isWhytCreator && sKeys.some(k => k.includes('appleblack') || k.includes('apple-black'))) return true;
        if (isErickCreator && sKeys.some(k => k.includes('gunbone') || k.includes('gun-bone') || k.includes('gun-plus-bone') || k.includes('hammerannual'))) return true;

        return false;
      });

      const getPriorityScore = (s: any): number => {
        const sKeys = [
          ...getNormalizedSeriesKeys(s.slug),
          ...getNormalizedSeriesKeys(s.title)
        ];
        let bestIdx = 9999;
        sKeys.forEach(k => {
          const idx = orderedAuditKeys.indexOf(k);
          if (idx !== -1 && idx < bestIdx) bestIdx = idx;
        });

        const isOneshot = sKeys.some(k => k.includes('oneshot') || k.includes('one-shot'));
        if (bestIdx !== 9999) return isOneshot ? bestIdx + 50 : bestIdx;

        const isPrimaryAuthor = doesSeriesAuthorMatchCreator(String(s.creator_name || ''), nameParts);
        if (isPrimaryAuthor && !isOneshot) return 20;
        if (!isOneshot) return 40;
        return 500;
      };

      const mySeries = [...filteredSeries].sort((a, b) => getPriorityScore(a) - getPriorityScore(b));

      setSeriesList(mySeries);
      setSelectedBioSeriesSlug(mySeries[0]?.slug || '');
      setVisibleChaptersBySeries({});

      if (mySeries.length > 0) {
        const mySlugs = mySeries.map((s: any) => s.slug).filter(Boolean);
        const allowedSlugSet = new Set(mySlugs.map((slug: string) => String(slug).trim().toLowerCase()));
        const seriesBySlugLower = new Map<string, any>();
        mySeries.forEach((s: any) => {
          if (s.slug) seriesBySlugLower.set(String(s.slug).trim().toLowerCase(), s);
        });

        const [{ data: chData }, { data: commData }, { data: charsData }] = await Promise.all([
          supabase
            .from('chapters')
            .select('*')
            .in('series_slug', mySlugs)
            .order('chapter_number', { ascending: true }),
          supabase
            .from('series_comments')
            .select('*')
            .in('series_slug', mySlugs)
            .eq('is_flagged', false)
            .order('created_at', { ascending: false })
            .limit(35),
          supabase
            .from('series_characters')
            .select('*')
            .in('series_slug', mySlugs)
            .order('id', { ascending: true })
        ]);

        const verifiedChapters = (chData || []).filter((ch: any) =>
          allowedSlugSet.has(String(ch.series_slug || '').trim().toLowerCase())
        );

        const publishedChaptersOnly = verifiedChapters.filter((ch: any) => ch.is_published);
        setChaptersList(publishedChaptersOnly);
        setAllCreatorChapters(verifiedChapters);

        const defaultSlug = mySeries[0]?.slug || '';
        setStudioSeriesSlug(defaultSlug);
        const firstSeriesChaps = verifiedChapters.filter(
          (ch: any) =>
            String(ch.series_slug || '').trim().toLowerCase() ===
            String(defaultSlug).trim().toLowerCase()
        );
        setStudioChapterId(
          firstSeriesChaps.length > 0
            ? String(firstSeriesChaps[firstSeriesChaps.length - 1].id)
            : ''
        );

        const chapterByIdMap = new Map<string, any>();
        verifiedChapters.forEach((ch: any) => chapterByIdMap.set(String(ch.id), ch));
        const myChapterIds = verifiedChapters.map((ch: any) => String(ch.id));

        const creatorChars = (charsData || []).filter((ch: any) => !ch.is_hidden);
        const charByIdMap = new Map<string, any>();
        creatorChars.forEach((c: any) => {
          charByIdMap.set(String(c.id), c);
          if (c.name) charByIdMap.set(String(c.name).toLowerCase(), c);
        });
        const myCharIds = creatorChars.map((c: any) => String(c.id));

        const [
          pageCommentsRes,
          seriesHypesRes,
          chapHypesRes,
          charHypesRes,
          seriesLikesRes,
          chapLikesRes
        ] = await Promise.allSettled([
          myChapterIds.length > 0
            ? supabase
                .from('page_comments')
                .select('*')
                .in('chapter_id', myChapterIds)
                .order('created_at', { ascending: false })
                .limit(25)
            : Promise.resolve({ data: [] }),
          supabase
            .from('hypes')
            .select('*')
            .eq('target_type', 'series')
            .in('target_id', mySlugs)
            .order('created_at', { ascending: false })
            .limit(25),
          myChapterIds.length > 0
            ? supabase
                .from('hypes')
                .select('*')
                .eq('target_type', 'chapter')
                .in('target_id', myChapterIds)
                .order('created_at', { ascending: false })
                .limit(25)
            : Promise.resolve({ data: [] }),
          myCharIds.length > 0
            ? supabase
                .from('hypes')
                .select('*')
                .eq('target_type', 'character')
                .in('target_id', myCharIds)
                .order('created_at', { ascending: false })
                .limit(30)
            : Promise.resolve({ data: [] }),
          supabase
            .from('series_likes')
            .select('*')
            .in('series_slug', mySlugs)
            .order('created_at', { ascending: false })
            .limit(20),
          myChapterIds.length > 0
            ? supabase
                .from('chapter_likes')
                .select('*')
                .in('chapter_id', myChapterIds)
                .order('created_at', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] })
        ]);

        const getResData = (res: PromiseSettledResult<any>): any[] =>
          res.status === 'fulfilled' && Array.isArray(res.value?.data) ? res.value.data : [];

        const rawSeriesComments = commData || [];
        const rawPageComments = getResData(pageCommentsRes);
        const rawSeriesHypes = getResData(seriesHypesRes);
        const rawChapHypes = getResData(chapHypesRes);
        const rawCharHypes = getResData(charHypesRes);
        const rawSeriesLikes = getResData(seriesLikesRes);
        const rawChapLikes = getResData(chapLikesRes);

        const charHypeCounts: Record<string, number> = {};
        rawCharHypes.forEach((h: any) => {
          const cid = String(h.target_id);
          charHypeCounts[cid] = (charHypeCounts[cid] || 0) + 1;
        });
        setMyCharacters(
          creatorChars
            .map((c: any) => ({
              ...c,
              live_hypes: Number(c.hype_count || c.total_hypes || 0) + (charHypeCounts[String(c.id)] || 0)
            }))
            .sort((a: any, b: any) => b.live_hypes - a.live_hypes)
        );

        const allUserIds = Array.from(
          new Set(
            [
              ...rawSeriesComments.map((r: any) => r.user_id),
              ...rawPageComments.map((r: any) => r.user_id),
              ...rawSeriesHypes.map((r: any) => r.user_id),
              ...rawChapHypes.map((r: any) => r.user_id),
              ...rawCharHypes.map((r: any) => r.user_id),
              ...rawSeriesLikes.map((r: any) => r.user_id),
              ...rawChapLikes.map((r: any) => r.user_id)
            ].filter(Boolean)
          )
        );

        const profByUserId: Record<string, any> = {};
        if (allUserIds.length > 0) {
          const { data: uProfiles } = await supabase
            .from('profiles')
            .select('id, username, first_name, last_name, email, avatar_url')
            .in('id', allUserIds);
          (uProfiles || []).forEach((p: any) => {
            profByUserId[p.id] = p;
          });
        }

        const resolveActorName = (userId?: string, savedName?: string) => {
          const cleanSaved = String(savedName || '').trim();
          if (cleanSaved && !['reader', 'user', 'anonymous'].includes(cleanSaved.toLowerCase())) {
            return cleanSaved;
          }
          const p = userId ? profByUserId[userId] : null;
          if (p?.username && !['reader', 'user'].includes(String(p.username).toLowerCase())) {
            return p.username;
          }
          const full = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
          if (full) return full;
          if (p?.email) return p.email.split('@')[0];
          return 'Saturday AM Fan';
        };

        const unifiedItems: StudioActivityItem[] = [];

        rawSeriesComments.forEach((c: any) => {
          const sObj = seriesBySlugLower.get(String(c.series_slug || '').toLowerCase());
          unifiedItems.push({
            id: `scomm_${c.id}`,
            category: 'comments',
            typeLabel: c.parent_id ? 'Replied in Discussion' : 'Commented on Series',
            userName: resolveActorName(c.user_id, c.user_name),
            avatarUrl: c.avatar_url || profByUserId[c.user_id]?.avatar_url,
            seriesTitle: sObj?.title || c.series_slug,
            seriesObj: sObj || { slug: c.series_slug, title: c.series_slug },
            text: c.text,
            createdAt: c.created_at || new Date().toISOString()
          });
        });

        rawPageComments.forEach((pc: any) => {
          const ch = chapterByIdMap.get(String(pc.chapter_id));
          const sObj = ch ? seriesBySlugLower.get(String(ch.series_slug || '').toLowerCase()) : mySeries[0];
          unifiedItems.push({
            id: `pcomm_${pc.id}`,
            category: 'smart_reacts',
            typeLabel: `Smart Comment • Ch. ${ch?.chapter_number || '?'} (Pg. ${Number(pc.page_index || 0) + 1})`,
            userName: resolveActorName(pc.user_id, pc.username || pc.user_name),
            avatarUrl: profByUserId[pc.user_id]?.avatar_url,
            seriesTitle: sObj?.title || ch?.series_slug || 'Series',
            seriesObj: sObj,
            chapterId: ch?.id,
            chapterNumber: ch?.chapter_number,
            pageIndex: Number(pc.page_index || 0),
            text: pc.comment_text || pc.text || pc.reaction || 'Dropped a page reaction!',
            createdAt: pc.created_at || new Date().toISOString()
          });
        });

        rawCharHypes.forEach((chHype: any, idx: number) => {
          const charObj = charByIdMap.get(String(chHype.target_id));
          const sObj = charObj ? seriesBySlugLower.get(String(charObj.series_slug || '').toLowerCase()) : mySeries[0];
          unifiedItems.push({
            id: `charhype_${chHype.id || idx}`,
            category: 'characters',
            typeLabel: `Hyped Character: ${charObj?.name || 'Character'}`,
            userName: resolveActorName(chHype.user_id),
            avatarUrl: profByUserId[chHype.user_id]?.avatar_url,
            seriesTitle: sObj?.title || charObj?.series_slug || 'Series',
            seriesObj: sObj,
            characterName: charObj?.name,
            characterHeadshot: charObj?.headshot_url,
            createdAt: chHype.created_at || new Date().toISOString()
          });
        });

        rawSeriesHypes.forEach((sh: any, idx: number) => {
          const sObj = seriesBySlugLower.get(String(sh.target_id || '').toLowerCase()) || mySeries[0];
          unifiedItems.push({
            id: `shype_${sh.id || idx}`,
            category: 'hypes_likes',
            typeLabel: '🔥 Dropped a Series Hype',
            userName: resolveActorName(sh.user_id),
            avatarUrl: profByUserId[sh.user_id]?.avatar_url,
            seriesTitle: sObj?.title || sh.target_id,
            seriesObj: sObj,
            createdAt: sh.created_at || new Date().toISOString()
          });
        });

        rawChapHypes.forEach((chh: any, idx: number) => {
          const ch = chapterByIdMap.get(String(chh.target_id));
          const sObj = ch ? seriesBySlugLower.get(String(ch.series_slug || '').toLowerCase()) : mySeries[0];
          unifiedItems.push({
            id: `chhype_${chh.id || idx}`,
            category: 'hypes_likes',
            typeLabel: `🔥 Hyped Chapter ${ch?.chapter_number || ''}`,
            userName: resolveActorName(chh.user_id),
            avatarUrl: profByUserId[chh.user_id]?.avatar_url,
            seriesTitle: sObj?.title || ch?.series_slug || 'Series',
            seriesObj: sObj,
            chapterId: ch?.id,
            chapterNumber: ch?.chapter_number,
            createdAt: chh.created_at || new Date().toISOString()
          });
        });

        rawSeriesLikes.forEach((sl: any, idx: number) => {
          const sObj = seriesBySlugLower.get(String(sl.series_slug || '').toLowerCase()) || mySeries[0];
          unifiedItems.push({
            id: `slike_${sl.id || idx}`,
            category: 'hypes_likes',
            typeLabel: '❤️ Liked Series',
            userName: resolveActorName(sl.user_id),
            avatarUrl: profByUserId[sl.user_id]?.avatar_url,
            seriesTitle: sObj?.title || sl.series_slug,
            seriesObj: sObj,
            createdAt: sl.created_at || new Date().toISOString()
          });
        });

        rawChapLikes.forEach((cl: any, idx: number) => {
          const ch = chapterByIdMap.get(String(cl.chapter_id));
          const sObj = ch ? seriesBySlugLower.get(String(ch.series_slug || '').toLowerCase()) : mySeries[0];
          unifiedItems.push({
            id: `clike_${cl.id || idx}`,
            category: 'hypes_likes',
            typeLabel: `❤️ Liked Chapter ${ch?.chapter_number || ''}`,
            userName: resolveActorName(cl.user_id),
            avatarUrl: profByUserId[cl.user_id]?.avatar_url,
            seriesTitle: sObj?.title || ch?.series_slug || 'Series',
            seriesObj: sObj,
            chapterId: ch?.id,
            chapterNumber: ch?.chapter_number,
            createdAt: cl.created_at || new Date().toISOString()
          });
        });

        unifiedItems.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setActivityFeed(unifiedItems.slice(0, 60));

        const statsAccumulator: Record<string, { hypes: number; reacts: number }> = {};
        await Promise.all(
          mySlugs.map(async (slug: string) => {
            try {
              const { data: rpcStats } = await supabase.rpc('get_series_chapter_stats', { p_series_slug: slug });
              if (Array.isArray(rpcStats)) {
                rpcStats.forEach((st: any) => {
                  statsAccumulator[String(st.chapter_id)] = {
                    hypes: Number(st.total_hypes || 0),
                    reacts: Number(st.total_reacts || 0)
                  };
                });
              }
            } catch {
              // Ignore RPC errors on individual series
            }
          })
        );
        setChapterStatsMap(statsAccumulator);
      } else {
        setChaptersList([]);
        setAllCreatorChapters([]);
        setStudioSeriesSlug('');
        setStudioChapterId('');
        setActivityFeed([]);
        setMyCharacters([]);
        setChapterStatsMap({});
      }
    } catch (err) {
      console.error('Error loading Creator Studio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCreatorName) {
      fetchCreatorStudioData(selectedCreatorName);
    } else {
      setLoading(false);
    }
  }, [selectedCreatorName, fetchCreatorStudioData]);

  const handleGenerateMonthlyGiftSub = async () => {
    if (!selectedCreatorName) return;
    if (currentMonthGiftCodeRow) {
      alert(`You have already generated your 1 Monthly Gift Sub Code for ${currentMonthLabel} (${currentMonthGiftCodeRow.code}). Monthly gift codes do not stack!`);
      return;
    }

    setGeneratingMonthlyGift(true);
    try {
      const cleanName = selectedCreatorName.trim();
      const parenMatch = cleanName.match(/^(.+?)\s*\((.+?)\)$/);
      const searchName = parenMatch ? parenMatch[1].trim() : cleanName;
      const { monthKey, monthLabel, endOfMonth } = getCurrentMonthKeyAndExpiry();

      const { data: existingRows } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('creator_name', `%${searchName}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      const alreadyCreatedThisMonth = (existingRows || []).find((r: any) => {
        const rMonthKey =
          r.gift_month_key ||
          r.bundle_config?.gift_month_key ||
          (r.created_at
            ? `${new Date(r.created_at).getFullYear()}-${String(
                new Date(r.created_at).getMonth() + 1
              ).padStart(2, '0')}`
            : '');
        const isGiftRow =
          Boolean(r.gift_month_key) ||
          Boolean(r.bundle_config?.is_creator_monthly_gift) ||
          String(r.code || '').startsWith('GIFT-');
        return isGiftRow && rMonthKey === monthKey;
      });

      if (alreadyCreatedThisMonth) {
        setMonthlyGiftCodes(prev => [
          alreadyCreatedThisMonth,
          ...prev.filter(p => p.id !== alreadyCreatedThisMonth.id)
        ]);
        alert(`Your ${monthLabel} Gift Sub Code (${alreadyCreatedThisMonth.code}) is already active!`);
        return;
      }

      const creatorTag = searchName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'SAM';
      const yymm = `${monthKey.slice(2, 4)}${monthKey.slice(5, 7)}`;
      const randSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, 'X');
      const generatedCode = `GIFT-${creatorTag}-${yymm}-${randSuffix}`;

      const bundlePayload = {
        include_1yr_sub: true,
        is_creator_monthly_gift: true,
        non_stackable: true,
        no_extra_perks: true,
        gift_month_key: monthKey,
        bundle_title: `${cleanName} Monthly 1-Year PLUS Gift Pass (${monthLabel})`
      };

      const insertPayload: Record<string, any> = {
        code: generatedCode,
        tier: 'premium',
        creator_name: cleanName,
        gift_month_key: monthKey,
        max_uses: 1,
        times_used: 0,
        expires_at: endOfMonth,
        bundle_config: bundlePayload
      };

      let { data: insertedGift, error: insertErr } = await supabase
        .from('promo_codes')
        .insert([insertPayload])
        .select()
        .single();

      if (insertErr) {
        const { gift_month_key, ...fallbackPayload } = insertPayload;
        const retryRes = await supabase
          .from('promo_codes')
          .insert([fallbackPayload])
          .select()
          .single();
        if (retryRes.error) throw retryRes.error;
        insertedGift = retryRes.data;
      }

      if (insertedGift) {
        setMonthlyGiftCodes(prev => [insertedGift, ...prev]);
      }
    } catch (err: any) {
      alert('Could not generate Monthly Gift Sub Code: ' + (err.message || 'Please check promo_codes table.'));
    } finally {
      setGeneratingMonthlyGift(false);
    }
  };

  const handleGeneratePin = async () => {
    if (!selectedCreatorName) return;
    setGeneratingPin(true);
    try {
      const newPin = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('bingo_codes').insert([{
        code: newPin,
        creator_name: selectedCreatorName.trim(),
        event_name: 'Creator Studio Event PIN',
        max_uses: 999999,
        times_used: 0,
        expires_at: expiresAt
      }]);

      if (error) throw error;
      setBingoPin(newPin);
    } catch (err: any) {
      alert('Could not generate PIN: ' + err.message);
    } finally {
      setGeneratingPin(false);
    }
  };

  const handleGenerateOneTimePin = async () => {
    if (!selectedCreatorName) return;
    setGeneratingOneTimePin(true);
    try {
      const newPin = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: insertedRow, error } = await supabase
        .from('bingo_codes')
        .insert([
          {
            code: newPin,
            creator_name: selectedCreatorName.trim(),
            event_name: '1-Time Fan Gift PIN',
            max_uses: 1,
            times_used: 0,
            expires_at: expiresAt
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (insertedRow) {
        setOneTimePins(prev => [insertedRow, ...prev]);
      }
    } catch (err: any) {
      alert('Could not generate 1-Time PIN: ' + err.message);
    } finally {
      setGeneratingOneTimePin(false);
    }
  };

  const handleDeleteOneTimePin = async (pinId: any) => {
    try {
      await supabase.from('bingo_codes').delete().eq('id', pinId);
      setOneTimePins(prev => prev.filter(p => p.id !== pinId));
    } catch (err) {
      console.error('Error deleting PIN:', err);
    }
  };

  const totalTipDollars = useMemo(() => {
    return tips.reduce((acc, row) => {
      const amt = Number(
        row.amount_dollars ?? (row.amount_cents ? row.amount_cents / 100 : row.amount || 0)
      );
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [tips]);

  const getChapterHypes = useCallback((ch: any) => {
    const rpcHypes = chapterStatsMap[String(ch.id)]?.hypes || 0;
    return Number(ch.hype_count || ch.total_hypes || 0) + rpcHypes;
  }, [chapterStatsMap]);

  const getSeriesTotalHypes = useCallback((series: any) => {
    const sChapters = chaptersList.filter(
      (c: any) => String(c.series_slug || '').trim().toLowerCase() === String(series.slug || '').trim().toLowerCase()
    );
    const subHypes = sChapters.reduce((sum, ch) => sum + getChapterHypes(ch), 0);
    return Number(series.hype_count || series.total_hypes || 0) + subHypes;
  }, [chaptersList, getChapterHypes]);

  const totalSeriesHypes = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + getSeriesTotalHypes(s), 0);
  }, [seriesList, getSeriesTotalHypes]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return activityFeed;
    return activityFeed.filter(item => item.category === activityFilter);
  }, [activityFeed, activityFilter]);

  const recentActivityCount = useMemo(() => {
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const now = Date.now();
    return activityFeed.filter(c => {
      const t = new Date(c.createdAt || 0).getTime();
      return !isNaN(t) && now - t <= fortyEightHoursMs;
    }).length;
  }, [activityFeed]);

  const cleanRole = String(currentUser?.role || '').toLowerCase();
  const isRevoked = cleanRole === 'revoked_creator';
  const hasStudioPermission =
    isAdmin ||
    (!isRevoked &&
      (STAFF_CREATOR_EMAILS.includes(userEmail) ||
        Boolean(currentUser?.linked_creator_name) ||
        ['creator', 'core_creator', 'staff', 'influencer'].includes(cleanRole)));

  if (!hasStudioPermission) {
    return (
      <div className="min-h-screen bg-black/95 text-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">
          Creator Studio Access Required
        </h2>
        <p className="text-xs text-zinc-400 font-bold max-w-sm mb-6 leading-relaxed">
          Your account does not currently have active Creator Studio privileges. Please use a valid Saturday AM Creator Onboarding link or contact editorial support.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[#fe9a00] text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-colors cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/90 text-white pb-36 pt-6 px-4 sm:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Top Navigation & Role Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800 pr-14 sm:pr-16">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">
                Creator <span className="text-[#fe9a00]">Studio</span>
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                effectiveRole === 'staff'
                  ? 'bg-[#fe9a00]/20 text-[#fe9a00] border-[#fe9a00]/50'
                  : effectiveRole === 'influencer'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {effectiveRole === 'staff'
                  ? 'Staff / Creator ($5 Annual Ref + 3d Trial)'
                  : effectiveRole === 'influencer'
                  ? 'Influencer Partner ($2 Annual Ref + 3d Trial)'
                  : 'Official Creator ($5 Annual Ref + 3d Trial)'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-bold mt-1">
              Real-time series stats, interactive page Author Notes &amp; Panel Shares, 100% pass-through fan tips, monthly gift sub &amp; autograph PINs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && uniqueCreatorNames.length > 0 && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-[#fe9a00]/50 rounded-xl px-3 py-2" title="Admin Peek Mode: View any creator's studio">
              <Eye className="w-4 h-4 text-[#fe9a00] shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hidden sm:inline">
                Admin Peek:
              </span>
              <select
                value={selectedCreatorName}
                onChange={(e) => setSelectedCreatorName(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {uniqueCreatorNames.map((cName) => (
                  <option key={cName} value={cName} className="bg-zinc-950 text-white">
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchCreatorStudioData(selectedCreatorName)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-colors cursor-pointer"
            title="Refresh Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Direct Fan Tips (100%)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">${totalTipDollars.toFixed(2)}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-bold text-zinc-500">{tips.length} Fan Tip{tips.length === 1 ? '' : 's'}</span>
              {creatorProfile?.stripe_account_id ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Payments: Direct
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Payments: Saturday AM
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-[#fe9a00]/40 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(254,154,0,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">Annual Sub Referral</span>
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#fe9a00]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">
              ${commissionPerSale}.00 <span className="text-xs font-bold text-zinc-400 not-italic">/ Annual Sub</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">
              {referredAnnualCount > 0
                ? `${referredAnnualCount} Referred Subs ($${(referredAnnualCount * commissionPerSale).toFixed(2)} Earned)`
                : 'Unlocks 3-Day Free Trial on Annual ($20/yr)'}
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Series Hypes</span>
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-[#fe9a00]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">{totalSeriesHypes.toLocaleString()}</div>
            <span className="text-[10px] font-bold text-zinc-500 mt-2 block">
              Across {seriesList.length} linked series ({chaptersList.length} chapters)
            </span>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Event PIN (24h)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-mono font-black tracking-widest text-[#fe9a00]">
                {bingoPin || '-----'}
              </span>
              <button
                onClick={handleGeneratePin}
                disabled={generatingPin}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-[#fe9a00] hover:text-black text-zinc-300 border border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {generatingPin ? '...' : bingoPin ? 'New PIN' : 'Create PIN'}
              </button>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 mt-2 block">
              Unlimited uses for 24h at conventions/streams
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRIVATE 7.5% DEVELOPER CUT TRACKER (VISIBLE ONLY TO RAYME3000)
      ========================================================================= */}
      {isRayDevOwner && devCutMetrics && (
        <div className="bg-gradient-to-r from-zinc-950 via-black to-emerald-950/25 border-2 border-emerald-500/50 rounded-2xl p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.12)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white">
                    Private Developer Cut Ledger <span className="text-emerald-400">(7.5% Locked)</span>
                  </h3>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Private • Only Visible to You
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-bold mt-0.5">
                  Tracks your 7.5% developer allocation across Store Bundles, Card Skins/Packs, and PLUS Subscriptions (`acct_1US3pv2d62PnIfST`).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800 self-start md:self-center shrink-0">
              {(
                [
                  { id: 'day', label: 'Today' },
                  { id: 'week', label: '7d Week' },
                  { id: 'month', label: '30d Month' },
                  { id: 'all', label: 'All-Time' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDevPeriod(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    devPeriod === tab.id
                      ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-black border border-emerald-500/40 rounded-xl p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                {devPeriod === 'day'
                  ? "Today's 7.5% Dev Cut"
                  : devPeriod === 'week'
                  ? 'Last 7 Days Dev Cut'
                  : devPeriod === 'month'
                  ? 'Last 30 Days Dev Cut'
                  : 'All-Time Dev Cut'}
              </span>
              <div className="text-2xl sm:text-3xl font-black italic text-white mt-1">
                ${devCutMetrics.active.totalCut.toFixed(2)}
              </div>
              <span className="text-[10px] font-bold text-zinc-400 mt-1 block">
                {devCutMetrics.active.count} Qualifying Sale{devCutMetrics.active.count === 1 ? '' : 's'} (${devCutMetrics.active.grossVol.toFixed(2)} Gross)
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] block">
                Store &amp; Bundles (7.5%)
              </span>
              <div className="text-xl sm:text-2xl font-black italic text-[#fe9a00] mt-1">
                ${devCutMetrics.active.storeCut.toFixed(2)}
              </div>
              <span className="text-[10px] font-bold text-zinc-500 mt-1 block">
                From `store_payout_ledger`
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block">
                Standalone PLUS Subs (7.5%)
              </span>
              <div className="text-xl sm:text-2xl font-black italic text-purple-300 mt-1">
                ${devCutMetrics.active.subCut.toFixed(2)}
              </div>
              <span className="text-[10px] font-bold text-zinc-500 mt-1 block">
                $0.15/mo Monthly • $1.50/yr Annual
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                Quick Period Snapshot
              </span>
              <div className="space-y-1 text-[10px] font-bold mt-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Today:</span>
                  <span className="text-white font-black">${devCutMetrics.byPeriod.day.totalCut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">7d Week:</span>
                  <span className="text-white font-black">${devCutMetrics.byPeriod.week.totalCut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">30d Month:</span>
                  <span className="text-emerald-400 font-black">${devCutMetrics.byPeriod.month.totalCut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">All-Time:</span>
                  <span className="text-[#fe9a00] font-black">${devCutMetrics.byPeriod.all.totalCut.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {devCutMetrics.active.items.length > 0 && (
            <div className="bg-black/80 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-900/70 border-b border-zinc-800 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-400" /> Recent Dev Cut Transactions ({devCutMetrics.active.items.length})
                </span>
                <span>Gross → 7.5% Cut</span>
              </div>
              <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto custom-scrollbar">
                {devCutMetrics.active.items.slice(0, 15).map(ev => (
                  <div
                    key={ev.id}
                    className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs hover:bg-zinc-900/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                          ev.source === 'Store / Bundle'
                            ? 'bg-[#fe9a00]/15 text-[#fe9a00] border-[#fe9a00]/40'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                        }`}
                      >
                        {ev.source}
                      </span>
                      <span className="font-black text-white truncate">{ev.label}</span>
                      <span className="text-[10px] text-zinc-400 font-bold truncate">• {ev.buyer}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {ev.isoDate
                          ? new Date(ev.isoDate).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : '—'}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-400">
                        ${ev.grossDollars.toFixed(2)}
                      </span>
                      <span className="text-xs font-black text-emerald-400 min-w-[56px] text-right">
                        +${ev.devCutDollars.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MONTHLY 1-YEAR PLUS GIFT SUB CODE GENERATOR (1 PER MONTH • NON-STACKING)
      ========================================================================= */}
      <div className="bg-zinc-950 border-2 border-[#fe9a00]/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(254,154,0,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/50 flex items-center justify-center text-[#fe9a00] shrink-0 mt-0.5">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white">
                  Monthly 1-Year PLUS Gift Sub Code
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {currentMonthLabel}: {currentMonthGiftCodeRow ? '0 / 1 Remaining' : '1 / 1 Available'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
                  Non-Stacking • Membership Only
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-bold mt-1 leading-relaxed">
                Every creator can generate <span className="text-white font-black">1 Free 1-Year Saturday AM+ PLUS Gift Code per calendar month</span> to give to a fan or contest winner. Unused monthly allowances do not roll over, and fans cannot stack multiple gift codes. Once redeemed, the fan&apos;s PLUS membership is active for 1 full year!
              </p>
            </div>
          </div>

          {currentMonthGiftCodeRow ? (
            <div className="px-4 py-3 bg-zinc-900 border border-emerald-500/40 text-emerald-300 font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1.5 shrink-0">
              <Check className="w-4 h-4 text-emerald-400" /> {currentMonthLabel} Code Generated
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateMonthlyGiftSub}
              disabled={generatingMonthlyGift}
              className="px-5 py-3.5 bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(254,154,0,0.35)] cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Crown className="w-4 h-4 fill-black" />
              {generatingMonthlyGift ? 'Generating...' : `Generate ${currentMonthLabel} Gift Sub`}
            </button>
          )}
        </div>

        {monthlyGiftCodes.length === 0 ? (
          <div className="text-center py-5 bg-black/60 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400 font-bold">
            You haven&apos;t generated your <span className="text-[#fe9a00]">{currentMonthLabel}</span> 1-Year PLUS Gift Code yet. Click <span className="text-white">&ldquo;Generate {currentMonthLabel} Gift Sub&rdquo;</span> above when you&apos;re ready to gift it!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {monthlyGiftCodes.slice(0, 6).map((giftRow: any) => {
              const codeStr = String(giftRow.code || '');
              const usedCount = Number(giftRow.times_used || 0);
              const isClaimed = usedCount >= Number(giftRow.max_uses || 1);
              const isExpired =
                !isClaimed && giftRow.expires_at && new Date() > new Date(giftRow.expires_at);
              const monthTag =
                giftRow.gift_month_key ||
                giftRow.bundle_config?.gift_month_key ||
                (giftRow.created_at
                  ? new Date(giftRow.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'Monthly Gift');

              const giftDmText = `Congrats! You won my ${selectedCreatorName} Monthly 1-Year Saturday AM+ PLUS Gift Sub! 👑\n\nYour 1-Time Code: ${codeStr}\n\nHow to Redeem: Go to https://www.mangahype.com/?view=sub, scroll to the "Redeem Code" box, and enter ${codeStr} to unlock 1 full year of Saturday AM+ PLUS! (Note: Must be redeemed this month on a Free account; codes cannot be stacked.)`;

              return (
                <div
                  key={giftRow.id || codeStr}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isClaimed
                      ? 'bg-zinc-900/50 border-zinc-800'
                      : isExpired
                      ? 'bg-red-950/20 border-red-900/40 opacity-60'
                      : 'bg-black border-[#fe9a00]/60 shadow-[0_0_20px_rgba(254,154,0,0.1)]'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base sm:text-lg font-mono font-black tracking-widest text-[#fe9a00]">
                        {codeStr}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          isClaimed
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : isExpired
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-[#fe9a00]/20 text-[#fe9a00] border-[#fe9a00]/50'
                        }`}
                      >
                        {isClaimed
                          ? '✓ Redeemed (1-Yr PLUS Active)'
                          : isExpired
                          ? 'Expired Unclaimed'
                          : 'Ready to Gift (0/1 Used)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 block mt-1">
                      Allowance Period: <strong className="text-white">{monthTag}</strong> •{' '}
                      {isClaimed
                        ? 'Membership expires 1 year from fan redemption'
                        : giftRow.expires_at
                        ? `Must be claimed by ${new Date(giftRow.expires_at).toLocaleDateString()}`
                        : '1-Year PLUS Pass'}
                    </span>
                  </div>

                  {!isClaimed && !isExpired && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(codeStr, `giftcode_${codeStr}`)}
                        className="px-3 py-2 bg-zinc-900 hover:bg-white text-zinc-200 hover:text-black border border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy Code Only"
                      >
                        {copiedKey === `giftcode_${codeStr}` ? (
                          <><Check className="w-3 h-3 text-emerald-400" /> Code Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy Code</>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(giftDmText, `giftdm_${codeStr}`)}
                        className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-wider rounded-lg text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy Code + Full Fan Redemption DM Instructions"
                      >
                        {copiedKey === `giftdm_${codeStr}` ? (
                          <><Check className="w-3 h-3" /> DM Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy Gift DM</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          COLLAPSIBLE CREATOR PAGE NOTES & PANEL SHARE STUDIO (3 INFO + 1 SHARE MAX)
      ========================================================================= */}
      <div className="bg-zinc-950 border-2 border-[#fe9a00]/50 rounded-2xl p-5 sm:p-6 mb-6 shadow-[0_0_25px_rgba(254,154,0,0.1)]">
        <div
          onClick={() => setIsHotspotStudioOpen(prev => !prev)}
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group ${
            isHotspotStudioOpen ? 'border-b border-zinc-800 pb-4 mb-4' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/50 flex items-center justify-center text-[#fe9a00] shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white group-hover:text-[#fe9a00] transition-colors">
                  Page Author Notes &amp; Panel Share Studio
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 px-2.5 py-0.5 rounded-full">
                  Max 3 Author Notes + 1 Panel Share / Page
                </span>
                {studioHotspots.length > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                    {studioHotspots.length} Active Pin{studioHotspots.length === 1 ? '' : 's'} in Selected Ch.
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-bold mt-1">
                Add interactive behind-the-scenes Author Notes (+1 Fandom Pt when fans read them) and viral Panel Share hotspots (+5 Fandom Pts &amp; Series Hype boost) directly onto your chapter pages!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {isHotspotStudioOpen && studioPages.length > 0 && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setIsStudioReaderPreviewOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Preview in Reader
              </button>
            )}

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsHotspotStudioOpen(prev => !prev);
              }}
              className="px-3 py-2 rounded-xl bg-zinc-900 group-hover:bg-[#fe9a00] text-zinc-200 group-hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isHotspotStudioOpen ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Open Studio</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {isHotspotStudioOpen && (
          <div className="space-y-4 animate-fade-in">
            {seriesList.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-zinc-500">
                No series linked to this creator profile yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Select Series
                    </label>
                    <select
                      value={studioSeriesSlug}
                      onChange={e => {
                        const nextSlug = e.target.value;
                        setStudioSeriesSlug(nextSlug);
                        const matchingChaps = allCreatorChapters.filter(
                          c =>
                            String(c.series_slug || '').trim().toLowerCase() ===
                            nextSlug.trim().toLowerCase()
                        );
                        setStudioChapterId(
                          matchingChaps.length > 0
                            ? String(matchingChaps[matchingChaps.length - 1].id)
                            : ''
                        );
                      }}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] cursor-pointer"
                    >
                      {seriesList.map((s: any) => (
                        <option key={s.slug} value={s.slug}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Select Chapter (Live &amp; Upcoming Queued)
                    </label>
                    <select
                      value={studioChapterId}
                      onChange={e => setStudioChapterId(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] cursor-pointer"
                    >
                      {allCreatorChapters
                        .filter(
                          c =>
                            String(c.series_slug || '').trim().toLowerCase() ===
                            studioSeriesSlug.trim().toLowerCase()
                        )
                        .map((c: any) => {
                          const isScheduled =
                            c.publish_at && new Date(c.publish_at).getTime() > Date.now();
                          return (
                            <option key={c.id} value={String(c.id)}>
                              Ch. {c.chapter_number}: {c.title || `Chapter ${c.chapter_number}`}{' '}
                              {!c.is_published
                                ? '(Hidden Draft)'
                                : isScheduled
                                ? `(Scheduled ${new Date(c.publish_at).toLocaleDateString()})`
                                : '(Live)'}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                {loadingStudioPages ? (
                  <div className="py-10 text-center text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                    Loading Chapter Pages...
                  </div>
                ) : studioPages.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-zinc-500 bg-black/50 rounded-xl border border-dashed border-zinc-800">
                    No pages uploaded for this chapter yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar pt-1">
                    {studioPages.map((pageUrl, idx) => {
                      const pNodes = studioHotspots.filter(h => Number(h.page_index) === idx);
                      const infoCount = pNodes.filter(h => h.icon_type !== 'share').length;
                      const shareCount = pNodes.filter(h => h.icon_type === 'share').length;

                      return (
                        <div
                          key={idx}
                          onClick={() => openCreatorPageHotspotModal(idx, 'info')}
                          className="relative aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 hover:border-[#fe9a00] bg-black group cursor-pointer transition-all"
                        >
                          <img
                            src={normalizeMangaPageUrl(pageUrl, 0)}
                            alt={`Pg ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/85 border border-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-black text-white">
                            PG {idx + 1}
                          </div>

                          {(infoCount > 0 || shareCount > 0) && (
                            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                              {infoCount > 0 && (
                                <span className="bg-[#fe9a00] text-black text-[8px] font-black px-1.5 py-0.5 rounded">
                                  {infoCount}/{MAX_AUTHOR_NOTES_PER_PAGE} Note
                                </span>
                              )}
                              {shareCount > 0 && (
                                <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                                  {shareCount}/{MAX_SHARE_NODES_PER_PAGE} Share
                                </span>
                              )}
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-2 flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openCreatorPageHotspotModal(idx, 'info');
                              }}
                              className="flex-1 py-1 rounded bg-zinc-900/90 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[8px] font-black uppercase flex items-center justify-center gap-0.5 cursor-pointer"
                              title="Add or Edit Author Notes (Max 3)"
                            >
                              <MapPin className="w-2.5 h-2.5" /> Note
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openCreatorPageHotspotModal(idx, 'share');
                              }}
                              className="flex-1 py-1 rounded bg-zinc-900/90 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 text-[8px] font-black uppercase flex items-center justify-center gap-0.5 cursor-pointer"
                              title="Add or Edit Panel Share Node (Max 1)"
                            >
                              <Share2 className="w-2.5 h-2.5" /> Share
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* CREATOR LIVE READER PREVIEW */}
      {isStudioReaderPreviewOpen && studioPages.length > 0 && (
        <MangaReader
          pages={studioPages}
          chapterId={studioChapterId}
          series={seriesList.find(s => s.slug === studioSeriesSlug)}
          chapter={allCreatorChapters.find(c => String(c.id) === String(studioChapterId))}
          userId={currentUser?.id}
          isPremium={true}
          onClose={() => setIsStudioReaderPreviewOpen(false)}
        />
      )}

      {/* CREATOR PANEL SHARE CROPPER MODAL (PORTALED TO BODY) */}
      {cropPanelSourceUrl &&
        createPortal(
          <ThumbnailCropperModal
            imageUrl={cropPanelSourceUrl}
            uploadFolder="hotspot-shares"
            aspect={1}
            title="Crop Panel for Fan Sharing (1:1)"
            onCropComplete={(croppedUrl: string) => {
              setStudioContent(croppedUrl);
              setCropPanelSourceUrl(null);
            }}
            onCancel={() => setCropPanelSourceUrl(null)}
          />,
          document.body
        )}

      {/* CREATOR HOTSPOT PLACEMENT CANVAS MODAL (PORTALED TO BODY ABOVE FLOATING NAV) */}
      {activeStudioPageIdx !== null &&
        studioPages[activeStudioPageIdx] &&
        !cropPanelSourceUrl &&
        createPortal(
          (() => {
            const currentPageNodes = studioHotspots.filter(
              h => Number(h.page_index) === activeStudioPageIdx
            );
            const pageInfoCount = currentPageNodes.filter(h => h.icon_type !== 'share').length;
            const pageShareCount = currentPageNodes.filter(h => h.icon_type === 'share').length;

            return (
              <div className="fixed inset-0 z-[9500] bg-black/95 p-3 sm:p-5 backdrop-blur-md flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden">
                {/* LEFT / TOP: FULL-HEIGHT MANGA PAGE CANVAS */}
                <div className="flex-1 min-h-[62vh] md:min-h-0 md:h-full flex justify-center items-center relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 sm:p-4 overflow-auto">
                  <div className="relative inline-block">
                    <img
                      src={normalizeMangaPageUrl(studioPages[activeStudioPageIdx], 0)}
                      alt={`Page ${activeStudioPageIdx + 1}`}
                      onClick={handleCreatorCanvasClick}
                      draggable={false}
                      className="max-h-[72vh] md:max-h-[86vh] w-auto max-w-full object-contain cursor-crosshair border border-white/15 select-none block shadow-2xl"
                    />

                    {/* Saved Pins on This Page */}
                    {currentPageNodes
                      .filter(h => String(h.id) !== String(studioDraft?.id || ''))
                      .map(h => {
                        const isShare = h.icon_type === 'share';
                        return (
                          <div
                            key={h.id}
                            onClick={e => {
                              e.stopPropagation();
                              setStudioMode(isShare ? 'share' : 'info');
                              setStudioDraft({ x: h.x_percent, y: h.y_percent, id: h.id });
                              setStudioContent(h.content || '');
                            }}
                            style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
                            className={`absolute -ml-3 -mt-3 w-6 h-6 rounded-full flex items-center justify-center p-1 shadow-lg group hover:scale-110 transition-transform cursor-pointer ${
                              isShare
                                ? 'bg-black border-2 border-red-500'
                                : 'bg-black border-2 border-[#fe9a00]'
                            }`}
                            title="Click to edit or move this pin"
                          >
                            {isShare ? (
                              <Share2 className="w-3 h-3 text-red-500" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-[#fe9a00]" />
                            )}
                          </div>
                        );
                      })}

                    {/* Active Draft Pin */}
                    {studioDraft && (
                      <div
                        style={{ top: `${studioDraft.y}%`, left: `${studioDraft.x}%` }}
                        className={`absolute -ml-3.5 -mt-3.5 w-7 h-7 rounded-full flex items-center justify-center p-1 animate-bounce pointer-events-none ${
                          studioMode === 'share'
                            ? 'bg-red-600 text-white border-2 border-white'
                            : 'bg-[#fe9a00] text-black border-2 border-white'
                        }`}
                      >
                        {studioMode === 'share' ? (
                          <Share2 className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT / BOTTOM: CONTROLS SIDEBAR */}
                <div className="w-full md:w-80 md:h-full overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shrink-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                          Page {activeStudioPageIdx + 1} of {studioPages.length}
                        </span>
                        <h4 className="text-sm font-black italic uppercase text-white">
                          Place Interactive Nodes
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStudioPageIdx(null);
                          setStudioDraft(null);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                        title="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Mode Switcher with Live Per-Page Cap Counters */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStudioMode('info');
                          setStudioDraft(null);
                          setStudioContent('');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          studioMode === 'info'
                            ? 'bg-[#fe9a00]/15 border-[#fe9a00] text-[#fe9a00]'
                            : 'bg-black border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Author Note
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-0.5">
                          {pageInfoCount} / {MAX_AUTHOR_NOTES_PER_PAGE} Used
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStudioMode('share');
                          const existingShare = currentPageNodes.find(h => h.icon_type === 'share');
                          if (existingShare) {
                            setStudioDraft({
                              x: existingShare.x_percent,
                              y: existingShare.y_percent,
                              id: existingShare.id
                            });
                            setStudioContent(existingShare.content || '');
                          } else {
                            setStudioDraft(null);
                            setStudioContent('');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          studioMode === 'share'
                            ? 'bg-red-500/15 border-red-500 text-red-400'
                            : 'bg-black border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> Panel Share
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-0.5">
                          {pageShareCount} / {MAX_SHARE_NODES_PER_PAGE} Used
                        </div>
                      </button>
                    </div>

                    {studioDraft ? (
                      <div className="space-y-3 pt-2">
                        {studioMode === 'info' ? (
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                              Author Commentary / Easter Egg Note
                            </label>
                            <textarea
                              rows={5}
                              value={studioContent}
                              onChange={e => setStudioContent(e.target.value)}
                              placeholder="Share behind-the-scenes trivia, lore, or creator commentary..."
                              className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#fe9a00]"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {studioContent && studioContent.startsWith('http') && (
                              <img
                                src={studioContent}
                                alt="Cropped Share Panel"
                                className="w-full h-36 object-contain bg-black border border-zinc-800 rounded-xl"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => setCropPanelSourceUrl(studioPages[activeStudioPageIdx])}
                              className="w-full py-3 rounded-xl border-2 border-dashed border-red-500/60 hover:border-red-400 bg-black text-red-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Crop className="w-4 h-4" />
                              {studioContent ? 'Re-Crop Panel Image' : 'Crop Panel to Share'}
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {studioDraft.id && (
                            <button
                              type="button"
                              disabled={savingHotspot}
                              onClick={() => handleDeleteCreatorHotspot(studioDraft.id)}
                              className="px-3 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800 text-[10px] font-black uppercase cursor-pointer"
                              title="Delete Pin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setStudioDraft(null);
                              setStudioContent('');
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingHotspot}
                            onClick={handleSaveCreatorHotspot}
                            className="flex-1 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest cursor-pointer"
                          >
                            {savingHotspot ? 'Saving...' : 'Save Pin'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-xl border border-dashed border-zinc-800 bg-black/50 text-center text-[11px] font-bold text-zinc-400 leading-relaxed">
                        Tap anywhere on the manga page to drop a{' '}
                        <strong className="text-white">
                          {studioMode === 'share' ? 'Panel Share Pin' : 'Author Note Pin'}
                        </strong>
                        , or tap an existing pin on the page to edit/delete it.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800">
                    <button
                      type="button"
                      disabled={activeStudioPageIdx <= 0}
                      onClick={() => {
                        setActiveStudioPageIdx(p => Math.max(0, (p || 0) - 1));
                        setStudioDraft(null);
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-[10px] font-black uppercase disabled:opacity-40 cursor-pointer"
                    >
                      ← Prev Page
                    </button>
                    <button
                      type="button"
                      disabled={activeStudioPageIdx >= studioPages.length - 1}
                      onClick={() => {
                        setActiveStudioPageIdx(p => Math.min(studioPages.length - 1, (p || 0) + 1));
                        setStudioDraft(null);
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-[10px] font-black uppercase disabled:opacity-40 cursor-pointer"
                    >
                      Next Page →
                    </button>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}

      {/* 1-TIME FAN GIFT AUTOGRAPH PIN GENERATOR & TRACKER */}
      <div className="bg-zinc-950 border border-purple-500/40 rounded-2xl p-5 sm:p-6 mb-8 shadow-[0_0_25px_rgba(168,85,247,0.1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white">
                  1-Time Fan Gift Autograph PINs
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  Single-Use Only
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-bold mt-0.5">
                Generate a private, 1-time-use 5-digit PIN to DM to a contest winner or superfan. Once that fan claims your autograph in the Bingo Book, the PIN locks automatically!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateOneTimePin}
            disabled={generatingOneTimePin}
            className="px-4 py-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(254,154,0,0.3)] cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {generatingOneTimePin ? 'Generating...' : 'Generate 1-Time Fan PIN'}
          </button>
        </div>

        {oneTimePins.length === 0 ? (
          <div className="text-center py-6 bg-black/50 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 font-bold">
            No 1-Time Fan Gift PINs generated yet. Click "Generate 1-Time Fan PIN" above to create one for a giveaway winner!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {oneTimePins.map((pinRow: any) => {
              const pinCode = String(pinRow.code || pinRow.pin || '');
              const usedCount = Number(pinRow.times_used || 0);
              const isClaimed = usedCount >= 1;
              const isExpired = pinRow.expires_at && new Date() > new Date(pinRow.expires_at);
              const dmCopyText = `Congrats! Here is your exclusive 1-Time Saturday AM Autograph PIN for ${selectedCreatorName}: ${pinCode} — Open the Bingo Book on mangahype.com, tap ${selectedCreatorName}, and enter ${pinCode} to unlock my gold signature + 25 Fandom Points!`;

              return (
                <div
                  key={pinRow.id || pinCode}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isClaimed
                      ? 'bg-zinc-900/40 border-zinc-800 opacity-60'
                      : isExpired
                      ? 'bg-red-950/20 border-red-900/40 opacity-60'
                      : 'bg-black border-purple-500/40 shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-black tracking-widest text-[#fe9a00]">
                        {pinCode}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                          isClaimed
                            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            : isExpired
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {isClaimed ? 'Claimed (1/1)' : isExpired ? 'Expired' : 'Available (0/1)'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 block mt-0.5">
                      {pinRow.expires_at
                        ? `Expires ${new Date(pinRow.expires_at).toLocaleDateString()}`
                        : 'Single-Use Gift PIN'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isClaimed && !isExpired && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(dmCopyText, `otpin_${pinCode}`)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy PIN + Fan DM Instructions"
                      >
                        {copiedKey === `otpin_${pinCode}` ? (
                          <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy DM</>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteOneTimePin(pinRow.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete PIN"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          VIP REFERRAL LINK, CODE & MULTI-SERIES LINK SELECTOR HUB
      ========================================================================= */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-[#fe9a00]/50 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                <Sparkles className="w-3.5 h-3.5" /> Annual Referral Code, QR Code & 3-Day Free Trial Bundle
              </div>
              <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-white">
                Earn ${commissionPerSale} Per Annual Subscriber + Give Fans a 3-Day Free Trial
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-bold leading-relaxed">
                Every fan who scans your QR code or uses any of your series links below on the Annual Plan ($20/yr, <span className="line-through text-zinc-500">$35.99/yr</span> normal price) gets a <span className="text-white">3-Day Free Trial</span>, unlocks your exclusive Hype Card Skin & Bingo Book signature, and earns you <span className="text-[#fe9a00]">${commissionPerSale}.00 commission</span>!
              </p>
            </div>

            <div className="bg-black border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                  Your Annual Referral Code
                </span>
                <span className="text-sm font-mono font-black text-[#fe9a00]">{referralCode}</span>
              </div>
              <button
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="p-2 bg-zinc-900 hover:bg-[#fe9a00] hover:text-black text-zinc-300 rounded-lg transition-colors cursor-pointer"
                title="Copy Referral Code"
              >
                {copiedKey === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                Your Credited Series Referral Links ({seriesList.length}) — Choose Which Link or QR Code to Share:
              </span>
            </div>

            {seriesList.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {seriesList.map((s: any) => {
                  const isSelectedForQr = s.slug === activeSeriesSlug;
                  const sUrl = `https://www.mangahype.com/?series=${encodeURIComponent(s.slug)}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`;
                  const sChapters = chaptersList.filter(
                    (c: any) =>
                      String(c.series_slug || '').trim().toLowerCase() ===
                      String(s.slug || '').trim().toLowerCase()
                  );
                  const firstChap = sChapters[0];
                  const chap1Url = firstChap
                    ? `https://www.mangahype.com/?series=${encodeURIComponent(s.slug)}&chapter=${encodeURIComponent(String(firstChap.id))}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`
                    : null;

                  return (
                    <div
                      key={s.slug}
                      onClick={() => setSelectedBioSeriesSlug(s.slug)}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer ${
                        isSelectedForQr
                          ? 'bg-black border-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.15)]'
                          : 'bg-black/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {(s.cover_url || s.character_url) && (
                          <img
                            src={s.cover_url || s.character_url}
                            alt={s.title}
                            className="w-10 h-13 object-cover rounded-lg border border-zinc-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-black italic uppercase text-white">
                              {s.title}
                            </span>
                            {isSelectedForQr && (
                              <span className="text-[8px] font-black uppercase tracking-widest bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 px-2 py-0.5 rounded-full">
                                Active QR Target
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-[#fe9a00] truncate block mt-0.5">
                            {sUrl}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBioSeriesSlug(s.slug);
                            copyToClipboard(sUrl, `top_series_${s.slug}`);
                          }}
                          className="px-3.5 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedKey === `top_series_${s.slug}` ? (
                            <><Check className="w-3.5 h-3.5" /> Copied Bio Link</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy Bio Link</>
                          )}
                        </button>

                        {chap1Url && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedBioSeriesSlug(s.slug);
                              copyToClipboard(chap1Url, `top_ch1_${s.slug}`);
                            }}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-black uppercase tracking-widest text-[9px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Opens straight inside Chapter 1 with your referral code"
                          >
                            {copiedKey === `top_ch1_${s.slug}` ? (
                              <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Ch. 1</>
                            ) : (
                              <><BookOpen className="w-3.5 h-3.5 text-[#fe9a00]" /> Copy Ch. 1 Link</>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBioSeriesSlug(s.slug);
                            setShowQrModal(true);
                          }}
                          className="px-3 py-2 bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 font-black uppercase tracking-widest text-[9px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          title={`Open downloadable QR Code for ${s.title}`}
                        >
                          <QrCode className="w-3.5 h-3.5" /> QR Code
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-black border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                    Direct 3-Day Trial Link
                  </span>
                  <span className="text-xs font-mono font-bold text-[#fe9a00] truncate block">
                    {vipReferralLink}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(vipReferralLink, 'link')}
                  className="px-4 py-2.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedKey === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: My Series & Characters + Unified Live Activity Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Top-Hyped Characters Strip for This Creator */}
          {myCharacters.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#fe9a00]" />
                  <h3 className="text-sm font-black italic uppercase tracking-wider text-white">
                    My Characters & Fan Hype Rank
                  </h3>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  {myCharacters.length} Roster Characters
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {myCharacters.map((char: any) => (
                  <div
                    key={char.id}
                    onClick={() => onNavigate({ action: 'characters' })}
                    className="flex items-center gap-2.5 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-[#fe9a00]/50 rounded-xl p-2 pr-3.5 shrink-0 cursor-pointer transition-all"
                  >
                    <img
                      src={char.headshot_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'}
                      alt={char.name}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-700 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-black uppercase text-white block leading-tight">
                        {char.name}
                      </span>
                      <span className="text-[10px] font-black text-[#fe9a00] flex items-center gap-1 mt-0.5">
                        <Flame className="w-3 h-3 fill-[#fe9a00]" /> {char.live_hypes} Hypes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COLLAPSIBLE MY SERIES, DEEP LINKS & CHAPTER STATS */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div
              onClick={() => setIsSeriesSectionOpen(prev => !prev)}
              className={`flex items-center justify-between cursor-pointer select-none group ${
                isSeriesSectionOpen ? 'mb-4 pb-3 border-b border-zinc-800' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#fe9a00]" />
                <h3 className="text-base font-black italic uppercase tracking-wider text-white group-hover:text-[#fe9a00] transition-colors">
                  My Series, Deep Links & Chapter Stats
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {seriesList.length} Linked Series
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setIsSeriesSectionOpen(prev => !prev);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 group-hover:bg-[#fe9a00] text-zinc-300 group-hover:text-black border border-zinc-800 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isSeriesSectionOpen ? (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Expand</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {isSeriesSectionOpen && (
              <>
                {seriesList.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                    No series linked to "{selectedCreatorName}" yet.
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {seriesList.map((series: any) => {
                      const sChapters = chaptersList.filter(
                        (c: any) =>
                          String(c.series_slug || '').trim().toLowerCase() ===
                          String(series.slug || '').trim().toLowerCase()
                      );
                      const displaySeriesHypes = getSeriesTotalHypes(series);
                      const firstChap = sChapters[0];

                      const visibleLimit =
                        visibleChaptersBySeries[series.slug] || DEFAULT_VISIBLE_CHAPTERS;
                      const visibleChapters = sChapters.slice(0, visibleLimit);
                      const hasMoreChapters = sChapters.length > visibleLimit;

                      const directSeriesUrl = `https://www.mangahype.com/?series=${encodeURIComponent(series.slug)}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`;
                      const directChap1Url = firstChap
                        ? `https://www.mangahype.com/?series=${encodeURIComponent(series.slug)}&chapter=${encodeURIComponent(String(firstChap.id))}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`
                        : directSeriesUrl;

                      return (
                        <div key={series.id || series.slug} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              {(series.cover_url || series.character_url) && (
                                <img
                                  src={series.cover_url || series.character_url}
                                  alt={series.title}
                                  className="w-12 h-16 object-cover rounded-lg border border-zinc-700 shrink-0"
                                />
                              )}
                              <div>
                                <h4 className="text-sm font-black italic uppercase text-white">{series.title}</h4>
                                <p className="text-[10px] font-bold text-zinc-400">
                                  {sChapters.length} Published Chapter{sChapters.length === 1 ? '' : 's'} • {series.genre || 'Manga'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(directSeriesUrl, `series_url_${series.slug}`)}
                                className="px-3 py-1.5 bg-zinc-950 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Copy direct link to this series with your referral code"
                              >
                                {copiedKey === `series_url_${series.slug}` ? (
                                  <><Check className="w-3 h-3" /> Copied Series Link</>
                                ) : (
                                  <><Link2 className="w-3 h-3" /> Copy Series Link</>
                                )}
                              </button>

                              {firstChap && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(directChap1Url, `chap1_url_${series.slug}`)}
                                  className="px-3 py-1.5 bg-[#fe9a00] hover:bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="Copy 1-click link that opens straight inside Chapter 1 with your referral code"
                                >
                                  {copiedKey === `chap1_url_${series.slug}` ? (
                                    <><Check className="w-3 h-3" /> Copied Ch. 1 Link</>
                                  ) : (
                                    <><BookOpen className="w-3 h-3" /> Copy Ch. 1 Link</>
                                  )}
                                </button>
                              )}

                              <div className="bg-black border border-zinc-800 px-3 py-1.5 rounded-lg text-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Total Hypes</span>
                                <span className="text-xs font-black text-[#fe9a00] flex items-center justify-center gap-1">
                                  <Flame className="w-3 h-3" /> {displaySeriesHypes.toLocaleString()}
                                </span>
                              </div>
                              <button
                                onClick={() => onNavigate(series)}
                                className="p-2 bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-zinc-300 rounded-lg transition-colors cursor-pointer"
                                title="Open Series Page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {sChapters.length > 0 && (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {visibleChapters.map((ch: any) => {
                                  const chHypes = getChapterHypes(ch);
                                  const chReacts = (ch.react_count || 0) + (chapterStatsMap[String(ch.id)]?.reacts || 0);
                                  const chapUrl = `https://www.mangahype.com/?series=${encodeURIComponent(series.slug)}&chapter=${encodeURIComponent(String(ch.id))}&ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`;

                                  return (
                                    <div
                                      key={ch.id}
                                      className="bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between text-xs gap-2"
                                    >
                                      <span className="font-bold text-zinc-200 truncate">
                                        Ch. {ch.chapter_number}: {ch.title || `Chapter ${ch.chapter_number}`}
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-black text-[#fe9a00] flex items-center gap-1" title="Chapter Hypes">
                                          <Flame className="w-3 h-3" /> {chHypes}
                                        </span>
                                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1" title="Chapter Likes">
                                          <Heart className="w-3 h-3 fill-red-500 text-red-500" /> {chReacts}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(chapUrl, `ch_${ch.id}`)}
                                          className="p-1 bg-zinc-900 hover:bg-[#fe9a00] text-zinc-400 hover:text-black rounded transition-colors cursor-pointer"
                                          title="Copy Direct Link to this Chapter"
                                        >
                                          {copiedKey === `ch_${ch.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Link2 className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {sChapters.length > DEFAULT_VISIBLE_CHAPTERS && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-zinc-800/80">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                    Showing {visibleChapters.length} of {sChapters.length} Chapters
                                  </span>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {hasMoreChapters && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVisibleChaptersBySeries(prev => ({
                                              ...prev,
                                              [series.slug]: visibleLimit + DEFAULT_VISIBLE_CHAPTERS
                                            }))
                                          }
                                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                        >
                                          + Load 10 More
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVisibleChaptersBySeries(prev => ({
                                              ...prev,
                                              [series.slug]: sChapters.length
                                            }))
                                          }
                                          className="px-3 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]/40 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                        >
                                          View All ({sChapters.length})
                                        </button>
                                      </>
                                    )}

                                    {visibleLimit > DEFAULT_VISIBLE_CHAPTERS && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setVisibleChaptersBySeries(prev => ({
                                            ...prev,
                                            [series.slug]: DEFAULT_VISIBLE_CHAPTERS
                                          }))
                                        }
                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                      >
                                        Show First 10
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: UNIFIED LIVE SERIES ACTIVITY PULSE & FAN TIPS HUB */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col max-h-[700px]">
          <div className="flex items-center gap-1.5 bg-black p-1 rounded-xl border border-zinc-800 mb-3 shrink-0">
            <button
              type="button"
              onClick={() => setRightPanelTab('activity')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rightPanelTab === 'activity'
                  ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Series Pulse ({activityFeed.length})</span>
              {recentActivityCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                    rightPanelTab === 'activity'
                      ? 'bg-black text-[#fe9a00]'
                      : 'bg-[#fe9a00] text-black'
                  }`}
                >
                  +{recentActivityCount} NEW
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('tips')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rightPanelTab === 'tips'
                  ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Fan Tips ({tips.length})</span>
            </button>
          </div>

          {rightPanelTab === 'activity' ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-zinc-800 shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'comments', label: 'Comments' },
                  { id: 'smart_reacts', label: 'Page Reacts' },
                  { id: 'hypes_likes', label: 'Hypes & Likes' },
                  { id: 'characters', label: 'Characters' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActivityFilter(f.id as ActivityFilterType)}
                    className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-colors cursor-pointer ${
                      activityFilter === f.id
                        ? 'bg-[#fe9a00]/20 text-[#fe9a00] border-[#fe9a00]'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5">
                {filteredActivity.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                    No activity in this filter yet. Share your direct series link so fans can drop comments, page reacts, and hypes!
                  </div>
                ) : (
                  filteredActivity.map(item => {
                    const isFresh =
                      item.createdAt &&
                      Date.now() - new Date(item.createdAt).getTime() <= 48 * 60 * 60 * 1000;

                    return (
                      <div
                        key={item.id}
                        className={`bg-zinc-900 border rounded-xl p-3 space-y-1.5 transition-colors ${
                          isFresh ? 'border-[#fe9a00]/50' : 'border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#fe9a00] truncate">
                              {item.userName}
                            </span>
                            {isFresh && (
                              <span className="bg-[#fe9a00] text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-zinc-500 shrink-0">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          {item.category === 'comments' && <MessageSquare className="w-3 h-3 text-[#fe9a00] shrink-0" />}
                          {item.category === 'smart_reacts' && <Zap className="w-3 h-3 text-amber-400 shrink-0" />}
                          {item.category === 'characters' && <Users className="w-3 h-3 text-purple-400 shrink-0" />}
                          <span>{item.typeLabel}</span>
                        </div>

                        {item.text && (
                          <p className="text-xs text-zinc-200 font-medium leading-relaxed bg-black/60 p-2.5 rounded-lg border border-zinc-800/80 break-words">
                            "{item.text}"
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 truncate">
                            Series: <strong className="text-white">{item.seriesTitle}</strong>
                          </span>

                          {item.seriesObj && (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.chapterId) {
                                  onNavigate({
                                    ...item.seriesObj,
                                    autoOpenChapterId: item.chapterId,
                                    autoOpenPage: item.pageIndex || 0
                                  });
                                } else {
                                  onNavigate(item.seriesObj);
                                }
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <span>{item.chapterId ? 'Open Page' : 'Open Series'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              {tips.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                  When fans send you a tip or fan mail on your series page, their messages and support amounts will appear right here!
                </div>
              ) : (
                tips.map((t: any, idx: number) => {
                  const amount = Number(
                    t.amount_dollars ?? (t.amount_cents ? t.amount_cents / 100 : t.amount || 0)
                  );
                  const fanDisplayName = t.donor_name || t.fan_username || t.sender_name || 'Saturday AM Fan';
                  const fanMessageText = t.fan_message || t.message || '';

                  return (
                    <div key={t.id || idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          {fanDisplayName}
                        </span>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          +${amount.toFixed(2)}
                        </span>
                      </div>
                      {fanMessageText && (
                        <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-black/50 p-2.5 rounded-lg border border-zinc-800/80">
                          "{fanMessageText}"
                        </p>
                      )}
                      <span className="text-[9px] font-mono text-zinc-500 block">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Convention & Stream QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-2">
              <QrCode className="w-4 h-4" /> Official Partner QR Code
            </div>
            <h3 className="text-xl font-black italic uppercase text-white mb-1">
              {selectedCreatorName || currentUser?.username || 'Saturday AM Partner'}
            </h3>

            {seriesList.length > 1 && (
              <div className="w-full mb-3">
                <select
                  value={activeSeriesSlug}
                  onChange={e => setSelectedBioSeriesSlug(e.target.value)}
                  className="w-full bg-zinc-900 border border-[#fe9a00]/50 rounded-xl px-3 py-2 text-xs font-black uppercase text-[#fe9a00] text-center focus:outline-none cursor-pointer"
                >
                  {seriesList.map((s: any) => (
                    <option key={s.slug} value={s.slug} className="bg-zinc-950 text-white">
                      QR Target: {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-[11px] font-bold text-zinc-400 mb-5">
              Scan to open <span className="text-white">{activeSeriesObj?.title || 'Saturday AM'}</span> & unlock a <span className="text-[#fe9a00]">3-Day Free Trial</span> on the Annual Plan!
            </p>

            <div className="bg-[#fe9a00] p-3 rounded-2xl shadow-[0_0_30px_rgba(254,154,0,0.4)] mb-5">
              <img
                src={qrCodeImageUrl}
                alt={`QR Code for ${referralCode}`}
                className="w-56 h-56 rounded-xl object-contain"
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 mb-5 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                Referral Code
              </span>
              <span className="text-lg font-mono font-black text-[#fe9a00] tracking-widest">
                {referralCode}
              </span>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleDownloadQrCode}
                className="flex-1 py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>
              <button
                onClick={() => copyToClipboard(vipReferralLink, 'qr-link')}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'qr-link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'qr-link' ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};