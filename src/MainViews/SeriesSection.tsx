import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- CSS PATTERN GENERATOR ---
const getPatternStyle = (color: string, pattern: string) => {
  const baseColor = color || '#18181b';
  const overlay = 'rgba(0,0,0,0.2)'; 
  if (pattern === 'dots') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(${overlay} 2px, transparent 2px)`, backgroundSize: '12px 12px' };
  if (pattern === 'lines') return { backgroundColor: baseColor, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${overlay} 5px, ${overlay} 10px)` };
  if (pattern === 'grid') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(${overlay} 1px, transparent 1px), linear-gradient(90deg, ${overlay} 1px, transparent 1px)`, backgroundSize: '20px 20px' };
  return { backgroundColor: baseColor }; 
};

export const SeriesSection = ({ title, series, onSeriesClick }: any) => {
  const scrollRef = useRef(null);

  const scroll = (direction: string) => {
    if (scrollRef.current) {
      const { current } = scrollRef as any;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-10 relative group">
      
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 transform -skew-x-[16deg] h-6 ml-1">
          <div className="w-2.5 h-full bg-[#fe9a00]"></div>
          <div className="w-1 h-full bg-[#fe9a00] opacity-40"></div>
        </div>
        <h2 className="text-xl font-black text-white tracking-wider text-left">
          {title}
        </h2>
      </div>

      <div className="relative">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll('left');
          }}
          className="absolute left-0 top-0 bottom-8 z-50 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 pt-1 scroll-smooth snap-x no-scrollbar">
          {series.map((s: any) => (
            <div key={s.id} className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onSeriesClick(s)}>
              
              {/* --- 1px NEO-BRUTALIST SERIES CARD --- */}
              <div 
                className="relative overflow-hidden rounded-lg cursor-pointer aspect-[2/3] border border-white/70 shadow-[4px_4px_0px_0px_#fe9a00] group-hover/card:shadow-[6px_6px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3"
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll('right');
          }}
          className="absolute right-0 top-0 bottom-8 z-50 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-l from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};