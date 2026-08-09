import React, { memo, useState, useEffect } from 'react';
import { Home, Heart, Search, ShoppingBag, User } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// --- OPTIMIZATION: Module-level Cache ---
// This memory survives even when React completely destroys the Nav component!
let memoryCacheProfile: any = null;
let memoryCacheFrame: any = null;

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

export const FloatingPillNav = memo(({ currentView, onNavigate }: any) => {
  const { vaultFrames = [] } = useSeriesData();
  
  // Use memory cache as the initial state so there's zero flicker
  const [navAvatar, setNavAvatar] = useState<string>(memoryCacheProfile || '');
  const [navFrame, setNavFrame] = useState<string>(memoryCacheFrame || '');

  useEffect(() => {
    const fetchUserLoadout = async () => {
      // If we already have the cache, skip the database entirely!
      if (memoryCacheProfile !== null) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('avatar_url, avatar_frame_id').eq('id', user.id).maybeSingle();
        if (data) {
          const av = data.avatar_url || '';
          const fr = data.avatar_frame_id || '';
          
          setNavAvatar(av);
          setNavFrame(fr);
          
          // Save it to memory for the next tab switch
          memoryCacheProfile = av;
          memoryCacheFrame = fr;
        }
      }
    };

    fetchUserLoadout();

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.avatar_url !== undefined) {
          setNavAvatar(e.detail.avatar_url);
          memoryCacheProfile = e.detail.avatar_url;
        }
        if (e.detail.avatar_frame_id !== undefined) {
          setNavFrame(e.detail.avatar_frame_id || '');
          memoryCacheFrame = e.detail.avatar_frame_id || '';
        }
      }
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const dynamicFrame = vaultFrames.find((f: any) => f.id === navFrame);
  const dynBorder = dynamicFrame ? `2px solid ${dynamicFrame.border_color}` : 'none';
  const dynShadow = dynamicFrame?.glow_color && dynamicFrame.glow_color !== 'transparent' ? `0 0 10px ${dynamicFrame.glow_color}` : 'none';
  const dynAnim = dynamicFrame ? dynamicFrame.animation_style : 'none';

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:min-w-[400px] max-w-md z-[150] pointer-events-none">
      <nav className="bg-black/80 backdrop-blur-md border border-[#fe9a00] rounded-full px-6 py-1.5 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto">
        <button onClick={() => onNavigate({ action: 'home' })} className="p-2 transition-transform hover:scale-110">
          <Home className={`w-6 h-6 ${currentView === 'home' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        <button onClick={() => onNavigate({ action: 'faves' })} className="p-2 transition-transform hover:scale-110">
          <Heart className={`w-6 h-6 ${currentView === 'faves' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        <button onClick={() => onNavigate({ action: 'profile' })} className="relative flex items-center justify-center w-12 h-12 transition-transform hover:scale-110 flex-shrink-0">
           <div 
             className={`w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 transition-all ${!dynamicFrame ? 'border-2 border-transparent' : ''}`}
             style={dynamicFrame ? { border: dynBorder, boxShadow: dynShadow } : {}}
           >
             {navAvatar && navAvatar.trim() !== '' ? (
               <img src={navAvatar} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <User className="w-5 h-5 text-zinc-400" />
             )}
           </div>
           {dynamicFrame && <RenderPillAnimations anim={dynAnim} color={dynamicFrame.border_color} />}
        </button>

        <button onClick={() => onNavigate({ action: 'browse' })} className="p-2 transition-transform hover:scale-110">
          <Search className={`w-6 h-6 ${currentView === 'browse' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>

        <button onClick={() => onNavigate({ action: 'shop' })} className="p-2 transition-transform hover:scale-110">
          <ShoppingBag className={`w-6 h-6 ${currentView === 'shop' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`} />
        </button>
      </nav>
    </div>
  );
});