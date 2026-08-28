import React, { useState } from 'react';
import { ArrowLeft, Check, Crown, Zap, Star, Flame, CreditCard, X, Loader2, RefreshCcw, BookOpen, Trophy, AlertTriangle, Tag } from 'lucide-react';
import { supabase } from '../supabase';

export const Subscription = ({ userTier, onBack, onLoginClick, onNavigate }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'plan' | 'processing' | 'success'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  // --- PROMO CODE STATE ---
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'applied' | 'invalid' | null>(null);

  const isPremium = userTier === 'premium';

  const handleSubscribeClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      onLoginClick();
      return;
    }
    setCheckoutStep('plan');
    setShowModal(true);
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    // Simulate valid codes for sales or influencers
    if (code === 'BLACK25' || code === 'AMCLUB26' || code === 'WHYT50') {
      setPromoStatus('applied');
      setSelectedPlan('yearly'); // Auto-select yearly to show off the discount
    } else {
      setPromoStatus('invalid');
    }
  };

  const handleDevUpgrade = async () => {
    setCheckoutStep('processing');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      setTimeout(() => {
        setCheckoutStep('success');
      }, 1500);
    }
  };

  const handleDevDowngrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ is_premium: false }).eq('id', user.id);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative pb-24 font-sans">
      
      <div className="fixed inset-0 z-[0] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-[#fe9a00]/10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
      </div>

      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-white/10">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to App</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
          Membership
        </h1>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8">
        
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-4 bg-purple-900/30 rounded-full border border-purple-500/50 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Crown className="w-12 h-12 text-purple-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 drop-shadow-lg">
            Read Without <span className="text-[#fe9a00]">Limits.</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base font-bold max-w-2xl mx-auto leading-relaxed">
            Upgrade to Saturday AM+ to unlock the entire manga vault, customize your digital profile, and dominate the global leaderboards with exclusive Super Hypes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden">
            <div className="mb-8">
              <h3 className="text-2xl font-black italic uppercase text-zinc-300 mb-2">Standard</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">Free</span>
              </div>
              <p className="text-zinc-500 text-xs font-bold mt-3">Perfect for casual readers.</p>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="text-sm font-bold text-zinc-300">Read the latest 3 chapters of any series</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="text-sm font-bold text-zinc-300">Access to standard Bi-Weekly Magazines</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="text-sm font-bold text-zinc-300">Standard Profile tracking and loadout</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="text-sm font-bold text-zinc-300">Participate in Global Leaderboards</span>
              </div>
            </div>

            <button 
              disabled 
              className="w-full py-4 bg-zinc-800 text-zinc-500 font-black uppercase tracking-widest rounded-xl cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          <div className="bg-gradient-to-b from-purple-900/40 to-black backdrop-blur-xl border border-purple-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-bl-xl z-10">
              Most Popular
            </div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-8 relative z-10">
              <h3 className="text-2xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#fe9a00] mb-2 flex items-center gap-2">
                Saturday AM+ <Zap className="w-5 h-5 text-[#fe9a00]" />
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$3.99</span>
                <span className="text-zinc-400 font-bold text-sm">/ month</span>
              </div>
              <p className="text-purple-300 text-xs font-bold mt-3">The ultimate Super Fan experience.</p>
            </div>

            <div className="space-y-4 mb-8 flex-1 relative z-10">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#fe9a00] shrink-0" />
                <span className="text-sm font-bold text-white">Unlock & binge the <span className="text-[#fe9a00]">Entire Manga Vault</span></span>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                <span className="text-sm font-bold text-white">Gain extra fandom points to become Super Fan of the month and win monthly prizes</span>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-sm font-bold text-white">Equip exclusive Animated Avatar Frames</span>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-sm font-bold text-white">Customize your digital AM Crew Card skin</span>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-sm font-bold text-white">Drop <span className="text-red-400">Super Hypes</span> to boost series rankings</span>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-sm font-bold text-white">Collect digital autographs in the Bingo Book</span>
              </div>
            </div>

            {isPremium ? (
              <div className="space-y-3">
                <button disabled className="w-full py-4 bg-purple-600/20 border border-purple-500 text-purple-400 font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Active Subscription
                </button>
                <button onClick={() => setShowDowngradeConfirm(true)} className="w-full py-2 text-zinc-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1">
                  <RefreshCcw className="w-3 h-3" /> Downgrade Your Access
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSubscribeClick}
                className="w-full py-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 hover:from-white hover:to-white text-black font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(254,154,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:scale-105"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

        </div>
      </div>

      {showDowngradeConfirm && (
        <div className="fixed inset-0 z-[7000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-red-500/50 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center relative">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black italic uppercase text-white mb-2">Are you sure?</h3>
            <p className="text-xs text-zinc-400 font-bold mb-8 leading-relaxed">
              If you downgrade your access, you will lose your Saturday AM+ benefits <span className="text-red-400">immediately</span>. You will no longer have access to the entire manga vault, premium skins, or extra fandom points.
            </p>
            <div className="w-full flex gap-3">
              <button 
                onClick={() => setShowDowngradeConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDowngradeConfirm(false);
                  handleDevDowngrade();
                }}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >
                Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-[#fe9a00] to-purple-500" />
            
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20">
              <X className="w-6 h-6" />
            </button>

            <div className="p-6 sm:p-8">
              {checkoutStep === 'plan' && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded animate-pulse">Test Mode</span>
                    <h3 className="text-xl font-black italic uppercase text-white">Checkout</h3>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div 
                      onClick={() => setSelectedPlan('monthly')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black uppercase tracking-widest text-sm text-white">Monthly</span>
                        <span className="font-black text-[#fe9a00]">$3.99</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Billed every month</p>
                    </div>

                    <div 
                      onClick={() => setSelectedPlan('yearly')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'yearly' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase tracking-widest text-sm text-white">Yearly</span>
                          <span className="bg-purple-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                            {promoStatus === 'applied' ? 'PROMO APPLIED' : 'Save 20%'}
                          </span>
                        </div>
                        <span className="font-black text-purple-400 flex items-center gap-2">
                          {promoStatus === 'applied' && <span className="text-zinc-500 line-through text-xs">$39.99</span>}
                          {promoStatus === 'applied' ? '$29.99' : '$39.99'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Billed once per year</p>
                    </div>
                  </div>

                  {/* --- NEW PROMO CODE WIDGET --- */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Promo / Referral Code</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter Code..." 
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoStatus(null); }}
                        className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white font-bold uppercase tracking-wider focus:outline-none focus:border-purple-500"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoStatus === 'applied'}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${promoStatus === 'applied' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50'}`}
                      >
                        {promoStatus === 'applied' ? <Check className="w-4 h-4" /> : 'Apply'}
                      </button>
                    </div>
                    {promoStatus === 'applied' && <p className="text-emerald-400 text-[9px] font-black mt-2 uppercase tracking-widest">Code Applied: 25% Off Yearly Plan!</p>}
                    {promoStatus === 'invalid' && <p className="text-red-400 text-[9px] font-black mt-2 uppercase tracking-widest">Invalid or expired code.</p>}
                  </div>

                  <button 
                    onClick={handleDevUpgrade}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#fe9a00] transition-colors flex items-center justify-center gap-2"
                  >
                    Simulate Payment <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center animate-fade-in text-center">
                  <Loader2 className="w-12 h-12 text-[#fe9a00] animate-spin mb-4" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Processing</h3>
                  <p className="text-xs text-zinc-400 font-bold">Contacting secure payment gateway...</p>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center animate-fade-in text-center">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase text-white mb-2">Welcome to Pro</h3>
                  <p className="text-sm text-zinc-400 font-bold mb-8 leading-relaxed">
                    Your payment was successful! You now have unlimited access to the entire Saturday AM ecosystem.
                  </p>
                  <button 
                    onClick={() => { setShowModal(false); onNavigate({ action: 'profile' }); }}
                    className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-colors"
                  >
                    Customize Your Profile
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};