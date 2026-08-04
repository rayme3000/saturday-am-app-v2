import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, SkipForward, X, User, Shield, 
  RotateCcw, MoveHorizontal, MoveVertical
} from 'lucide-react';
import { supabase } from '../supabase';
import { Virtuoso } from 'react-virtuoso';
import { HypeButton } from '../Components/HypeButton';
import { APP_ICONS } from '../appIcons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- PERFORMANCE OPTIMIZATION: Memoized Renderers ---
// These components will NEVER re-render unless the actual image URL changes.
// This prevents the 3.5s comment ticker from stuttering the image viewer.
const MemoizedVerticalPage = React.memo(({ src, alt }: { src: string, alt: string }) => (
  <div className="w-full flex justify-center bg-[#0a0a0a] m-0 p-0">
    <img 
      src={src} 
      className="w-full h-auto max-w-3xl block pointer-events-none m-0 p-0" 
      alt={alt} 
      loading="lazy" 
    />
  </div>
));

const MemoizedHorizontalImage = React.memo(({ src, alt, onInteractionStart, onTap, scaleState }: any) => (
  <div 
    className="w-full h-full flex items-center justify-center cursor-pointer touch-manipulation"
    onTouchStart={(e) => {
      if (e.touches.length === 1) onInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
    }}
    onMouseDown={(e) => onInteractionStart(e.clientX, e.clientY)}
    onClick={(e) => {
      if (scaleState <= 1) onTap(e);
    }}
  >
    <img 
      src={src} 
      className="object-contain pointer-events-none" 
      style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }}
      alt={alt} 
      loading="lazy"
    />
  </div>
));

