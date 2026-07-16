import React from 'react';
import { ArrowLeft, Check, Flame, BookOpen, Star, Crown, MessageCircle, CreditCard, Target, ShoppingBag, Plus } from 'lucide-react';

// --- ADDED onLoginClick PROP ---
export const Subscription = ({ userTier, onBack, onLoginClick }: any) => {
  const isPremium = userTier === 'premium';
  const isVisitor = userTier === 'visitor';
  const isFree = userTier === 'free';

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-fade-in relative z-[200]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-widest text-[#fe9a00]">Subscription</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">Join the <span className="text-[#fe9a00]">AM Crew</span></h2>
          <p className="text-zinc-400 font-bold tracking-widest uppercase text-xs">Unlock the ultimate manga reading experience.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col shadow-lg">
            <h3 className="text-xl font-black uppercase tracking-widest text-zinc-300 mb-2">Standard</h3>
            <p className="text-3xl font-black italic mb-6">Free</p>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-sm font-bold text-zinc-400"><Check className="w-5 h-5 text-zinc-600" /> Read Chapters 1-3 & newest releases</li>
              <li className="flex items-center gap-3 text-sm font-bold text-zinc-400"><Check className="w-5 h-5 text-zinc-600" /> Standard Hypes</li>
              <li className="flex items-center gap-3 text-sm font-bold text-zinc-400"><Check className="w-5 h-5 text-zinc-600" /> Join community discussions</li>
              <li className="flex items-center gap-3 text-sm font-bold text-zinc-400"><Check className="w-5 h-5 text-zinc-600" /> Customize your profile</li>
            </ul>
            <button 
              onClick={() => {
                if (isVisitor && onLoginClick) onLoginClick();
              }}
              disabled={isFree} 
              className={`w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all ${
                isFree ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer'
              }`}
            >
              {isVisitor ? 'Create Free Account' : isPremium ? 'Downgrade to Free' : 'Current Plan'}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="bg-gradient-to-b from-zinc-900 to-black border-2 border-[#fe9a00] rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(254,154,0,0.15)] transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-[#fe9a00] text-black font-black uppercase tracking-widest text-[10px] px-4 py-1 rounded-bl-lg z-10">Most Popular</div>
            <div className="absolute -inset-24 bg-gradient-to-tr from-[#fe9a00]/10 to-transparent blur-2xl pointer-events-none" />
            
            <h3 className="text-xl font-black uppercase tracking-widest text-[#fe9a00] mb-2 flex items-center gap-2 relative z-10"><Crown className="w-6 h-6" /> AM Crew Pro</h3>
            <p className="text-4xl font-black italic mb-6 relative z-10">$3.99<span className="text-lg text-zinc-500 not-italic">/mo</span></p>
            
            <ul className="space-y-4 mb-8 flex-1 relative z-10">
              <li className="flex items-center gap-3 text-sm font-bold text-white"><BookOpen className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Unlock ALL chapters in the vault</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><Flame className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> 5 Super Hypes per month</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><MessageCircle className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Leave real-time Quick Reacts on manga pages</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><Star className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Exclusive animated profile frames</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><CreditCard className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Customizable virtual membership card</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><Target className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Collect Autographs via Bingo Book</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><ShoppingBag className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> Discounts in AM shop & live events</li>
              <li className="flex items-center gap-3 text-sm font-bold text-white"><Plus className="w-5 h-5 text-[#fe9a00] flex-shrink-0" /> And more!</li>
            </ul>
            
            <button 
              onClick={() => {
                if (isVisitor && onLoginClick) onLoginClick();
                // Stripe routing will go here later!
              }}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all relative z-10 ${
                isPremium ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_20px_rgba(254,154,0,0.4)]'
              }`}
            >
              {isPremium ? 'Manage Subscription' : isVisitor ? 'Subscribe to Pro' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;