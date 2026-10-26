import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, CreditCard, Bell, Smartphone, Shield, ChevronRight, LogOut, AlertTriangle, UserPlus, X, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';

const Settings = ({ userTier, onBack, onSignOut, onNavigate, onLoginClick }: any) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  // --- REDEMPTION STATE ---
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // --- CANCELLATION & ACCOUNT DELETION MODALS ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingSub, setCancelingSub] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // --- IN-APP ALERT STATE ---
  const [alertConfig, setAlertConfig] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const isPremium = userTier === 'premium';
  const isVisitor = userTier === 'visitor';

  useEffect(() => {
    if (isVisitor) return;

    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');
        
        const { data } = await supabase.from('profiles').select('push_enabled, email_enabled').eq('id', user.id).single();
        if (data) {
          const browserGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
          setPushEnabled(Boolean(data.push_enabled) && (browserGranted || !('Notification' in window)));
          setEmailEnabled(data.email_enabled || false);
        }
      }
    };
    fetchSettings();
  }, [isVisitor]);

  const handlePasswordReset = async () => {
    if (!userEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAlertConfig({ type: 'error', title: 'Reset Failed', message: error.message });
    } else {
      setAlertConfig({ type: 'success', title: 'Email Sent', message: 'A password reset link has been sent to your email!' });
    }
  };

  const togglePush = async () => {
    const newState = !pushEnabled;

    if (newState) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setAlertConfig({
              type: 'error',
              title: 'Permission Blocked',
              message: 'Please allow notifications in your browser or device settings so we can alert you when series in your Bookshelf drop new chapters!'
            });
            return;
          }

          try {
            new Notification('Saturday AM Push Alerts Enabled!', {
              body: "You'll now be notified whenever series in your Bookshelf drop a new chapter!",
              icon: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png'
            });
          } catch {
            // Mobile PWA fallback
          }
        } catch (err) {
          console.error('Notification permission error:', err);
        }
      } else {
        setAlertConfig({
          type: 'success',
          title: 'Bookshelf Alerts Active',
          message: 'In-app Bookshelf alerts are now active! (Tip: On iPhone/iPad, tap Share -> "Add to Home Screen" to enable native iOS push notifications.)'
        });
      }
    }

    setPushEnabled(newState);
    if (userId) {
      await supabase.from('profiles').update({ push_enabled: newState }).eq('id', userId);
    }
  };

  const toggleEmail = async () => {
    const newState = !emailEnabled;
    setEmailEnabled(newState);
    if (userId) await supabase.from('profiles').update({ email_enabled: newState }).eq('id', userId);
  };

  // --- FTC CLICK-TO-CANCEL SUBSCRIPTION HANDLER ---
  const handleCancelSubscription = async () => {
    if (!userId) return;
    setCancelingSub(true);
    try {
      // 1. Try invoking optional Stripe cancellation function if deployed
      await supabase.functions.invoke('cancel-subscription', {
        body: { userId, userEmail }
      }).catch(() => {});

      // 2. Immediately downgrade recurring subscription status in profiles while preserving all Fandom stats
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: false,
          subscription_status: 'canceled',
          super_hypes_left: 1,
          hypes_remaining: 1
        })
        .eq('id', userId);

      if (error) throw error;

      setShowCancelModal(false);
      window.dispatchEvent(new Event('profileUpdated'));
      setAlertConfig({
        type: 'success',
        title: 'Subscription Canceled',
        message: 'Your Saturday AM+ membership has been canceled and will not auto-renew. Your Fandom Score, Hypes, and Bingo Book progress remain saved!'
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'Cancellation Error',
        message: err.message || 'Unable to process cancellation right now. Please contact support@mangahype.com.'
      });
    } finally {
      setCancelingSub(false);
    }
  };

  // --- GDPR / CCPA / APP STORE SELF-SERVICE ACCOUNT DELETION ---
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

      // Clear local storage & cached state
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      setShowDeleteModal(false);
      onSignOut();
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete account automatically. Please contact support@mangahype.com.'
      });
      setDeletingAccount(false);
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

      const { data: codeStatus, error: statusError } = await supabase.rpc('check_premium_code_status', { 
        code_to_test: cleanCode 
      });

      if (!statusError && (codeStatus === 'VALID' || codeStatus === 'UNUSED' || codeStatus === true)) {
        isValidCode = true;
        matchedSource = 'rpc_status';
      } else if (!statusError && codeStatus === 'USED') {
        isAlreadyUsed = true;
      }

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

      if (!isValidCode && !isAlreadyUsed) {
        const { data: valRes, error: valErr } = await supabase.rpc('validate_access_code', {
          p_code: cleanCode
        });
        if (!valErr && valRes?.valid) {
          isValidCode = true;
          matchedSource = 'validate_rpc';
        }
      }

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
        setAlertConfig({ type: 'error', title: 'Code Used', message: 'This premium code has already been redeemed or has expired.' });
        setRedeeming(false);
        return;
      }

      if (!isValidCode) {
        setAlertConfig({ type: 'error', title: 'Invalid Code', message: 'This access code is invalid. Please check and try again.' });
        setRedeeming(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        localStorage.setItem('auto_fill_premium_code', cleanCode);
        setRedeeming(false);
        if (onLoginClick) onLoginClick();
        return;
      }

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

      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update({ is_premium: true, super_hypes_left: 3 })
        .eq('id', user.id);

      if (profileUpdateErr) throw profileUpdateErr;

      window.dispatchEvent(new Event('profileUpdated'));
      setAlertConfig({ type: 'success', title: 'Premium Unlocked!', message: 'Success! 1-Year Premium Access has been applied. Reloading your profile...' });
      setRedeemCode('');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setAlertConfig({ type: 'error', title: 'Error', message: err.message || 'Redemption failed.' });
    } finally {
      setRedeeming(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-fade-in relative z-[200]">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-widest text-[#fe9a00]">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        
        {/* === SECURITY SECTION === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Account Security
          </h2>
          <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden ${isVisitor ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <button 
              onClick={handlePasswordReset}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg group-hover:text-[#fe9a00] transition-colors"><Lock className="w-4 h-4" /></div>
                <span className="font-bold text-sm tracking-wide">Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </button>
            <button className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg group-hover:text-[#fe9a00] transition-colors"><Shield className="w-4 h-4" /></div>
                <span className="font-bold text-sm tracking-wide">Two-Factor Authentication</span>
              </div>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded uppercase tracking-widest">Enabled</span>
            </button>
          </div>
        </section>

        {/* === DYNAMIC BILLING / SIGN UP SECTION === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            {isVisitor ? <UserPlus className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />} 
            {isVisitor ? 'Account Status' : 'Billing & Plan'}
          </h2>
          <div className={`bg-zinc-900/50 border ${isVisitor ? 'border-[#fe9a00]/50 shadow-[0_0_30px_rgba(254,154,0,0.1)]' : 'border-zinc-800'} rounded-2xl overflow-hidden p-5`}>
            
            {isVisitor ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 border border-zinc-800 shadow-inner">
                  <UserPlus className="w-8 h-8 text-[#fe9a00]" />
                </div>
                <h3 className="font-black text-xl italic uppercase tracking-widest text-white mb-2">Join the Crew</h3>
                <p className="text-xs text-zinc-400 font-bold mb-6 max-w-sm leading-relaxed">
                  Create a Free Account to customize your profile, track your reading stats, and collect signatures in the Bingo Book!
                </p>
                <button 
                  onClick={onLoginClick} 
                  className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.3)] cursor-pointer"
                >
                  Create Free Account
                </button>
              </div>
            ) : (
              <>
                <div className={`flex justify-between items-start mb-6 pb-6 ${isPremium ? 'border-b border-zinc-800/50' : ''}`}>
                  <div>
                    <p className="font-black text-xl italic uppercase tracking-widest mb-1 text-white">
                      {isPremium ? (
                        <>AM Crew <span className="text-[#fe9a00]">Pro</span></>
                      ) : (
                        'Standard Account'
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 font-bold tracking-wider">
                      {isPremium ? '$1.99/mo or $20/yr • Auto-Renewing' : 'Free Tier'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${isPremium ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]' : 'bg-zinc-800 text-zinc-400'}`}>
                    {isPremium ? 'Active' : 'Free'}
                  </span>
                </div>

                {isPremium ? (
                  <>
                    <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-zinc-800 mb-6">
                      <div className="bg-zinc-900 p-2 rounded shrink-0">
                        <CreditCard className="w-6 h-6 text-[#fe9a00]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-white">Managed via Stripe Billing</p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1">1-Click Cancel available anytime below</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-4 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 group-hover:animate-pulse" /> Cancel Subscription (1-Click)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-2 space-y-6">
                    <button 
                      onClick={() => onNavigate({ action: 'sub' })} 
                      className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.3)] cursor-pointer"
                    >
                      Upgrade to Pro
                    </button>

                    {/* REDEMPTION SECTION FOR FREE USERS */}
                    <div className="border-t border-zinc-800/50 pt-6">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-3 text-center">
                        Or Redeem a 1-Year Store Access Code
                      </p>
                      <form onSubmit={handleRedeemCode} className="relative">
                        <input 
                          type="text" 
                          placeholder="XXXX-XXXX-XXXX" 
                          value={redeemCode}
                          onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                          className="w-full bg-black border border-zinc-700 text-[#fe9a00] font-black tracking-widest text-sm p-4 rounded-xl focus:outline-none focus:border-[#fe9a00] transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-600 text-center"
                          required
                        />
                        <button 
                          type="submit" 
                          disabled={redeeming || !redeemCode.trim()}
                          className="absolute right-2 top-2 bottom-2 px-6 bg-zinc-800 rounded-lg flex items-center justify-center text-white hover:bg-[#fe9a00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-[10px] uppercase tracking-widest cursor-pointer"
                        >
                          {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* === NOTIFICATIONS === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            <Bell className="w-3 h-3" /> Notifications
          </h2>
          <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden ${isVisitor ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            
            {/* Push Toggle */}
            <div className="w-full flex items-center justify-between p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg"><Smartphone className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <p className="font-bold text-sm tracking-wide">Bookshelf Push Notifications</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Instant alerts when your saved series update</p>
                </div>
              </div>
              <button 
                onClick={togglePush} 
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${pushEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Email Toggle */}
            <div className="w-full flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg"><Bell className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <p className="font-bold text-sm tracking-wide">Email Updates</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Newsletters & exclusive offers</p>
                </div>
              </div>
              <button 
                onClick={toggleEmail} 
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${emailEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${emailEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>
        </section>

        {/* === DATA PRIVACY & ACCOUNT DELETION (GDPR / CCPA / APP STORE COMPLIANCE) === */}
        {!isVisitor && (
          <section>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
              <Trash2 className="w-3 h-3" /> Data & Privacy Rights
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-white">Delete Account & Personal Data</p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1 leading-relaxed">
                  Permanently delete your account, profile, reading history, and comments from Saturday AM servers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('');
                  setShowDeleteModal(true);
                }}
                className="px-4 py-3 bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors shrink-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </section>
        )}

        {/* === APP INFO & LOGOUT === */}
        <section className="pt-6 space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate({ action: 'legal' })}
              className="hover:text-[#fe9a00] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate({ action: 'legal' })}
              className="hover:text-[#fe9a00] transition-colors cursor-pointer"
            >
              Privacy Policy & Data Disclosures
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate({ action: 'legal' })}
              className="hover:text-[#fe9a00] transition-colors cursor-pointer"
            >
              DMCA & AI Policy
            </button>
          </div>
          
          {!isVisitor && (
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 p-5 border border-zinc-800 bg-black rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-black uppercase tracking-widest text-xs mt-8 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
          <p className="text-center text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">App Version 2.0.5</p>
        </section>

      </div>

      {/* --- 1-CLICK CANCEL SUBSCRIPTION CONFIRMATION MODAL --- */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => !cancelingSub && setShowCancelModal(false)}>
          <div className="bg-zinc-950 border border-red-500/40 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCancelModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/50 flex items-center justify-center mb-5">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">
              Cancel Saturday AM+?
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
              Your subscription will be canceled immediately and you will not be charged again. Your Fandom Score, Hypes, and Bingo Book signatures will stay saved on your account!
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                disabled={cancelingSub}
                onClick={handleCancelSubscription}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelingSub ? 'Canceling...' : 'Yes, Cancel My Subscription'}
              </button>
              <button
                type="button"
                disabled={cancelingSub}
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer"
              >
                Keep My Pro Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PERMANENT ACCOUNT DELETION CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => !deletingAccount && setShowDeleteModal(false)}>
          <div className="bg-zinc-950 border border-red-500/50 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/50 flex items-center justify-center mb-5">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">
              Delete Account & Data?
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-4">
              This permanently scrubs your profile, reading history, comments, and login from Saturday AM. Type <span className="text-red-400 font-black">DELETE</span> below to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-black border border-zinc-700 text-white text-center font-black tracking-widest text-xs p-3 rounded-xl mb-5 focus:outline-none focus:border-red-500"
            />
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingAccount ? 'Scrubbing Data...' : 'Permanently Delete My Account'}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP ALERT MODAL --- */}
      {alertConfig && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setAlertConfig(null)}>
          <div className={`bg-zinc-950 border ${alertConfig.type === 'error' ? 'border-red-900/50' : 'border-[#fe9a00]/50'} p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAlertConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${alertConfig.type === 'error' ? 'bg-red-900/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-[#fe9a00]/20 border border-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}>
              {alertConfig.type === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <CheckCircle className="w-8 h-8 text-[#fe9a00]" />}
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

export default Settings;