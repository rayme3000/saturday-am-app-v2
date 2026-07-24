import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { MagazineHomeSection } from './MagazineHomeSection';
import { SeriesSection } from './SeriesSection';
import { Menu, HelpCircle, X, MoveHorizontal, MoveVertical, Flame } from 'lucide-react';

export const HomePage = ({ onNavigate, onAdminAccess, onLoginClick, onMenuToggle, currentUser }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [homeMagazines, setHomeMagazines] = useState<any[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  
  // --- NEW: HELP MODAL STATE ---
  const [showHelpModal, setShowHelpModal] = useState(false);

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
    if (!slide.link_target) return;

    if (slide.link_type === 'external') { 
      window.open(slide.link_target, '_blank', 'noopener,noreferrer'); 
    } 
    else if (slide.link_type === 'series') {
      const matchedSeries = seriesList.find((s: any) => s.slug === slide.link_target);
      if (matchedSeries) onNavigate(matchedSeries); 
    }
    else if (slide.link_type === 'magazine') {
      onNavigate({ publish_date: slide.link_target, action: 'magazine' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest">Loading Vault...</div>;

  return (
    <div className="relative min-h-screen bg-transparent text-white p-6 pb-24">
      
      {/* --- FIXED PARALLAX BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] bg-black">
        <img 
          src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" 
          alt="Manga Collage" 
          className="w-full h-full object-cover md:hidden"
        />
        <img 
          src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" 
          alt="Manga Collage" 
          className="hidden md:block w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      {/* TOP NAVIGATION BAR */}
      <nav className="w-full z-50 p-4 sm:p-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-zinc-900/50 mb-8 rounded-2xl shadow-lg">
        
        <button onClick={onMenuToggle} className="p-2 hover:bg-zinc-800/80 rounded-full transition-colors">
           <Menu className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate({ action: 'home' })}>
          <img 
            src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png" 
            alt="Saturday AM" 
            className="h-8 md:h-10 object-contain drop-shadow-md hover:scale-105 transition-transform" 
          />
        </div>
        
        {/* RIGHT SIDE: AUTH + HELP BUTTON */}
        <div className="flex items-center gap-2 sm:gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3 sm:gap-6">
              <div 
                className="hidden sm:flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onNavigate({ action: 'profile' })}
              >
                 <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                   Welcome, {currentUser.username}
                 </span>
              </div>
              <button onClick={handleLogout} className="bg-zinc-900 border border-zinc-700 text-white px-4 sm:px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] sm:text-sm hover:bg-red-600 hover:border-red-600 transition-all">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="bg-[#fe9a00] text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:shadow-[0_0_15px_rgba(254,154,0,0.4)] transition-all">
              Login
            </button>
          )}
          
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="p-2 sm:p-2.5 bg-zinc-900 border border-zinc-700 rounded-full hover:bg-[#fe9a00] hover:border-[#fe9a00] group transition-all"
            title="App Features Guide"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-black transition-colors" />
          </button>
        </div>
      </nav>

      {/* FEATURE GUIDE MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => setShowHelpModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900 rounded-t-2xl">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Feature Guide</h2>
              <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto no-scrollbar space-y-8 bg-black rounded-b-2xl">
              
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Magazines</h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  The latest storylines of our serialized series. Publications range from bi-weekly to monthly.
                </p>
              </div>

              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Series Chapters</h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  Binge read chapters by individual series.
                </p>
              </div>

              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Profile Loadout</h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  No boring profiles allowed! Choose your avatar, frame color, favorite series, and more to reflect your AM fandom. More art and options will constantly be updated. <span className="text-[#fe9a00]">(Free account required)</span>
                </p>
              </div>

              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-3">Choose Your Reading Style</h3>
                <div className="flex flex-col gap-3 pl-3">
                  <div className="flex items-center gap-4 text-zinc-400 text-xs font-bold">
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-md"><MoveHorizontal className="w-4 h-4 text-[#fe9a00]" /></div>
                    Classic horizontal scroll
                  </div>
                  <div className="flex items-center gap-4 text-zinc-400 text-xs font-bold">
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-md"><MoveVertical className="w-4 h-4 text-[#fe9a00]" /></div>
                    Vertical scroll
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  AM Bingo Book <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-purple-500 pl-3">
                  Track down Saturday AM creators at live shows and conventions to collect their exclusive digital autographs in your virtual Bingo Book!
                </p>
              </div>

              <div>
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                  Quick Reacts <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <div className="flex gap-4 items-start pl-3">
                  <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded shadow-md flex-shrink-0 mt-0.5">
                    <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Quick%20React%20icon.png" alt="Quick React" className="w-5 h-5 object-contain" />
                  </div>
                  <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                    Drop real-time, 30-character hype messages directly onto your favorite manga pages for everyone to see.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                  Super Hypes <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <div className="flex gap-4 items-start pl-3">
                  <div className="bg-gradient-to-br from-yellow-500 to-[#fe9a00] p-1.5 rounded shadow-[0_0_10px_rgba(254,154,0,0.3)] flex-shrink-0 mt-0.5">
                    <Flame className="w-5 h-5 text-black" />
                  </div>
                  <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                    When a normal hype is not enough. Let the world know which series is not just good, but GOATED! Subscribers only get 5 of these a month, so use them carefully.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HERO SLIDES */}
      <div className="mb-8 w-full flex flex-col items-center">
        <div className="w-full relative overflow-hidden rounded-lg mb-4 aspect-[2/3] md:aspect-[3/1] bg-zinc-900/80 border border-zinc-800/50 shadow-xl backdrop-blur-sm">
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
        <button onClick={onAdminAccess} className="text-[8px] text-zinc-900 hover:text-zinc-500 tracking-[0.3em] font-black transition-colors cursor-pointer">Admin Access</button>
      </div>
    </div>
  );
};