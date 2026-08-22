import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { containsProfanity } from '../profanityFilter'; // <-- IMPORT FILTER

const LoginModal = ({ onClose, onSuccess }: any) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [referral, setReferral] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Listen for background auth completion
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

    if (isSignUp) {
      // Basic client-side check for password length
      if (password.length < 10) {
        setError("Password must be at least 10 characters long.");
        setLoading(false);
        return;
      }

      // Check username against the dynamic profanity dictionary
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

      // 1. Create the secure Auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
            county: country, // Maps to your new 'county' database column
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
        // 2. Instantly push the data to the public.profiles table so it's not NULL
        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            username: username.trim(),
            email: email.trim(),
            county: country,
            referral_source: referral
          }, { onConflict: 'id' });
        }

        setSuccessMsg("Account created! Please check your email inbox to confirm your registration.");
        setIsSignUp(false); 
        setPassword('');
      }
      setLoading(false);

    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
              <p className="text-zinc-500 text-[10px] font-bold tracking-wider px-1">
                * Password must be at least 10 characters.
              </p>
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
  );
};

export default LoginModal;