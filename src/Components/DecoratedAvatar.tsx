import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { supabase } from '../supabase';

// Global cache prevents spamming the database when loading 50+ users on the leaderboard
const frameCache: Record<string, any> = {};

export const DecoratedAvatar = ({ avatarUrl, frameId, size = "w-10 h-10", iconSize = "w-5 h-5", disableOrbit = false }: any) => {
  const [frame, setFrame] = useState<any>(frameCache[frameId] || null);

  useEffect(() => {
    if (!frameId || frameId === 'none') {
       setFrame(null);
       return;
    }
    
    if (frameCache[frameId]) {
      setFrame(frameCache[frameId]);
      return;
    }

    const fetchFrame = async () => {
      const { data } = await supabase.from('avatar_frames').select('*').eq('id', frameId).single();
      if (data) {
        frameCache[frameId] = data;
        setFrame(data);
      }
    };

    fetchFrame();
  }, [frameId]);

  const borderStyle = frame ? { border: `2px solid ${frame.border_color}` } : { border: '2px solid transparent' };
  const glowStyle = frame && frame.glow_color !== 'transparent' ? { boxShadow: `0 0 15px ${frame.glow_color}` } : {};
  const combinedStyle = { ...borderStyle, ...glowStyle };

  return (
    <div className={`relative flex items-center justify-center ${size} flex-shrink-0`}>
       {/* Main Avatar Container */}
       <div className="rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 w-full h-full transition-all" style={combinedStyle}>
          {avatarUrl ? (
            <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
          ) : (
            <User className={`text-zinc-500 ${iconSize}`} />
          )}
       </div>

       {/* Dynamic Animations */}
       {frame?.animation_style === 'orbit' && !disableOrbit && (
          <div 
            className="absolute rounded-full border-2 border-transparent pointer-events-none animate-[spin_3s_linear_infinite]"
            style={{ 
              width: '130%', 
              height: '130%', 
              borderTopColor: frame.border_color, 
              borderRightColor: frame.border_color 
            }} 
          />
       )}
       {frame?.animation_style === 'pulse' && (
          <div 
            className="absolute rounded-full pointer-events-none animate-ping opacity-20"
            style={{ width: '100%', height: '100%', backgroundColor: frame.border_color }} 
          />
       )}
       {frame?.animation_style === 'spin' && (
          <div 
            className="absolute rounded-full pointer-events-none animate-[spin_4s_linear_infinite]"
            style={{ width: '115%', height: '115%', border: `2px dashed ${frame.border_color}` }} 
          />
       )}
    </div>
  );
}