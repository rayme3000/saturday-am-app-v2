import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { containsProfanity } from '../profanityFilter'; 

const LoginModal = ({ onClose, onSuccess }: any) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [showTosModal, setShowTosModal] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [referral, setReferral] = useState('');
  const [accessCode, setAccessCode] = useState(''); 
  const [tosAccepted, setTosAccepted] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onSuccess();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [onSuccess]);

  const handleEmailSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();

    if (isSignUp) {
      if (!tosAccepted) {
        setError("You must agree to the Terms of Service to create an account.");
        setLoading(false);
        return;
      }

      if (password.length < 10) {
        setError("Password must be at least 10 characters long.");
        setLoading(false);
        return;
      }

      const isVulgar = containsProfanity(username);
      if (isVulgar) {
        setError("That username is not allowed. Please choose another one.");
        setLoading(false);
        return;
      }

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username.trim())
        .maybeSingle();

      if (existingUser) {
        setError("That username is already taken! Please choose another one.");
        setLoading(false);
        return;
      }

      let appliedTier = 'free';
      let codeIdToUpdate = null;
      let currentTimesUsed = 0;

      if (accessCode.trim()) {
        const { data: promoData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', accessCode.trim().toUpperCase())
          .maybeSingle();

        if (promoError || !promoData) {
          setError("Invalid Access Code. Please check and try again.");
          setLoading(false);
          return;
        }

        if (new Date() > new Date(promoData.expires_at)) {
          setError("This Access Code has expired.");
          setLoading(false);
          return;
        }

        if (promoData.times_used >= promoData.max_uses) {
          setError("This Access Code has reached its usage limit.");
          setLoading(false);
          return;
        }

        appliedTier = promoData.tier;
        codeIdToUpdate = promoData.id;
        currentTimesUsed = promoData.times_used;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
            county: country, 
            referral_source: referral
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('duplicate key') || signUpError.message.includes('unique')) {
          setError("That username is already taken! Please choose another one.");
        } else {
          setError(signUpError.message);
        }
      } else {
        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
            email: cleanEmail,
            county: country,
            referral_source: referral,
            is_premium: appliedTier === 'premium', 
            is_beta: true,
            tos_accepted: true,
            tos_accepted_at: new Date().toISOString()
          }, { onConflict: 'id' });

          if (codeIdToUpdate) {
            await supabase.from('promo_codes')
              .update({ times_used: currentTimesUsed + 1 })
              .eq('id', codeIdToUpdate);
          }
        }

        setSuccessMsg("Account created! Please check your email inbox to confirm your registration.");
        setIsSignUp(false); 
        setPassword('');
      }
      setLoading(false);

    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
      } else {
        onSuccess();
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: any) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMsg("If an account exists, a password reset link has been sent to that email.");
      setTimeout(() => {
        setIsForgotPassword(false);
        setSuccessMsg('');
      }, 5000);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">
            {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Join the Squad' : 'Login')}
          </h2>

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-emerald-400 text-xs font-bold leading-relaxed">{successMsg}</p>
            </div>
          )}
          
          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-zinc-400 font-bold mb-4">
                Enter the email address associated with your account and we will send you a link to reset your password.
              </p>
              <input 
                type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                required
              />
              {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
              <button 
                type="submit" disabled={loading}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded mt-2 hover:bg-white transition-colors"
              >
                {loading ? 'Processing...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="First Name" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-1/2 bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Last Name" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-1/2 bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                      required
                    />
                  </div>

                  <input 
                    type="text" 
                    placeholder="Choose a Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={15}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                    required
                  />
                  
                  <select 
                    value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-zinc-400 text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                    required
                  >
                    <option value="" disabled>Select your Country</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Mexico">Mexico</option>
                    <option value="Brazil">Brazil</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Italy">Italy</option>
                    <option value="Spain">Spain</option>
                    <option value="Japan">Japan</option>
                    <option value="South Korea">South Korea</option>
                    <option value="India">India</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Other">Other</option>
                  </select>

                  <select 
                    value={referral} onChange={(e) => setReferral(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-zinc-400 text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                    required
                  >
                    <option value="" disabled>How did you find us?</option>
                    <option value="Youtube">YouTube</option>
                    <option value="Social Media">Instagram / TikTok / Twitter</option>
                    <option value="Live Event">Convention / Live Event</option>
                    <option value="Google">Google Search</option>
                    <option value="Friend">Recommended by a Friend</option>
                    <option value="Other">Other</option>
                  </select>

                  <input 
                    type="text" 
                    placeholder="Beta / Promo Access Code (Optional)" 
                    value={accessCode} 
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-[#fe9a00] font-black tracking-widest text-sm focus:outline-none focus:border-[#fe9a00] transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-500" 
                  />
                </>
              )}

              <input 
                type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                required
              />
              
              <div className="relative flex flex-col">
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 pr-10 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {!isSignUp && (
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }} 
                    className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest text-right mt-2 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              {isSignUp && (
                <>
                  <p className="text-zinc-500 text-[10px] font-bold tracking-wider px-1">
                    * Password must be at least 10 characters.
                  </p>
                  
                  <div className="flex items-start gap-3 mt-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <input 
                      type="checkbox" 
                      id="tos" 
                      checked={tosAccepted} 
                      onChange={(e) => setTosAccepted(e.target.checked)} 
                      className="mt-0.5 w-4 h-4 accent-[#fe9a00] bg-black border-zinc-700 rounded cursor-pointer"
                      required
                    />
                    <label htmlFor="tos" className="text-xs text-zinc-400 font-bold leading-relaxed cursor-pointer select-none">
                      I have read and agree to the <button type="button" onClick={(e) => { e.preventDefault(); setShowTosModal(true); }} className="text-[#fe9a00] hover:text-white underline transition-colors font-black uppercase tracking-wider text-[10px] ml-1">Terms of Service</button>.
                    </label>
                  </div>
                </>
              )}

              {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
              
              <button 
                type="submit" disabled={loading}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded mt-2 hover:bg-white transition-colors"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-zinc-800 pt-4">
            {isForgotPassword ? (
              <button 
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }} 
                className="text-white hover:text-[#fe9a00] text-xs font-black uppercase tracking-widest mt-2 transition-colors"
              >
                Back to Login
              </button>
            ) : (
              <>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  {isSignUp ? 'Already have an account?' : 'Need an account?'}
                </p>
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }} 
                  className="text-white hover:text-[#fe9a00] text-xs font-black uppercase tracking-widest mt-2 transition-colors"
                >
                  {isSignUp ? 'Log In Here' : 'Sign Up Here'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- TERMS OF SERVICE MODAL --- */}
      {showTosModal && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 p-6 sm:p-8 rounded-2xl w-full max-w-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
            <button onClick={() => setShowTosModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10 bg-black/50 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-black italic uppercase text-[#fe9a00] mb-6 border-b border-zinc-800 pb-4 tracking-tighter">Terms of Service</h3>
            
            <div className="overflow-y-auto pr-4 space-y-6 text-sm text-zinc-300 font-medium custom-scrollbar flex-1 pb-4 leading-relaxed">
              <p>Welcome to Saturday AM. By accessing our app, creating an account, or using our services, you agree to abide by these terms.</p>
              
              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-2 text-[10px]">1. User Conduct & Community Rules</h4>
                <p className="text-xs">You agree to not post any abusive, threatening, discriminatory, or vulgar content. We maintain a zero-tolerance policy for harassment. We reserve the right to suspend or permanently ban any account that violates our community guidelines, without prior notice.</p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-2 text-[10px]">2. Subscriptions & Payments</h4>
                <p className="text-xs">Premium subscriptions (Saturday AM+) are billed as described during checkout. You may cancel your subscription at any time through your account settings or the payment provider. Past payments are non-refundable unless explicitly required by law.</p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-2 text-[10px]">3. Intellectual Property</h4>
                <p className="text-xs">All manga, artwork, characters, logos, and UI designs within this app are the exclusive property of Saturday AM and its affiliated creators. You may not distribute, reproduce, or monetize any content from this app without explicit written permission.</p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-2 text-[10px]">4. Privacy & Data Handling</h4>
                <p className="text-xs">We securely store your email, basic profile data, and reading history to provide you a customized experience. We do not sell your personal data to malicious third parties. By registering, you consent to our data collection practices necessary to run the app.</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800 flex gap-4">
              <button 
                onClick={() => { setTosAccepted(true); setShowTosModal(false); }} 
                className="flex-1 py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)]"
              >
                I Agree to the Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;