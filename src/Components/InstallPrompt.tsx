import React, { useState, useEffect } from 'react';
import { Download, X, Laptop, Smartphone, Share } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).deferredPrompt || null);
  const [isVisible, setIsVisible] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const isStandalone = 
      localStorage.getItem('am_pwa_installed') === 'true' ||
      window.matchMedia('(display-mode: standalone)').matches || 
      ('standalone' in navigator && Boolean((navigator as any).standalone)) ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    const dismissedAt = localStorage.getItem('am_install_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);

    if (isIOSDevice) {
      setDeviceType('ios');
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    } else if (isAndroidDevice) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    if ((window as any).deferredPrompt) {
      localStorage.removeItem('am_pwa_installed');
      setDeferredPrompt((window as any).deferredPrompt);
      setIsVisible(true);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      localStorage.removeItem('am_pwa_installed');
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleCustomReady = () => {
      if ((window as any).deferredPrompt) {
        localStorage.removeItem('am_pwa_installed');
        setDeferredPrompt((window as any).deferredPrompt);
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      localStorage.setItem('am_pwa_installed', 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-install-ready', handleCustomReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-install-ready', handleCustomReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;
    if (!activePrompt) return;
    await activePrompt.prompt();
    const { outcome } = await activePrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('am_pwa_installed', 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('am_install_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[6000] animate-fade-in-up">
      <div className="bg-zinc-950 border border-[#fe9a00]/60 p-4 sm:p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] flex flex-col gap-3 max-w-[300px] backdrop-blur-xl">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center shrink-0">
              {deviceType === 'desktop' ? (
                <Laptop className="w-4 h-4 text-[#fe9a00]" />
              ) : (
                <Smartphone className="w-4 h-4 text-[#fe9a00]" />
              )}
            </div>
            <div>
              <h3 className="text-white font-black italic uppercase tracking-wider text-xs leading-tight">
                Install Saturday AM
              </h3>
              <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest block mt-0.5">
                Faster & Fullscreen
              </span>
            </div>
          </div>

          <button 
            onClick={handleDismiss} 
            className="text-zinc-500 hover:text-white p-1 rounded-full transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {deviceType === 'ios' ? (
          <p className="text-zinc-400 text-[10px] font-bold leading-relaxed bg-black/50 p-2.5 rounded-lg border border-zinc-800">
            Tap the <Share className="w-3 h-3 inline pb-0.5 text-white" /> <strong className="text-white">Share</strong> button in Safari, then tap <strong className="text-[#fe9a00]">"Add to Home Screen"</strong>.
          </p>
        ) : (
          <button 
            onClick={handleInstallClick} 
            className="w-full bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Install App
          </button>
        )}
      </div>
    </div>
  );
};