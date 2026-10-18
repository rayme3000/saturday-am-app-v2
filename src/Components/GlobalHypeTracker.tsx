import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const HYPE_FLAME_URL = "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png";

export const GlobalHypeTracker = ({ currentUser }: { currentUser?: any }) => {
  const [isHidden, setIsHidden] = useState(false);
  const [overlayCount, setOverlayCount] = useState(0);
  const [localHypes, setLocalHypes] = useState(0);
  
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
    };
  }, []);

  const syncEconomy = useCallback(async () => {
    if (!resolvedUser?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('super_hypes_left, hypes_remaining, is_premium')
      .eq('id', resolvedUser.id)
      .maybeSingle();

    if (!profile) return;
    setLocalHypes(profile.super_hypes_left ?? profile.hypes_remaining ?? (profile.is_premium ? 3 : 1));
  }, [resolvedUser?.id]);

  useEffect(() => {
    syncEconomy();
    window.addEventListener('profileUpdated', syncEconomy);
    return () => window.removeEventListener('profileUpdated', syncEconomy);
  }, [syncEconomy]);

  if (isHidden || overlayCount > 0 || !resolvedUser) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[340px] sm:max-w-[400px] z-[150] pointer-events-none flex justify-start">
      <div 
        className="relative pointer-events-auto bg-zinc-950 border border-[#fe9a00] backdrop-blur-md px-2.5 py-1 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.9)] flex items-center gap-1.5 transition-all hover:bg-black ml-2 sm:-ml-2 mb-1"
        title="Hypes Remaining"
      >
        <img 
          src={HYPE_FLAME_URL} 
          alt="Hype" 
          className="w-3.5 h-3.5 object-contain animate-pulse drop-shadow-[0_0_5px_rgba(254,154,0,0.8)]" 
          style={{ filter: 'url(#hype-flame-color)' }}
        />
        <span className="text-white font-black text-[11px] leading-none pt-0.5 tracking-wider">{localHypes}</span>
      </div>
    </div>
  );
};