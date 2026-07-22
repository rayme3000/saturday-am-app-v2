import React, { memo } from 'react';
import { Home, Heart, Search, ShoppingBag, User } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- FRAME LOGIC ---
const BASIC_FRAMES = [
  { id: 'none', style: 'border-transparent' },
  { id: 'red', style: 'border-red-600' },
  { id: 'yellow', style: 'border-yellow-500' },
  { id: 'cyan', style: 'border-cyan-500' },
];

const PREMIUM_FRAMES = [
  { id: 'gold', style: 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]', orbit: 'border-t-yellow-400 border-r-yellow-400 animate-[spin_3s_linear_infinite]' },
  { id: 'appleblack', style: 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]', orbit: 'border-t-red-500 border-l-red-500 animate-[spin_2.5s_linear_infinite]' },
  { id: 'clockstriker', style: 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]', orbit: 'border-b-cyan-400 border-r-cyan-400 animate-[spin_3s_linear_infinite_reverse]' },
];

const getFrameStyle = (id: string) => [...BASIC_FRAMES, ...PREMIUM_FRAMES].find(f => f.id === id)?.style || 'border-transparent';
const getOrbitStyle = (id: string) => PREMIUM_FRAMES.find(f => f.id === id)?.orbit || '';

export const FloatingPillNav = memo(({ currentView, onNavigate, userAvatar, userFrame }: any) => {
  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:min-w-[400px] max-w-md z-[40] pointer-events-none">
      
      {/* Changed py-3 to py-1.5 to make the pill narrower height-wise */}
      <nav className="bg-black/80 backdrop-blur-md border border-[#fe9a00] rounded-full px-6 py-1.5 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
        
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

        {/* Center Profile Avatar w/ Frame Logic */}
        <button 
          onClick={() => onNavigate({ action: 'profile' })} 
          className="relative flex items-center justify-center w-12 h-12 transition-transform hover:scale-110 flex-shrink-0"
        >
           <div className={`w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 border-2 transition-all ${
              currentView === 'profile' 
                ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.6)] scale-110' 
                : getFrameStyle(userFrame)
            }`}>
             {userAvatar && userAvatar.trim() !== '' ? (
               <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <User className="w-5 h-5 text-zinc-400" />
             )}
           </div>
           
           {/* Animated Premium Orbit (Only show if not actively on the profile tab) */}
           {PREMIUM_FRAMES.some(p => p.id === userFrame) && currentView !== 'profile' && (
             <div className={`absolute w-[52px] h-[52px] rounded-full border-2 border-transparent pointer-events-none ${getOrbitStyle(userFrame)}`} />
           )}
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