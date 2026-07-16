import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, CreditCard, Bell, Smartphone, Shield, ChevronRight, LogOut, AlertTriangle, ExternalLink, UserPlus } from 'lucide-react';
import { supabase } from '../supabase';

// --- ADDED onLoginClick PROP ---
const Settings = ({ userTier, onBack, onSignOut, onNavigate, onLoginClick }: any) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  const isPremium = userTier === 'premium';
  const isVisitor = userTier === 'visitor'; // --- ADDED VISITOR CHECK ---

  // 1. Fetch user data and notification settings on load
  useEffect(() => {
    // Only fetch if they aren't a visitor
    if (isVisitor) return;

    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');
        
        // Fetch preferences from your profiles table
        const { data } = await supabase.from('profiles').select('push_enabled, email_enabled').eq('id', user.id).single();
        if (data) {
          setPushEnabled(data.push_enabled || false);
          setEmailEnabled(data.email_enabled || false);
        }
      }
    };
    fetchSettings();
  }, [isVisitor]);

  // 2. Handle Password Reset
  const handlePasswordReset = async () => {
    if (!userEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: window.location.origin,
    });
    if (error) {
      alert(error.message);
    } else {
      alert("A password reset link has been sent to your email!");
    }
  };

  // 3. Handle Notification Toggles
  const togglePush = async () => {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    if (userId) await supabase.from('profiles').update({ push_enabled: newState }).eq('id', userId);
  };

  const toggleEmail = async () => {
    const newState = !emailEnabled;
    setEmailEnabled(newState);
    if (userId) await supabase.from('profiles').update({ email_enabled: newState }).eq('id', userId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-fade-in relative z-[200]">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg">
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
          {/* GREY OUT FOR VISITORS */}
          <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden ${isVisitor ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <button 
              onClick={handlePasswordReset}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 group"
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
              // --- VISITOR SIGN UP STATE ---
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
                  className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.3)]"
                >
                  Create Free Account
                </button>
              </div>
            ) : (
              // --- LOGGED IN USER STATE (Free & Pro) ---
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
                      {isPremium ? '$3.99 / month' : 'Free Tier'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${isPremium ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]' : 'bg-zinc-800 text-zinc-400'}`}>
                    {isPremium ? 'Active' : 'Free'}
                  </span>
                </div>

                {isPremium ? (
                  <>
                    <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-zinc-800 mb-6 opacity-50 grayscale cursor-not-allowed">
                      <div className="bg-zinc-900 p-2 rounded shrink-0">
                        <CreditCard className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black tracking-widest">•••• •••• •••• ----</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Pending Stripe Setup</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button className="w-full py-4 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 group">
                        <AlertTriangle className="w-3 h-3 group-hover:animate-pulse" /> Cancel Subscription
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-2">
                    <button 
                      onClick={() => onNavigate({ action: 'sub' })} 
                      className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.3)]"
                    >
                      Upgrade to Pro
                    </button>
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
          {/* GREY OUT FOR VISITORS */}
          <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden ${isVisitor ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            
            {/* Push Toggle */}
            <div className="w-full flex items-center justify-between p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg"><Smartphone className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <p className="font-bold text-sm tracking-wide">Push Notifications</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">New chapters & hype alerts</p>
                </div>
              </div>
              <button 
                onClick={togglePush} 
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${pushEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
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
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${emailEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${emailEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>
        </section>

        {/* === APP INFO & LOGOUT === */}
        <section className="pt-6 space-y-4">
          <div className="flex justify-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <button className="hover:text-white transition-colors">Terms of Service</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">Privacy Policy</button>
          </div>
          
          {/* HIDE LOGOUT IF VISITOR */}
          {!isVisitor && (
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 p-5 border border-zinc-800 bg-black rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-black uppercase tracking-widest text-xs mt-8"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
          <p className="text-center text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">App Version 2.0.4</p>
        </section>

      </div>
    </div>
  );
};

export default Settings;