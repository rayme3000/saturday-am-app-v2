import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, SkipForward,
  MessageCircle, MessageCircleOff, X, User, Shield, 
  RotateCcw, Home, Maximize2, MoveHorizontal, MoveVertical, 
  BookOpen, Flame, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../supabase';
import { Virtuoso } from 'react-virtuoso';
import { HypeButton } from '../Components/HypeButton';

export const MangaReader = ({ pages = [], onClose, chapterId, onHypeUpdate, onHome, onNext, onPrev, hasNext, hasPrev, title, subtitle, readingDirection = 'ltr', userId, isPremium }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState('horizontal'); 
  
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHideHint, setShowHideHint] = useState(false);

  const [isTickerEnabled, setIsTickerEnabled] = useState(true);
  const [activeCommentIndex, setActiveCommentIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localComments, setLocalComments] = useState<any[]>([]); 

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || 'https://i.pravatar.cc/150?u=99' });
      }
    });
  }, []);

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

  const [isReactPanelOpen, setIsReactPanelOpen] = useState(false);
  const [reactPage, setReactPage] = useState(0);
  const [showReactIndicator, setShowReactIndicator] = useState(true); 
  const reactsPerPage = 4;
  
  useEffect(() => {
    setShowReactIndicator(true);
    const timer = setTimeout(() => {
      setShowReactIndicator(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentPage]);
  
  const visibleReacts = localComments.filter(c => 
    mode === 'book' 
      ? (c.pageIndex === currentPage || c.pageIndex === currentPage + 1) 
      : c.pageIndex === currentPage
  );
  const totalReactPages = Math.ceil(visibleReacts.length / reactsPerPage);
  const currentPaginatedReacts = visibleReacts.slice(reactPage * reactsPerPage, (reactPage + 1) * reactsPerPage);

  useEffect(() => {
    setIsReactPanelOpen(false);
    setReactPage(0);
  }, [currentPage]); 
  
  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [showTutorial, setShowTutorial] = useState(true);

  const getSpread = (index: number) => {
    if (index === 0) return [0]; 
    const leftPageIndex = index % 2 === 1 ? index : index - 1;
    const rightPageIndex = leftPageIndex + 1;
    
    if (!pages || rightPageIndex >= pages.length) return [leftPageIndex];
    return [rightPageIndex, leftPageIndex]; 
  };

  const currentPagesToDisplay = isLandscape ? getSpread(currentPage) : [currentPage];
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
    
    const tempId = Date.now();
    setLocalComments([...localComments, { id: tempId, pageIndex: currentPage, user: currentUser.name, avatar: currentUser.avatar, text: reactText.trim() }]);
    setReactText('');
    setIsReactInputOpen(false);

    try {
      const { error } = await supabase.from('page_reacts').insert([newReactPayload]);
      if (error) throw error;
      
      const { data: profile } = await supabase.from('profiles').select('quick_reacts').eq('id', currentUser.id).single();
      if (profile) await supabase.from('profiles').update({ quick_reacts: (profile.quick_reacts || 0) + 1 }).eq('id', currentUser.id);
    } catch (err) { console.error("Failed to save react:", err); }
  };

  const getUrl = (p: any) => p?.image_url || p;
  const getId = (p: any) => p?.id || p;

  const handleImageLoad = (pageData: any, e: any) => {
    const url = getUrl(pageData);
    const { naturalWidth, naturalHeight } = e.target;
    setAspectRatios(prev => ({ ...prev, [url]: naturalWidth / naturalHeight }));
  };

  const isSpread = (pageIndex: number) => {
    if (pageIndex >= pages.length) return false;
    const ratio = aspectRatios[getUrl(pages[pageIndex])];
    return ratio ? ratio > 1.2 : false; 
  };

  const goNext = async (e?: any) => {
    if (e) e.stopPropagation(); 
    
    // Check if they are about to hit the End Prompt
    let willHitEndPrompt = false;

    if (mode === 'book') {
      const nextLimit = isSpread(currentPage) ? 1 : (isSpread(currentPage + 1) ? 1 : 2);
      if (currentPage + nextLimit > pages.length - 1) willHitEndPrompt = true;
    } else {
      if (currentPage >= pages.length - 1) willHitEndPrompt = true;
    }

    if (willHitEndPrompt) {
      setShowEndPrompt(true);

      // --- NEW STAT TRACKER: RECORD CHAPTER READ ---
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('chapters_read')
            .eq('id', userId)
            .single();
          
          if (profile) {
            await supabase
              .from('profiles')
              .update({ chapters_read: (profile.chapters_read || 0) + 1 })
              .eq('id', userId);
          }
        } catch (error) {
          console.error("Error saving chapter read stat:", error);
        }
      }
      return;
    }
    
    // If they aren't at the end, just turn the page normally
    if (mode === 'book') {
      const nextLimit = isSpread(currentPage) ? 1 : (isSpread(currentPage + 1) ? 1 : 2);
      setCurrentPage((p) => p + nextLimit);
    } else {
      setCurrentPage((p) => p + 1);
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
    
    if (!nextState) {
      setShowHideHint(true);
      setTimeout(() => setShowHideHint(false), 2500); 
    }
  };

  const visibleComments = localComments.filter(c => {
    if (mode === 'vertical') return true; 
    if (mode === 'book') return c.pageIndex === currentPage || c.pageIndex === currentPage + 1; 
    return c.pageIndex === currentPage; 
  });

  const touchStartX = useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext(); 
      else goPrev();         
    }
  };

  const handleTap = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) goPrev();
    else goNext();
  };

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
{/* Persistent UI Toggle */}
      <button 
        onClick={() => setIsUIVisible(!isUIVisible)}
        className="absolute top-4 right-4 z-[500] p-2 bg-black/50 backdrop-blur-sm border border-zinc-800 rounded-full text-[#fe9a00] hover:bg-zinc-800 transition-all shadow-xl"
        title={isUIVisible ? "Hide UI" : "Show UI"}
      >
        {isUIVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
      </button> 
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
        
       {mode === 'horizontal' && (
          <div className="h-full w-full flex items-center justify-center relative select-none overflow-hidden">
            
            <div 
              className="relative max-w-full max-h-[85vh] w-full h-full flex items-center justify-center pointer-events-auto z-0 cursor-pointer"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleTap}
            >
              {pages[currentPage] ? (
                <img 
    src={getUrl(pages[currentPage])} // Fixed: used getUrl
    onLoad={(e) => handleImageLoad(pages[currentPage], e)} 
    className="max-w-full max-h-full object-contain drop-shadow-2xl pointer-events-auto mx-auto" 
    alt={`Page ${currentPage + 1}`} 
    loading="lazy"
  />
) : (
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
                  <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px]">Loading Page...</span>
                </div>
              )}
            </div>
            
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={goPrev} />
            
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={goNext} />

            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}>
               <div className="w-full max-w-4xl flex justify-between px-2 sm:px-6">
                 <div className={`pointer-events-auto transition-all ${currentPage === 0 ? 'opacity-0 scale-90' : 'opacity-100 scale-100 hover:-translate-x-2'}`}>
                   <button onClick={goPrev} disabled={currentPage === 0} className="bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-full text-zinc-400 hover:text-[#fe9a00] border border-zinc-700 shadow-2xl">
                     <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                   </button>
                 </div>
                 <div className="pointer-events-auto transition-all opacity-100 scale-100 hover:translate-x-2">
                   <button onClick={goNext} className="bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-full text-[#fe9a00] hover:text-white border border-[#fe9a00]/30 shadow-[0_0_20px_rgba(254,154,0,0.2)] hover:shadow-[0_0_25px_rgba(254,154,0,0.5)] transition-all">
                     <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                   </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* --- OPTIMIZED VIRTUAL VERTICAL READER --- */}
        {mode === 'vertical' && (
          <div className="h-full w-full select-none">
            <Virtuoso
              style={{ height: '100%', width: '100%' }}
              data={pages}
              rangeChanged={(range) => setCurrentPage(Math.max(0, range.startIndex))}
              itemContent={(index, pageData: any) => ( // Renamed pageUrl to pageData
  <div className="flex justify-center w-full">
    <img
      src={getUrl(pageData)} // Fixed: used getUrl
      onLoad={(e) => handleImageLoad(pageData, e)}
      className="w-full max-w-3xl object-contain block"
      alt={`Page ${index + 1}`}
      loading="lazy"
    />
  </div>
)}
              components={{
                Footer: () => (
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
                )
              }}
            />
          </div>
        )}

        {mode === 'book' && (
          <>
            {/* --- BOOK MODE: ALWAYS SIDE-BY-SIDE --- */}
            {currentPage > 0 && (
              <div 
                onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage - 1); }} 
                className="absolute left-0 top-16 bottom-16 w-1/6 md:w-32 z-40 cursor-pointer flex items-center justify-start px-2 md:px-6 opacity-30 hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="text-white w-10 h-10 md:w-16 md:h-16 drop-shadow-2xl" />
              </div>
            )}

            {currentPage < (pages?.length || 0) - 1 && (
              <div 
                onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage + 1); }} 
                className="absolute right-0 top-16 bottom-16 w-1/6 md:w-32 z-40 cursor-pointer flex items-center justify-end px-2 md:px-6 opacity-100 hover:scale-110 transition-all"
              >
                <ChevronRight className="text-white w-10 h-10 md:w-16 md:h-16 drop-shadow-2xl" />
              </div>
            )}

            {/* ALWAYS RENDER THE SIDE-BY-SIDE VIEW */}
            <div 
              className="h-[85vh] flex justify-center items-center w-full max-w-7xl mx-auto cursor-pointer"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleTap}
            >
              {(() => {
                const safePages = pages || [];
                const currentPg = safePages[currentPage];
                const currentUrl = getUrl(currentPg);
                const isCurrentSpread = aspectRatios[currentUrl] > 1.2;

                // 1. If it's a single image spread, show it full screen
                if (isCurrentSpread) {
                  return (
                    <div className="flex h-full w-full justify-center items-center">
                      <img src={currentUrl} className="h-full w-auto max-w-full object-contain" alt="Spread Page" loading="lazy" />
                    </div>
                  );
                }

                // 2. Otherwise, calculate left/right and force them to 50%
                const baseIndex = Math.floor(currentPage / 2) * 2;
                const leftPage = readingDirection === 'rtl' ? safePages[baseIndex + 1] : safePages[baseIndex];
                const rightPage = readingDirection === 'rtl' ? safePages[baseIndex] : safePages[baseIndex + 1];

                return (
                  <div className="flex h-full w-full max-w-5xl justify-center items-center">
                    {leftPage ? (
                      <img src={getUrl(leftPage)} className="h-full w-auto max-w-[50%] object-contain" alt="Left Page" loading="lazy" />
                    ) : (
                      <div className="h-full w-[40vw] max-w-[50%] bg-black flex items-center justify-center">
                        {readingDirection === 'rtl' && <span className="text-zinc-800 text-[10px] uppercase font-black tracking-widest">End</span>}
                      </div>
                    )}
                    {rightPage ? (
                      <img src={getUrl(rightPage)} className="h-full w-auto max-w-[50%] object-contain" alt="Right Page" loading="lazy" />
                    ) : (
                      <div className="h-full w-[40vw] max-w-[50%] bg-black flex items-center justify-center">
                        {readingDirection === 'ltr' && <span className="text-zinc-800 text-[10px] uppercase font-black tracking-widest">End</span>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}

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

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none transition-opacity duration-500 ${showHideHint ? 'opacity-100' : 'opacity-0'}`}>
         <div className="bg-black/90 backdrop-blur-md border border-zinc-700 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-[#fe9a00] animate-spin-slow" />
            <span className="text-white font-black uppercase tracking-widest text-[10px] sm:text-xs">Tap screen to show menus</span>
         </div>
      </div>

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
          
        </div>
      </div>

      {visibleReacts.length > 0 && !isReactPanelOpen && isUIVisible && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsReactPanelOpen(true); setShowReactIndicator(true); }}
          className={`absolute bottom-24 sm:bottom-28 right-4 sm:right-6 z-50 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-black/80 backdrop-blur-md border border-[#fe9a00] rounded-full shadow-[0_0_15px_rgba(254,154,0,0.5)] transition-all duration-700 ${showReactIndicator ? 'opacity-100 scale-100 animate-pulse hover:scale-110' : 'opacity-0 scale-75 pointer-events-none'}`}
          title="View Page Reacts"
        >
          <span className="text-[#fe9a00] font-black italic tracking-tighter text-sm sm:text-base mt-0.5">
            !!
          </span>
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center rounded-full shadow-md">
            {visibleReacts.length > 99 ? '99+' : visibleReacts.length}
          </span>
        </button>
      )}

      {isReactPanelOpen && isUIVisible && (
        <div 
          className="absolute bottom-28 right-6 z-[120] w-72 bg-black/90 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-3 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Page Reacts
            </span>
            <button onClick={() => setIsReactPanelOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 min-h-[160px]">
            {currentPaginatedReacts.map((react, idx) => (
              <div key={idx} className="flex gap-3 items-start animate-fade-in">
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
                
                <div className="flex flex-col">
                  <span className="text-[#fe9a00] text-[9px] font-black tracking-widest uppercase mb-0.5">{react.user}</span>
                  <p className="text-zinc-300 text-[11px] leading-snug">{react.text}</p>
                </div>
              </div>
            ))}
          </div>

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

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md z-[110] flex justify-center pointer-events-none">
        {isReactInputOpen && isUIVisible && (
           <div className="animate-slide-up w-[90vw] bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
              
              {isPremium ? (
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
                  <button onClick={() => { setIsReactInputOpen(false); }} className="bg-[#fe9a00] text-black px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors">
                    Unlock
                  </button>
                </div>
              )}

           </div>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-4 py-3 flex justify-between items-center z-50 transition-transform duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] ${isUIVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        
        <div className="flex items-center w-1/4 sm:w-1/3">
           <button onClick={() => setIsTickerEnabled(!isTickerEnabled)} className="p-2 rounded-full flex items-center gap-2 text-zinc-500 hover:text-white transition-colors" title={isTickerEnabled ? "Mute Comments" : "Show Comments"}>
             {isTickerEnabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
             <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">{isTickerEnabled ? 'Mute' : 'Unmute'}</span>
           </button>
        </div>

        <div className="flex-1 flex justify-center items-center gap-4 relative">
          
          {showTutorial && (
            <div className={`flex absolute -top-10 lg:relative lg:top-0 items-center pointer-events-none transition-opacity duration-1000 ${isTutorialFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[#fe9a00] text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-black/90 px-4 py-2 rounded-full border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.4)] animate-pulse">
                Choose Style
              </span>
            </div>
          )}

          <div className="flex items-center bg-zinc-900/90 px-1 py-1 rounded-full border border-zinc-800 gap-1 flex-shrink-0">
             <button onClick={() => setMode('horizontal')} className={`p-2 rounded-full transition-colors ${mode === 'horizontal' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><MoveHorizontal className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             <button onClick={() => setMode('vertical')} className={`p-2 rounded-full transition-colors ${mode === 'vertical' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><MoveVertical className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             <button onClick={() => { setMode('book'); if (currentPage % 2 !== 0 && !isSpread(currentPage)) setCurrentPage(Math.max(0, currentPage - 1)); }} className={`p-2 rounded-full transition-colors ${mode === 'book' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}><BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /></button>
             
             <div className="w-px h-5 bg-zinc-700 mx-1"></div>
             
             {userId && pages[currentPage] && (
               <HypeButton 
                 targetType="page" 
                 targetId={getId(pages[currentPage])} 
                 userId={userId} 
                 variant="icon" 
               />
             )}

             <button onClick={() => setIsReactInputOpen(!isReactInputOpen)} className={`p-2 rounded-full transition-colors ${isReactInputOpen ? 'bg-zinc-800 text-white' : 'text-[#fe9a00] hover:bg-black'}`} title="Quick React">
               <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>
          </div>

          {showTutorial && (
            <div className={`flex absolute -top-20 lg:relative lg:top-0 items-center pointer-events-none transition-opacity duration-1000 ${isTutorialFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[#fe9a00] text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-black/90 px-4 py-2 rounded-full border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.4)] animate-pulse">
                Subscribers, drop a quick react!
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