export const MangaReader = ({ pages = [], onClose, chapterId, onHypeUpdate, onHome, onNext, hasNext, title, subtitle, userId, isPremium, initialPage = 0 }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal'); 
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHideHint, setShowHideHint] = useState(false);
  
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [internalIsPremium, setInternalIsPremium] = useState(isPremium);

  // Comments & Ticker
  const [activeCommentIndex, setActiveCommentIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localComments, setLocalComments] = useState<any[]>([]); 
  const [isReactInputOpen, setIsReactInputOpen] = useState(false);
  const [reactText, setReactText] = useState('');

  // Stats & End Prompt
  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const showEndPromptRef = useRef(showEndPrompt);

  // --- ZOOM & PROGRESS REFS ---
  const transformRef = useRef<any>(null);
  const currentPageRef = useRef(currentPage);
  const activeUserRef = useRef(userId || currentUser?.id);
  const isComponentMounted = useRef(true);
  const touchStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => { activeUserRef.current = userId || currentUser?.id; }, [userId, currentUser]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    showEndPromptRef.current = showEndPrompt;
  }, [showEndPrompt]);

  // --- UNMOUNT BEACON ---
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      const finalUserId = activeUserRef.current;
      const finalPage = currentPageRef.current;

      if (finalUserId && chapterId) {
        supabase.from('reading_history').upsert(
          { user_id: finalUserId, chapter_id: chapterId, page_index: finalPage, updated_at: new Date().toISOString() },
          { onConflict: 'user_id, chapter_id' }
        ).then();
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
            const payload = JSON.stringify({ user_id: finalUserId, chapter_id: chapterId, page_index: finalPage, updated_at: new Date().toISOString() });
            const url = `${supabaseUrl}/rest/v1/reading_history?on_conflict=user_id,chapter_id`;
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url + `&apikey=${supabaseKey}&Authorization=Bearer ${supabaseKey}`, blob);
        }
      }
    };
  }, [chapterId]);

  // Prevents mobile browsers from zooming the entire UI instead of just the image
  useEffect(() => {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    let originalContent = '';

    if (viewportMeta) {
      originalContent = viewportMeta.getAttribute('content') || '';
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    } else {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      document.head.appendChild(viewportMeta);
    }

    return () => {
      if (viewportMeta && originalContent) {
        viewportMeta.setAttribute('content', originalContent);
      }
    };
  }, []);

  // Failsafe to ensure zoom resets
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform(0); 
    }
  }, [currentPage, mode]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url, is_premium').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || 'https://i.pravatar.cc/150?u=99' });
        if (profile?.is_premium) setInternalIsPremium(true);
      }
      setIsAuthLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!chapterId) return;
    const fetchReacts = async () => {
      const { data, error } = await supabase.from('page_reacts').select('*').eq('chapter_id', chapterId).order('created_at', { ascending: true });
      if (error) console.error("Supabase Error fetching reacts:", error.message);
      
      if (data) {
        setLocalComments(data.map((r: any) => ({ id: r.id, pageIndex: r.page_index, user: r.user_name, avatar: r.avatar_url, text: r.text })));
      }
    };
    fetchReacts();
  }, [chapterId]);

  useEffect(() => {
    if (!chapterId || !isAuthLoaded) {
      if (!chapterId) setIsLoadingProgress(false);
      return;
    }
    
    setShowEndPrompt(false);
    setIsReactInputOpen(false);
    setIsUIVisible(true); 

    const activeUserId = userId || currentUser?.id;

    const fetchProgress = async () => {
      if (initialPage > 0) {
        setCurrentPage(initialPage);
        setIsLoadingProgress(false);
        return;
      }

      if (!activeUserId) {
        setCurrentPage(0);
        setIsLoadingProgress(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('reading_history')
          .select('page_index')
          .eq('user_id', activeUserId)
          .eq('chapter_id', chapterId)
          .maybeSingle();

        if (data && typeof data.page_index === 'number') {
          setCurrentPage(data.page_index);
        } else {
          setCurrentPage(0);
        }
      } catch (err) {
        console.error("No saved progress found, starting at 0");
        setCurrentPage(0);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [chapterId, userId, isAuthLoaded, currentUser, initialPage]);

  // --- PERFORMANCE OPTIMIZATION: Stable Callbacks for Gestures ---
  const saveProgressToDB = useCallback(async (pageToSave: number) => {
    const activeUserId = activeUserRef.current;
    if (!activeUserId || !chapterId || !isComponentMounted.current) return;

    try {
      await supabase.from('reading_history').upsert(
        { user_id: activeUserId, chapter_id: chapterId, page_index: pageToSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id, chapter_id' }
      );
      window.dispatchEvent(new Event('progressUpdated'));
    } catch (error) { 
      console.error("Failed to save progress:", error); 
    }
  }, [chapterId]);

  useEffect(() => {
    if (isLoadingProgress) return;
    const saveTimer = setTimeout(() => { saveProgressToDB(currentPage); }, 1000); 
    return () => clearTimeout(saveTimer);
  }, [currentPage, isLoadingProgress, saveProgressToDB]);

  const handleClose = useCallback(async (e?: any) => {
    if (e) e.stopPropagation();
    await saveProgressToDB(currentPageRef.current);
    onClose();
  }, [onClose, saveProgressToDB]);

  const handleNextChapter = useCallback(async (e?: any) => {
    if (e) e.stopPropagation();
    await saveProgressToDB(currentPageRef.current);
    onNext();
  }, [onNext, saveProgressToDB]);

  const goNext = useCallback(async (e?: any) => {
    if (e) e.stopPropagation(); 
    if (currentPageRef.current >= pages.length - 1) {
      setShowEndPrompt(true);
      const activeUserId = activeUserRef.current;
      if (activeUserId) {
        try {
          const { data: profile } = await supabase.from('profiles').select('chapters_read').eq('id', activeUserId).single();
          if (profile) {
            await supabase.from('profiles').update({ chapters_read: (profile.chapters_read || 0) + 1 }).eq('id', activeUserId);
            window.dispatchEvent(new Event('profileUpdated'));
          }
        } catch (error) { console.error("Error saving chapter read stat:", error); }
      }
      return;
    }
    setCurrentPage((p) => p + 1);
  }, [pages.length]);

  const goPrev = useCallback((e?: any) => {
    if (e) e.stopPropagation();
    if (showEndPromptRef.current) { setShowEndPrompt(false); return; }
    setCurrentPage((p) => Math.max(0, p - 1)); 
  }, []);

  const toggleUI = useCallback(() => {
    setIsUIVisible((prev) => {
      const nextState = !prev;
      if (!nextState) {
        setShowHideHint(true);
        setTimeout(() => setShowHideHint(false), 2000); 
      }
      return nextState;
    });
  }, []);

  const handleInteractionStart = useCallback((clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY };
  }, []);

  const handleTap = useCallback((e: React.MouseEvent) => {
    const deltaX = Math.abs(e.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.clientY - touchStartPos.current.y);

    if (deltaX > 8 || deltaY > 8) return; 

    const x = e.clientX;
    const width = window.innerWidth;
    if (x < width * 0.4) goPrev(); 
    else if (x > width * 0.6) goNext(); 
    else toggleUI(); 
  }, [goPrev, goNext, toggleUI]);

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
      if (profile) {
        await supabase.from('profiles').update({ quick_reacts: (profile.quick_reacts || 0) + 1 }).eq('id', currentUser.id);
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (err) { console.error("Failed to save react:", err); }
  };

  const getUrl = useCallback((p: any) => p?.image_url || p, []);
  const getId = useCallback((p: any) => p?.id || p, []);

  // --- PERFORMANCE OPTIMIZATION: Memoized Arrays ---
  const maxPage = Math.max(1, pages.length - 1);
  const progressPercentage = (currentPage / maxPage) * 100;
  
  const timelineComments = useMemo(() => localComments.slice(-25), [localComments]);
  const visibleComments = useMemo(() => localComments.filter(c => c.pageIndex === currentPage), [localComments, currentPage]);
  const activeComment = visibleComments[activeCommentIndex];

  useEffect(() => {
    if (visibleComments.length <= 1) return;
    const interval = setInterval(() => { setActiveCommentIndex((prev) => (prev + 1) % visibleComments.length); }, 3500);
    return () => clearInterval(interval);
  }, [visibleComments.length, currentPage]);

  useEffect(() => { setActiveCommentIndex(visibleComments.length > 0 ? visibleComments.length - 1 : 0); }, [currentPage, localComments.length]);

  const handleVerticalProgressClick = useCallback((e: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top; 
    const percentage = clickY / rect.height;
    const newPage = Math.round(percentage * maxPage);
    setCurrentPage(Math.max(0, Math.min(newPage, maxPage)));
  }, [maxPage]);

  const handleHorizontalProgressClick = useCallback((e: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left; 
    const percentage = clickX / rect.width;
    const newPage = Math.round(percentage * maxPage);
    setCurrentPage(Math.max(0, Math.min(newPage, maxPage)));
  }, [maxPage]);

  // Memoized Item Content for Virtuoso to prevent re-renders on scroll
  const virtuosoItemContent = useCallback((index: number, pageData: any) => (
    <MemoizedVerticalPage src={getUrl(pageData)} alt={`Page ${index + 1}`} />
  ), [getUrl]);

  if (isLoadingProgress) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-hidden flex flex-col font-sans"
      style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }}
    >
      <style>{`
        @keyframes slide-right-fade { 0% { opacity: 0; transform: translateX(-10px); } 100% { opacity: 1; transform: translateX(0); } }
        .animate-slide-right-fade { animation: slide-right-fade 0.3s ease-out forwards; }
        
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>

      {/* ========================================================================= */}
      {/* --- HORIZONTAL READER (WITH NATIVE PINCH & ROLL ZOOM ENABLED) ---         */}
      {/* ========================================================================= */}
      {mode === 'horizontal' && (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
          {pages[currentPage] ? (
            <TransformWrapper
              key={`zoom-wrapper-${currentPage}`} // FORCES ZOOM RESET EVERY TURN
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
              limitToBounds={true}
              doubleClick={{ step: 2 }} 
              panning={{ velocityDisabled: true }}
            >
              {({ state }) => (
                <div className="w-full h-full relative">
                  <TransformComponent 
                    wrapperStyle={{ width: '100vw', height: '100vh' }}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MemoizedHorizontalImage 
                      src={getUrl(pages[currentPage])}
                      alt={`Page ${currentPage + 1}`}
                      onInteractionStart={handleInteractionStart}
                      onTap={handleTap}
                      scaleState={state.scale}
                    />
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          ) : (
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          )}
        </div>
      )}

      {/* --- VERTICAL READER --- */}
      {mode === 'vertical' && (
        <div 
          className="absolute inset-0 w-full h-full select-none overflow-x-hidden bg-[#0a0a0a] z-0" 
          onClick={toggleUI}
          style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }}
        >
          <Virtuoso
            style={{ height: '100%', width: '100%' }}
            data={pages}
            initialTopMostItemIndex={currentPage}
            rangeChanged={(range) => setCurrentPage(Math.max(0, range.startIndex))}
            itemContent={virtuosoItemContent}
            components={{
              Footer: () => (
                <div className="py-24 flex flex-col items-center text-center w-full max-w-sm mx-auto mt-12 mb-12 px-6" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">End of Chapter</h2>
                  <div className="flex flex-col gap-4 w-full mt-8">
                    {hasNext && (
                      <button onClick={handleNextChapter} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2">
                        Read Next <SkipForward className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={handleClose} className="w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Back to Series
                    </button>
                  </div>
                </div>
              )
            }}
          />
        </div>
      )}

      {/* END PROMPT (HORIZONTAL ONLY) */}
      {showEndPrompt && mode === 'horizontal' && (
        <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">End of Chapter</h2>
          <div className="flex flex-col gap-4 w-full max-w-sm mt-8">
            {hasNext && (
              <button onClick={() => { setShowEndPrompt(false); handleNextChapter(); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2">
                Read Next <SkipForward className="w-5 h-5" />
              </button>
            )}
            <button onClick={handleClose} className="w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" /> Back to Series
            </button>
            <button onClick={() => setShowEndPrompt(false)} className="mt-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">
              Cancel & Return to Page
            </button>
          </div>
        </div>
      )}

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none transition-opacity duration-500 ${showHideHint ? 'opacity-100' : 'opacity-0'}`}>
         <div className="bg-black/60 backdrop-blur-md border border-zinc-700/50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-white/50" />
            <span className="text-white font-black uppercase tracking-widest text-[10px]">Tap center for menu</span>
         </div>
      </div>

      {/* --- TRANSLUCENT TOP-RIGHT INFO PILL --- */}
      <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-full px-4 py-2 z-50 flex flex-col items-end pointer-events-none transition-all duration-300 shadow-xl ${isUIVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
        <span className="text-white/90 text-[10px] font-bold tracking-wider">{title || 'Reading'}</span>
        <span className="text-[#fe9a00] text-[9px] font-black uppercase tracking-widest mt-0.5">Page {currentPage + 1} / {pages.length}</span>
      </div>


      {/* ========================================================================= */}
      {/* --- UI BLOCK: VERTICAL MODE (LEFT STACK) ---                              */}
      {/* ========================================================================= */}
      {mode === 'vertical' && (
        <div 
          className={`absolute top-2 bottom-2 left-2 sm:top-3 sm:bottom-3 sm:left-3 w-12 sm:w-14 flex flex-col items-center py-2 z-50 transition-transform duration-300 ${isUIVisible ? 'translate-x-0' : '-translate-x-[200%]'}`}
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Top: Nav */}
          <div className="flex flex-col items-center w-full">
            <button onClick={handleClose} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg hover:bg-[#fe9a00] hover:text-black rounded-full transition-colors text-white" title="Back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Middle: Vertical Track */}
          <div className="flex-1 w-full my-6 relative flex justify-center group" onClick={handleVerticalProgressClick}>
            <div className="absolute inset-y-0 -inset-x-4 cursor-pointer z-10" />
            <div className="w-1.5 h-full bg-black/40 backdrop-blur-md rounded-full overflow-hidden relative pointer-events-none shadow-inner border border-white/5">
              <div className="absolute top-0 left-0 w-full bg-[#fe9a00] transition-all duration-300" style={{ height: `${progressPercentage}%` }} />
            </div>

            {/* Pinned Avatars (Y-Axis) */}
            {timelineComments.map((comment) => (
              <div 
                key={comment.id}
                className="absolute left-1/2 pointer-events-none transition-transform group-hover:scale-110 drop-shadow-md"
                style={{ top: `${(comment.pageIndex / maxPage) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: comment.pageIndex === currentPage ? 5 : 1 }}
              >
                {comment.avatar && !comment.avatar.includes('pravatar') ? (
                  <img src={comment.avatar} className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`} alt="" />
                ) : (
                  <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-zinc-800/90 flex items-center justify-center shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`}>
                    <User className="w-2 h-2 sm:w-3 sm:h-3 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Active Comment Popup (Right slide) */}
            {activeComment && (
              <div 
                key={activeComment.id} 
                className="absolute left-full ml-3 sm:ml-4 flex items-center pointer-events-none z-20"
                style={{ top: `${(currentPage / maxPage) * 100}%`, transform: 'translateY(-50%)' }}
              >
                <div className="animate-slide-right-fade flex items-center">
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-black/70 -mr-[1px]" />
                  <div className="bg-black/70 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-2xl max-w-[180px] sm:max-w-[250px] border border-white/5 flex flex-col items-start">
                    <span className="text-[#fe9a00] font-semibold uppercase text-[8px] mb-0.5 w-full truncate">
                      {activeComment.user.length > 15 ? `${activeComment.user.slice(0, 15)}...` : activeComment.user}
                    </span>
                    <span className="text-[10px] sm:text-[11px] leading-tight break-words text-left whitespace-normal">
                      {activeComment.text}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Tools */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button onClick={() => setMode('horizontal')} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Switch to Horizontal Reader">
              <MoveHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            {currentUser?.id && pages[currentPage] && (
              <div className="scale-75 sm:scale-90 drop-shadow-md">
                <HypeButton targetType="page" targetId={getId(pages[currentPage])} userId={currentUser.id} variant="icon" />
              </div>
            )}

            <button onClick={() => setIsReactInputOpen(!isReactInputOpen)} className={`p-2.5 sm:p-3 flex items-center justify-center rounded-full transition-colors shadow-xl border border-white/5 ${isReactInputOpen ? 'bg-zinc-800' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'}`} title="Add React">
              <img src={APP_ICONS.QUICK_REACT} alt="Quick React" className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-md" />
            </button>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* --- UI BLOCK: HORIZONTAL MODE (BOTTOM BAR) ---                            */}
      {/* ========================================================================= */}
      {mode === 'horizontal' && (
        <div 
          className={`absolute left-2 right-2 sm:left-3 sm:right-3 h-12 sm:h-14 flex flex-row items-center z-50 transition-transform duration-300 ${isUIVisible ? 'translate-y-0' : 'translate-y-[200%]'}`}
          style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Left: Nav */}
          <div className="flex flex-row items-center">
            <button onClick={handleClose} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg hover:bg-[#fe9a00] hover:text-black rounded-full transition-colors text-white" title="Back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Middle: Horizontal Track */}
          <div className="flex-1 h-full mx-4 sm:mx-6 relative flex items-center group" onClick={handleHorizontalProgressClick}>
            <div className="absolute inset-x-0 -inset-y-4 cursor-pointer z-10" />
            <div className="w-full h-1.5 bg-black/40 backdrop-blur-md rounded-full overflow-hidden relative pointer-events-none shadow-inner border border-white/5">
              <div className="absolute top-0 left-0 h-full bg-[#fe9a00] transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
            </div>

            {/* Pinned Avatars (X-Axis) */}
            {timelineComments.map((comment) => (
              <div 
                key={comment.id}
                className="absolute top-1/2 pointer-events-none transition-transform group-hover:scale-110 drop-shadow-md"
                style={{ left: `${(comment.pageIndex / maxPage) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: comment.pageIndex === currentPage ? 5 : 1 }}
              >
                {comment.avatar && !comment.avatar.includes('pravatar') ? (
                  <img src={comment.avatar} className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`} alt="" />
                ) : (
                  <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-zinc-800/90 flex items-center justify-center shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`}>
                    <User className="w-2 h-2 sm:w-3 sm:h-3 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Active Comment Popup (Up slide) */}
            {activeComment && (
              <div 
                key={activeComment.id} 
                className="absolute bottom-full mb-3 sm:mb-4 flex flex-col items-center pointer-events-none z-20"
                style={{ left: `${(currentPage / maxPage) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className="animate-slide-up-fade flex flex-col items-center">
                  <div className="bg-black/70 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-2xl max-w-[180px] sm:max-w-[250px] border border-white/5 flex flex-col items-start">
                    <span className="text-[#fe9a00] font-semibold uppercase text-[8px] mb-0.5 w-full truncate">
                      {activeComment.user.length > 15 ? `${activeComment.user.slice(0, 15)}...` : activeComment.user}
                    </span>
                    <span className="text-[10px] sm:text-[11px] leading-tight break-words text-left whitespace-normal">
                      {activeComment.text}
                    </span>
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-black/70 -mt-[1px]" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Tools */}
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <button onClick={() => setMode('vertical')} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Switch to Vertical Scroll">
              <MoveVertical className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            {currentUser?.id && pages[currentPage] && (
              <div className="scale-75 sm:scale-90 drop-shadow-md">
                <HypeButton targetType="page" targetId={getId(pages[currentPage])} userId={currentUser.id} variant="icon" />
              </div>
            )}

            <button onClick={() => setIsReactInputOpen(!isReactInputOpen)} className={`p-2.5 sm:p-3 flex items-center justify-center rounded-full transition-colors shadow-xl border border-white/5 ${isReactInputOpen ? 'bg-zinc-800' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'}`} title="Add React">
              <img src={APP_ICONS.QUICK_REACT} alt="Quick React" className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-md" />
            </button>
          </div>
        </div>
      )}

      {/* --- TRANSLUCENT QUICK REACT INPUT POPUP --- */}
      <div 
        className={`absolute z-[110] flex w-[calc(100%-16px)] sm:w-full max-w-sm pointer-events-none transition-all duration-300 ${mode === 'vertical' ? 'bottom-4 left-16 sm:left-20 justify-start' : 'bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 justify-center'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {isReactInputOpen && isUIVisible && (
           <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl animate-fade-in pointer-events-auto">
              {internalIsPremium ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-2 pt-1 pb-1 sm:pb-2 border-b border-white/10">
                    <span className="text-[9px] sm:text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Quick React</span>
                    <button onClick={() => setIsReactInputOpen(false)} className="text-white/50 hover:text-white"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      maxLength={30}
                      value={reactText}
                      onChange={(e) => setReactText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleReactSubmit(); }}
                      placeholder="Drop a react..."
                      className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-xs px-3 py-2 sm:py-2.5 rounded-xl flex-1 focus:outline-none focus:border-[#fe9a00]"
                    />
                    <button onClick={handleReactSubmit} disabled={!reactText.trim()} className="bg-[#fe9a00] text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50">
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#fe9a00]" />
                    <div className="flex flex-col">
                      <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[9px] sm:text-[10px]">Subscriber Exclusive</span>
                      <span className="text-white/70 text-[8px] sm:text-[9px] font-bold tracking-widest">Join to leave quick reacts.</span>
                    </div>
                  </div>
                  <button onClick={() => setIsReactInputOpen(false)} className="bg-white/10 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase hover:bg-white/20">Close</button>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};