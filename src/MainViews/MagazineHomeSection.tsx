import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MagazineHomeSection = ({ magazines, onMagazineClick }: any) => {
  const scrollRef = useRef(null);

  const scroll = (direction: string) => {
    if (scrollRef.current) {
      const { current } = scrollRef as any;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!magazines || magazines.length === 0) return null;

  return (
    <div className="mb-10 relative group">
      
      {/* Double Slanted Accent */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 transform -skew-x-[16deg] h-6 ml-1">
          <div className="w-2.5 h-full bg-[#fe9a00]"></div>
          <div className="w-1 h-full bg-[#fe9a00] opacity-40"></div>
        </div>
        <h2 className="text-xl font-black text-white tracking-wider text-left">
          Latest Issues
        </h2>
      </div>

      <div className="relative">
        <button 
          onClick={() => scroll('left')} 
          className="absolute left-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-4 pb-4 pt-1 scroll-smooth snap-x no-scrollbar">
          {magazines.map((m: any) => (
            <div key={m.id} className="w-[45%] sm:w-1/3 md:w-1/4 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onMagazineClick(m)}>
              
              {/* --- NEO-BRUTALIST MAGAZINE CARD --- */}
              <div className="relative overflow-hidden rounded-lg cursor-pointer aspect-[1424/2000] bg-zinc-900 border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] group-hover/card:shadow-[8px_8px_0px_0px_#fe9a00] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300 mb-3">
                <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover transform transition-transform duration-500 group-hover/card:scale-105" />
              </div>
              
              {/* Blurred Text Backdrop */}
              <div className="px-1 text-left bg-black/40 backdrop-blur-[2px] rounded-lg mt-1 p-1">
                <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">{m.title}</h3>
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