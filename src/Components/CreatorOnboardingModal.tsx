import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, FileText, Lock, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

export const CREATOR_TERMS_VERSION = '2026.2';

export const CREATOR_TERMS_CLAUSES = [
  {
    number: '1',
    title: 'Good-Faith Monetization, Eligibility & At-Will Termination',
    body: 'Participation in the Saturday AM Creator Studio, including access to fan donations ("Tips"), referral bonuses, and any other revenue-sharing or monetization features, is offered by Saturday AM / MyFutprint Entertainment LLC in good faith as a discretionary privilege, not an entitlement. Being granted access to the platform or Creator Studio does not guarantee approval for monetization. Saturday AM reserves the absolute right, in its sole discretion, to deny entry into, withhold, modify, suspend, or terminate access to any monetization feature, referral program, or this agreement for any creator at any time, for any reason, with or without prior notice.'
  },
  {
    number: '2',
    title: 'Independent Contractor & Tax Responsibility',
    body: 'You acknowledge that you are an independent creator and not an employee, partner, or agent of Saturday AM. You are solely and exclusively responsible for reporting, filing, and paying all applicable federal, state, local, or international income taxes, self-employment taxes, and any other duties or fees assessed on funds you receive through donations, tips, or referrals.'
  },
  {
    number: '3',
    title: 'Limitation of Liability on Payouts',
    body: 'All fan donations and payouts are processed via third-party payment processors (such as Stripe). Saturday AM makes no guarantees regarding minimum earnings and shall not be held liable for delayed, failed, reversed, disputed, or chargeback transactions, payment processor holds or outages, or third-party processing fees.'
  },
  {
    number: '4',
    title: 'Intellectual Property, AI Disclosures & Third-Party Claims',
    body: 'By submitting your work or allowing your work to be hosted on the new Saturday AM MANGA HYPE platform and other various publications related to it, you do not transfer or forfeit your intellectual property ownership rights to Saturday AM / MyFutprint Entertainment LLC, unless a separate written publishing or licensing agreement has already been executed between you and Saturday AM. By participating, you represent and warrant that you hold all necessary rights to the materials provided, that they do not infringe or misappropriate any third-party intellectual property, and that you have disclosed any AI-generated or AI-assisted elements to Saturday AM in advance. If the rights to any property associated with your work belong to another person or entity (or violate applicable IP or AI policies), you are solely and exclusively liable for any resulting breach, infringement, or legal claims, and you agree to fully indemnify and hold Saturday AM harmless from any damages, costs, or disputes (including disclosing relevant submission records when reasonably necessary to resolve claims). Both you and Saturday AM retain the right to restrict monetization, remove, or unpublish your series or terminate Creator Studio access at any time without penalty or liability.'
  }
];

export const hasAcceptedCreatorTerms = (user: any): boolean => {
  if (!user) return false;
  if (user.is_admin) return true;
  if (user.creator_terms_accepted_at) return true;
  try {
    const localTs = localStorage.getItem(`am_creator_tos_accepted_${user.id}`);
    return Boolean(localTs);
  } catch {
    return false;
  }
};

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  currentUser: any;
  inviteCode?: string | null;
  onSuccess: (updatedProfile: any) => void;
  onCancel?: () => void;
  onRequireLogin: () => void;
}

