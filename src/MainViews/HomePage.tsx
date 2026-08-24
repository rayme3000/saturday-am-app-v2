import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { SeriesSection } from "./SeriesSection";
import { DecoratedAvatar } from '../Components/DecoratedAvatar';
import { ShareModal } from '../Components/ShareModal';
import { Menu, X, Bell, CheckCircle, Play, Share2 } from 'lucide-react';
import { useTelemetry } from '../Components/useTelemetry'; 

let memHeroSlides: any = null;
let memHomeSections: any = null;
let memRecentReads: any = null;
let memNotifications: any = null;

export const HomePage = ({ onNavigate, onLoginClick, onMenuToggle, currentUser, userTier }: any) => {
  const { seriesList = [], isLoading } = useSeriesData();
  
  const { trackEvent } = useTelemetry(currentUser?.id);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>(memHeroSlides || []);
  const [homeSections, setHomeSections] = useState<any[]>(memHomeSections || []);
  const [latestChapters, setLatestChapters] = useState<any[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(!memHeroSlides);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [recentReads, setRecentReads] = useState<any[]>(memRecentReads || []);

  const [notifications, setNotifications] = useState<any[]>(memNotifications || []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !dismissedNotifs.includes(n.id));
  }, [notifications, dismissedNotifs]);

  const fetchGlobalNotifications = async () => {
    try {
      const { data: notifData } = await supabase.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(15);
      if (notifData) {
        const validData = notifData.filter(n => n && n.id && n.title);
        setNotifications(validData);
        memNotifications = validData;
      }
    } catch (e) {
      console.error("Error fetching notifs:", e);
    }
  };

  useEffect(() => {
    const savedDismissed = JSON.parse(localStorage.getItem('am_dismissed_notifs') || '[]');
    setDismissedNotifs(savedDismissed);

    const fetchHomeData = async () => {
      if (memHeroSlides && memHomeSections && latestChapters.length > 0) {
        setIsLoadingSlides(false);
        return;
      }

      try {
        const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
        if (slideData) {
          setHeroSlides(slideData);
          memHeroSlides = slideData;
        }

        const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
        if (sectionData) {
          setHomeSections(sectionData);
          memHomeSections = sectionData;
        }

        const { data: chapData } = await supabase
          .from('chapters')
          .select('*')
          .order('created_at', { ascending: false }) 
          .limit(20); // Pulled slightly more to account for hidden drop-offs
          
        if (chapData) {
          setLatestChapters(chapData);
        }

        await fetchGlobalNotifications();
      } catch (err: any) {
        console.error("Error fetching home data:", err.message);
      } finally {
        setIsLoadingSlides(false);
      }
    };
    
    fetchHomeData();

    const notifChannel = supabase.channel('public:app_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, (payload) => {
          if (payload.new && payload.new.id && payload.new.title) {
            setNotifications((current) => {
              const updated = current.some(n => n.id === payload.new.id) ? current : [payload.new, ...current].slice(0, 15);
              memNotifications = updated;
              return updated;
            });
          } else {
            fetchGlobalNotifications();
          }
      }).subscribe();

    return () => { supabase.removeChannel(notifChannel); };
  }, [latestChapters.length]);

  useEffect(() => {
    if (showNotifications && !memNotifications) fetchGlobalNotifications();
  }, [showNotifications]);

  const handleDismissNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = [...dismissedNotifs, id];
    setDismissedNotifs(updated);
    localStorage.setItem('am_dismissed_notifs', JSON.stringify(updated));
  };

  const handleClearAllNotifs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allLoadedIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedNotifs, ...allLoadedIds]));
    setDismissedNotifs(updated);
    localStorage.setItem('am_dismissed_notifs', JSON.stringify(updated));
  };

  useEffect(() => {
    const fetchRecentReads = async () => {
      if (isLoading || !currentUser) {
        setRecentReads([]);
        return;
      }
      if (memRecentReads) {
        setRecentReads(memRecentReads);
        return;
      }
      
      try {
        const { data: history } = await supabase.from('reading_history').select('*').eq('user_id', currentUser.id).order('updated_at', { ascending: false }).limit(10);
        if (!history || history.length === 0) return;

        const allIds = history.map((h: any) => h.chapter_id);
        let chapters: any[] = [];

        if (allIds.length > 0) {
          const { data: chapterData } = await supabase.from('chapters').select('*').in('id', allIds);
          if (chapterData) chapters = chapterData;
        }

        const combined = history.map((h: any) => {
          const chap = chapters.find((c: any) => String(c.id) === String(h.chapter_id));

          if (chap) {
            const series = seriesList.find((s: any) => s.slug === chap.series_slug);
            // --- UPDATED: Block hidden series from "Jump Back In" ---
            if (!series || series.is_hidden) return null;
            return { ...h, type: 'series', target: { ...series, action: 'series' }, title: series.title, subtitle: `Chapter ${chap.chapter_number}`, image: chap.thumbnail_url || series.cover_url };
          }
          return null;
        }).filter(Boolean);

        setRecentReads(combined);
        memRecentReads = combined;
      } catch (err: any) {
        console.error("Critical Error fetching recent reads:", err);
      }
    };

    fetchRecentReads();
  }, [seriesList, isLoading, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => { setCurrentSlide((prev) => (heroSlides.length > 0 ? (prev + 1) % heroSlides.length : 0)); }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleSlideClick = (slide: any) => {
    trackEvent('banner_click', { target: slide.link_target, link_type: slide.link_type });
    
    if (!slide.link_target) return;
    if (slide.link_type === 'external') window.open(slide.link_target, '_blank', 'noopener,noreferrer'); 
    else if (slide.link_type === 'series') {
      const matchedSeries = seriesList.find((s: any) => s.slug === slide.link_target);
      if (matchedSeries && !matchedSeries.is_hidden) onNavigate(matchedSeries); 
    }
  };

  const handleLogout = async () => {
    window.dispatchEvent(new Event('instantLogout'));
    await supabase.auth.signOut();
  };

  // --- UPDATED: Filter out Hidden Chapters before mapping ---
  const visibleLatestChapters = useMemo(() => {
    return latestChapters.filter(chapter => {
      const seriesData = seriesList.find(s => s.slug === chapter.series_slug);
      return seriesData && !seriesData.is_hidden;
    }).slice(0, 10); // Keep max 10 to maintain layout cleanly
  }, [latestChapters, seriesList]);

  if (isLoading || isLoadingSlides) return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest">Loading Vault...</div>;

  return (
    <div className="relative min-h-screen bg-transparent text-white pb-24">
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} currentUser={currentUser} />

      <div className="fixed inset-0 z-[-1] bg-black">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden" />
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      <div className="px-6 pt-6">
        <nav className="sticky top-0 w-full z-[100] p-4 sm:p-6 flex justify-between items-center bg-black/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl mb-8 mt-2">
          <div className="flex-1 flex justify-start"><button onClick={onMenuToggle} className="p-2 hover:bg-zinc-800/80 rounded-full transition-colors"><Menu className="w-6 h-6 text-white" /></button></div>
          
          <div className="flex items-center justify-center cursor-pointer flex-shrink-0" onClick={() => onNavigate({ action: 'home' })}>
            <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png" alt="Saturday AM" className="h-12 md:h-16 object-contain drop-shadow-md hover:scale-105 transition-transform" />
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4">
            {!currentUser ? (
              <button 
                onClick={onLoginClick}
                className="whitespace-nowrap flex-shrink-0 flex items-center justify-center bg-[#fe9a00] text-black px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-white transition-colors mr-1 sm:mr-2 shadow-[0_0_15px_rgba(254,154,0,0.3)]"
              >
                Log In
              </button>
            ) : (
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="hidden sm:flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate({ action: 'profile' })}>
                   <DecoratedAvatar avatarUrl={currentUser.avatar_url} frameId={currentUser.frame_id} size="w-8 h-8" iconSize="w-4 h-4" />
                   <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                     Welcome,{' '}
                     <span className={userTier === 'premium' ? 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-colors duration-500' : 'text-[#fe9a00]'}>{currentUser.username || 'Reader'}</span>
                   </span>
                   {userTier === 'premium' && <span className="bg-purple-900/40 border border-purple-500 text-purple-400 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black tracking-widest uppercase ml-1 animate-fade-in">PRO</span>}
                </div>
                <button onClick={handleLogout} className="bg-zinc-900 border border-zinc-700 text-white px-4 sm:px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] sm:text-sm hover:bg-red-600 hover:border-red-600 transition-all shadow-md">
                  Logout
                </button>
              </div>
            )}
            
            <div className="relative ml-1 sm:ml-0">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 sm:p-2.5 bg-zinc-900 border border-zinc-700 rounded-full hover:bg-[#fe9a00] hover:border-[#fe9a00] group transition-all relative">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-black transition-colors" />
                {visibleNotifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse" />}
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-[190]" onClick={() => setShowNotifications(false)} />
                  <div className="absolute top-full mt-2 right-0 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[200] animate-fade-in-up">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/50">
                      <h3 className="font-black italic uppercase text-white tracking-widest text-sm">Updates</h3>
                      <div className="flex items-center gap-3">
                        {visibleNotifications.length > 0 && <button onClick={handleClearAllNotifs} className="text-[9px] text-zinc-500 hover:text-white uppercase tracking-widest font-black transition-colors">Clear All</button>}
                        <button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-white transition-colors" title="Close"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                      </div>
                    </div>
                    <div className="max-h-96 min-h-[120px] overflow-y-auto no-scrollbar relative bg-black/20">
                      {visibleNotifications.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"><CheckCircle className="w-8 h-8 text-zinc-700 mb-3" /><span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">You're all caught up</span></div>
                      ) : (
                        visibleNotifications.map(n => (
                          <div key={n.id} onClick={() => { setShowNotifications(false); if (n.link_target) { if (n.link_target.startsWith('http')) window.open(n.link_target, '_blank'); else { const matchedSeries = seriesList.find((s: any) => s.slug === n.link_target); if (matchedSeries && !matchedSeries.is_hidden) onNavigate(matchedSeries); else onNavigate({ action: n.link_target }); } } }} className="relative group p-4 border-b border-zinc-800/50 hover:bg-zinc-800 cursor-pointer flex gap-4 transition-colors pr-10">
                            <button onClick={(e) => handleDismissNotif(e, n.id)} className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-black/50 z-10" title="Dismiss"><X className="w-4 h-4" /></button>
                            {n.thumbnail_url && <img src={n.thumbnail_url} className="w-12 h-12 rounded object-cover flex-shrink-0 border border-zinc-700 bg-black" alt="Notification" />}
                            <div className="flex flex-col justify-center w-full min-w-0"><span className="text-white font-black text-xs uppercase tracking-wider leading-tight group-hover:text-[#fe9a00] transition-colors truncate">{n.title}</span><span className="text-zinc-400 text-[10px] font-bold mt-1 line-clamp-2 leading-relaxed">{n.message}</span></div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowShareModal(true)} className="p-2 sm:p-2.5 bg-zinc-900 border border-zinc-700 rounded-full hover:bg-[#fe9a00] hover:border-[#fe9a00] group transition-all" title="Share Saturday AM">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-black transition-colors" />
            </button>
          </div>
        </nav>

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
        
        {recentReads.length > 0 && (
          <div className="mb-12 animate-fade-in bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-zinc-800/50">
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-white mb-4 px-2 drop-shadow-md">Jump Back In</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
              {recentReads.map((read) => (
                <div key={read.id} onClick={() => onNavigate({ ...read.target, autoOpenChapterId: read.chapter_id, autoOpenPage: read.page_index })} className="relative min-w-[140px] w-[140px] md:min-w-[180px] md:w-[180px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group border-[1px] border-white shadow-[5px_5px_0px_0px_#fe9a00] hover:shadow-[8px_8px_0px_0px_#fe9a00] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex-shrink-0 mb-3">
                  <img src={read.image} alt={read.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3 z-10">
                    <h3 className="text-white font-black uppercase text-xs md:text-sm leading-tight line-clamp-1 drop-shadow-md">{read.title}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[#fe9a00] font-bold text-[9px] md:text-[10px] uppercase tracking-widest drop-shadow-md">{read.subtitle}</p>
                      <p className="text-zinc-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded border border-zinc-700 backdrop-blur-sm">Pg. {read.page_index + 1}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#fe9a00] flex items-center justify-center shadow-[0_0_20px_rgba(254,154,0,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300"><Play className="w-5 h-5 md:w-6 md:h-6 text-black ml-1" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* LATEST CHAPTERS FEED */}
        {visibleLatestChapters.length > 0 && (
          <div className="mb-10 relative group px-2">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-[#fe9a00] ml-1 drop-shadow-[0_0_8px_rgba(254,154,0,0.8)]" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 8,0 8,24 0,24" />
                <polygon points="10,0 24,0 24,14 10,8" />
                <polygon points="10,10 24,16 24,24 10,24" />
              </svg>
              <h2 className="text-xl font-black text-white tracking-wider uppercase drop-shadow-md">Latest Chapters</h2>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar items-start">
              {visibleLatestChapters.map((chapter) => {
                const seriesData = seriesList.find(s => s.slug === chapter.series_slug) || {};

                return (
                <div key={chapter.id} onClick={() => onNavigate(seriesData)} className="w-[45%] sm:w-[35%] md:w-[25%] flex-shrink-0 cursor-pointer group/card snap-start flex flex-col">
                  <div className="relative overflow-hidden rounded-lg aspect-square border-[1px] border-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.4)] group-hover/card:-translate-y-1 group-hover/card:border-[#fe9a00] group-hover/card:shadow-[0_0_30px_rgba(254,154,0,0.8)] transition-all duration-300">
                    <img 
                      src={chapter.thumbnail_url || seriesData.cover_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'} 
                      className="w-full h-full object-cover" 
                      alt="Chapter Thumbnail" 
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12">
                      <p className="text-[#fe9a00] font-black text-[10px] uppercase tracking-widest drop-shadow-[0_0_5px_rgba(254,154,0,0.8)]">
                        CH. {chapter.chapter_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 px-1 flex flex-col flex-1">
                    <h3 className="text-white font-bold text-xs truncate group-hover/card:text-[#fe9a00] transition-colors">
                      {seriesData.title}
                    </h3>
                    <p className="text-zinc-400 text-[10px] font-bold truncate mt-0.5">
                      {chapter.title || `Chapter ${chapter.chapter_number}`}
                    </p>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* --- UPDATED: Block Hidden Series from Sections --- */}
        {homeSections.map((section) => {
          const seriesInSection = seriesList
            .filter((s: any) => s.home_section === section.title && !s.is_hidden)
            .sort((a: any, b: any) => (a.display_order || 99) - (b.display_order || 99));
            
          if (seriesInSection.length === 0) return null; 
          return <SeriesSection key={section.id} title={section.title} series={seriesInSection} onSeriesClick={onNavigate} />;
        })}
      </div>
    </div>
  );
};