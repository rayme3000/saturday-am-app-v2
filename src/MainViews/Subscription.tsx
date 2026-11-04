import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Key,
  Crown,
  Gift,
  Loader2,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { supabase } from '../supabase';

export const Subscription = ({ userTier, onBack, onLoginClick, onNavigate }: any) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(userTier === 'premium');
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  // Promo / Access Key Redemption State
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Creator / Fan Referral Code State (for Annual Plan)
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const savedPromo = localStorage.getItem('auto_fill_premium_code');
    if (savedPromo) {
      setPromoCode(savedPromo);
      localStorage.removeItem('auto_fill_premium_code');
    }

    const savedRef = localStorage.getItem('am_referral_code');
    if (savedRef) {
      setReferralCode(savedRef);
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUser(profile || { id: user.id, email: user.email });
        if (profile?.is_premium) setIsPremium(true);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'sub_success' || params.get('sub_status') === 'success') {
      setIsPremium(true);
      setRedeemSuccess('Welcome to Saturday AM+ PLUS! Your membership is now active.');
      window.dispatchEvent(new Event('profileUpdated'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [userTier]);

  const handleStartSubscription = async (plan: 'monthly' | 'annual') => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setIsLoadingCheckout(true);
    try {
      const cleanRef = referralCode.trim().toUpperCase();
      if (cleanRef) {
        localStorage.setItem('am_referral_code', cleanRef);
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'subscription',
          plan,
          billingCycle: plan,
          userId: activeUserId,
          userEmail: user?.email || currentUser?.email,
          referralCode: cleanRef || undefined,
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from Stripe.');
      }
    } catch (err: any) {
      alert('Unable to start Stripe checkout: ' + (err.message || 'Please try again.'));
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return;

    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      localStorage.setItem('auto_fill_premium_code', cleanCode);
      if (onLoginClick) onLoginClick();
      return;
    }

    // If the user pasted a Creator Onboarding Invite code here, trigger the onboarding flow
    if (cleanCode.startsWith('SAM-CR-')) {
      localStorage.setItem('am_pending_creator_invite', cleanCode);
      window.location.href = `/?creator_invite=${encodeURIComponent(cleanCode)}`;
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      // 1. Check custom/Shopify promo_codes table first
      const { data: promoRow } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (promoRow) {
        const now = new Date();
        if (promoRow.expires_at && new Date(promoRow.expires_at) < now) {
          throw new Error('This access code has expired.');
        }
        const timesUsed = Number(promoRow.times_used || 0);
        const maxUses = Number(promoRow.max_uses || 1);
        if (timesUsed >= maxUses) {
          throw new Error('This access code has already reached its maximum redemptions.');
        }

        const { error: updatePromoErr } = await supabase
          .from('promo_codes')
          .update({ times_used: timesUsed + 1 })
          .eq('id', promoRow.id);
        if (updatePromoErr) throw updatePromoErr;

        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            hypes_remaining: 3,
            super_hypes_left: 3
          })
          .eq('id', activeUserId);
        if (profErr) throw profErr;

        setIsPremium(true);
        setPromoCode('');
        setRedeemSuccess('Success! Your 1-Year Saturday AM+ PLUS Access Key has been activated!');
        window.dispatchEvent(new Event('profileUpdated'));
        setIsRedeeming(false);
        return;
      }

      // 2. Fallback to batch store codes RPC (redeem_premium_code)
      const { data: rpcSuccess, error: rpcErr } = await supabase.rpc('redeem_premium_code', {
        input_code: cleanCode,
        user_uuid: activeUserId
      });

      if (rpcErr || !rpcSuccess) {
        throw new Error('Invalid or already redeemed access code.');
      }

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          hypes_remaining: 3,
          super_hypes_left: 3
        })
        .eq('id', activeUserId);

      setIsPremium(true);
      setPromoCode('');
      setRedeemSuccess('Success! Your Saturday AM+ PLUS membership is now active!');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setRedeemError(err.message || 'Failed to redeem code.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const perks = [
    'Unlock the Entire Manga Vault (All Chapters & Completed Runs)',
    '12-Hour Early Access to New Weekly Chapter Drops',
    '3 Weekly Super Hypes to Boost Your Favorite Series & Creators',
    'Exclusive Animated Avatar Border Frames & Hype Card Skins',
    'Custom Text Smart Comments Directly on Manga Pages',
    '100% Ad-Free Reading Experience Across All Devices'
  ];

  return (
    <div className="min-h-screen bg-transparent text-white pb-28 pt-6 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-all text-xs font-black uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isPremium && (
          <span className="px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500 text-purple-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Crown className="w-3.5 h-3.5 text-[#fe9a00]" /> PLUS Active
          </span>
        )}
      </div>

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fe9a00]/15 border border-[#fe9a00]/40 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Saturday AM+ PLUS Membership
        </div>
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-4">
          Read Manga <span className="text-[#fe9a00]">Without Limits</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 font-bold leading-relaxed">
          Unlock every chapter in the Saturday AM vault, read new drops 12 hours early, and support diverse global creators directly.
        </p>
      </div>

      {redeemSuccess && (
        <div className="mb-8 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl p-5 flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              Membership Activated!
            </h3>
            <p className="text-xs text-emerald-200 font-bold mt-0.5">{redeemSuccess}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white cursor-pointer"
          >
            Start Reading
          </button>
        </div>
      )}

      {/* Plan Selector Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly ($1.99/mo)
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Annual ($20/yr)</span>
            <span className="bg-black text-[#fe9a00] text-[8px] px-2 py-0.5 rounded-full font-black uppercase">
              Save 16%
            </span>
          </button>
        </div>
      </div>

      {/* Main Pricing & Perks Card */}
      <div className="bg-zinc-950/90 backdrop-blur-xl border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(254,154,0,0.18)] mb-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 space-y-4">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white">
              Everything Included in <span className="text-[#fe9a00]">PLUS</span>
            </h2>
            <div className="space-y-3">
              {perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fe9a00]/20 border border-[#fe9a00] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#fe9a00] stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-200 font-bold leading-snug">
                    {perk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-1">
              {billingCycle === 'annual' ? '1-Year All-Access Pass' : 'Monthly Pass'}
            </span>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-4xl sm:text-5xl font-black italic text-white">
                {billingCycle === 'annual' ? '$20' : '$1.99'}
              </span>
              <span className="text-xs font-bold text-zinc-400 uppercase">
                {billingCycle === 'annual' ? '/ year' : '/ month'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold mb-5">
              {billingCycle === 'annual'
                ? 'Billed once annually (~$1.67/mo). Cancel anytime.'
                : 'Billed monthly via secure Stripe checkout. Cancel anytime.'}
            </p>

            {billingCycle === 'annual' && (
              <div className="w-full mb-4 text-left">
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Creator or Friend Referral Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP-WHYT"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
            )}

            {isPremium ? (
              <div className="w-full space-y-2">
                <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> You Have Active PLUS Access
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate({ action: 'settings' })}
                    className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Manage Subscription in Settings
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={isLoadingCheckout}
                onClick={() => handleStartSubscription(billingCycle)}
                className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    {billingCycle === 'annual' ? 'Get 1-Year PLUS ($20)' : 'Start Monthly PLUS ($1.99)'}
                  </>
                )}
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[#fe9a00]" /> Secure Stripe Checkout
            </div>
          </div>
        </div>
      </div>

      {/* Redeem 1-Year Pro Access Key / Store Code Box */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center text-[#fe9a00] shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
              Have a 1-Year Pro Access Key or Store Code?
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold">
              Enter your Saturday AM Shop code, VIP bundle key, or Creator Invite code below to unlock PLUS immediately.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <input
            type="text"
            placeholder="Enter Code (e.g. SATAM-VIP-2026)"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
          />
          <button
            type="submit"
            disabled={isRedeeming || !promoCode.trim()}
            className="px-6 py-3 bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 shrink-0"
          >
            {isRedeeming ? 'Redeeming...' : 'Redeem Code'}
          </button>
        </form>

        {redeemError && (
          <p className="text-xs text-red-400 font-bold mt-3 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" /> {redeemError}
          </p>
        )}

        {!currentUser && (
          <p className="text-[10px] text-zinc-500 font-bold mt-3 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-[#fe9a00] shrink-0" />
            You'll be prompted to sign in or create a free account so we can attach PLUS to your profile.
          </p>
        )}
      </div>
    </div>
  );
};

export const SubscriptionPage = Subscription;
export default Subscription;