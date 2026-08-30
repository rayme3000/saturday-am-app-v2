import React, { useState, useEffect } from 'react';
import { Flame, RefreshCw } from 'lucide-react';

export const GlobalHypeTracker = ({ hypesRemaining = 5 }: { hypesRemaining?: number }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleReaderToggle = (e: any) => setIsHidden(e.detail?.isOpen);
    window.addEventListener('readerToggled', handleReaderToggle);

    const calculateTimeUntilSaturday = () => {
      const now = new Date();
      const nextSaturday = new Date();
      
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
      const daysToAdd = daysUntilSaturday === 0 ? 7 : daysUntilSaturday;
      
      nextSaturday.setDate(now.getDate() + daysToAdd);
      nextSaturday.setHours(0, 0, 0, 0);

      const diff = nextSaturday.getTime() - now.getTime();
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);

      return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
    };

    setTimeLeft(calculateTimeUntilSaturday());
    const timer = setInterval(() => setTimeLeft(calculateTimeUntilSaturday()), 60000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('readerToggled', handleReaderToggle);
    };
  }, []);

  if (isHidden) return null;

  return (
    // INVISIBLE GHOST WRAPPER: Lifted mobile bottom offset (5.4rem) to sit perfectly flush
    <div className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[95%] max-w-[340px] sm:max-w-[420px] flex justify-start z-[40] pointer-events-none">
      
      {/* THE TRACKER ITSELF - Increased mobile left-shift (-translate-x-10) to clear the avatar */}
      <div className="relative -translate-x-10 sm:-translate-x-6 flex items-center gap-2 sm:gap-3 bg-zinc-950/95 border border-zinc-800 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full shadow-2xl pointer-events-auto cursor-help group transition-colors hover:border-[#fe9a00]/50 hover:bg-black">
        
        {/* Hype Balance */}
        <div className="flex items-center gap-1 sm:gap-1.5 border-r border-zinc-800 pr-2 sm:pr-3">
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fe9a00] animate-pulse drop-shadow-[0_0_8px_rgba(254,154,0,0.5)]" />
          <div className="flex flex-col">
            <span className="text-white font-black text-[10px] sm:text-[11px] leading-none">{hypesRemaining}</span>
            <span className="text-zinc-500 font-black text-[6px] sm:text-[7px] uppercase tracking-widest leading-none mt-0.5">Left</span>
          </div>
        </div>

        {/* Live Countdown */}
        <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5 sm:pl-1 pr-0.5 sm:pr-1">
          <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600 group-hover:text-white transition-colors" />
          <div className="flex flex-col">
            <span className="text-zinc-500 font-bold text-[7px] sm:text-[8px] uppercase tracking-widest leading-none">Refills in</span>
            <span className="text-[#fe9a00] font-black text-[8px] sm:text-[9px] uppercase tracking-widest leading-none mt-0.5">{timeLeft}</span>
          </div>
        </div>

      </div>
    </div>
  );
};