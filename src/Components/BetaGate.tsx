import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Sparkles, LogOut, Lock, ArrowRight } from 'lucide-react';
import LoginModal from '../Auth/LoginModal'; 

// 1. Set your target end date here (YYYY-MM-DD)
const BETA_END_DATE = new Date('2026-10-01T00:00:00Z');

// 2. Fallback master code just in case
const VIP_PASSPHRASE = 'VIPBETA'; 

export const BetaGate = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(!!profile?.is_admin);
      }
      setLoading(false);
    };
    checkAccess();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToTest = passphrase.toUpperCase().trim();

    // 1. Check if it's the master override code
    if (codeToTest === VIP_PASSPHRASE) {
      setError('');
      setShowLoginModal(true);
      return;
    }

    // 2. Check the database for dynamic Command Center codes
    const { data: promoData, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', codeToTest)
      .maybeSingle();

    if (promoError || !promoData) {
      setError('INVALID ACCESS CODE.');
      return;
    }

    if (new Date() > new Date(promoData.expires_at)) {
      setError('THIS ACCESS CODE HAS EXPIRED.');
      return;
    }

    if (promoData.times_used >= promoData.max_uses) {
      setError('THIS ACCESS CODE HAS REACHED ITS USAGE LIMIT.');
      return;
    }

    // If it passes all checks, unlock the door!
    setError('');
    setShowLoginModal(true); 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasBetaEnded = new Date() > BETA_END_DATE;

  // SCENARIO 1: Logged in, Beta is OVER, and user is NOT staff
  if (user && hasBetaEnded && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#fe9a00] rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />
        </div>
        <div className="relative z-10 max-w-md flex flex-col items-center">
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(254,154,0,0.2)]">
            <Sparkles className="w-10 h-10 text-[#fe9a00]" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-4">Beta Concluded</h1>
          <div className="w-12 h-1 bg-[#fe9a00] mb-6 rounded-full" />
          <p className="text-zinc-400 font-bold leading-relaxed mb-8">
            Thank you for being one of our exclusive VIP testers! The Saturday AM closed beta has officially ended. 
            <br/><br/>
            Your feedback is actively shaping the final app. Please stay tuned to your email for updates on our official worldwide launch.
          </p>
          <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // SCENARIO 2: Logged out (They need to enter the code or use Staff Login)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        
        {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onSuccess={() => window.location.reload()} 
          />
        )}

        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#fe9a00] rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />
        </div>
        
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" alt="Saturday AM" className="w-24 h-24 object-contain mb-8 drop-shadow-[0_0_15px_rgba(254,154,0,0.5)]" />
          
          {hasBetaEnded ? (
            <>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">Beta Concluded</h1>
              <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8">
                The closed beta testing period has ended. Thank you to everyone who participated!
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Closed Beta</h1>
              <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8">
                Enter your VIP access code to enter the testing environment.
              </p>

              <form onSubmit={handlePassphraseSubmit} className="w-full relative mb-4">
                <input 
                  type="text" 
                  placeholder="ENTER CODE" 
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-center font-black uppercase tracking-widest text-lg py-4 px-4 rounded-2xl focus:outline-none focus:border-[#fe9a00] transition-colors shadow-xl"
                />
                <button type="submit" className="absolute right-2 top-2 bottom-2 aspect-square bg-[#fe9a00] rounded-xl flex items-center justify-center text-black hover:bg-white transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
              {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>}
            </>
          )}

          <div className="mt-12 pt-6 border-t border-zinc-800/50 w-full flex justify-center">
            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">
              <Lock className="w-4 h-4" /> Staff Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO 3: Logged in and either the Beta is Active, OR they are Staff. Let them in!
  return <>{children}</>;
};