import React, { memo, useState } from 'react';
import { Home, Library, Search, ShoppingCart, User, Plus, Trophy, Users, BookOpen, Newspaper } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const RenderPillAnimations = ({ anim, color }: { anim: string, color: string }) => {
  if (!anim || anim === 'none') return null;
  return (
    <>
      {anim === 'orbit' && <div className="absolute w-[52px] h-[52px] rounded-full border-2 border-transparent pointer-events-none animate-[spin_3s_linear_infinite]" style={{ borderTopColor: color, borderRightColor: color }} />}
      {anim === 'pulse' && <div className="absolute w-[40px] h-[40px] rounded-full pointer-events-none animate-ping opacity-20" style={{ backgroundColor: color }} />}
      {anim === 'spin' && <div className="absolute w-[46px] h-[46px] rounded-full pointer-events-none animate-[spin_4s_linear_infinite]" style={{ border: `2px dashed ${color}` }} />}
      {anim === 'aura-burst' && (
        <>
          <div className="absolute w-[48px] h-[48px] rounded-full opacity-60 animate-[ping_0.8s_ease-out_infinite]" style={{ borderColor: color, borderWidth: '2px', borderStyle: 'solid' }} />
          <div className="absolute w-[52px] h-[52px] rounded-full blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" style={{ borderColor: color, borderWidth: '3px', borderStyle: 'solid' }} />
        </>
      )}
      {anim === 'evil-aura' && (
        <>
          <div className="absolute w-[56px] h-[56px] rounded-full blur-sm animate-[spin_3s_linear_infinite_reverse] opacity-70" style={{ borderColor: color, borderTopColor: 'transparent', borderStyle: 'solid', borderWidth: '4px' }} />
          <div className="absolute w-[48px] h-[48px] rounded-full blur-[1px] animate-[pulse_2s_ease-in-out_infinite] opacity-80" style={{ borderColor: '#000000', borderBottomColor: color, borderStyle: 'solid', borderWidth: '2px' }} />
        </>
      )}
      {anim === 'blade-slash' && (
        <div className="absolute w-[60px] h-[60px] rounded-full border-transparent animate-[spin_0.5s_cubic-bezier(0.1,0.8,0.1,1)_infinite]" style={{ borderTopColor: color, borderRightColor: '#ffffff', borderWidth: '2px 0 0 0', borderStyle: 'solid' }} />
      )}
      {anim === 'chakra' && (
        <>
          <div className="absolute w-[48px] h-[48px] rounded-full border-transparent animate-[spin_1.5s_linear_infinite]" style={{ borderTopColor: color, borderBottomColor: color, borderWidth: '2px', borderStyle: 'solid', filter: 'blur(1px)' }} />
          <div className="absolute w-[54px] h-[54px] rounded-full border-transparent animate-[spin_1s_linear_infinite_reverse]" style={{ borderLeftColor: color, borderRightColor: color, borderWidth: '2px', borderStyle: 'dashed' }} />
        </>
      )}
      {anim === 'spirit-bomb' && (
        <div className="absolute w-[60px] h-[60px] rounded-full bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" style={{ boxShadow: `0 0 10px 3px ${color}, inset 0 0 5px 2px ${color}`, filter: 'blur(2px)' }} />
      )}
      {anim === 'limit-breaker' && (
        <>
          <div className="absolute w-[56px] h-[56px] rounded-full border-transparent animate-[spin_0.5s_linear_infinite]" style={{ borderTopColor: color, borderBottomColor: color, borderStyle: 'dashed', borderWidth: '2px', filter: `drop-shadow(0 0 5px ${color})` }} />
          <div className="absolute w-[44px] h-[44px] rounded-full animate-[ping_1s_ease-out_infinite] opacity-40" style={{ backgroundColor: color }} />
        </>
      )}
      {anim === 'hollow' && (
        <div className="absolute w-[50px] h-[50px] rounded-full border-transparent animate-[spin_2s_linear_infinite_reverse]" style={{ borderTopColor: color, borderBottomColor: '#000000', borderWidth: '3px', borderStyle: 'dotted', filter: `drop-shadow(0 0 3px ${color})` }} />
      )}
    </>
  );
};

