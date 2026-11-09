import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useHypeEconomy } from '../HypeEconomyContext';

const HYPE_FLAME_URL =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png';
const fullIconUrl =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';
const iconMaskStyle: React.CSSProperties = {
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
  const { hypesRemaining, vaultedHypes, rolloverCap } = useHypeEconomy();
  const [isHidden, setIsHidden] = useState(false);
  const [overlayCount, setOverlayCount] = useState(0);
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
    const handleOverlayToggle = (e: any) =>
      setOverlayCount(prev => Math.max(0, prev + (e.detail ? 1 : -1)));

    window.addEventListener('readerToggled', handleReaderToggle);
    window.addEventListener('appOverlayActive', handleOverlayToggle);

    return () => {
      window.removeEventListener('readerToggled', handleReaderToggle);
      window.removeEventListener('appOverlayActive', handleOverlayToggle);
    };
  }, []);

  if (isHidden || overlayCount > 0 || !resolvedUser) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[340px] sm:max-w-[400px] z-[150] pointer-events-none flex justify-start gap-1.5">
      {/* ACTIVE WEEKLY HYPES (ORANGE) */}
      <div
        className="relative pointer-events-auto bg-zinc-950 border border-[#fe9a00] backdrop-blur-md px-2.5 py-1 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.9)] flex items-center gap-1.5 transition-all hover:bg-black ml-2 sm:-ml-2 mb-1"
        title={`Active Weekly Hypes: ${hypesRemaining}/${rolloverCap} (Spent First)`}
      >
        <img
          src={HYPE_FLAME_URL}
          alt="Hype"
          className="w-3.5 h-3.5 object-contain animate-pulse drop-shadow-[0_0_5px_rgba(254,154,0,0.8)]"
          style={{ filter: 'url(#hype-flame-color)' }}
        />
        <span className="text-white font-black text-[11px] leading-none pt-0.5 tracking-wider">
          {hypesRemaining}
        </span>
      </div>

      {/* VAULTED GOLD HYPES (METALLIC GOLD - UNCAPPED & PERMANENT) */}
      {vaultedHypes > 0 && (
        <div
          className="relative pointer-events-auto bg-gradient-to-r from-amber-950/95 via-yellow-900/60 to-amber-950/95 border border-yellow-300 backdrop-blur-md px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.35)] flex items-center gap-1.5 mb-1"
          title="Vaulted Gold Hypes (Uncapped & Never Expire!)"
        >
          <div
            className="w-3.5 h-3.5 bg-gradient-to-t from-amber-400 via-yellow-200 to-white drop-shadow-[0_0_5px_rgba(253,224,71,0.9)]"
            style={iconMaskStyle}
          />
          <span className="text-yellow-200 font-black text-[11px] leading-none pt-0.5 tracking-wider">
            +{vaultedHypes}
          </span>
        </div>
      )}
    </div>
  );
};