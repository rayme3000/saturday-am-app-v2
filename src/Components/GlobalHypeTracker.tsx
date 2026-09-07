import React, { useState, useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { supabase } from '../supabase';

export const GlobalHypeTracker = ({ currentUser }: { currentUser?: any }) => {
  const [isHidden, setIsHidden] = useState(false);
  const [overlayCount, setOverlayCount] = useState(0);
  const [localHypes, setLocalHypes] = useState(0);
  
  // Fallback state to fetch the user independently if the prop is lost in the layout tree
  const [resolvedUser, setResolvedUser] = useState<any>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setResolvedUser(currentUser);
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setResolvedUser(data.user);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const handleReaderToggle = (e: any) => setIsHidden(e.detail?.isOpen);
    const handleOverlayToggle = (e: any) => setOverlayCount(prev => Math.max(0, prev + (e.detail ? 1 : -1)));
    
    window.addEventListener('readerToggled', handleReaderToggle);
    window.addEventListener('appOverlayActive', handleOverlayToggle);
    
    return () => {
      window.removeEventListener('readerToggled', handleReaderToggle);
      window.removeEventListener('appOverlayActive', handleOverlayToggle);
    }
  }, []);

  const syncEconomy = useCallback(async () => {
    if (!resolvedUser?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('hypes_remaining, last_hype_refill, is_premium')
      .eq('id', resolvedUser.id)
      .single();
      
    if (!profile) return;

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
      }).eq('id', resolvedUser.id);

      setLocalHypes(newHypes);
    } else {
      setLocalHypes(profile.hypes_remaining || 0);
    }
  }, [resolvedUser?.id]);

  useEffect(() => {
    syncEconomy();
    // Listen for anywhere in the app that spends a hype to re-sync
    window.addEventListener('profileUpdated', syncEconomy);
    return () => window.removeEventListener('profileUpdated', syncEconomy);
  }, [syncEconomy]);

  // Completely unmount if the reader is open OR if a modal/menu is open
  if (isHidden || overlayCount > 0 || !resolvedUser) return null;

  return (
    // Wrapper locked to the exact width and position of the global nav pill. 
    // Z-index lowered to 150 to sit above page content but below modals.
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[340px] sm:max-w-[400px] z-[150] pointer-events-none flex justify-start">
      
      {/* The compact, sleek badge anchored to the top left with a persistent gold border */}
      <div 
        className="relative pointer-events-auto bg-zinc-950 border border-[#fe9a00] backdrop-blur-md px-2.5 py-1 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.9)] flex items-center gap-1.5 transition-all hover:bg-black ml-2 sm:-ml-2 mb-1"
        title="Hypes Remaining"
      >
        <Flame className="w-3.5 h-3.5 text-[#fe9a00] animate-pulse drop-shadow-[0_0_5px_rgba(254,154,0,0.8)]" />
        <span className="text-white font-black text-[11px] leading-none pt-0.5 tracking-wider">{localHypes}</span>
      </div>
      
    </div>
  );
};