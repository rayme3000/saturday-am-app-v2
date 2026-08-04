import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show your custom UI
      setIsVisible(true);
    };

    // Listen for the browser telling us the app is installable
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If the app successfully installs, hide the prompt
    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
            <p className="text-zinc-400 text-[10px] font-bold mt-1 leading-relaxed">Get the app on your home screen for faster reading and full-screen mode.</p>
          </div>
          <button onClick={() => setIsVisible(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={handleInstallClick} 
          className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-2.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-2 text-[10px]"
        >
          <Download className="w-4 h-4" /> Install App
        </button>
      </div>
    </div>
  );
};