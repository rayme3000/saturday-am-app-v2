import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Crown, Zap, Star, Flame, CreditCard, X, Loader2, RefreshCcw, BookOpen, Trophy, AlertTriangle, Tag, Key, MapPin, Phone, Calendar, User } from 'lucide-react';
import { supabase } from '../supabase';

const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Mexico",
  "Brazil",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Japan",
  "South Korea",
  "India",
  "Philippines",
  "Nigeria",
  "South Africa",
  "Other"
];

const isPoBoxAddress = (address: string): boolean => {
  const poBoxRegex = /\b(?:p\.?\s*o\.?\s*box|post\s*office\s*box|postal\s*box|pobox)\b/i;
  return poBoxRegex.test(address);
};

export const Subscription = ({ userTier, onBack, onLoginClick, onNavigate }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'plan' | 'processing' | 'success'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  const [stripeKey, setStripeKey] = useState<string | null>(null);

  // --- SUBSCRIBER REQUIRED MEMBER DETAILS ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');

  // --- REDEMPTION & PROMO CODE STATE (AUTO-FILLS FROM SHOPIFY MAGIC LINK) ---
  const [redeemCode, setRedeemCode] = useState(() => localStorage.getItem('auto_fill_premium_code') || '');
  const [redeeming, setRedeeming] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'applied' | 'invalid' | null>(null);

  const isPremium = userTier === 'premium';

  useEffect(() => {
    const savedMagicCode = localStorage.getItem('auto_fill_premium_code');
    if (savedMagicCode) {
      setRedeemCode(savedMagicCode);
    }

    const fetchInitialData = async () => {
      const { data: settingsData } = await supabase.from('app_settings').select('stripe_public_key').eq('id', 1).maybeSingle();
      if (settingsData?.stripe_public_key) setStripeKey(settingsData.stripe_public_key);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, street_address, country, county, date_of_birth, phone_number')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setFirstName(profile.first_name || user.user_metadata?.first_name || '');
          setLastName(profile.last_name || user.user_metadata?.last_name || '');
          setStreetAddress(profile.street_address || user.user_metadata?.street_address || '');
          setCountry(profile.country || profile.county || user.user_metadata?.country || user.user_metadata?.county || '');
          setDateOfBirth(profile.date_of_birth || user.user_metadata?.date_of_birth || '');
          setPhoneNumber(profile.phone_number || user.user_metadata?.phone_number || '');
        }
      }
    };
    fetchInitialData();
  }, []);

  const handleSubscribeClick = async (planChoice?: 'monthly' | 'yearly') => {
    if (planChoice) {
      setSelectedPlan(planChoice);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      onLoginClick();
      return;
    }
    setFormError('');
    setCheckoutStep('plan');
    setShowModal(true);
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'BLACK25' || code === 'AMCLUB26' || code === 'WHYT50') {
      setPromoStatus('applied');
      setSelectedPlan('yearly'); 
    } else {
      setPromoStatus('invalid');
    }
  };

  const validateAndSaveMemberDetails = async (userId: string) => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanAddress = streetAddress.trim();
    const cleanCountry = country.trim();
    const cleanDob = dateOfBirth.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanFirst || !cleanLast || !cleanAddress || !cleanCountry || !cleanDob || !cleanPhone) {
      throw new Error("Please complete all required subscriber fields (First Name, Last Name, Street Address, Country, Date of Birth, and Phone Number).");
    }

    if (isPoBoxAddress(cleanAddress)) {
      throw new Error("P.O. Boxes are not permitted for prize shipping. Please enter a physical residential or street address.");
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        first_name: cleanFirst,
        last_name: cleanLast,
        street_address: cleanAddress,
        country: cleanCountry,
        county: cleanCountry,
        date_of_birth: cleanDob,
        phone_number: cleanPhone
      })
      .eq('id', userId);

    if (updateErr) {
      throw new Error("Could not save subscriber details: " + updateErr.message);
    }

    return {
      firstName: cleanFirst,
      lastName: cleanLast,
      streetAddress: cleanAddress,
      country: cleanCountry,
      dateOfBirth: cleanDob,
      phoneNumber: cleanPhone
    };
  };

  // --- REAL STRIPE CHECKOUT INTEGRATION ---
  const handleStripeCheckout = async () => {
    setFormError('');
    setCheckoutLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setCheckoutLoading(false);
      onLoginClick();
      return;
    }

    try {
      const memberDetails = await validateAndSaveMemberDetails(user.id);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'subscription',
          userId: user.id,
          userEmail: user.email,
          returnUrl: window.location.origin,
          plan: selectedPlan,
          ...memberDetails
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from Stripe.");
      }
    } catch (err: any) {
      setFormError(err.message || "Unable to reach Stripe Checkout.");
      setCheckoutLoading(false);
    }
  };

  // Simulated upgrade retained for local testing
  const handleDevUpgrade = async () => {
    setFormError('');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      onLoginClick();
      return;
    }

    try {
      await validateAndSaveMemberDetails(user.id);
      setCheckoutStep('processing');
      await supabase.from('profiles').update({ is_premium: true, super_hypes_left: 3, hypes_remaining: 3 }).eq('id', user.id);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      setTimeout(() => {
        setCheckoutStep('success');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDevDowngrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ is_premium: false }).eq('id', user.id);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    }
  };

  // --- UNIFIED CODE VALIDATOR & REDEEMER ---
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    setRedeeming(true);
    const cleanCode = redeemCode.trim().toUpperCase();

    try {
      let isValidCode = false;
      let isAlreadyUsed = false;
      let matchedSource: 'rpc_status' | 'ledger' | 'validate_rpc' | 'promo_table' | null = null;
      let promoRowData: any = null;

      // 1. Check via check_premium_code_status RPC
      const { data: codeStatus, error: statusError } = await supabase.rpc('check_premium_code_status', {
        code_to_test: cleanCode
      });

      if (!statusError && (codeStatus === 'VALID' || codeStatus === 'UNUSED' || codeStatus === true)) {
        isValidCode = true;
        matchedSource = 'rpc_status';
      } else if (!statusError && codeStatus === 'USED') {
        isAlreadyUsed = true;
      }

      // 2. Fallback: Check against fetch_premium_ledger (same RPC used in AdminDashboard)
      if (!isValidCode && !isAlreadyUsed) {
        const { data: ledgerData } = await supabase.rpc('fetch_premium_ledger');
        if (Array.isArray(ledgerData)) {
          const foundInLedger = ledgerData.find(
            (item: any) => String(item.code || '').trim().toUpperCase() === cleanCode
          );
          if (foundInLedger) {
            if (foundInLedger.is_used) {
              isAlreadyUsed = true;
            } else {
              isValidCode = true;
              matchedSource = 'ledger';
            }
          }
        }
      }

      // 3. Fallback: Check validate_access_code RPC
      if (!isValidCode && !isAlreadyUsed) {
        const { data: valRes, error: valErr } = await supabase.rpc('validate_access_code', {
          p_code: cleanCode
        });
        if (!valErr && valRes?.valid) {
          isValidCode = true;
          matchedSource = 'validate_rpc';
        }
      }

      // 4. Fallback: Check standard promo_codes table
      if (!isValidCode && !isAlreadyUsed) {
        const { data: promoRow } = await supabase
          .from('promo_codes')
          .select('*')
          .ilike('code', cleanCode)
          .maybeSingle();

        if (promoRow) {
          const isExpired = promoRow.expires_at && new Date() > new Date(promoRow.expires_at);
          const isDepleted = promoRow.max_uses && promoRow.times_used >= promoRow.max_uses;
          if (isExpired || isDepleted) {
            isAlreadyUsed = true;
          } else {
            isValidCode = true;
            matchedSource = 'promo_table';
            promoRowData = promoRow;
          }
        }
      }

      if (isAlreadyUsed) {
        setAlertConfig({
          type: 'error',
          title: 'Code Used',
          message: 'This premium code has already been redeemed or has expired.'
        });
        setRedeeming(false);
        return;
      }

      if (!isValidCode) {
        setAlertConfig({
          type: 'error',
          title: 'Invalid Code',
          message: 'This access code is invalid. Please check and try again.'
        });
        setRedeeming(false);
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Visitor entered a valid code -> store it and open Signup Modal with the code pre-filled!
        localStorage.setItem('auto_fill_premium_code', cleanCode);
        setRedeeming(false);
        if (onLoginClick) onLoginClick();
        return;
      }

      // Execute redemption for logged-in user
      if (matchedSource === 'rpc_status' || matchedSource === 'ledger') {
        await supabase.rpc('redeem_premium_code', { promo_code: cleanCode });
      } else if (matchedSource === 'validate_rpc') {
        await supabase.rpc('redeem_access_code', { p_code: cleanCode, p_user_id: user.id });
      } else if (matchedSource === 'promo_table' && promoRowData) {
        await supabase
          .from('promo_codes')
          .update({ times_used: (promoRowData.times_used || 0) + 1 })
          .eq('id', promoRowData.id);
      }

      // Always ensure the user's profile is upgraded to Premium in the database
      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update({ is_premium: true, super_hypes_left: 3, hypes_remaining: 3 })
        .eq('id', user.id);

      if (profileUpdateErr) {
        throw profileUpdateErr;
      }

      localStorage.removeItem('auto_fill_premium_code');
      window.dispatchEvent(new Event('profileUpdated'));
      setAlertConfig({
        type: 'success',
        title: 'Premium Unlocked!',
        message: 'Success! 1-Year Premium Access has been applied to your account.'
      });
      setRedeemCode('');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'Redemption Error',
        message: err.message || 'An error occurred while redeeming your code.'
      });
    } finally {
      setRedeeming(false);
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
              {isPremium ? 'Included in Pro' : 'Current Plan'}
            </button>
          </div>

          <div className="bg-gradient-to-b from-purple-900/40 to-black backdrop-blur-xl border border-purple-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-bl-xl z-10">
              Most Popular
            </div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-6 relative z-10">
              <h3 className="text-2xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#fe9a00] mb-4 flex items-center gap-2">
                Saturday AM+ <Zap className="w-5 h-5 text-[#fe9a00]" />
              </h3>

              {/* VISIBLE PLAN SWITCHER ON MAIN CARD: MONTHLY ($1.99) vs ANNUAL ($20.00) */}
              <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-black/80 border border-zinc-800 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  className={`py-2.5 px-3 rounded-xl text-left transition-all cursor-pointer border ${
                    selectedPlan === 'monthly'
                      ? 'bg-[#fe9a00]/15 border-[#fe9a00] text-white shadow-[0_0_15px_rgba(254,154,0,0.2)]'
                      : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Monthly Plan</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    $1.99<span className="text-[10px] font-bold text-zinc-400">/mo</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`py-2.5 px-3 rounded-xl text-left transition-all cursor-pointer border relative ${
                    selectedPlan === 'yearly'
                      ? 'bg-purple-500/20 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-[#fe9a00] text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                    Save 16%
                  </span>
                  <div className="text-[9px] font-black uppercase tracking-widest text-purple-300">Annual Plan</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    $20.00<span className="text-[10px] font-bold text-zinc-400">/yr</span>
                  </div>
                </button>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  {selectedPlan === 'yearly' ? '$20.00' : '$1.99'}
                </span>
                <span className="text-zinc-400 font-bold text-sm">
                  {selectedPlan === 'yearly' ? '/ year (2 months free!)' : '/ month (or $20/yr)'}
                </span>
              </div>
              <p className="text-purple-300 text-xs font-bold mt-2">The ultimate Super Fan experience.</p>
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
              <div className="space-y-3 relative z-10">
                <button disabled className="w-full py-4 bg-purple-600/20 border border-purple-500 text-purple-400 font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Active Subscription
                </button>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSubscribeClick(selectedPlan)}
                    className="text-[#fe9a00] hover:underline text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Open Checkout / Update Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDowngradeConfirm(true)}
                    className="text-zinc-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" /> Downgrade Access
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => handleSubscribeClick(selectedPlan)}
                className="w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-gradient-to-r from-[#fe9a00] to-yellow-500 hover:from-white hover:to-white text-black shadow-[0_0_20px_rgba(254,154,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:scale-105 cursor-pointer relative z-10"
              >
                {selectedPlan === 'yearly' ? 'Upgrade to Pro ($20/yr)' : 'Upgrade to Pro ($1.99/mo)'}
              </button>
            )}
          </div>
        </div>

        {/* --- STORE CODE REDEMPTION --- */}
        <div className="max-w-4xl mx-auto mt-8 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe9a00]/10 rounded-bl-full blur-2xl pointer-events-none" />
           <div className="bg-[#fe9a00]/20 p-4 rounded-full border border-[#fe9a00]/50 shrink-0 z-10">
             <Key className="w-8 h-8 text-[#fe9a00]" />
           </div>
           <div className="flex-1 text-center md:text-left z-10">
             <h3 className="text-xl font-black italic uppercase text-white mb-2">Redeem Store Code</h3>
             <p className="text-xs font-bold text-zinc-400 max-w-md mx-auto md:mx-0">Have a 12-character premium code from the Shopify store? Enter it here to unlock or extend your Saturday AM+ Annual Subscription.</p>
           </div>
           <form onSubmit={handleRedeemCode} className="w-full md:w-auto flex-shrink-0 relative mt-4 md:mt-0 z-10">
             <input 
                type="text" 
                placeholder="XXXX-XXXX-XXXX" 
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="w-full md:w-64 bg-black border border-zinc-700 text-[#fe9a00] font-black tracking-widest text-sm p-4 rounded-xl focus:outline-none focus:border-[#fe9a00] transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-600 text-center"
                required
             />
             <button 
                type="submit" 
                disabled={redeeming || !redeemCode.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-zinc-800 rounded-lg flex items-center justify-center text-white hover:bg-[#fe9a00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-[10px] uppercase tracking-widest"
             >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
             </button>
           </form>
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
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[92vh]">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-[#fe9a00] to-purple-500" />
            
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20 cursor-pointer">
              <X className="w-6 h-6" />
            </button>

            <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar">
              {checkoutStep === 'plan' && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="bg-[#fe9a00] text-black text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">Stripe Secure</span>
                    <h3 className="text-xl font-black italic uppercase text-white">Saturday AM+ Checkout</h3>
                  </div>

                  {/* PLAN SELECTOR */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div 
                      onClick={() => setSelectedPlan('monthly')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black uppercase tracking-widest text-xs text-white">Monthly</span>
                        <span className="font-black text-[#fe9a00] text-sm">$1.99</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Billed monthly</p>
                    </div>

                    <div 
                      onClick={() => setSelectedPlan('yearly')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'yearly' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black uppercase tracking-widest text-xs text-white">Yearly</span>
                          <span className="bg-purple-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                            {promoStatus === 'applied' ? 'PROMO' : 'Save 16%'}
                          </span>
                        </div>
                        <span className="font-black text-purple-400 text-sm flex items-center gap-1">
                          {promoStatus === 'applied' && <span className="text-zinc-500 line-through text-[10px]">$20</span>}
                          {promoStatus === 'applied' ? '$15.00' : '$20.00'}
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Billed yearly</p>
                    </div>
                  </div>

                  {/* SUBSCRIBER CONTACT & PRIZE SHIPPING DETAILS */}
                  <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 mb-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Member & Prize Shipping Info
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Required • No P.O. Boxes</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">First Name *</label>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Last Name *</label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#fe9a00]" /> Physical Street Address (No P.O. Boxes) *
                      </label>
                      <input
                        type="text"
                        placeholder="123 Manga Way, Apt 4B, City, State, ZIP"
                        value={streetAddress}
                        onChange={(e) => {
                          setStreetAddress(e.target.value);
                          if (formError) setFormError('');
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Country *</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                          required
                        >
                          <option value="" disabled>Select Country</option>
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#fe9a00]" /> Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#fe9a00]" /> Phone Number *
                        </label>
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROMO CODE */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Promo / Referral Code (Optional)</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter Code..." 
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoStatus(null); }}
                        className="flex-1 bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-purple-500"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoStatus === 'applied'}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${promoStatus === 'applied' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50'}`}
                      >
                        {promoStatus === 'applied' ? <Check className="w-4 h-4" /> : 'Apply'}
                      </button>
                    </div>
                    {promoStatus === 'applied' && <p className="text-emerald-400 text-[9px] font-black mt-1.5 uppercase tracking-widest">Code Applied: 25% Off Yearly Plan!</p>}
                    {promoStatus === 'invalid' && <p className="text-red-400 text-[9px] font-black mt-1.5 uppercase tracking-widest">Invalid or expired code.</p>}
                  </div>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-950/60 border border-red-700 rounded-xl text-red-300 text-xs font-bold leading-relaxed">
                      {formError}
                    </div>
                  )}

                  {/* REAL STRIPE CHECKOUT BUTTON */}
                  <button 
                    onClick={handleStripeCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black font-black uppercase tracking-widest rounded-xl hover:from-white hover:to-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.4)] disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving & Connecting to Stripe...
                      </>
                    ) : (
                      <>
                        {selectedPlan === 'yearly' ? 'Pay with Stripe ($20.00/yr)' : 'Pay with Stripe ($1.99/mo)'} <ArrowLeft className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>

                  {/* Dev Simulation Fallback */}
                  <button 
                    onClick={handleDevUpgrade}
                    className="w-full mt-3 py-2 text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                  >
                    Simulate Payment (Dev Sandbox)
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
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
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

      {/* --- IN-APP ALERT MODAL FOR REDEMPTION --- */}
      {alertConfig && (
        <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setAlertConfig(null)}>
          <div className={`bg-zinc-950 border ${alertConfig.type === 'error' ? 'border-red-900/50' : 'border-[#fe9a00]/50'} p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAlertConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${alertConfig.type === 'error' ? 'bg-red-900/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-[#fe9a00]/20 border border-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}>
              {alertConfig.type === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Check className="w-8 h-8 text-[#fe9a00]" />}
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">
              {alertConfig.title}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
              {alertConfig.message}
            </p>
            <button 
              onClick={() => setAlertConfig(null)} 
              className={`w-full font-black uppercase tracking-widest py-3 rounded transition-colors ${alertConfig.type === 'error' ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'}`}
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
};