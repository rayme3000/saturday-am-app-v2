import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Flame, Bookmark, Play, ArrowUp, ArrowDown, User, Heart, Lock, X, MessageSquare, PenTool, Crown, Share2, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { MangaReader } from './MangaReader';
import { SuperHypeButton } from '../Components/SuperHypeButton';
import { HypeButton } from '../Components/HypeButton';
import { SeriesCommentsSection } from '../Components/SeriesCommentsSection';
import { PromoModal } from '../Components/PromoModal'; 
import { ShareModal } from '../Components/ShareModal';
import { useTelemetry } from '../Components/useTelemetry';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const ContentRatingBadge = ({ rating }: { rating: string }) => {
  const config: Record<string, { label: string, color: string, desc: string }> = {
    'E': { label: 'E', color: 'bg-green-600 text-white', desc: 'All Ages' },
    'Y': { label: 'Y', color: 'bg-blue-500 text-white', desc: 'Youth 10+' },
    'T': { label: 'T', color: 'bg-[#fe9a00] text-black', desc: 'Teen 13+' },
    'OT': { label: 'OT', color: 'bg-red-600 text-white', desc: 'Older Teen 16+' },
    'M': { label: 'M', color: 'bg-black border border-red-600 text-red-600', desc: 'Mature 18+' },
  };

  const current = config[rating] || config['T']; 

  return (
    <div className="flex items-center gap-2 mt-4 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50 backdrop-blur-sm w-max mx-auto shadow-lg">
      <div className={`w-5 h-5 flex items-center justify-center rounded-[3px] font-black text-[10px] ${current.color} shadow-sm`}>
        {current.label}
      </div>
      <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{current.desc}</span>
    </div>
  );
};

