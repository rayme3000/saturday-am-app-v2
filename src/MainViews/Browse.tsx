import { useState, useMemo } from 'react';
import { useSeriesData } from '../userSeriesData';
import { Search, Library } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- CSS PATTERN GENERATOR ---
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

const Browse = ({ onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- UPDATED: Sort Series A-Z & Filter out Hidden Series ---
  const sortedSeries = useMemo(() => {
    const filtered = seriesList.filter((s: any) =>
      !s.is_hidden && s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [seriesList, searchQuery]);

  const activeData = sortedSeries;

  return (
    <div className="min-h-screen bg-transparent text-white pb-24 relative px-4 pt-6">

      {/* Fixed Header & Search */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl pb-4 pt-2 mb-4 border-b border-zinc-800 rounded-b-2xl px-2">
        
        <div className="flex justify-between items-end mb-4 pr-16 sm:pr-20">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
            The Vault
          </h1>
          <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
            <Library className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {activeData.length} Series
            </span>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#fe9a00] transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* Grid Content */}
      {activeData.length === 0 ? (
        <div className="text-center text-zinc-500 py-16 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-xl mt-8 bg-black/40 backdrop-blur-sm">
          No series found matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6 mt-6 pb-8">
          {activeData.map((item: any) => (
            <div 
              key={item.id} 
              className="flex-shrink-0 cursor-pointer group/card"
              onClick={() => onNavigate(item)}
              onMouseEnter={() => import('./SeriesDetailPage').then(mod => mod.SeriesDetailPage)}
              onTouchStart={() => import('./SeriesDetailPage').then(mod => mod.SeriesDetailPage)}
            >
              {/* --- NEO-BRUTALIST SERIES CARD LAYOUT (1px Border) --- */}
              <div 
                className="relative overflow-hidden rounded-lg aspect-[2/3] border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] group-hover/card:shadow-[8px_8px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3"
                style={getPatternStyle(item.card_color, item.card_pattern)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                <img 
                  src={item.character_url || item.cover_url} 
                  alt={`${item.title} Character`} 
                  loading="lazy"
                  decoding="async"
                  className={`absolute left-1/2 -translate-x-1/2 max-w-none object-contain transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 ${
                    item.character_align === 'top' ? 'top-0' : 
                    item.character_align === 'center' ? 'top-1/2 -translate-y-1/2' : 
                    'bottom-0'
                  }`}
                  style={{ width: `${item.character_scale || 140}%`, height: '120%' }}
                />
                <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
                <div 
                  className="absolute left-0 right-0 flex justify-center z-30 px-3 transition-all duration-300"
                  style={{ bottom: `${item.logo_offset ?? 16}px` }}
                >
                  <img 
                    src={item.logo_url || (item.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                    alt={`${item.title} Logo`} 
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                    style={{ width: `${item.logo_scale ?? 100}%` }}
                  />
                </div>
              </div>
              
              {/* Title & Creator Info */}
              <div className="px-1 text-left bg-black/60 backdrop-blur-[2px] rounded-lg mt-1 p-2 border border-zinc-800/50">
                <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                  {item.title}
                </h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                  {item.creator_name || 'Saturday AM'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;