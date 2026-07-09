import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { MagazineHomeSection } from './MagazineHomeSection';
import { SeriesSection } from './SeriesSection';

export const HomePage = ({ onNavigate, onAdminAccess, onLoginClick, onMenuToggle }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [homeMagazines, setHomeMagazines] = useState<any[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
        if (slideData) setHeroSlides(slideData);

        const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
        if (sectionData) setHomeSections(sectionData);

        const { data: magData } = await supabase.from('magazines').select('*').eq('home_section', 'Featured').order('display_order', { ascending: true });
        if (magData) setHomeMagazines(magData);
      } catch (err: any) {
        console.error("Error fetching home data:", err.message);
      } finally {
        setIsLoadingSlides(false);
      }
    };
    fetchHomeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { setCurrentSlide((prev) => (heroSlides.length > 0 ? (prev + 1) % heroSlides.length : 0)); }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleSlideClick = (slide: any) => {
    if (slide.link_type === 'external') { window.open(slide.link_target, '_blank'); } 
    else if (slide.link_type === 'series') {
      const matchedSeries = seriesList.find((s: any) => s.slug === slide.link_target);
      onNavigate(matchedSeries || slide.link_target); 
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest">Loading Vault...</div>;

  return (
    <div className="bg-black min-h-screen text-white p-6 pb-24">
      {/* TOP NAVIGATION BAR */}
        <nav className="w-full z-50 p-4 sm:p-6 flex justify-between items-center bg-black border-b border-zinc-900">
          
          <button onClick={onMenuToggle} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
             <Menu className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate({ action: 'home' })}>
            <img 
              src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png" 
              alt="Saturday AM" 
              className="h-8 md:h-10 object-contain drop-shadow-md hover:scale-105 transition-transform" 
            />
          </div>
          
          <button onClick={onLoginClick} className="bg-[#fe9a00] text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:shadow-[0_0_15px_rgba(254,154,0,0.4)] transition-all">
            Login
          </button>
          
        </nav>

      <div className="mb-8 w-full flex flex-col items-center">
        <div className="w-full relative overflow-hidden rounded-lg mb-4 aspect-[2/3] md:aspect-[3/1] bg-zinc-900 border border-zinc-800">
          {heroSlides.map((slide, index) => (
            <div key={slide.id} onClick={() => handleSlideClick(slide)} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
              <img src={slide.mobile_url} alt={`Slide ${index}`} className="md:hidden w-full h-full object-cover" />
              <img src={slide.desktop_url} alt={`Slide ${index}`} className="hidden md:block w-full h-full object-cover" />
            </div>
          ))}
          {heroSlides.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
              {heroSlides.map((_, index) => (
                <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }} className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-[#fe9a00] w-6' : 'bg-white/50 w-1.5 hover:bg-white'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <MagazineHomeSection magazines={homeMagazines} onMagazineClick={onNavigate} />

      {homeSections.map((section) => {
        const seriesInSection = seriesList.filter((s: any) => s.home_section === section.title).sort((a: any, b: any) => (a.display_order || 99) - (b.display_order || 99));
        if (seriesInSection.length === 0) return null; 
        return <SeriesSection key={section.id} title={section.title} series={seriesInSection} onSeriesClick={onNavigate} />;
      })}
    
      <div className="mt-8 mb-24 flex justify-center">
        <button onClick={onAdminAccess} className="text-[8px] text-zinc-900 hover:text-zinc-600 tracking-[0.3em] font-black transition-colors cursor-pointer">Admin Access</button>
      </div>
    </div>
  );
};