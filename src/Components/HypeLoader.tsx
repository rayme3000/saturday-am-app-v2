import React from 'react';

const HYPE_FLAME_URL = "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png";

export const HypeLoader = ({ 
  text, 
  className = "w-28 h-28 sm:w-32 sm:h-32",
  fullScreen = true 
}: { 
  text?: string; 
  className?: string;
  fullScreen?: boolean;
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* SVG Color Filter: Remaps black to #fe9a00 while keeping 'AM' pure white */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <filter id="hype-flame-color" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.004  0      0      0.996  0
              0      0.396  0      0.604  0
              0      0      1      0      0
              0      0      0      1      0"
          />
        </filter>
      </svg>

      <div className="relative flex items-center justify-center animate-hype-glow">
        <img 
          src={HYPE_FLAME_URL} 
          alt="Saturday AM Loading" 
          className={`${className} object-contain`}
          style={{ filter: 'url(#hype-flame-color)' }}
        />
      </div>

      {text && (
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};