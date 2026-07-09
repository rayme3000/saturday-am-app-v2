import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { MangaReader } from './MangaReader';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

export const MagazineDetailPage = ({ magazine, onBack, onMagazineSelect }: any) => {
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null); 
  const [otherMagazines, setOtherMagazines] = useState<any[]>([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchOtherMags = async () => {
      if (!magazine) return;
      const { data } = await supabase.from('magazines').select('*').neq('id', magazine.id).order('publish_date', { ascending: false }).limit(10);
      if (data) setOtherMagazines(data);
    };
    fetchOtherMags();
  }, [magazine]);

  if (!magazine) return null;

  const isPM = magazine.brand === 'PM';
  const primaryColor = isPM ? '#ff000b' : '#fe9a00';
  const brutalistShadow = isPM ? '20px 20px 0px rgba(255,0,11,0.2)' : '20px 20px 0px rgba(254,154,0,0.2)';
  
  const previewPages = (magazine.preview_pages && magazine.preview_pages.length > 0) 
    ? magazine.preview_pages 
    : (magazine.pages ? magazine.pages.slice(0, 10) : []);

  const scroll = (direction: string) => {
    if (scrollRef.current) {
      const { current } = scrollRef as any;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white pb-12 overflow-hidden">
      
      {/* Full Issue Reader */}
      {isReaderOpen && (
        <MangaReader 
          pages={magazine.pages || []} 
          title={magazine.title}
          subtitle="Issue Preview"
          readingDirection="ltr"
          onClose={() => setIsReaderOpen(false)} 
          onHome={() => { setIsReaderOpen(false); onBack(); }}
        />
      )}

      {/* Fullscreen Lightbox Carousel for Preview Gallery */}
      {previewIndex !== null && (
        <div 
          className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-fade-in" 
          onClick={() => setPreviewIndex(null)}
        >
          <button onClick={() => setPreviewIndex(null)} className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl">
            <X className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev === 0 ? previewPages.length - 1 : prev! - 1); }} className="absolute left-2 md:left-8 p-3 bg-zinc-900/80 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl">
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center pointer-events-none">
            <img src={previewPages[previewIndex]} className="max-w-full max-h-full object-contain drop-shadow-2xl pointer-events-auto" alt={`Preview ${previewIndex + 1}`} onClick={(e) => e.stopPropagation()} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev === previewPages.length - 1 ? 0 : prev! + 1); }} className="absolute right-2 md:right-8 p-3 bg-zinc-900/80 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl">
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-700 px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest text-white shadow-2xl">
            {previewIndex + 1} <span className="text-zinc-500 mx-1">OF</span> {previewPages.length}
          </div>
        </div>
      )}
      
      {/* Top Left Back Button */}
      <button onClick={onBack} className="fixed top-6 left-6 p-3 bg-zinc-900/90 rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors z-50 transform -skew-x-12">
        <div className="transform skew-x-12 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Back</span>
        </div>
      </button>

      {/* Background Watermark */}
      <div className="absolute top-32 left-[-10vw] whitespace-nowrap z-0 pointer-events-none select-none opacity-5">
        <h1 className="text-[25vw] font-black italic leading-none tracking-tighter" style={{ color: primaryColor }}>{isPM ? 'SATURDAY PM' : 'SATURDAY AM'}</h1>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col md:flex-row items-center md:items-start gap-12 lg:gap-24">
        
        {/* Cover Image is now the Gallery Trigger */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-end perspective-1000">
          <div 
            className={`relative w-[85%] md:w-[90%] max-w-md group ${previewPages.length > 0 ? 'cursor-pointer' : ''}`}
            onClick={() => { if (previewPages.length > 0) setPreviewIndex(0); }}
          >
            <img 
              src={magazine.cover_url} 
              className="w-full object-contain transition-transform duration-700 group-hover:-translate-y-2 group-hover:-translate-x-2 border border-zinc-800" 
              style={{ boxShadow: brutalistShadow }} 
              alt={magazine.title} 
            />
            {previewPages.length > 0 && (
              <div className="mt-8 flex items-center justify-center md:justify-end gap-3 text-white group-hover:text-[#fe9a00] transition-colors w-full md:pr-4">
                <span className="text-xl md:text-3xl font-black uppercase italic tracking-tighter drop-shadow-md">Click to Look Inside</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-start pt-8 md:pt-16">
          <div className="flex items-center gap-4 mb-6">
            {isPM ? (<img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/small%20saturday%20pm%20logo.png`} className="h-8 object-contain" alt="Saturday PM" />) : (<img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png`} className="h-8 object-contain" alt="Saturday AM" />)}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] border-l-2 pl-4 py-1 text-zinc-400" style={{ borderColor: primaryColor }}>Issue Release // {magazine.publish_date ? new Date(magazine.publish_date).getFullYear() : '2026'}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none mb-6 tracking-tighter" style={{ color: primaryColor }}>{magazine.title}</h1>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-md mb-12 border-l border-zinc-800 pl-4">{magazine.synopsis || "No synopsis provided for this issue."}</p>
          <button onClick={() => { if (magazine.pages && magazine.pages.length > 0) { setIsReaderOpen(true); } else { alert("This issue doesn't have any pages uploaded yet!"); } }} className="bg-zinc-900 text-white border border-zinc-700 font-black uppercase tracking-widest px-12 py-5 hover:bg-white hover:text-black hover:border-white transition-all transform -skew-x-12 group">
            <span className="block transform skew-x-12 flex items-center gap-3">Read Full Issue <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-2 transition-transform" /></span>
          </button>
        </div>
      </div>

      {otherMagazines.length > 0 && (
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className="mb-8 inline-flex flex-col items-start">
            <h2 className="text-2xl font-black text-white tracking-wider text-left uppercase italic">More Issues</h2>
            <div className="h-2 w-full transform -skew-x-[16deg] mt-1 ml-1" style={{ backgroundColor: primaryColor }}></div>
          </div>
          <div className="relative">
            <button onClick={() => scroll('left')} className="absolute left-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"><ChevronLeft className="w-8 h-8 text-white transition-colors drop-shadow-md" /></button>
            <div ref={scrollRef} className="flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x no-scrollbar">
              {otherMagazines.map((m: any) => (
                <div key={m.id} className="w-[40%] sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => { if (onMagazineSelect) onMagazineSelect(m); }}>
                  <div className="relative overflow-hidden rounded-none cursor-pointer aspect-[1424/2000] bg-zinc-900 border border-zinc-800 shadow-lg transition-colors duration-300 mb-3 group-hover/card:border-[#fe9a00]">
                    <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover transform transition-transform duration-500 group-hover/card:scale-105 grayscale-[20%] group-hover/card:grayscale-0" />
                  </div>
                  <div className="px-1 text-left"><h3 className="text-white font-black text-[10px] sm:text-xs truncate tracking-widest uppercase group-hover/card:text-[#fe9a00] transition-colors">{m.title}</h3></div>
                </div>
              ))}
            </div>
            <button onClick={() => scroll('right')} className="absolute right-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-l from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"><ChevronRight className="w-8 h-8 text-white transition-colors drop-shadow-md" /></button>
          </div>
        </div>
      )}
    </div>
  );
};