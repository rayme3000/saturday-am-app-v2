import React, { useState, useEffect, useRef } from 'react';
import { Menu, Home, Heart, Search, ShoppingBag, User, BookOpen, Play, ArrowLeft, Bookmark, X, MoveHorizontal, MoveVertical, RotateCcw, MessageCircle, MessageCircleOff, ChevronLeft, ChevronRight, Award, } from 'lucide-react';
import { supabase } from './supabase';
import { useSeriesData } from './userSeriesData';

// --- Cloudflare Base URL ---
const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- Data Sections ---
const MOCK_COMMENTS = [
  { id: 1, pageIndex: 0, user: 'SanoFan99', avatar: 'https://i.pravatar.cc/150?u=1', text: 'This cover is pure fire 🔥' },
  { id: 2, pageIndex: 0, user: 'MangaArtist', avatar: 'https://i.pravatar.cc/150?u=2', text: 'Whyt Manga always delivers on the art style. Look at those details!' },
  { id: 3, pageIndex: 1, user: 'ClockStrikerMain', avatar: 'https://i.pravatar.cc/150?u=3', text: 'Here we go! The journey begins.' },
  { id: 4, pageIndex: 3, user: 'ShonenKing', avatar: 'https://i.pravatar.cc/150?u=4', text: 'Wait, did anyone else notice the easter egg in the background?!' },
  { id: 5, pageIndex: 3, user: 'AM_Reader', avatar: 'https://i.pravatar.cc/150?u=5', text: 'Good catch! I totally missed that.' },
  { id: 6, pageIndex: 8, user: 'SaturdayVault', avatar: 'https://i.pravatar.cc/150?u=6', text: 'The pacing in this sequence is incredible.' },
  { id: 7, pageIndex: 8, user: 'ArtCritique', avatar: 'https://i.pravatar.cc/150?u=7', text: 'Love the heavy inking on this panel!' },
];

