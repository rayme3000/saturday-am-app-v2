import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

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
      
      {/* Double Slanted Accent */}
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
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 scroll-smooth snap-x no-scrollbar">
          {series.map((s: any) => (
            <div key={s.id} className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onSeriesClick(s)}>
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

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-l from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};