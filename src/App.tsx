import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Check, Image as ImageIcon, Trash2, Star, Calendar, Menu, Home, Heart, Plus, Search, ShoppingBag, User, BookOpen, Play, ArrowLeft, Bookmark, X, MoveHorizontal, MoveVertical, RotateCcw, MessageCircle, MessageCircleOff, ChevronLeft, ChevronRight, Award, Crop, Flame, ArrowUp, SkipBack, SkipForward, Settings, Shield, CreditCard, Maximize2, Save, Scissors, RefreshCw } from 'lucide-react';
import { supabase } from './supabase';
import { useSeriesData } from './userSeriesData';
import LoginModal from './LoginModal';
import Favorites from './MyFaves';
import Browse from './Browse';

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

const MagazineHomeSection = ({ magazines, onMagazineClick }: any) => {
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
      
      {/* NEW: Double Slanted Accent */}
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
        <button onClick={() => scroll('left')} className="absolute left-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer">
          <ChevronLeft className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x no-scrollbar">
          {magazines.map((m: any) => (
            <div key={m.id} className="w-[45%] sm:w-1/3 md:w-1/4 flex-shrink-0 snap-start cursor-pointer group/card" onClick={() => onMagazineClick(m)}>
              <div className="relative overflow-hidden rounded-lg cursor-pointer aspect-[1424/2000] bg-zinc-900 border border-zinc-800 shadow-lg hover:border-[#fe9a00] transition-colors duration-300 mb-2">
                <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover transform transition-transform duration-500 group-hover/card:scale-105" />
              </div>
              <div className="px-1 text-left">
                <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">{m.title}</h3>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => scroll('right')} className="absolute right-0 top-0 bottom-8 z-10 flex items-center justify-center w-10 sm:w-12 bg-gradient-to-l from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex cursor-pointer">
          <ChevronRight className="w-8 h-8 text-white hover:text-[#fe9a00] transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};

const SeriesSection = ({ title, series, onSeriesClick }: any) => {
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
      
      {/* NEW: Double Slanted Accent */}
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

const FooterNav = ({ onNavigate }: any) => {
  const navItems = [
    { name: 'Home', icon: Home, action: () => onNavigate({ action: 'home' }) },
    { name: 'My Faves', icon: Heart, action: () => onNavigate({ action: 'faves' }) },
    { name: 'Browse', icon: Search, action: () => onNavigate({ action: 'browse' }) },
    { name: 'AM Shop', icon: ShoppingBag, action: null },
    { name: 'Profile', icon: User, action: () => onNavigate({ action: 'profile' }) },
  ];
const HamburgerMenu = ({ isOpen, onClose, onNavigate }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { name: 'Browse Library', action: 'browse' },
    { name: 'Edit Profile', action: 'profile' },
    { name: 'My Favorites', action: 'faves' },
    { name: 'Subscription', action: 'sub' },
    { name: 'Settings', action: 'settings' }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-12 gap-8">
        {menuItems.map((item) => (
          <button 
            key={item.action} 
            onClick={() => { onNavigate({ action: item.action }); onClose(); }}
            className="text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#323232] border-t border-zinc-700 p-2 flex justify-around items-center z-40">
      {navItems.map((item) => (
        <button key={item.name} onClick={item.action} className="flex flex-col items-center gap-0.5 group">
          <item.icon className="w-5 h-5 text-[#fe9a00] group-hover:text-white transition-colors" />
          <span className="text-[9px] font-black text-[#fe9a00] tracking-tight group-hover:text-white transition-colors">
            {item.name}
          </span>
        </button>
      ))}
    </nav>
  );
};

const MangaReader = ({ pages, onClose, chapterId, onHypeUpdate, onHome, onNext, onPrev, hasNext, hasPrev, title, subtitle }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState('horizontal'); // Defaulting to horizontal per your preference
  
  // Immersive UI State
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHideHint, setShowHideHint] = useState(false);

  // Ticker & Quick React State
  const [isTickerEnabled, setIsTickerEnabled] = useState(true);
  const [activeCommentIndex, setActiveCommentIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localComments, setLocalComments] = useState<any[]>([]); // Swapped to real array

  // 1. Fetch Current User Profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || 'https://i.pravatar.cc/150?u=99' });
      }
    });
  }, []);

  // 2. Fetch Reacts when Chapter Loads
  useEffect(() => {
    if (!chapterId) return;
    const fetchReacts = async () => {
      const { data } = await supabase.from('page_reacts').select('*').eq('chapter_id', chapterId).order('created_at', { ascending: true });
      if (data) {
        setLocalComments(data.map((r: any) => ({ id: r.id, pageIndex: r.page_index, user: r.user_name, avatar: r.avatar_url, text: r.text })));
      }
    };
    fetchReacts();
  }, [chapterId]);
  const [isReactInputOpen, setIsReactInputOpen] = useState(false);
  const [reactText, setReactText] = useState('');
  const isSubscriber = true; 

  // Quick React Panel State
  const [isReactPanelOpen, setIsReactPanelOpen] = useState(false);
  const [reactPage, setReactPage] = useState(0);
  const [showReactIndicator, setShowReactIndicator] = useState(true); // NEW: Auto-hide state
  const reactsPerPage = 4;
  
  // NEW: Auto-hide the react indicator after 4 seconds of turning to a new page
  useEffect(() => {
    setShowReactIndicator(true);
    const timer = setTimeout(() => {
      setShowReactIndicator(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentPage]);
  
  // Replace the old visibleComments logic with this strict page-matcher:
  const visibleReacts = localComments.filter(c => 
    mode === 'book' 
      ? (c.pageIndex === currentPage || c.pageIndex === currentPage + 1) 
      : c.pageIndex === currentPage
  );
  const totalReactPages = Math.ceil(visibleReacts.length / reactsPerPage);
  const currentPaginatedReacts = visibleReacts.slice(reactPage * reactsPerPage, (reactPage + 1) * reactsPerPage);

  // Reset panel when turning pages
  useEffect(() => {
    setIsReactPanelOpen(false);
    setReactPage(0);
  }, [currentPage]); 
  
  // End of Chapter Overlay State
  const [showEndPrompt, setShowEndPrompt] = useState(false);
  
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [showTutorial, setShowTutorial] = useState(true);
  const [isTutorialFading, setIsTutorialFading] = useState(false);
  const [pendingHypes, setPendingHypes] = useState(0);
  const hypeRef = useRef(0);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    setCurrentPage(0);
    setShowEndPrompt(false);
    setIsReactInputOpen(false);
    setIsUIVisible(true); 
  }, [chapterId]);

  const handleHypeClick = () => {
    hypeRef.current += 1;
    setPendingHypes(hypeRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!chapterId || hypeRef.current === 0) return;
      const hypesToSave = hypeRef.current;
      hypeRef.current = 0; 
      setPendingHypes(0);
      try {
        const { data } = await supabase.from('chapters').select('hype_count').eq('id', chapterId).single();
        const newTotal = (data?.hype_count || 0) + hypesToSave;
        await supabase.from('chapters').update({ hype_count: newTotal }).eq('id', chapterId);
        if (onHypeUpdate) onHypeUpdate(chapterId, newTotal);
      } catch(e) { console.error("Hype save failed", e) }
    }, 1500);
  };

 
  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsTutorialFading(true), 5000); 
    const removeTimer = setTimeout(() => setShowTutorial(false), 6000); 
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);
const handleReactSubmit = async () => {
    if (!reactText.trim() || !currentUser || !chapterId) return;

    const newReactPayload = {
      chapter_id: chapterId,
      page_index: currentPage,
      user_id: currentUser.id,
      user_name: currentUser.name,
      avatar_url: currentUser.avatar,
      text: reactText.trim()
    };
    
    // Optimistic UI Update (shows immediately)
    const tempId = Date.now();
    setLocalComments([...localComments, { id: tempId, pageIndex: currentPage, user: currentUser.name, avatar: currentUser.avatar, text: reactText.trim() }]);
    setReactText('');
    setIsReactInputOpen(false);

    try {
      const { error } = await supabase.from('page_reacts').insert([newReactPayload]);
      if (error) throw error;
      
      // Bonus: add to their total react stats!
      const { data: profile } = await supabase.from('profiles').select('quick_reacts').eq('id', currentUser.id).single();
      if (profile) await supabase.from('profiles').update({ quick_reacts: (profile.quick_reacts || 0) + 1 }).eq('id', currentUser.id);
    } catch (err) { console.error("Failed to save react:", err); }
  };
  const handleImageLoad = (url: string, e: any) => {
    const { naturalWidth, naturalHeight } = e.target;
    setAspectRatios(prev => ({ ...prev, [url]: naturalWidth / naturalHeight }));
  };

  const isSpread = (pageIndex: number) => {
    if (pageIndex >= pages.length) return false;
    const ratio = aspectRatios[pages[pageIndex]];
    return ratio ? ratio > 1.2 : false; 
  };

  const goNext = (e?: any) => {
    if (e) e.stopPropagation(); 
    if (mode === 'book') {
      const nextLimit = isSpread(currentPage) ? 1 : (isSpread(currentPage + 1) ? 1 : 2);
      if (currentPage + nextLimit > pages.length - 1) {
         setShowEndPrompt(true);
      } else {
         setCurrentPage((p) => p + nextLimit);
      }
    } else {
      if (currentPage >= pages.length - 1) {
         setShowEndPrompt(true);
      } else {
         setCurrentPage((p) => p + 1);
      }
    }
  };

  const goPrev = (e?: any) => {
    if (e) e.stopPropagation();
    if (showEndPrompt) {
      setShowEndPrompt(false);
      return;
    }
    
    if (mode === 'book') {
      if (currentPage === 0) return;
      const prevIndex = currentPage - 1;
      if (isSpread(prevIndex)) { setCurrentPage(prevIndex); } 
      else { setCurrentPage((p) => Math.max(0, p - 2)); }
    } else { 
      setCurrentPage((p) => Math.max(0, p - 1)); 
    }
  };

  const toggleUI = (e: any) => {
    if (e) e.stopPropagation();
    const nextState = !isUIVisible;
    setIsUIVisible(nextState);
    
    // Flash the hint when hiding the UI
    if (!nextState) {
      setShowHideHint(true);
      setTimeout(() => setShowHideHint(false), 2500); // Fades out after 2.5s
    }
  };

  const visibleComments = localComments.filter(c => {
    if (mode === 'vertical') return true; 
    if (mode === 'book') return c.pageIndex === currentPage || c.pageIndex === currentPage + 1; 
    return c.pageIndex === currentPage; 
  });

  useEffect(() => {
    if (!isTickerEnabled || visibleComments.length <= 1) return;
    const interval = setInterval(() => { setActiveCommentIndex((prev) => (prev + 1) % visibleComments.length); }, 4000);
    return () => clearInterval(interval);
  }, [visibleComments.length, isTickerEnabled, currentPage]);

  useEffect(() => { setActiveCommentIndex(visibleComments.length > 0 ? visibleComments.length - 1 : 0); }, [currentPage, mode, localComments.length]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-hidden flex flex-col">
      <style>{`
        @keyframes ticker-fade { 0% { opacity: 0; transform: translateY(5px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-5px); } }
        .animate-ticker-fade { animation: ticker-fade 4s ease-in-out infinite; }
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translate(-50%, 10px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        .animate-slide-up { animation: slide-up-fade 0.2s ease-out forwards; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>

      {/* --- READER CONTENT AREA (Always 100% Full Screen) --- */}
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
        
        {mode === 'horizontal' && (
          <div className="h-full w-full flex items-center justify-center relative select-none">
            {pages[currentPage] ? (
              <img src={pages[currentPage]} onLoad={(e) => handleImageLoad(pages[currentPage], e)} className="max-h-full max-w-full object-contain" alt={`Page ${currentPage + 1}`} />
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
                <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px]">Loading Page...</span>
              </div>
            )}
            
            {/* Invisible Click Zones (Keeps immersive navigation active) */}
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={goPrev} />
            <div className="absolute inset-y-0 left-1/4 right-1/4 z-10 cursor-pointer" onClick={toggleUI} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={goNext} />

            {/* NEW: Constrained Visible Navigation Arrows (Hugs the page, not the screen) */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}>
               <div className="w-full max-w-4xl flex justify-between px-2 sm:px-6">
                 {/* Left Arrow */}
                 <div className={`pointer-events-auto transition-all ${currentPage === 0 ? 'opacity-0 scale-90' : 'opacity-100 scale-100 hover:-translate-x-2'}`}>
                   <button onClick={goPrev} disabled={currentPage === 0} className="bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-full text-zinc-400 hover:text-[#fe9a00] border border-zinc-700 shadow-2xl">
                     <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                   </button>
                 </div>
                 {/* Right Arrow */}
                 <div className="pointer-events-auto transition-all opacity-100 scale-100 hover:translate-x-2">
                   <button onClick={goNext} className="bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-full text-[#fe9a00] hover:text-white border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)] hover:shadow-[0_0_25px_rgba(254,154,0,0.5)] transition-all">
                     <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                   </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {mode === 'vertical' && (
          <div className="h-full w-full overflow-y-auto flex flex-col items-center select-none" onClick={toggleUI}>
            {pages.map((pageUrl: any, index: number) => (
              <img key={index} src={pageUrl} onLoad={(e) => handleImageLoad(pageUrl, e)} className="w-full max-w-3xl object-contain block" alt={`Page ${index + 1}`} />
            ))}
            
            <div className="py-24 flex flex-col items-center text-center w-full max-w-sm mx-auto border-t border-zinc-900 mt-12 mb-12" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">End of Chapter</h2>
              <p className="text-zinc-500 font-bold tracking-widest uppercase text-[10px] mb-8">What would you like to do next?</p>
              <div className="flex flex-col gap-4 w-full px-6">
                {hasNext && (
                  <button onClick={onNext} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-full hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.4)] flex items-center justify-center gap-2">
                    Read Next <SkipForward className="w-5 h-5" />
                  </button>
                )}
                <button onClick={onClose} className="w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back to {subtitle ? subtitle : 'Series'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'book' && (
          <div className="h-full w-full flex items-center justify-center relative select-none bg-black">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 bg-zinc-800/95 text-[#fe9a00] px-6 py-3 rounded-full text-xs font-bold tracking-widest flex items-center gap-3 portrait:flex landscape:hidden pointer-events-none shadow-2xl animate-pulse whitespace-nowrap border border-zinc-700"><RotateCcw className="w-4 h-4" /> Rotate device</div>
            <div className="h-full flex justify-center items-center w-full max-w-7xl mx-auto">
              {isSpread(currentPage) ? (
                <img src={pages[currentPage]} onLoad={(e) => handleImageLoad(pages[currentPage], e)} className="h-full max-w-full object-contain" alt="Full Spread" />
              ) : (
                <>
                  <div className="flex-1 h-full flex justify-end">
                    {pages[currentPage] ? (
                      <img src={pages[currentPage]} onLoad={(e) => handleImageLoad(pages[currentPage], e)} className="h-full object-contain object-right" alt="Left Page" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div></div>
                    )}
                  </div>
                  <div className="flex-1 h-full flex justify-start">
                    {currentPage + 1 < pages.length ? (
                      isSpread(currentPage + 1) ? (<div className="h-full w-full bg-black flex items-center justify-center"><span className="text-zinc-800 text-[10px] uppercase font-black tracking-widest">Turn page for spread</span></div>) : (<img src={pages[currentPage + 1]} onLoad={(e) => handleImageLoad(pages[currentPage + 1], e)} className="h-full object-contain object-left" alt="Right Page" />)
                    ) : (<div className="h-full w-full bg-black" />)}
                  </div>
                </>
              )}
            </div>
            
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={goPrev} />
            <div className="absolute inset-y-0 left-1/4 right-1/4 z-10 cursor-pointer" onClick={toggleUI} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={goNext} />
          </div>
        )}

        {/* FULL SCREEN END OF CHAPTER OVERLAY */}
        {showEndPrompt && mode !== 'vertical' && (
          <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">End of Chapter</h2>
            <p className="text-zinc-400 font-bold tracking-widest uppercase text-xs mb-12">What would you like to do next?</p>
            
            <div className="flex flex-col gap-4 w-full max-w-sm">
              {hasNext && (
                <button onClick={() => { setShowEndPrompt(false); onNext(); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-full hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.4)] flex items-center justify-center gap-2">
                  Read Next <SkipForward className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Back to {subtitle ? subtitle : 'Series'}
              </button>
              
              <button onClick={() => setShowEndPrompt(false)} className="mt-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">
                Cancel & Return to Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- EXPLICIT HINT OVERLAY (Flashes when UI is hidden) --- */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none transition-opacity duration-500 ${showHideHint ? 'opacity-100' : 'opacity-0'}`}>
         <div className="bg-black/90 backdrop-blur-md border border-zinc-700 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-[#fe9a00] animate-spin-slow" />
            <span className="text-white font-black uppercase tracking-widest text-[10px] sm:text-xs">Tap screen to show menus</span>
         </div>
      </div>

      {/* --- TOP NAVIGATION BAR (Sliding Overlay) --- */}
      <div className={`absolute top-0 left-0 right-0 z-40 flex justify-between items-center p-3 bg-black border-b border-zinc-900 transition-transform duration-300 shadow-2xl ${isUIVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-2 sm:gap-4 w-1/4 sm:w-1/3">
          {onHome && (
            <button onClick={onHome} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-[#fe9a00]" title="Home">
              <Home className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white flex items-center gap-2" title={`Back to ${subtitle || 'Series'}`}>
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block truncate max-w-[120px]">
              {subtitle ? `Back` : 'Exit'}
            </span>
          </button>
        </div>
        
        <div className="flex-1 text-center flex flex-col items-center justify-center pointer-events-none px-4">
          {title && <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate w-full">{title}</h3>}
          {subtitle && <p className="text-[#fe9a00] text-[8px] sm:text-[9px] font-black tracking-widest uppercase truncate w-full">{subtitle}</p>}
        </div>

        <div className="w-1/4 sm:w-1/3 flex justify-end items-center gap-2 sm:gap-4 pr-2">
          {/* EXPLICIT HIDE BUTTON */}
          <button onClick={toggleUI} className="p-1.5 sm:px-3 sm:py-2 bg-zinc-900/80 rounded-full flex items-center gap-2 text-[#fe9a00] hover:text-black hover:bg-[#fe9a00] transition-colors shadow-[0_0_15px_rgba(254,154,0,0.2)] border border-[#fe9a00]/30" title="Hide UI">
             <Maximize2 className="w-4 h-4" />
             <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest">Hide UI</span>
          </button>
        </div>
      </div>

      {/* --- QUICK REACT STREAM UI --- */}
      
      {/* 1. The Pulsing Indicator (Compact "!!" Icon with Auto-Hide) */}
      {visibleReacts.length > 0 && !isReactPanelOpen && isUIVisible && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsReactPanelOpen(true); setShowReactIndicator(true); }}
          className={`absolute bottom-24 sm:bottom-28 right-4 sm:right-6 z-50 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-black/80 backdrop-blur-md border border-[#fe9a00] rounded-full shadow-[0_0_15px_rgba(254,154,0,0.5)] transition-all duration-700 ${showReactIndicator ? 'opacity-100 scale-100 animate-pulse hover:scale-110' : 'opacity-0 scale-75 pointer-events-none'}`}
          title="View Page Reacts"
        >
          <span className="text-[#fe9a00] font-black italic tracking-tighter text-sm sm:text-base mt-0.5">
            !!
          </span>
          
          {/* Notification Badge for Count */}
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center rounded-full shadow-md">
            {visibleReacts.length > 99 ? '99+' : visibleReacts.length}
          </span>
        </button>
      )}

      {/* 2. The Chat Window Panel */}
      {isReactPanelOpen && isUIVisible && (
        <div 
          className="absolute bottom-28 right-6 z-[120] w-72 bg-black/90 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Panel Header */}
          <div className="flex justify-between items-center p-3 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Page Reacts
            </span>
            <button onClick={() => setIsReactPanelOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex flex-col gap-3 p-4 min-h-[160px]">
            {currentPaginatedReacts.map((react, idx) => (
              <div key={idx} className="flex gap-3 items-start animate-fade-in">
                {/* Prominent Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#fe9a00] to-purple-600 rounded-full blur-[2px] opacity-50"></div>
                  {react.avatar && !react.avatar.includes('pravatar') ? (
                 <img src={react.avatar} alt={react.user} className="w-8 h-8 rounded-full border-2 border-zinc-800 relative z-10 object-cover" />
               ) : (
                 <div className="w-8 h-8 rounded-full border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center relative z-10">
                   <User className="w-4 h-4 text-zinc-500" />
                 </div>
               )}
                </div>
                
                {/* Comment Body */}
                <div className="flex flex-col">
                  <span className="text-[#fe9a00] text-[9px] font-black tracking-widest uppercase mb-0.5">{react.user}</span>
                  <p className="text-zinc-300 text-[11px] leading-snug">{react.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalReactPages > 1 && (
            <div className="flex justify-between items-center px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/30">
              <button 
                disabled={reactPage === 0} 
                onClick={() => setReactPage(p => p - 1)}
                className="text-zinc-500 hover:text-[#fe9a00] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-600 font-bold tracking-widest text-[9px]">
                {reactPage + 1} / {totalReactPages}
              </span>
              <button 
                disabled={reactPage >= totalReactPages - 1} 
                onClick={() => setReactPage(p => p + 1)}
                className="text-zinc-500 hover:text-[#fe9a00] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUICK REACT INPUT OVERLAY (Locked for non-subscribers) */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md z-[110] flex justify-center pointer-events-none">
        {isReactInputOpen && isUIVisible && (
           <div className="animate-slide-up w-[90vw] bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
              
              {isSubscriber ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    maxLength={140}
                    value={reactText}
                    onChange={(e) => setReactText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleReactSubmit(); }}
                    placeholder="Drop a quick react..."
                    className="bg-black border border-zinc-800 text-white text-xs px-4 py-2.5 rounded-lg flex-1 focus:outline-none focus:border-[#fe9a00] transition-colors"
                  />
                  <span className={`text-[9px] font-black tracking-widest ${reactText.length >= 140 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {reactText.length}/140
                  </span>
                  <button onClick={handleReactSubmit} disabled={!reactText.trim()} className="bg-[#fe9a00] text-black px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Send
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[#fe9a00]" />
                    <div className="flex flex-col">
                      <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px]">Subscriber Exclusive</span>
                      <span className="text-zinc-400 text-[9px] font-bold tracking-widest">Join to leave quick reacts on pages.</span>
                    </div>
                  </div>
                  <button onClick={() => { setIsReactInputOpen(false); /* Trigger Subscribe Flow */ }} className="bg-[#fe9a00] text-black px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors">
                    Unlock
                  </button>
                </div>
              )}

           </div>
        )}
      </div>

      {/* --- BOTTOM ACTION BAR (Sliding Overlay) --- */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-4 py-3 flex justify-between items-center z-50 transition-transform duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] ${isUIVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* Mute Comments (Moved from Header to Footer for cleaner layout) */}
        <div className="flex items-center w-1/4 sm:w-1/3">
           <button onClick={() => setIsTickerEnabled(!isTickerEnabled)} className="p-2 rounded-full flex items-center gap-2 text-zinc-500 hover:text-white transition-colors" title={isTickerEnabled ? "Mute Comments" : "Show Comments"}>
             {isTickerEnabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
             <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">{isTickerEnabled ? 'Mute' : 'Unmute'}</span>
           </button>
        </div>

        {/* Center: Fixed Buttons + In-Line Tutorial Pills */}
        <div className="flex-1 flex justify-center items-center gap-4 relative">
          
          {/* Tutorial Message 1 (Left) */}
          {showTutorial && (
            <div className={`hidden lg:flex items-center pointer-events-none transition-opacity duration-1000 ${isTutorialFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[#fe9a00] text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-black/90 px-4 py-2 rounded-full border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.4)] animate-pulse">
                Choose Style
              </span>
            </div>
          )}

          {/* Combined Toolkit Pill */}
          <div className="flex items-center bg-zinc-900/90 px-1 py-1 rounded-full border border-zinc-800 gap-1 flex-shrink-0">
             <button onClick={() => setMode('horizontal')} className={`p-2 rounded-full transition-colors ${mode === 'horizontal' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><MoveHorizontal className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             <button onClick={() => setMode('vertical')} className={`p-2 rounded-full transition-colors ${mode === 'vertical' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><MoveVertical className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             <button onClick={() => { setMode('book'); if (currentPage % 2 !== 0 && !isSpread(currentPage)) setCurrentPage(Math.max(0, currentPage - 1)); }} className={`p-2 rounded-full transition-colors ${mode === 'book' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             
             <div className="w-px h-5 bg-zinc-700 mx-1"></div>
             
             <button onClick={handleHypeClick} className="p-2 rounded-full transition-colors text-[#fe9a00] hover:bg-black relative flex items-center justify-center" title="Hype Panel">
               <Flame className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${pendingHypes > 0 ? 'scale-125 fill-[#fe9a00]' : ''}`} />
               {pendingHypes > 0 && (<span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">+{pendingHypes}</span>)}
             </button>
             <button onClick={() => setIsReactInputOpen(!isReactInputOpen)} className={`p-2 rounded-full transition-colors ${isReactInputOpen ? 'bg-zinc-800 text-white' : 'text-[#fe9a00] hover:bg-black'}`} title="Quick React">
               <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>
          </div>

          {/* Tutorial Message 2 (Right) */}
          {showTutorial && (
            <div className={`hidden lg:flex items-center pointer-events-none transition-opacity duration-1000 ${isTutorialFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[#fe9a00] text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-black/90 px-4 py-2 rounded-full border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.4)] animate-pulse">
                Drop a Hype!
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 sm:gap-6 w-1/4 sm:w-1/3">
           <span className="text-[10px] sm:text-xs font-bold text-zinc-500 tracking-widest whitespace-nowrap">
             {currentPage + 1} <span className="opacity-50">/ {pages.length}</span>
           </span>
        </div>
      </div>
    </div>
  );
};

const MagazineDetailPage = ({ magazine, onBack, onMagazineSelect }: any) => {
  const [isReaderOpen, setIsReaderOpen] = useState(false);
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
  const previewPages = (magazine.preview_pages && magazine.preview_pages.length > 0) ? magazine.preview_pages.slice(0, 4) : (magazine.pages ? magazine.pages.slice(0, 4) : []);

  const scroll = (direction: string) => {
    if (scrollRef.current) {
      const { current } = scrollRef as any;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 50 : current.offsetWidth - 50;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white pb-12 overflow-hidden">
      {isReaderOpen && (
        <MangaReader 
          pages={magazine.pages || []} 
          title={magazine.title}
          subtitle="Issue Preview"
          onClose={() => setIsReaderOpen(false)} 
          onHome={() => { setIsReaderOpen(false); onBack(); }}
        />
      )}
      
      <button onClick={onBack} className="fixed top-6 left-6 p-3 bg-zinc-900/90 rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors z-50 transform -skew-x-12">
        <div className="transform skew-x-12 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Back</span>
        </div>
      </button>

      <div className="absolute top-32 left-[-10vw] whitespace-nowrap z-0 pointer-events-none select-none opacity-5">
        <h1 className="text-[25vw] font-black italic leading-none tracking-tighter" style={{ color: primaryColor }}>{isPM ? 'SATURDAY PM' : 'SATURDAY AM'}</h1>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col md:flex-row items-center md:items-start gap-12 lg:gap-24">
        <div className="w-full md:w-1/2 flex justify-center md:justify-end perspective-1000">
          <img src={magazine.cover_url} className="w-[85%] md:w-[90%] max-w-md object-contain transition-transform duration-700 hover:-translate-y-2 hover:-translate-x-2 border border-zinc-800" style={{ boxShadow: brutalistShadow }} alt={magazine.title} />
        </div>
        <div className="w-full md:w-1/2 flex flex-col items-start pt-8 md:pt-16">
          <div className="flex items-center gap-4 mb-6">
            {isPM ? (<img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/small%20saturday%20pm%20logo.png`} className="h-8 object-contain" alt="Saturday PM" />) : (<img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png`} className="h-8 object-contain" alt="Saturday AM" />)}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] border-l-2 pl-4 py-1 text-zinc-400" style={{ borderColor: primaryColor }}>Issue Release // {magazine.publish_date ? new Date(magazine.publish_date).getFullYear() : '2026'}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none mb-6 tracking-tighter" style={{ color: primaryColor }}>{magazine.title}</h1>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-md mb-12 border-l border-zinc-800 pl-4">{magazine.synopsis || "No synopsis provided for this issue."}</p>
          <button onClick={() => { if (magazine.pages && magazine.pages.length > 0) { setIsReaderOpen(true); } else { alert("This issue doesn't have any pages uploaded yet!"); } }} className="bg-zinc-900 text-white border border-zinc-700 font-black uppercase tracking-widest px-12 py-5 hover:bg-white hover:text-black hover:border-white transition-all transform -skew-x-12 group">
            <span className="block transform skew-x-12 flex items-center gap-3">Read Issue <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-2 transition-transform" /></span>
          </button>
        </div>
      </div>

      {previewPages.length > 0 && (
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 mb-32">
          <div className="flex items-end gap-4 mb-8 border-b border-zinc-800 pb-4">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Inside Look</h3>
            <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest mb-1">Gallery</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {previewPages[0] && (
              <div onClick={() => setIsReaderOpen(true)} className="md:col-span-2 group/preview bg-zinc-900 overflow-hidden cursor-pointer relative border border-zinc-800 rounded-sm min-h-[400px] md:min-h-[500px]">
                <img src={previewPages[0]} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[50%] group-hover/preview:grayscale-0 group-hover/preview:opacity-100 transition-all duration-700 group-hover/preview:scale-105" alt="Preview 1" />
                <div className="absolute top-4 left-4 bg-black px-4 py-2 text-[10px] font-black tracking-widest uppercase z-10" style={{ color: primaryColor }}>PG. 01</div>
              </div>
            )}
            <div className="flex flex-col gap-3 h-full">
              {previewPages[1] && (
                <div onClick={() => setIsReaderOpen(true)} className="group/preview flex-1 min-h-[150px] bg-zinc-900 overflow-hidden cursor-pointer relative border border-zinc-800 rounded-sm">
                  <img src={previewPages[1]} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[50%] group-hover/preview:grayscale-0 group-hover/preview:opacity-100 transition-all duration-700 group-hover/preview:scale-105" alt="Preview 2" />
                  <div className="absolute top-3 left-3 bg-black px-3 py-1.5 text-[9px] font-black tracking-widest uppercase z-10" style={{ color: primaryColor }}>PG. 02</div>
                </div>
              )}
              {previewPages[2] && (
                <div onClick={() => setIsReaderOpen(true)} className="group/preview flex-1 min-h-[150px] bg-zinc-900 overflow-hidden cursor-pointer relative border border-zinc-800 rounded-sm">
                  <img src={previewPages[2]} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[50%] group-hover/preview:grayscale-0 group-hover/preview:opacity-100 transition-all duration-700 group-hover/preview:scale-105" alt="Preview 3" />
                  <div className="absolute top-3 left-3 bg-black px-3 py-1.5 text-[9px] font-black tracking-widest uppercase z-10" style={{ color: primaryColor }}>PG. 03</div>
                </div>
              )}
              {previewPages[3] && (
                <div onClick={() => setIsReaderOpen(true)} className="group/preview flex-1 min-h-[150px] bg-zinc-900 overflow-hidden cursor-pointer relative border border-zinc-800 rounded-sm">
                  <img src={previewPages[3]} className="absolute inset-0 w-full h-full object-cover object-top opacity-60 grayscale-[50%] group-hover/preview:grayscale-0 group-hover/preview:opacity-100 transition-all duration-700 group-hover/preview:scale-105" alt="Preview 4" />
                  <div className="absolute top-3 left-3 bg-black px-3 py-1.5 text-[9px] font-black tracking-widest uppercase z-10" style={{ color: primaryColor }}>PG. 04</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
const SeriesCommentsSection = ({ seriesSlug }: { seriesSlug: string }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || '' });
      }
    });

    if (seriesSlug) {
      supabase.from('series_comments')
        .select('*')
        .eq('series_slug', seriesSlug)
        .order('created_at', { ascending: false }) 
        .then(({ data }) => { if (data) setComments(data); });
    }
  }, [seriesSlug]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !currentUser || !seriesSlug) return;
    setIsSubmitting(true);
    const newComment = { series_slug: seriesSlug, user_id: currentUser.id, user_name: currentUser.name, avatar_url: currentUser.avatar, text: commentText.trim() };
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { setComments([data, ...comments]); setCommentText(''); }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{comments.length} Comments</span>
      </div>
      <div className="flex gap-4 mb-10">
        {currentUser?.avatar ? (
       <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-zinc-700 object-cover bg-zinc-900 flex-shrink-0" alt="Avatar" />
     ) : (
       <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center flex-shrink-0">
         <User className="w-5 h-5 text-zinc-500" />
       </div>
     )}
        <div className="flex-1 flex flex-col items-end gap-2">
          <textarea
            value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!currentUser}
            placeholder={currentUser ? "What do you think of this series?" : "Please log in to join the discussion."}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-20 disabled:opacity-50"
          />
          <button onClick={handleCommentSubmit} disabled={!commentText.trim() || !currentUser || isSubmitting} className="bg-zinc-800 text-white border border-zinc-700 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group animate-fade-in">
            {comment.avatar_url && !comment.avatar_url.includes('pravatar') ? (
           <img src={comment.avatar_url} className="w-10 h-10 rounded-full border border-zinc-800 object-cover bg-zinc-900 flex-shrink-0" alt={comment.user_name} />
         ) : (
           <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0">
             <User className="w-5 h-5 text-zinc-500" />
           </div>
         )}
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[10px]">{comment.user_name}</span>
                <span className="text-zinc-600 text-[8px] font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{comment.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No comments yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
};
const SeriesDetailPage = ({ series, onBack }: any) => {
  const [localSeries, setLocalSeries] = useState(series);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activePages, setActivePages] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [creators, setCreators] = useState([]);
  const [showAwards, setShowAwards] = useState(false);
  const awardTimeoutRef = useRef<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!series) return;
    const fetchDetails = async () => {
      try {
        const targetSlug = typeof series === 'string' ? series : series?.slug;
        if (!targetSlug) return;
        const { data: freshSeries } = await supabase.from('series').select('*').eq('slug', targetSlug).single();
        if (freshSeries) setLocalSeries(freshSeries);
        const { data: chapterData } = await supabase.from('chapters').select('*').eq('series_slug', targetSlug).eq('is_published', true).order('chapter_number', { ascending: true });
        if (chapterData) setChapters(chapterData as any);
        const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSlug).order('id', { ascending: true });
        if (creatorData && creatorData.length > 0) { setCreators(creatorData as any); } 
        else if (freshSeries) { setCreators([{ role: 'Creator', name: freshSeries.creator_name || 'Saturday AM', flag_code: freshSeries.flag_code || '', avatar_url: freshSeries.creator_avatar || '', bio: freshSeries.creator_bio || '', twitter_url: freshSeries.creator_twitter || '', instagram_url: freshSeries.creator_instagram || '', support_url: freshSeries.creator_support_link || '' }] as any); }
      } catch (err) { console.error("Failed to load series details:", err); }
    };
    fetchDetails();
  }, [series]);

  const totalHype = chapters.reduce((sum: number, ch: any) => sum + (ch.hype_count || 0), 0) + (localSeries?.hype_count || 0);
  const formattedHype = totalHype >= 1000 ? (totalHype / 1000).toFixed(1) + 'K' : totalHype.toString();

  const handleReadChapter = async (chapter: any) => {
    const { data } = await supabase.from('pages').select('image_url').eq('chapter_id', chapter.id).order('page_order', { ascending: true });
    if (data && data.length > 0) { setActivePages(data.map(p => p.image_url) as any); setActiveChapterId(chapter.id); setIsReaderOpen(true); } 
    else { alert("No pages found for this chapter yet!"); }
  };

  const triggerAwards = () => {
    setShowAwards(true);
    if (awardTimeoutRef.current) clearTimeout(awardTimeoutRef.current);
    awardTimeoutRef.current = setTimeout(() => { setShowAwards(false); }, 3000);
  };

  if (!localSeries) return null;
  const safeSynopsis = localSeries.synopsis || '';
  const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

  return (
    <div className="relative min-h-screen bg-black text-white">
      
      {isReaderOpen && (() => {
        const activeChapterData = chapters.find(c => c.id === activeChapterId);
        const currentIndex = chapters.findIndex(c => c.id === activeChapterId);
        const hasNext = currentIndex > -1 && currentIndex < chapters.length - 1;
        const hasPrev = currentIndex > 0;

        return (
          <MangaReader 
            pages={activePages} 
            chapterId={activeChapterId}
            title={activeChapterData ? `Chapter ${activeChapterData.chapter_number} - ${activeChapterData.title || ''}` : ''}
            subtitle={localSeries.title}
            onClose={() => { setIsReaderOpen(false); setActiveChapterId(null); }} 
            onHome={() => { setIsReaderOpen(false); setActiveChapterId(null); onBack(); }}
            onNext={() => { if (hasNext) handleReadChapter(chapters[currentIndex + 1]); }}
            onPrev={() => { if (hasPrev) handleReadChapter(chapters[currentIndex - 1]); }}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onHypeUpdate={(chId: any, newTotal: any) => { setChapters(chapters.map(ch => ch.id === chId ? { ...ch, hype_count: newTotal } : ch)); }}
          />
        );
      })()}

      <div className="sticky top-0 left-0 w-full h-[50vh] sm:h-[60vh] z-0 overflow-hidden bg-black">
        <img src={localSeries.cover_url} className="w-full h-full object-cover opacity-60" alt="Hero Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"><ArrowLeft className="w-6 h-6" /></button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
        <div className="px-6 pt-8 flex flex-col items-center w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            {localSeries.logo_url && <img src={localSeries.logo_url} alt="Logo" className="w-full max-w-[280px] sm:max-w-[350px] h-auto object-contain drop-shadow-2xl" />}
            {localSeries.has_awards && localSeries.awards && (
              <div className="relative flex items-center cursor-pointer" onMouseEnter={() => setShowAwards(true)} onMouseLeave={() => setShowAwards(false)} onClick={triggerAwards}>
                <img src={`${CLOUDFLARE_BASE_URL}/series-page-graphics/award-icon.png`} alt="Award" className={`w-10 h-10 object-contain transition-all duration-200 drop-shadow-lg ${showAwards ? 'opacity-80 scale-110' : 'opacity-100'}`} />
                <div className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 w-max min-w-[120px] bg-zinc-800 border border-zinc-700 p-3 rounded shadow-2xl transition-all duration-300 pointer-events-none z-50 ${showAwards ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
                  {String(localSeries.awards || '').split(',').map((award, i) => (<p key={i} className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest whitespace-nowrap mb-1 last:mb-0">{award.trim()}</p>))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 mt-2">
            {creators.map((c: any, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">{c.role || 'Creator'}:</span><p className="text-[#fe9a00] font-bold text-sm">{c.name || 'Unknown'}</p>
                {c.flag_code && <img src={`https://flagcdn.com/${String(c.flag_code).toLowerCase()}.svg`} alt="Flag" className="w-5 h-3.5 rounded-[2px] shadow-sm opacity-90" />}
              </div>
            ))}
          </div>

          <div className="mt-6 px-2 text-center max-w-2xl">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{safeSynopsis}</p>
            {safeSynopsis.length > 150 && (<button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-black tracking-widest text-[10px] mt-2 uppercase hover:text-white transition-colors">{isExpanded ? '- READ LESS' : '+ READ MORE'}</button>)}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8 w-full">
            <button className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/80 px-6 py-3 rounded-full text-[#fe9a00] font-black uppercase tracking-widest hover:bg-zinc-800 hover:border-[#fe9a00] transition-all group">
              <Flame className="w-5 h-5 group-hover:fill-[#fe9a00] transition-colors" /><span>{formattedHype} HYPE</span> 
            </button>
            <button className="flex items-center gap-2 bg-[#fe9a00] text-black px-8 py-3 rounded-full font-black uppercase tracking-widest hover:bg-white hover:shadow-[0_0_20px_rgba(254,154,0,0.4)] transition-all">
              <Bookmark className="w-5 h-5" /><span>ADD TO FAVES</span>
            </button>
          </div>
        </div>

        <div className="mt-12 w-full border-b border-zinc-800 flex justify-center">
          <div className="w-full max-w-3xl flex justify-center gap-12 px-6">
            <button onClick={() => setActiveTab('chapters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative ${activeTab === 'chapters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>CHAPTERS{activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}</button>
          </div>
        </div>

        <div className="mt-8 px-4 sm:px-6 pb-12 w-full max-w-3xl mx-auto">
          {chapters.map((ch: any, index: number) => {
            // MOCK DATA for local testing so it visually matches your mockup
            const mockProgress = ch.progress || (index === 0 ? 100 : index === 1 ? 50 : 0);
            const realReacts = ch.react_count || 0;

            return (
            <div key={ch.id} onClick={() => handleReadChapter(ch)} className="flex items-center gap-4 sm:gap-6 mb-4 hover:bg-zinc-900/80 p-3 sm:p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 group">
              <div className="relative overflow-hidden rounded-lg min-w-[96px] sm:min-w-[128px]">
                <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className="w-24 h-24 sm:w-32 sm:h-32 object-cover bg-zinc-800 transition-transform duration-500 group-hover:scale-110" alt="Thumbnail" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[10px] text-[#fe9a00] font-black tracking-widest uppercase">CHAPTER {ch.chapter_number}</p>
                  
                  <div className="flex items-center gap-2">
                    {/* HYPE COUNTER */}
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <Flame className="w-3 h-3 text-[#fe9a00] fill-[#fe9a00]/20" />
                       <span className="text-[9px] text-zinc-300 font-bold">{ch.hype_count || 0}</span>
                    </div>
                    {/* QUICK REACT COUNTER */}
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <MessageCircle className="w-3 h-3 text-cyan-400" />
                       <span className="text-[9px] text-zinc-300 font-bold">{realReacts}</span>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-bold text-base sm:text-lg text-white line-clamp-2 mb-2">{ch.title || `Chapter ${ch.chapter_number}`}</h3>
                
                {/* NEW PROGRESS BAR */}
                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                   <div className="flex items-center gap-2">
                     <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#fe9a00] rounded-full transition-all duration-500" 
                         style={{ width: `${mockProgress}%` }} 
                       />
                     </div>
                     <span className="text-[10px] font-black text-zinc-500">{mockProgress}%</span>
                   </div>
                   {mockProgress === 100 && (
                     <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Complete!</span>
                   )}
                </div>

              </div>
              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-[#fe9a00] transition-colors ml-auto flex-shrink-0"><Play className="w-4 h-4 text-white group-hover:text-black transition-colors ml-1" /></div>
            </div>
          )})}
          {chapters.length === 0 && <div className="text-center py-16 text-zinc-500 font-bold tracking-widest text-xs uppercase">No chapters uploaded yet.</div>}
        </div>
<SeriesCommentsSection seriesSlug={localSeries?.slug} />
        <div className="pb-24 px-6 w-full max-w-3xl mx-auto">
          <div className="border-t border-zinc-800 pt-12 flex flex-col items-center gap-16">
            {creators.map((c: any, index) => {
              const safeName = c.name || 'Creator'; const firstName = safeName.split(' ')[0];
              return (
                <div key={index} className="flex flex-col items-center text-center w-full max-w-lg bg-zinc-900/30 p-8 rounded-2xl border border-zinc-800/50">
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-700 overflow-hidden border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.3)]"><img src={c.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} alt={safeName} className="w-full h-full object-cover" /></div>
                    <div><h4 className="font-black text-xl sm:text-2xl tracking-tight">{firstName}</h4><p className="text-[10px] text-[#fe9a00] uppercase font-black tracking-widest mt-1">{c.role || 'Creator'}</p></div>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8">{c.bio || '...'}</p>
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {c.twitter_url && <a href={c.twitter_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Twitter</a>}
                    {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Instagram</a>}
                  </div>
                  {c.support_url && (<button onClick={() => window.open(c.support_url, '_blank')} className="flex items-center justify-center gap-2 w-full sm:w-auto border-2 border-[#fe9a00] text-[#fe9a00] px-8 py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black transition-colors"><Heart className="w-4 h-4" /> Support {firstName}</button>)}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-24 border-t border-zinc-800/50 pt-12">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-full group-hover:bg-[#fe9a00] group-hover:border-[#fe9a00] transition-colors shadow-lg">
                <ArrowUp className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
              </div>
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-white transition-colors">
                Back to Top
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

const HomePage = ({ onNavigate, onAdminAccess, onLoginClick, onMenuToggle }: any) => {
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
      const matchedSeries = seriesList.find(s => s.slug === slide.link_target);
      onNavigate(matchedSeries || slide.link_target); 
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-[#fe9a00] flex items-center justify-center font-black tracking-widest">Loading Vault...</div>;

  return (
    <div className="bg-black min-h-screen text-white p-6 pb-24">
      {/* TOP NAVIGATION BAR */}
        {/* TOP NAVIGATION BAR */}
        <nav className="w-full z-50 p-4 sm:p-6 flex justify-between items-center bg-black border-b border-zinc-900">
          <button onClick={onMenuToggle} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          </button>
          
          <img src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} className="h-6 sm:h-8 object-contain" alt="Saturday AM Logo" />
          
          <div className="flex items-center gap-4">
            <span onClick={onLoginClick} className="text-white text-[10px] sm:text-xs font-bold hidden sm:block cursor-pointer hover:text-[#fe9a00] transition-colors">Login</span>
            <button className="bg-[#fe9a00] text-black px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">Subscribe</button>
          </div>
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
        const seriesInSection = seriesList.filter(s => s.home_section === section.title).sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
        if (seriesInSection.length === 0) return null; 
        return <SeriesSection key={section.id} title={section.title} series={seriesInSection} onSeriesClick={onNavigate} />;
      })}
    
      <div className="mt-8 mb-24 flex justify-center">
        <button onClick={onAdminAccess} className="text-[8px] text-zinc-900 hover:text-zinc-600 tracking-[0.3em] font-black transition-colors cursor-pointer">Admin Access</button>
      </div>
          </div>
  );
};

const compressImage = async (file: any, maxDimension = 1200) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > height && width > maxDimension) { height *= maxDimension / width; width = maxDimension; } 
        else if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob: any) => { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp', lastModified: Date.now() })); }, 'image/webp', 0.85);
      };
    };
  });
};

const uploadToSupabase = async (file: any, folderPath: any) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  try {
    const { error } = await supabase.storage.from('saturday-am-vault').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('saturday-am-vault').getPublicUrl(filePath);
    return publicUrl;
  } catch (error: any) { alert('Error uploading file: ' + error.message); return null; }
};

const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", maxDim = 1200, onUploadComplete }: any) => {
  const fileInputRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files: any) => {
    setIsUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const optimizedFile = await compressImage(files[i], maxDim);
      const url = await uploadToSupabase(optimizedFile, folderPath);
      if (url) urls.push(url);
    }
    setIsUploading(false);
    if (onUploadComplete && urls.length > 0) { multiple ? onUploadComplete(urls) : onUploadComplete(urls[0]); }
  };

  return (
    <div 
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { 
        e.preventDefault(); 
        setIsDragging(false); 
        if (e.dataTransfer.files.length) {
          // Take a static snapshot of dropped files
          const filesArray = Array.from(e.dataTransfer.files);
          processFiles(filesArray); 
        } 
      }}
      className={`w-full bg-black border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${height} ${isDragging ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-700 hover:border-[#fe9a00]'} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        multiple={multiple} 
        onChange={(e: any) => { 
          if (e.target.files.length) {
            // Take a static snapshot of clicked files before clearing the input
            const filesArray = Array.from(e.target.files);
            processFiles(filesArray);
            e.target.value = null; 
          }
        }} 
      />
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
  const [slides, setSlides] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionSeries, setSectionSeries] = useState<any>({});
  
  const [availableMagazines, setAvailableMagazines] = useState<any[]>([]);
  const [featuredMagazines, setFeaturedMagazines] = useState<any[]>([]);

  useEffect(() => {
    const fetchLayoutData = async () => {
      const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
      if (slideData && slideData.length > 0) {
        setSlides(slideData.map(s => ({ id: s.id, desktop_url: s.desktop_url || '', mobile_url: s.mobile_url || '', linkType: s.link_type || 'series', linkTarget: s.link_target || '' })));
      } else {
        setSlides([{ id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
      }
      const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
      if (sectionData) {
        setSections(sectionData);
        const mapping: any = {};
        sectionData.forEach(sec => { mapping[sec.title] = seriesList.filter(s => s.home_section === sec.title).sort((a, b) => (a.display_order || 99) - (b.display_order || 99)); });
        setSectionSeries(mapping);
      }
      
      const { data: magData } = await supabase.from('magazines').select('*').order('publish_date', { ascending: false });
      if (magData) {
        setAvailableMagazines(magData);
        setFeaturedMagazines(magData.filter(m => m.home_section === 'Featured').sort((a,b) => (a.display_order || 99) - (b.display_order || 99)));
      }
    };
    if (seriesList.length > 0) fetchLayoutData();
  }, [seriesList]);

  const addSlide = () => setSlides([...slides, { id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
  const removeSlide = (idToRemove: any) => setSlides(slides.filter(slide => slide.id !== idToRemove));
  const updateSlide = (id: any, field: any, value: any) => setSlides(slides.map(slide => slide.id === id ? { ...slide, [field]: value } : slide));
  
  const createSection = () => {
    const title = window.prompt("Enter new section title:");
    if (title && !sections.find(s => s.title === title)) { setSections([...sections, { title }]); setSectionSeries({ ...sectionSeries, [title]: [] }); }
  };
  const removeSection = (titleToRemove: any) => {
    if (!window.confirm(`Delete the "${titleToRemove}" section?`)) return;
    setSections(sections.filter(s => s.title !== titleToRemove));
    const newMapping = { ...sectionSeries }; delete newMapping[titleToRemove]; setSectionSeries(newMapping);
  };
  const moveSection = (index: number, direction: string) => {
    const newArr = [...sections];
    if (direction === 'up' && index > 0) [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    if (direction === 'down' && index < newArr.length - 1) [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    setSections(newArr);
  };
  const handleAddSeries = (sectionTitle: any, seriesSlug: any) => {
    if (!seriesSlug) return;
    const seriesToAdd = seriesList.find(s => s.slug === seriesSlug);
    if (!seriesToAdd || sectionSeries[sectionTitle]?.find((s: any) => s.slug === seriesSlug)) return;
    setSectionSeries({ ...sectionSeries, [sectionTitle]: [...(sectionSeries[sectionTitle] || []), seriesToAdd] });
  };
  const removeSeriesFromSection = (sectionTitle: any, seriesSlug: any) => { setSectionSeries({ ...sectionSeries, [sectionTitle]: sectionSeries[sectionTitle].filter((s: any) => s.slug !== seriesSlug) }); };
  const moveSeries = (sectionTitle: any, index: number, direction: string) => {
    const arr = [...sectionSeries[sectionTitle]];
    if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    setSectionSeries({ ...sectionSeries, [sectionTitle]: arr });
  };

  const handleAddMagazine = (magId: any) => {
    if (!magId) return;
    const magToAdd = availableMagazines.find(m => m.id.toString() === magId.toString());
    if (!magToAdd || featuredMagazines.find((m: any) => m.id === magToAdd.id)) return;
    setFeaturedMagazines([...featuredMagazines, magToAdd]);
  };
  const removeMagazine = (magId: any) => { setFeaturedMagazines(featuredMagazines.filter((m: any) => m.id !== magId)); };
  const moveMagazine = (index: number, direction: string) => {
    const arr = [...featuredMagazines];
    if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    setFeaturedMagazines(arr);
  };

  const handleSaveHome = async () => {
    setIsSaving(true);
    try {
      const { error: slideErr } = await supabase.from('hero_slides').delete().not('id', 'is', null);
      if (slideErr) throw slideErr;

      const validSlides = slides.filter(s => s.desktop_url || s.mobile_url).map(slide => ({ desktop_url: slide.desktop_url, mobile_url: slide.mobile_url, link_type: slide.linkType, link_target: slide.linkTarget }));
      if (validSlides.length > 0) await supabase.from('hero_slides').insert(validSlides);
      
      const { error: secErr } = await supabase.from('home_sections').delete().not('title', 'is', null);
      if (secErr) throw secErr;

      const newSections = sections.map((sec, i) => ({ title: sec.title, display_order: i + 1 }));
      if (newSections.length > 0) await supabase.from('home_sections').insert(newSections);

      const updates: any[] = []; const activeSlugs = new Set();
      Object.entries(sectionSeries).forEach(([sectionTitle, seriesArr]: any) => {
        seriesArr.forEach((s: any, index: number) => { updates.push({ slug: s.slug, home_section: sectionTitle, display_order: index + 1 }); activeSlugs.add(s.slug); });
      });
      seriesList.forEach(s => { if (s.home_section && s.home_section !== 'None' && !activeSlugs.has(s.slug)) updates.push({ slug: s.slug, home_section: 'None', display_order: 99 }); });
      
      for (const u of updates) { 
        const { error: upErr } = await supabase.from('series').update({ home_section: u.home_section, display_order: u.display_order }).eq('slug', u.slug); 
        if (upErr) throw upErr;
      }

      const magUpdates: any[] = [];
      featuredMagazines.forEach((m: any, i: number) => magUpdates.push({ id: m.id, home_section: 'Featured', display_order: i + 1 }));
      availableMagazines.forEach(m => {
        if (!featuredMagazines.find(f => f.id === m.id) && m.home_section === 'Featured') {
          magUpdates.push({ id: m.id, home_section: 'None', display_order: 99 });
        }
      });
      
      for (const u of magUpdates) { 
        const { error: magErr } = await supabase.from('magazines').update({ home_section: u.home_section, display_order: u.display_order }).eq('id', u.id); 
        if (magErr) throw magErr;
      }

      alert("SUCCESS! Home layout has been saved.");
      window.location.reload(); 
    } catch (error: any) { alert('Failed to save layout: ' + error.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Hero Slideshow</h3></div>
          <button onClick={addSlide} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">+ Add Slide</button>
        </div>
        <div className="space-y-6">
          {slides.map((slide, index) => (
            <div key={slide.id} className="bg-black border border-zinc-800 p-4 rounded-lg relative group">
              {slides.length > 1 && (<button onClick={() => removeSlide(slide.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>)}
              <h4 className="text-[10px] font-bold text-[#fe9a00] mb-4 uppercase tracking-widest">Slide {index + 1}</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  {slide.desktop_url && <img src={slide.desktop_url} alt="Desktop Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone label={slide.desktop_url ? "Replace Desktop" : "+ Desktop Image"} height="p-4" folderPath="hero-banners" onUploadComplete={(url: any) => updateSlide(slide.id, 'desktop_url', url)} />
                </div>
                <div>
                  {slide.mobile_url && <img src={slide.mobile_url} alt="Mobile Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone label={slide.mobile_url ? "Replace Mobile" : "+ Mobile Image"} height="p-4" folderPath="hero-banners" onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)} />
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4 mt-2">
                <label className="block text-[10px] font-bold text-zinc-400 tracking-widest mb-2">Destination Link</label>
                <div className="flex gap-2">
                  <select value={slide.linkType} onChange={(e) => updateSlide(slide.id, 'linkType', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs w-1/3 focus:border-[#fe9a00]">
                    <option value="series">Specific Series</option><option value="external">External Web URL</option>
                  </select>
                  {slide.linkType === 'external' ? (
                    <input type="text" placeholder="https://..." value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]" />
                  ) : (
                    <select value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]">
                      <option value="">-- Select Series --</option>
                      {seriesList.map(s => (<option key={s.slug} value={s.slug}>{s.title}</option>))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Featured Magazine Lane (Top)</h3></div>
        </div>
        <div className="bg-black border border-zinc-700 rounded-lg overflow-hidden">
          <div className="p-4 space-y-2">
            {featuredMagazines.map((m: any, mIndex: number) => (
              <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded">
                <div className="flex items-center gap-3"><img src={m.cover_url} alt="" className="w-6 h-8 object-cover rounded bg-zinc-800" /><span className="text-xs font-bold text-white uppercase">{m.title}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => moveMagazine(mIndex, 'up')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                  <button onClick={() => moveMagazine(mIndex, 'down')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => removeMagazine(m.id)} className="p-1 text-zinc-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <select onChange={(e) => { handleAddMagazine(e.target.value); e.target.value = ""; }} className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded p-2 text-zinc-400 text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors">
              <option value="">+ Assign an Issue to the Top Lane...</option>
              {availableMagazines.filter(m => !featuredMagazines.find(f => f.id === m.id)).map(m => (<option key={m.id} value={m.id}>{m.title}</option>))}
            </select>
            <p className="text-[10px] text-zinc-500 italic mt-2">*To upload new covers or edit synopses, switch to the Magazine Upload tab.</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Series Layout Builder</h3></div>
          <button onClick={createSection} className="text-[10px] font-bold bg-[#fe9a00] text-black px-4 py-2 rounded hover:bg-white transition-colors">+ Create Section</button>
        </div>
        <div className="space-y-6">
          {sections.map((sec, secIndex) => (
            <div key={sec.title} className="bg-black border border-zinc-700 rounded-lg overflow-hidden">
              <div className="bg-zinc-800 p-3 flex justify-between items-center">
                <h4 className="text-white font-bold text-xs tracking-widest">{sec.title}</h4>
                <div className="flex gap-2">
                  <button onClick={() => moveSection(secIndex, 'up')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                  <button onClick={() => moveSection(secIndex, 'down')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => removeSection(sec.title)} className="text-zinc-500 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {sectionSeries[sec.title]?.map((s: any, sIndex: number) => (
                  <div key={s.slug} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded">
                    <div className="flex items-center gap-3"><img src={s.cover_url} alt="" className="w-8 h-8 object-cover rounded bg-zinc-800" /><span className="text-xs font-bold text-white uppercase">{s.title}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => moveSeries(sec.title, sIndex, 'up')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                      <button onClick={() => moveSeries(sec.title, sIndex, 'down')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                      <button onClick={() => removeSeriesFromSection(sec.title, s.slug)} className="p-1 text-zinc-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <select onChange={(e) => { handleAddSeries(sec.title, e.target.value); e.target.value = ""; }} className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded p-2 text-zinc-400 text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors">
                  <option value="">+ Assign a Series to {sec.title}...</option>
                  {seriesList.filter(s => !sectionSeries[sec.title]?.find((existing: any) => existing.slug === s.slug)).map(s => (<option key={s.slug} value={s.slug}>{s.title}</option>))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={handleSaveHome} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-lg mt-6 hover:bg-white transition-colors">{isSaving ? 'UPDATING...' : 'Save Complete Layout'}</button>
    </div>
  );
};

const SeriesEditor = () => {
  const [targetSeries, setTargetSeries] = useState('new');
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false, creators: [{ role: 'Creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }] });

  useEffect(() => {
    const fetchSeriesData = async () => {
      if (targetSeries === 'new') {
        setFormData({ seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false, creators: [{ role: 'Creator', name: '', flagCode: '', avatar: '', bio: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }] });
      } else {
        const selectedSeries = seriesList.find(s => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries);
          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) { loadedCreators = creatorData.map(c => ({ role: c.role || 'Creator', name: c.name || '', flagCode: c.flag_code || '', avatar: c.avatar_url || '', bio: c.bio || '', twitter: c.twitter_url || '', instagram: c.instagram_url || '', supportLink: c.support_url || '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '' })); } 
          else { loadedCreators = [{ role: 'Creator', name: selectedSeries.creator_name || '', flagCode: selectedSeries.flag_code || '', avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '' }]; }
          setFormData({ seriesTitle: selectedSeries.title || '', bannerUrl: selectedSeries.cover_url || '', logoUrl: selectedSeries.logo_url || '', characterUrl: selectedSeries.character_url || '', synopsis: selectedSeries.synopsis || '', awards: selectedSeries.awards || '', hasAwards: selectedSeries.has_awards || false, creators: loadedCreators });
        }
      }
    };
    fetchSeriesData();
  }, [targetSeries, seriesList]);

  const handleInputChange = (field: any, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const handleSaveSeries = async () => {
    setIsSaving(true);
    try {
      const slug = formData.seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const activeSlug = targetSeries === 'new' ? slug : targetSeries;
      const primaryCreator = formData.creators[0]; 
      await supabase.from('series').upsert({ slug: activeSlug, title: formData.seriesTitle, synopsis: formData.synopsis, cover_url: formData.bannerUrl, logo_url: formData.logoUrl, character_url: formData.characterUrl, awards: formData.hasAwards ? formData.awards : null, has_awards: formData.hasAwards, creator_name: primaryCreator.name, flag_code: primaryCreator.flagCode, creator_avatar: primaryCreator.avatar, creator_bio: primaryCreator.bio, creator_twitter: primaryCreator.twitter, creator_instagram: primaryCreator.instagram, creator_support_link: primaryCreator.supportLink, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
      await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      await supabase.from('series_creators').insert(formData.creators.map(c => ({ series_slug: activeSlug, role: c.role || 'Creator', name: c.name, flag_code: c.flagCode, avatar_url: c.avatar, bio: c.bio, twitter_url: c.twitter, instagram_url: c.instagram, support_url: c.supportLink })));
      alert(`SUCCESS! Saved.`);
    } catch (error: any) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm("Delete this series?")) return;
    try { await supabase.from('series').delete().eq('slug', targetSeries); alert("Deleted!"); setTargetSeries('new'); } catch (error: any) { alert('Failed: ' + error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Editor Mode</label>
          <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
            <option value="new">+ CREATE NEW SERIES</option>
            {seriesList.map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
          </select>
        </div>
        {targetSeries !== 'new' && (<button onClick={handleDeleteSeries} className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded">Delete</button>)}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
        <div className="border-b border-zinc-800 pb-6"><label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Series Title</label><input type="text" value={formData.seriesTitle} onChange={(e) => handleInputChange('seriesTitle', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold" /></div>
        <div>
           <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Series Banner</h3>
           {formData.bannerUrl && <img src={formData.bannerUrl} className="w-full h-32 object-cover rounded-lg mb-3" />}
           <Dropzone label="+ Add Banner" height="p-6" folderPath="series-banners" onUploadComplete={(url: any) => handleInputChange('bannerUrl', url)} />
        </div>
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
           <div><h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Logo</h3>{formData.logoUrl && <img src={formData.logoUrl} className="h-16 mb-3 bg-black p-2 rounded" />}<Dropzone label="+ Add Logo" folderPath="series-logos" onUploadComplete={(url: any) => handleInputChange('logoUrl', url)} /></div>
           <div><h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Character</h3>{formData.characterUrl && <img src={formData.characterUrl} className="h-16 mb-3 bg-black p-2 rounded" />}<Dropzone label="+ Add Character" folderPath="series-characters" onUploadComplete={(url: any) => handleInputChange('characterUrl', url)} /></div>
        </div>
        <div><label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Synopsis</label><textarea rows={3} value={formData.synopsis} onChange={(e) => handleInputChange('synopsis', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm" /></div>
        <div className="bg-black p-4 rounded border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2"><input type="checkbox" checked={formData.hasAwards} onChange={(e) => handleInputChange('hasAwards', e.target.checked)} className="accent-[#fe9a00] w-4 h-4" /><label className="text-[10px] font-bold text-white uppercase">Enable Awards</label></div>
          {formData.hasAwards && (<input type="text" placeholder="e.g., 2025 Bronze Award Winner" value={formData.awards || ''} onChange={(e) => handleInputChange('awards', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />)}
        </div>
        
        <div className="border-t border-zinc-800 pt-6">
           <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-[#fe9a00] uppercase text-xs">Creators</h3><button onClick={() => { const nc = formData.creators.length > 1 ? [formData.creators[0]] : [...formData.creators, { role: 'Co-creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', youtube: '', facebook: '', twitch: '', patreon: '', tiktok: '', supportLink: '' }]; handleInputChange('creators', nc); }} className="text-[10px] bg-zinc-800 px-3 py-1 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">{formData.creators.length > 1 ? '- Remove Co-creator' : '+ Add Co-creator'}</button></div>
           <div className={`grid ${formData.creators.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
             {formData.creators.map((c, i) => (
               <div key={i} className="bg-black p-4 rounded border border-zinc-800 space-y-4 relative">
                 <div className="grid grid-cols-3 gap-2">
                   <input type="text" placeholder="Role (e.g., Creator)" value={c.role} onChange={(e) => { const nc = [...formData.creators]; nc[i].role = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs" />
                   <input type="text" placeholder="Full Name" value={c.name} onChange={(e) => { const nc = [...formData.creators]; nc[i].name = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs" />
                   <input type="text" placeholder="Flag Code (e.g., US)" value={c.flagCode} onChange={(e) => { const nc = [...formData.creators]; nc[i].flagCode = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs" />
                 </div>
                 <div className="flex gap-4 items-center">
                   {c.avatar ? (<img src={c.avatar} className="w-16 h-16 rounded-full object-cover" />) : (<div className="w-24"><Dropzone label="+ Avatar" height="p-4" folderPath="creator-avatars" onUploadComplete={(url: any) => { const nc = [...formData.creators]; nc[i].avatar = url; handleInputChange('creators', nc); }} /></div>)}
                   <textarea placeholder="Creator Bio..." value={c.bio} onChange={(e) => { const nc = [...formData.creators]; nc[i].bio = e.target.value; handleInputChange('creators', nc); }} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs h-16" rows={2} />
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                   <input type="text" placeholder="Twitter URL" value={c.twitter} onChange={(e) => { const nc = [...formData.creators]; nc[i].twitter = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px]" />
                   <input type="text" placeholder="Instagram URL" value={c.instagram} onChange={(e) => { const nc = [...formData.creators]; nc[i].instagram = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px]" />
                   <input type="text" placeholder="Support URL (Optional)" value={c.supportLink} onChange={(e) => { const nc = [...formData.creators]; nc[i].supportLink = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px]" />
                 </div>
               </div>
             ))}
           </div>
        </div>
        <button onClick={handleSaveSeries} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded mt-4 hover:bg-white transition-colors">{isSaving ? 'SAVING...' : 'Save Series'}</button>
      </div>
    </div>
  );
};

const MagazineUploader = ({ onDirty, onClean }: any) => {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [targetMagazine, setTargetMagazine] = useState('new');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '', 
    coverUrl: '', 
    synopsis: '', 
    publishDate: new Date().toISOString().split('T')[0],
    pages: [] as string[],
    previewPages: [] as string[],
    brand: 'AM',
    isPublished: false // NEW: Tracks live/draft status
  });

  useEffect(() => {
    const fetchMagazines = async () => {
      const { data } = await supabase.from('magazines').select('*').order('publish_date', { ascending: false });
      if (data) setMagazines(data);
    };
    fetchMagazines();
  }, [isSaving]);

  useEffect(() => {
    if (targetMagazine === 'new') {
      setFormData({ 
        title: '', coverUrl: '', synopsis: '', 
        publishDate: new Date().toISOString().split('T')[0], 
        pages: [], previewPages: [], brand: 'AM', isPublished: false 
      });
    } else {
      const selected = magazines.find(m => m.id.toString() === targetMagazine);
      if (selected) {
        setFormData({
          title: selected.title || '',
          coverUrl: selected.cover_url || '',
          synopsis: selected.synopsis || '',
          publishDate: selected.publish_date || new Date().toISOString().split('T')[0],
          pages: selected.pages || [],
          previewPages: selected.preview_pages || [],
          brand: selected.brand || 'AM',
          isPublished: selected.is_published || false // Load draft/live state
        });
      }
    }
  }, [targetMagazine, magazines]);

  const handleTargetChange = (newTarget: string) => {
    if (targetMagazine !== newTarget && onDirty) {
      const confirmLeave = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmLeave) return;
    }
    if (onClean) onClean();
    setTargetMagazine(newTarget);
  };

  // NEW: Receives boolean to determine if saving as draft or live
  const handleSaveMagazine = async (publishStatus: boolean) => {
    setIsSaving(true);
    try {
      if (!formData.title || formData.title.trim() === '') throw new Error("Please enter an Issue Title.");

      const payload = {
        title: formData.title, cover_url: formData.coverUrl, synopsis: formData.synopsis,
        publish_date: formData.publishDate, pages: formData.pages, 
        preview_pages: formData.previewPages, brand: formData.brand,
        is_published: publishStatus // Push state to database
      };

      if (targetMagazine === 'new') {
        const { error } = await supabase.from('magazines').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('magazines').update(payload).eq('id', targetMagazine);
        if (error) throw error;
      }
      
      alert(`SUCCESS! "${formData.title}" has been ${publishStatus ? 'PUBLISHED' : 'SAVED AS DRAFT'}.`);
      setTargetMagazine('new');
      if (onClean) onClean();
    } catch (error: any) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteMagazine = async () => {
    if (!window.confirm("Delete this issue?")) return;
    try { 
      await supabase.from('magazines').delete().eq('id', targetMagazine); 
      alert("Deleted!"); 
      setTargetMagazine('new'); 
      if (onClean) onClean();
    } 
    catch (error: any) { alert('Failed: ' + error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4 shadow-md">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Editor Mode</label>
          <select value={targetMagazine} onChange={(e) => handleTargetChange(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
            <option value="new">+ CREATE NEW ISSUE</option>
            {/* NEW: Adds Live/Draft status directly into the dropdown options */}
            {magazines.map(m => (
              <option key={m.id} value={m.id}>
                {m.is_published ? '[LIVE] ' : '[DRAFT] '} {m.title}
              </option>
            ))}
          </select>
        </div>
        {targetMagazine !== 'new' && (
          <button onClick={handleDeleteMagazine} className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded hover:bg-red-500 hover:text-white transition-colors text-[10px] font-bold tracking-widest uppercase">Delete Issue</button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 shadow-md">
        
        {/* NEW: Visual Badge in Editor Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
           <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
              {targetMagazine === 'new' ? 'New Issue Setup' : `Editing Issue`}
           </h3>
           {targetMagazine !== 'new' && (
              formData.isPublished ? (
                 <span className="bg-green-500/20 text-green-500 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-green-500/30">Live</span>
              ) : (
                 <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-zinc-700">Draft</span>
              )
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800 pb-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mb-2">Issue Title</label>
            <input type="text" value={formData.title} onChange={(e) => { setFormData({...formData, title: e.target.value}); if(onDirty) onDirty(); }} placeholder="e.g., Saturday AM #165" className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold focus:border-[#fe9a00]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mb-2">Publish Date</label>
            <input type="date" value={formData.publishDate} onChange={(e) => { setFormData({...formData, publishDate: e.target.value}); if(onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold focus:border-[#fe9a00]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
          <div>
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mb-2">Magazine Brand</label>
            <select value={formData.brand} onChange={(e) => { setFormData({...formData, brand: e.target.value}); if(onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
              <option value="AM">Saturday AM (Orange UI)</option>
              <option value="PM">Saturday PM (Red UI)</option>
            </select>
          </div>
        </div>

        <div className="border-b border-zinc-800 pb-6">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase tracking-widest mb-2">Synopsis / Issue Description</label>
          <textarea rows={4} value={formData.synopsis} onChange={(e) => { setFormData({...formData, synopsis: e.target.value}); if(onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">High-Res Cover</h3>
            {formData.coverUrl && <img src={formData.coverUrl} className="w-full h-auto aspect-[1424/2000] object-cover rounded-lg mb-4 border border-zinc-700 shadow-lg mx-auto" />}
            <Dropzone label={formData.coverUrl ? "Replace" : "+ Upload"} height="p-4" folderPath="magazine-covers" maxDim={2000} onUploadComplete={(url: any) => { setFormData({...formData, coverUrl: url}); if(onDirty) onDirty(); }} />
          </div>

          <div>
            <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">"In This Issue" Previews</h3>
            <p className="text-[10px] text-zinc-500 mb-2">Max 4 Pages</p>
            {formData.previewPages.length > 0 && (
              <div className="bg-black border border-zinc-800 p-2 rounded mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {formData.previewPages.map((url, i) => (<img key={i} src={url} alt={`Preview ${i+1}`} className="w-full aspect-[2/3] object-cover rounded border border-zinc-700" />))}
                </div>
                <button onClick={() => { setFormData({...formData, previewPages: []}); if(onDirty) onDirty(); }} className="w-full mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400">Clear Previews</button>
              </div>
            )}
            <Dropzone label="+ Batch Upload Previews" multiple={true} height="p-4" folderPath="magazine-pages" onUploadComplete={(urls: any) => { setFormData({...formData, previewPages: [...formData.previewPages, ...urls].slice(0, 4)}); if(onDirty) onDirty(); }} />
          </div>

          <div>
            <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Full Issue Pages</h3>
            <p className="text-[10px] text-zinc-500 mb-2">Batch select all.</p>
            {formData.pages.length > 0 && (
              <div className="bg-black border border-zinc-800 p-2 rounded mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs text-zinc-400 mb-2">{formData.pages.length} Pages Uploaded</p>
                <div className="grid grid-cols-2 gap-2">
                  {formData.pages.map((url, i) => (<img key={i} src={url} alt={`Pg ${i+1}`} className="w-full aspect-[2/3] object-cover rounded border border-zinc-700" />))}
                </div>
                <button onClick={() => { setFormData({...formData, pages: []}); if(onDirty) onDirty(); }} className="w-full mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400">Clear Full Issue</button>
              </div>
            )}
            <Dropzone label="+ Batch Upload Issue" multiple={true} height="p-4" folderPath="magazine-pages" onUploadComplete={(urls: any) => { setFormData({...formData, pages: [...formData.pages, ...urls]}); if(onDirty) onDirty(); }} />
          </div>
        </div>

        {/* NEW: Dual Button Layout */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-800">
          <button 
            onClick={() => handleSaveMagazine(false)} 
            disabled={isSaving} 
            className={`w-1/2 bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded transition-all border border-zinc-700 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700'}`}
          >
            {isSaving ? 'SAVING...' : (formData.isPublished ? 'Revert to Draft' : 'Save Draft')}
          </button>
          
          <button 
            onClick={() => handleSaveMagazine(true)} 
            disabled={isSaving} 
            className={`w-1/2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}
          >
            {isSaving ? 'PUBLISHING...' : (formData.isPublished ? 'Update Live Issue' : 'Publish Issue')}
          </button>
        </div>

      </div>
    </div>
  );
};

// --- CROPPER ENGINE ---
const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
  const image = new Image();
  image.crossOrigin = "anonymous"; 
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx?.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], "thumb.webp", { type: "image/webp" }));
    }, 'image/webp', 0.85);
  });
};

const ThumbnailCropperModal = ({ imageUrl, onCropComplete, onCancel }: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedFile: any = await getCroppedImg(imageUrl, croppedAreaPixels);
      const publicUrl = await uploadToSupabase(croppedFile, 'chapter-thumbnails');
      if (publicUrl) onCropComplete(publicUrl);
    } catch(e) {
      alert("Cropping failed. Please try again.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg mb-4 flex justify-between items-center">
         <h3 className="text-white font-black text-lg tracking-widest uppercase">Crop Thumbnail</h3>
         <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
      </div>
      
      <div className="relative w-full max-w-lg aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden">
         <Cropper
           image={imageUrl}
           crop={crop}
           zoom={zoom}
           aspect={1}
           onCropChange={setCrop}
           onCropComplete={(area, areaPixels) => setCroppedAreaPixels(areaPixels)}
           onZoomChange={setZoom}
         />
      </div>

      <div className="w-full max-w-lg mt-6 space-y-6">
         <input 
           type="range" 
           min={1} max={3} step={0.1} 
           value={zoom} 
           onChange={(e) => setZoom(Number(e.target.value))} 
           className="w-full accent-[#fe9a00]" 
         />
         <button onClick={handleSave} disabled={isProcessing} className="w-full py-4 bg-[#fe9a00] text-black font-black tracking-widest rounded hover:bg-white transition-colors">
           {isProcessing ? 'PROCESSING & UPLOADING...' : 'SAVE CROPPED THUMBNAIL'}
         </button>
      </div>
    </div>
  );
};
// ----------------------

const ChapterUploader = ({ onDirty, onClean }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [targetSeries, setTargetSeries] = useState('');
  const [targetChapter, setTargetChapter] = useState('new');
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    chapterNumber: '',
    title: '',
    thumbnailUrl: '',
    pages: [] as string[],
    isPublished: false // NEW: Tracks current state
  });

  useEffect(() => {
    const fetchChapters = async () => {
      if (!targetSeries) {
        setExistingChapters([]);
        return;
      }
      const { data } = await supabase
        .from('chapters')
        .select('*')
        .eq('series_slug', targetSeries)
        .order('chapter_number', { ascending: false });
      
      if (data) setExistingChapters(data);
    };
    fetchChapters();
  }, [targetSeries, refreshKey]);

  useEffect(() => {
    if (targetChapter === 'new') {
      const nextNum = existingChapters.length > 0 ? Math.floor(Number(existingChapters[0].chapter_number) + 1) : 1;
      setFormData({ chapterNumber: nextNum.toString(), title: '', thumbnailUrl: '', pages: [], isPublished: false });
    } else {
      const selected = existingChapters.find(c => c.id === targetChapter);
      if (selected) {
        const fetchPages = async () => {
          const { data } = await supabase
            .from('pages')
            .select('image_url')
            .eq('chapter_id', targetChapter)
            .order('page_order', { ascending: true });
            
          setFormData({
            chapterNumber: selected.chapter_number.toString(),
            title: selected.title || '',
            thumbnailUrl: selected.thumbnail_url || '',
            pages: data ? data.map(p => p.image_url) : [],
            isPublished: selected.is_published || false // Load draft/live state
          });
        };
        fetchPages();
      }
    }
  }, [targetChapter, existingChapters]);

  useEffect(() => { setTargetChapter('new'); }, [targetSeries]);

  const movePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...formData.pages];
    if (direction === 'left' && index > 0) {
      [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    } else if (direction === 'right' && index < newPages.length - 1) {
      [newPages[index + 1], newPages[index]] = [newPages[index], newPages[index + 1]];
    }
    setFormData({ ...formData, pages: newPages });
    if (onDirty) onDirty();
  };

  const removePage = (index: number) => {
    const newPages = formData.pages.filter((_, i) => i !== index);
    setFormData({ ...formData, pages: newPages });
    if (onDirty) onDirty();
  };

  // NEW: Receives boolean to determine if saving as draft or live
  const handleSaveChapter = async (publishStatus: boolean) => {
    if (!targetSeries) return alert("Please select a series first.");
    if (!formData.chapterNumber) return alert("Please enter a chapter number.");
    if (formData.pages.length === 0) return alert("Please upload at least one page.");

    setIsSaving(true);
    try {
      let currentChapterId = targetChapter;
      
      const chapterPayload = {
        series_slug: targetSeries,
        chapter_number: Number(formData.chapterNumber),
        title: formData.title || `Chapter ${formData.chapterNumber}`,
        thumbnail_url: formData.thumbnailUrl || formData.pages[0],
        is_published: publishStatus // Push state to database
      };

      if (targetChapter === 'new') {
        const { data: newChapter, error: chapterError } = await supabase.from('chapters').insert([chapterPayload]).select().single();
        if (chapterError) throw chapterError;
        currentChapterId = newChapter.id;
      } else {
        const { error: chapterError } = await supabase.from('chapters').update(chapterPayload).eq('id', targetChapter);
        if (chapterError) throw chapterError;
        
        const { error: deleteError } = await supabase.from('pages').delete().eq('chapter_id', targetChapter);
        if (deleteError) throw deleteError;
      }

      const pagePayload = formData.pages.map((url, index) => ({
        chapter_id: currentChapterId,
        page_order: index + 1,
        image_url: url
      }));

      const { error: pagesError } = await supabase.from('pages').insert(pagePayload);
      if (pagesError) throw pagesError;

      alert(`SUCCESS! Chapter ${formData.chapterNumber} has been ${publishStatus ? 'PUBLISHED' : 'SAVED AS DRAFT'}.`);
      
      setTargetChapter('new');
      setRefreshKey(prev => prev + 1);
      if (onClean) onClean();
    } catch (error: any) { alert("Failed to save chapter: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteChapter = async (chapterId: any, chapterNum: any) => {
    if (!window.confirm(`Are you sure you want to permanently delete Chapter ${chapterNum}?`)) return;
    try {
      await supabase.from('chapters').delete().eq('id', chapterId);
      if (targetChapter === chapterId) setTargetChapter('new'); 
      setRefreshKey(prev => prev + 1);
    } catch (error: any) { alert('Failed to delete chapter: ' + error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {isPreviewOpen && <MangaReader pages={formData.pages} onClose={() => setIsPreviewOpen(false)} />}

      {cropSourceImage && (
        <ThumbnailCropperModal 
          imageUrl={cropSourceImage} 
          onCropComplete={(newUrl: any) => {
            setFormData({...formData, thumbnailUrl: newUrl});
            if (onDirty) onDirty();
            setCropSourceImage(null);
          }} 
          onCancel={() => setCropSourceImage(null)} 
        />
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Select Target Series</label>
        <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
          <option value="">-- Choose a Series to Manage --</option>
          {seriesList.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </div>

      {targetSeries && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
                  {targetChapter === 'new' ? 'New Chapter Upload' : `Editing Chapter ${formData.chapterNumber}`}
                </h3>
                {/* NEW: Explicit Status Badge in Editor Header */}
                {targetChapter !== 'new' && (
                  formData.isPublished ? (
                    <span className="bg-green-500/20 text-green-500 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-green-500/30">Live</span>
                  ) : (
                    <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-zinc-700">Draft</span>
                  )
                )}
              </div>
              
              {targetChapter !== 'new' && (
                <button onClick={() => setTargetChapter('new')} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
                  + Create New Chapter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Number</label>
                <input type="number" step="0.1" value={formData.chapterNumber} onChange={(e) => { setFormData({...formData, chapterNumber: e.target.value}); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Title (Optional)</label>
                <input type="text" placeholder="e.g., The Beginning..." value={formData.title} onChange={(e) => { setFormData({...formData, title: e.target.value}); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div>
                <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Custom Thumbnail</h3>
                <p className="text-[10px] text-zinc-500 mb-2">Leave blank to auto-use Pg 1</p>
                {formData.thumbnailUrl && (
                  <div className="relative group/thumb mb-4">
                    <img src={formData.thumbnailUrl} className="w-full aspect-square object-cover rounded-lg border border-zinc-700" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <button onClick={() => setCropSourceImage(formData.thumbnailUrl)} className="p-3 bg-black border border-zinc-700 hover:border-[#fe9a00] hover:text-[#fe9a00] text-zinc-300 rounded-full transition-all" title="Crop Image">
                        <Crop className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                <Dropzone label={formData.thumbnailUrl ? "Replace" : "+ Upload Thumb"} height="p-4" folderPath="chapter-thumbnails" onUploadComplete={(url: any) => { setFormData({...formData, thumbnailUrl: url}); if (onDirty) onDirty(); }} />
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Chapter Pages</h3>
                    <p className="text-[10px] text-zinc-500">Batch select pages in order.</p>
                  </div>
                  {formData.pages.length > 0 && (
                    <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 bg-zinc-800 hover:bg-[#fe9a00] hover:text-black transition-colors text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded">
                      <BookOpen className="w-3 h-3" /> Test Reader Preview
                    </button>
                  )}
                </div>
                
                {formData.pages.length > 0 && (
                  <div className="bg-black border border-zinc-800 p-3 rounded mb-4 max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-[#fe9a00] font-bold mb-3 uppercase tracking-widest">{formData.pages.length} Pages Queued</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {formData.pages.map((url, i) => (
                        <div key={i} className="relative group/page">
                          <img src={url} alt={`Pg ${i+1}`} className="w-full aspect-[2/3] object-cover rounded border border-zinc-700" />
                          <div className="absolute top-1 left-1 bg-black/80 px-2 py-0.5 rounded text-white font-bold text-[10px]">{i+1}</div>
                          
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/page:opacity-100 transition-opacity flex flex-col justify-between p-1 rounded">
                            <div className="flex justify-between w-full">
                              <button onClick={() => setCropSourceImage(url)} className="p-1.5 hover:text-[#fe9a00] text-zinc-300 bg-black/60 rounded" title="Crop as Thumbnail">
                                <Crop className="w-4 h-4" />
                              </button>
                              <button onClick={() => removePage(i)} className="p-1.5 hover:text-red-500 text-zinc-300 bg-black/60 rounded" title="Remove Page">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex justify-between w-full">
                              <button onClick={() => movePage(i, 'left')} className={`p-1.5 hover:text-[#fe9a00] bg-black/60 rounded ${i === 0 ? 'invisible' : 'text-white'}`}>
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button onClick={() => movePage(i, 'right')} className={`p-1.5 hover:text-[#fe9a00] bg-black/60 rounded ${i === formData.pages.length - 1 ? 'invisible' : 'text-white'}`}>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setFormData({...formData, pages: []}); if (onDirty) onDirty(); }} className="w-full mt-4 text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 py-2 border border-red-900/30 rounded">Clear All Pages</button>
                  </div>
                )}
                
                <Dropzone label="+ Add Pages" multiple={true} height="p-8" folderPath="manga-pages" onUploadComplete={(urls: any) => { setFormData({...formData, pages: [...formData.pages, ...urls]}); if (onDirty) onDirty(); }} />
              </div>
            </div>

            {/* NEW: Dual Button Layout */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-800">
              <button 
                onClick={() => handleSaveChapter(false)} 
                disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} 
                className={`w-1/2 bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded transition-all border border-zinc-700 ${(isSaving || !formData.chapterNumber || formData.pages.length === 0) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700'}`}
              >
                {isSaving ? 'SAVING...' : (formData.isPublished ? 'Revert to Draft' : 'Save Draft')}
              </button>
              
              <button 
                onClick={() => handleSaveChapter(true)} 
                disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} 
                className={`w-1/2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded transition-all ${(isSaving || !formData.chapterNumber || formData.pages.length === 0) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}
              >
                {isSaving ? 'PUBLISHING...' : (formData.isPublished ? 'Update Live Chapter' : 'Publish')}
              </button>
            </div>
            
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col max-h-[800px]">
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-4 pb-4 border-b border-zinc-800">Chapter Roster</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {existingChapters.length === 0 ? (
                <p className="text-zinc-500 text-xs italic text-center py-8">No chapters found for this series.</p>
              ) : (
                existingChapters.map(ch => (
                  <div 
                    key={ch.id} 
                    onClick={() => {
                      if (targetChapter !== ch.id && onDirty) {
                        const confirmLeave = window.confirm("You have unsaved changes. Discard them?");
                        if (!confirmLeave) return;
                      }
                      if (onClean) onClean();
                      setTargetChapter(ch.id);
                    }}
                    className={`rounded p-3 flex gap-3 items-center group cursor-pointer transition-colors border ${targetChapter === ch.id ? 'bg-zinc-800 border-[#fe9a00]' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className="w-12 h-12 object-cover rounded bg-zinc-800" />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[9px] text-[#fe9a00] tracking-widest">CH {ch.chapter_number}</p>
                        
                        {/* NEW: List Status Badges */}
                        {ch.is_published ? (
                           <span className="bg-green-500/20 text-green-500 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Live</span>
                        ) : (
                           <span className="bg-zinc-700/50 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Draft</span>
                        )}
                      </div>
                      <h4 className="text-xs text-white font-bold truncate">{ch.title || 'Untitled'}</h4>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id, ch.chapter_number); }} 
                      className="text-zinc-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const AvatarMaker = () => {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // NEW: Tracks which avatar is being edited
  
  const [formData, setFormData] = useState({
    name: '',
    tier: 'Basic',
    imageUrl: '',
    isActive: true
  });

  const fetchAvatars = async () => {
    const { data } = await supabase.from('avatars').select('*').order('created_at', { ascending: false });
    if (data) setAvatars(data);
  };

  useEffect(() => { fetchAvatars(); }, []);

  const handleSaveAvatar = async () => {
    if (!formData.name || !formData.imageUrl) return alert("Name and Image are required.");
    setIsSaving(true);
    try {
      if (editingId) {
        // UPDATE EXISTING
        const { error } = await supabase.from('avatars').update({
          name: formData.name,
          tier: formData.tier,
          image_url: formData.imageUrl,
          is_active: formData.isActive
        }).eq('id', editingId);
        if (error) throw error;
        alert("Avatar updated!");
      } else {
        // CREATE NEW
        const { error } = await supabase.from('avatars').insert([{
          name: formData.name,
          tier: formData.tier,
          image_url: formData.imageUrl,
          is_active: formData.isActive
        }]);
        if (error) throw error;
        alert("Avatar added to vault!");
      }
      
      setFormData({ name: '', tier: 'Basic', imageUrl: '', isActive: true });
      setEditingId(null);
      fetchAvatars();
    } catch (e: any) { alert("Error saving avatar: " + e.message); }
    finally { setIsSaving(false); }
  };

  // NEW: Load an avatar into the form for editing
  const handleEditClick = (avatar: any) => {
    setEditingId(avatar.id);
    setFormData({
      name: avatar.name,
      tier: avatar.tier,
      imageUrl: avatar.image_url,
      isActive: avatar.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to the form
  };

  // NEW: Cancel edit mode and clear the form
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', tier: 'Basic', imageUrl: '', isActive: true });
  };

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('avatars').update({ is_active: !currentStatus }).eq('id', id);
    fetchAvatars();
  };

  const deleteAvatar = async (id: string) => {
    if (!window.confirm("Permanently delete this avatar?")) return;
    await supabase.from('avatars').delete().eq('id', id);
    if (editingId === id) cancelEdit(); // Clear form if deleting the currently edited avatar
    fetchAvatars();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {cropSourceImage && (
        <ThumbnailCropperModal 
          imageUrl={cropSourceImage} 
          uploadFolder="user-avatars"
          onCropComplete={(newUrl: any) => {
            setFormData({...formData, imageUrl: newUrl});
            setCropSourceImage(null);
          }} 
          onCancel={() => setCropSourceImage(null)} 
        />
      )}

      {/* UPLOAD & CREATE/EDIT SECTION */}
      <div className={`bg-zinc-900 border p-6 rounded-xl shadow-md transition-colors ${editingId ? 'border-[#fe9a00]' : 'border-zinc-800'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
            {editingId ? `Editing Avatar: ${formData.name}` : 'Create New Avatar'}
          </h3>
          {editingId && (
             <button onClick={cancelEdit} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors bg-red-900/20 px-3 py-1 rounded">
               Cancel Edit
             </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {formData.imageUrl ? (
              <div className="relative group/avatar w-full aspect-square max-w-[200px] mx-auto">
                <img src={formData.imageUrl} className="w-full h-full object-cover rounded-full border-4 border-zinc-700" alt="Avatar Preview" />
                <button onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-0 right-0 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full aspect-square max-w-[200px] mx-auto">
                <Dropzone label={editingId ? "+ Replace Image" : "+ Upload & Crop"} height="h-full min-h-[200px] rounded-full" folderPath="temp" onUploadComplete={(url: any) => setCropSourceImage(url)} />
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Avatar Name</label>
              <input type="text" placeholder="e.g., Isao Base Form" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Rarity Tier</label>
                <select value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
                  <option value="Basic">Basic (Free)</option>
                  <option value="Premium">Premium</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Ultra Rare">Ultra Rare</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Initial Status</label>
                <select value={formData.isActive ? 'active' : 'hidden'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
                  <option value="active">Active (Available to Users)</option>
                  <option value="hidden">Hidden (Vaulted)</option>
                </select>
              </div>
            </div>

            <button onClick={handleSaveAvatar} disabled={isSaving || !formData.name || !formData.imageUrl} className={`w-full py-4 mt-4 font-black uppercase tracking-widest rounded transition-all ${isSaving || !formData.name || !formData.imageUrl ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : editingId ? 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]' : 'bg-[#fe9a00] text-black hover:bg-white'}`}>
              {isSaving ? 'SAVING...' : editingId ? 'UPDATE AVATAR' : 'ADD TO VAULT'}
            </button>
          </div>
        </div>
      </div>

      {/* VAULT GALLERY */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">Avatar Vault ({avatars.length})</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {avatars.map(avatar => (
            <div key={avatar.id} className={`bg-black border rounded-lg p-3 flex flex-col items-center text-center relative group transition-colors ${avatar.is_active ? 'border-zinc-700 hover:border-[#fe9a00]' : 'border-red-900/50 opacity-60'} ${editingId === avatar.id ? 'ring-2 ring-[#fe9a00] ring-offset-2 ring-offset-black' : ''}`}>
              
              {/* Delete Button */}
              <button onClick={() => deleteAvatar(avatar.id)} className="absolute top-1 right-1 p-1 bg-black/80 text-zinc-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete Avatar"><X className="w-3 h-3" /></button>
              
              {/* NEW: Edit Button */}
              <button onClick={() => handleEditClick(avatar)} className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-zinc-400 hover:text-[#fe9a00] text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-zinc-800 hover:border-[#fe9a00]" title="Edit Avatar">Edit</button>
              
              <img src={avatar.image_url} alt={avatar.name} className={`w-16 h-16 rounded-full object-cover mb-3 border-2 ${avatar.tier === 'Ultra Rare' ? 'border-yellow-400' : avatar.tier === 'Premium' ? 'border-purple-500' : avatar.tier === 'Seasonal' ? 'border-green-500' : 'border-zinc-500'}`} />
              
              <h4 className="text-[10px] font-bold text-white leading-tight mb-1 line-clamp-2">{avatar.name}</h4>
              <p className={`text-[8px] font-black uppercase tracking-widest mb-3 ${avatar.tier === 'Ultra Rare' ? 'text-yellow-400' : avatar.tier === 'Premium' ? 'text-purple-500' : avatar.tier === 'Seasonal' ? 'text-green-500' : 'text-zinc-500'}`}>{avatar.tier}</p>
              
              <button onClick={() => toggleActiveStatus(avatar.id, avatar.is_active)} className={`w-full py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-colors ${avatar.is_active ? 'bg-zinc-800 text-zinc-300 hover:bg-red-900/50 hover:text-red-500' : 'bg-red-900/20 text-red-500 hover:bg-green-900/30 hover:text-green-500'}`}>
                {avatar.is_active ? 'Vault' : 'Unvault'}
              </button>
            </div>
          ))}
          {avatars.length === 0 && <p className="col-span-full text-center text-zinc-600 text-xs py-8 uppercase tracking-widest font-bold">Vault is empty.</p>}
        </div>
      </div>
    </div>
  );
};
const StickerMaker = () => {
  const { seriesList = [] } = useSeriesData();
  const [selectedSeries, setSelectedSeries] = useState('');
  const [stickerUrl, setStickerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  
  // NEW: Tracks if the user intentionally cleared the existing sticker
  const [isCleared, setIsCleared] = useState(false);

  // Find the currently selected series to show its existing sticker if it has one
  const activeSeries = seriesList.find((s: any) => s.slug === selectedSeries);
  
  // Logic to determine what image to show in the preview
  const currentDisplayUrl = stickerUrl || (!isCleared && activeSeries?.sticker_url);

  const handleSaveSticker = async () => {
    if (!selectedSeries) return alert("Please select a series.");
    setIsSaving(true);
    try {
      // If stickerUrl is empty and isCleared is true, we pass `null` to delete it in the DB
      const { error } = await supabase
        .from('series')
        .update({ sticker_url: stickerUrl || null })
        .eq('slug', selectedSeries);
        
      if (error) throw error;
      
      alert(stickerUrl ? "Sticker Saved! It will now appear on user club cards." : "Sticker Successfully Removed.");
      
      // Reset form
      setStickerUrl('');
      setIsCleared(false);
      setSelectedSeries('');
    } catch (e: any) {
      alert("Error saving sticker: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md mt-6 relative">
      
      {/* THE CROPPER OVERLAY */}
      {cropSourceImage && (
        <ThumbnailCropperModal 
          imageUrl={cropSourceImage} 
          uploadFolder="series-stickers"
          onCropComplete={(newUrl: any) => {
            setStickerUrl(newUrl);
            setCropSourceImage(null);
            setIsCleared(false); // Make sure we show the new image!
          }} 
          onCancel={() => setCropSourceImage(null)} 
        />
      )}

      <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">
        Series Sticker Maker
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {currentDisplayUrl ? (
            <div className="relative w-full aspect-square max-w-[200px] mx-auto group/sticker">
              <img 
                src={currentDisplayUrl} 
                className="w-full h-full object-cover rounded-full border-4 border-zinc-700 bg-black" 
                alt="Sticker Preview" 
              />
              <button 
                onClick={() => {
                  setStickerUrl('');
                  setIsCleared(true); // Forces the database image to hide
                }} 
                className="absolute top-0 right-0 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full aspect-square max-w-[200px] mx-auto rounded-full overflow-hidden">
              <Dropzone 
                label="+ Upload & Crop" 
                height="h-full min-h-[200px]" 
                folderPath="temp" 
                onUploadComplete={(url: any) => setCropSourceImage(url)} 
              />
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col justify-center">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Target Series</label>
          <select 
            value={selectedSeries} 
            onChange={(e) => {
              setSelectedSeries(e.target.value);
              setStickerUrl(''); 
              setIsCleared(false); // Reset clearing state when choosing a new series
            }} 
            className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold mb-6 focus:border-[#fe9a00]"
          >
            <option value="">-- Choose Series --</option>
            {seriesList.map((s: any) => (
              <option key={s.id} value={s.slug}>{s.title} {s.sticker_url ? '(Has Sticker)' : ''}</option>
            ))}
          </select>

          {/* Button changes text and color if you are deleting vs saving */}
          <button 
            onClick={handleSaveSticker} 
            disabled={isSaving || !selectedSeries || (!stickerUrl && !isCleared)} 
            className={`w-full py-4 font-black uppercase tracking-widest rounded transition-all ${
              (isSaving || !selectedSeries || (!stickerUrl && !isCleared)) 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : (!stickerUrl && isCleared) 
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-500 hover:text-white border border-red-900' 
                  : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'
            }`}
          >
            {isSaving ? 'SAVING...' : (!stickerUrl && isCleared) ? 'REMOVE STICKER' : 'SAVE & DEPLOY STICKER'}
          </button>
        </div>
      </div>
    </div>
  );
};
const AdminDashboard = ({ onBack }: any) => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
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
            { id: 'magazine', label: 'Magazine Upload' },
            { id: 'avatar', label: 'Avatars & Stickers' },
            { id: 'cardskin', label: 'Card Skins' }
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
        {activeTab === 'avatar' && (
          <>
    <AvatarMaker />
    <StickerMaker />
  </>
)}
        {activeTab === 'cardskin' && <CardSkinMaker />}
      </div>
    </div>
  );
};

const AdminLogin = ({ onLogin, onBack }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: any) => {
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

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) { setIsVisible(true); } 
      else { setIsVisible(false); }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!isVisible) return null;

  return (
    <button onClick={scrollToTop} className="fixed bottom-20 right-6 z-50 p-3 bg-[#fe9a00] text-black rounded-full shadow-[0_0_15px_rgba(254,154,0,0.4)] hover:bg-white hover:scale-110 transition-all duration-300 group" aria-label="Back to top">
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};
const AccountSettings = ({ onBack }: any) => {
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto mt-4 sm:mt-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <button onClick={onBack} className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:text-[#fe9a00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider">Account Settings</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Billing & Security</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Billing Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-[#fe9a00] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Subscription & Billing
            </h3>
            <div className="bg-black border border-purple-900/50 p-4 rounded-lg mb-4 flex justify-between items-center">
               <div>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Current Plan</p>
                 <p className="text-lg font-black text-purple-400 italic uppercase">Saturday AM+ Premium</p>
               </div>
               <span className="bg-purple-900/40 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded">Active</span>
            </div>
            <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors w-full sm:w-auto">
              Manage Subscription
            </button>
          </div>

          {/* Security Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-zinc-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Login & Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" value="reader@example.com" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                <input type="password" value="********" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div className="flex gap-4 pt-2">
                 <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors flex-1 sm:flex-none">
                   Change Password
                 </button>
                 <button className="bg-red-900/20 text-red-500 border border-red-900/50 px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-900/40 transition-colors flex-1 sm:flex-none">
                   Log Out
                 </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
// --- HELPER FUNCTION: HTML5 Canvas Image Cropper ---


// --- MAIN COMPONENT ---
const CardSkinMaker = () => {
  const [skins, setSkins] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  
  // File & Preview State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    fetchSkins();
  }, []);

  const fetchSkins = async () => {
    if (typeof supabase === 'undefined') return;
    const { data } = await supabase.from('card_skins').select('*').order('created_at', { ascending: false });
    if (data) setSkins(data);
  };

  const handleFileSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Instead of setting the file directly, we send it to the cropper first!
    setImageToCrop(URL.createObjectURL(file));
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedImageBlob], "cropped_skin.jpg", { type: "image/jpeg" });
      
      setSelectedFile(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedFile));
      setImageToCrop(null); // Exit crop mode
    } catch (e) {
      console.error(e);
      alert('Failed to crop image.');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToCrop(null);
const fileInput = document.getElementById('skin-upload') as HTMLInputElement;if (fileInput) {
  fileInput.value = '';
}
  };

  // isActiveStatus determines if it's a Draft (false) or Published (true)
  const handleUpload = async (isActiveStatus) => {
    if (!selectedFile || !name.trim()) return;
    setUploading(true);

    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `skins/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('card-skins').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('card-skins').getPublicUrl(filePath);

      // Insert into the database
      const { error: dbError } = await supabase.from('card_skins').insert([{ 
        name: name.trim(), 
        image_url: publicUrl, 
        is_active: isActiveStatus 
      }]);
      
      if (dbError) throw dbError;

      // Reset form
      setName('');
      clearSelection();
      fetchSkins();
    } catch (error) {
  console.error('Error uploading skin:', error);
  alert('Upload failed: ' + error.message);
} finally {
      setUploading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('card_skins').update({ is_active: !currentStatus }).eq('id', id);
    fetchSkins();
  };

  const deleteSkin = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this skin?')) return;
    await supabase.from('card_skins').delete().eq('id', id);
    fetchSkins();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-white w-full max-w-5xl mx-auto mt-8">
      <h2 className="text-2xl font-black italic uppercase tracking-widest text-[#fe9a00] mb-6">Card Skin Studio</h2>

      {/* UPLOAD FORM */}
      <div className="bg-black p-6 rounded-xl border border-zinc-800 mb-10 flex flex-col md:flex-row gap-8 shadow-inner">
        
        {/* Preview / Cropper Box */}
        <div className="w-full md:w-1/2 max-w-sm flex flex-col mx-auto md:mx-0">
          <div className="w-full aspect-[1.58] border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden bg-zinc-900 relative shadow-2xl">
            
            {imageToCrop ? (
              // CROPPER UI
              <div className="absolute inset-0">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1.58}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            ) : previewUrl ? (
              // FINISHED CROP PREVIEW
              <img src={previewUrl} className="w-full h-full object-cover opacity-80" alt="Preview" />
            ) : (
              // EMPTY STATE
              <div className="text-center text-zinc-500 flex flex-col items-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Card Aspect Ratio<br/>(Landscape)</span>
              </div>
            )}
            
            {/* Mock Overlay to see how it looks with the badge (Only show if not currently cropping) */}
            {previewUrl && !imageToCrop && (
               <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none z-10">
                 <span className="font-black italic text-[#fe9a00] text-sm tracking-tighter drop-shadow-md">SATURDAY AM</span>
                 <span className="text-[6px] font-black uppercase tracking-[0.3em] text-white drop-shadow-md">Official Member</span>
               </div>
            )}
          </div>

          {/* Image Action Buttons */}
          <div className="flex gap-2 mt-4">
            {imageToCrop ? (
              <button onClick={handleApplyCrop} className="flex-1 bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-white transition-colors">
                <Scissors className="w-3 h-3" /> Apply Crop
              </button>
            ) : previewUrl ? (
              <button onClick={clearSelection} className="flex-1 bg-red-900/40 text-red-400 border border-red-900/50 font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors">
                <X className="w-3 h-3" /> Remove
              </button>
            ) : (
              <>
                <input type="file" id="skin-upload" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <label htmlFor="skin-upload" className="flex-1 bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-zinc-700 cursor-pointer transition-colors border border-zinc-700">
                  <ImageIcon className="w-3 h-3" /> Choose Image
                </label>
              </>
            )}
          </div>
        </div>

        {/* Input Controls */}
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Skin Name (e.g. "Apple Black: Sinner")</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg mb-6 focus:outline-none focus:border-[#fe9a00] transition-colors"
            placeholder="Enter skin name..."
          />
          
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <button
              onClick={() => handleUpload(false)}
              disabled={!selectedFile || !name.trim() || uploading || imageToCrop}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-black uppercase tracking-widest py-4 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
               <Save className="w-4 h-4" /> Save as Draft
            </button>

            <button
              onClick={() => handleUpload(true)}
              disabled={!selectedFile || !name.trim() || uploading || imageToCrop}
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.2)]"
            >
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Publish
            </button>
          </div>
        </div>
      </div>

      {/* EXISTING SKINS GRID */}
      <div>
        <div className="flex justify-between items-end mb-6 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Live Skins Library</h3>
          <span className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">{skins.length} Total Skins</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skins.map(skin => (
            <div key={skin.id} className={`relative rounded-xl overflow-hidden aspect-[1.58] border-2 group shadow-lg ${skin.is_active ? 'border-zinc-700 hover:border-zinc-500' : 'border-dashed border-zinc-700 opacity-60 hover:opacity-100 transition-all'}`}>
              <img src={skin.image_url} className="w-full h-full object-cover" alt={skin.name} />
              
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-white truncate pr-2 drop-shadow-md">{skin.name}</span>
                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded backdrop-blur-sm ${skin.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'}`}>
                  {skin.is_active ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                 <button onClick={() => toggleStatus(skin.id, skin.is_active)} className="p-3 bg-zinc-800 rounded-full hover:bg-white hover:text-black transition-colors shadow-xl" title={skin.is_active ? "Move to Drafts" : "Publish Skin"}>
                   {skin.is_active ? <Save className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                 </button>
                 <button onClick={() => deleteSkin(skin.id)} className="p-3 bg-red-900/50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-xl" title="Delete Skin">
                   <Trash2 className="w-5 h-5" />
                 </button>
              </div>
            </div>
          ))}
          {skins.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-600 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-xl">
              No skins uploaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// --- 1. VIRTUAL MEMBERSHIP CARD COMPONENT ---
const VirtualMemberCard = ({ isSubscriber, username, avatarUrl, frameId, memberSince, hypes, reacts, chaptersRead, skinUrl, topFive, seriesList, onRenew, onChangeSkin, getFrameStyle, getOrbitStyle }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // The inner contents of the card, extracted so we can reuse it in normal and fullscreen modes
  const CardContent = () => (
    <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl border border-zinc-700 ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
      
      {/* === FRONT OF CARD === */}
      <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl overflow-hidden bg-zinc-900 flex flex-col justify-end">
        {/* Artwork Skin Only */}
        <img 
  src={skinUrl || "https://zcadkovymrnjpjaxvnao.supabase.co/storage/v1/object/public/card-skins/skins/1781908112888_8ozh4h.jpg"} 
  className="absolute inset-0 w-full h-full object-cover z-0" 
  alt="Card Skin" 
/>
        
        {/* Foil Card Sheen Overlay */}
<div 
  className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
  style={{
    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)'
  }}
/>

        {/* Badge */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
            <span className="font-black italic text-[#fe9a00] text-sm sm:text-base tracking-tighter drop-shadow-md">SATURDAY AM</span>
            <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-white drop-shadow-md">Official Member</span>
        </div>

        {/* Fullscreen Toggle Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 p-2 sm:p-2.5 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
          title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
        >
          {isFullscreen ? <X className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />}
        </button>

        {/* INACTIVE OVERLAY */}
        {!isSubscriber && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <span className="text-zinc-500 mb-2"><CreditCard className="w-8 h-8" /></span>
              <p className="text-zinc-300 font-black tracking-widest text-xs mb-4 uppercase">Membership Inactive</p>
              <button onClick={(e) => { e.stopPropagation(); onRenew(); }} className="bg-[#fe9a00] text-black px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all">
                Rejoin the Squad
              </button>
          </div>
        )}
      </div>

      {/* === BACK OF CARD === */}
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl bg-zinc-900 overflow-hidden flex flex-col justify-between p-3 sm:p-4">
        {/* Foil Card Sheen Overlay */}
<div 
  className="absolute inset-0 pointer-events-none z-0"
  style={{
    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)'
  }}
/>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Fullscreen Toggle Button (Back) */}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
            className="absolute top-0 right-0 z-30 p-2 sm:p-2.5 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
            title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
          >
            {isFullscreen ? <X className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>

          {/* Top Left: Avatar & Username */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-2 pr-10">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-black z-10 flex items-center justify-center ${getFrameStyle(frameId)}`}>
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="w-5 h-5 text-zinc-600" />}
              </div>
              {getOrbitStyle(frameId) && <div className={`absolute w-full h-full rounded-full border-2 border-transparent ${getOrbitStyle(frameId)}`} />}
            </div>
            <div className="flex flex-col truncate pt-1">
              <p className="font-black text-base sm:text-xl italic uppercase tracking-wider text-white truncate drop-shadow-md leading-none">{username}</p>
              <p className="text-[5px] sm:text-[6px] text-[#fe9a00] font-black uppercase tracking-widest mt-1.5 flex flex-wrap gap-x-1.5 leading-tight">
                <span>MEMBER SINCE {memberSince}</span>
                <span className="text-zinc-600 hidden sm:inline">|</span>
                <span className="text-zinc-400">STORE DISCOUNT CODE: AMCLUB26</span>
              </p>
            </div>
          </div>

          {/* Stats Row (Dual-Sized) */}
          <div className={`flex justify-around items-center bg-black/40 rounded-lg border border-zinc-800/50 shadow-inner transition-all duration-300 ${isFullscreen ? 'p-3 sm:p-5 mt-4 mb-2' : 'p-2 mt-1'}`}>
            <div className="text-center w-1/3 border-r border-zinc-800/50">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Total Hypes</p>
              <p className={`font-black text-[#fe9a00] flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <Flame className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {hypes}
              </p>
            </div>
            <div className="text-center w-1/3 border-r border-zinc-800/50">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Quick Reacts</p>
              <p className={`font-black text-cyan-400 flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <MessageCircle className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {reacts}
              </p>
            </div>
            <div className="text-center w-1/3">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Chapters Read</p>
              <p className={`font-black text-cyan-400 flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <BookOpen className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {chaptersRead}
              </p>
            </div>
          </div>

          {/* My Favorite Series (Dual-Sized Peel-and-Stick Aesthetic) */}
          <div className="flex flex-col justify-center w-full mt-1 sm:mt-2 flex-1">
            <p className={`${isFullscreen ? 'text-[10px] sm:text-[12px] mb-2' : 'text-[8px] sm:text-[9px] mb-1.5'} text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all`}>
              <Star className={`${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} text-[#fe9a00]`} /> Top 5 Stickers
            </p>
            <div className="flex gap-1 w-full justify-between items-start px-1 sm:px-2">
              {[0, 1, 2, 3, 4].map((i) => {
                const slug = topFive[i];
                const series = seriesList.find((s:any) => s.slug === slug);
                
                // If the slot is empty, render a ghost circle
                if (!series) {
                   return (
                     <div key={i} className="flex flex-col items-center w-[18%] gap-1">
                       <div className={`${isFullscreen ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-full border border-dashed border-zinc-700/50 bg-black/20 m-0.5 transition-all duration-300`} />
                     </div>
                   );
                }
                
                // Prioritize the dedicated sticker_url, fallback to character art if no sticker is uploaded yet
                const stickerImage = series.sticker_url || series.character_url || series.cover_url;

                return (
                  <div key={i} className="flex flex-col items-center w-[18%] gap-1">
                    <div 
                      className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5]
                        ${isFullscreen ? 'w-16 h-16 sm:w-20 sm:h-20 border-[3px] sm:border-[4px]' : 'w-10 h-10 sm:w-12 sm:h-12 border-[1.5px] sm:border-[2px]'} 
                        shadow-[2px_4px_8px_rgba(0,0,0,0.7)] 
                        transform hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer flex-shrink-0 m-0.5
                        ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'} 
                        ${i === 2 ? '-translate-y-1' : ''}
                      `}
                    >
                      <img 
                        src={stickerImage} 
                        className="w-full h-full object-cover object-top" 
                        alt={`${series.title} sticker`} 
                      />
                      
                      {/* Glossy Vinyl Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                    </div>
                    
                    {/* Consistent Text Title Only */}
                    <span className={`${isFullscreen ? 'text-[7px] sm:text-[9px] mt-1' : 'text-[5px] sm:text-[6px]'} font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight transition-all`}>
                      {series.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promo Text */}
          <div className="text-center pt-1">
            <p className="text-[6px] sm:text-[7px] text-zinc-500 uppercase tracking-widest leading-relaxed">
              Present this digital pass at live events for discounts.<br/>
              Use code <span className="text-white font-black">AMCLUB26</span> in the Shopify store.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="border-t border-zinc-800 pt-12 pb-12 w-full max-w-4xl mx-auto px-6">
        
        {/* Dynamic Header: Button vanishes when flipped */}
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" /> Digital AM Club Card
          </h3>
          <div className={`transition-opacity duration-300 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <button onClick={onChangeSkin} className="text-[10px] text-zinc-400 font-black uppercase tracking-widest hover:text-white transition-colors border border-zinc-800 hover:border-zinc-500 px-4 py-1.5 rounded-full bg-zinc-900">
              Change Skin
            </button>
          </div>
        </div>
        
        {/* The Card Container */}
        <div className="relative w-full max-w-sm mx-auto aspect-[1.58] perspective-[1000px] mb-8 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          {isSubscriber && <div className={`absolute -inset-4 bg-gradient-to-r from-[#fe9a00]/30 to-purple-600/30 blur-2xl opacity-50 rounded-[3rem] transition-opacity duration-1000`} />}
          <CardContent />
        </div>
        
        {isSubscriber && !isFlipped && (
          <p className="text-center text-zinc-600 text-[8px] font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2 animate-pulse">
            Tap Card to Flip <RotateCcw className="w-3 h-3" />
          </p>
        )}
      </div>

      {/* FULLSCREEN OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in" onClick={() => setIsFullscreen(false)}>
          {/* Card stretches to 2xl when fullscreen! */}
          <div className="w-full max-w-2xl aspect-[1.58] perspective-[1000px] cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
            <CardContent />
          </div>
          
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-12 animate-pulse flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Tap anywhere on card to flip
          </p>
        </div>
      )}
    </>
  );
};


// --- 2. MAIN USER PROFILE COMPONENT ---
const UserProfile = ({ onBack, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  const [vaultAvatars, setVaultAvatars] = useState<any[]>([]);
  const [cardSkins, setCardSkins] = useState<any[]>([]); 
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  
  const [isSubscriber, setIsSubscriber] = useState(true); 
  
  const [userProfile, setUserProfile] = useState({
    username: 'Reader_One',
    avatarUrl: '', 
    frameId: 'none',
    cardSkin: '', 
    topFive: ['apple-black', 'clock-striker', 'titan-king', 'bully-eater', null] as (string | null)[]
  });

  const [tempProfile, setTempProfile] = useState({...userProfile});

  // --- Real Database Stats State ---
  const [profileStats, setProfileStats] = useState({
    total_hypes: 0,
    quick_reacts: 0,
    chapters_read: 0
  });

  // --- Fetch Real Stats and Loadout from Supabase ---
  useEffect(() => {
    const fetchUserStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch stats AND profile loadout settings
        const { data, error } = await supabase
          .from('profiles')
          .select('total_hypes, quick_reacts, chapters_read, top_five, card_skin, avatar_url, frame_id')
          .eq('id', user.id)
          .single();

        if (data) {
          // Update the stats above the card
          setProfileStats({
            total_hypes: data.total_hypes || 0,
            quick_reacts: data.quick_reacts || 0,
            chapters_read: data.chapters_read || 0
          });

          // Update the actual profile layout
          setUserProfile(prev => ({
            ...prev,
            topFive: data.top_five || [null, null, null, null, null],
            cardSkin: data.card_skin || '',
            avatarUrl: data.avatar_url || '',
            frameId: data.frame_id || 'none'
          }));

          // Also make sure the temp editor profile matches the fetched data!
          setTempProfile(prev => ({
            ...prev,
            topFive: data.top_five || [null, null, null, null, null],
            cardSkin: data.card_skin || '',
            avatarUrl: data.avatar_url || '',
            frameId: data.frame_id || 'none'
          }));
        }
      }
    };

    fetchUserStats();
  }, []);
  const fallbackSeriesList = [
    { slug: 'apple-black', title: 'Apple Black', creator_name: 'Whyt Manga', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/apple-black-cover.jpg' },
    { slug: 'clock-striker', title: 'Clock Striker', creator_name: 'Frederick Ward', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/clock-striker-cover.jpg' },
    { slug: 'titan-king', title: 'Titan King', creator_name: 'Tony Gold', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/titan-king-cover.jpg' },
  ];
  const displaySeriesList = seriesList && seriesList.length > 0 ? seriesList : fallbackSeriesList;

  const BASIC_FRAMES = [
    { id: 'none', name: 'Original', style: 'border-2 border-zinc-800' },
    { id: 'red', name: 'Solid Red', style: 'border-2 border-red-600' },
    { id: 'yellow', name: 'Solid Yellow', style: 'border-2 border-yellow-500' },
    { id: 'cyan', name: 'Solid Cyan', style: 'border-2 border-cyan-500' },
  ];

  const PREMIUM_FRAMES = [
    { id: 'gold', name: 'Ultra Gold', style: 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]', orbit: 'border-t-yellow-400 border-r-yellow-400 animate-[spin_3s_linear_infinite]' },
    { id: 'appleblack', name: 'Apple Black', style: 'border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]', orbit: 'border-t-red-500 border-l-red-500 animate-[spin_2.5s_linear_infinite]' },
    { id: 'clockstriker', name: 'Clock Striker', style: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]', orbit: 'border-b-cyan-400 border-r-cyan-400 animate-[spin_3s_linear_infinite_reverse]' },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (typeof supabase !== 'undefined') {
        const { data: avatars } = await supabase.from('avatars').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (avatars) setVaultAvatars(avatars);
        
        const { data: skins } = await supabase.from('card_skins').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (skins) setCardSkins(skins);
      }
    };
    fetchData();
  }, []);

  const openEditor = (targetTab = 'faves', slotIndex: number | null = null) => {
    setTempProfile({...userProfile});
    setActiveTab(targetTab);
    setSelectingSlot(slotIndex);
    setIsEditing(true);
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          top_five: tempProfile.topFive,
          card_skin: tempProfile.cardSkin,
          avatar_url: tempProfile.avatarUrl,
          frame_id: tempProfile.frameId
        })
        .eq('id', user.id);

      if (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save your loadout. Try again!");
        return;
      }
    }

    setUserProfile({...tempProfile});
    setIsEditing(false);
  };

  const getFrameStyle = (id: string) => [...BASIC_FRAMES, ...PREMIUM_FRAMES].find(f => f.id === id)?.style || 'border-2 border-zinc-800';
  const getOrbitStyle = (id: string) => PREMIUM_FRAMES.find(f => f.id === id)?.orbit || '';

  const renderStickerSlot = (seriesSlug: string, isEditingMode: boolean, onClick: () => void) => {
    const series = displaySeriesList.find((s: any) => s.slug === seriesSlug);
    const title = series?.title || seriesSlug.replace('-', ' ').toUpperCase();
    const stickerImage = series?.sticker_url || series?.character_url || series?.cover_url; 

    return (
      <div key={seriesSlug} onClick={onClick} className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer group/sticker relative ${isEditingMode ? 'hover:scale-110 transition-transform' : ''}`}>
        <div className={`w-full h-full rounded-full overflow-hidden border-[3px] ${isEditingMode ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)]' : 'border-zinc-800 shadow-lg group-hover/sticker:border-zinc-500'} transition-all duration-300 bg-zinc-900`}>
          <img src={stickerImage} className="w-full h-full object-cover" alt={`${title} Sticker`} />
        </div>
        {isEditingMode && (
          <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center opacity-0 group-hover/sticker:opacity-100 transition-opacity rounded-full backdrop-blur-sm">
            <span className="text-[#fe9a00] font-black text-[8px] uppercase tracking-widest shadow-xl">Change</span>
          </div>
        )}
      </div>
    );
  };
const renderMiniCard = (seriesSlug: string, isEditingMode: boolean, onClick: () => void) => {
    const series = displaySeriesList.find((s: any) => s.slug === seriesSlug);
    if (!series) return null;

    return (
      <div 
        key={seriesSlug} 
        onClick={onClick} 
        className={`w-24 sm:w-28 flex-shrink-0 aspect-[2/3] relative rounded-lg overflow-hidden cursor-pointer group/card transition-all ${
          isEditingMode ? 'border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)]' : 'border border-zinc-800 shadow-lg hover:border-[#fe9a00]/50'
        }`}
      >
        {/* Dynamic Background from Home Page */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
        
        {/* Pop-out Character Image */}
        <img 
          src={series.character_url || series.cover_url} 
          alt={`${series.title} Character`} 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4"
        />
        
        {/* Gradient overlay so the logo is readable */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
        
        {/* Logo or Fallback Title */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-30 px-2 h-8 sm:h-10">
          {series.logo_url ? (
            <img src={series.logo_url} alt={series.title} className="w-full max-h-full object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" />
          ) : (
            <span className="text-[7px] sm:text-[8px] font-black uppercase text-white text-center drop-shadow-md leading-tight line-clamp-2">
              {series.title}
            </span>
          )}
        </div>
        
        {/* Hover overlay for editor mode */}
        {isEditingMode && (
          <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity backdrop-blur-[2px]">
            <span className="text-[#fe9a00] font-black text-[8px] uppercase tracking-widest shadow-xl">Change</span>
          </div>
        )}
      </div>
    );
  };
  const renderEmptyStickerSlot = (keyIndex: number, onClick: () => void) => (
    <div key={`empty-sticker-${keyIndex}`} onClick={onClick} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-full border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-[#fe9a00] hover:shadow-[0_0_15px_rgba(254,154,0,0.2)] bg-black/50 hover:bg-zinc-900/50 transition-all group/empty">
      <Plus className="w-5 h-5 text-zinc-600 group-hover/empty:text-[#fe9a00] transition-colors mb-0.5" />
      <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600 group-hover/empty:text-[#fe9a00] transition-colors">Equip</span>
    </div>
  );
  

  const renderEmptySlot = (onClick: () => void) => (
    <div onClick={onClick} className="w-24 sm:w-28 flex-shrink-0 aspect-[2/3] border-2 border-dashed border-zinc-800 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-[#fe9a00] hover:shadow-[0_0_15px_rgba(254,154,0,0.2)] bg-black/50 hover:bg-zinc-900/50 transition-all group">
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full group-hover:bg-[#fe9a00] transition-colors mb-2 shadow-lg"><Plus className="w-5 h-5 text-zinc-500 group-hover:text-black transition-colors" /></div>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-[#fe9a00] transition-colors">Choose a series</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white relative pb-20">
      <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-zinc-900/90 rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors z-20 transform -skew-x-12">
        <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
      </button>

      <div className="w-full h-48 sm:h-64 bg-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      <div className="max-w-4xl mx-auto relative -mt-16 sm:-mt-24">
        
        {/* --- USER HEADER --- */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-12 px-6">
          <div className="relative group cursor-pointer" onClick={() => openEditor('art')}>
            <div className={`relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center`}>
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden relative z-10 bg-zinc-900 flex items-center justify-center ${getFrameStyle(userProfile.frameId)}`}>
                {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : <User className="w-12 h-12 text-zinc-500" />}
              </div>
              {PREMIUM_FRAMES.some(p => p.id === userProfile.frameId) && ( <div className={`absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[3px] border-transparent pointer-events-none ${getOrbitStyle(userProfile.frameId)}`} /> )}
            </div>
          </div>

          <div className="text-center sm:text-left pb-2">
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter">{userProfile.username}</h1>
            <p className={`text-xs font-black uppercase tracking-widest mt-1 italic ${isSubscriber ? 'text-purple-400' : 'text-zinc-500'}`}>
               {isSubscriber ? 'Premium Saturday AM+ Member' : 'Standard Member'}
            </p>
          </div>
          
          <div className="sm:ml-auto flex items-center gap-3 mt-4 sm:mt-0">
            <button onClick={() => onNavigate({ action: 'account' })} className="bg-zinc-900 border border-zinc-700 p-3 rounded-full hover:border-white transition-colors group"><Settings className="w-5 h-5 text-zinc-400 group-hover:text-white" /></button>
            <button onClick={() => openEditor('art')} className="bg-zinc-900 border border-zinc-700 hover:border-[#fe9a00] hover:text-[#fe9a00] px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">Edit Profile</button>
          </div>
        </div>

        {/* --- STATS & LOADOUT --- */}
        <div className="mb-12 border-t border-zinc-800 pt-8 px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <Flame className="w-6 h-6 text-[#fe9a00] mb-2" />
              <span className="text-3xl font-black">{profileStats.total_hypes.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Hypes</span>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <MessageCircle className="w-6 h-6 text-cyan-400 mb-2" />
              <span className="text-3xl font-black">{profileStats.quick_reacts.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Quick Reacts</span>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <BookOpen className="w-6 h-6 text-zinc-400 mb-2" />
              <span className="text-3xl font-black">{profileStats.chapters_read.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Chapters Read</span>
            </div>
            <div className={`flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border relative overflow-hidden ${isSubscriber ? 'border-[#fe9a00]/30' : 'border-zinc-800 opacity-50'}`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${isSubscriber ? 'bg-[#fe9a00]/10' : 'bg-zinc-800'}`}></div>
              <Award className={`w-6 h-6 mb-2 relative z-10 ${isSubscriber ? 'text-[#fe9a00]' : 'text-zinc-500'}`} />
              <span className="text-2xl font-black mt-1 text-white relative z-10">{isSubscriber ? 'Active' : 'N/A'}</span>
              <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold relative z-10">Premium Status</span>
            </div>
          </div>
          
          
          <div className="flex justify-between items-end mb-4 mt-12">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Star className="w-4 h-4 text-[#fe9a00]" /> Top 5 Fave Series</h3>
            <button onClick={() => openEditor('faves')} className="text-[10px] text-zinc-400 font-black uppercase tracking-widest hover:text-white transition-colors border border-zinc-800 hover:border-zinc-500 px-4 py-1.5 rounded-full bg-zinc-900">Edit Loadout</button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[0, 1, 2, 3, 4].map((index) => {
              const slug = userProfile.topFive[index];
              return slug ? renderMiniCard(slug, false, () => openEditor('faves', index)) : renderEmptySlot(() => openEditor('faves', index));
            })}
          </div>
        </div>

        {/* --- MOUNT THE VIRTUAL MEMBERSHIP CARD --- */}
        <VirtualMemberCard 
           isSubscriber={isSubscriber}
           username={userProfile.username}
           avatarUrl={userProfile.avatarUrl}
           frameId={userProfile.frameId}
           memberSince="OCT 2023"
           hypes={profileStats.total_hypes.toLocaleString()}
reacts={profileStats.quick_reacts.toLocaleString()}
chaptersRead={profileStats.chapters_read.toLocaleString()}
           
           skinUrl={userProfile.cardSkin}
           topFive={userProfile.topFive}
           seriesList={displaySeriesList}
           onRenew={() => alert('Navigate to Stripe/Subscription page!')}
           onChangeSkin={() => openEditor('card')}
           getFrameStyle={getFrameStyle}
           getOrbitStyle={getOrbitStyle}
        />
      </div>

      {/* --- PROFILE EDITOR MODAL --- */}
      {isEditing && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-black">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Customize Loadout</h2>
              <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0 bg-black">
              <button onClick={() => { setActiveTab('faves'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'faves' ? 'bg-zinc-800 text-[#fe9a00]' : 'text-zinc-500 hover:text-white'}`}>Top 5 Loadout</button>
              <button onClick={() => { setActiveTab('art'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'art' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Character Art</button>
              <button onClick={() => { setActiveTab('frames'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'frames' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Basic Frames</button>
              <button onClick={() => { setActiveTab('premium'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'premium' ? 'bg-purple-900/20 text-purple-400' : 'text-zinc-500 hover:text-white'}`}>Premium Frames ★</button>
              <button onClick={() => { setActiveTab('card'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'card' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Club Card</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-black/40 no-scrollbar">
              
              {/* LOADOUT SELECTOR TAB */}
              {activeTab === 'faves' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-2">Equip your favorite series to your profile</p>
                  <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar">
                    {[0, 1, 2, 3, 4].map((index) => {
                      const slug = tempProfile.topFive[index];
                      const isSelected = selectingSlot === index;
                      return (
                        <div key={index} className={`relative transition-transform ${isSelected ? 'scale-110 z-10' : ''}`}>
                          {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#fe9a00] animate-bounce shadow-[0_0_10px_#fe9a00]" />}
                          {slug ? renderMiniCard(slug, true, () => setSelectingSlot(index)) : renderEmptySlot(() => setSelectingSlot(index))}
                        </div>
                      );
                    })}
                  </div>

                  {selectingSlot !== null && (
                    <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl mt-4 animate-fade-in-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
                        <h4 className="text-[#fe9a00] text-[10px] font-black uppercase tracking-widest">Select Series for Slot {selectingSlot + 1}</h4>
                        <button onClick={() => { const newLoadout = [...tempProfile.topFive]; newLoadout[selectingSlot] = null; setTempProfile({...tempProfile, topFive: newLoadout}); setSelectingSlot(null); }} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 border border-red-900/30 px-3 py-1.5 rounded transition-colors bg-red-900/10 hover:bg-red-900/30">Clear Slot</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {displaySeriesList.map((s: any) => {
                          const isAlreadyEquipped = tempProfile.topFive.includes(s.slug);
                          return (
                            <div key={s.slug} onClick={() => { if (isAlreadyEquipped) return; const newLoadout = [...tempProfile.topFive]; newLoadout[selectingSlot] = s.slug; setTempProfile({...tempProfile, topFive: newLoadout}); setSelectingSlot(null); }} className={`relative rounded overflow-hidden cursor-pointer group border flex items-center gap-2 p-1.5 transition-all ${isAlreadyEquipped ? 'opacity-30 border-zinc-800 cursor-not-allowed' : 'border-zinc-800 hover:border-[#fe9a00] bg-black hover:bg-zinc-900'}`}>
                              <img src={s.cover_url} className="w-8 h-12 object-cover rounded-sm border border-zinc-800" alt="cover" />
                              <span className="text-[9px] font-bold text-white uppercase leading-tight tracking-wider pr-1">{s.title}</span>
                              {isAlreadyEquipped && <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-black text-red-500 uppercase tracking-widest backdrop-blur-[1px]">Equipped</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARD SKIN SELECTOR TAB */}
              {activeTab === 'card' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-4">Select an artwork skin for your digital club card</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    
                    {/* Default Option */}
                    <div onClick={() => setTempProfile({...tempProfile, cardSkin: ''})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${!tempProfile.cardSkin ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-zinc-500'}`}>
                      <div className="absolute inset-0 bg-zinc-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80 mix-blend-overlay" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carbon Black</span></div>
                    </div>

                    {/* Series Skin Options (From your Supabase series_list covers as defaults) */}
                    {displaySeriesList.map((s: any) => (
                      <div key={s.slug} onClick={() => setTempProfile({...tempProfile, cardSkin: s.cover_url})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${tempProfile.cardSkin === s.cover_url ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-zinc-500'}`}>
                        <img src={s.cover_url} className="absolute inset-0 w-full h-full object-cover opacity-80" alt={s.title} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest text-white">{s.title}</span></div>
                      </div>
                    ))}

                    {/* Custom Uploaded Skins (From the Card Skin Maker!) */}
                    {cardSkins.map((skin: any) => (
                      <div key={skin.id} onClick={() => setTempProfile({...tempProfile, cardSkin: skin.image_url})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${tempProfile.cardSkin === skin.image_url ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105' : 'border-zinc-800 hover:border-purple-500/50'}`}>
                        <img src={skin.image_url} className="absolute inset-0 w-full h-full object-cover opacity-80" alt={skin.name} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest text-white text-center px-2">{skin.name}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AVATAR & FRAMES TABS */}
              {(activeTab === 'art' || activeTab === 'frames' || activeTab === 'premium') && (
                <>
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className={`w-16 h-16 rounded-full overflow-hidden bg-zinc-900 z-10 flex items-center justify-center ${getFrameStyle(tempProfile.frameId)}`}>
                        {tempProfile.avatarUrl ? <img src={tempProfile.avatarUrl} className="w-full h-full object-cover rounded-full" alt="preview" /> : <User className="w-8 h-8 text-zinc-500" />}
                      </div>
                      {PREMIUM_FRAMES.some(p => p.id === tempProfile.frameId) && <div className={`absolute w-20 h-20 rounded-full border-2 border-transparent pointer-events-none ${getOrbitStyle(tempProfile.frameId)}`} />}
                    </div>
                  </div>

                  {activeTab === 'art' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      <div onClick={() => setTempProfile({...tempProfile, avatarUrl: ''})} className={`relative cursor-pointer rounded-full p-1 transition-all ${!tempProfile.avatarUrl ? 'bg-[#fe9a00] scale-110 shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'hover:bg-zinc-700'}`}>
                        <div className="w-full aspect-square bg-zinc-800 rounded-full border-2 border-black flex items-center justify-center"><User className="w-8 h-8 text-zinc-500" /></div>
                      </div>
                      {vaultAvatars.map(avatar => (
                        <div key={avatar.id} onClick={() => setTempProfile({...tempProfile, avatarUrl: avatar.image_url})} className={`relative cursor-pointer rounded-full p-1 transition-all ${tempProfile.avatarUrl === avatar.image_url ? 'bg-[#fe9a00] scale-110 shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'hover:bg-zinc-700'}`}>
                          <img src={avatar.image_url} alt={avatar.name} className="w-full aspect-square object-cover rounded-full border-2 border-black" />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'frames' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {BASIC_FRAMES.map(frame => (
                        <div key={frame.id} onClick={() => setTempProfile({...tempProfile, frameId: frame.id})} className={`relative flex flex-col items-center bg-zinc-900/50 p-4 rounded-xl border transition-all ${tempProfile.frameId === frame.id ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-800 hover:border-zinc-600 cursor-pointer'}`}>
                            <div className={`w-12 h-12 rounded-full z-10 flex items-center justify-center mb-3 bg-zinc-900 ${frame.style}`}><User className="w-5 h-5 text-zinc-600" /></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-center text-zinc-400">{frame.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'premium' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {PREMIUM_FRAMES.map(frame => (
                        <div key={frame.id} onClick={() => setTempProfile({...tempProfile, frameId: frame.id})} className={`relative flex flex-col items-center bg-zinc-900/50 p-4 rounded-xl border transition-all ${tempProfile.frameId === frame.id ? 'border-purple-500 bg-purple-900/10' : 'border-zinc-800 hover:border-purple-900/50 cursor-pointer'}`}>
                            <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                              <div className={`w-10 h-10 rounded-full bg-zinc-900 z-10 flex items-center justify-center ${frame.style}`}><User className="w-5 h-5 text-zinc-600" /></div>
                              <div className={`absolute w-14 h-14 rounded-full border-2 border-transparent ${frame.orbit}`} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-center text-purple-400">{frame.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-black">
              <button onClick={saveProfile} className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">
                Save & Equip Loadout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedSeries, setSelectedSeries] = useState(null); 
  const [selectedMagazine, setSelectedMagazine] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false); 
  
  // NEW: State to control the Login Modal
  const [showLogin, setShowLogin] = useState(false);
const [isMenuOpen, setIsMenuOpen] = useState(false);
  useEffect(() => { 
    const timer = setTimeout(() => setShowSplash(false), 3000); 
    return () => clearTimeout(timer); 
  }, []);

  const handleNavigate = (data: any) => {
    if (data.action === 'home') { setCurrentView('home'); return; }
    if (data.action === 'faves') { setCurrentView('faves'); return; }
    if (data.action === 'browse') { setCurrentView('browse'); return; } // <--- CATCHES BROWSE
    if (data.action === 'profile') { setCurrentView('profile'); return; }
    if (data.action === 'account') { setCurrentView('account'); return; }
    
    if (data.publish_date) { 
      setSelectedMagazine(data); 
      setCurrentView('magazine'); 
    } else { 
      setSelectedSeries(data); 
      setCurrentView('series'); 
    }
  };
  
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Unbounded:wght@700;800;900&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; }
          h1, h2, h3, h4, h5, h6, .font-black { font-family: 'Unbounded', sans-serif !important; font-style: italic !important; letter-spacing: -0.03em !important; }
          .tracking-widest { letter-spacing: 0.15em !important; font-style: normal !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-weight: 800; }
          .no-scrollbar::-webkit-scrollbar { display: none; } 
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>
      
      {/* NEW: Render the Login Modal if showLogin is true */}
      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)} 
          onSuccess={() => {
            setShowLogin(false);
            window.location.reload(); // Refresh to apply logged-in state
          }} 
        />
      )}


      {currentView === 'home' && (
        <HomePage 
          onNavigate={handleNavigate} 
          onAdminAccess={() => setCurrentView('admin')} 
          onLoginClick={() => setShowLogin(true)} 
        />
      )}
      
      {currentView === 'series' && (<SeriesDetailPage series={selectedSeries} onBack={() => { setCurrentView('home'); setSelectedSeries(null); }} />)}
      
      {currentView === 'magazine' && (<MagazineDetailPage magazine={selectedMagazine} onBack={() => { setCurrentView('home'); setSelectedMagazine(null); }} onMagazineSelect={(newMag: any) => { setSelectedMagazine(newMag); }} />)}
      
      {currentView === 'admin' && (isAdminAuthenticated ? <AdminDashboard onBack={() => setCurrentView('home')} /> : <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />)}
      
      {currentView === 'profile' && (<UserProfile onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
      
      {currentView === 'account' && (<AccountSettings onBack={() => setCurrentView('profile')} />)}
      
      {currentView === 'faves' && (<Favorites setActiveTab={setCurrentView} />)}
      
      {currentView === 'browse' && (<Browse onNavigate={handleNavigate} />)}
      
            {/* GLOBAL FOOTER */}
      {['home', 'faves', 'browse', 'profile'].includes(currentView) && (
        <FooterNav onNavigate={handleNavigate} />
      )}
      
      <ScrollToTopButton />
    </>
  );
}