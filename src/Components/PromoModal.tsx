import React from 'react';
import { X, Zap, UserPlus } from 'lucide-react';

export const PromoModal = ({ userTier, onClose, onAction }: any) => {
  // Never show to premium users just in case
  if (userTier === 'premium') return null;

  const isVisitor = userTier === 'visitor';

  return (
    <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Dynamic Top Highlight */}
        <div className={`absolute top-0 inset-x-0 h-1 ${isVisitor ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-[#fe9a00] to-yellow-500'}`} />
        
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${isVisitor ? 'bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-[#fe9a00]/20 shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}>
          {isVisitor ? <UserPlus className="w-8 h-8 text-blue-400" /> : <Zap className="w-8 h-8 text-[#fe9a00]" />}
        </div>

        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">
          {isVisitor ? 'Join the Squad' : 'Level Up'}
        </h2>
        
        <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8">
          {isVisitor 
            ? "What are you waiting for? Create a FREE account to unlock more!" 
            : "Upgrade your access and permanently skip the ads."}
        </p>

        <button 
          onClick={onAction} 
          className={`w-full font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg hover:scale-105 ${
            isVisitor 
              ? 'bg-blue-500 text-white hover:bg-white hover:text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
              : 'bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black hover:from-white hover:to-white shadow-[0_0_20px_rgba(254,154,0,0.4)]'
          }`}
        >
          {isVisitor ? 'Create Free Account' : 'Upgrade to Pro'}
        </button>
        
        <button onClick={onClose} className="mt-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors">
          Continue Reading
        </button>
      </div>
    </div>
  );
};