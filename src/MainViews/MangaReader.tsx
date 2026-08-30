import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, SkipForward, RotateCcw, MoveHorizontal, MoveVertical, Share2, X, Info, Heart } from 'lucide-react';
import { supabase } from '../supabase';
import { Virtuoso } from 'react-virtuoso';
import { HypeButton } from '../Components/HypeButton';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ShareModal } from '../Components/ShareModal';
import { 
  useQuickReacts, QuickReactDrawer, QuickReactTimeline, 
  QuickReactToggleButton, QuickReactViewAllButton, QuickReactInputOverlay, QuickReactToast 
} from '../Components/QuickReacts';

const renderContentWithLinks = (text: string) => {
  if (!text) return null;
  const splitRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const matchRegex = /^(?:https?:\/\/|www\.)[^\s]+$/;
  const parts = text.split(splitRegex);
  return parts.map((part, i) => {
    if (matchRegex.test(part)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a 
          key={i} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#fe9a00] hover:text-white underline font-black transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()} 
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const MemoizedVerticalPage = React.memo(({ src, alt, pageIndex, pageHotspots, onHotspotClick, onShareZoneClick }: any) => (
  <div className="w-full flex justify-center bg-[#0a0a0a] m-0 p-0">
    <div className="relative w-full max-w-3xl">
      <img src={src} className="w-full h-auto block pointer-events-none m-0 p-0" alt={alt} loading="lazy" />
      {pageHotspots?.map((h: any) => {
        if (h.icon_type === 'share') {
           return (
             <button
                key={h.id}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShareZoneClick(h.content); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="hotspot-button absolute w-5 h-5 sm:w-6 sm:h-6 -ml-2.5 -mt-2.5 sm:-ml-3 sm:-mt-3 bg-black border-[1.5px] border-red-500 rounded-full flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(239,68,68,0.6)] z-[200] hover:scale-110 transition-transform p-1 cursor-pointer pointer-events-auto"
                style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
              >
                <Share2 className="w-3 h-3 text-red-500 pointer-events-none" />
             </button>
           );
        }
        return (
          <button
            key={h.id}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHotspotClick(h); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="hotspot-button absolute w-5 h-5 sm:w-6 sm:h-6 -ml-2.5 -mt-2.5 sm:-ml-3 sm:-mt-3 bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite] border border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.6)] z-[200] hover:scale-110 transition-transform p-1 cursor-pointer pointer-events-auto"
            style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
          >
            <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" alt="AM Behind the Pages" className="w-full h-full object-contain drop-shadow-md pointer-events-none" />
          </button>
        );
      })}
    </div>
  </div>
));

const MemoizedHorizontalImage = React.memo(({ src, alt, pageHotspots, onHotspotClick, onShareZoneClick }: any) => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative inline-flex max-w-[100vw] max-h-[100dvh]">
      <img src={src} className="w-auto h-auto max-w-[100vw] max-h-[100dvh] object-contain pointer-events-none block" alt={alt} />
      {pageHotspots?.map((h: any) => {
        if (h.icon_type === 'share') {
           return (
             <button
                key={h.id}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShareZoneClick(h.content); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="hotspot-button absolute w-5 h-5 sm:w-6 sm:h-6 -ml-2.5 -mt-2.5 sm:-ml-3 sm:-mt-3 bg-black border-[1.5px] border-red-500 rounded-full flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(239,68,68,0.6)] z-[200] hover:scale-110 transition-transform p-1 cursor-pointer pointer-events-auto"
                style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
              >
                <Share2 className="w-3 h-3 text-red-500 pointer-events-none" />
             </button>
           );
        }
        return (
          <button
            key={h.id}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHotspotClick(h); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="hotspot-button absolute w-5 h-5 sm:w-6 sm:h-6 -ml-2.5 -mt-2.5 sm:-ml-3 sm:-mt-3 bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite] border border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.6)] z-[200] hover:scale-110 transition-transform p-1 cursor-pointer pointer-events-auto"
            style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
          >
            <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" alt="AM Behind the Pages" className="w-full h-full object-contain drop-shadow-md pointer-events-none" />
          </button>
        );
      })}
    </div>
  </div>
));

export const MangaReader = ({ pages = [], onClose, chapterId, onHypeUpdate, onHome, onNext, hasNext, title, subtitle, userId, isPremium, initialPage = 0, onNavigate, series, chapter, onSupportCreator }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal'); 
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHideHint, setShowHideHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargetImage, setShareTargetImage] = useState<string | null>(null);
  
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [internalIsPremium, setInternalIsPremium] = useState(isPremium);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingPage, setIsAnimatingPage] = useState(false);

  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const showEndPromptRef = useRef(showEndPrompt);

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<any | null>(null);

  const transformRef = useRef<any>(null);
  const currentPageRef = useRef(currentPage);
  const activeUserRef = useRef(userId || currentUser?.id);
  const isComponentMounted = useRef(true);
  
  const lastNavTime = useRef(0);
  
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchCurrentPos = useRef({ x: 0, y: 0 });
  const currentScaleRef = useRef(1);

  const getUrl = useCallback((p: any) => p?.image_url || p, []);

  const qr = useQuickReacts(chapterId, currentPage, currentUser);

  const fallbackSeries = series || { 
    title: subtitle || 'Saturday AM Series', 
    slug: subtitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '' 
  };
  const fallbackChapter = chapter || { 
    chapter_number: title?.match(/\d+/)?.[0] || '1' 
  };

  useEffect(() => {
    if (!chapterId) return;
    const fetchHotspots = async () => {
      const { data, error } = await supabase.from('page_hotspots').select('*').eq('chapter_id', chapterId);
      if (data && !error) setHotspots(data);
    };
    fetchHotspots();
  }, [chapterId]);

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
    
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;

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
    
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;

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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isAnimatingPage) return;
    if (document.elementsFromPoint(e.clientX, e.clientY).some(el => el.classList.contains('hotspot-button'))) return;
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    touchCurrentPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  }, [isAnimatingPage]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || currentScaleRef.current > 1.05 || isAnimatingPage) return;
    touchCurrentPos.current = { x: e.clientX, y: e.clientY };
    const deltaX = e.clientX - touchStartPos.current.x;
    const deltaY = Math.abs(e.clientY - touchStartPos.current.y);
    if (Math.abs(deltaX) > deltaY) setDragOffset(deltaX);
  }, [isDragging, isAnimatingPage]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (document.elementsFromPoint(e.clientX, e.clientY).some(el => el.classList.contains('hotspot-button'))) {
      setIsDragging(false);
      return;
    }

    if (!isDragging) return;
    setIsDragging(false);

    const deltaX = e.clientX - touchStartPos.current.x;
    const deltaY = Math.abs(e.clientY - touchStartPos.current.y);

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

  const handleHorizontalProgressClick = useCallback((e: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left; 
    const percentage = clickX / rect.width;
    const newPage = Math.round(percentage * maxPage);
    setCurrentPage(Math.max(0, Math.min(newPage, maxPage)));
  }, [maxPage]);

  const handleShareZoneClick = useCallback((imageUrl: string) => {
    setShareTargetImage(imageUrl);
    setShowShareModal(true);
  }, []);

  const virtuosoItemContent = useCallback((index: number, pageData: any) => {
    const pageHotspots = hotspots.filter(h => h.page_index === index);
    return (
      <MemoizedVerticalPage 
        src={getUrl(pageData)} 
        alt={`Page ${index + 1}`} 
        pageIndex={index}
        pageHotspots={pageHotspots}
        onHotspotClick={setActiveHotspot}
        onShareZoneClick={handleShareZoneClick}
      />
    );
  }, [getUrl, hotspots, handleShareZoneClick]);

  if (isLoadingProgress) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center" style={{ width: '100vw', height: '100dvh' }}>
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
      </div>,
      document.body
    );
  }

  const currentPageHotspots = hotspots.filter(h => h.page_index === currentPage);

  // --- THE NEW END-OF-CHAPTER COMPONENT EXTRACTED FOR REUSE ---
  const EndOfChapterPrompt = () => (
    <div className="flex flex-col gap-3 w-full" onClick={(e) => e.stopPropagation()}>
      
      {/* 1. HYPE THE CHAPTER */}
      {currentUser?.id && (
        <div className="w-full mb-2">
          <HypeButton 
            targetType="chapter" 
            targetId={chapterId} 
            seriesSlug={fallbackSeries.slug}
            userId={currentUser.id} 
            initialCount={0} 
            variant="default" // Using the full-width pill variant
            onRequireAuth={() => alert("Create a Free Account to hype chapters!")} 
            onToggle={(isHyped: boolean) => { if(onHypeUpdate) onHypeUpdate(chapterId, isHyped); }} 
          />
        </div>
      )}

      {/* 2. READ NEXT */}
      {hasNext && (
        <button onClick={handleNextChapter} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2">
          Read Next <SkipForward className="w-5 h-5" />
        </button>
      )}

      {/* 3. SUPPORT CREATOR */}
      <button onClick={onSupportCreator} className="w-full bg-[#fe9a00]/10 border border-[#fe9a00]/50 text-[#fe9a00] font-black uppercase tracking-widest py-4 rounded-full hover:bg-[#fe9a00] hover:text-black transition-colors flex items-center justify-center gap-2">
        <Heart className="w-5 h-5" /> Support the Creator
      </button>

      {/* 4. BACK TO SERIES */}
      <button onClick={handleClose} className="w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
        <ArrowLeft className="w-5 h-5" /> Back to Series
      </button>
    </div>
  );

  const readerContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden flex flex-col font-sans"
      style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh' }}
    >
      <style>{`
        button[aria-label="Open Menu"] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }
        @keyframes slide-right-fade { 0% { opacity: 0; transform: translateX(-10px); } 100% { opacity: 1; transform: translateX(0); } }
        .animate-slide-right-fade { animation: slide-right-fade 0.3s ease-out forwards; }
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>

      {/* --- HOTSPOT MODAL --- */}
      {activeHotspot && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in pointer-events-auto" onClick={(e) => { e.stopPropagation(); setActiveHotspot(null); }}>
          <div className="bg-zinc-900 border border-zinc-700 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveHotspot(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors hidden sm:block">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.2)] p-1.5 shrink-0">
                <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain" alt="Footprint" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase text-[#fe9a00] tracking-tighter pr-6 leading-tight">
                Behind the Pages
              </h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed font-medium whitespace-pre-wrap select-text flex-1 overflow-y-auto max-h-[40vh]">
              {renderContentWithLinks(activeHotspot.content)}
            </p>
            <button onClick={() => setActiveHotspot(null)} className="mt-6 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors sm:hidden">
              Close Detail
            </button>
          </div>
        </div>
      )}

      <QuickReactToast toastConfig={qr.toastConfig} />
      
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => { setShowShareModal(false); setShareTargetImage(null); }} 
        series={fallbackSeries} 
        chapter={fallbackChapter}
        currentUser={{ id: currentUser?.id }}
        targetImage={shareTargetImage}
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
          onPointerDownCapture={handlePointerDown}
          onPointerMoveCapture={handlePointerMove}
          onPointerUpCapture={handlePointerUp}
          onPointerCancelCapture={handlePointerUp}
          style={{ transform: `translateX(${dragOffset}px)`, transition: isAnimatingPage ? 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)' : 'none' }}
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
                    <MemoizedHorizontalImage 
                      src={getUrl(pages[currentPage])} 
                      alt={`Page ${currentPage + 1}`} 
                      pageHotspots={currentPageHotspots}
                      onHotspotClick={setActiveHotspot}
                      onShareZoneClick={handleShareZoneClick}
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

      {mode === 'vertical' && (
        <div 
          className="absolute inset-0 w-full h-full select-none overflow-x-hidden bg-[#0a0a0a] z-0" 
          onClick={(e) => {
             if (document.elementsFromPoint(e.clientX, e.clientY).some(el => el.classList.contains('hotspot-button'))) return;
             toggleUI();
          }}
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
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-6">End of Chapter</h2>
                  <EndOfChapterPrompt />
                </div>
              )
            }}
          />
        </div>
      )}

      {showEndPrompt && mode === 'horizontal' && (
        <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-6">End of Chapter</h2>
          <div className="flex flex-col gap-4 w-full max-w-sm mt-4">
            <EndOfChapterPrompt />
            <button onClick={() => setShowEndPrompt(false)} className="mt-4 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">
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

      <div 
        className={`absolute left-2 right-2 sm:left-4 sm:right-4 h-12 sm:h-14 flex flex-row items-center z-50 transition-transform duration-300 ${isUIVisible ? 'translate-y-0' : 'translate-y-[200%]'}`}
        style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex flex-row items-center">
          <button onClick={handleClose} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg hover:bg-[#fe9a00] hover:text-black rounded-full transition-colors text-white" title="Back">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 h-full mx-4 sm:mx-6 relative flex items-center group cursor-pointer" onClick={handleHorizontalProgressClick}>
          <div className="absolute inset-x-0 -inset-y-4 z-10" />
          <div className="w-full h-1.5 bg-black/40 backdrop-blur-md rounded-full overflow-hidden relative pointer-events-none shadow-inner border border-white/5">
            <div className="absolute top-0 left-0 h-full bg-[#fe9a00] transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
          </div>
          <QuickReactTimeline mode="horizontal" localComments={qr.localComments} maxPage={maxPage} currentPage={currentPage} activeCommentIndex={qr.activeCommentIndex} onOpenDrawer={() => qr.setShowAllReacts(true)} />
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <button onClick={() => setMode(mode === 'vertical' ? 'horizontal' : 'vertical')} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title={mode === 'vertical' ? "Switch to Horizontal" : "Switch to Vertical Scroll"}>
            {mode === 'vertical' ? <MoveHorizontal className="w-3 h-3 sm:w-4 sm:h-4" /> : <MoveVertical className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
          <button onClick={() => setShowShareModal(true)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="Share Page">
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          <QuickReactViewAllButton setShowAllReacts={qr.setShowAllReacts} />
          
          <QuickReactToggleButton isReactInputOpen={qr.isReactInputOpen} setIsReactInputOpen={qr.setIsReactInputOpen} />
        </div>
      </div>

      <div 
        className="absolute z-[110] flex w-[calc(100%-16px)] sm:w-full max-w-sm pointer-events-none transition-all duration-300 bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 justify-center" 
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