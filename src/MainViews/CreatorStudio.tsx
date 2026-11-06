import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import {
  ArrowLeft, DollarSign, Sparkles, Flame, BookOpen, KeyRound, Copy, Check,
  ExternalLink, Heart, RefreshCw, Award, Eye, QrCode, Download, X, Link2, Gift, Plus, Trash2, MessageSquare, Zap, Users, ChevronDown, ChevronUp
} from 'lucide-react';
import { resolveCreatorStripeAccountId, normalizeCreatorKey } from './CreatorsPage';

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

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [selectedBioSeriesSlug, setSelectedBioSeriesSlug] = useState<string>('');
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [chapterStatsMap, setChapterStatsMap] = useState<Record<string, { hypes: number; reacts: number }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Collapsible Series Section & Per-Series Chapter Pagination State
  const [isSeriesSectionOpen, setIsSeriesSectionOpen] = useState<boolean>(true);
  const [visibleChaptersBySeries, setVisibleChaptersBySeries] = useState<Record<string, number>>({});

  const isAdmin = Boolean(currentUser?.is_admin);
  const userEmail = String(currentUser?.email || '').trim().toLowerCase();
  const rawRole = String(currentUser?.role || (isAdmin ? 'staff' : 'creator')).toLowerCase();

  const effectiveRole = useMemo(() => {
    if (STAFF_CREATOR_EMAILS.includes(userEmail) || rawRole === 'staff') return 'staff';
    if (rawRole === 'influencer') return 'influencer';
    return 'creator';
  }, [userEmail, rawRole]);

  const commissionPerSale = effectiveRole === 'influencer' ? 2 : 5;

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
      const { data: pinRows } = await supabase
        .from('bingo_codes')
        .select('*')
        .ilike('creator_name', `%${searchName}%`)
        .order('created_at', { ascending: false })
        .limit(25);

      const allPins = Array.isArray(pinRows) ? pinRows : [];
      const latestEventPin = allPins.find((p: any) => Number(p.max_uses || 999999) > 1);
      const singleUseList = allPins.filter((p: any) => Number(p.max_uses) === 1);

      setBingoPin(latestEventPin?.code || latestEventPin?.pin || '');
      setOneTimePins(singleUseList);

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
            .eq('is_published', true)
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
        setChaptersList(verifiedChapters);

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
              Real-time series stats, live fan activity pulse, 100% pass-through fan tips, autograph PINs & direct links
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

          {/* =================================================================
              COLLAPSIBLE MY SERIES, DEEP LINKS & CHAPTER STATS (10 CH DEFAULT)
          ================================================================= */}
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

                              {/* Pagination Footer: Load 10 More / View All / Show First 10 */}
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

        {/* =====================================================================
            RIGHT COLUMN: UNIFIED LIVE SERIES ACTIVITY PULSE & FAN TIPS HUB
        ===================================================================== */}
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