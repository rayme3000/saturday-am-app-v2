import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if the app is already installed (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
    if (isStandalone) return; 

    // 2. Detect iOS Devices (Apple does not support automatic install prompts)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Delay the iOS prompt slightly so it doesn't aggressively pop up instantly
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // 3. Handle Android/PC (Supports automatic install prompts)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); 
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Failsafe: Catch the event if it fired globally before React mounted
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setIsVisible(true);
    }

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to accept or dismiss
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    
    // The prompt can only be used once, so clear it
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-8 z-[5000] animate-fade-in-up">
      <div className="bg-zinc-900 border border-[#fe9a00] p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-3 max-w-[280px]">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-white font-black italic uppercase tracking-wider leading-tight">Install Saturday AM</h3>
            {isIOS ? (
              <p className="text-zinc-400 text-[10px] font-bold mt-1 leading-relaxed">
                To install on iOS, tap the <strong className="text-white">Share</strong> icon at the bottom of Safari, then select <strong className="text-white">"Add to Home Screen"</strong>.
              </p>
            ) : (
              <p className="text-zinc-400 text-[10px] font-bold mt-1 leading-relaxed">
                Get the app on your home screen for faster reading and full-screen mode.
              </p>
            )}
          </div>
          <button onClick={() => setIsVisible(false)} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {!isIOS && deferredPrompt && (
          <button 
            onClick={handleInstallClick} 
            className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-2.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-2 text-[10px]"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
        )}
      </div>
    </div>
  );
};