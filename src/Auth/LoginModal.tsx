import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { X, Eye, EyeOff, CheckCircle, Key } from 'lucide-react';
import { containsProfanity } from '../profanityFilter';

const isPoBoxAddress = (address: string): boolean => {
  const poBoxRegex = /\b(?:p\.?\s*o\.?\s*box|post\s*office\s*box|postal\s*box|pobox)\b/i;
  return poBoxRegex.test(address);
};

// COPPA Age Verification Helper: Returns true if the date of birth is less than 13 years ago
const isUnderThirteen = (dobString: string): boolean => {
  if (!dobString) return false;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 13;
};

const LoginModal = ({ onClose, onBack, onSuccess, onLogin, initialMode = 'signup' }: any) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referral, setReferral] = useState('');
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('auto_fill_premium_code') || '');
  const [tosAccepted, setTosAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Track where mouse down started so dragging text inside an input to the backdrop never closes the modal
  const mouseDownOnBackdrop = useRef(false);

  const handleClose = () => {
    if (onClose) onClose();
    else if (onBack) onBack();
  };

  const handleAuthSuccess = () => {
    setTimeout(() => {
      window.dispatchEvent(new Event('profileUpdated'));
    }, 50);
    if (onSuccess) onSuccess();
    if (onLogin) onLogin();
    if (onClose) onClose();
    else if (onBack) onBack();
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('auto_fill_premium_code');
    if (savedCode) {
      setAccessCode(savedCode);
      setIsSignUp(true);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const submittedEmail = ((formData.get('email') as string) || email).replace(/\s+/g, '').toLowerCase();
    const submittedPassword = (formData.get('password') as string) || password;

    if (!submittedEmail || !submittedPassword) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const submittedFirstName = ((formData.get('firstName') as string) || firstName).trim();
        const submittedLastName = ((formData.get('lastName') as string) || lastName).trim();
        const submittedUsername = ((formData.get('username') as string) || username).trim();
        const submittedCountry = (formData.get('country') as string) || country;
        const submittedStreetAddress = ((formData.get('streetAddress') as string) || streetAddress).trim();
        const submittedDob = ((formData.get('dateOfBirth') as string) || dateOfBirth).trim();
        const submittedPhone = ((formData.get('phoneNumber') as string) || phoneNumber).trim();
        const submittedReferral = (formData.get('referral') as string) || referral;
        const cleanCode = (((formData.get('accessCode') as string) ?? accessCode) || '').trim().toUpperCase();

        // COPPA 13+ Check
        if (submittedDob && isUnderThirteen(submittedDob)) {
          setError('You must be at least 13 years old to create a Saturday AM account.');
          setLoading(false);
          return;
        }

        if (submittedStreetAddress && isPoBoxAddress(submittedStreetAddress)) {
          setError('P.O. Boxes are not permitted. Please enter a physical residential or street address.');
          setLoading(false);
          return;
        }

        if (!tosAccepted) {
          setError('You must confirm you are 13+ and agree to the Terms of Service & Privacy Policy.');
          setLoading(false);
          return;
        }

        if (submittedPassword.length < 10) {
          setError('Password must be at least 10 characters long.');
          setLoading(false);
          return;
        }

        if (!submittedUsername) {
          setError('Please choose a username.');
          setLoading(false);
          return;
        }

        const isVulgar = containsProfanity(submittedUsername);
        if (isVulgar) {
          setError('That username is not allowed. Please choose another one.');
          setLoading(false);
          return;
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', submittedUsername)
          .maybeSingle();

        if (existingUser) {
          setError('That username is already taken! Please choose another one.');
          setLoading(false);
          return;
        }

        // --- VALIDATE PROMO / 1-YEAR PREMIUM CODE BEFORE SIGNUP ---
        let codeType: 'none' | 'annual_premium' | 'standard_rpc' | 'standard_table' = 'none';
        let grantsPremium = false;
        let standardPromoRow: any = null;

        if (cleanCode) {
          let isAlreadyUsed = false;

          // 1. Check check_premium_code_status RPC
          const { data: batchStatus, error: batchCheckErr } = await supabase.rpc('check_premium_code_status', {
            code_to_test: cleanCode
          });

          if (!batchCheckErr && (batchStatus === 'VALID' || batchStatus === 'UNUSED' || batchStatus === true)) {
            codeType = 'annual_premium';
            grantsPremium = true;
          } else if (!batchCheckErr && batchStatus === 'USED') {
            isAlreadyUsed = true;
          }

          // 2. Fallback: Check fetch_premium_ledger (same RPC used in AdminDashboard)
          if (codeType === 'none' && !isAlreadyUsed) {
            const { data: ledgerData } = await supabase.rpc('fetch_premium_ledger');
            if (Array.isArray(ledgerData)) {
              const foundInLedger = ledgerData.find(
                (item: any) => String(item.code || '').trim().toUpperCase() === cleanCode
              );
              if (foundInLedger) {
                if (foundInLedger.is_used) {
                  isAlreadyUsed = true;
                } else {
                  codeType = 'annual_premium';
                  grantsPremium = true;
                }
              }
            }
          }

          // 3. Fallback: Check validate_access_code RPC
          if (codeType === 'none' && !isAlreadyUsed) {
            const { data: valRes, error: valErr } = await supabase.rpc('validate_access_code', {
              p_code: cleanCode
            });
            if (!valErr && valRes?.valid) {
              codeType = 'standard_rpc';
              if (valRes.tier === 'premium') grantsPremium = true;
            }
          }

          // 4. Fallback: Check standard promo_codes table
          if (codeType === 'none' && !isAlreadyUsed) {
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
                codeType = 'standard_table';
                standardPromoRow = promoRow;
                if (promoRow.tier === 'premium') grantsPremium = true;
              }
            }
          }

          if (isAlreadyUsed) {
            setError('This promo code has already been redeemed or has expired.');
            setLoading(false);
            return;
          }

          if (codeType === 'none') {
            setError('Invalid Promo or Access Code. Please check the code and try again.');
            setLoading(false);
            return;
          }
        }

        // --- CREATE SUPABASE AUTH ACCOUNT ---
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: submittedEmail,
          password: submittedPassword,
          options: {
            data: {
              first_name: submittedFirstName,
              last_name: submittedLastName,
              username: submittedUsername,
              county: submittedCountry,
              country: submittedCountry,
              street_address: submittedStreetAddress,
              date_of_birth: submittedDob,
              phone_number: submittedPhone,
              referral_source: submittedReferral,
              is_premium: grantsPremium
            },
            emailRedirectTo: `${window.location.origin}/?action=login`
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        // --- CREATE PROFILE & REDEEM CODE ---
        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            first_name: submittedFirstName,
            last_name: submittedLastName,
            username: submittedUsername,
            email: submittedEmail,
            county: submittedCountry,
            country: submittedCountry,
            street_address: submittedStreetAddress || null,
            date_of_birth: submittedDob || null,
            phone_number: submittedPhone || null,
            referral_source: submittedReferral,
            is_premium: grantsPremium,
            super_hypes_left: grantsPremium ? 3 : 1,
            tos_accepted: true,
            tos_accepted_at: new Date().toISOString()
          }, { onConflict: 'id' });

          if (cleanCode) {
            try {
              if (codeType === 'annual_premium') {
                await supabase.rpc('redeem_premium_code', { promo_code: cleanCode });
              } else if (codeType === 'standard_rpc') {
                await supabase.rpc('redeem_access_code', {
                  p_code: cleanCode,
                  p_user_id: authData.user.id
                });
              } else if (codeType === 'standard_table' && standardPromoRow) {
                await supabase
                  .from('promo_codes')
                  .update({ times_used: (standardPromoRow.times_used || 0) + 1 })
                  .eq('id', standardPromoRow.id);
              }
              localStorage.removeItem('auto_fill_premium_code');
            } catch (codeErr) {
              console.error('Error finalizing promo code redemption:', codeErr);
            }
          }
        }

        if (authData?.session) {
          setLoading(false);
          handleAuthSuccess();
        } else {
          setSuccessMsg(
            grantsPremium
              ? 'Pro Account created with your Promo Code! Please check your email inbox to confirm your registration.'
              : 'Account created! Please check your email inbox to confirm your registration.'
          );
          setIsSignUp(false);
          setPassword('');
          setLoading(false);
        }
      } else {
        // --- LOGIN FLOW ---
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: submittedEmail,
          password: submittedPassword,
        });

        if (loginError) {
          console.error('Login Error from Supabase:', loginError);
          setError(loginError.message);
          setLoading(false);
        } else if (loginData?.session || loginData?.user) {
          setLoading(false);
          handleAuthSuccess();
        } else {
          setError('Unable to sign in. Please verify your email and password.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Auth Exception:', err);
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submittedEmail = ((formData.get('email') as string) || email).trim().toLowerCase();

    if (!submittedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
      redirectTo: window.location.origin,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMsg('If an account exists, a password reset link has been sent to that email.');
      setTimeout(() => {
        setIsForgotPassword(false);
        setSuccessMsg('');
      }, 5000);
    }
    setLoading(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
        onMouseDown={(e) => {
          mouseDownOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
            handleClose();
          }
          mouseDownOnBackdrop.current = false;
        }}
      >
        <div
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer z-20 p-1"
            aria-label="Close"
          >
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
                name="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                required
              />
              {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-950/40 border border-red-800 rounded">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded mt-2 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {isSignUp && (
                <>
                  <div className="flex gap-2">
                    <input
                      name="firstName"
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-1/2 bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                      required
                    />
                    <input
                      name="lastName"
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-1/2 bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                      required
                    />
                  </div>

                  <input
                    name="username"
                    type="text"
                    placeholder="Choose a Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={15}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                    required
                  />

                  <select
                    name="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-zinc-400 text-sm focus:outline-none focus:border-[#fe9a00] transition-colors cursor-pointer"
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
                    name="referral"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 rounded text-zinc-400 text-sm focus:outline-none focus:border-[#fe9a00] transition-colors cursor-pointer"
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

                  {/* PROMO / ANNUAL PREMIUM CODE FIELD */}
                  <div className="relative">
                    <Key className="w-4 h-4 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      name="accessCode"
                      type="text"
                      placeholder="PROMO OR 1-YEAR PRO CODE (OPTIONAL)"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value.toUpperCase());
                        if (error) setError('');
                      }}
                      className="w-full bg-black border border-zinc-700 pl-9 pr-3 py-3 rounded text-[#fe9a00] font-black uppercase tracking-widest text-xs focus:outline-none focus:border-[#fe9a00] transition-colors placeholder:text-zinc-600 placeholder:font-bold"
                    />
                  </div>

                  {/* IF SIGNING UP WITH A PRO CODE, COLLECT SHIPPING / DOB / PHONE */}
                  {accessCode.trim().length > 0 && (
                    <div className="p-3 bg-zinc-950 border border-[#fe9a00]/40 rounded-xl space-y-2.5 animate-fade-in">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                        Pro Subscriber Prize Shipping Info (No P.O. Boxes)
                      </p>
                      <input
                        name="streetAddress"
                        type="text"
                        placeholder="Physical Street Address (City, State, ZIP)"
                        value={streetAddress}
                        onChange={(e) => {
                          setStreetAddress(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full bg-black border border-zinc-700 p-2.5 rounded text-white text-xs focus:outline-none focus:border-[#fe9a00]"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Date of Birth (13+)</label>
                          <input
                            name="dateOfBirth"
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-xs focus:outline-none focus:border-[#fe9a00]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Phone Number</label>
                          <input
                            name="phoneNumber"
                            type="tel"
                            placeholder="Phone Number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-xs focus:outline-none focus:border-[#fe9a00]"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                required
              />

              <div className="relative flex flex-col">
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 pr-10 rounded text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                    className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest text-right mt-2 transition-colors cursor-pointer"
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
                      className="mt-0.5 w-4 h-4 accent-[#fe9a00] bg-black border-zinc-700 rounded cursor-pointer shrink-0"
                      required
                    />
                    <label htmlFor="tos" className="text-[11px] text-zinc-400 font-bold leading-relaxed cursor-pointer select-none">
                      I confirm that I am <strong>at least 13 years old</strong> (or 16+ in the EU/UK) and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowTosModal(true); }}
                        className="text-[#fe9a00] hover:text-white underline transition-colors font-black uppercase tracking-wider text-[10px] cursor-pointer"
                      >
                        Terms of Service, Privacy Policy &amp; Data Disclosures
                      </button>.
                    </label>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-700 rounded-lg text-red-300 text-xs font-bold leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded mt-2 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Create Account' : 'Log In')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-zinc-800 pt-4">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
                className="text-white hover:text-[#fe9a00] text-xs font-black uppercase tracking-widest mt-2 transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}
                className="text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {isSignUp ? (
                  <>Already have an account? <span className="text-[#fe9a00] underline ml-1">Log in here</span></>
                ) : (
                  <>Don't have an account? <span className="text-[#fe9a00] underline ml-1">Sign up here</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- TERMS OF SERVICE & PRIVACY POLICY MODAL --- */}
      {showTosModal && (
        <div className="fixed inset-0 z-[8000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 p-6 sm:p-8 rounded-2xl w-full max-w-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
            <button
              type="button"
              onClick={() => setShowTosModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10 bg-black/50 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl sm:text-2xl font-black italic uppercase text-[#fe9a00] mb-4 border-b border-zinc-800 pb-4 tracking-tighter pr-8">
              Terms of Service &amp; Privacy Disclosures
            </h3>

            <div className="overflow-y-auto pr-3 space-y-5 text-xs text-zinc-300 font-medium custom-scrollbar flex-1 pb-4 leading-relaxed">
              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-1 text-[10px]">
                  1. Age Requirement (COPPA 13+ Compliance)
                </h4>
                <p>
                  You must be at least 13 years old (or 16+ in the EEA/UK) to create a Saturday AM account. We do not knowingly collect personal information from children under 13.
                </p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-1 text-[10px]">
                  2. Data Collection &amp; Third-Party Providers
                </h4>
                <p>
                  We collect your name, username, email, country, reading history, Hypes, comments, and app telemetry to operate leaderboards and sync your library. We do not sell your personal data. Data is processed securely through our infrastructure partners: <strong>Supabase</strong> (database &amp; authentication), <strong>Stripe</strong> (payment processing), <strong>Cloudflare R2</strong> (media CDN), <strong>Resend</strong> (transactional emails), and <strong>Shopify</strong> (merchandise). You may permanently delete your account and all associated data at any time in <strong>Settings &rarr; Delete Account</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-1 text-[10px]">
                  3. AI Moderation &amp; No AI Model Training
                </h4>
                <p>
                  Community comments and Smart Reactions are screened using automated filters and AI moderation to prevent hate speech and harassment. Saturday AM never uses your personal data, comments, or creator artwork to train generative AI models.
                </p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-1 text-[10px]">
                  4. Subscriptions, 3-Day Free Trials &amp; 1-Click Cancellation
                </h4>
                <p>
                  Saturday AM+ Pro memberships ($1.99/mo or $35.99/yr; $20.00/yr with referral code) auto-renew unless canceled. Referral annual trials include a 3-Day Free Trial that automatically converts to $20.00/yr after 72 hours unless canceled. You can cancel anytime in 1 click inside <strong>Settings &rarr; Cancel Subscription</strong>. Virtual items (Hypes, Fandom Scores, digital signatures) have no cash value.
                </p>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-white mb-1 text-[10px]">
                  5. Binding Individual Arbitration &amp; Class-Action Waiver
                </h4>
                <p>
                  By creating an account, you agree that any dispute arising from or relating to Saturday AM shall be resolved exclusively through binding individual arbitration, and you waive any right to participate in a class-action lawsuit.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-4">
              <button
                type="button"
                onClick={() => { setTosAccepted(true); setShowTosModal(false); }}
                className="flex-1 py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer text-xs"
              >
                I Confirm I Am 13+ &amp; Agree to Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;