import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, FileText, X } from 'lucide-react';

export interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  mediaUrl?: string; 
  iconsList?: {
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[];
}

interface FeatureTutorialModalProps {
  tutorialId: string; 
  slides: TutorialSlide[];
  forceOpen?: boolean; 
  onClose?: () => void;
}

export const FeatureTutorialModal = ({ tutorialId, slides, forceOpen = false, onClose }: FeatureTutorialModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(`am_tutorial_${tutorialId}`);
    if (!hasSeenTutorial || forceOpen) {
      setIsOpen(true);
      setCurrentSlide(0);
    }
  }, [tutorialId, forceOpen]);

  // Stop propagation on close to prevent bubbling to parent wrappers
  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    localStorage.setItem(`am_tutorial_${tutorialId}`, 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlide === slides.length - 1) {
      handleClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  if (!isOpen || slides.length === 0) return null;

  const slide = slides[currentSlide];
  
  // Safely check for video only if mediaUrl actually exists
  const isVideo = slide?.mediaUrl ? (slide.mediaUrl.endsWith('.mp4') || slide.mediaUrl.endsWith('.webm')) : false;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 pb-32 md:p-6 md:pb-6 animate-fade-in overflow-y-auto"
      onClick={(e) => e.stopPropagation()} 
      onPointerDown={(e) => e.stopPropagation()}
    >
      
      <div className="relative w-full max-w-5xl h-[70vh] md:h-auto md:aspect-[21/9] bg-zinc-950 flex flex-col md:flex-row overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl md:rounded-2xl shrink-0 my-auto">
        
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-50 p-2 bg-black/60 backdrop-blur-md border border-zinc-700 rounded-full text-zinc-400 hover:text-white hover:bg-black hover:border-[#fe9a00] transition-colors shadow-lg cursor-pointer"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <div className="w-full md:w-[45%] h-[35%] md:h-full bg-gradient-to-r from-zinc-900 to-zinc-900/95 p-6 md:p-12 flex flex-col justify-center z-10 shrink-0">
          <div className="flex items-center gap-3 mb-3 md:mb-6 pr-10">
            <FileText className="w-5 h-5 md:w-8 md:h-8 text-white shrink-0" />
            <h2 className="text-lg md:text-3xl font-black italic uppercase text-white tracking-wide leading-tight">{slide.title}</h2>
          </div>
          <div className="w-12 h-1 bg-[#fe9a00] mb-3 md:mb-6 shrink-0" />
          <p className="text-xs md:text-base text-zinc-300 leading-relaxed font-medium overflow-y-auto pr-2 custom-scrollbar">
            {slide.description}
          </p>
        </div>

        <div className="w-full md:w-[55%] h-[65%] md:h-full relative bg-black shrink-0 flex items-center justify-center p-4 md:p-8">
          {slide.iconsList ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 w-full max-w-xl h-full md:h-auto overflow-y-auto pr-2 custom-scrollbar content-start md:content-center">
              {slide.iconsList.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-[#fe9a00]/50 transition-colors shadow-lg">
                  <div className="p-3 bg-zinc-900 border border-[#fe9a00]/30 rounded-xl shadow-[0_0_15px_rgba(254,154,0,0.15)] text-[#fe9a00] shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col pt-1">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs md:text-sm mb-1 leading-tight">{item.title}</h4>
                    <p className="text-zinc-400 text-[10px] font-bold leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : isVideo && slide.mediaUrl ? (
            <video 
              src={slide.mediaUrl} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-contain object-center"
            />
          ) : slide.mediaUrl ? (
            <img 
              src={slide.mediaUrl} 
              alt={slide.title} 
              className="absolute inset-0 w-full h-full object-contain object-center"
              onError={(e) => { e.currentTarget.src = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'; }}
            />
          ) : null}

          {!slide.iconsList && <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-900/95 to-transparent hidden md:block pointer-events-none z-10" />}
        </div>
      </div>

      <div className="flex flex-col items-center mt-4 md:mt-6 gap-3 md:gap-4 w-full max-w-5xl shrink-0 pb-4">
        <div className="flex items-center justify-between w-full px-4 md:px-32">
          <button 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800/80 border border-zinc-600 text-white disabled:opacity-30 hover:bg-zinc-700 transition-colors backdrop-blur-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="flex items-center gap-3">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-[#fe9a00] scale-125 shadow-[0_0_10px_rgba(254,154,0,0.8)]' : 'bg-zinc-600'}`}
              />
            ))}
          </div>

          <button 
            onClick={nextSlide}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800/80 border border-zinc-600 text-white hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-colors backdrop-blur-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <span className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1 md:mt-2">
          {currentSlide === slides.length - 1 ? 'Click next to close' : 'Turn the page to continue'}
        </span>
      </div>

    </div>
  );
};

export const TutorialHelpButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    className="p-1.5 md:p-2 bg-zinc-900/60 backdrop-blur-md border border-zinc-700 rounded-full text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors shadow-lg cursor-pointer"
    title="View Tutorial"
  >
    <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
  </button>
);