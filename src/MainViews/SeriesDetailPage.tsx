import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Bookmark, Play, ArrowUp, ArrowDown, Heart, Lock, X, MessageSquare, PenTool, Share2, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { supabase, trackTelemetry } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import {
  isCompletedRunSeries,
  isActiveOneShotWednesday,
  getOneShotWednesdaySeries,
  isChapterReleasedForUser,
  isInPlusEarlyAccessWindow,
  PLUS_EARLY_ACCESS_MS
} from '../oneshotWednesday';
import { MangaReader } from './MangaReader';
import { HypeButton } from '../Components/HypeButton';
import { LikeButton } from '../Components/LikeButton';
import { SeriesCommentsSection } from '../Components/SeriesCommentsSection';
import { PromoModal } from '../Components/PromoModal';
import { ShareModal } from '../Components/ShareModal';
import {
  RewardedAdModal,
  isRewardedAdsFeatureEnabled,
  syncRewardedAdsGlobalConfig
} from '../Components/RewardedAdModal';
import { useTelemetry } from '../Components/useTelemetry';
import { FeatureTutorialModal, TutorialHelpButton } from '../Components/FeatureTutorialModal';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const fullIconUrl = "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png";
const iconMaskStyle = {
  WebkitMaskImage: `url('${fullIconUrl}')`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskImage: `url('${fullIconUrl}')`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center'
};

const isNewRelease = (publishAt?: string | null, createdAt?: string | null) => {
  const effectiveDate = publishAt || createdAt;
  if (!effectiveDate) return false;
  const releaseTime = new Date(effectiveDate).getTime();
  const now = Date.now();
  return releaseTime <= now && (now - releaseTime) < 7 * 24 * 60 * 60 * 1000;
};

const formatLiveCountdown = (targetMs: number, nowMs: number) => {
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'DROPPING NOW!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  if (days > 0) return `${days}D ${hours}H ${mins}M`;
  if (hours > 0) return `${hours}H ${mins}M`;
  return `${Math.max(1, mins)}M`;
};

const seriesTutorialSlide = [
  {
    id: 'series-icons',
    title: 'Series Actions',
    description: 'Take command of your reading experience. Use these interactive features to support creators, engage with the community, and curate your personalized library.',
    iconsList: [
      {
        icon: <div className="w-6 h-6 bg-[#fe9a00]" style={iconMaskStyle} />,
        title: 'Drop a Hype',
        desc: 'Boost the series\' ranking on the leaderboards.'
      },
      {
        icon: <Heart className="w-6 h-6" />,
        title: 'Like',
        desc: 'Show some love and support for the chapter.'
      },
      {
        icon: <MessageSquare className="w-6 h-6" />,
        title: 'Discuss',
        desc: 'Jump instantly to the community comment section.'
      },
      {
        icon: <PenTool className="w-6 h-6" />,
        title: 'Creators',
        desc: 'Scroll directly to the creator\'s profile and links.'
      }
    ]
  }
];

const ContentRatingBadge = ({ rating }: { rating: string }) => {
  const config: Record<string, { label: string, color: string, desc: string }> = {
    'E': { label: 'E', color: 'bg-green-600 text-white', desc: 'All Ages' },
    'Y': { label: 'Y', color: 'bg-blue-500 text-white', desc: 'Youth 10+' },
    'T': { label: 'T', color: 'bg-[#fe9a00] text-black', desc: 'Teen 13+' },
    'OT': { label: 'OT', color: 'bg-red-600 text-white', desc: 'Older Teen 16+' },
    'M': { label: 'M', color: 'bg-black border border-red-600 text-red-600', desc: 'Mature 18+' }
  };

  const current = config[rating] || config['T'];

  return (
    <div className="flex items-center gap-2 mt-6 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50 backdrop-blur-sm w-max mx-auto shadow-lg">
      <div className={`w-5 h-5 flex items-center justify-center rounded-[3px] font-black text-[10px] ${current.color} shadow-sm`}>
        {current.label}
      </div>
      <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{current.desc}</span>
    </div>
  );
};

