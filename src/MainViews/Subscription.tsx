import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Key,
  Crown,
  Gift,
  Loader2,
  CheckCircle2,
  Lock,
  Layers,
  PenTool,
  UserCheck,
  Flame
} from 'lucide-react';
import { supabase } from '../supabase';
import { doCreatorNamesMatch } from '../VirtualProfile/BingoBook';

export interface BundlePayload {
  include_1yr_sub?: boolean;
  card_skin_id?: string;
  card_skin_name?: string;
  card_skin_url?: string;
  avatar_urls?: string[];
  avatar_names?: string[];
  creator_autograph?: string;
  bonus_hypes?: number;
  bundle_title?: string;
}

export const Subscription = ({ userTier, onBack, onLoginClick, onNavigate }: any) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(userTier === 'premium');
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [loadingBundleId, setLoadingBundleId] = useState<string | null>(null);

  const [themedBundles, setThemedBundles] = useState<any[]>([]);
  const [masterSignatures, setMasterSignatures] = useState<Record<string, string>>({});

  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const [referralCode, setReferralCode] = useState('');

  // Shared helper to unlock a creator's Bingo Book autograph
  const unlockFlashContestAutograph = useCallback(async (userId: string, creatorNameRaw?: string) => {
    const targetCreator = String(creatorNameRaw || '').trim();
    if (!targetCreator) return null;

    try {
      const { data: existingLogs } = await supabase
        .from('bingo_signatures_log')
        .select('creator_name')
        .eq('user_id', userId);

      const alreadyHas = (existingLogs || []).some((row: any) =>
        doCreatorNamesMatch(row.creator_name, targetCreator)
      );

      if (!alreadyHas) {
        await supabase.from('bingo_signatures_log').insert([
          {
            user_id: userId,
            creator_name: targetCreator,
            event_name: 'Themed Annual Bundle',
            signature_type: 'Standard'
          }
        ]);
      }

      const { data: allSigs } = await supabase
        .from('creator_signatures')
        .select('creator_name, signature_url');

      const matchedSig = (allSigs || []).find((r: any) =>
        doCreatorNamesMatch(r.creator_name, targetCreator)
      );

      const localHunts: string[] = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
      if (!localHunts.some(h => doCreatorNamesMatch(h, targetCreator))) {
        localHunts.push(targetCreator);
      }
      if (matchedSig?.creator_name && !localHunts.includes(matchedSig.creator_name)) {
        localHunts.push(matchedSig.creator_name);
      }
      localStorage.setItem('am_bingo_hunts', JSON.stringify(localHunts));

      if (matchedSig?.signature_url) {
        const localSigs: Record<string, string> = JSON.parse(
          localStorage.getItem('am_bingo_sigs') || '{}'
        );
        localSigs[targetCreator] = matchedSig.signature_url;
        localSigs[matchedSig.creator_name] = matchedSig.signature_url;
        localStorage.setItem('am_bingo_sigs', JSON.stringify(localSigs));
      }

      window.dispatchEvent(new Event('bingoUpdated'));
      return targetCreator;
    } catch (err) {
      console.error('Error unlocking bundle autograph:', err);
      return targetCreator;
    }
  }, []);

  // Unified reward granter for both Custom Bundle Codes and $30-$35 Themed Bundle Purchases
  const grantBundleRewardsToUser = useCallback(
    async (userId: string, bundle: BundlePayload, alreadyPremium: boolean) => {
      const { data: currentProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const now = new Date();
      const includeSub = bundle.include_1yr_sub !== false;
      const baseDate =
        currentProf?.premium_until && new Date(currentProf.premium_until) > now
          ? new Date(currentProf.premium_until)
          : now;
      const nextYearDate = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const currentHypes = Number(
        currentProf?.hypes_remaining ?? currentProf?.super_hypes_left ?? 3
      );
      const extraHypes = Math.max(0, Number(bundle.bonus_hypes || 0));
      const stackedSubHypes =
        includeSub && alreadyPremium && extraHypes === 0 ? 3 : extraHypes;
      const newHypeBalance =
        (includeSub && !alreadyPremium ? Math.max(3, currentHypes) : currentHypes) +
        stackedSubHypes;

      const unlockedParts: string[] = [];
      let bonusFandomPts = includeSub ? (alreadyPremium ? 30 : 15) : 0;

      const profilePatch: Record<string, any> = {};

      if (includeSub) {
        profilePatch.is_premium = true;
        profilePatch.premium_until = nextYearDate;
        unlockedParts.push(alreadyPremium ? '+1 Year PLUS Extended' : '1-Year PLUS Pass');
      }

      if (stackedSubHypes > 0 || includeSub) {
        profilePatch.hypes_remaining = newHypeBalance;
        profilePatch.super_hypes_left = newHypeBalance;
        if (stackedSubHypes > 0) {
          unlockedParts.push(`+${stackedSubHypes} Bonus Hypes`);
        }
      }

      // 1. Unlock & Equip Card Skin
      if (bundle.card_skin_id) {
        const existingSkins: string[] = Array.isArray(currentProf?.unlocked_skins)
          ? currentProf.unlocked_skins
          : [];
        const skinIdStr = String(bundle.card_skin_id);
        if (!existingSkins.includes(skinIdStr)) {
          profilePatch.unlocked_skins = [...existingSkins, skinIdStr];
        }
        profilePatch.card_skin_id = bundle.card_skin_id;

        try {
          const localSkins: string[] = JSON.parse(
            localStorage.getItem('am_unlocked_skins') || '[]'
          );
          if (!localSkins.includes(skinIdStr)) {
            localSkins.push(skinIdStr);
            localStorage.setItem('am_unlocked_skins', JSON.stringify(localSkins));
          }
        } catch {
          // ignore
        }
        unlockedParts.push(`${bundle.card_skin_name || 'Themed'} Hype Card Skin`);
        bonusFandomPts += 15;
      }

      // 2. Unlock 3 Themed Character Avatars (& Equip #1)
      const validAvatars = (bundle.avatar_urls || []).filter(Boolean);
      if (validAvatars.length > 0) {
        const existingAvatars: string[] = Array.isArray(currentProf?.unlocked_avatars)
          ? currentProf.unlocked_avatars
          : [];
        const mergedAvatars = Array.from(new Set([...existingAvatars, ...validAvatars]));
        profilePatch.unlocked_avatars = mergedAvatars;
        profilePatch.avatar_url = validAvatars[0];

        try {
          const localAvs: string[] = JSON.parse(
            localStorage.getItem('am_unlocked_avatars') || '[]'
          );
          const mergedLocal = Array.from(new Set([...localAvs, ...validAvatars]));
          localStorage.setItem('am_unlocked_avatars', JSON.stringify(mergedLocal));
        } catch {
          // ignore
        }
        unlockedParts.push(
          `${validAvatars.length} Character Avatar${validAvatars.length === 1 ? '' : 's'}`
        );
        bonusFandomPts += validAvatars.length * 10;
      }

      // 3. Unlock Creator / Event Signature Badge
      if (bundle.creator_autograph) {
        const unlockedCreator = await unlockFlashContestAutograph(
          userId,
          bundle.creator_autograph
        );
        if (unlockedCreator) {
          unlockedParts.push(`${unlockedCreator} Gold Signature Badge`);
          bonusFandomPts += 25;
        }
      }

      profilePatch.fandom_score = (Number(currentProf?.fandom_score) || 0) + bonusFandomPts;

      let { error: profErr } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', userId);

      // Graceful fallback if optional array columns haven't been created in SQL yet
      if (profErr) {
        const fallbackPatch: Record<string, any> = {
          is_premium: includeSub ? true : Boolean(currentProf?.is_premium),
          hypes_remaining: newHypeBalance,
          super_hypes_left: newHypeBalance,
          fandom_score: profilePatch.fandom_score
        };
        if (profilePatch.avatar_url) fallbackPatch.avatar_url = profilePatch.avatar_url;
        if (profilePatch.card_skin_id) fallbackPatch.card_skin_id = profilePatch.card_skin_id;
        await supabase.from('profiles').update(fallbackPatch).eq('id', userId);
      }

      if (includeSub) setIsPremium(true);
      window.dispatchEvent(new Event('profileUpdated'));
      return unlockedParts;
    },
    [unlockFlashContestAutograph]
  );

  useEffect(() => {
    const savedPromo = localStorage.getItem('auto_fill_premium_code');
    if (savedPromo) {
      setPromoCode(savedPromo);
      localStorage.removeItem('auto_fill_premium_code');
    }

    const savedRef = localStorage.getItem('am_referral_code');
    if (savedRef) {
      setReferralCode(savedRef);
    }

    // Load active Themed Annual Bundles & Master Signatures
    Promise.all([
      supabase
        .from('themed_annual_bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('creator_signatures').select('creator_name, signature_url')
    ]).then(([{ data: bundleRows }, { data: sigRows }]) => {
      if (bundleRows) setThemedBundles(bundleRows);
      if (sigRows) {
        const map: Record<string, string> = {};
        sigRows.forEach((r: any) => {
          if (r.creator_name && r.signature_url) {
            map[r.creator_name.trim()] = r.signature_url;
          }
        });
        setMasterSignatures(map);
      }
    });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUser(profile || { id: user.id, email: user.email });
        if (profile?.is_premium) setIsPremium(true);

        const params = new URLSearchParams(window.location.search);
        const bundleIdParam = params.get('bundle_id');
        if (
          (params.get('status') === 'sub_success' ||
            params.get('sub_status') === 'success' ||
            params.get('bundle_status') === 'success') &&
          bundleIdParam
        ) {
          const { data: purchasedBundle } = await supabase
            .from('themed_annual_bundles')
            .select('*')
            .eq('id', bundleIdParam)
            .maybeSingle();

          if (purchasedBundle) {
            const parts = await grantBundleRewardsToUser(
              user.id,
              {
                include_1yr_sub: true,
                card_skin_id: purchasedBundle.card_skin_id,
                card_skin_name: purchasedBundle.card_skin_name,
                avatar_urls: purchasedBundle.avatar_urls || [],
                creator_autograph: purchasedBundle.creator_autograph,
                bonus_hypes: purchasedBundle.bonus_hypes || 0,
                bundle_title: purchasedBundle.title
              },
              Boolean(profile?.is_premium)
            );
            setRedeemSuccess(
              `${purchasedBundle.title} Activated! Unlocked: ${parts.join(' • ')}!`
            );
          }
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('status') === 'sub_success' || params.get('sub_status') === 'success') {
        setIsPremium(true);
        setRedeemSuccess('Welcome to Saturday AM+ PLUS! Your membership is now active.');
        window.dispatchEvent(new Event('profileUpdated'));
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
  }, [userTier, grantBundleRewardsToUser]);

  const handleStartSubscription = async (plan: 'monthly' | 'annual') => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setIsLoadingCheckout(true);
    try {
      const cleanRef = referralCode.trim().toUpperCase();
      if (cleanRef) {
        localStorage.setItem('am_referral_code', cleanRef);
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'subscription',
          plan,
          billingCycle: plan,
          userId: activeUserId,
          userEmail: user?.email || currentUser?.email,
          referralCode: cleanRef || undefined,
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from Stripe.');
      }
    } catch (err: any) {
      alert('Unable to start Stripe checkout: ' + (err.message || 'Please try again.'));
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  // Start Checkout for a $30-$35 Themed Annual Subscription Bundle
  const handleBuyThemedBundle = async (bundle: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setLoadingBundleId(bundle.id);
    try {
      const returnWithBundle = `${window.location.origin}/?view=sub&bundle_status=success&bundle_id=${encodeURIComponent(
        bundle.id
      )}`;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'themed_bundle',
          plan: 'annual',
          billingCycle: 'annual',
          bundleId: bundle.id,
          bundleTitle: bundle.title,
          amountDollars: Number(bundle.price_dollars || 30),
          userId: activeUserId,
          userEmail: user?.email || currentUser?.email,
          returnUrl: returnWithBundle
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from Stripe.');
      }
    } catch (err: any) {
      alert(
        `Unable to start bundle checkout (${err.message || 'Check Stripe Edge Function'}). Tip: You can also redeem this bundle's Access Code (${bundle.promo_code || 'below'}) in the Redeem box!`
      );
    } finally {
      setLoadingBundleId(null);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return;

    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      localStorage.setItem('auto_fill_premium_code', cleanCode);
      if (onLoginClick) onLoginClick();
      return;
    }

    if (cleanCode.startsWith('SAM-CR-')) {
      localStorage.setItem('am_pending_creator_invite', cleanCode);
      window.location.href = `/?creator_invite=${encodeURIComponent(cleanCode)}`;
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const { data: currentProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .maybeSingle();

      const alreadyPremium = Boolean(isPremium || currentProf?.is_premium);

      const { data: promoRow } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (promoRow) {
        const now = new Date();
        if (promoRow.expires_at && new Date(promoRow.expires_at) < now) {
          throw new Error('This bundle or access code has expired.');
        }
        const timesUsed = Number(promoRow.times_used || 0);
        const maxUses = Number(promoRow.max_uses || 1);
        if (timesUsed >= maxUses) {
          throw new Error('All available claims for this code have already been redeemed!');
        }

        const rawBundle: BundlePayload =
          typeof promoRow.bundle_config === 'object' && promoRow.bundle_config !== null
            ? promoRow.bundle_config
            : {};

        const hasCustomRewards = Boolean(
          promoRow.creator_name ||
            rawBundle.creator_autograph ||
            rawBundle.card_skin_id ||
            (rawBundle.avatar_urls && rawBundle.avatar_urls.length > 0) ||
            Number(rawBundle.bonus_hypes || 0) > 0
        );

        // Protect plain 1-Year codes (with zero custom bundle items) from being accidentally wasted by an existing PLUS member
        if (alreadyPremium && !hasCustomRewards) {
          throw new Error(
            'You already have an active Saturday AM+ PLUS membership! Your code was not used so you can save it or gift it to a friend.'
          );
        }

        const { error: updatePromoErr } = await supabase
          .from('promo_codes')
          .update({ times_used: timesUsed + 1 })
          .eq('id', promoRow.id);
        if (updatePromoErr) throw updatePromoErr;

        const unlockedParts = await grantBundleRewardsToUser(
          activeUserId,
          {
            include_1yr_sub: rawBundle.include_1yr_sub !== false,
            card_skin_id: rawBundle.card_skin_id,
            card_skin_name: rawBundle.card_skin_name,
            avatar_urls: rawBundle.avatar_urls || [],
            creator_autograph: rawBundle.creator_autograph || promoRow.creator_name,
            bonus_hypes: rawBundle.bonus_hypes || 0,
            bundle_title: rawBundle.bundle_title
          },
          alreadyPremium
        );

        setPromoCode('');
        setRedeemSuccess(
          `${rawBundle.bundle_title ? `${rawBundle.bundle_title} Unlocked!` : 'Bundle Code Activated!'} You received: ${unlockedParts.join(' + ')}!`
        );
        setIsRedeeming(false);
        return;
      }

      if (alreadyPremium) {
        throw new Error(
          'You already have an active Saturday AM+ PLUS membership! Your store code was not used so you can save it or gift it to a friend.'
        );
      }

      const { data: rpcSuccess, error: rpcErr } = await supabase.rpc('redeem_premium_code', {
        input_code: cleanCode,
        user_uuid: activeUserId
      });

      if (rpcErr || !rpcSuccess) {
        throw new Error('Invalid or already redeemed access code.');
      }

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          hypes_remaining: 3,
          super_hypes_left: 3
        })
        .eq('id', activeUserId);

      setIsPremium(true);
      setPromoCode('');
      setRedeemSuccess('Success! Your Saturday AM+ PLUS membership is now active!');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setRedeemError(err.message || 'Failed to redeem code.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const perks = [
    'Unlock the Entire Manga Vault (All Chapters & Completed Runs)',
    '12-Hour Early Access to New Weekly Chapter Drops',
    '3 Weekly Super Hypes to Boost Your Favorite Series & Creators',
    'Exclusive Animated Avatar Border Frames & Hype Card Skins',
    'Custom Text Smart Comments Directly on Manga Pages',
    '100% Ad-Free Reading Experience Across All Devices'
  ];

  const hasReferralCode = Boolean(referralCode.trim());

  const getSignatureUrlForCreator = (creatorName?: string) => {
    if (!creatorName) return '';
    for (const [k, url] of Object.entries(masterSignatures)) {
      if (url && doCreatorNamesMatch(creatorName, k)) return url;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-28 pt-6 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-all text-xs font-black uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isPremium && (
          <span className="px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500 text-purple-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Crown className="w-3.5 h-3.5 text-[#fe9a00]" /> PLUS Active
          </span>
        )}
      </div>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fe9a00]/15 border border-[#fe9a00]/40 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Saturday AM+ PLUS Membership
        </div>
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-4">
          Read Manga <span className="text-[#fe9a00]">Without Limits</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 font-bold leading-relaxed">
          Unlock every chapter in the Saturday AM vault, read new drops 12 hours early, and support diverse global creators directly.
        </p>
      </div>

      {redeemSuccess && (
        <div className="mb-8 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              Membership & Bundle Rewards Activated!
            </h3>
            <p className="text-xs text-emerald-200 font-bold mt-0.5">{redeemSuccess}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate({ action: 'profile' })}
                className="px-4 py-2 bg-[#fe9a00] text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white cursor-pointer"
              >
                View My Loadout
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white cursor-pointer"
            >
              Start Reading
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          FAST-TRACK SECTION: THEMED ANNUAL SUBSCRIPTION BUNDLES ($30-$35)
      ===================================================================== */}
      {themedBundles.length > 0 && (
        <div className="mb-12 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Gift className="w-5 h-5 text-[#fe9a00]" />
              <div>
                <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white">
                  Special Event & Series <span className="text-[#fe9a00]">Annual Bundles</span>
                </h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  1-Year Full App Pass + Exclusive Card Skin + 3 Character Avatars + Digital Signature Badge
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {themedBundles.map(bundle => {
              const avatars: string[] = Array.isArray(bundle.avatar_urls)
                ? bundle.avatar_urls.filter(Boolean)
                : [];
              const sigUrl = getSignatureUrlForCreator(bundle.creator_autograph);
              const price = Number(bundle.price_dollars || 30);

              return (
                <div
                  key={bundle.id}
                  className="bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-black border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-7 shadow-[0_0_45px_rgba(254,154,0,0.22)] relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                    {/* Left Column: Bundle Info & Visual Loadout Preview */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest mb-2">
                          <Sparkles className="w-3 h-3 fill-black" />
                          {bundle.theme_badge || 'SPECIAL EDITION ANNUAL BUNDLE'}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                          {bundle.title}
                        </h3>
                        {bundle.subtitle && (
                          <p className="text-xs text-zinc-300 font-bold mt-1 leading-relaxed">
                            {bundle.subtitle}
                          </p>
                        )}
                      </div>

                      {/* 4 Included Items Pills */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-[#fe9a00]" /> 1-Year Full App Pass
                        </span>
                        {bundle.card_skin_name && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#fe9a00]" /> {bundle.card_skin_name} Card Skin
                          </span>
                        )}
                        {avatars.length > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#fe9a00]" /> {avatars.length} Exclusive Avatars
                          </span>
                        )}
                        {bundle.creator_autograph && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-[#fe9a00] flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5" /> {bundle.creator_autograph} Signature Badge
                          </span>
                        )}
                        {Number(bundle.bonus_hypes) > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/40 text-[10px] font-black uppercase tracking-wider text-[#fe9a00] flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> +{bundle.bonus_hypes} Bonus Hypes
                          </span>
                        )}
                      </div>

                      {/* Visual Asset Showcase Strip: Card Skin + 3 Avatars + Gold Signature */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        {bundle.card_skin_url && (
                          <div className="flex items-center gap-2.5 bg-black/70 border border-zinc-800 rounded-2xl p-2 pr-3">
                            <img
                              src={bundle.card_skin_url}
                              alt={bundle.card_skin_name || 'Card Skin'}
                              className="w-11 h-16 object-cover rounded-lg border border-[#fe9a00]"
                            />
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00] block">
                                Card Skin
                              </span>
                              <span className="text-[10px] font-black uppercase text-white">
                                {bundle.card_skin_name || 'Exclusive Skin'}
                              </span>
                            </div>
                          </div>
                        )}

                        {avatars.length > 0 && (
                          <div className="flex items-center gap-2.5 bg-black/70 border border-zinc-800 rounded-2xl p-2 pr-3">
                            <div className="flex -space-x-2">
                              {avatars.slice(0, 3).map((avUrl, idx) => (
                                <img
                                  key={idx}
                                  src={avUrl}
                                  alt={`Avatar ${idx + 1}`}
                                  className="w-11 h-11 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900"
                                />
                              ))}
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00] block">
                                Profile Avatars
                              </span>
                              <span className="text-[10px] font-black uppercase text-white">
                                {avatars.length} Included
                              </span>
                            </div>
                          </div>
                        )}

                        {sigUrl && (
                          <div className="flex items-center gap-2.5 bg-black/70 border border-zinc-800 rounded-2xl p-2 px-3">
                            <div className="w-20 h-10 flex items-center justify-center">
                              <div
                                className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-600"
                                style={{
                                  WebkitMaskImage: `url('${sigUrl}')`,
                                  WebkitMaskSize: 'contain',
                                  WebkitMaskRepeat: 'no-repeat',
                                  WebkitMaskPosition: 'center',
                                  maskImage: `url('${sigUrl}')`,
                                  maskSize: 'contain',
                                  maskRepeat: 'no-repeat',
                                  maskPosition: 'center'
                                }}
                              />
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00] block">
                                Gold Autograph
                              </span>
                              <span className="text-[10px] font-black uppercase text-white">
                                {bundle.creator_autograph}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Price & CTA Box */}
                    <div className="lg:w-64 bg-black/90 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                        Themed Annual Pass
                      </span>
                      <div className="flex items-baseline gap-1 my-1.5">
                        <span className="text-4xl font-black italic text-white">${price}</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase">/ year</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold mb-4 leading-relaxed">
                        Includes 1-Yr PLUS ($35.99 value) + all themed cosmetics & signature badge permanently unlocked.
                      </p>
                      <button
                        type="button"
                        disabled={loadingBundleId === bundle.id}
                        onClick={() => handleBuyThemedBundle(bundle)}
                        className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loadingBundleId === bundle.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-black" /> Unlock Bundle (${price})
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard Monthly / Annual Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl inline-flex flex-wrap justify-center items-center gap-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>
              Monthly (<span className="line-through opacity-65 mr-1">$2.99</span>$1.99/mo)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>
              Annual (<span className="line-through opacity-65 mr-1">$35.99</span>$20/yr)
            </span>
            <span className="bg-black text-[#fe9a00] text-[8px] px-2 py-0.5 rounded-full font-black uppercase">
              Save 44%
            </span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/90 backdrop-blur-xl border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(254,154,0,0.18)] mb-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 space-y-4">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white">
              Everything Included in <span className="text-[#fe9a00]">PLUS</span>
            </h2>
            <div className="space-y-3">
              {perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fe9a00]/20 border border-[#fe9a00] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#fe9a00] stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-200 font-bold leading-snug">
                    {perk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-1">
              {billingCycle === 'annual' ? '1-Year All-Access Pass' : 'Monthly Pass'}
            </span>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs sm:text-sm font-black text-zinc-500 line-through">
                {billingCycle === 'annual' ? '$35.99/yr' : '$2.99/mo'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 px-2 py-0.5 rounded-full">
                {billingCycle === 'annual' ? 'Save 44%' : 'Save 33%'}
              </span>
            </div>

            <div className="flex items-baseline gap-1 my-1.5">
              <span className="text-4xl sm:text-5xl font-black italic text-white">
                {billingCycle === 'annual' ? '$20' : '$1.99'}
              </span>
              <span className="text-xs font-bold text-zinc-400 uppercase">
                {billingCycle === 'annual' ? '/ year' : '/ month'}
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 font-bold mb-5 leading-relaxed">
              {billingCycle === 'annual'
                ? hasReferralCode
                  ? 'Includes 3-Day Free Trial ($0 today), then $20/yr (~$1.67/mo). Cancel anytime.'
                  : 'Special Annual Rate (~$1.67/mo instead of $35.99/yr). Cancel anytime.'
                : 'Special Monthly Rate ($1.99/mo instead of $2.99/mo). Cancel anytime.'}
            </p>

            {billingCycle === 'annual' && (
              <div className="w-full mb-4 text-left">
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Creator / Partner Code (Unlocks 3-Day Free Trial)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP-WHYT"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
            )}

            {isPremium ? (
              <div className="w-full space-y-2">
                <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> You Have Active PLUS Access
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate({ action: 'settings' })}
                    className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Manage Subscription in Settings
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={isLoadingCheckout}
                onClick={() => handleStartSubscription(billingCycle)}
                className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    {billingCycle === 'annual'
                      ? hasReferralCode
                        ? 'Start 3-Day Free Trial ($20/yr)'
                        : 'Get 1-Year PLUS ($20/yr)'
                      : 'Start Monthly PLUS ($1.99)'}
                  </>
                )}
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[#fe9a00]" /> Secure Stripe Checkout
            </div>
          </div>
        </div>
      </div>

      {/* Redeem Themed Bundle Code / Flash Contest / Store Key Box */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center text-[#fe9a00] shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
              Have a Themed Bundle, Flash Contest, or 1-Year Access Code?
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold">
              Enter your Themed Bundle code (e.g. MMWOG Diwali or Apple Black Bundle), Flash Contest code, or Creator Invite below to unlock PLUS & rewards immediately.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <input
            type="text"
            placeholder="Enter Code (e.g. DIWALI-MMWOG-2026)"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
          />
          <button
            type="submit"
            disabled={isRedeeming || !promoCode.trim()}
            className="px-6 py-3 bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 shrink-0"
          >
            {isRedeeming ? 'Redeeming...' : 'Redeem Code'}
          </button>
        </form>

        {redeemError && (
          <p className="text-xs text-red-400 font-bold mt-3 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" /> {redeemError}
          </p>
        )}

        {!currentUser && (
          <p className="text-[10px] text-zinc-500 font-bold mt-3 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-[#fe9a00] shrink-0" />
            You'll be prompted to sign in or create a free account so we can attach PLUS & your bundle items to your profile.
          </p>
        )}
      </div>
    </div>
  );
};

export const SubscriptionPage = Subscription;
export default Subscription;