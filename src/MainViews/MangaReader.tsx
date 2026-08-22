import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, SkipForward, RotateCcw, MoveHorizontal, MoveVertical, Share2 } from 'lucide-react';
import { supabase } from '../supabase';
import { Virtuoso } from 'react-virtuoso';
import { HypeButton } from '../Components/HypeButton';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ShareModal } from '../Components/ShareModal';
import { 
  useQuickReacts, QuickReactDrawer, QuickReactTimeline, 
  QuickReactToggleButton, QuickReactViewAllButton, QuickReactInputOverlay, QuickReactToast 
} from '../Components/QuickReacts';

const MemoizedVerticalPage = React.memo(({ src, alt }: { src: string, alt: string }) => (
  <div className="w-full flex justify-center bg-[#0a0a0a] m-0 p-0">
    <img src={src} className="w-full h-auto max-w-3xl block pointer-events-none m-0 p-0" alt={alt} loading="lazy" />
  </div>
));

const MemoizedHorizontalImage = React.memo(({ src, alt }: any) => (
  <div className="w-full h-full flex items-center justify-center">
    <img src={src} className="object-contain pointer-events-none" style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh' }} alt={alt} />
  </div>
));

export const MangaReader = ({ pages = [], onClose, chapterId, onHypeUpdate, onHome, onNext, hasNext, title, subtitle, userId, isPremium, initialPage = 0, onNavigate, series, chapter }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal'); 
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHideHint, setShowHideHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [internalIsPremium, setInternalIsPremium] = useState(isPremium);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingPage, setIsAnimatingPage] = useState(false);

  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const showEndPromptRef = useRef(showEndPrompt);

  const transformRef = useRef<any>(null);
  const currentPageRef = useRef(currentPage);
  const activeUserRef = useRef(userId || currentUser?.id);
  const isComponentMounted = useRef(true);
  
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchCurrentPos = useRef({ x: 0, y: 0 });
  const currentScaleRef = useRef(1);

  const getUrl = useCallback((p: any) => p?.image_url || p, []);
  const getId = useCallback((p: any) => p?.id || p, []);

  // --- CONNECT OUR NEW HOOK ---
  const qr = useQuickReacts(chapterId, currentPage, currentUser);

  // --- ROBUST SHARE FALLBACK ---
  const fallbackSeries = series || { 
    title: subtitle || 'Saturday AM Series', 
    slug: subtitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '' 
  };
  const fallbackChapter = chapter || { 
    chapter_number: title?.match(/\d+/)?.[0] || '1' 
  };

  useEffect(() => {
    if (!pages || pages.length === 0) return;
    const pagesToPreload = [currentPage + 1, currentPage + 2];
    pagesToPreload.forEach(index => {
      if (index < pages.length) {
        const imgUrl = getUrl(pages[index]);
        if (imgUrl) { const img = new Image(); img.src = imgUrl; }
      }
    });
  }, [currentPage, pages, getUrl]);

  useEffect(() => { activeUserRef.current = userId || currentUser?.id; }, [userId, currentUser]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { showEndPromptRef.current = showEndPrompt; }, [showEndPrompt]);

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
      if (viewportMeta && originalContent) viewportMeta.setAttribute('content', originalContent);
    };
  }, []);

  useEffect(() => {
    if (transformRef.current) transformRef.current.resetTransform(0); 
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
    if (!chapterId || !isAuthLoaded) {
      if (!chapterId) setIsLoadingProgress(false);
      return;
    }
    
    setShowEndPrompt(false);
    qr.setIsReactInputOpen(false);
    setIsUIVisible(true); 

    const activeUserId = userId || currentUser?.id;

    const fetchProgress = async () => {
      if (initialPage > 0) {
        const safePage = Math.min(initialPage, Math.max(0, pages.length - 1));
        setCurrentPage(safePage);
        setIsLoadingProgress(false);
        return;
      }

      if (!activeUserId) {
        setCurrentPage(0);
        setIsLoadingProgress(false);
        return;
      }

      try {
        const { data } = await supabase.from('reading_history').select('page_index').eq('user_id', activeUserId).eq('chapter_id', chapterId).maybeSingle();
        if (data && typeof data.page_index === 'number') {
          const safePage = Math.min(data.page_index, Math.max(0, pages.length - 1));
          setCurrentPage(safePage);
        } else {
          setCurrentPage(0);
        }
      } catch (err) {
        setCurrentPage(0);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [chapterId, userId, isAuthLoaded, currentUser, initialPage, pages.length]);

  const saveProgressToDB = useCallback(async (pageToSave: number) => {
    const activeUserId = activeUserRef.current;
    if (!activeUserId || !chapterId || !isComponentMounted.current) return;
    try {
      await supabase.from('reading_history').upsert(
        { user_id: activeUserId, chapter_id: chapterId, page_index: pageToSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id, chapter_id' }
      );
      window.dispatchEvent(new Event('progressUpdated'));
    } catch (error) { console.error("Failed to save progress:", error); }
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
        } catch (error) {}
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

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (isAnimatingPage) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartPos.current = { x: clientX, y: clientY };
    touchCurrentPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, [isAnimatingPage]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || currentScaleRef.current > 1.05 || isAnimatingPage) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchCurrentPos.current = { x: clientX, y: clientY };
    const deltaX = clientX - touchStartPos.current.x;
    const deltaY = Math.abs(clientY - touchStartPos.current.y);
    if (Math.abs(deltaX) > deltaY) setDragOffset(deltaX);
  }, [isDragging, isAnimatingPage]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
    const deltaX = clientX - touchStartPos.current.x;
    const deltaY = Math.abs(clientY - touchStartPos.current.y);

    if (Math.abs(deltaX) <= 8 && deltaY <= 8) {
      setDragOffset(0);
      const x = touchStartPos.current.x;
      const width = window.innerWidth;
      if (x < width * 0.4) goPrev(); 
      else if (x > width * 0.6) goNext(); 
      else toggleUI(); 
      return;
    }
    
    if (currentScaleRef.current > 1.05) return;

    if (Math.abs(deltaX) > 60 && deltaY < 120) {
      setIsAnimatingPage(true);
      const direction = deltaX < 0 ? -1 : 1; 
      setDragOffset(direction * window.innerWidth);
      setTimeout(() => {
        if (direction === -1) goNext(); else goPrev();
        setDragOffset(0);
        setIsAnimatingPage(false);
      }, 200); 
    } else {
      setIsAnimatingPage(true);
      setDragOffset(0);
      setTimeout(() => setIsAnimatingPage(false), 200);
    }
  }, [isDragging, goNext, goPrev, toggleUI]);

  const maxPage = Math.max(1, pages.length - 1);
  const progressPercentage = (currentPage / maxPage) * 100;

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

  const virtuosoItemContent = useCallback((index: number, pageData: any) => (
    <MemoizedVerticalPage src={getUrl(pageData)} alt={`Page ${index + 1}`} />
  ), [getUrl]);

  // PORTAL 1: Loading State
  if (isLoadingProgress) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center" style={{ width: '100vw', height: '100dvh' }}>
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
      </div>,
      document.body
    );
  }

  // PORTAL 2: Reader Content
  const readerContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden flex flex-col font-sans"
      style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh' }}
    >
      <style>{`
        /* AGGRESSIVELY hide global hamburger when reader is open */
        button[aria-label="Open Menu"] { 
            display: none !important; 
            opacity: 0 !important; 
            pointer-events: none !important; 
            visibility: hidden !important; 
        }

        @keyframes slide-right-fade { 0% { opacity: 0; transform: translateX(-10px); } 100% { opacity: 1; transform: translateX(0); } }
        .animate-slide-right-fade { animation: slide-right-fade 0.3s ease-out forwards; }
        
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>

      {/* --- NOTIFICATION COMPONENTS --- */}
      <QuickReactToast toastConfig={qr.toastConfig} />
      
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        series={fallbackSeries} 
        chapter={fallbackChapter}
        currentUser={{ id: currentUser?.id }}
      />

      <QuickReactDrawer
        showAllReacts={qr.showAllReacts}
        setShowAllReacts={qr.setShowAllReacts}
        localComments={qr.localComments}
        setCurrentPage={setCurrentPage}
        handleReportReact={qr.reportReact}
        reportedReacts={qr.reportedReacts}
      />

      {mode === 'horizontal' && (
        <div 
          className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#0a0a0a] flex items-center justify-center touch-none select-none"
          onTouchStartCapture={handleTouchStart}
          onTouchMoveCapture={handleTouchMove}
          onTouchEndCapture={handleTouchEnd}
          onMouseDownCapture={handleTouchStart}
          onMouseMoveCapture={handleTouchMove}
          onMouseUpCapture={handleTouchEnd}
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isAnimatingPage ? 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
          }}
        >
          {pages[currentPage] ? (
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
              limitToBounds={true}
              doubleClick={{ step: 2 }}
              panning={{ disabled: currentScaleRef.current <= 1.05 }}
              onTransformed={(ref) => { currentScaleRef.current = ref.state.scale; }}
            >
              {() => (
                <div className="w-full h-full relative">
                  <TransformComponent 
                    wrapperStyle={{ width: '100vw', height: '100dvh' }}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MemoizedHorizontalImage src={getUrl(pages[currentPage])} alt={`Page ${currentPage + 1}`} />
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          ) : (
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          )}
        </div>
      )}

      {mode === 'vertical' && (
        <div 
          className="absolute inset-0 w-full h-full select-none overflow-x-hidden bg-[#0a0a0a] z-0" 
          onClick={toggleUI}
          style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh' }}
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

      <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-full px-4 py-2 z-50 flex flex-col items-end pointer-events-none transition-all duration-300 shadow-xl ${isUIVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
        <span className="text-white/90 text-[10px] font-bold tracking-wider">{title || 'Reading'}</span>
        <span className="text-[#fe9a00] text-[9px] font-black uppercase tracking-widest mt-0.5">Page {currentPage + 1} / {pages.length}</span>
      </div>

      {mode === 'vertical' && (
        <div 
          className={`absolute top-2 bottom-2 left-2 sm:top-3 sm:bottom-3 sm:left-3 w-12 sm:w-14 flex flex-col items-center py-2 z-50 transition-transform duration-300 ${isUIVisible ? 'translate-x-0' : '-translate-x-[200%]'}`}
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex flex-col items-center w-full">
            <button onClick={handleClose} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg hover:bg-[#fe9a00] hover:text-black rounded-full transition-colors text-white" title="Back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex-1 w-full my-6 relative flex justify-center group" onClick={handleVerticalProgressClick}>
            <div className="absolute inset-y-0 -inset-x-4 cursor-pointer z-10" />
            <div className="w-1.5 h-full bg-black/40 backdrop-blur-md rounded-full overflow-hidden relative pointer-events-none shadow-inner border border-white/5">
              <div className="absolute top-0 left-0 w-full bg-[#fe9a00] transition-all duration-300" style={{ height: `${progressPercentage}%` }} />
            </div>

            <QuickReactTimeline 
              mode={mode}
              localComments={qr.localComments}
              maxPage={maxPage}
              currentPage={currentPage}
              activeCommentIndex={qr.activeCommentIndex}
              onOpenDrawer={() => qr.setShowAllReacts(true)}
            />
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <button onClick={() => setMode('horizontal')} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Switch to Horizontal Reader">
              <MoveHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            <button onClick={() => setShowShareModal(true)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Share Page">
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>

            <QuickReactViewAllButton setShowAllReacts={qr.setShowAllReacts} />

            {currentUser?.id && pages[currentPage] && (
              <div className="scale-75 sm:scale-90 drop-shadow-md">
                <HypeButton targetType="page" targetId={getId(pages[currentPage])} userId={currentUser.id} variant="icon" />
              </div>
            )}

            <QuickReactToggleButton isReactInputOpen={qr.isReactInputOpen} setIsReactInputOpen={qr.setIsReactInputOpen} />
          </div>
        </div>
      )}

      {mode === 'horizontal' && (
        <div 
          className={`absolute left-2 right-2 sm:left-3 sm:right-3 h-12 sm:h-14 flex flex-row items-center z-50 transition-transform duration-300 ${isUIVisible ? 'translate-y-0' : 'translate-y-[200%]'}`}
          style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex flex-row items-center">
            <button onClick={handleClose} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg hover:bg-[#fe9a00] hover:text-black rounded-full transition-colors text-white" title="Back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex-1 h-full mx-4 sm:mx-6 relative flex items-center group" onClick={handleHorizontalProgressClick}>
            <div className="absolute inset-x-0 -inset-y-4 cursor-pointer z-10" />
            <div className="w-full h-1.5 bg-black/40 backdrop-blur-md rounded-full overflow-hidden relative pointer-events-none shadow-inner border border-white/5">
              <div className="absolute top-0 left-0 h-full bg-[#fe9a00] transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
            </div>

            <QuickReactTimeline 
              mode={mode}
              localComments={qr.localComments}
              maxPage={maxPage}
              currentPage={currentPage}
              activeCommentIndex={qr.activeCommentIndex}
              onOpenDrawer={() => qr.setShowAllReacts(true)}
            />
          </div>

          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <button onClick={() => setMode('vertical')} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Switch to Vertical Scroll">
              <MoveVertical className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            <button onClick={() => setShowShareModal(true)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Share Page">
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>

            <QuickReactViewAllButton setShowAllReacts={qr.setShowAllReacts} />

            {currentUser?.id && pages[currentPage] && (
              <div className="scale-75 sm:scale-90 drop-shadow-md">
                <HypeButton targetType="page" targetId={getId(pages[currentPage])} userId={currentUser.id} variant="icon" />
              </div>
            )}

            <QuickReactToggleButton isReactInputOpen={qr.isReactInputOpen} setIsReactInputOpen={qr.setIsReactInputOpen} />
          </div>
        </div>
      )}

      <div 
        className={`absolute z-[110] flex w-[calc(100%-16px)] sm:w-full max-w-sm pointer-events-none transition-all duration-300 ${mode === 'vertical' ? 'bottom-4 left-16 sm:left-20 justify-start' : 'bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 justify-center'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {qr.isReactInputOpen && isUIVisible && (
           <QuickReactInputOverlay
             isReactInputOpen={qr.isReactInputOpen} 
             setIsReactInputOpen={qr.setIsReactInputOpen}
             reactText={qr.reactText}
             setReactText={qr.setReactText}
             submitReact={qr.submitReact}
             isPremium={internalIsPremium}
             onNavigate={onNavigate}
           />
        )}
      </div>
    </div>
  );

  return createPortal(readerContent, document.body);
};