export const SeriesDetailPage = ({ series, onBack, userTier = 'visitor', onLoginClick, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [localSeries, setLocalSeries] = useState(series);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [nextScheduledChapter, setNextScheduledChapter] = useState<any | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [activePages, setActivePages] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [showAwards, setShowAwards] = useState(false);
  const awardTimeoutRef = useRef<any>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [readProgresses, setReadProgresses] = useState<any>({});

  const [chapterStats, setChapterStats] = useState<any>({});
  const [seriesDirectHypes, setSeriesDirectHypes] = useState<number>(0);
  const [seriesDirectLikes, setSeriesDirectLikes] = useState<number>(0);
  const [chapterLikesTotal, setChapterLikesTotal] = useState<number>(0);
  const [readerClosedCount, setReaderClosedCount] = useState(0);

  const [upsellConfig, setUpsellConfig] = useState<{ type: 'visitor' | 'premium', message: string } | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [seriesCharacters, setSeriesCharacters] = useState<any[]>([]);
  const [showAllChars, setShowAllChars] = useState(false);

  const [collectedSignatures, setCollectedSignatures] = useState<Record<string, string>>({});

  const { trackEvent } = useTelemetry(currentUserId || undefined);

  const [showPromo, setShowPromo] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [donationCreator, setDonationCreator] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [fanmailText, setFanmailText] = useState('');
  const [donationStep, setDonationStep] = useState<'input' | 'processing' | 'success'>('input');

  const [startPage, setStartPage] = useState(0);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [isAutoLoading, setIsAutoLoading] = useState(!!series?.autoOpenChapterId);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleCount, setVisibleCount] = useState(10);

  const [showAdModal, setShowAdModal] = useState(false);
  const [rewardedAdsEnabled, setRewardedAdsEnabled] = useState<boolean>(() =>
    isRewardedAdsFeatureEnabled()
  );
  const [targetChapter, setTargetChapter] = useState<any>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<string[]>([]);

  const [forceTutorial, setForceTutorial] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const creatorRef = useRef<HTMLDivElement>(null);

  const isCompletedRun = isCompletedRunSeries(localSeries, seriesList) || isCompletedRunSeries(series, seriesList);
  const isUnlockedForOneShotWednesday = isActiveOneShotWednesday(localSeries || series, seriesList);
  const currentWednesdayPick = getOneShotWednesdaySeries(seriesList);

  useEffect(() => {
    syncRewardedAdsGlobalConfig().then((res: { enabled: boolean }) => {
      setRewardedAdsEnabled(res.enabled);
    });
    const handleConfigChange = (e: any) => {
      if (typeof e?.detail?.enabled === 'boolean') {
        setRewardedAdsEnabled(e.detail.enabled);
      } else {
        setRewardedAdsEnabled(isRewardedAdsFeatureEnabled());
      }
    };
    window.addEventListener('rewardedAdsConfigChanged', handleConfigChange);
    return () => window.removeEventListener('rewardedAdsConfigChanged', handleConfigChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('donation_status') === 'success') {
      const returnedCreator = params.get('creator') || 'the Creator';
      const returnedAmount = Number(params.get('amount') || 5);
      const returnedSessionId = params.get('session_id') || '';

      setDonationCreator({ name: returnedCreator, avatar_url: '' });
      setDonationAmount(returnedAmount);
      setDonationStep('success');

      if (returnedSessionId) {
        supabase.functions.invoke('create-checkout-session', {
          body: {
            type: 'confirm_donation',
            sessionId: returnedSessionId,
            creatorName: returnedCreator,
            amountDollars: returnedAmount
          }
        });
      }

      // Also credit creator_supports & fandom_score on the user's profile
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('creator_supports, fandom_score')
            .eq('id', user.id)
            .maybeSingle();
          if (prof) {
            await supabase
              .from('profiles')
              .update({
                creator_supports: (prof.creator_supports || 0) + 1,
                fandom_score: (prof.fandom_score || 0) + Math.max(10, returnedAmount * 2)
              })
              .eq('id', user.id);
          }
          window.dispatchEvent(new Event('profileUpdated'));
        }
      });

      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('donation_status') === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToSection = (e: React.MouseEvent | any, ref: React.RefObject<HTMLDivElement | null>, center: boolean = false) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (ref.current) {
      if (center) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const yOffset = -50;
        const y = ref.current.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (localSeries?.slug) {
      trackEvent('series_page_visit', { series_slug: localSeries.slug });
      trackTelemetry('series_visit', { series_slug: localSeries.slug });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [localSeries?.slug, trackEvent]);

  useEffect(() => {
    if (userTier === 'premium') {
      const syncSignatures = async () => {
        const localSigs = JSON.parse(localStorage.getItem('am_bingo_sigs') || '{}');
        const hunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
        const creatorsToFetch = hunts.length > 0 ? hunts : Object.keys(localSigs);

        if (creatorsToFetch.length > 0) {
          const { data } = await supabase
            .from('creator_signatures')
            .select('creator_name, signature_url')
            .in('creator_name', creatorsToFetch);

          if (data && data.length > 0) {
            const freshSigs: Record<string, string> = {};
            data.forEach((row: any) => { freshSigs[row.creator_name] = row.signature_url; });
            setCollectedSignatures(freshSigs);
            localStorage.setItem('am_bingo_sigs', JSON.stringify(freshSigs));
          } else {
            setCollectedSignatures(localSigs);
          }
        } else {
          setCollectedSignatures({});
        }
      };
      syncSignatures();
    } else {
      setCollectedSignatures({});
    }
  }, [userTier]);

  useEffect(() => {
    const checkFavoriteAndLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && localSeries) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (data?.favorites && data.favorites.includes(localSeries.slug)) {
          setIsFavorited(true);
        }
        if (data?.is_premium) {
          setIsPremiumUser(true);
        }
      }
    };
    checkFavoriteAndLikeStatus();
  }, [localSeries]);

  useEffect(() => {
    const fetchUnlocks = async () => {
      if (userTier === 'premium' || userTier === 'visitor') return;
      try {
        const { data, error } = await supabase.from('temporary_unlocks').select('chapter_id');
        if (error) throw error;
        if (data) setUnlockedChapters(data.map(d => String(d.chapter_id)));
      } catch (err) { console.error("Error fetching temporary unlocks:", err); }
    };
    fetchUnlocks();
  }, [userTier, currentUserId]);

  const fetchDetails = useCallback(async () => {
    try {
      const targetSlug = typeof series === 'string' ? series : (localSeries?.slug || series?.slug);
      if (!targetSlug) return;

      const [
        { data: freshSeries },
        { data: chapterData },
        { data: creatorData },
        { data: charData },
        seriesHypesRes,
        seriesLikesRes
      ] = await Promise.all([
        supabase.from('series').select('*').eq('slug', targetSlug).single(),
        supabase.from('chapters').select('*').eq('series_slug', targetSlug).eq('is_published', true).order('chapter_number', { ascending: true }),
        supabase.from('series_creators').select('*').eq('series_slug', targetSlug).order('id', { ascending: true }),
        supabase.from('series_characters').select('*').eq('series_slug', targetSlug).order('id', { ascending: true }),
        supabase.from('hypes').select('*', { count: 'exact', head: true }).eq('target_type', 'series').eq('target_id', targetSlug),
        supabase.from('series_likes').select('*', { count: 'exact', head: true }).eq('series_slug', targetSlug)
      ]);

      setSeriesDirectHypes(Number(seriesHypesRes.count || 0));
      setSeriesDirectLikes(Number(seriesLikesRes.count || 0));

      if (freshSeries) {
        setLocalSeries((prev: any) => ({
          ...prev,
          ...freshSeries,
          home_section: freshSeries.home_section || prev?.home_section || series?.home_section
        }));
      }

      if (chapterData) {
        const isPlus = userTier === 'premium' || isPremiumUser;
        const liveChapters = chapterData.filter((ch: any) =>
          isChapterReleasedForUser(ch.publish_at, isPlus)
        );
        setChapters(liveChapters as any);

        const upcomingChapters = chapterData
          .filter((ch: any) => !isChapterReleasedForUser(ch.publish_at, isPlus) && ch.publish_at)
          .sort((a: any, b: any) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());

        setNextScheduledChapter(upcomingChapters.length > 0 ? upcomingChapters[0] : null);
      }

      if (creatorData && creatorData.length > 0) {
        setCreators(creatorData as any);
      } else if (freshSeries) {
        setCreators([{
          role: 'Creator',
          name: freshSeries.creator_name || 'Saturday AM',
          flag_code: freshSeries.flag_code || '',
          avatar_url: freshSeries.creator_avatar || '',
          bio: freshSeries.creator_bio || '',
          twitter_url: freshSeries.creator_twitter || '',
          instagram_url: freshSeries.creator_instagram || '',
          support_url: freshSeries.creator_support_link || '',
          stripe_account_id: freshSeries.creator_stripe_account_id || ''
        }] as any);
      }

      if (charData) setSeriesCharacters(charData as any);
    } catch (err) { console.error("Failed to load series details:", err); }
  }, [series, localSeries?.slug, userTier, isPremiumUser]);

  useEffect(() => {
    fetchDetails();
    window.addEventListener('seriesUpdated', fetchDetails);
    return () => window.removeEventListener('seriesUpdated', fetchDetails);
  }, [fetchDetails]);

  useEffect(() => {
    if (!currentUserId || chapters.length === 0) return;
    const fetchReadingProgress = async () => {
      const chapterIds = chapters.map(c => String(c.id));
      const { data: historyData } = await supabase
        .from('reading_history')
        .select('chapter_id, page_index')
        .eq('user_id', currentUserId)
        .in('chapter_id', chapterIds);

      if (!historyData || historyData.length === 0) return;

      const progressMap: any = {};
      historyData.forEach((h: any) => {
        const cId = String(h.chapter_id);
        const matchedChap = chapters.find(c => String(c.id) === cId);
        const totalPages = Number(matchedChap?.page_count) > 0 ? Number(matchedChap.page_count) : 25;
        const maxPage = Math.max(1, totalPages - 1);
        const percentage = Math.min(100, Math.round((h.page_index / maxPage) * 100));
        progressMap[cId] = percentage;
      });
      setReadProgresses(progressMap);
    };
    fetchReadingProgress();
  }, [currentUserId, chapters, readerClosedCount]);

  useEffect(() => {
    if (chapters.length === 0 || !localSeries?.slug) return;
    const fetchChapterStats = async () => {
      try {
        const chapterIds = chapters.map(c => String(c.id));
        const [{ data: statsData, error }, chapLikesRes] = await Promise.all([
          supabase.rpc('get_series_chapter_stats', { p_series_slug: localSeries.slug }),
          supabase.from('chapter_likes').select('*', { count: 'exact', head: true }).in('chapter_id', chapterIds)
        ]);

        setChapterLikesTotal(Number(chapLikesRes.count || 0));

        if (statsData && !error) {
          const newStats: any = {};
          statsData.forEach((stat: any) => {
            newStats[stat.chapter_id] = { hypes: Number(stat.total_hypes), reacts: Number(stat.total_reacts) };
          });
          setChapterStats(newStats);
        }
      } catch (err) { console.error("Failed to fetch chapter stats:", err); }
    };
    fetchChapterStats();
  }, [chapters, readerClosedCount, localSeries?.slug]);

  const checkIsLocked = (chapterId: string) => {
    if (userTier === 'premium' || isPremiumUser) return false;

    if (isCompletedRun) {
      if (isUnlockedForOneShotWednesday && userTier === 'free') {
        return false;
      }
      return true;
    }

    const absoluteIndex = chapters.findIndex(c => c.id === chapterId);
    if (userTier === 'free') return !(absoluteIndex < 3 || absoluteIndex === chapters.length - 1);
    return absoluteIndex !== 0;
  };

  const openChapterInReader = async (chapter: any, initialPage = 0) => {
    const { data } = await supabase
      .from('pages')
      .select('id, image_url')
      .eq('chapter_id', chapter.id)
      .order('page_order', { ascending: true });

    if (data && data.length > 0) {
      window.dispatchEvent(new CustomEvent('readerToggled', { detail: { isOpen: true } }));
      setActivePages(data as any);
      setActiveChapterId(chapter.id);
      setStartPage(initialPage);
      setIsReaderOpen(true);
      setIsAutoLoading(false);

      if (userTier !== 'premium') {
        let reads = parseInt(sessionStorage.getItem('am_read_counter') || '0');
        reads += 1;
        if (reads % 5 === 0) setShowShareModal(true);
        sessionStorage.setItem('am_read_counter', reads.toString());
      }
    } else {
      setIsAutoLoading(false);
      alert("No pages found for this chapter yet!");
    }
  };

  const handleReadChapter = async (chapter: any, _absoluteIndex: number, initialPage = 0) => {
    const isInitiallyLocked = checkIsLocked(chapter.id);
    const hasTempUnlock = rewardedAdsEnabled && unlockedChapters.includes(String(chapter.id));

    if (isInitiallyLocked && !hasTempUnlock) {
      setIsAutoLoading(false);
      if (userTier === 'visitor') {
        setUpsellConfig({
          type: 'visitor',
          message: isCompletedRun
            ? (isUnlockedForOneShotWednesday
                ? "⚡ It's One-Shot Wednesday! Create a Free Account right now to read this entire Completed Run FREE for 24 hours!"
                : "Completed Runs are exclusive to Saturday AM+ PLUS members (with 1 title unlocked every One-Shot Wednesday). Create a Free Account to get started!")
            : rewardedAdsEnabled
            ? "Create a Free Account to unlock Chapters 1-3, read the newest release, and unlock chapters with 15s spotlights!"
            : "Create a Free Account to unlock Chapters 1-3 and read the newest chapter release!"
        });
        return;
      }

      if (isCompletedRun) {
        setUpsellConfig({
          type: 'premium',
          message: `This Completed Run is locked in the Saturday AM+ PLUS Vault! Upgrade to PLUS ($1.99/mo) to read it right now, or check back on One-Shot Wednesdays (Next Spotlight: ${currentWednesdayPick?.title || 'TBA'}).`
        });
        return;
      }

      if (!rewardedAdsEnabled) {
        setUpsellConfig({
          type: 'premium',
          message: "Upgrade to Saturday AM+ PLUS ($1.99/mo) to unlock the entire chapter vault and read without limits!"
        });
        return;
      }

      setTargetChapter(chapter);
      setShowAdModal(true);
      return;
    }

    await openChapterInReader(chapter, initialPage);
  };

  const handleRewardEarnedUnlock = async () => {
    if (!targetChapter) return;
    const chapIdStr = String(targetChapter.id);

    try {
      if (currentUserId) {
        await supabase.from('temporary_unlocks').insert([
          {
            user_id: currentUserId,
            chapter_id: targetChapter.id
          }
        ]);
      }
    } catch (err) {
      console.warn('Temporary unlock record note:', err);
    }

    setUnlockedChapters(prev => (prev.includes(chapIdStr) ? prev : [...prev, chapIdStr]));
    setShowAdModal(false);
    await openChapterInReader(targetChapter, 0);
  };

  useEffect(() => {
    if (chapters.length > 0 && series?.autoOpenChapterId && !hasAutoOpened) {
      const absoluteIndex = chapters.findIndex(c => String(c.id) === String(series.autoOpenChapterId));
      if (absoluteIndex !== -1) {
        const chapter = chapters[absoluteIndex];
        if (chapter && chapter.id) { setTimeout(() => { handleReadChapter(chapter, absoluteIndex, series.autoOpenPage || 0); }, 100); }
        else { setIsAutoLoading(false); }
      } else { setIsAutoLoading(false); }
      setHasAutoOpened(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, series, hasAutoOpened]);

  const sortedChapters = [...chapters].sort((a, b) => {
    if (sortOrder === 'asc') return a.chapter_number - b.chapter_number;
    return b.chapter_number - a.chapter_number;
  });

  const displayedChapters = sortedChapters.slice(0, visibleCount);

  const aggregatedSubHypes = chapters.reduce((sum: number, ch: any) => {
    const pageHypes = chapterStats[String(ch.id)]?.hypes || 0;
    return sum + (ch.hype_count || 0) + pageHypes;
  }, 0);

  const aggregatedSeriesReacts = chapters.reduce((sum: number, ch: any) => {
    const pageReacts = chapterStats[String(ch.id)]?.reacts || 0;
    return sum + (ch.react_count || 0) + pageReacts;
  }, 0);

  const verifiedSeriesInitialHypes = Math.max(
    seriesDirectHypes,
    Number(localSeries?.hype_count || 0)
  );

  const triggerAwards = () => {
    setShowAwards(true);
    if (awardTimeoutRef.current) clearTimeout(awardTimeoutRef.current);
    awardTimeoutRef.current = setTimeout(() => { setShowAwards(false); }, 3000);
  };

  const handleToggleFavorite = async () => {
    if (!currentUserId || userTier === 'visitor') {
      setUpsellConfig({ type: 'visitor', message: "Create a Free Account to save series to your favorites and get notified of new chapters!" });
      return;
    }

    const previousState = isFavorited;
    setIsFavorited(!previousState);

    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
      let currentFaves = data?.favorites || [];
      if (!Array.isArray(currentFaves)) currentFaves = [];

      if (!previousState) { if (!currentFaves.includes(localSeries.slug)) currentFaves.push(localSeries.slug); }
      else { currentFaves = currentFaves.filter((slug: string) => slug !== localSeries.slug); }

      const { error } = await supabase.from('profiles').update({ favorites: currentFaves }).eq('id', currentUserId);
      if (error) throw error;
    } catch (err) { setIsFavorited(previousState); }
  };

  const handleProcessDonation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUserId || user?.id;

    if (!activeUserId) {
      setUpsellConfig({ type: 'visitor', message: "Create a Free Account to support creators and send fanmail!" });
      setDonationCreator(null);
      return;
    }

    if (!donationCreator) return;

    setDonationStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'donation',
          userId: activeUserId,
          userEmail: user?.email,
          returnUrl: window.location.origin,
          creatorName: donationCreator.name || 'Creator',
          stripeAccountId: donationCreator.stripe_account_id || localSeries?.creator_stripe_account_id || '',
          amountDollars: donationAmount,
          fanmail: fanmailText.trim(),
          seriesSlug: localSeries?.slug || ''
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from Stripe.");
      }
    } catch (err: any) {
      alert("Unable to start Stripe Tip Checkout: " + err.message);
      setDonationStep('input');
    }
  };

  if (!localSeries) return null;

  const safeSynopsis = localSeries.synopsis || '';

  const activeBannerPos = isMobile
    ? (localSeries.banner_position_mobile || localSeries.banner_position_desktop || '50% 50%')
    : (localSeries.banner_position_desktop || '50% 50%');

  const activeBannerScale = isMobile
    ? (localSeries.banner_scale_mobile || localSeries.banner_scale_desktop || 100)
    : (localSeries.banner_scale_desktop || 100);

  const logoScale = localSeries.logo_scale ?? 100;
  const logoOffset = localSeries.logo_offset ?? 16;

  const isPlusActive = userTier === 'premium' || isPremiumUser;
  const scheduledTargetMs = nextScheduledChapter?.publish_at
    ? new Date(nextScheduledChapter.publish_at).getTime() - (isPlusActive ? PLUS_EARLY_ACCESS_MS : 0)
    : null;

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-transparent text-white">

      <FeatureTutorialModal
        tutorialId="series_page_icons"
        slides={seriesTutorialSlide}
        forceOpen={forceTutorial}
        onClose={() => setForceTutorial(false)}
      />

      {isAutoLoading && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin mb-4"></div>
          <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Chapter...</span>
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} series={localSeries} chapter={chapters.find(c => c.id === activeChapterId) || targetChapter} currentUser={{ id: currentUserId }} />

      {/* 15-SECOND REWARDED VIDEO / ANIMATED HOUSE AD MODAL */}
      {rewardedAdsEnabled && (
        <RewardedAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          onRewardEarned={handleRewardEarnedUnlock}
          onUpgradeClick={() => {
            setShowAdModal(false);
            if (onNavigate) onNavigate({ action: 'sub' });
          }}
          chapterNumber={targetChapter?.chapter_number}
          seriesTitle={localSeries?.title}
        />
      )}

      {showPromo && (
        <PromoModal
          userTier={userTier}
          onClose={() => setShowPromo(false)}
          onAction={() => {
            setShowPromo(false);
            if (userTier === 'visitor') { if (onLoginClick) onLoginClick(); }
            else { if (onNavigate) onNavigate({ action: 'sub' }); }
          }}
        />
      )}

      {upsellConfig && userTier !== 'premium' && !isPremiumUser && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative">
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]"><Lock className="w-8 h-8 text-[#fe9a00]" /></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{upsellConfig.type === 'visitor' ? 'Account Required' : 'PLUS Vault Exclusive'}</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            {upsellConfig.type === 'visitor' ? (
              <button
                onClick={() => {
                  setUpsellConfig(null);
                  if (onLoginClick) onLoginClick();
                }}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors cursor-pointer shadow-[0_0_20px_rgba(254,154,0,0.3)]"
              >
                Create Free Account
              </button>
            ) : (
              <button
                onClick={() => {
                  setUpsellConfig(null);
                  if (onNavigate) onNavigate({ action: 'sub' });
                }}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors cursor-pointer shadow-[0_0_20px_rgba(254,154,0,0.3)]"
              >
                Upgrade to PLUS ($1.99)
              </button>
            )}
          </div>
        </div>
      )}

      {donationCreator && (
        <div className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => { if (donationStep === 'input') setDonationCreator(null); }}>
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>

            {donationStep === 'input' && (
              <>
                <button onClick={() => setDonationCreator(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20 cursor-pointer"><X className="w-6 h-6" /></button>
                <div className="p-6 sm:p-8 animate-fade-in">
                  <div className="flex flex-col items-center mb-6 text-center mt-2">
                    <img
                      src={donationCreator.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#fe9a00] mb-3 shadow-[0_0_15px_rgba(254,154,0,0.3)]"
                      alt={donationCreator.name}
                      onError={(e) => { e.currentTarget.src = `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`; }}
                    />
                    <h3 className="text-xl font-black italic uppercase text-white leading-tight">Support {donationCreator.name}</h3>
                    <p className="text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mt-1">100% of your tip goes directly to the creator!</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {[5, 10, 15, 20].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setDonationAmount(amount)}
                        className={`py-3 rounded-xl font-black text-sm sm:text-base border-2 transition-all cursor-pointer ${donationAmount === amount ? 'bg-[#fe9a00]/10 border-[#fe9a00] text-[#fe9a00]' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <div className="relative mb-6">
                    <textarea
                      value={fanmailText}
                      onChange={(e) => setFanmailText(e.target.value)}
                      placeholder="Write a private message to the creator..."
                      maxLength={250}
                      className="w-full bg-black border border-zinc-800 text-white text-xs px-4 py-3 pb-8 rounded-xl focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-24 font-medium"
                    />
                    <span className="absolute bottom-3 right-3 text-[9px] font-black uppercase tracking-widest text-zinc-600">{fanmailText.length}/250</span>
                  </div>

                  <button
                    onClick={handleProcessDonation}
                    className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
                  >
                    Donate ${donationAmount} via Stripe
                  </button>
                  <p className="text-center text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
                    Secure Stripe Checkout • Supporting creators boosts your Fandom Score!
                  </p>
                </div>
              </>
            )}

            {donationStep === 'processing' && (
              <div className="py-16 flex flex-col items-center justify-center animate-fade-in text-center">
                <Loader2 className="w-12 h-12 text-[#fe9a00] animate-spin mb-4" />
                <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Connecting to Stripe</h3>
                <p className="text-xs text-zinc-400 font-bold">Preparing secure creator tip checkout...</p>
              </div>
            )}

            {donationStep === 'success' && (
              <div className="py-12 px-6 flex flex-col items-center justify-center animate-fade-in text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-6 shadow-[0_0_30px_rgba(16,185,247,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Thank You!</h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-bold mb-8 leading-relaxed max-w-xs">
                  Your ${donationAmount} tip and fanmail have been sent directly to {donationCreator.name}. <span className="text-[#fe9a00]">Your Fandom Score has been boosted!</span>
                </p>
                <button
                  onClick={() => { setDonationCreator(null); setDonationStep('input'); }}
                  className="w-full py-4 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Return to Series
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isReaderOpen && (() => {
        const activeChapterData = chapters.find(c => c.id === activeChapterId);
        const currentIndex = chapters.findIndex(c => c.id === activeChapterId);
        const hasNext = currentIndex > -1 && currentIndex < chapters.length - 1;
        const hasPrev = currentIndex > 0;

        return (
          <MangaReader
            pages={activePages}
            chapterId={activeChapterId}
            userId={currentUserId}
            isPremium={isPremiumUser}
            title={activeChapterData ? `Chapter ${activeChapterData.chapter_number} - ${activeChapterData.title || ''}` : ''}
            subtitle={localSeries.title}
            initialPage={startPage}
            onClose={() => { window.dispatchEvent(new CustomEvent('readerToggled', { detail: { isOpen: false } })); setIsReaderOpen(false); setActiveChapterId(null); setStartPage(0); setReaderClosedCount(c => c + 1); }}
            onHome={() => { window.dispatchEvent(new CustomEvent('readerToggled', { detail: { isOpen: false } })); setIsReaderOpen(false); setActiveChapterId(null); setStartPage(0); setReaderClosedCount(c => c + 1); onBack(); }}
            onNext={() => { if (hasNext) handleReadChapter(chapters[currentIndex + 1], currentIndex + 1); }}
            onPrev={() => { if (hasPrev) handleReadChapter(chapters[currentIndex - 1], currentIndex - 1); }}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onNavigate={onNavigate}
            onHypeUpdate={null}
            onSupportCreator={(e: any) => {
              window.dispatchEvent(new CustomEvent('readerToggled', { detail: { isOpen: false } }));
              setIsReaderOpen(false);
              setActiveChapterId(null);
              setStartPage(0);
              setReaderClosedCount(c => c + 1);
              setTimeout(() => {
                scrollToSection(e || { stopPropagation: () => {} }, creatorRef);
              }, 100);
            }}
          />
        );
      })()}

      {/* DYNAMIC HERO BANNER WITH CROPPED OBJECT POSITION & SCALE */}
      <div className="sticky top-0 left-0 w-full h-[50vh] sm:h-[60vh] z-0 overflow-hidden bg-black">
        <img
          src={localSeries.cover_url}
          className="w-full h-full object-cover opacity-60 transition-all duration-300 pointer-events-none"
          alt="Hero Banner"
          style={{
            objectPosition: activeBannerPos,
            transform: `scale(${activeBannerScale / 100})`,
            transformOrigin: activeBannerPos
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-2">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                onBack();
              }
            }}
            className="p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:text-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <TutorialHelpButton onClick={() => setForceTutorial(true)} />
        </div>

        <button onClick={() => setShowShareModal(true)} className="absolute top-4 sm:top-6 right-[4.5rem] sm:right-24 z-20 p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-all shadow-lg group cursor-pointer">
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full overflow-x-hidden -mt-12 pt-12 [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">
        <div className="px-6 pt-8 flex flex-col items-center w-full max-w-4xl mx-auto">

          {/* DYNAMIC LOGO SCALING & OFFSET */}
          <div
            className="flex items-center justify-center gap-4 transition-all duration-300 w-full"
            style={{
              marginBottom: `${Math.max(16, logoOffset)}px`
            }}
          >
            {localSeries.logo_url && (
              <div
                className="flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `scale(${logoScale / 100})`,
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={localSeries.logo_url}
                  alt="Logo"
                  className="w-full max-w-[280px] sm:max-w-[350px] h-auto object-contain drop-shadow-2xl"
                />
              </div>
            )}
            {localSeries.has_awards && localSeries.awards && (
              <div className="relative flex items-center cursor-pointer" onMouseEnter={() => setShowAwards(true)} onMouseLeave={() => setShowAwards(false)} onClick={triggerAwards}>
                <img src={`${CLOUDFLARE_BASE_URL}/series-page-graphics/award-icon.png`} alt="Award" className={`w-10 h-10 object-contain transition-all duration-200 drop-shadow-lg ${showAwards ? 'opacity-80 scale-110' : 'opacity-100'}`} />
                <div className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 w-max min-w-[120px] bg-zinc-800 border border-zinc-700 p-3 rounded shadow-2xl transition-all duration-300 pointer-events-none z-50 ${showAwards ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
                  {String(localSeries.awards || '').split(',').map((award, i) => (<p key={i} className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest whitespace-nowrap mb-1 last:mb-0">{award.trim()}</p>))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 mt-2">
            {creators.map((c: any, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">{c.role || 'Creator'}:</span><p className="text-[#fe9a00] font-bold text-sm">{c.name || 'Unknown'}</p>
                {c.flag_code && <img src={`https://flagcdn.com/${String(c.flag_code).toLowerCase()}.svg`} alt="Flag" className="w-5 h-3.5 rounded-[2px] shadow-sm opacity-90" />}
              </div>
            ))}
          </div>

          {userTier === 'premium' && Object.keys(collectedSignatures).length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mt-8 w-full max-w-2xl">
              <style>{`
                @keyframes gold-foil-shine {
                  0% { background-position: 0% 50%; filter: drop-shadow(0 0 15px rgba(254,154,0,0.6)); transform: scale(1); }
                  50% { background-position: 100% 50%; filter: drop-shadow(0 0 30px rgba(254,154,0,1)) drop-shadow(0 0 50px rgba(254,154,0,0.4)); transform: scale(1.05); }
                  100% { background-position: 0% 50%; filter: drop-shadow(0 0 15px rgba(254,154,0,0.6)); transform: scale(1); }
                }
                .animate-gold-foil {
                  background-size: 200% 200%;
                  animation: gold-foil-shine 3s ease-in-out infinite;
                }
              `}</style>
              {Object.entries(collectedSignatures)
                .filter(([sigName]) => {
                  return creators.some((c: any) => {
                    const cName = (c.name || '').toLowerCase();
                    const sName = sigName.toLowerCase();
                    return cName.includes(sName) || sName.includes(cName);
                  });
                })
                .map(([sigName, sigUrl], i) => (
                  <div key={`sig-${i}`} className="flex flex-col items-center w-full max-w-[260px] sm:max-w-[340px] animate-fade-in-up">
                    <div className="w-full aspect-[2/1] flex items-center justify-center p-2 relative group cursor-pointer">
                      <div
                        className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-600 animate-gold-foil"
                        style={{
                          WebkitMaskImage: `url(${sigUrl})`,
                          WebkitMaskSize: 'contain',
                          WebkitMaskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskImage: `url(${sigUrl})`,
                          maskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          maskPosition: 'center'
                        }}
                        title={`${sigName} Signature`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}

          <ContentRatingBadge rating={localSeries.content_rating || 'T'} />

          {isCompletedRun && userTier !== 'premium' && !isPremiumUser && (
            <div className={`mt-4 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${
              isUnlockedForOneShotWednesday
                ? 'bg-[#fe9a00]/20 border-[#fe9a00] text-[#fe9a00] animate-pulse'
                : 'bg-purple-950/40 border-purple-500/50 text-purple-300'
            }`}>
              <Lock className="w-3.5 h-3.5" />
              {isUnlockedForOneShotWednesday
                ? '⚡ ONE-SHOT WEDNESDAY: READ FREE BEFORE MIDNIGHT!'
                : 'COMPLETED RUN • SATURDAY AM+ PLUS EXCLUSIVE VAULT'}
            </div>
          )}

          <div className="mt-6 px-2 text-center max-w-2xl">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{safeSynopsis}</p>
            {safeSynopsis.length > 150 && (<button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-black tracking-widest text-[10px] mt-2 uppercase hover:text-white transition-colors cursor-pointer">{isExpanded ? '- READ LESS' : '+ READ MORE'}</button>)}
          </div>

          <div ref={actionsRef} className="flex flex-col items-center gap-4 mt-8 w-full max-w-sm mx-auto scroll-mt-32">

            <div className="w-full flex flex-col gap-3 [&>button]:w-full [&>button]:justify-center">
              <HypeButton
                variant="series-main"
                targetType="series"
                targetId={localSeries.slug}
                seriesSlug={localSeries.slug}
                userId={currentUserId}
                isPremium={isPremiumUser}
                onRequirePremium={() => setUpsellConfig({ type: 'premium', message: "Hypes are a PLUS feature! Upgrade to support creators with ultra-visible hype." })}
                onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create an account and upgrade to PLUS to drop Hypes!" })}
              />
              <button
                onClick={(e) => scrollToSection(e, creatorRef)}
                className="flex items-center justify-center gap-3 w-full px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all bg-zinc-900 text-white border border-zinc-700 hover:bg-[#fe9a00] hover:border-[#fe9a00] hover:text-black shadow-lg cursor-pointer"
              >
                <PenTool className="w-5 h-5" />
                <span>HYPE CREATOR(S)</span>
              </button>
            </div>

            <div className="flex items-start justify-center gap-4 sm:gap-8 w-full mt-4 px-2 sm:px-6 flex-nowrap shrink-0">
              <div className="flex flex-col items-center gap-2">
                <HypeButton
                  targetType="series"
                  targetId={localSeries.slug}
                  userId={currentUserId}
                  initialCount={verifiedSeriesInitialHypes}
                  bonusCount={aggregatedSubHypes}
                  variant="icon"
                  onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to hype this series!" })}
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Hypes</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <LikeButton
                  targetType="series"
                  targetId={localSeries.slug}
                  userId={currentUserId}
                  initialCount={seriesDirectLikes}
                  bonusCount={chapterLikesTotal + aggregatedSeriesReacts}
                  variant="icon"
                  onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to like this series!" })}
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Likes</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 border shadow-xl flex items-center justify-center cursor-pointer ${isFavorited ? 'bg-[#fe9a00]/20 border-[#fe9a00]/30 text-[#fe9a00]' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5 text-white/70 hover:text-white'}`}
                  title={isFavorited ? "Saved to Faves" : "Add to Faves"}
                >
                  <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 ${isFavorited ? 'fill-[#fe9a00]' : ''}`} />
                </button>
                <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isFavorited ? 'text-[#fe9a00]' : 'text-zinc-500'}`}>Save</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={(e) => scrollToSection(e, commentsRef)}
                  className="relative p-2.5 sm:p-3 rounded-full transition-all duration-300 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/5 shadow-xl flex items-center justify-center cursor-pointer text-white/70 hover:text-white"
                  title="Discuss"
                >
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Discuss</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 w-full border-b border-zinc-800 flex justify-center">
          <div className="w-full max-w-3xl flex justify-center gap-12 px-6">
            <button onClick={() => setActiveTab('chapters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative cursor-pointer ${activeTab === 'chapters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              CHAPTERS{activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}
            </button>
            {seriesCharacters.length > 0 && (
              <button onClick={() => setActiveTab('characters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative cursor-pointer ${activeTab === 'characters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                CHARACTERS{activeTab === 'characters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 px-4 sm:px-6 pb-12 w-full max-w-3xl mx-auto min-h-[40vh]">

          {/* --- CHAPTERS CONTENT --- */}
          {activeTab === 'chapters' && (
            <div className="animate-fade-in">
              {/* LIVE NEXT NEW CHAPTER TIMER BANNER */}
              {nextScheduledChapter && scheduledTargetMs && scheduledTargetMs > nowTick && (
                <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg ${
                  isPlusActive
                    ? 'bg-gradient-to-r from-purple-950/60 via-zinc-900 to-amber-950/40 border-purple-500/40'
                    : 'bg-zinc-900/90 border-[#fe9a00]/40'
                }`}>
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isPlusActive ? 'bg-purple-600/30 border border-purple-400/50 text-purple-300' : 'bg-[#fe9a00]/20 border border-[#fe9a00]/40 text-[#fe9a00]'
                    }`}>
                      <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">
                        {isPlusActive
                          ? `⚡ Next New Chapter (Ch. ${nextScheduledChapter.chapter_number}) • 12H Early Access`
                          : `⏳ Next New Chapter (Ch. ${nextScheduledChapter.chapter_number}) Scheduled`}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 mt-0.5">
                        {isPlusActive
                          ? 'Your PLUS Early Access unlocks 12 hours before the public release!'
                          : '⚡ Saturday AM+ PLUS members unlock this chapter 12 hours early!'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest border ${
                      isPlusActive
                        ? 'bg-black/60 border-purple-400/50 text-purple-200'
                        : 'bg-black/60 border-[#fe9a00]/50 text-[#fe9a00]'
                    }`}>
                      Drops in {formatLiveCountdown(scheduledTargetMs, nowTick)}
                    </div>
                  </div>
                </div>
              )}

              {chapters.length > 0 && (
                <div className="flex justify-between items-center w-full mb-6 px-2">
                  <span className="text-zinc-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
                    {chapters.length} Chapters
                  </span>
                  <button
                    onClick={() => {
                      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      setVisibleCount(10);
                    }}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-[10px] sm:text-xs font-black uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 cursor-pointer"
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    Sort: {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
                  </button>
                </div>
              )}

              {displayedChapters.map((ch: any) => {
                const absoluteIndex = chapters.findIndex(c => c.id === ch.id);
                const actualProgress = readProgresses[String(ch.id)] || 0;
                const hasTempUnlock = rewardedAdsEnabled && unlockedChapters.includes(String(ch.id));
                const isLocked = checkIsLocked(ch.id) && !hasTempUnlock;
                const isEarlyAccess = isInPlusEarlyAccessWindow(ch.publish_at);
                const showNewBadge = isNewRelease(ch.publish_at, ch.created_at);

                const pageReacts = chapterStats[String(ch.id)]?.reacts || 0;
                const displayReacts = (ch.react_count || 0) + pageReacts;

                return (
                  <div key={ch.id} onClick={() => handleReadChapter(ch, absoluteIndex)} className="flex items-start sm:items-center gap-3 sm:gap-6 mb-4 hover:bg-zinc-900/80 p-3 sm:p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 group">

                    <div className="relative overflow-hidden rounded-lg min-w-[80px] w-20 h-20 sm:min-w-[128px] sm:w-32 sm:h-32 flex-shrink-0">
                      <img
                        src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`}
                        className={`w-full h-full object-cover bg-zinc-800 transition-transform duration-500 ${isLocked ? 'opacity-40 grayscale group-hover:scale-105' : 'group-hover:scale-110'}`}
                        style={{
                          objectPosition: ch.thumbnail_position || '50% 50%',
                          transform: `scale(${(ch.thumbnail_scale || 100) / 100})`
                        }}
                        alt="Thumbnail"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      {isLocked && (
                        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 backdrop-blur-md border border-zinc-700 p-1 sm:p-1.5 rounded-md">
                          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400" />
                        </div>
                      )}
                      {isEarlyAccess ? (
                        <div className="absolute top-1 right-1 z-20 bg-gradient-to-r from-purple-600 to-[#fe9a00] text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse pointer-events-none">
                          ⚡ 12H EARLY
                        </div>
                      ) : showNewBadge && (
                        <div className="absolute top-1 right-1 z-20 bg-red-600 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse pointer-events-none">
                          NEW!
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-3 sm:gap-4 w-full">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                          <p className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase ${isLocked ? 'text-zinc-500' : 'text-[#fe9a00]'}`}>CHAPTER {ch.chapter_number}</p>
                          {isEarlyAccess ? (
                            <span className="bg-purple-600/30 border border-purple-400 text-purple-200 text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded animate-pulse">
                              ⚡ PLUS 12H EARLY ACCESS
                            </span>
                          ) : showNewBadge && (
                            <span className="bg-red-600 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded animate-pulse">
                              NEW!
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/80 border border-zinc-800 px-1.5 sm:px-2 py-0.5 rounded-full cursor-default">
                              <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 fill-red-500" />
                              <span className="text-[8px] sm:text-[9px] text-zinc-300 font-bold">{displayReacts}</span>
                            </div>
                          </div>
                        </div>

                        <h3 className={`font-bold text-sm sm:text-lg mb-1.5 sm:mb-2 leading-snug break-words pr-2 ${isLocked ? 'text-zinc-400' : 'text-white'}`}>{ch.title || `Chapter ${ch.chapter_number}`}</h3>
                        {hasTempUnlock && (
                          <span className="text-green-500 text-[9px] font-black uppercase tracking-widest mt-1 block">
                            Unlocked (24h)
                          </span>
                        )}

                        {userTier !== 'visitor' && (
                          <div className="flex flex-col gap-1 w-full max-w-[150px] sm:max-w-[200px] mt-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 sm:h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#fe9a00] rounded-full transition-all duration-500"
                                  style={{ width: `${isLocked ? 0 : actualProgress}%` }}
                                />
                              </div>
                              <span className="text-[8px] sm:text-[10px] font-black text-zinc-500">{isLocked ? 0 : actualProgress}%</span>
                            </div>
                            {actualProgress === 100 && !isLocked && (
                              <span className="text-[8px] sm:text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Complete!</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto mt-1 sm:mt-0 border-t border-zinc-800/50 sm:border-0 pt-2 sm:pt-0">
                        <div className="flex items-center gap-1 sm:gap-2">

                          <div onClick={(e) => e.stopPropagation()}>
                            <HypeButton
                              targetType="chapter"
                              targetId={ch.id}
                              seriesSlug={localSeries.slug}
                              userId={currentUserId}
                              variant="chapter-hype-icon"
                              onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to hype chapters!" })}
                            />
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <LikeButton
                              targetType="chapter"
                              targetId={ch.id}
                              userId={currentUserId}
                              variant="chapter-action-icon"
                              onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to like chapters!" })}
                            />
                          </div>

                          <button
                            onClick={(e) => scrollToSection(e, commentsRef)}
                            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                            title="Jump to Comments"
                          >
                            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={(e) => scrollToSection(e, creatorRef)}
                            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                            title="Jump to Creator"
                          >
                            <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>

                        <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors flex-shrink-0 ml-auto sm:ml-0 ${isLocked ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-800 group-hover:bg-[#fe9a00]'}`}>
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600" />
                          ) : (
                            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:text-black transition-colors ml-0.5 sm:ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {chapters.length === 0 && <div className="text-center py-16 text-zinc-500 font-bold tracking-widest text-xs uppercase">No chapters uploaded yet.</div>}

              {visibleCount < chapters.length && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 25)}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-700 text-white text-[10px] font-black uppercase tracking-widest hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors cursor-pointer"
                  >
                    Load Next 25 Chapters
                  </button>
                  <button
                    onClick={() => setVisibleCount(chapters.length)}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
                  >
                    Load All Chapters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- CHARACTERS CONTENT --- */}
          {activeTab === 'characters' && (
            <div className="animate-fade-in pt-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                {seriesCharacters.slice(0, showAllChars ? undefined : 8).map((char, i) => (
                  <div key={i} className="flex flex-col items-center bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800">
                    <div className="w-full aspect-square bg-zinc-800 relative">
                      <img
                        src={char.headshot_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'}
                        alt={char.name}
                        onError={(e) => { e.currentTarget.src = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'; }}
                        className="w-full h-full object-cover"
                      />
                      {char.is_mc && <div className="absolute top-0 right-0 bg-[#fe9a00] text-black text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 uppercase">MC</div>}
                    </div>
                    <div className="p-2 w-full text-center">
                      <span className="text-[10px] sm:text-xs font-black text-white uppercase truncate block w-full px-1">{char.name}</span>
                      <span className="text-[8px] sm:text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest block mt-0.5">{char.role_type}</span>
                    </div>
                  </div>
                ))}
              </div>
              {seriesCharacters.length > 8 && (
                <button onClick={() => setShowAllChars(!showAllChars)} className="w-full py-2 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  {showAllChars ? '- Show Less' : '+ See More Characters'}
                </button>
              )}
              <button
                onClick={() => onNavigate({ action: 'characters' })}
                className="w-full bg-zinc-900 border border-zinc-700 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors mt-4 cursor-pointer"
              >
                Hype these Characters
              </button>
            </div>
          )}
        </div>

        <div ref={commentsRef} className="w-full max-w-3xl mx-auto pt-8">
          <SeriesCommentsSection
            {...({
              seriesSlug: localSeries?.slug,
              currentUser: currentUserId ? { id: currentUserId, tier: userTier } : null,
              onRequireAuth: () => setUpsellConfig({
                type: 'visitor',
                message: "Create a Free Account to join the community discussion and share your thoughts!"
              })
            } as any)}
          />
        </div>

        <div ref={creatorRef} className="pb-24 px-6 w-full max-w-3xl mx-auto scroll-mt-24">
          <div className="border-t border-zinc-800 pt-12 flex flex-col items-center gap-16">
            {creators.map((c: any, index) => {
              const safeName = c.name || 'Creator';
              const creatorId = c.id || c.name;
              return (
                <div key={index} className="flex flex-col items-center text-center w-full max-w-lg bg-zinc-900/30 p-8 rounded-2xl border border-zinc-800/50 shadow-xl">
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-700 overflow-hidden border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.3)]">
                      <img
                        src={(c.avatar_url && c.avatar_url !== 'null') ? c.avatar_url : `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`}
                        alt={safeName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`; }}
                      />
                    </div>
                    <div>
                      <h4 className="font-black text-xl sm:text-2xl tracking-tight">{safeName}</h4>
                      <p className="text-[10px] text-[#fe9a00] uppercase font-black tracking-widest mt-1">{c.role || 'Creator'}</p>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8">{c.bio || '...'}</p>

                  <button
                    onClick={() => {
                      setDonationCreator(c);
                      setDonationStep('input');
                      setDonationAmount(5);
                      setFanmailText('');
                    }}
                    className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto mb-3 bg-[#fe9a00] text-black px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-black" /> Support {safeName.split(' ')[0]}
                  </button>

                  <div className="w-full max-w-xs mx-auto mb-8 [&_button]:w-full [&_button]:justify-center">
                    <HypeButton
                      targetType="creator"
                      targetId={creatorId}
                      userId={currentUserId}
                      variant="default"
                      onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to hype creators!" })}
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 w-full">
                    {c.twitter_url && <a href={c.twitter_url} target="_blank" rel="noreferrer" className="flex-1 max-w-[140px] text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-4 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Twitter</a>}
                    {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" className="flex-1 max-w-[140px] text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-4 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Instagram</a>}
                  </div>

                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-24 border-t border-zinc-800/50 pt-12">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-full group-hover:bg-[#fe9a00] group-hover:border-[#fe9a00] transition-colors shadow-lg">
                <ArrowUp className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                Back to Top
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};