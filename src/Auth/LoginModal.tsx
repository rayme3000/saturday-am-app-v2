import { useState } from 'react';
import { supabase } from '../supabase';
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react';

const LoginModal = ({ onClose, onSuccess }: any) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [referral, setReferral] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // --- NEW: In-app success message state ---
  const [successMsg, setSuccessMsg] = useState('');

  const checkProfanity = async (text: string) => {
    try {
      const res = await fetch(`https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`);
      const hasProfanity = await res.text();
      return hasProfanity === 'true';
    } catch (e) {
      return false;
    }
  };

  const handleEmailSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg(''); // Clear any previous success messages

    if (isSignUp) {
      const isVulgar = await checkProfanity(username);
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

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            country: country,
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
        // --- NEW: Set in-app success message instead of browser alert ---
        setSuccessMsg("Account created! Please check your email inbox to confirm your registration.");
        setIsSignUp(false); // Flips them to the login view so they can log in after clicking the email link
        setPassword('');
      }
      setLoading(false);

    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, 
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">
          {isSignUp ? 'Join the Squad' : 'Login'}
        </h2>

        {/* --- NEW: In-app Success Banner --- */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-400 text-xs font-bold leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* GOOGLE AUTH BUTTON */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-black uppercase tracking-widest py-3 rounded mb-6 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Or Use Email</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>
        
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <input 
                type="text" placeholder="Choose a Username" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
                required
              />
              
              <select 
                value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-zinc-400 text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                required
              >
                <option value="" disabled>Select your Country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
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

          {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
          
          <button 
            type="submit" disabled={loading}
            className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded mt-2 hover:bg-white transition-colors"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-zinc-800 pt-4">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
          </p>
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }} 
            className="text-white hover:text-[#fe9a00] text-xs font-black uppercase tracking-widest mt-2 transition-colors"
          >
            {isSignUp ? 'Log In Here' : 'Sign Up Here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;