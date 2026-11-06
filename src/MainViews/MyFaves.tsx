import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, ArrowLeft, Play, Library, ChevronLeft } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';
import { isChapterReleasedForUser, isActiveOneShotWednesday } from '../oneshotWednesday';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const getPatternStyle = (color: string, pattern: string) => {
  const baseColor = color || '#18181b';
  const overlay = 'rgba(0,0,0,0.2)';
  if (pattern === 'dots') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(${overlay} 2px, transparent 2px)`, backgroundSize: '12px 12px' };
  if (pattern === 'lines') return { backgroundColor: baseColor, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${overlay} 5px, ${overlay} 10px)` };
  if (pattern === 'grid') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(${overlay} 1px, transparent 1px), linear-gradient(90deg, ${overlay} 1px, transparent 1px)`, backgroundSize: '20px 20px' };
  if (pattern === 'pinstripes') return { backgroundColor: baseColor, backgroundImage: `repeating-linear-gradient(45deg, ${overlay} 0, ${overlay} 1px, transparent 1px, transparent 8px)` };
  if (pattern === 'mesh') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(${overlay} 1px, transparent 1px), linear-gradient(90deg, ${overlay} 1px, transparent 1px)`, backgroundSize: '14px 14px' };
  if (pattern === 'glow') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 70%)` };
  if (pattern === 'cut') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.04) 50%, transparent 50%)` };
  return { backgroundColor: baseColor };
};

