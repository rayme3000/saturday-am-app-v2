import { memo } from 'react';
import { X, CreditCard, ShieldAlert, ExternalLink, Download, User, LogOut } from 'lucide-react';
import { supabase } from '../supabase';

export const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard, userTier, onUpsell, currentUser, canInstall, onInstall, onLoginClick }: any) => {
  if (!isOpen) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const menuItems = [
    { name: 'Browse Library', action: 'browse', prefetch: () => import('../MainViews/Browse.tsx') },
    { name: 'Profile', action: 'profile', prefetch: () => import('../VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Favorites', action: 'faves', prefetch: () => import('../MainViews/MyFaves.tsx') },
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('../VirtualProfile/BingoBook') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    { name: 'Leaderboards', action: 'leaderboard', prefetch: () => import('../MainViews/Leaderboard.tsx') },
    { name: 'Settings', action: 'settings', prefetch: () => import('../MainViews/Settings.tsx') }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      
      <div className="flex-1 flex flex-col justify-start px-8 sm:px-12 gap-5 sm:gap-6 overflow-y-auto pt-8 pb-32 no-scrollbar">
        
        {/* --- DYNAMIC LOGIN/LOGOUT BUTTON --- */}
        {!currentUser ? (
          <button 
            onClick={() => { 
              onClose(); 
              if (onLoginClick) onLoginClick(); 
            }}
            className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all mb-2 shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
          >
            <User className="w-6 h-6" /> Log In / Sign Up
          </button>
        ) : (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 bg-zinc-900 text-white border border-zinc-700 px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all mb-2 shadow-lg w-max"
          >
            <LogOut className="w-6 h-6" /> Log Out
          </button>
        )}

        {/* --- PWA INSTALL BUTTON --- */}
        {canInstall && (
          <button 
            onClick={() => { 
              onClose(); 
              onInstall(); 
            }}
            className="flex items-center gap-4 bg-white text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:scale-105 transition-all mb-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] w-max"
          >
            <Download className="w-6 h-6" /> Install App
          </button>
        )}

        {/* --- AM CREW CARD --- */}
        <button 
          onClick={() => { 
            onClose(); 
            if (userTier !== 'premium') {
              onUpsell({
                title: 'Premium Feature',
                message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.'
              });
            } else {
              onOpenFlexCard(); 
            }
          }}
          className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all mb-4 sm:mb-8 shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
        >
          <CreditCard className="w-6 h-6" /> Flex AM Crew Card
        </button>

        {menuItems.map((item) => (
          <button 
            key={item.action} 
            onClick={() => { onNavigate({ action: item.action }); onClose(); }}
            onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
            onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
            className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors py-1"
          >
            {item.name}
          </button>
        ))}

        {/* --- EXTERNAL WEBSITE LINK --- */}
        <a 
          href="https://www.saturday-am.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-4 text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-zinc-500 hover:text-white text-left transition-colors py-1 mt-2"
        >
          Official Website <ExternalLink className="w-6 h-6 sm:w-8 sm:h-8" />
        </a>

        {/* --- ADMIN SECURE BUTTON --- */}
        {currentUser?.is_admin && (
          <div className="mt-8 pt-8 border-t border-zinc-900">
            <button 
              onClick={() => { onNavigate({ action: 'admin' }); onClose(); }}
              className="flex items-center gap-4 text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-red-600 hover:text-red-400 text-left transition-colors py-1"
            >
              Command Center <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});