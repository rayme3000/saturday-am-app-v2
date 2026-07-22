import React, { memo } from 'react';
import { Home, Heart, Search, ShoppingBag } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

export const FloatingPillNav = memo(({ currentView, onNavigate, userAvatar }: any) => {
  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:min-w-[400px] max-w-md z-[40] pointer-events-none">
      
      <nav className="bg-black border border-[#fe9a00] rounded-full px-6 py-3 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
        
        {/* Home Icon */}
        <button 
          onClick={() => onNavigate({ action: 'home' })} 
          className="p-2 transition-transform hover:scale-110"
        >
          <Home className={`w-6 h-6 ${currentView === 'home' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        {/* My Faves Icon */}
        <button 
          onClick={() => onNavigate({ action: 'faves' })} 
          className="p-2 transition-transform hover:scale-110"
        >
          <Heart className={`w-6 h-6 ${currentView === 'faves' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        {/* Center Profile Avatar */}
        <button 
          onClick={() => onNavigate({ action: 'profile' })} 
          className={`relative w-11 h-11 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0 ${
            currentView === 'profile' 
              ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)] scale-110' 
              : 'border-red-600/80 hover:border-[#fe9a00]'
          }`}
        >
          <img 
            src={userAvatar || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </button>

        {/* Browse / Search Icon */}
        <button 
          onClick={() => onNavigate({ action: 'browse' })} 
          className="p-2 transition-transform hover:scale-110"
        >
          <Search className={`w-6 h-6 ${currentView === 'browse' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        {/* AM Shop Icon */}
        <button 
          onClick={() => onNavigate({ action: 'shop' })} 
          className="p-2 transition-transform hover:scale-110"
        >
          <ShoppingBag className={`w-6 h-6 ${currentView === 'shop' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

      </nav>
    </div>
  );
});