export const Favorites = ({ userTier = 'visitor', setActiveTab, onNavigate }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [myFaves, setMyFaves] = useState<any[]>([]);
  const [recentReads, setRecentReads] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const isPlusSubscriber = userTier === 'premium';
  const suggestedSeries = seriesList.filter((s: any) => !s.is_hidden).slice(0, 5);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from('profiles').select('favorites, is_premium').eq('id', user.id).maybeSingle(),
      supabase.from('reading_history').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
    ]);

    const isPlus = isPlusSubscriber || Boolean(profile?.is_premium);

    if (profile?.favorites && Array.isArray(profile.favorites) && seriesList.length > 0) {
      const { data: chapterData } = await supabase
        .from('chapters')
        .select('series_slug, id, publish_at, is_published')
        .eq('is_published', true);

      const faves = seriesList
        .filter((s: any) => !s.is_hidden && profile.favorites.includes(s.slug))
        .map((s: any) => {
          const isFreeOsw = isActiveOneShotWednesday(s, seriesList);
          // Only count chapters that have actually released for this user tier!
          const releasedChapters = (chapterData || []).filter(
            (c: any) =>
              c.series_slug === s.slug &&
              c.is_published &&
              (isFreeOsw || isChapterReleasedForUser(c.publish_at, isPlus))
          );
          const readChaptersForSeries = (history || []).filter((h: any) =>
            releasedChapters.some((sc: any) => String(sc.id) === String(h.chapter_id))
          );

          const clearedCount = parseInt(localStorage.getItem(`cleared_updates_${s.slug}`) || '0', 10);
          const hasUpdate =
            releasedChapters.length > readChaptersForSeries.length &&
            releasedChapters.length > clearedCount;

          return {
            ...s,
            has_update: hasUpdate,
            current_chapter_count: releasedChapters.length
          };
        });

      setMyFaves(faves);
      setActiveIndex(prev => (faves.length > 0 ? Math.min(prev, faves.length - 1) : 0));
    } else {
      setMyFaves([]);
    }

    if (history && history.length > 0 && seriesList.length > 0) {
      const recentLimit = history.slice(0, 12);
      const chapterIds = recentLimit.map((h: any) => h.chapter_id).filter(Boolean);

      if (chapterIds.length > 0) {
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, series_slug, chapter_number, title, thumbnail_url, is_published')
          .in('id', chapterIds)
          .eq('is_published', true);

        const chapters = chaptersData || [];
        const seenSeriesSlugs = new Set<string>();

        const combined = recentLimit
          .map((h: any) => {
            const chap = chapters.find((c: any) => String(c.id) === String(h.chapter_id));
            if (!chap) return null;
            const series = seriesList.find((s: any) => s.slug === chap.series_slug && !s.is_hidden);
            if (!series || seenSeriesSlugs.has(series.slug)) return null;
            seenSeriesSlugs.add(series.slug);

            return {
              ...h,
              type: 'series',
              target: {
                ...series,
                autoOpenChapterId: chap.id,
                autoOpenPage: h.page_index || 0
              },
              title: series.title,
              subtitle: `Ch. ${chap.chapter_number}`,
              image: chap.thumbnail_url || series.cover_url
            };
          })
          .filter(Boolean);

        setRecentReads(combined);
      }
    }
  }, [seriesList, isPlusSubscriber]);

  useEffect(() => {
    fetchUserData();
    window.addEventListener('seriesUpdated', fetchUserData);
    window.addEventListener('vaultUpdated', fetchUserData);
    window.addEventListener('progressUpdated', fetchUserData);
    return () => {
      window.removeEventListener('seriesUpdated', fetchUserData);
      window.removeEventListener('vaultUpdated', fetchUserData);
      window.removeEventListener('progressUpdated', fetchUserData);
    };
  }, [fetchUserData]);

  const handleSeriesClick = (s: any) => {
    if (s.has_update) {
      localStorage.setItem(`cleared_updates_${s.slug}`, String(s.current_chapter_count || 0));
      setMyFaves(prev =>
        prev.map(fave => (fave.slug === s.slug ? { ...fave, has_update: false } : fave))
      );
    }
    if (onNavigate) onNavigate(s);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50 && activeIndex < myFaves.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else if (distance < -50 && activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
    setTouchStartX(0);
    setTouchEndX(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-[#fe9a00] flex items-center justify-center font-black tracking-widest uppercase text-xs">
        Loading Bookshelf...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-32 relative overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-zinc-800 mb-8">
        <button
          onClick={() => setActiveTab('home')}
          className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white pr-16">
          My Bookshelf
        </h1>
      </div>

      <div className="px-4 max-w-6xl mx-auto">
        {myFaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 mb-12 bg-zinc-900/60 rounded-2xl border border-zinc-800/80">
            <Library className="w-16 h-16 text-zinc-700 mb-4" strokeWidth={1.5} />
            <h2 className="text-xl font-bold mb-2">Nothing saved yet!</h2>
            <p className="text-zinc-400 text-sm mb-8 max-w-[260px]">
              Bookmark your favorite series to track new chapter drops right from your Bookshelf.
            </p>
            <button
              onClick={() => setActiveTab('browse')}
              className="flex items-center gap-2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 px-6 rounded-xl hover:bg-white transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Browse Series
            </button>
          </div>
        ) : (
          <div className="mb-12">
            <div
              className="relative h-[340px] sm:h-[460px] w-full flex items-center justify-center overflow-visible"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {myFaves.map((s, idx) => {
                const offset = idx - activeIndex;
                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;

                let transformStyle = '';
                let zIndex = 10;
                let opacity = 'opacity-100';

                if (isCenter) {
                  transformStyle = 'translateX(0) scale(1)';
                  zIndex = 30;
                } else if (isLeft) {
                  transformStyle = 'translateX(-55%) scale(0.85)';
                  zIndex = 20;
                  opacity = 'opacity-45';
                } else if (isRight) {
                  transformStyle = 'translateX(55%) scale(0.85)';
                  zIndex = 20;
                  opacity = 'opacity-45';
                } else {
                  transformStyle = offset < 0 ? 'translateX(-100%) scale(0.6)' : 'translateX(100%) scale(0.6)';
                  zIndex = 0;
                  opacity = 'opacity-0';
                }

                return (
                  <div
                    key={s.id || s.slug}
                    className={`absolute flex flex-col items-center transition-all duration-500 ease-out w-[300px] sm:w-[460px] ${opacity} ${
                      !isCenter ? 'pointer-events-none' : ''
                    }`}
                    style={{ transform: transformStyle, zIndex }}
                  >
                    <div
                      className={`relative w-full h-[180px] sm:h-[260px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
                        isCenter
                          ? 'cursor-pointer border-[3px] border-[#fe9a00] shadow-[0_0_30px_rgba(254,154,0,0.3)]'
                          : 'border border-zinc-700'
                      }`}
                      onClick={() => isCenter && handleSeriesClick(s)}
                    >
                      <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover" />
                      {s.has_update && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-xl z-40 animate-pulse border border-red-400">
                          New Chapter
                        </div>
                      )}
                    </div>

                    <div
                      className={`mt-4 sm:mt-6 flex flex-col items-center w-full transition-all duration-500 ${
                        isCenter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                    >
                      {s.logo_url ? (
                        <img
                          src={s.logo_url}
                          alt={s.title}
                          className="max-w-[200px] sm:max-w-[250px] max-h-12 sm:max-h-16 object-contain drop-shadow-md"
                        />
                      ) : (
                        <h3 className="text-white font-black italic text-xl uppercase tracking-tighter text-center">
                          {s.title}
                        </h3>
                      )}

                      <button
                        onClick={() => isCenter && handleSeriesClick(s)}
                        className={`mt-4 bg-[#fe9a00] text-black text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-full hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.4)] cursor-pointer ${
                          isCenter ? 'pointer-events-auto' : 'pointer-events-none'
                        }`}
                      >
                        Read Series
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {myFaves.length > 1 && (
              <div className="flex justify-center items-center gap-6 mt-4">
                <button
                  onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  className={`p-3 bg-zinc-900 rounded-full border border-zinc-700 transition-colors cursor-pointer ${
                    activeIndex === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00]'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {myFaves.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === activeIndex ? 'bg-[#fe9a00]' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveIndex(Math.min(myFaves.length - 1, activeIndex + 1))}
                  disabled={activeIndex === myFaves.length - 1}
                  className={`p-3 bg-zinc-900 rounded-full border border-zinc-700 transition-colors cursor-pointer ${
                    activeIndex === myFaves.length - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00]'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {currentUser && recentReads.length > 0 && (
          <div className="mb-12 animate-fade-in border border-zinc-800/70 bg-black/50 p-4 rounded-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#fe9a00] mb-4 px-2">
              Jump Back In
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
              {recentReads.map(read => (
                <div
                  key={read.id}
                  onClick={() => (onNavigate ? onNavigate(read.target) : null)}
                  className="relative min-w-[140px] w-[140px] md:min-w-[175px] md:w-[175px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group border border-white shadow-[5px_5px_0px_0px_#fe9a00] hover:shadow-[8px_8px_0px_0px_#fe9a00] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex-shrink-0 mb-2"
                >
                  <img
                    src={read.image}
                    alt={read.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3 z-10">
                    <h3 className="text-white font-black uppercase text-xs md:text-sm leading-tight line-clamp-1 drop-shadow-md">
                      {read.title}
                    </h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[#fe9a00] font-bold text-[9px] md:text-[10px] uppercase tracking-widest drop-shadow-md">
                        {read.subtitle}
                      </p>
                      <p className="text-zinc-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest bg-black/70 px-1.5 py-0.5 rounded border border-zinc-700">
                        Pg. {(read.page_index || 0) + 1}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                    <div className="w-12 h-12 rounded-full bg-[#fe9a00] flex items-center justify-center shadow-[0_0_20px_rgba(254,154,0,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {suggestedSeries.length > 0 && (
          <div className="mb-12 bg-black/50 p-4 rounded-2xl border border-zinc-800/70">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black italic uppercase tracking-tight text-zinc-200">
                Suggested Series
              </h3>
              <button
                onClick={() => setActiveTab('browse')}
                className="text-[#fe9a00] flex items-center text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
              >
                See All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-4 scroll-smooth snap-x no-scrollbar">
              {suggestedSeries.map((s: any) => (
                <div
                  key={s.id || s.slug}
                  className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card"
                  onClick={() => (onNavigate ? onNavigate(s) : null)}
                >
                  <div
                    className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] border border-white shadow-[5px_5px_0px_0px_#fe9a00] group-hover/card:shadow-[8px_8px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3"
                    style={getPatternStyle(s.card_color, s.card_pattern)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                    <img
                      src={s.character_url || s.cover_url}
                      alt={`${s.title} Character`}
                      loading="lazy"
                      decoding="async"
                      className={`absolute left-1/2 -translate-x-1/2 max-w-none object-contain transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 ${
                        s.character_align === 'top'
                          ? 'top-0'
                          : s.character_align === 'center'
                          ? 'top-1/2 -translate-y-1/2'
                          : 'bottom-0'
                      }`}
                      style={{ width: `${s.character_scale || 140}%`, height: '120%' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
                    <div
                      className="absolute left-0 right-0 flex justify-center z-30 px-3 transition-all duration-300"
                      style={{ bottom: `${s.logo_offset ?? 16}px` }}
                    >
                      <img
                        src={
                          s.logo_url ||
                          (s.title === 'Apple Black'
                            ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png`
                            : '')
                        }
                        alt={`${s.title} Logo`}
                        loading="lazy"
                        decoding="async"
                        className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                        style={{ width: `${s.logo_scale ?? 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="px-1 text-left bg-black/50 rounded-lg mt-1 p-1.5">
                    <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                      {s.creator_name || 'Saturday AM'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;