const SeriesSection = ({ title, series, onSeriesClick }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-10 relative group">
      <h2 className="text-xl font-black mb-4 border-l-4 border-[#fe9a00] pl-3 text-white tracking-wider text-left">
        {title}
      </h2>
      <div className="relative">
        {/* Left Minimal Nav Arrow */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-8 z-10 flex items-center justify-center w-12 sm:w-16 bg-gradient-to-r from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        {/* Horizontal Scrollable Container */}
        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 scroll-smooth snap-x no-scrollbar">
          {series.map(s => (
            <div key={s.id} className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onSeriesClick(s)}>
              {/* Card Container */}
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
              {/* Title and Creator Text Underneath */}
              <div className="px-1 text-left">
                <h3 className="text-white font-bold text-xs truncate uppercase tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                  {s.title}
                </h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                  {s.creator_name || 'Saturday AM'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Minimal Nav Arrow */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-8 z-10 flex items-center justify-center w-12 sm:w-16 bg-gradient-to-l from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};

const FooterNav = () => {
  const navItems = [
    { name: 'Home', icon: Home, action: null },
    { name: 'My Faves', icon: Heart, action: null },
    { name: 'Browse', icon: Search, action: null },
    { name: 'AM Shop', icon: ShoppingBag, action: null },
    { name: 'Account', icon: User, action: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#323232] border-t border-zinc-700 p-2 flex justify-around items-center z-40">
      {navItems.map((item) => (
        <button key={item.name} onClick={item.action} className="flex flex-col items-center gap-0.5 group">
          <item.icon className="w-5 h-5 text-[#fe9a00] group-hover:text-white transition-colors" />
          <span className="text-[9px] font-black text-[#fe9a00] uppercase tracking-tight group-hover:text-white transition-colors">
            {item.name}
          </span>
        </button>
      ))}
    </nav>
  );
};

// --- Manga Reader Component ---
const MangaReader = ({ pages, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState('horizontal');
  const [isTickerEnabled, setIsTickerEnabled] = useState(true);
  const [activeCommentIndex, setActiveCommentIndex] = useState(0);

  const goNext = () => {
    if (mode === 'book') {
      setCurrentPage((p) => Math.min(pages.length - 1, p + 2));
    } else {
      setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
    }
  };

  const goPrev = () => {
    if (mode === 'book') {
      setCurrentPage((p) => Math.max(0, p - 2));
    } else {
      setCurrentPage((p) => Math.max(0, p - 1));
    }
  };

  const visibleComments = MOCK_COMMENTS.filter(c => {
    if (mode === 'vertical') return true; 
    if (mode === 'book') return c.pageIndex === currentPage || c.pageIndex === currentPage + 1; 
    return c.pageIndex === currentPage; 
  });

  useEffect(() => {
    if (!isTickerEnabled || visibleComments.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCommentIndex((prev) => (prev + 1) % visibleComments.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [visibleComments.length, isTickerEnabled, currentPage]);

  useEffect(() => {
    setActiveCommentIndex(0);
  }, [currentPage, mode]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(5px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        .animate-fade-in-up { animation: fade-in-up 4s ease-in-out infinite; }
      `}</style>

      <div className="flex justify-between items-center p-4 bg-black border-b border-zinc-900 z-50 relative">
        <div className="flex items-center gap-4 w-24">
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
          <span className="text-xs font-bold text-zinc-500 tracking-widest hidden sm:block">
            {mode === 'vertical' ? 'SCROLL' : `${currentPage + 1}/${pages.length}`}
          </span>
        </div>
        
        <div className="flex bg-zinc-900 rounded-md p-1 border border-zinc-800">
          <button onClick={() => setMode('horizontal')} className={`p-1.5 rounded flex items-center gap-2 transition-colors ${mode === 'horizontal' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}>
            <MoveHorizontal className="w-4 h-4" />
          </button>
          <button onClick={() => setMode('vertical')} className={`p-1.5 rounded flex items-center gap-2 transition-colors ${mode === 'vertical' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}>
            <MoveVertical className="w-4 h-4" />
          </button>
          <button onClick={() => { setMode('book'); if (currentPage % 2 !== 0) setCurrentPage(currentPage - 1); }} className={`p-1.5 rounded flex items-center gap-2 transition-colors ${mode === 'book' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}>
            <BookOpen className="w-4 h-4" />
          </button>
        </div>

        <div className="w-24 flex justify-end">
          <button onClick={() => setIsTickerEnabled(!isTickerEnabled)} className={`p-2 rounded-full transition-colors relative ${isTickerEnabled ? 'text-[#fe9a00] hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}>
            {isTickerEnabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
            {!isTickerEnabled && visibleComments.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#fe9a00] rounded-full border border-black"></span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative w-full">
        {mode === 'horizontal' && (
          <div className="h-full flex items-center justify-center relative select-none">
            <img src={pages[currentPage]} className="max-h-full object-contain" alt={`Page ${currentPage + 1}`} />
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer flex items-center justify-start px-2 sm:px-6 group" onClick={goPrev}>
              {currentPage > 0 && (
                <div className="bg-zinc-900/60 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-zinc-400 opacity-50 group-hover:opacity-100 group-hover:text-white group-hover:bg-zinc-800/90 transition-all shadow-lg">
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              )}
            </div>
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer flex items-center justify-end px-2 sm:px-6 group" onClick={goNext}>
              {currentPage < pages.length - 1 && (
                <div className="bg-zinc-900/60 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-zinc-400 opacity-50 group-hover:opacity-100 group-hover:text-white group-hover:bg-zinc-800/90 transition-all shadow-lg">
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'vertical' && (
          <div className="h-full overflow-y-auto flex flex-col items-center select-none">
            {pages.map((pageUrl, index) => (
              <img key={index} src={pageUrl} className="w-full max-w-2xl object-contain block" alt={`Page ${index + 1}`} />
            ))}
            <div className="py-20 text-center text-zinc-600 text-xs font-bold tracking-widest uppercase mb-10">End of Chapter</div>
          </div>
        )}

        {mode === 'book' && (
          <div className="h-full flex items-center justify-center relative select-none w-full bg-black">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 bg-zinc-800/95 text-[#fe9a00] px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-3 portrait:flex landscape:hidden pointer-events-none shadow-2xl animate-pulse whitespace-nowrap border border-zinc-700">
              <RotateCcw className="w-4 h-4" /> Rotate device
            </div>
            <div className="h-full flex justify-center items-center">
              <img src={pages[currentPage]} className="h-full object-contain" alt="Left Page" />
              {currentPage + 1 < pages.length ? (
                <img src={pages[currentPage + 1]} className="h-full object-contain" alt="Right Page" />
              ) : (
                <div className="h-full aspect-[2/3] bg-black" /> 
              )}
            </div>
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={goPrev} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={goNext} />
          </div>
        )}
      </div>

      {isTickerEnabled && visibleComments.length > 0 && (
        <div className="w-full bg-[#0a0a0a] pb-4 pt-2 px-4 flex justify-center items-center z-40 border-t border-zinc-900/40">
          <div key={`${currentPage}-${activeCommentIndex}`} className="flex items-center gap-2.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full px-3 py-1.5 shadow-xl animate-fade-in-up max-w-sm w-auto">
            <img src={visibleComments[activeCommentIndex].avatar} alt="User" className="w-4 h-4 rounded-full object-cover" />
            <span className="text-[#fe9a00] text-[9px] font-black uppercase tracking-widest flex-shrink-0">{visibleComments[activeCommentIndex].user}</span>
            <span className="text-zinc-300 text-[11px] sm:text-xs truncate">{visibleComments[activeCommentIndex].text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const SeriesDetailPage = ({ series, onBack }) => {
  const [localSeries, setLocalSeries] = useState(series);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activePages, setActivePages] = useState([]);
  const [creators, setCreators] = useState([]);

  const [showAwards, setShowAwards] = useState(false);
  const awardTimeoutRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!series) return;
    
    const fetchDetails = async () => {
      // Safe fallback if series was passed as just a slug string
      const targetSlug = typeof series === 'string' ? series : series.slug;
      
      const { data: freshSeries } = await supabase.from('series').select('*').eq('slug', targetSlug).single();
      if (freshSeries) setLocalSeries(freshSeries);

      const { data: chapterData } = await supabase.from('chapters').select('*').eq('series_slug', targetSlug).order('chapter_number', { ascending: true });
      if (chapterData) setChapters(chapterData);

      const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSlug).order('id', { ascending: true });

      if (creatorData && creatorData.length > 0) {
        setCreators(creatorData);
      } else if (freshSeries) {
        setCreators([{ role: 'Creator', name: freshSeries.creator_name || 'Saturday AM', flag_code: freshSeries.flag_code || '', avatar_url: freshSeries.creator_avatar || '', bio: freshSeries.creator_bio || '', twitter_url: freshSeries.creator_twitter || '', instagram_url: freshSeries.creator_instagram || '', support_url: freshSeries.creator_support_link || '' }]);
      }
    };
    
    fetchDetails();
  }, [series]);

  const handleReadChapter = async (chapterId) => {
    const { data } = await supabase.from('pages').select('image_url').eq('chapter_id', chapterId).order('page_order', { ascending: true });
    if (data && data.length > 0) { setActivePages(data.map(p => p.image_url)); setIsReaderOpen(true); } else { alert("No pages found for this chapter yet!"); }
  };

  const triggerAwards = () => {
    setShowAwards(true);
    if (awardTimeoutRef.current) clearTimeout(awardTimeoutRef.current);
    awardTimeoutRef.current = setTimeout(() => { setShowAwards(false); }, 3000);
  };

  if (!localSeries) return null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      {isReaderOpen && <MangaReader pages={activePages} onClose={() => setIsReaderOpen(false)} />}
      
      <div className="sticky top-0 left-0 w-full h-[60vh] z-0 overflow-hidden bg-black">
        <img src={localSeries.cover_url} className="w-full h-full object-cover opacity-60" alt="Hero Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"><ArrowLeft className="w-6 h-6" /></button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
        <div className="px-6 pt-8 flex flex-col items-center">
          
          <div className="flex items-center justify-center gap-4 mb-6">
            {localSeries.logo_url && <img src={localSeries.logo_url} alt="Logo" className="w-full max-w-[280px] h-auto object-contain" />}
            
            {localSeries.has_awards && localSeries.awards && (
              <div className="relative flex items-center cursor-pointer" onMouseEnter={() => setShowAwards(true)} onMouseLeave={() => setShowAwards(false)} onClick={triggerAwards}>
                
                {/* Custom PNG from Cloudflare bucket */}
                <img 
                  src={`${CLOUDFLARE_BASE_URL}/series-page-graphics/award-icon.png`} 
                  alt="Award Winning Series" 
                  className={`w-8 h-8 object-contain transition-all duration-200 drop-shadow-lg ${showAwards ? 'opacity-80 scale-110' : 'opacity-100'}`} 
                />
                
                <div className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 w-max min-w-[120px] bg-zinc-800 border border-zinc-700 p-3 rounded shadow-2xl transition-all duration-300 pointer-events-none z-50 ${showAwards ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
                  {String(localSeries.awards || '').split(',').map((award, i) => (
                    <p key={i} className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest whitespace-nowrap mb-1 last:mb-0">{award.trim()}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-1 mt-2">
            {creators.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">{c.role}:</span>
                <p className="text-[#fe9a00] font-bold text-sm">{c.name}</p>
                {c.flag_code && <img src={`https://flagcdn.com/${c.flag_code.toLowerCase()}.svg`} alt="Flag" className="w-5 h-3.5 rounded-[2px] shadow-sm opacity-90" />}
              </div>
            ))}
          </div>

          <div className="mt-4 px-2 text-center">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>{localSeries.synopsis}</p>
            {localSeries.synopsis && localSeries.synopsis.length > 100 && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-bold text-xs mt-1 uppercase">{isExpanded ? 'Read Less' : 'Read More'}</button>
            )}
          </div>
        </div>
        
        <div className="mt-10 px-6 flex gap-8 border-b border-zinc-800">
          <button onClick={() => setActiveTab('chapters')} className={`pb-3 font-bold uppercase tracking-widest text-sm transition-colors ${activeTab === 'chapters' ? 'text-white border-b-2 border-[#fe9a00]' : 'text-zinc-500'}`}>Chapters</button>
        </div>
        
        <div className="mt-6 px-6 pb-12">
          {chapters.map((ch) => (
            <div key={ch.id} onClick={() => handleReadChapter(ch.id)} className="flex items-center gap-4 mb-4 hover:bg-zinc-900 p-2 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
              <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className="w-16 h-16 object-cover rounded-md bg-zinc-800" alt="Thumbnail" />
              <div>
                <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">CHAPTER {ch.chapter_number}</p>
                <h3 className="font-bold text-sm text-white">{ch.title || `Chapter ${ch.chapter_number}`}</h3>
              </div>
              <Play className="ml-auto w-5 h-5 text-[#fe9a00]" />
            </div>
          ))}
          {chapters.length === 0 && <div className="text-center py-12 text-zinc-500 italic text-sm">No chapters uploaded yet.</div>}
        </div>

        <div className="pb-24 px-6">
          <div className="border-t border-zinc-800 pt-8 flex flex-col items-center gap-12">
            {creators.map((c, index) => (
              <div key={index} className="flex flex-col items-center text-center max-w-sm">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden border-2 border-[#fe9a00]/30"><img src={c.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} alt={c.name} className="w-full h-full object-cover" /></div>
                  <div><h4 className="font-bold text-lg">{c.name ? c.name.split(' ')[0] : 'Creator'}</h4><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{c.role}</p></div>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">{c.bio || '...'}</p>
                <div className="flex gap-3 mb-6">
                  {c.twitter_url && <a href={c.twitter_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#fe9a00] transition-colors text-[10px] uppercase font-bold bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">Twitter</a>}
                  {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#fe9a00] transition-colors text-[10px] uppercase font-bold bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">Instagram</a>}
                </div>
                {c.support_url && (<button onClick={() => window.open(c.support_url, '_blank')} className="flex items-center gap-2 border border-[#fe9a00] text-[#fe9a00] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black transition-colors"><Heart className="w-3 h-3" /> Support {c.name.split(' ')[0]}</button>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = ({ onNavigate, onAdminAccess }) => {
  const { seriesList = [], isLoading } = useSeriesData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState([]);
  const [homeSections, setHomeSections] = useState([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
        if (slideData) setHeroSlides(slideData);

        const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
        if (sectionData) setHomeSections(sectionData);

      } catch (err) {
        console.error("Error fetching home data:", err.message);
      } finally {
        setIsLoadingSlides(false);
      }
    };

    fetchHomeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (heroSlides.length > 0 ? (prev + 1) % heroSlides.length : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleSlideClick = (slide) => {
    if (slide.link_type === 'external') {
      window.open(slide.link_target, '_blank');
    } else if (slide.link_type === 'series') {
      // Safety net: ensure we pass the full series object if possible
      const matchedSeries = seriesList.find(s => s.slug === slide.link_target);
      onNavigate(matchedSeries || slide.link_target); 
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest uppercase">Loading Vault...</div>;
  }

  return (
    <div className="bg-black min-h-screen text-white p-6 pb-24">
      <nav className="flex items-center justify-between mb-8 px-2">
        <Menu className="w-8 h-8 cursor-pointer" />
        <img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} alt="Logo" className="h-8 object-contain" />
        <div className="flex items-center gap-2">
          <button className="text-[10px] font-bold uppercase hover:text-[#fe9a00]">Login</button>
          <button className="bg-[#fe9a00] text-black text-[10px] font-bold px-3 py-1.5 rounded-full">Subscribe</button>
        </div>
      </nav>

      <div className="mb-8 w-full flex flex-col items-center">
        <div className="w-full relative overflow-hidden rounded-lg mb-4 aspect-[2/3] md:aspect-[3/1] bg-zinc-900 border border-zinc-800">
          {heroSlides.map((slide, index) => (
            <div 
              key={slide.id} 
              onClick={() => handleSlideClick(slide)}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <img src={slide.mobile_url} alt={`Slide ${index}`} className="md:hidden w-full h-full object-cover" />
              <img src={slide.desktop_url} alt={`Slide ${index}`} className="hidden md:block w-full h-full object-cover" />
            </div>
          ))}
          
          {heroSlides.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
              {heroSlides.map((_, index) => (
                <button 
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-[#fe9a00] w-6' : 'bg-white/50 w-1.5 hover:bg-white'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center px-4 max-w-2xl mb-8">
          <h3 className="text-xl font-bold mb-2 text-[#fe9a00]">Welcome to the Saturday AM Vault!</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">Now you can binge read your favorite AM series like Apple Black and Clock Striker chapter by chapter.</p>
        </div>
      </div>
      
      {/* DYNAMIC SECTIONS RENDERER */}
      {homeSections.map((section) => {
        const seriesInSection = seriesList
          .filter(s => s.home_section === section.title)
          .sort((a, b) => (a.display_order || 99) - (b.display_order || 99));

        if (seriesInSection.length === 0) return null; 
        
        return (
          <SeriesSection 
            key={section.id} 
            title={section.title} 
            series={seriesInSection} 
            onSeriesClick={onNavigate} 
          />
        );
      })}
    
      <div className="mt-8 mb-24 flex justify-center">
        <button onClick={onAdminAccess} className="text-[8px] text-zinc-900 hover:text-zinc-600 uppercase tracking-[0.3em] font-black transition-colors cursor-pointer">
          Admin Access
        </button>
      </div>
      <FooterNav />
    </div>
  );
};

// ==========================================
// 1. UTILITY COMPONENTS (Independent)
// ==========================================

const compressImage = async (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/webp', 0.85);
      };
    };
  });
};

const uploadToSupabase = async (file, folderPath) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('saturday-am-vault') 
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('saturday-am-vault')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Upload Error:', error);
    alert('Error uploading file: ' + error.message);
    return null;
  }
};

const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", onUploadComplete }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files) => {
    setIsUploading(true);
    const urls = [];
    
    for (let i = 0; i < files.length; i++) {
      const optimizedFile = await compressImage(files[i]);
      const url = await uploadToSupabase(optimizedFile, folderPath);
      if (url) urls.push(url);
    }
    
    setIsUploading(false);
    
    if (onUploadComplete && urls.length > 0) {
      multiple ? onUploadComplete(urls) : onUploadComplete(urls[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    if (e.target.files.length) processFiles(e.target.files);
  };

  return (
    <div 
      onClick={() => !isUploading && fileInputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`w-full bg-black border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${height} ${isDragging ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-700 hover:border-[#fe9a00]'} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input type="file" className="hidden" ref={fileInputRef} multiple={multiple} onChange={handleChange} />
      
      {isUploading ? (
        <span className="font-bold text-[#fe9a00] text-xs animate-pulse">OPTIMIZING & UPLOADING...</span>
      ) : (
        <>
          <span className="font-bold text-zinc-400 text-xs transition-colors hover:text-[#fe9a00]">{label}</span>
          {subtext && <span className="text-zinc-600 text-[10px] mt-1 text-center group-hover:text-[#fe9a00]/70">{subtext}</span>}
        </>
      )}
    </div>
  );
};

const HomeEditor = () => {
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  
  // Slides State
  const [slides, setSlides] = useState([]);
  
  // Layout Builder State
  const [sections, setSections] = useState([]);
  const [sectionSeries, setSectionSeries] = useState({});

  useEffect(() => {
    const fetchLayoutData = async () => {
      // 1. Fetch Existing Slides
      const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
      if (slideData && slideData.length > 0) {
        setSlides(slideData.map(s => ({
          id: s.id,
          desktop_url: s.desktop_url || '',
          mobile_url: s.mobile_url || '',
          linkType: s.link_type || 'series',
          linkTarget: s.link_target || ''
        })));
      } else {
        setSlides([{ id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
      }

      // 2. Fetch Existing Layouts
      const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
      if (sectionData) {
        setSections(sectionData);
        const mapping = {};
        sectionData.forEach(sec => {
          mapping[sec.title] = seriesList
            .filter(s => s.home_section === sec.title)
            .sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
        });
        setSectionSeries(mapping);
      }
    };
    if (seriesList.length > 0) fetchLayoutData();
  }, [seriesList]);

  const addSlide = () => setSlides([...slides, { id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
  const removeSlide = (idToRemove) => setSlides(slides.filter(slide => slide.id !== idToRemove));
  const updateSlide = (id, field, value) => setSlides(slides.map(slide => slide.id === id ? { ...slide, [field]: value } : slide));

  const createSection = () => {
    const title = window.prompt("Enter new section title (e.g., 'Action Manga'):");
    if (title && !sections.find(s => s.title === title)) {
      setSections([...sections, { title }]);
      setSectionSeries({ ...sectionSeries, [title]: [] });
    }
  };

  const removeSection = (titleToRemove) => {
    if (!window.confirm(`Delete the "${titleToRemove}" section?`)) return;
    setSections(sections.filter(s => s.title !== titleToRemove));
    const newMapping = { ...sectionSeries };
    delete newMapping[titleToRemove];
    setSectionSeries(newMapping);
  };

  const moveSection = (index, direction) => {
    const newArr = [...sections];
    if (direction === 'up' && index > 0) [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    if (direction === 'down' && index < newArr.length - 1) [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    setSections(newArr);
  };

  const handleAddSeries = (sectionTitle, seriesSlug) => {
    if (!seriesSlug) return;
    const seriesToAdd = seriesList.find(s => s.slug === seriesSlug);
    if (!seriesToAdd || sectionSeries[sectionTitle]?.find(s => s.slug === seriesSlug)) return;
    setSectionSeries({ ...sectionSeries, [sectionTitle]: [...(sectionSeries[sectionTitle] || []), seriesToAdd] });
  };

  const removeSeriesFromSection = (sectionTitle, seriesSlug) => {
    setSectionSeries({ ...sectionSeries, [sectionTitle]: sectionSeries[sectionTitle].filter(s => s.slug !== seriesSlug) });
  };

  const moveSeries = (sectionTitle, index, direction) => {
    const arr = [...sectionSeries[sectionTitle]];
    if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    setSectionSeries({ ...sectionSeries, [sectionTitle]: arr });
  };

  const handleSaveHome = async () => {
    setIsSaving(true);
    try {
      await supabase.from('hero_slides').delete().neq('id', 0);
      const validSlides = slides.filter(s => s.desktop_url || s.mobile_url).map(slide => ({
        desktop_url: slide.desktop_url,
        mobile_url: slide.mobile_url,
        link_type: slide.linkType,
        link_target: slide.linkTarget
      }));
      if (validSlides.length > 0) {
        const { error: slideError } = await supabase.from('hero_slides').insert(validSlides);
        if (slideError) throw slideError;
      }

      await supabase.from('home_sections').delete().neq('id', 0);
      const newSections = sections.map((sec, i) => ({ title: sec.title, display_order: i + 1 }));
      if (newSections.length > 0) {
        const { error: secError } = await supabase.from('home_sections').insert(newSections);
        if (secError) throw secError;
      }

      const updates = [];
      const activeSlugs = new Set();
      
      Object.entries(sectionSeries).forEach(([sectionTitle, seriesArr]) => {
        seriesArr.forEach((s, index) => {
          updates.push({ slug: s.slug, home_section: sectionTitle, display_order: index + 1 });
          activeSlugs.add(s.slug);
        });
      });

      seriesList.forEach(s => {
        if (s.home_section && s.home_section !== 'None' && !activeSlugs.has(s.slug)) {
          updates.push({ slug: s.slug, home_section: 'None', display_order: 99 });
        }
      });

      for (const u of updates) {
        const { error } = await supabase.from('series')
          .update({ home_section: u.home_section, display_order: u.display_order })
          .eq('slug', u.slug);
        
        if (error) throw error;
      }

      alert("SUCCESS! Home layout and slides have been saved.");
      window.location.reload(); 

    } catch (error) {
      alert('Failed to save layout: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* HERO SLIDESHOW EDITOR */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Hero Slideshow</h3>
            <p className="text-[10px] text-zinc-500">Manage rotating top banners (auto-plays every 5s).</p>
          </div>
          <button onClick={addSlide} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
            + Add New Slide
          </button>
        </div>
        
        <div className="space-y-6">
          {slides.map((slide, index) => (
            <div key={slide.id} className="bg-black border border-zinc-800 p-4 rounded-lg relative group">
              {slides.length > 1 && (
                <button onClick={() => removeSlide(slide.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <h4 className="text-[10px] font-bold text-[#fe9a00] mb-4 uppercase tracking-widest">Slide {index + 1}</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  {slide.desktop_url && <img src={slide.desktop_url} alt="Desktop Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone 
                    label={slide.desktop_url ? "Replace Desktop" : "+ Desktop Image"} 
                    subtext="1920x600 px" 
                    height="p-4" 
                    folderPath="hero-banners"
                    onUploadComplete={(url) => updateSlide(slide.id, 'desktop_url', url)}
                  />
                </div>
                <div>
                  {slide.mobile_url && <img src={slide.mobile_url} alt="Mobile Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone 
                    label={slide.mobile_url ? "Replace Mobile" : "+ Mobile Image"} 
                    subtext="800x1200 px" 
                    height="p-4" 
                    folderPath="hero-banners"
                    onUploadComplete={(url) => updateSlide(slide.id, 'mobile_url', url)}
                  />
                </div>
              </div>
              
              <div className="border-t border-zinc-800 pt-4 mt-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Destination Link</label>
                <div className="flex gap-2">
                  <select 
                    value={slide.linkType}
                    onChange={(e) => updateSlide(slide.id, 'linkType', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00] w-1/3"
                  >
                    <option value="series">Specific Series</option>
                    <option value="external">External Web URL</option>
                  </select>
                  
                  {slide.linkType === 'external' ? (
                    <input type="text" placeholder="https://..." value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]" />
                  ) : (
                    <select value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]">
                      <option value="">-- Select a Series --</option>
                      {seriesList.map(s => (
                        <option key={s.slug} value={s.slug}>{s.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MASTER LAYOUT BUILDER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Layout Builder</h3>
            <p className="text-[10px] text-zinc-500">Create rows and assign series to them.</p>
          </div>
          <button onClick={createSection} className="text-[10px] font-bold bg-[#fe9a00] text-black px-4 py-2 rounded hover:bg-white transition-colors">
            + Create New Section
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((sec, secIndex) => (
            <div key={sec.title} className="bg-black border border-zinc-700 rounded-lg overflow-hidden">
              <div className="bg-zinc-800 p-3 flex justify-between items-center">
                <h4 className="text-white font-bold text-xs uppercase tracking-widest">{sec.title}</h4>
                <div className="flex gap-2">
                  <button onClick={() => moveSection(secIndex, 'up')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                  <button onClick={() => moveSection(secIndex, 'down')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => removeSection(sec.title)} className="text-zinc-500 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {sectionSeries[sec.title]?.map((s, sIndex) => (
                  <div key={s.slug} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded">
                    <div className="flex items-center gap-3">
                      <img src={s.cover_url} alt="" className="w-8 h-8 object-cover rounded bg-zinc-800" />
                      <span className="text-xs font-bold text-white uppercase">{s.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => moveSeries(sec.title, sIndex, 'up')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                      <button onClick={() => moveSeries(sec.title, sIndex, 'down')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                      <button onClick={() => removeSeriesFromSection(sec.title, s.slug)} className="p-1 text-zinc-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                
                <select 
                  onChange={(e) => { handleAddSeries(sec.title, e.target.value); e.target.value = ""; }}
                  className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded p-2 text-zinc-400 text-xs focus:border-[#fe9a00] mt-2 cursor-pointer"
                >
                  <option value="">+ Assign a Series to {sec.title}...</option>
                  {seriesList.filter(s => !sectionSeries[sec.title]?.find(existing => existing.slug === s.slug)).map(s => (
                    <option key={s.slug} value={s.slug}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {sections.length === 0 && <p className="text-center text-zinc-500 text-xs py-8">No sections created yet.</p>}
        </div>
      </div>
      
      <button 
        onClick={handleSaveHome}
        disabled={isSaving}
        className={`w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-colors shadow-lg mt-6 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSaving ? 'UPDATING LAYOUT...' : 'Save Complete Layout'}
      </button>
    </div>
  );
};

const SeriesEditor = () => {
  const [targetSeries, setTargetSeries] = useState('new');
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false,
    creators: [{ role: 'Creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }]
  });

  useEffect(() => {
    const fetchSeriesData = async () => {
      if (targetSeries === 'new') {
        setFormData({
          seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false,
          creators: [{ role: 'Creator', name: '', flagCode: '', avatar: '', bio: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }]
        });
      } else {
        const selectedSeries = seriesList.find(s => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries);
          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) {
            loadedCreators = creatorData.map(c => ({ role: c.role || 'Creator', name: c.name || '', flagCode: c.flag_code || '', avatar: c.avatar_url || '', bio: c.bio || '', twitter: c.twitter_url || '', instagram: c.instagram_url || '', supportLink: c.support_url || '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '' }));
          } else {
            loadedCreators = [{ role: 'Creator', name: selectedSeries.creator_name || '', flagCode: selectedSeries.flag_code || '', avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '' }];
          }

          setFormData({
            seriesTitle: selectedSeries.title || '', bannerUrl: selectedSeries.cover_url || '', logoUrl: selectedSeries.logo_url || '', characterUrl: selectedSeries.character_url || '', synopsis: selectedSeries.synopsis || '', 
            awards: selectedSeries.awards || '', hasAwards: selectedSeries.has_awards || false, creators: loadedCreators
          });
        }
      }
    };
    fetchSeriesData();
  }, [targetSeries, seriesList]);

  const handleInputChange = (field, value) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const handleSaveSeries = async () => {
    setIsSaving(true);
    try {
      const slug = formData.seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const activeSlug = targetSeries === 'new' ? slug : targetSeries;
      const primaryCreator = formData.creators[0]; 

      await supabase.from('series').upsert({
        slug: activeSlug, title: formData.seriesTitle, synopsis: formData.synopsis, cover_url: formData.bannerUrl, logo_url: formData.logoUrl, character_url: formData.characterUrl,
        awards: formData.hasAwards ? formData.awards : null, has_awards: formData.hasAwards, creator_name: primaryCreator.name, flag_code: primaryCreator.flagCode, creator_avatar: primaryCreator.avatar, creator_bio: primaryCreator.bio, creator_twitter: primaryCreator.twitter, creator_instagram: primaryCreator.instagram, creator_support_link: primaryCreator.supportLink, updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

      await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      await supabase.from('series_creators').insert(formData.creators.map(c => ({ series_slug: activeSlug, role: c.role || 'Creator', name: c.name, flag_code: c.flagCode, avatar_url: c.avatar, bio: c.bio, twitter_url: c.twitter, instagram_url: c.instagram, support_url: c.supportLink })));

      alert(`SUCCESS! "${formData.seriesTitle}" has been saved.`);
    } catch (error) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm("Are you sure you want to delete this series?")) return;
    try {
      await supabase.from('series').delete().eq('slug', targetSeries);
      alert("Series successfully deleted!");
      setTargetSeries('new'); 
    } catch (error) { alert('Failed to delete: ' + error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4 shadow-md">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Editor Mode</label>
          <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00] transition-colors">
            <option value="new">+ CREATE NEW SERIES</option>
            {seriesList.map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
          </select>
        </div>
        {targetSeries !== 'new' && (<button onClick={handleDeleteSeries} className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded hover:bg-red-500 hover:text-white transition-colors text-[10px] font-bold tracking-widest uppercase">Delete Series</button>)}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 shadow-md">
        <div className="border-b border-zinc-800 pb-6 flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mb-2">Series Title</label>
            <input type="text" value={formData.seriesTitle} onChange={(e) => handleInputChange('seriesTitle', e.target.value)} placeholder="e.g., My Awesome Manga" className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold focus:border-[#fe9a00]" />
          </div>
        </div>
        
        <div>
           <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Series Hero Banner</h3>
           {formData.bannerUrl && <img src={formData.bannerUrl} className="w-full h-32 object-cover rounded-lg mb-3 border border-zinc-700 shadow-lg" />}
           <Dropzone label={formData.bannerUrl ? "Replace Banner Image" : "+ Add Series Banner Image"} subtext="1920x800 px" height="p-6" folderPath="series-banners" onUploadComplete={(url) => handleInputChange('bannerUrl', url)} />
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
           <div>
             <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Series Logo</h3>
             {formData.logoUrl && <div className="bg-black p-2 rounded-lg mb-3 border border-zinc-700"><img src={formData.logoUrl} className="w-full h-16 object-contain" /></div>}
             <Dropzone label={formData.logoUrl ? "Replace Logo" : "+ Add Logo (PNG)"} subtext="Transparent background" height="p-4" folderPath="series-logos" onUploadComplete={(url) => handleInputChange('logoUrl', url)} />
           </div>
           <div>
             <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Card Character</h3>
             {formData.characterUrl && <div className="bg-black p-2 rounded-lg mb-3 border border-zinc-700"><img src={formData.characterUrl} className="w-full h-16 object-contain" /></div>}
             <Dropzone label={formData.characterUrl ? "Replace Character" : "+ Add Character (PNG)"} subtext="Transparent background" height="p-4" folderPath="series-characters" onUploadComplete={(url) => handleInputChange('characterUrl', url)} />
           </div>
        </div>
        
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Story Synopsis</label>
          <textarea 
            rows={3} 
            value={formData.synopsis} 
            onChange={(e) => handleInputChange('synopsis', e.target.value)} 
            placeholder="Synopsis" 
            className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm font-sans focus:border-[#fe9a00]" 
          />
        </div>

        <div className="bg-black p-4 rounded border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={formData.hasAwards} onChange={(e) => handleInputChange('hasAwards', e.target.checked)} className="accent-[#fe9a00] w-4 h-4" />
            <label className="text-[10px] font-bold text-white uppercase tracking-widest">Enable Awards Display</label>
          </div>
          {formData.hasAwards && (
            <div className="space-y-1.5">
              <input type="text" value={formData.awards || ''} onChange={(e) => handleInputChange('awards', e.target.value)} placeholder="Separate awards with commas (e.g. Award One, Award Two, Award Three)" className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00]" />
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold pl-1">⚠️ Crucial: Use commas between awards so they separate nicely next to the title logo!</p>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-6">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Creator Profile(s)</h3>
              <button onClick={() => { const newCreators = formData.creators.length > 1 ? [formData.creators[0]] : [...formData.creators, { role: 'Co-creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }]; handleInputChange('creators', newCreators); }} className="text-[10px] bg-zinc-800 px-3 py-1 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
                {formData.creators.length > 1 ? '- Remove Co-creator' : '+ Add Co-creator'}
              </button>
           </div>
           <div className={`grid ${formData.creators.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
             {formData.creators.map((c, i) => (
               <div key={i} className="bg-black p-4 rounded border border-zinc-800 space-y-4 shadow-lg relative">
                 <label className="absolute top-0 right-0 bg-zinc-800 text-[#fe9a00] px-3 py-1 rounded-bl text-[9px] font-black uppercase tracking-widest">{c.role}</label>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                   <div><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Name</label><input type="text" value={c.name} onChange={(e) => { const nc = [...formData.creators]; nc[i].name = e.target.value; handleInputChange('creators', nc); }} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]" /></div>
                   <div><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Flag Code</label><input type="text" value={c.flagCode} onChange={(e) => { const nc = [...formData.creators]; nc[i].flagCode = e.target.value; handleInputChange('creators', nc); }} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]" /></div>
                 </div>
                 <div className="flex gap-4 items-center">
                   {c.avatar ? (<img src={c.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700" />) : (<div className="w-16 h-16 shrink-0 bg-zinc-900 border border-zinc-700 border-dashed rounded-full flex flex-col items-center justify-center text-zinc-400 text-[8px] hover:border-[#fe9a00] transition-colors relative overflow-hidden"><Dropzone label="+ Avatar" height="h-full w-full absolute inset-0 opacity-0" folderPath="creator-avatars" onUploadComplete={(url) => { const nc = [...formData.creators]; nc[i].avatar = url; handleInputChange('creators', nc); }} /><span>+ Avatar</span></div>)}
                   <div className="flex-1"><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Bio</label><textarea 
                      value={c.bio} 
                      onChange={(e) => { const nc = [...formData.creators]; nc[i].bio = e.target.value; handleInputChange('creators', nc); }} 
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs font-sans focus:border-[#fe9a00]" 
                      rows={2} 
                    /></div>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Socials & Support</label>
                   <div className="grid grid-cols-2 gap-2">
                     <input type="text" value={c.twitter} onChange={(e) => { const nc = [...formData.creators]; nc[i].twitter = e.target.value; handleInputChange('creators', nc); }} placeholder="X (Twitter) URL" className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px] focus:border-[#fe9a00]" />
                     <input type="text" value={c.instagram} onChange={(e) => { const nc = [...formData.creators]; nc[i].instagram = e.target.value; handleInputChange('creators', nc); }} placeholder="Instagram URL" className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px] focus:border-[#fe9a00]" />
                     <input type="text" value={c.supportLink} onChange={(e) => { const nc = [...formData.creators]; nc[i].supportLink = e.target.value; handleInputChange('creators', nc); }} placeholder="Ko-Fi / Donation Link" className="col-span-2 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px] focus:border-[#fe9a00]" />
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <button onClick={handleSaveSeries} disabled={isSaving} className={`w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded transition-colors shadow-lg mt-4 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}>{isSaving ? 'SAVING TO VAULT...' : (targetSeries === 'new' ? 'Save New Series' : 'Update Existing Series')}</button>
      </div>
    </div>
  );
};

// --- MISSING ADMIN COMPONENTS ---
const ChapterUploader = () => <div className="text-white p-6">Chapter Uploader Module Coming Soon</div>;
const MagazineUploader = () => <div className="text-white p-6">Magazine Uploader Module Coming Soon</div>;

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Logged in as Administrator</p>
          </div>
          <button onClick={onBack} className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors">
            Exit Vault
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-6 mb-8 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {[
            { id: 'home', label: 'Home Editor' },
            { id: 'series', label: 'Series Page Editor' },
            { id: 'chapter', label: 'Chapter Upload' },
            { id: 'magazine', label: 'Magazine Upload' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 ${activeTab === tab.id ? 'text-[#fe9a00] border-[#fe9a00]' : 'text-zinc-500 border-transparent hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'home' && <HomeEditor />}
        {activeTab === 'series' && <SeriesEditor />}
        {activeTab === 'chapter' && <ChapterUploader />}
        {activeTab === 'magazine' && <MagazineUploader />}
      </div>
    </div>
  );
};

const AdminLogin = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'saturday') {
      onLogin();
    } else {
      setError('ACCESS DENIED');
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-500 p-6 flex flex-col items-center justify-center font-mono">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-4">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase">System Access</h2>
          <button onClick={onBack} className="text-[10px] uppercase tracking-widest hover:text-white transition-colors">Abort</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-2">Identifier</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
              placeholder="///"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-2">Passcode</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
              placeholder="///"
            />
          </div>
          
          <div className="h-4 flex items-center">
            {error && <p className="text-red-500 text-[10px] font-bold tracking-widest uppercase">{error}</p>}
          </div>
          
          <button type="submit" className="w-full mt-4 bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#fe9a00] hover:text-black transition-all">
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState('home'); 
  
  // LIVE STATE: Remembers what you clicked on the home page
  const [selectedSeries, setSelectedSeries] = useState(null); 
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false); 

  useEffect(() => { 
    const timer = setTimeout(() => setShowSplash(false), 3000); 
    return () => clearTimeout(timer); 
  }, []);
  
  if (showSplash) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 animate-fade-out">
      <style>{`@keyframes fadeOut { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } } .animate-fade-out { animation: fadeOut 3s forwards; }`}</style>
      <img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} alt="Saturday AM Logo" className="w-full max-w-sm p-8" />
    </div>
  );
  
  return (
    <>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      
      {currentView === 'home' && (
        <HomePage 
          onNavigate={(seriesData) => {
            setSelectedSeries(seriesData); // Saves the clicked series to memory
            setCurrentView('series'); // Changes the page
          }} 
          onAdminAccess={() => setCurrentView('admin')} 
        />
      )}
      
      {currentView === 'series' && (
        <SeriesDetailPage 
          series={selectedSeries} // Passes the live data to the detail page
          onBack={() => {
            setCurrentView('home');
            setSelectedSeries(null);
          }} 
        />
      )}
      
      {currentView === 'admin' && (
        isAdminAuthenticated ? 
          <AdminDashboard onBack={() => setCurrentView('home')} /> : 
          <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />
      )}
    </>
  );
}