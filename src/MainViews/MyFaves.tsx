import { useState, useEffect } from 'react';
import { Heart, Search, ChevronRight, ArrowLeft, Play } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';

const Favorites = ({ setActiveTab, onNavigate }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [myFaves, setMyFaves] = useState<any[]>([]); 
  const [recentReads, setRecentReads] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const suggestedSeries = seriesList.slice(0, 4);
  const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

  // --- FETCH ACTUAL FAVORITES & RECENT READS ---
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // 1. Fetch User Profile & Favorites
      const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).maybeSingle();
      if (profile?.favorites && seriesList.length > 0) {
        const faves = seriesList.filter((s: any) => profile.favorites.includes(s.slug));
        setMyFaves(faves);
      }

      // 2. Fetch Recently Read History
      try {
        const { data: history } = await supabase
          .from('reading_history')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (history && history.length > 0) {
          const chapterIds = history.map((h: any) => h.chapter_id);

          let chapters: any[] = [];
          let magazines: any[] = [];

          const { data: chData } = await supabase.from('chapters').select('id, series_slug, chapter_number, title, thumbnail_url').in('id', chapterIds);
          if (chData) chapters = chData;

          const { data: magData } = await supabase.from('magazines').select('*').in('id', chapterIds);
          if (magData) magazines = magData;

          const combined = history.map((h: any) => {
            const chap = chapters.find((c: any) => String(c.id) === String(h.chapter_id));
            const mag = magazines.find((m: any) => String(m.id) === String(h.chapter_id));
            
            if (chap) {
              const series = seriesList.find((s: any) => s.slug === chap.series_slug);
              if (!series) return null;
              return { ...h, type: 'series', target: series, title: series.title, subtitle: `Chapter ${chap.chapter_number}`, image: chap.thumbnail_url || series.cover_url };
            } else if (mag) {
              const magTarget = { ...mag, publish_date: mag.publish_date || mag.publish_at };
              return { ...h, type: 'magazine', target: magTarget, title: mag.title, subtitle: `Magazine Issue`, image: mag.cover_url };
            }
            return null;
          }).filter(Boolean);
          
          setRecentReads(combined);
        }
      } catch (err: any) { 
        console.error("Error fetching recent reads:", err.message); 
      }
    };

    fetchUserData();
  }, [seriesList]);

  if (isLoading) return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest">Loading Vault...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-24 pt-6 px-4">
      {/* BACK BUTTON */}
      <button 
        onClick={() => setActiveTab('home')} 
        className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-8 border-b border-zinc-800 pb-4">
        My Faves
      </h1>

      {/* --- JUMP BACK IN CAROUSEL --- */}
      {currentUser && recentReads.length > 0 && (
        <div className="mb-12 animate-fade-in border-b border-zinc-800/50 pb-8">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#fe9a00] mb-4 px-2">Jump Back In</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
            {recentReads.map((read) => (
              <div 
                key={read.id} 
                onClick={() => onNavigate ? onNavigate(read.target) : null} 
                className="relative min-w-[140px] w-[140px] md:min-w-[180px] md:w-[180px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group border border-zinc-800 hover:border-[#fe9a00] transition-all shadow-lg flex-shrink-0"
              >
                <img src={read.image} alt={read.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3 z-10">
                  <h3 className="text-white font-black uppercase text-xs md:text-sm leading-tight line-clamp-1 drop-shadow-md">{read.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[#fe9a00] font-bold text-[9px] md:text-[10px] uppercase tracking-widest drop-shadow-md">{read.subtitle}</p>
                    <p className="text-zinc-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded border border-zinc-700 backdrop-blur-sm">Pg. {read.page_index + 1}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#fe9a00] flex items-center justify-center shadow-[0_0_20px_rgba(254,154,0,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-5 h-5 md:w-6 md:h-6 text-black ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE CONDITION */}
      {myFaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 mb-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <Heart className="w-16 h-16 text-zinc-700 mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold mb-2">Nothing here!</h2>
          <p className="text-zinc-400 text-sm mb-8 max-w-[250px]">
            Let's go find your next new favorite manga.
          </p>
          <button 
            onClick={() => setActiveTab('browse')}
            className="flex items-center gap-2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 px-6 rounded hover:bg-white transition-colors"
          >
            <Search className="w-4 h-4" />
            Browse Series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
          {/* MAP ACTUAL FAVORITES */}
          {myFaves.map((s: any) => (
            <div 
              key={s.id} 
              className="flex-shrink-0 cursor-pointer group/card"
              onClick={() => onNavigate ? onNavigate(s) : null}
            >
              <div className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] bg-zinc-900 border border-zinc-800 shadow-lg group-hover/card:border-[#fe9a00]/50 transition-colors duration-300 mb-2">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
                <img 
                  src={s.character_url || s.cover_url} 
                  alt={`${s.title} Character`} 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4"
                />
                <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-3">
                  <img 
                    src={s.logo_url || (s.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                    alt={`${s.title} Logo`} 
                    className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" 
                  />
                </div>
              </div>
              <div className="px-1 text-left">
                <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                  {s.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUGGESTED SERIES BLOCK */}
      {suggestedSeries.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black italic uppercase tracking-tight text-zinc-300">
              Suggested Series
            </h3>
            <button 
              onClick={() => setActiveTab('browse')}
              className="text-[#fe9a00] flex items-center text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {/* Horizontal Scroll Container */}
          <div className="flex overflow-x-auto gap-3 pb-4 scroll-smooth snap-x no-scrollbar">
            {suggestedSeries.map((s: any) => (
              <div 
                key={s.id} 
                className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card"
                onClick={() => onNavigate ? onNavigate(s) : null}
              >
                <div className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] bg-zinc-900 border border-zinc-800 shadow-lg group-hover/card:border-[#fe9a00]/50 transition-colors duration-300 mb-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
                  <img 
                    src={s.character_url || s.cover_url} 
                    alt={`${s.title} Character`} 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-3">
                    <img 
                      src={s.logo_url || (s.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                      alt={`${s.title} Logo`} 
                      className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" 
                    />
                  </div>
                </div>
                
                <div className="px-1 text-left">
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
  );
};

export default Favorites;