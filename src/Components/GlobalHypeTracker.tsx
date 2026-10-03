import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const fullIconUrl = "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png";
const iconMaskStyle = {
  WebkitMaskImage: `url('${fullIconUrl}')`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskImage: `url('${fullIconUrl}')`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center'
};

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
    }
  }, []);

  const syncEconomy = useCallback(async () => {
    if (!resolvedUser?.id) return;

    const [profileRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('hypes_remaining, last_hype_refill, is_premium').eq('id', resolvedUser.id).single(),
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
    ]);
      
    const profile = profileRes.data;
    const appSettings = settingsRes.data || {};

    if (!profile) return;

    const premiumLimit = appSettings.premium_tier_hypes ?? appSettings.premium_hype_allowance ?? 7;
    const freeLimit = appSettings.free_tier_hypes ?? appSettings.free_hype_allowance ?? 1;

    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7;
    const lastSaturday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceSaturday));

    const lastRefill = new Date(profile.last_hype_refill || 0);

    if (lastRefill < lastSaturday) {
      const newHypes = profile.is_premium ? premiumLimit : freeLimit;
      
      const { error } = await supabase.from('profiles').update({
        hypes_remaining: newHypes,
        last_hype_refill: now.toISOString()
      }).eq('id', resolvedUser.id);

      if (!error) {
        setLocalHypes(newHypes);
      } else {
        setLocalHypes(profile.hypes_remaining || 0);
      }
    } else {
      setLocalHypes(profile.hypes_remaining || 0);
    }
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
        <div className="w-3.5 h-3.5 bg-[#fe9a00] animate-pulse drop-shadow-[0_0_5px_rgba(254,154,0,0.8)]" style={iconMaskStyle} />
        <span className="text-white font-black text-[11px] leading-none pt-0.5 tracking-wider">{localHypes}</span>
      </div>
    </div>
  );
};