export const SeriesDetailPage = ({ series, onBack, userTier = 'visitor', onLoginClick, onNavigate }: any) => {
  const [localSeries, setLocalSeries] = useState(series);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activePages, setActivePages] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [creators, setCreators] = useState([]);
  const [showAwards, setShowAwards] = useState(false);
  const awardTimeoutRef = useRef<any>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [readProgresses, setReadProgresses] = useState<any>({});

  const [chapterStats, setChapterStats] = useState<any>({});
  const [readerClosedCount, setReaderClosedCount] = useState(0);

  const [upsellConfig, setUpsellConfig] = useState<{ type: 'visitor' | 'premium', message: string } | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // --- HYPE STATE ---
  const [creatorHypes, setCreatorHypes] = useState<Record<string, boolean>>({});
  const [showCreatorHypeConfirm, setShowCreatorHypeConfirm] = useState<any>(null);
  const [hypesRemaining, setHypesRemaining] = useState(5);
  
  const [seriesCharacters, setSeriesCharacters] = useState<any[]>([]);
  const [showAllChars, setShowAllChars] = useState(false);
  
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
  const [targetChapter, setTargetChapter] = useState<any>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<string[]>([]);

  const actionsRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const creatorRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (e: React.MouseEvent | any, ref: React.RefObject<HTMLDivElement>, center: boolean = false) => {
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
    }
  }, [localSeries?.slug, trackEvent]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
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
    checkFavoriteStatus();
  }, [localSeries]);

  useEffect(() => {
    const fetchUnlocks = async () => {
      if (userTier === 'premium' || userTier === 'visitor') return;
      try {
        const { data, error } = await supabase.from('temporary_unlocks').select('chapter_id');
        if (error) throw error;
        if (data) setUnlockedChapters(data.map(d => d.chapter_id));
      } catch (err) { console.error("Error fetching temporary unlocks:", err); }
    };
    fetchUnlocks();
  }, [userTier, currentUserId]);

  useEffect(() => {
    if (!series) return;
    const fetchDetails = async () => {
      try {
        const targetSlug = typeof series === 'string' ? series : series?.slug;
        if (!targetSlug) return;
        const { data: freshSeries } = await supabase.from('series').select('*').eq('slug', targetSlug).single();
        if (freshSeries) setLocalSeries(freshSeries);
        
        const { data: chapterData } = await supabase.from('chapters').select('*').eq('series_slug', targetSlug).eq('is_published', true).order('chapter_number', { ascending: true });
        if (chapterData) setChapters(chapterData as any);
        
        const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSlug).order('id', { ascending: true });
        if (creatorData && creatorData.length > 0) { setCreators(creatorData as any); } 
        else if (freshSeries) { setCreators([{ role: 'Creator', name: freshSeries.creator_name || 'Saturday AM', flag_code: freshSeries.flag_code || '', avatar_url: freshSeries.creator_avatar || '', bio: freshSeries.creator_bio || '', twitter_url: freshSeries.creator_twitter || '', instagram_url: freshSeries.creator_instagram || '', support_url: freshSeries.creator_support_link || '' }] as any); }
      
        const { data: charData } = await supabase.from('series_characters').select('*').eq('series_slug', targetSlug).order('id', { ascending: true });
        if (charData) setSeriesCharacters(charData as any);

      } catch (err) { console.error("Failed to load series details:", err); }
    };
    fetchDetails();
  }, [series]);

  useEffect(() => {
    if (!currentUserId || chapters.length === 0) return;
    const fetchReadingProgress = async () => {
      const chapterIds = chapters.map(c => String(c.id));
      const { data: historyData } = await supabase.from('reading_history').select('chapter_id, page_index').eq('user_id', currentUserId).in('chapter_id', chapterIds);
      if (!historyData || historyData.length === 0) return;

      const { data: pagesData } = await supabase.from('pages').select('chapter_id').in('chapter_id', chapterIds);
      const pageCounts: any = {};
      if (pagesData) pagesData.forEach((p: any) => { pageCounts[String(p.chapter_id)] = (pageCounts[String(p.chapter_id)] || 0) + 1; });

      const progressMap: any = {};
      historyData.forEach((h: any) => {
        const cId = String(h.chapter_id);
        const totalPages = pageCounts[cId] || 1;
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
        const { data: statsData, error } = await supabase.rpc('get_series_chapter_stats', { p_series_slug: localSeries.slug });
        if (statsData && !error) {
          const newStats: any = {};
          statsData.forEach((stat: any) => { newStats[stat.chapter_id] = { hypes: Number(stat.total_hypes), reacts: Number(stat.total_reacts) }; });
          setChapterStats(newStats);
        }
      } catch (err) { console.error("Failed to fetch chapter stats:", err); }
    };
    fetchChapterStats();
  }, [chapters, readerClosedCount, localSeries?.slug]);

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
  }, [chapters, series, hasAutoOpened]);

  const handleChapterLike = useCallback((chapterId: string, isNowHyped: boolean) => {
    setChapterStats((prev: any) => ({
      ...prev,
      [chapterId]: {
        ...prev[chapterId],
        hypes: Math.max(0, (prev[chapterId]?.hypes || 0) + (isNowHyped ? 1 : -1))
      }
    }));
  }, []);

  const handleSeriesLike = useCallback((isNowHyped: boolean) => {
    setLocalSeries((prev: any) => ({
      ...prev,
      hype_count: Math.max(0, (prev?.hype_count || 0) + (isNowHyped ? 1 : -1))
    }));
  }, []);

  const sortedChapters = [...chapters].sort((a, b) => {
    if (sortOrder === 'asc') return a.chapter_number - b.chapter_number;
    return b.chapter_number - a.chapter_number;
  });

  const displayedChapters = sortedChapters.slice(0, visibleCount);

  const aggregatedSubHypes = chapters.reduce((sum: number, ch: any) => {
    const pageHypes = chapterStats[String(ch.id)]?.hypes || 0;
    return sum + (ch.hype_count || 0) + pageHypes;
  }, 0);
  
  const checkIsLocked = (chapterId: string) => {
    if (userTier === 'premium') return false; 
    const absoluteIndex = chapters.findIndex(c => c.id === chapterId);
    if (userTier === 'free') return !(absoluteIndex < 3 || absoluteIndex === chapters.length - 1);
    return absoluteIndex !== 0; 
  };

  const handleReadChapter = async (chapter: any, absoluteIndex: number, initialPage = 0) => {
    const isInitiallyLocked = checkIsLocked(chapter.id);
    const hasTempUnlock = unlockedChapters.includes(chapter.id);

    if (isInitiallyLocked && !hasTempUnlock) {
      setIsAutoLoading(false);
      if (userTier === 'visitor') { setUpsellConfig({ type: 'visitor', message: "Create a Free Account to unlock Chapters 1-3 and read the newest release." }); return; }
      setTargetChapter(chapter);
      setShowAdModal(true);
      return;
    }

    const { data } = await supabase.from('pages').select('id, image_url').eq('chapter_id', chapter.id).order('page_order', { ascending: true });
      
    if (data && data.length > 0) { 
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
    } 
    else { setIsAutoLoading(false); alert("No pages found for this chapter yet!"); }
  };

  const handleAdComplete = async () => {
    if (!targetChapter) return;
    try {
      const { data, error } = await supabase.rpc('unlock_chapter_with_ad', { p_chapter_id: targetChapter.id });
      if (error) throw error;
      if (data === true) {
        alert("Chapter Unlocked for 24 Hours!");
        setUnlockedChapters(prev => [...prev, targetChapter.id]);
        setShowAdModal(false);
        const absoluteIndex = chapters.findIndex(c => c.id === targetChapter.id);
        handleReadChapter(targetChapter, absoluteIndex, 0);
      } else {
        alert("You have reached your daily ad-unlock limit! Upgrade to Pro for unlimited reading.");
        setShowAdModal(false);
      }
    } catch (err) { alert("An error occurred. Please try again."); }
  };

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

  const handleProcessDonation = () => {
    if (!currentUserId) {
      setUpsellConfig({ type: 'visitor', message: "Create a Free Account to support creators and send fanmail!" });
      setDonationCreator(null);
      return;
    }
    
    setDonationStep('processing');
    
    setTimeout(async () => {
      try {
        const pointsToAward = donationAmount * 100;
        const { data: profile } = await supabase.from('profiles').select('total_hypes').eq('id', currentUserId).single();
        if (profile) {
          await supabase.from('profiles').update({ total_hypes: (profile.total_hypes || 0) + pointsToAward }).eq('id', currentUserId);
          window.dispatchEvent(new Event('profileUpdated'));
        }
      } catch(e) {
        console.error("Donation processing error:", e);
      }
      setDonationStep('success');
    }, 2000);
  };

  // --- NEW: INITIATE CONFIRMATION FOR CREATORS ---
  const initiateHypeCreator = (creator: any) => {
    if (!currentUserId) {
      setUpsellConfig({ type: 'visitor', message: "Create a Free Account to hype creators!" });
      return;
    }
    if (hypesRemaining <= 0) {
      alert("You are out of Hypes! They will automatically replenish this Saturday.");
      return;
    }
    setShowCreatorHypeConfirm(creator);
  };

  // --- NEW: EXECUTE INFINITE HYPES FOR CREATORS ---
  const executeHypeCreator = async () => {
    const creator = showCreatorHypeConfirm;
    setShowCreatorHypeConfirm(null);
    if (!creator) return;

    const creatorId = creator.id || creator.name;
    setCreatorHypes(prev => ({...prev, [creatorId]: true}));
    setHypesRemaining(prev => Math.max(0, prev - 1));

    try {
      await supabase.from('hypes').insert([{ 
        user_id: currentUserId, target_type: 'creator', target_id: String(creatorId) 
      }]);
      const { data: profile } = await supabase.from('profiles').select('total_hypes').eq('id', currentUserId).single();
      if (profile) {
        await supabase.from('profiles').update({ total_hypes: (profile.total_hypes || 0) + 1 }).eq('id', currentUserId);
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch(e) {
      console.error("Error hyping creator:", e);
    }
  };

  if (!localSeries) return null;

  const safeSynopsis = localSeries.synopsis || '';

  return (
    <div className="relative min-h-screen bg-transparent text-white">
      
      {/* CREATOR HYPE CONFIRMATION MODAL */}
      {showCreatorHypeConfirm && (
        <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowCreatorHypeConfirm(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-[#fe9a00]/10 rounded-full flex items-center justify-center mb-4 border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Flame className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Drop a Hype?</h2>
            <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-6">
              Are you sure you want to spend a Hype on <span className="text-white">{showCreatorHypeConfirm.name || 'this creator'}</span>? You can hype them multiple times!
            </p>
            <div className="bg-zinc-900 w-full py-3 rounded-lg border border-zinc-800 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Balance</p>
              <p className="text-lg font-black text-white">{hypesRemaining} <span className="text-[#fe9a00]">Remaining</span></p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowCreatorHypeConfirm(null)} className="flex-1 bg-zinc-900 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={executeHypeCreator} className="flex-1 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {isAutoLoading && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin mb-4"></div>
          <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Chapter...</span>
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} series={localSeries} chapter={chapters.find(c => c.id === activeChapterId)} currentUser={{ id: currentUserId }} />

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

      {upsellConfig && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative">
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]"><Lock className="w-8 h-8 text-[#fe9a00]" /></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{upsellConfig.type === 'visitor' ? 'Account Required' : 'Premium Feature'}</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            {upsellConfig.type === 'visitor' ? (
              <button onClick={() => { setUpsellConfig(null); if(onLoginClick) onLoginClick(); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors">Log In / Sign Up</button>
            ) : (
              <button onClick={() => { setUpsellConfig(null); if (onNavigate) onNavigate({ action: 'sub' }); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors">Explore Premium</button>
            )}
          </div>
        </div>
      )}

      {donationCreator && (
        <div className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => { if(donationStep === 'input') setDonationCreator(null); }}>
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
            
            {donationStep === 'input' && (
              <>
                <button onClick={() => setDonationCreator(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20"><X className="w-6 h-6" /></button>
                <div className="p-6 sm:p-8 animate-fade-in">
                  <div className="flex flex-col items-center mb-6 text-center mt-2">
                    <img src={donationCreator.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} className="w-16 h-16 rounded-full object-cover border-2 border-[#fe9a00] mb-3 shadow-[0_0_15px_rgba(254,154,0,0.3)]" alt={donationCreator.name} />
                    <h3 className="text-xl font-black italic uppercase text-white leading-tight">Support {donationCreator.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Send a direct tip & private fanmail!</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {[5, 10, 15, 20].map((amount) => (
                      <button 
                        key={amount}
                        onClick={() => setDonationAmount(amount)}
                        className={`py-3 rounded-xl font-black text-sm sm:text-base border-2 transition-all ${donationAmount === amount ? 'bg-[#fe9a00]/10 border-[#fe9a00] text-[#fe9a00]' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
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
                    className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.3)]"
                  >
                    Donate ${donationAmount}
                  </button>
                  <p className="text-center text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
                    Stripe integration pending. Donating massively improves your Fandom Score!
                  </p>
                </div>
              </>
            )}

            {donationStep === 'processing' && (
              <div className="py-16 flex flex-col items-center justify-center animate-fade-in text-center">
                <Loader2 className="w-12 h-12 text-[#fe9a00] animate-spin mb-4" />
                <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Processing Donation</h3>
                <p className="text-xs text-zinc-400 font-bold">Contacting secure payment gateway...</p>
              </div>
            )}

            {donationStep === 'success' && (
              <div className="py-12 px-6 flex flex-col items-center justify-center animate-fade-in text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Thank You!</h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-bold mb-8 leading-relaxed max-w-xs">
                  Your ${donationAmount} tip and fanmail have been sent directly to {donationCreator.name}. <span className="text-[#fe9a00]">This massively improved your Fandom Score!</span>
                </p>
                <button 
                  onClick={() => { setDonationCreator(null); setDonationStep('input'); }}
                  className="w-full py-4 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
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
            onClose={() => { setIsReaderOpen(false); setActiveChapterId(null); setStartPage(0); setReaderClosedCount(c => c + 1); }} 
            onHome={() => { setIsReaderOpen(false); setActiveChapterId(null); setStartPage(0); setReaderClosedCount(c => c + 1); onBack(); }}
            onNext={() => { if (hasNext) handleReadChapter(chapters[currentIndex + 1], currentIndex + 1); }}
            onPrev={() => { if (hasPrev) handleReadChapter(chapters[currentIndex - 1], currentIndex - 1); }}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onNavigate={onNavigate} 
            onHypeUpdate={handleChapterLike}
            onSupportCreator={(e: any) => {
              setIsReaderOpen(false); 
              setActiveChapterId(null); 
              setStartPage(0); 
              setReaderClosedCount(c => c + 1);
              setTimeout(() => {
                scrollToSection(e || {stopPropagation:()=>{}}, creatorRef);
              }, 100);
            }}
          />
        );
      })()}

      <div className="sticky top-0 left-0 w-full h-[50vh] sm:h-[60vh] z-0 overflow-hidden bg-black">
        <img src={localSeries.cover_url} className="w-full h-full object-cover opacity-60" alt="Hero Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <button 
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              onBack();
            }
          }} 
          className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:text-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        <button onClick={() => setShowShareModal(true)} className="absolute top-4 sm:top-6 right-[4.5rem] sm:right-24 z-20 p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-all shadow-lg group">
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full -mt-12 pt-12 [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">
        <div className="px-6 pt-8 flex flex-col items-center w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            {localSeries.logo_url && <img src={localSeries.logo_url} alt="Logo" className="w-full max-w-[280px] sm:max-w-[350px] h-auto object-contain drop-shadow-2xl" />}
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

          <ContentRatingBadge rating={localSeries.content_rating || 'T'} />

          <div className="mt-6 px-2 text-center max-w-2xl">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{safeSynopsis}</p>
            {safeSynopsis.length > 150 && (<button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-black tracking-widest text-[10px] mt-2 uppercase hover:text-white transition-colors">{isExpanded ? '- READ LESS' : '+ READ MORE'}</button>)}
          </div>

          <div ref={actionsRef} className="flex flex-col items-center gap-4 mt-8 w-full max-w-sm mx-auto scroll-mt-32">
            
            <div className="w-full flex flex-col gap-3 [&>button]:w-full [&>button]:justify-center">
              <SuperHypeButton 
                seriesSlug={localSeries.slug} 
                userId={currentUserId} 
                isPremium={isPremiumUser}
                onRequirePremium={() => setUpsellConfig({ type: 'premium', message: "Hypes are a Premium feature! Upgrade to support creators with ultra-visible hype." })}
                onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create an account and upgrade to Premium to drop Hypes!" })}
              />
              <button 
                onClick={(e) => scrollToSection(e, creatorRef)} 
                className="flex items-center justify-center gap-3 w-full px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all bg-zinc-900 text-white border border-zinc-700 hover:bg-[#fe9a00] hover:border-[#fe9a00] hover:text-black shadow-lg"
              >
                <PenTool className="w-5 h-5" />
                <span>HYPE CREATOR(S)</span>
              </button>
            </div>

            <div className="flex items-start justify-around w-full mt-4 px-2 sm:px-6">
              <div className="flex flex-col items-center gap-2">
                <HypeButton 
                  targetType="series" 
                  targetId={localSeries.slug} 
                  userId={currentUserId} 
                  initialCount={localSeries?.hype_count || 0} 
                  bonusCount={aggregatedSubHypes}
                  variant="icon"
                  onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to like this series!" })}
                  onToggle={handleSeriesLike}
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Like</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={handleToggleFavorite} 
                  className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 border shadow-xl flex items-center justify-center cursor-pointer ${isFavorited ? 'bg-[#fe9a00]/20 border-[#fe9a00]/30 text-[#fe9a00]' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5 text-white/70 hover:text-white'}`}
                  title={isFavorited ? "Saved to Faves" : "Add to Faves"}
                >
                  <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 ${isFavorited ? 'fill-[#fe9a00]' : ''}`} />
                </button>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isFavorited ? 'text-[#fe9a00]' : 'text-zinc-500'}`}>Fave</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={(e) => scrollToSection(e, commentsRef)} 
                  className="relative p-2.5 sm:p-3 rounded-full transition-all duration-300 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/5 shadow-xl flex items-center justify-center cursor-pointer text-white/70 hover:text-white"
                  title="Discuss"
                >
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Discuss</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ADDED CHARACTERS TAB --- */}
        <div className="mt-12 w-full border-b border-zinc-800 flex justify-center">
          <div className="w-full max-w-3xl flex justify-center gap-12 px-6">
            <button onClick={() => setActiveTab('chapters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative ${activeTab === 'chapters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              CHAPTERS{activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}
            </button>
            {seriesCharacters.length > 0 && (
              <button onClick={() => setActiveTab('characters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative ${activeTab === 'characters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                CHARACTERS{activeTab === 'characters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 px-4 sm:px-6 pb-12 w-full max-w-3xl mx-auto min-h-[40vh]">
          
          {/* --- CHAPTERS CONTENT --- */}
          {activeTab === 'chapters' && (
            <div className="animate-fade-in">
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
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-[10px] sm:text-xs font-black uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800"
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    Sort: {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
                  </button>
                </div>
              )}

              {displayedChapters.map((ch: any) => {
                const absoluteIndex = chapters.findIndex(c => c.id === ch.id);
                const actualProgress = readProgresses[String(ch.id)] || 0;
                const hasTempUnlock = unlockedChapters.includes(ch.id);
                const isLocked = checkIsLocked(ch.id) && !hasTempUnlock;

                const pageReacts = chapterStats[String(ch.id)]?.reacts || 0;
                const displayReacts = (ch.react_count || 0) + pageReacts;

                return (
                <div key={ch.id} onClick={() => handleReadChapter(ch, absoluteIndex)} className="flex items-center gap-3 sm:gap-6 mb-4 hover:bg-zinc-900/80 p-2 sm:p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 group">
                  
                  <div className="relative overflow-hidden rounded-lg min-w-[72px] w-[72px] h-[72px] sm:min-w-[128px] sm:w-32 sm:h-32 flex-shrink-0">
                    <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className={`w-full h-full object-cover bg-zinc-800 transition-transform duration-500 ${isLocked ? 'opacity-40 grayscale group-hover:scale-105' : 'group-hover:scale-110'}`} alt="Thumbnail" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    {isLocked && (
                      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 backdrop-blur-md border border-zinc-700 p-1 sm:p-1.5 rounded-md">
                        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <p className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase ${isLocked ? 'text-zinc-500' : 'text-[#fe9a00]'}`}>CHAPTER {ch.chapter_number}</p>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/80 border border-zinc-800 px-1.5 sm:px-2 py-0.5 rounded-full cursor-default">
                           <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Quick%20React%20icon.png" alt="Quick React" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain drop-shadow-md" />
                           <span className="text-[8px] sm:text-[9px] text-zinc-300 font-bold">{displayReacts}</span>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className={`font-bold text-sm sm:text-lg truncate sm:line-clamp-2 sm:whitespace-normal mb-1.5 sm:mb-2 ${isLocked ? 'text-zinc-400' : 'text-white'}`}>{ch.title || `Chapter ${ch.chapter_number}`}</h3>
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
                  
                  <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      
                      <div onClick={(e) => e.stopPropagation()}>
                         <HypeButton 
                           targetType="chapter" 
                           targetId={ch.id} 
                           userId={currentUserId} 
                           initialCount={ch.hype_count || 0} 
                           variant="chapter-action-icon"
                           onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to like chapters!" })}
                           onToggle={(isHyped: boolean) => handleChapterLike(ch.id, isHyped)}
                         />
                      </div>

                      <button 
                        onClick={(e) => scrollToSection(e, commentsRef)} 
                        className="flex p-1.5 sm:p-2.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                        title="Jump to Comments"
                      >
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={(e) => scrollToSection(e, creatorRef)} 
                        className="flex p-1.5 sm:p-2.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                        title="Jump to Creator"
                      >
                        <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors flex-shrink-0 ${isLocked ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-800 group-hover:bg-[#fe9a00]'}`}>
                      {isLocked ? (
                         <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600" />
                      ) : (
                         <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:text-black transition-colors ml-0.5 sm:ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              )})}
              
              {chapters.length === 0 && <div className="text-center py-16 text-zinc-500 font-bold tracking-widest text-xs uppercase">No chapters uploaded yet.</div>}

              {visibleCount < chapters.length && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                  <button 
                    onClick={() => setVisibleCount(prev => prev + 25)}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-700 text-white text-[10px] font-black uppercase tracking-widest hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors"
                  >
                    Load Next 25 Chapters
                  </button>
                  <button 
                    onClick={() => setVisibleCount(chapters.length)}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
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
                      {/* FIXED BROKEN IMAGE RENDER */}
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
                <button onClick={() => setShowAllChars(!showAllChars)} className="w-full py-2 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                  {showAllChars ? '- Show Less' : '+ See More Characters'}
                </button>
              )}
              <button 
                onClick={() => onNavigate({ action: 'characters' })}
                className="w-full bg-zinc-900 border border-zinc-700 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors mt-4"
              >
                Hype these Characters
              </button>
            </div>
          )}
        </div>
        
        <div ref={commentsRef} className="w-full max-w-3xl mx-auto pt-8">
          <SeriesCommentsSection 
            seriesSlug={localSeries?.slug} 
            currentUser={currentUserId ? { id: currentUserId, tier: userTier } : null}
            onRequireAuth={() => setUpsellConfig({ 
              type: 'visitor', 
              message: "Create a Free Account to join the community discussion and share your thoughts!" 
            })} 
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
                    className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto mb-3 bg-[#fe9a00] text-black px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1"
                  >
                    <Heart className="w-4 h-4 fill-black" /> Support {safeName.split(' ')[0]}
                  </button>

                  <button 
                    onClick={() => initiateHypeCreator(c)}
                    className={`flex items-center justify-center gap-2 w-full max-w-xs mx-auto mb-8 border transition-all px-8 py-3 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${creatorHypes[creatorId] ? 'bg-zinc-800 text-[#fe9a00] border-[#fe9a00]' : 'bg-black text-white border-zinc-700 hover:border-white hover:text-white'}`}
                  >
                    <Flame className={`w-4 h-4 ${creatorHypes[creatorId] ? 'fill-[#fe9a00]' : ''}`} />
                    {creatorHypes[creatorId] ? 'HYPE AGAIN' : `HYPE ${safeName.split(' ')[0]}`}
                  </button>

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