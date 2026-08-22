import React, { useState } from 'react';

export const SplashIntro = ({ onComplete }: { onComplete: () => void }) => {
  const [isFading, setIsFading] = useState(false);

  const handleFinish = () => {
    setIsFading(true);
    // Wait for the fade-out CSS animation to finish before removing the component
    setTimeout(() => {
      onComplete();
    }, 800); 
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-800 ease-in-out ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/app%20splash%20intro.mp4" 
        autoPlay
        muted={true}
        playsInline
        onEnded={handleFinish}
        className="w-full h-full object-contain md:object-cover"
      />
      
      <button 
        onClick={handleFinish}
        className="absolute top-6 right-6 md:top-10 md:right-10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] z-10 transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm"
      >
        Skip
      </button>
    </div>
  );
};