export const FloatingPillNav = memo(({ currentView, onNavigate, currentUser }: any) => {
  const { vaultFrames = [] } = useSeriesData();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navAvatar = currentUser?.avatar_url || '';
  const navFrame = currentUser?.avatar_frame_id || currentUser?.frame_id || '';

  const dynamicFrame = vaultFrames.find((f: any) => f.id === navFrame);
  const dynBorder = dynamicFrame ? `2px solid ${dynamicFrame.border_color}` : 'none';
  const dynShadow = dynamicFrame?.glow_color && dynamicFrame.glow_color !== 'transparent' ? `0 0 10px ${dynamicFrame.glow_color}` : 'none';
  const dynAnim = dynamicFrame ? dynamicFrame.animation_style : 'none';

  const handleNav = (action: string) => {
    onNavigate({ action });
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-0 w-full z-[150] pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col items-center pointer-events-none">
      
      {/* EXPANDABLE GRID (Popping out above) */}
      <div className={`mb-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-3xl p-4 shadow-2xl transition-all duration-300 origin-bottom pointer-events-auto ${isExpanded ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="grid grid-cols-4 gap-4 sm:gap-6">
          <button onClick={() => handleNav('leaderboard')} className="flex flex-col items-center gap-2 group">
            <div className="p-3 sm:p-4 bg-zinc-800 rounded-2xl group-hover:bg-[#fe9a00] transition-colors"><Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-black" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Rankings</span>
          </button>
          <button onClick={() => handleNav('characters')} className="flex flex-col items-center gap-2 group">
            <div className="p-3 sm:p-4 bg-zinc-800 rounded-2xl group-hover:bg-[#fe9a00] transition-colors"><Users className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-black" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Characters</span>
          </button>
          <button onClick={() => handleNav('bingobook')} className="flex flex-col items-center gap-2 group">
            <div className="p-3 sm:p-4 bg-zinc-800 rounded-2xl group-hover:bg-[#fe9a00] transition-colors"><BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-black" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Bingo Book</span>
          </button>
          <button onClick={() => handleNav('news')} className="flex flex-col items-center gap-2 group">
            <div className="p-3 sm:p-4 bg-zinc-800 rounded-2xl group-hover:bg-[#fe9a00] transition-colors"><Newspaper className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-black" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">AM News</span>
          </button>
        </div>
      </div>

      {/* NAV CONTAINER */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-[94%] sm:w-auto max-w-[500px]">
        
        {/* MAIN PILL */}
        <nav className="relative flex-1 sm:min-w-[400px] h-14 sm:h-16 bg-black/80 backdrop-blur-md border border-[#fe9a00] rounded-full flex items-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
          
          {/* LEFT ICONS */}
          <div className="flex-1 flex justify-evenly items-center h-full pr-8 sm:pr-10">
            <button onClick={() => handleNav('home')} className="p-2 transition-transform hover:scale-110">
              <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${currentView === 'home' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
            </button>

            {/* CHANGED TO LIBRARY/BOOKSHELF ICON */}
            <button onClick={() => handleNav('faves')} className="p-2 transition-transform hover:scale-110">
              <Library className={`w-5 h-5 sm:w-6 sm:h-6 ${currentView === 'faves' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
            </button>
          </div>

          {/* PROMINENT BREAKOUT AVATAR */}
          <button 
            onClick={() => handleNav('profile')} 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 transition-transform hover:scale-105 z-20"
          >
             <div 
               className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 transition-all shadow-2xl ${!dynamicFrame ? 'border-[3px] border-[#fe9a00]' : ''}`}
               style={dynamicFrame ? { border: dynBorder, boxShadow: dynShadow } : {}}
             >
               {navAvatar && navAvatar.trim() !== '' ? (
                 <img src={navAvatar} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User className={`w-6 h-6 sm:w-8 sm:h-8 ${currentView === 'profile' ? 'text-[#fe9a00]' : 'text-zinc-400'}`} />
               )}
             </div>
             
             {/* Scale the dynamic frame animations up to wrap the new larger avatar */}
             {dynamicFrame && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-[1.35] sm:scale-[1.6]">
                 <RenderPillAnimations anim={dynAnim} color={dynamicFrame.border_color} />
               </div>
             )}
          </button>

          {/* RIGHT ICONS */}
          <div className="flex-1 flex justify-evenly items-center h-full pl-8 sm:pl-10">
            <button onClick={() => handleNav('browse')} className="p-2 transition-transform hover:scale-110">
              <Search className={`w-5 h-5 sm:w-6 sm:h-6 ${currentView === 'browse' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
            </button>

            <button onClick={() => handleNav('shop')} className="p-2 transition-transform hover:scale-110">
              <ShoppingCart className={`w-5 h-5 sm:w-6 sm:h-6 ${currentView === 'shop' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
            </button>
          </div>
        </nav>

        {/* OUTSIDE PLUS BUTTON */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={`shrink-0 flex items-center justify-center w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full backdrop-blur-md border shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-300 ${isExpanded ? 'rotate-45 bg-zinc-800 border-zinc-700' : 'rotate-0 bg-black/80 border-[#fe9a00] hover:scale-105'}`}
        >
          <Plus className={`w-6 h-6 sm:w-7 sm:h-7 ${isExpanded ? 'text-red-500' : 'text-white'}`} />
        </button>

      </div>
    </div>
  );
});