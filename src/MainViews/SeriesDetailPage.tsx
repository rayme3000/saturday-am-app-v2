import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Flame, Bookmark, Play, ArrowUp, User, MessageCircle, Heart, Lock, X } from 'lucide-react';
import { supabase } from '../supabase';
import { MangaReader } from './MangaReader';
import { SuperHypeButton } from '../Components/SuperHypeButton';
import { HypeButton } from '../Components/HypeButton';
import { SeriesCommentsSection } from '../Components/SeriesCommentsSection';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

export const SeriesDetailPage = ({ series, onBack, userTier = 'visitor', onLoginClick }: any) => {
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

  // --- UPSELL MODAL CONFIG ---
  const [upsellConfig, setUpsellConfig] = useState<{ type: 'visitor' | 'premium', message: string } | null>(null);

  // FAVES STATE & FETCH LOGIC
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && localSeries) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('profiles').select('favorites, is_premium').eq('id', user.id).single();
        
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
    window.scrollTo(0, 0);
  }, []);

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
      } catch (err) { console.error("Failed to load series details:", err); }
    };
    fetchDetails();
  }, [series]);
  // --- FETCH ACTUAL READING PROGRESS ---
  useEffect(() => {
    if (!currentUserId || chapters.length === 0) return;

    const fetchReadingProgress = async () => {
      const chapterIds = chapters.map(c => c.id);

      // 1. Get the user's saved pages from the MangaReader
      const { data: historyData } = await supabase
        .from('reading_history')
        .select('chapter_id, page_index')
        .eq('user_id', currentUserId)
        .in('chapter_id', chapterIds);

      if (!historyData || historyData.length === 0) return;

      // 2. Get total pages per chapter to calculate the %
      const { data: pagesData } = await supabase
        .from('pages')
        .select('chapter_id')
        .in('chapter_id', chapterIds);

      const pageCounts: any = {};
      if (pagesData) {
        pagesData.forEach((p: any) => {
          pageCounts[p.chapter_id] = (pageCounts[p.chapter_id] || 0) + 1;
        });
      }

      // 3. Calculate exact percentages
      const progressMap: any = {};
      historyData.forEach((h: any) => {
        const totalPages = pageCounts[h.chapter_id] || 1;
        const maxPage = Math.max(1, totalPages - 1);
        const percentage = Math.min(100, Math.round((h.page_index / maxPage) * 100));
        progressMap[h.chapter_id] = percentage;
      });

      setReadProgresses(progressMap);
    };

    fetchReadingProgress();
  }, [currentUserId, chapters]);

  const totalHype = chapters.reduce((sum: number, ch: any) => sum + (ch.hype_count || 0), 0) + (localSeries?.hype_count || 0);
  
  // --- ACCESS TIER LOGIC ---
  const checkIsLocked = (index: number) => {
    if (userTier === 'premium') return false; 
    if (userTier === 'free') {
      return !(index < 3 || index === chapters.length - 1);
    }
    return index !== 0; 
  };

  const handleReadChapter = async (chapter: any, index: number) => {
    // TRIGGER UPSELL IF LOCKED
    if (checkIsLocked(index)) {
      setUpsellConfig({
        type: userTier === 'visitor' ? 'visitor' : 'premium',
        message: userTier === 'visitor' 
          ? "Create a Free Account to unlock Chapters 1-3 and read the newest release." 
          : "This chapter is locked in the vault! Upgrade to a Premium Subscription for just $3.99/mo to get full access."
      });
      return;
    }

    const { data } = await supabase
      .from('pages')
      .select('id, image_url')
      .eq('chapter_id', chapter.id)
      .order('page_order', { ascending: true });
      
    if (data && data.length > 0) { 
      setActivePages(data as any); 
      setActiveChapterId(chapter.id); 
      setIsReaderOpen(true); 
    } 
    else { 
      alert("No pages found for this chapter yet!"); 
    }
  };

  const triggerAwards = () => {
    setShowAwards(true);
    if (awardTimeoutRef.current) clearTimeout(awardTimeoutRef.current);
    awardTimeoutRef.current = setTimeout(() => { setShowAwards(false); }, 3000);
  };

  const handleToggleFavorite = async () => {
    // TRIGGER UPSELL IF NOT LOGGED IN
    if (!currentUserId || userTier === 'visitor') {
      setUpsellConfig({
        type: 'visitor',
        message: "Create a Free Account to save series to your favorites and get notified of new chapters!"
      });
      return;
    }

    const newFavoriteStatus = !isFavorited;
    setIsFavorited(newFavoriteStatus);

    try {
      const { data } = await supabase.from('profiles').select('favorites').eq('id', currentUserId).single();
      let currentFaves = data?.favorites || [];

      if (newFavoriteStatus) {
        if (!currentFaves.includes(localSeries.slug)) currentFaves.push(localSeries.slug);
      } else {
        currentFaves = currentFaves.filter((slug: string) => slug !== localSeries.slug);
      }

      const { error } = await supabase.from('profiles').update({ favorites: currentFaves }).eq('id', currentUserId);
      if (error) throw error;
      
    } catch (err) {
      console.error("Failed to update favorites:", err);
      setIsFavorited(!newFavoriteStatus);
    }
  };

  if (!localSeries) return null;

  const safeSynopsis = localSeries.synopsis || '';

  return (
    <div className="relative min-h-screen bg-black text-white">
      
      {/* --- UPSELL MODAL OVERLAY --- */}
      {upsellConfig && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative">
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Lock className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              {upsellConfig.type === 'visitor' ? 'Account Required' : 'Premium Feature'}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
              {upsellConfig.message}
            </p>
            {upsellConfig.type === 'visitor' ? (
              <button 
                onClick={() => { 
                  setUpsellConfig(null); 
                  if(onLoginClick) onLoginClick(); // This will open the Auth modal!
                }} 
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
              >
                Log In / Sign Up
              </button>
            ) : (
              <button 
                onClick={() => setUpsellConfig(null)} 
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
              >
                Explore Premium
              </button>
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
            onClose={() => { setIsReaderOpen(false); setActiveChapterId(null); }} 
            onHome={() => { setIsReaderOpen(false); setActiveChapterId(null); onBack(); }}
            onNext={() => { if (hasNext) handleReadChapter(chapters[currentIndex + 1], currentIndex + 1); }}
            onPrev={() => { if (hasPrev) handleReadChapter(chapters[currentIndex - 1], currentIndex - 1); }}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onHypeUpdate={(chId: any, newTotal: any) => { setChapters(chapters.map(ch => ch.id === chId ? { ...ch, hype_count: newTotal } : ch)); }}
          />
        );
      })()}

      <div className="sticky top-0 left-0 w-full h-[50vh] sm:h-[60vh] z-0 overflow-hidden bg-black">
        <img src={localSeries.cover_url} className="w-full h-full object-cover opacity-60" alt="Hero Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"><ArrowLeft className="w-6 h-6" /></button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
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

          <div className="mt-6 px-2 text-center max-w-2xl">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{safeSynopsis}</p>
            {safeSynopsis.length > 150 && (<button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-black tracking-widest text-[10px] mt-2 uppercase hover:text-white transition-colors">{isExpanded ? '- READ LESS' : '+ READ MORE'}</button>)}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8 w-full">
            <HypeButton 
              targetType="series" 
              targetId={localSeries.slug} 
              userId={currentUserId} 
              initialCount={totalHype} 
              onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create a Free Account to drop Hypes and support the creators!" })}
            />
            <SuperHypeButton 
              seriesSlug={localSeries.slug} 
              userId={currentUserId} 
              isPremium={isPremiumUser} 
              onRequirePremium={() => setUpsellConfig({ type: 'premium', message: "Super Hypes are a Premium feature! Upgrade to support creators with ultra-visible hype." })}
              onRequireAuth={() => setUpsellConfig({ type: 'visitor', message: "Create an account and upgrade to Premium to drop Super Hypes!" })}
            />
            <button onClick={handleToggleFavorite} className={`flex items-center gap-2 px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all ${isFavorited ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00] hover:bg-zinc-900' : 'bg-[#fe9a00] text-black hover:bg-white hover:shadow-[0_0_20px_rgba(254,154,0,0.4)]'}`}>
              <Bookmark className={`w-5 h-5 ${isFavorited ? 'fill-[#fe9a00]' : ''}`} />
              <span>{isFavorited ? 'FAVORITED' : 'ADD TO FAVES'}</span>
            </button>
          </div>
        </div>

        <div className="mt-12 w-full border-b border-zinc-800 flex justify-center">
          <div className="w-full max-w-3xl flex justify-center gap-12 px-6">
            <button onClick={() => setActiveTab('chapters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative ${activeTab === 'chapters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>CHAPTERS{activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}</button>
          </div>
        </div>

        <div className="mt-8 px-4 sm:px-6 pb-12 w-full max-w-3xl mx-auto">
          {chapters.map((ch: any, index: number) => {
            const actualProgress = readProgresses[ch.id] || 0;
            const realReacts = ch.react_count || 0;
            const isLocked = checkIsLocked(index);

            return (
            <div key={ch.id} onClick={() => handleReadChapter(ch, index)} className="flex items-center gap-4 sm:gap-6 mb-4 hover:bg-zinc-900/80 p-3 sm:p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 group">
              <div className="relative overflow-hidden rounded-lg min-w-[96px] sm:min-w-[128px]">
                <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className={`w-24 h-24 sm:w-32 sm:h-32 object-cover bg-zinc-800 transition-transform duration-500 ${isLocked ? 'opacity-40 grayscale group-hover:scale-105' : 'group-hover:scale-110'}`} alt="Thumbnail" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                {isLocked && (
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md border border-zinc-700 p-1.5 rounded-md">
                    <Lock className="w-3 h-3 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className={`text-[10px] font-black tracking-widest uppercase ${isLocked ? 'text-zinc-500' : 'text-[#fe9a00]'}`}>CHAPTER {ch.chapter_number}</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <Flame className="w-3 h-3 text-[#fe9a00] fill-[#fe9a00]/20" />
                       <span className="text-[9px] text-zinc-300 font-bold">{ch.hype_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <MessageCircle className="w-3 h-3 text-cyan-400" />
                       <span className="text-[9px] text-zinc-300 font-bold">{realReacts}</span>
                    </div>
                  </div>
                </div>
                
                <h3 className={`font-bold text-base sm:text-lg line-clamp-2 mb-2 ${isLocked ? 'text-zinc-400' : 'text-white'}`}>{ch.title || `Chapter ${ch.chapter_number}`}</h3>
                
                {/* --- MEMBERS ONLY PROGRESS BAR --- */}
                {userTier !== 'visitor' && (
                  <div className="flex flex-col gap-1 w-full max-w-[200px]">
                     <div className="flex items-center gap-2">
                       <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-[#fe9a00] rounded-full transition-all duration-500" 
                           style={{ width: `${isLocked ? 0 : actualProgress}%` }} 
                         />
                       </div>
                       <span className="text-[10px] font-black text-zinc-500">{isLocked ? 0 : actualProgress}%</span>
                     </div>
                     {actualProgress === 100 && !isLocked && (
                       <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Complete!</span>
                     )}
                  </div>
                )}

              </div>
              <div className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full transition-colors ml-auto flex-shrink-0 ${isLocked ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-800 group-hover:bg-[#fe9a00]'}`}>
                {isLocked ? (
                   <Lock className="w-4 h-4 text-zinc-600" />
                ) : (
                   <Play className="w-4 h-4 text-white group-hover:text-black transition-colors ml-1" />
                )}
              </div>
            </div>
          )})}
          {chapters.length === 0 && <div className="text-center py-16 text-zinc-500 font-bold tracking-widest text-xs uppercase">No chapters uploaded yet.</div>}
        </div>
        <SeriesCommentsSection 
  seriesSlug={localSeries?.slug} 
  onRequireAuth={() => setUpsellConfig({ 
    type: 'visitor', 
    message: "Create a Free Account to join the community discussion and share your thoughts!" 
  })} 
/>        
        <div className="pb-24 px-6 w-full max-w-3xl mx-auto">
          <div className="border-t border-zinc-800 pt-12 flex flex-col items-center gap-16">
            {creators.map((c: any, index) => {
              const safeName = c.name || 'Creator'; const firstName = safeName.split(' ')[0];
              return (
                <div key={index} className="flex flex-col items-center text-center w-full max-w-lg bg-zinc-900/30 p-8 rounded-2xl border border-zinc-800/50">
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-700 overflow-hidden border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.3)]"><img src={c.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} alt={safeName} className="w-full h-full object-cover" /></div>
                    <div><h4 className="font-black text-xl sm:text-2xl tracking-tight">{firstName}</h4><p className="text-[10px] text-[#fe9a00] uppercase font-black tracking-widest mt-1">{c.role || 'Creator'}</p></div>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8">{c.bio || '...'}</p>
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {c.twitter_url && <a href={c.twitter_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Twitter</a>}
                    {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Instagram</a>}
                  </div>
                  {c.support_url && (<button onClick={() => window.open(c.support_url, '_blank')} className="flex items-center justify-center gap-2 w-full sm:w-auto border-2 border-[#fe9a00] text-[#fe9a00] px-8 py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black transition-colors"><Heart className="w-4 h-4" /> Support {firstName}</button>)}
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
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-white transition-colors">
                Back to Top
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};