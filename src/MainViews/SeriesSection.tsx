import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Heart, Clock, Zap } from 'lucide-react';
import { supabase } from '../supabase';
import {
  isCompletedRunSeries,
  isActiveOneShotWednesday,
  isCurrentlyWednesdayEST,
  getWednesdayCountdownEST,
  getNextScheduledChapterBadge
} from '../oneshotWednesday';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const getPatternStyle = (color: string, pattern: string) => {
  const baseColor = color || '#18181b';
  const overlay = 'rgba(0,0,0,0.2)'; 
  if (pattern === 'dots') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(${overlay} 2px, transparent 2px)`, backgroundSize: '12px 12px' };
  if (pattern === 'lines') return { backgroundColor: baseColor, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${overlay} 5px, ${overlay} 10px)` };
  if (pattern === 'grid') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(${overlay} 1px, transparent 1px), linear-gradient(90deg, ${overlay} 1px, transparent 1px)`, backgroundSize: '20px 20px' };
  return { backgroundColor: baseColor }; 
};

const isNewItem = (createdAt: string | undefined) => {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
};

export const SeriesSection = ({ title, series, onSeriesClick, currentUser, userTier, nextScheduledBySeries = {}, onRequireAuth }: any) => {
  const scrollRef = useRef(null);
  const [localLikes, setLocalLikes] = useState<Record<string, boolean>>({});
  const [earliestNextDropMap, setEarliestNextDropMap] = useState<Record<string, string>>({});
  const [countdownText, setCountdownText] = useState<string>(() => getWednesdayCountdownEST());

  // PLUS subscribers never see any One-Shot Wednesday countdowns, glows, or PLUS Vault tags
  const isPlusSubscriber = userTier === 'premium' || Boolean(currentUser?.is_premium);

  const seriesSlugs = useMemo(() => series?.map((s: any) => s.slug).join(',') || '', [series]);

  // Fetch the SOONEST (minimum) future publish_at per series directly so a later queued chapter never overwrites this week's drop
  useEffect(() => {
    if (!seriesSlugs) return;
    const slugs = seriesSlugs.split(',').filter(Boolean);
    if (slugs.length === 0) return;

    const fetchEarliestDrops = async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('chapters')
        .select('series_slug, publish_at, chapter_number')
        .in('series_slug', slugs)
        .gt('publish_at', nowIso)
        .order('publish_at', { ascending: true });

      if (error || !data) return;

      const earliestMap: Record<string, string> = {};
      data.forEach((row: any) => {
        if (!row.series_slug || !row.publish_at) return;
        if (!earliestMap[row.series_slug]) {
          earliestMap[row.series_slug] = row.publish_at;
        } else if (new Date(row.publish_at).getTime() < new Date(earliestMap[row.series_slug]).getTime()) {
          earliestMap[row.series_slug] = row.publish_at;
        }
      });
      setEarliestNextDropMap(earliestMap);
    };

    fetchEarliestDrops();
    window.addEventListener('seriesUpdated', fetchEarliestDrops);
    window.addEventListener('vaultUpdated', fetchEarliestDrops);
    return () => {
      window.removeEventListener('seriesUpdated', fetchEarliestDrops);
      window.removeEventListener('vaultUpdated', fetchEarliestDrops);
    };
  }, [seriesSlugs]);

  // Automatically move the active One-Shot Wednesday title to the #1 position on Wednesdays for non-PLUS users
  const sortedSeries = useMemo(() => {
    if (!series || series.length === 0) return [];
    if (isPlusSubscriber || title !== 'Completed Runs' || !isCurrentlyWednesdayEST()) {
      return series;
    }

    return [...series].sort((a: any, b: any) => {
      const aIsSpotlight = isActiveOneShotWednesday(a, series);
      const bIsSpotlight = isActiveOneShotWednesday(b, series);
      if (aIsSpotlight && !bIsSpotlight) return -1;
      if (!aIsSpotlight && bIsSpotlight) return 1;
      return 0;
    });
  }, [series, isPlusSubscriber, title]);

  // Live 1-second countdown ticker (only runs on Wednesdays for non-PLUS users in Completed Runs)
  useEffect(() => {
    if (isPlusSubscriber || title !== 'Completed Runs' || !isCurrentlyWednesdayEST()) return;
    setCountdownText(getWednesdayCountdownEST());
    const interval = setInterval(() => {
      setCountdownText(getWednesdayCountdownEST());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlusSubscriber, title]);

  useEffect(() => {
    if (!currentUser?.id || !seriesSlugs) return;
    
    const fetchLikes = async () => {
      const slugs = seriesSlugs.split(',').filter(Boolean);
      if (slugs.length === 0) return;

      const { data, error } = await supabase.from('series_likes').select('series_slug').eq('user_id', currentUser.id).in('series_slug', slugs);
      
      if (error) {
        console.error("Fetch likes error:", error.message);
        return;
      }

      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((row: any) => { map[row.series_slug] = true; });
        setLocalLikes(map);
      }
    };
    fetchLikes();
  }, [currentUser?.id, seriesSlugs]);

  const scroll = (direction: string) => {
    if (scrollRef.current) {
      const { current } = scrollRef as any;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleToggleLike = (e: React.MouseEvent, seriesSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser?.id) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    
    const currentlyLiked = localLikes[seriesSlug];
    const newLikedState = !currentlyLiked;
    
    setLocalLikes(prev => ({ ...prev, [seriesSlug]: newLikedState }));

    const syncWithDatabase = async () => {
      try {
        if (currentlyLiked) {
          await supabase.from('series_likes').delete().match({ user_id: currentUser.id, series_slug: seriesSlug });
        } else {
          await supabase.from('series_likes').insert([{ user_id: currentUser.id, series_slug: seriesSlug }]);
        }

        const { data } = await supabase.from('profiles').select('fandom_score').eq('id', currentUser.id).maybeSingle();
        
        if (data) {
          const newScore = newLikedState 
            ? (data.fandom_score || 0) + 1 
            : Math.max(0, (data.fandom_score || 0) - 1);

          await supabase.from('profiles').update({ fandom_score: newScore }).eq('id', currentUser.id);
          window.dispatchEvent(new Event('profileUpdated'));
        }
      } catch (err: any) {
        console.error("Silently caught like error:", err.message);
      }
    };

    syncWithDatabase();
  };

  if (!series || series.length === 0) return null;

  return (
    <div className="mb-10 relative group">
      <style>{`
        @keyframes oneshot-wednesday-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(254, 154, 0, 0.75), 0 0 30px rgba(254, 154, 0, 0.35), 4px 4px 0px 0px #fe9a00;
            border-color: #fe9a00;
          }
          50% {
            box-shadow: 0 0 28px rgba(254, 154, 0, 1), 0 0 50px rgba(239, 68, 68, 0.55), 4px 4px 0px 0px #ffffff;
            border-color: #ffffff;
          }
        }
        .animate-oneshot-card-glow {
          animation: oneshot-wednesday-glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-5 h-5 text-[#fe9a00] ml-1" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="0,0 8,0 8,24 0,24" />
          <polygon points="10,0 24,0 24,14 10,8" />
          <polygon points="10,10 24,16 24,24 10,24" />
        </svg>
        <h2 className="text-xl font-black text-white tracking-wider text-left">
          {title}
        </h2>
      </div>

      <div className="relative">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); scroll('left'); }}
          className="absolute left-0 top-0 bottom-8 z-50 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 pt-2 px-1 scroll-smooth snap-x no-scrollbar">
          {sortedSeries.map((s: any) => {
            const isCompleted = title === 'Completed Runs' || isCompletedRunSeries(s, series);
            const showFreeWednesdayCue = !isPlusSubscriber && isCompleted && isActiveOneShotWednesday(s, series);
            const showPlusVaultTag = !isPlusSubscriber && isCompleted && !showFreeWednesdayCue;

            const candidateFromParent = nextScheduledBySeries[s.slug] || s.next_chapter_publish_at || null;
            const candidateEarliest = earliestNextDropMap[s.slug] || null;
            let nextDropIso = candidateEarliest || candidateFromParent;
            if (candidateEarliest && candidateFromParent) {
              nextDropIso =
                new Date(candidateEarliest).getTime() <= new Date(candidateFromParent).getTime()
                  ? candidateEarliest
                  : candidateFromParent;
            }

            const nextChapterCountdown = !isCompleted ? getNextScheduledChapterBadge(nextDropIso, isPlusSubscriber) : null;

            return (
              <div key={s.id || s.slug} className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onSeriesClick(s)}>
                
                <div 
                  className={`relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] transition-all duration-300 mb-3 bg-black ${
                    showFreeWednesdayCue
                      ? 'border-2 border-[#fe9a00] animate-oneshot-card-glow group-hover/card:-translate-y-1.5'
                      : 'border border-white/70 shadow-[4px_4px_0px_0px_#fe9a00] group-hover/card:shadow-[6px_6px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1'
                  }`}
                  style={getPatternStyle(s.card_color, s.card_pattern)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />

                  {showFreeWednesdayCue && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#fe9a00]/30 via-transparent to-[#fe9a00]/20 z-10 pointer-events-none animate-pulse" />
                  )}
                  
                  <img 
                    src={s.character_url || s.cover_url} 
                    alt={`${s.title} Character`} 
                    className={`absolute left-1/2 -translate-x-1/2 max-w-none object-contain transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 ${
                      s.character_align === 'top' ? 'top-0' : 
                      s.character_align === 'center' ? 'top-1/2 -translate-y-1/2' : 
                      'bottom-0'
                    }`}
                    style={{ width: `${s.character_scale || 140}%`, height: '120%' }}
                  />
                  
                  <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
                  
                  <div 
                    className="absolute left-0 right-0 flex justify-center z-30 px-3 transition-all duration-300"
                    style={{ bottom: `${showFreeWednesdayCue ? Math.max(26, (s.logo_offset ?? 16) + 10) : (s.logo_offset ?? 16)}px` }}
                  >
                    <img 
                      src={s.logo_url || (s.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                      alt={`${s.title} Logo`} 
                      className="max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                      style={{ width: `${s.logo_scale ?? 100}%` }}
                    />
                  </div>

                  {/* TOP BADGE: ONE-SHOT WEDNESDAY, PLUS VAULT, NEXT CH COUNTDOWN, OR NEW */}
                  {showFreeWednesdayCue ? (
                    <div className="absolute top-1.5 left-1.5 right-8 z-40 flex flex-col gap-0.5 pointer-events-none">
                      <div className="bg-gradient-to-r from-[#fe9a00] via-yellow-400 to-[#fe9a00] text-black text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded sm:rounded-b-none sm:rounded-t shadow-[0_0_12px_rgba(254,154,0,0.9)] flex items-center gap-0.5 sm:gap-1 w-max max-w-full">
                        <Zap className="w-2.5 h-2.5 fill-black shrink-0" />
                        <span className="sm:hidden">FREE</span>
                        <span className="hidden sm:inline truncate">FREE TODAY</span>
                      </div>
                      <div className="hidden sm:flex bg-black/90 backdrop-blur-md border border-[#fe9a00] text-[#fe9a00] text-[8px] font-mono font-black uppercase tracking-tight px-1.5 py-0.5 rounded-b shadow-lg items-center gap-1 w-max max-w-full">
                        <Clock className="w-2.5 h-2.5 text-red-500 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
                        <span>{countdownText}</span>
                      </div>
                    </div>
                  ) : showPlusVaultTag ? (
                    <div className="absolute top-1 left-1 z-40 bg-purple-900/90 text-purple-200 border border-purple-400/50 text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                      PLUS VAULT
                    </div>
                  ) : nextChapterCountdown ? (
                    <div className={`hidden sm:flex absolute top-1.5 left-1.5 z-40 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg pointer-events-none items-center gap-1 ${
                      nextChapterCountdown.isSoon
                        ? 'bg-[#fe9a00] text-black animate-pulse'
                        : 'bg-black/85 backdrop-blur-md text-[#fe9a00] border border-[#fe9a00]/60'
                    }`}>
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>{nextChapterCountdown.badgeText}</span>
                    </div>
                  ) : (
                    isNewItem(s.created_at) && (
                      <div className="absolute top-1 left-1 z-40 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse pointer-events-none">
                        NEW!
                      </div>
                    )
                  )}

                  {showFreeWednesdayCue && (
                    <div className="absolute bottom-0 inset-x-0 z-40 bg-gradient-to-r from-red-600 via-[#fe9a00] to-red-600 text-black text-[7px] sm:text-[8px] font-black uppercase tracking-widest py-1 px-1 text-center shadow-[0_-4px_12px_rgba(254,154,0,0.6)] pointer-events-none truncate">
                      <span className="sm:hidden">READ FREE TODAY</span>
                      <span className="hidden sm:inline">READ NOW • LOCKS AT MIDNIGHT!</span>
                    </div>
                  )}

                  <button 
                    onClick={(e) => handleToggleLike(e, s.slug)}
                    className="absolute top-1 right-1 z-40 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-zinc-800 transition-all shadow-md"
                  >
                    <Heart className={`w-3.5 h-3.5 transition-colors ${localLikes[s.slug] ? 'fill-red-500 text-red-500' : 'text-zinc-400 hover:text-red-400'}`} />
                  </button>
                </div>
                
                <div className="px-1 text-left bg-black/40 backdrop-blur-[2px] rounded-lg mt-1 p-1">
                  <h3 className={`font-bold text-xs truncate tracking-wide transition-colors ${
                    showFreeWednesdayCue ? 'text-[#fe9a00]' : 'text-white group-hover/card:text-[#fe9a00]'
                  }`}>
                    {s.title}
                  </h3>

                  {/* MOBILE (<640px): High-contrast, non-truncated timer pill */}
                  {showFreeWednesdayCue ? (
                    <div className="sm:hidden mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fe9a00]/20 border border-[#fe9a00]/60 text-[#fe9a00] text-[8.5px] font-extrabold uppercase tracking-tight leading-tight whitespace-nowrap max-w-full">
                      <Clock className="w-2.5 h-2.5 shrink-0 text-[#fe9a00]" />
                      <span className="truncate">{countdownText} LEFT</span>
                    </div>
                  ) : nextChapterCountdown ? (
                    <div className={`sm:hidden mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-tight leading-tight whitespace-nowrap max-w-full ${
                      nextChapterCountdown.isSoon
                        ? 'bg-[#fe9a00] text-black shadow-[0_0_10px_rgba(254,154,0,0.5)]'
                        : 'bg-[#fe9a00]/15 border border-[#fe9a00]/50 text-[#fe9a00]'
                    }`}>
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{nextChapterCountdown.shortText}</span>
                    </div>
                  ) : (
                    <p className="sm:hidden text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                      {s.creator_name || 'Saturday AM'}
                    </p>
                  )}

                  {/* PC / TABLET (>=640px): Untouched original layout */}
                  <p className="hidden sm:block text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                    {showFreeWednesdayCue
                      ? `⏳ ${countdownText} left`
                      : nextChapterCountdown
                      ? `⏳ ${nextChapterCountdown.shortText}`
                      : (s.creator_name || 'Saturday AM')}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); scroll('right'); }}
          className="absolute right-0 top-0 bottom-8 z-50 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-l from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};