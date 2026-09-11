import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { supabase } from '../supabase';

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

export const SeriesSection = ({ title, series, onSeriesClick, currentUser, onRequireAuth }: any) => {
  const scrollRef = useRef(null);
  const [localLikes, setLocalLikes] = useState<Record<string, boolean>>({});

  const seriesSlugs = useMemo(() => series?.map((s: any) => s.slug).join(',') || '', [series]);

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
    
    // Optimistic UI update instantly locks the heart in place without waiting for the DB
    setLocalLikes(prev => ({ ...prev, [seriesSlug]: newLikedState }));

    // Floating background task for DB and Scoring
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

        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 pt-1 scroll-smooth snap-x no-scrollbar">
          {series.map((s: any) => (
            <div key={s.id || s.slug} className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onSeriesClick(s)}>
              
              <div 
                className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] border border-white/70 shadow-[4px_4px_0px_0px_#fe9a00] group-hover/card:shadow-[6px_6px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3 bg-black"
                style={getPatternStyle(s.card_color, s.card_pattern)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                
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
                  style={{ bottom: `${s.logo_offset ?? 16}px` }}
                >
                  <img 
                    src={s.logo_url || (s.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                    alt={`${s.title} Logo`} 
                    className="max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                    style={{ width: `${s.logo_scale ?? 100}%` }}
                  />
                </div>

                {isNewItem(s.created_at) && (
                  <div className="absolute top-1 left-1 z-40 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse pointer-events-none">
                    NEW!
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