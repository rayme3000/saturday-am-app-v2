import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

export default function LoginModal({ onClose, onSuccess, initialMode = 'signup' }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Fields matching registration UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [referralSource, setReferralSource] = useState('YouTube');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    // --- 1. FORGOT PASSWORD FLOW ---
    if (isForgotPassword) {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setInfoMessage('Password reset link sent! Please check your inbox.');
      }
      return;
    }

    // --- 2. LOGIN FLOW ---
    if (!isSignUp) {
      if (!email.trim() || !password) {
        setErrorMessage('Please provide both email and password.');
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      setIsLoading(false);

      if (error) {
        setErrorMessage(error.message);
      } else if (data.session) {
        window.dispatchEvent(new Event('profileUpdated'));
        if (onSuccess) onSuccess();
        onClose();
      }
      return;
    }

    // --- 3. SIGNUP FLOW ---
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);

    const cleanCode = accessCode.trim().toUpperCase();
    let isPremiumUser = false;

    // Validate access code if provided
    if (cleanCode) {
      const { data: valRes, error: valErr } = await supabase.rpc('validate_access_code', {
        p_code: cleanCode
      });

      if (valErr || !valRes?.valid) {
        setIsLoading(false);
        setErrorMessage(valRes?.error || 'Invalid Access Code. Please check and try again.');
        return;
      }

      if (valRes.tier === 'premium') {
        isPremiumUser = true;
      }
    }

    // Derive username from email prefix
    const derivedUsername = email.split('@')[0] || 'Reader';

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: derivedUsername,
          country,
          referral_source: referralSource,
          is_premium: isPremiumUser
        }
      }
    });

    if (authErr) {
      setIsLoading(false);
      setErrorMessage(authErr.message);
      return;
    }

    // Redeem code and update profile stats
    if (authData?.user?.id) {
      if (cleanCode) {
        await supabase.rpc('redeem_access_code', {
          p_code: cleanCode,
          p_user_id: authData.user.id
        });
      } else {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          username: derivedUsername,
          is_premium: false,
          super_hypes_left: 1
        });
      }
    }

    setIsLoading(false);
    window.dispatchEvent(new Event('profileUpdated'));
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          {isSignUp && !isForgotPassword && (
            <>
              {/* Country Selection */}
              <div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white text-xs font-bold px-4 py-3 rounded-xl focus:border-[#fe9a00] outline-none cursor-pointer"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Japan">Japan</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Referral Source */}
              <div>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white text-xs font-bold px-4 py-3 rounded-xl focus:border-[#fe9a00] outline-none cursor-pointer"
                >
                  <option value="YouTube">YouTube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Twitter / X">Twitter / X</option>
                  <option value="Comic Con / Event">Comic Con / Event</option>
                  <option value="Word of Mouth">Word of Mouth</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Access / Promo Code Input */}
              <div>
                <input
                  type="text"
                  placeholder="ACCESS CODE (OPTIONAL)"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-black border border-zinc-800 text-[#fe9a00] font-black uppercase tracking-widest text-xs px-4 py-3 rounded-xl focus:border-[#fe9a00] outline-none placeholder:text-zinc-600"
                />
              </div>
            </>
          )}

          {/* Email Input */}
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              required
              className="w-full bg-black border border-zinc-800 text-white text-xs font-bold px-4 py-3 rounded-xl focus:border-[#fe9a00] outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Password Input */}
          {!isForgotPassword && (
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  className="w-full bg-black border border-zinc-800 text-white text-xs font-bold px-4 py-3 pr-10 rounded-xl focus:border-[#fe9a00] outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && (
                <span className="text-[9px] text-zinc-500 font-bold block mt-1 px-1">
                  * Password must be at least 10 characters.
                </span>
              )}
            </div>
          )}

          {/* Terms Agreement Checkbox */}
          {isSignUp && !isForgotPassword && (
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 accent-[#fe9a00] rounded cursor-pointer shrink-0"
              />
              <span className="text-[10px] text-zinc-400 font-bold">
                I have read and agree to the{' '}
                <span className="text-[#fe9a00] italic font-black uppercase">Terms of Service</span>.
              </span>
            </label>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <p className="text-red-500 text-[11px] font-bold mt-1 text-left leading-snug">
              {errorMessage}
            </p>
          )}

          {/* Info Message Display */}
          {infoMessage && (
            <p className="text-emerald-400 text-[11px] font-bold mt-1 text-left leading-snug">
              {infoMessage}
            </p>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isForgotPassword ? (
              'Reset Password'
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* View Switchers */}
        <div className="flex flex-col items-center gap-2 mt-6 pt-4 border-t border-zinc-900 text-center">
          {!isForgotPassword ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-[10px] text-zinc-400 hover:text-white font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Log in here' : "Don't have an account? Sign up"}
              </button>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMessage(null);
                  }}
                  className="text-[9px] text-zinc-500 hover:text-[#fe9a00] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="text-[10px] text-zinc-400 hover:text-white font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Back to Log In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}