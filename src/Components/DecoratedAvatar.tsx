import React from 'react';
import { User } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const RenderFrameAnimations = ({ anim, color }: { anim: string, color: string }) => {
  if (!anim || anim === 'none') return null;
  return (
    <>
      {anim === 'orbit' && <div className="absolute rounded-full border-2 border-transparent pointer-events-none animate-[spin_3s_linear_infinite]" style={{ width: '130%', height: '130%', borderTopColor: color, borderRightColor: color }} />}
      {anim === 'pulse' && <div className="absolute rounded-full pointer-events-none animate-ping opacity-20" style={{ width: '100%', height: '100%', backgroundColor: color }} />}
      {anim === 'spin' && <div className="absolute rounded-full pointer-events-none animate-[spin_4s_linear_infinite]" style={{ width: '115%', height: '115%', border: `2px dashed ${color}` }} />}
      {anim === 'aura-burst' && (
        <>
          <div className="absolute rounded-full border-[3px] opacity-60 animate-[ping_0.8s_ease-out_infinite]" style={{ width: '120%', height: '120%', borderColor: color }} />
          <div className="absolute rounded-full border-[6px] blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '130%', height: '130%', borderColor: color }} />
        </>
      )}
      {anim === 'evil-aura' && (
        <>
          <div className="absolute rounded-full border-[8px] blur-md animate-[spin_3s_linear_infinite_reverse] opacity-70" style={{ width: '140%', height: '140%', borderColor: color, borderTopColor: 'transparent' }} />
          <div className="absolute rounded-full border-[4px] blur-sm animate-[pulse_2s_ease-in-out_infinite] opacity-80" style={{ width: '120%', height: '120%', borderColor: '#000000', borderBottomColor: color }} />
        </>
      )}
      {anim === 'blade-slash' && (
        <div className="absolute rounded-full border-transparent animate-[spin_0.5s_cubic-bezier(0.1,0.8,0.1,1)_infinite]" style={{ width: '150%', height: '150%', borderTopColor: color, borderRightColor: '#ffffff', borderWidth: '2px 0 0 0' }} />
      )}
      {anim === 'chakra' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_1.5s_linear_infinite]" style={{ width: '120%', height: '120%', borderTopColor: color, borderBottomColor: color, borderWidth: '4px', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full border-transparent animate-[spin_1s_linear_infinite_reverse]" style={{ width: '135%', height: '135%', borderLeftColor: color, borderRightColor: color, borderWidth: '2px', borderStyle: 'dashed' }} />
        </>
      )}
      {anim === 'spirit-bomb' && (
        <div className="absolute rounded-full bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '150%', height: '150%', boxShadow: `0 0 20px 5px ${color}, inset 0 0 15px 5px ${color}`, filter: 'blur(4px)' }} />
      )}
      {anim === 'limit-breaker' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_0.5s_linear_infinite]" style={{ width: '140%', height: '140%', borderTopColor: color, borderBottomColor: color, borderStyle: 'dashed', borderWidth: '4px', filter: `drop-shadow(0 0 10px ${color})` }} />
          <div className="absolute rounded-full animate-[ping_1s_ease-out_infinite] opacity-40" style={{ width: '110%', height: '110%', backgroundColor: color }} />
        </>
      )}
      {anim === 'hollow' && (
        <div className="absolute rounded-full border-transparent animate-[spin_2s_linear_infinite_reverse]" style={{ width: '125%', height: '125%', borderTopColor: color, borderBottomColor: '#000000', borderWidth: '6px', borderStyle: 'dotted', filter: `drop-shadow(0 0 5px ${color})` }} />
      )}
    </>
  );
};

export const DecoratedAvatar = ({ avatarUrl, frameId, size = "w-12 h-12", iconSize = "w-5 h-5" }: any) => {
  // OPTIMIZATION: Pull frames instantly from memory, no database needed!
  const { vaultFrames = [] } = useSeriesData();

  // Safely find the frame. If frameId is a legacy text string like "thunderbreath", it will safely return undefined instead of crashing.
  const frame = vaultFrames.find((f: any) => f.id === frameId);
  const borderColor = frame ? frame.border_color : 'transparent';
  const glowColor = frame?.glow_color && frame.glow_color !== 'transparent' ? frame.glow_color : 'transparent';
  const animStyle = frame ? frame.animation_style : 'none';

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${size}`}>
       <div 
         className={`rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center z-10 w-full h-full transition-all shadow-xl`} 
         style={{ 
           border: frame ? `2px solid ${borderColor}` : '2px solid transparent', 
           boxShadow: glowColor !== 'transparent' ? `0 0 15px ${glowColor}` : 'none' 
         }}
       >
         {avatarUrl ? (
           <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
         ) : (
           <User className={`${iconSize} text-zinc-500`} />
         )}
       </div>
       <RenderFrameAnimations anim={animStyle} color={borderColor} />
    </div>
  );
};