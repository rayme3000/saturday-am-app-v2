import React, { useState, useEffect } from 'react';
import { Flame, RefreshCw, PlaySquare, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

export const GlobalHypeTracker = ({ currentUser }: { currentUser?: any }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  
  // Local state to instantly update UI without waiting for Supabase
  const [localHypes, setLocalHypes] = useState(0);
  const [adsWatched, setAdsWatched] = useState(0);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const handleReaderToggle = (e: any) => setIsHidden(e.detail?.isOpen);
    window.addEventListener('readerToggled', handleReaderToggle);

    return () => window.removeEventListener('readerToggled', handleReaderToggle);
  }, []);

  // 1. Local Saturday Reset Logic
  useEffect(() => {
    if (!currentUser?.id) return;

    const syncEconomy = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('hypes_remaining, last_hype_refill, ads_watched_this_week, is_premium')
        .eq('id', currentUser.id)
        .single();
        
      if (!profile) return;
      setIsPremium(profile.is_premium);

      const now = new Date();
      // Find the most recent Saturday at 12:00 AM local time
      const lastSaturday = new Date(now);
      lastSaturday.setDate(now.getDate() - ((now.getDay() + 1) % 7));
      lastSaturday.setHours(0, 0, 0, 0);

      const lastRefill = new Date(profile.last_hype_refill || 0);

      // If they haven't been refilled since last Saturday, reset them
      if (lastRefill < lastSaturday) {
        const newHypes = profile.is_premium ? 7 : 1;
        
        await supabase.from('profiles').update({
          hypes_remaining: newHypes,
          ads_watched_this_week: 0,
          last_hype_refill: now.toISOString()
        }).eq('id', currentUser.id);

        setLocalHypes(newHypes);
        setAdsWatched(0);
      } else {
        setLocalHypes(profile.hypes_remaining || 0);
        setAdsWatched(profile.ads_watched_this_week || 0);
      }
    };

    syncEconomy();
  }, [currentUser?.id]);

  // 2. Countdown Timer to Next Saturday
  useEffect(() => {
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
    return () => clearInterval(timer);
  }, []);

  // 3. Simulated Ad Loop
  const handleWatchAd = async () => {
    if (adsWatched >= 2 || isPlayingAd) return;
    
    setIsPlayingAd(true);
    
    // Simulate Applixir 3-second ad delay
    setTimeout(async () => {
      const newHypeCount = localHypes + 1;
      const newAdCount = adsWatched + 1;
      
      // Optimistic UI Update
      setLocalHypes(newHypeCount);
      setAdsWatched(newAdCount);
      setIsPlayingAd(false);

      // Background DB Sync
      await supabase.from('profiles').update({
        hypes_remaining: newHypeCount,
        ads_watched_this_week: newAdCount
      }).eq('id', currentUser.id);
      
    }, 3000);
  };

  if (isHidden || !currentUser) return null;

  return (
    <div className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[95%] max-w-[360px] sm:max-w-[420px] flex justify-start z-[40] pointer-events-none">
      
      <div className="relative flex items-center bg-zinc-950/95 border border-zinc-800 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl pointer-events-auto transition-colors hover:border-[#fe9a00]/50 hover:bg-black">
        
        {localHypes > 0 ? (
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-help">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fe9a00] animate-pulse drop-shadow-[0_0_8px_rgba(254,154,0,0.5)]" />
            <div className="flex flex-col">
              <span className="text-white font-black text-[10px] sm:text-[12px] leading-none">{localHypes}</span>
              <span className="text-zinc-500 font-black text-[6px] sm:text-[7px] uppercase tracking-widest leading-none mt-0.5">Left</span>
            </div>
          </div>
        ) : !isPremium && adsWatched < 2 ? (
          <button 
            onClick={handleWatchAd}
            disabled={isPlayingAd}
            className="flex items-center gap-1.5 sm:gap-2 group disabled:opacity-50"
          >
            {isPlayingAd ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fe9a00] animate-spin" />
            ) : (
              <PlaySquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover:text-white transition-colors" />
            )}
            <div className="flex flex-col text-left">
              <span className="text-white group-hover:text-[#fe9a00] font-black text-[8px] sm:text-[9px] uppercase tracking-widest leading-none transition-colors">
                {isPlayingAd ? 'Playing Ad...' : 'Earn Hype'}
              </span>
              <span className="text-zinc-500 font-bold text-[6px] sm:text-[7px] uppercase tracking-widest leading-none mt-0.5">
                {2 - adsWatched} ads remaining
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-help">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#fe9a00] animate-[spin_3s_linear_infinite] drop-shadow-[0_0_8px_rgba(254,154,0,0.5)]" />
            <div className="flex flex-col">
              <span className="text-zinc-500 font-bold text-[6px] sm:text-[7px] uppercase tracking-widest leading-none">Refills in</span>
              <span className="text-[#fe9a00] font-black text-[8px] sm:text-[9px] uppercase tracking-widest leading-none mt-0.5">{timeLeft}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};