export const CreatorOnboardingModal: React.FC<CreatorOnboardingModalProps> = ({
  isOpen,
  currentUser,
  inviteCode,
  onSuccess,
  onCancel,
  onRequireLogin
}) => {
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanCode = String(inviteCode || '').trim().toUpperCase();

  const handleAcceptAndActivate = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    let activeUser = currentUser;
    if (!activeUser?.id) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        activeUser = {
          id: authData.user.id,
          email: authData.user.email,
          username: authData.user.user_metadata?.username || 'Creator',
          ...currentUser
        };
      }
    }

    if (!activeUser?.id) {
      onRequireLogin();
      return;
    }

    if (!agreed) {
      setErrorMsg('You must check the box to agree to the Creator Studio Terms & Conditions.');
      return;
    }
    if (!signatureName.trim()) {
      setErrorMsg('Please type your full legal or creator name to sign this agreement.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let targetCreatorName = activeUser.linked_creator_name || '';
      let targetRole =
        activeUser.role && activeUser.role !== 'reader' && activeUser.role !== 'revoked_creator'
          ? activeUser.role
          : 'creator';

      // 1. If redeeming a one-time Creator Invite Code, validate & consume it
      if (cleanCode) {
        const { data: codeRow } = await supabase
          .from('promo_codes')
          .select('*')
          .ilike('code', cleanCode)
          .maybeSingle();

        if (codeRow) {
          const isExpired = codeRow.expires_at && new Date() > new Date(codeRow.expires_at);
          const isDepleted =
            codeRow.max_uses && Number(codeRow.times_used || 0) >= Number(codeRow.max_uses);

          if (isExpired || isDepleted) {
            throw new Error(
              'This one-time Creator Invite link has already been redeemed or has expired.'
            );
          }

          const rawOrderNum = String(codeRow.order_number || '');
          const rawTier = String(codeRow.tier || '');

          if (rawOrderNum.startsWith('CREATOR_INVITE:')) {
            const parts = rawOrderNum.split(':');
            targetCreatorName = parts[1] || codeRow.buyer_name || targetCreatorName;
            targetRole = parts[2] || 'creator';
          } else if (rawTier.startsWith('creator_invite:')) {
            const parts = rawTier.split(':');
            targetCreatorName = parts[1] || codeRow.buyer_name || targetCreatorName;
            targetRole = parts[2] || 'creator';
          } else if (codeRow.buyer_name) {
            targetCreatorName = codeRow.buyer_name;
          }

          // Mark one-time invite code as used (try direct update first, then RPC fallback if RLS restricts promo_codes)
          const { error: markUsedErr } = await supabase
            .from('promo_codes')
            .update({
              times_used: Number(codeRow.times_used || 0) + 1,
              buyer_email: activeUser.email || null,
              buyer_name: signatureName.trim()
            })
            .eq('id', codeRow.id);

          if (markUsedErr) {
            try {
              await supabase.rpc('redeem_access_code', {
                p_code: cleanCode,
                p_user_id: activeUser.id
              });
            } catch {
              // Ignore RPC fallback error
            }
          }
        }
      }

      const acceptedIso = new Date().toISOString();
      const finalCreatorName = targetCreatorName || signatureName.trim();

      // 2. Upgrade user profile to PLUS + Creator Studio role
      const baseUpdatePayload: Record<string, any> = {
        id: activeUser.id,
        email: activeUser.email || null,
        username: activeUser.username || finalCreatorName,
        is_premium: true,
        role: targetRole,
        linked_creator_name: finalCreatorName,
        super_hypes_left: 3,
        hypes_remaining: 3,
        updated_at: acceptedIso
      };

      const { error: fullUpdateErr } = await supabase
        .from('profiles')
        .upsert(
          {
            ...baseUpdatePayload,
            creator_terms_accepted_at: acceptedIso
          },
          { onConflict: 'id' }
        );

      if (fullUpdateErr) {
        const { error: fallbackErr } = await supabase
          .from('profiles')
          .upsert(baseUpdatePayload, { onConflict: 'id' });

        if (fallbackErr) {
          await supabase
            .from('profiles')
            .update({
              is_premium: true,
              role: targetRole,
              linked_creator_name: finalCreatorName,
              super_hypes_left: 3,
              hypes_remaining: 3
            })
            .eq('id', activeUser.id);
        }
      }

      // Clear any pending invite metadata from Supabase Auth user_metadata and localStorage
      localStorage.setItem(`am_creator_tos_accepted_${activeUser.id}`, acceptedIso);
      localStorage.removeItem('am_pending_creator_invite');

      try {
        await supabase.auth.updateUser({
          data: {
            pending_creator_invite: null,
            creator_terms_accepted_at: acceptedIso,
            linked_creator_name: finalCreatorName,
            role: targetRole,
            is_premium: true
          }
        });
      } catch {
        // Non-blocking user_metadata update
      }

      try {
        await supabase.from('telemetry_events').insert([
          {
            user_id: activeUser.id,
            event_type: 'creator_terms_accepted',
            metadata: {
              signed_name: signatureName.trim(),
              linked_creator_name: finalCreatorName,
              invite_code: cleanCode || 'direct_studio_gate',
              terms_version: CREATOR_TERMS_VERSION,
              accepted_at: acceptedIso
            }
          }
        ]);
      } catch {
        // Non-blocking audit log
      }

      window.dispatchEvent(new Event('profileUpdated'));

      onSuccess({
        ...activeUser,
        ...baseUpdatePayload,
        creator_terms_accepted_at: acceptedIso
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate Creator Studio access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[8500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(254,154,0,0.25)] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-amber-950/20 to-zinc-950 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fe9a00]/15 border border-[#fe9a00]/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#fe9a00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-2 py-0.5 rounded">
                  Mandatory Creator Onboarding
                </span>
                {cleanCode && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Invite: {cleanCode}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-white mt-1">
                Creator Studio & Monetization Terms
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {!currentUser?.id ? (
            <div className="bg-zinc-900 border border-[#fe9a00]/50 rounded-2xl p-6 text-center space-y-4">
              <Lock className="w-10 h-10 text-[#fe9a00] mx-auto" />
              <h3 className="text-base font-black uppercase text-white">
                Sign In or Create Your Account First
              </h3>
              <p className="text-xs text-zinc-300 font-bold leading-relaxed max-w-md mx-auto">
                Your one-time Creator Onboarding Invite (<span className="text-[#fe9a00] font-mono">{cleanCode}</span>) is saved and ready! Log in or create an account to review the Creator Terms and unlock <span className="text-white">Saturday AM+ PLUS</span> and <span className="text-white">Creator Studio</span>.
              </p>
              <button
                type="button"
                onClick={onRequireLogin}
                className="w-full max-w-xs mx-auto py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(254,154,0,0.3)] block"
              >
                Log In / Sign Up to Redeem
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#fe9a00] shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                  Welcome to Saturday AM! Before accessing the <span className="text-white">Creator Studio</span> and complimentary <span className="text-[#fe9a00]">Saturday AM+ PLUS</span> privileges, please review and accept the Creator Studio & Monetization Terms of Participation below.
                </p>
              </div>

              {/* Scrollable Legal Clauses */}
              <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4 max-h-72 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Terms of Participation (v{CREATOR_TERMS_VERSION})
                  </span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    MyFutprint Entertainment LLC / Saturday AM
                  </span>
                </div>

                {CREATOR_TERMS_CLAUSES.map(clause => (
                  <div key={clause.number} className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      {clause.number}. {clause.title}
                    </h4>
                    <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                      {clause.body}
                    </p>
                  </div>
                ))}
              </div>

              {/* Electronic Signature & Checkbox */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Electronic Signature (Type Your Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raymond Brown"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#fe9a00] rounded cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-bold text-zinc-200 leading-relaxed">
                    I have read, understand, and agree to the <strong className="text-[#fe9a00]">Saturday AM Creator Studio & Monetization Terms of Participation</strong>, including the discretionary nature of monetization, my sole responsibility for taxes, third-party payment processor limitations, and intellectual property representations.
                  </span>
                </label>
              </div>

              {errorMsg && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 flex items-center gap-2.5 text-xs font-bold text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-black flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Exit for Now
            </button>
          )}
          {currentUser?.id && (
            <button
              type="button"
              onClick={handleAcceptAndActivate}
              disabled={submitting || !agreed || !signatureName.trim()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(254,154,0,0.35)] disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Activating Studio...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Agree & Enter Creator Studio
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};