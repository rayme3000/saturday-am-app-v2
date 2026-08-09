import { useState, useEffect } from 'react';
import { Heart, Search, ChevronRight, ArrowLeft, Play } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- CSS PATTERN GENERATOR (Synced from Browse/Home) ---
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

const Favorites = ({ setActiveTab, onNavigate }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [myFaves, setMyFaves] = useState<any[]>([]); 
  const [recentReads, setRecentReads] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const suggestedSeries = seriesList.slice(0, 4);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).maybeSingle();
      if (profile?.favorites && seriesList.length > 0) {
        const faves = seriesList.filter((s: any) => profile.favorites.includes(s.slug));
        setMyFaves(faves);
      }

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

          const [chaptersResponse, magazinesResponse] = await Promise.all([
            supabase.from('chapters').select('id, series_slug, chapter_number, title, thumbnail_url').in('id', chapterIds),
            supabase.from('magazines').select('*').in('id', chapterIds)
          ]);

          if (chaptersResponse.data) chapters = chaptersResponse.data;
          if (magazinesResponse.data) magazines = magazinesResponse.data;

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
    <div className="min-h-screen bg-transparent text-white pb-24 relative">
      
      {/* GLOBAL BACKDROP */}
      <div className="fixed inset-0 z-[-1] bg-black">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden" />
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-zinc-800 mb-8">
        <button 
          onClick={() => setActiveTab('home')} 
          className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white pr-16">
          My Faves
        </h1>
      </div>

      <div className="px-4">
        {currentUser && recentReads.length > 0 && (
          <div className="mb-12 animate-fade-in border-b border-zinc-800/50 pb-8 bg-black/40 backdrop-blur-sm p-4 rounded-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#fe9a00] mb-4 px-2">Jump Back In</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
              {recentReads.map((read) => (
                <div 
                  key={read.id} 
                  onClick={() => onNavigate ? onNavigate(read.target) : null} 
                  className="relative min-w-[140px] w-[140px] md:min-w-[180px] md:w-[180px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] hover:shadow-[8px_8px_0px_0px_#fe9a00] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex-shrink-0 mb-3"
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

        {myFaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 mb-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
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
            {myFaves.map((s: any) => (
              <div 
                key={s.id} 
                className="flex-shrink-0 cursor-pointer group/card"
                onClick={() => onNavigate ? onNavigate(s) : null}
              >
                {/* DYNAMIC CARD ALIGNMENT UPDATED HERE */}
                <div 
                  className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] group-hover/card:shadow-[8px_8px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3"
                  style={getPatternStyle(s.card_color, s.card_pattern)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                  
                  <img 
                    src={s.character_url || s.cover_url} 
                    alt={`${s.title} Character`} 
                    loading="lazy"
                    decoding="async"
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
                      loading="lazy"
                      decoding="async"
                      className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                      style={{ width: `${s.logo_scale ?? 100}%` }}
                    />
                  </div>
                </div>
                <div className="px-1 text-left bg-black/40 backdrop-blur-[2px] rounded-lg mt-1 p-1">
                  <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                    {s.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {suggestedSeries.length > 0 && (
          <div className="mt-8 bg-black/40 backdrop-blur-sm p-4 rounded-xl">
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
            
            <div className="flex overflow-x-auto gap-3 pb-4 scroll-smooth snap-x no-scrollbar">
              {suggestedSeries.map((s: any) => (
                <div 
                  key={s.id} 
                  className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card"
                  onClick={() => onNavigate ? onNavigate(s) : null}
                >
                  {/* DYNAMIC CARD ALIGNMENT UPDATED HERE */}
                  <div 
                    className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] group-hover/card:shadow-[8px_8px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3"
                    style={getPatternStyle(s.card_color, s.card_pattern)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                    
                    <img 
                      src={s.character_url || s.cover_url} 
                      alt={`${s.title} Character`} 
                      loading="lazy"
                      decoding="async"
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
                        loading="lazy"
                        decoding="async"
                        className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                        style={{ width: `${s.logo_scale ?? 100}%` }}
                      />
                    </div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;