import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Flame,
  X,
  ArrowDown
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { doCreatorNamesMatch } from '../VirtualProfile/BingoBook';
import { isItemWithinSchedule } from './InAppStoreSection';

export interface BundlePayload {
  include_1yr_sub?: boolean;
  card_skin_id?: string;
  card_skin_name?: string;
  card_skin_url?: string;
  card_skin_2_id?: string;
  card_skin_2_name?: string;
  card_skin_2_url?: string;
  avatar_urls?: string[];
  avatar_names?: string[];
  creator_autograph?: string;
  creator_autograph_2?: string;
  bonus_hypes?: number;
  bundle_title?: string;
  price_dollars?: number;
}

export const Subscription = ({ userTier, onBack, onLoginClick, onNavigate }: any) => {
  const { cardSkins = [] } = useSeriesData();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(userTier === 'premium');
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [loadingBundleId, setLoadingBundleId] = useState<string | null>(null);

  // Synced Bundles from both in_app_store_products (Live Store Manager) & themed_annual_bundles
  const [storeBundles, setStoreBundles] = useState<any[]>([]);
  const [legacyThemedBundles, setLegacyThemedBundles] = useState<any[]>([]);
  const [masterSignatures, setMasterSignatures] = useState<Record<string, string>>({});
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>([]);

  // Pre-Checkout Upsell Modal State
  const [showBundleUpsellModal, setShowBundleUpsellModal] = useState(false);
  const collectorBundlesRef = useRef<HTMLDivElement | null>(null);
  const mainPricingCardRef = useRef<HTMLDivElement | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const [referralCode, setReferralCode] = useState('');

  // Hide floating Hype pill when the Upsell Modal is open
  useEffect(() => {
    if (!showBundleUpsellModal) return;
    window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
    };
  }, [showBundleUpsellModal]);

  const scrollToCollectorBundles = () => {
    setShowBundleUpsellModal(false);
    setTimeout(() => {
      collectorBundlesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

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
      return matchedSig?.creator_name || targetCreator;
    } catch (err) {
      console.error('Error unlocking bundle autograph:', err);
      return targetCreator;
    }
  }, []);

  // Unified reward granter for Custom Bundle Codes & Legacy Themed Bundles
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

      const currentActiveHypes = Math.max(
        0,
        Number(currentProf?.hypes_remaining ?? currentProf?.super_hypes_left ?? 1)
      );
      const nextActiveHypes = includeSub
        ? Math.min(10, Math.max(3, alreadyPremium ? currentActiveHypes : currentActiveHypes + 2))
        : currentActiveHypes;

      const currentVaultedHypes = Math.max(0, Number(currentProf?.vaulted_hypes || 0));
      const extraVaultedHypes = Math.max(0, Number(bundle.bonus_hypes || 0));
      const nextVaultedHypes = currentVaultedHypes + extraVaultedHypes;

      const unlockedParts: string[] = [];
      let bonusFandomPts = includeSub ? (alreadyPremium ? 30 : 15) : 0;

      const profilePatch: Record<string, any> = {
        hypes_remaining: nextActiveHypes,
        super_hypes_left: nextActiveHypes,
        vaulted_hypes: nextVaultedHypes
      };

      if (includeSub) {
        profilePatch.is_premium = true;
        profilePatch.premium_until = nextYearDate;
        unlockedParts.push(alreadyPremium ? '+1 Year PLUS Extended' : '1-Year PLUS Pass');
      }

      if (extraVaultedHypes > 0) {
        unlockedParts.push(`+${extraVaultedHypes} Vaulted Gold Hypes`);
      }

      const skinItemsToUnlock = [
        bundle.card_skin_id ? String(bundle.card_skin_id) : '',
        bundle.card_skin_url ? String(bundle.card_skin_url) : '',
        bundle.card_skin_2_id ? String(bundle.card_skin_2_id) : '',
        bundle.card_skin_2_url ? String(bundle.card_skin_2_url) : ''
      ].filter(Boolean);

      if (skinItemsToUnlock.length > 0) {
        const existingSkins: string[] = Array.isArray(currentProf?.unlocked_skins)
          ? currentProf.unlocked_skins.map(String)
          : [];
        const mergedSkins = Array.from(new Set([...existingSkins, ...skinItemsToUnlock]));
        profilePatch.unlocked_skins = mergedSkins;

        if (bundle.card_skin_url) {
          profilePatch.card_skin = bundle.card_skin_url;
        }
        if (bundle.card_skin_id) {
          profilePatch.card_skin_id = bundle.card_skin_id;
        }

        try {
          const localSkins: string[] = JSON.parse(
            localStorage.getItem('am_unlocked_skins') || '[]'
          );
          localStorage.setItem(
            'am_unlocked_skins',
            JSON.stringify(Array.from(new Set([...localSkins, ...skinItemsToUnlock])))
          );
        } catch {
          // ignore
        }

        const skinNames = [bundle.card_skin_name, bundle.card_skin_2_name].filter(Boolean);
        unlockedParts.push(
          skinNames.length > 0 ? `${skinNames.join(' & ')} Card Skin(s)` : 'Exclusive Hype Card Skin(s)'
        );
        bonusFandomPts += 15;
      }

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

      const creatorsToUnlock = [bundle.creator_autograph, bundle.creator_autograph_2].filter(
        Boolean
      ) as string[];
      if (creatorsToUnlock.length > 0) {
        const existingAutographs: string[] = Array.isArray(currentProf?.unlocked_autographs)
          ? currentProf.unlocked_autographs.map(String)
          : [];
        profilePatch.unlocked_autographs = Array.from(
          new Set([...existingAutographs, ...creatorsToUnlock])
        );

        for (const cName of creatorsToUnlock) {
          const unlockedCreator = await unlockFlashContestAutograph(userId, cName);
          if (unlockedCreator) {
            unlockedParts.push(`${unlockedCreator} Gold Autograph`);
            bonusFandomPts += 25;
          }
        }
      }

      profilePatch.fandom_score = (Number(currentProf?.fandom_score) || 0) + bonusFandomPts;

      const { error: profErr } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', userId);

      if (profErr) {
        const fallbackPatch: Record<string, any> = {
          is_premium: includeSub ? true : Boolean(currentProf?.is_premium),
          hypes_remaining: nextActiveHypes,
          super_hypes_left: nextActiveHypes,
          vaulted_hypes: nextVaultedHypes,
          fandom_score: profilePatch.fandom_score
        };
        if (profilePatch.avatar_url) fallbackPatch.avatar_url = profilePatch.avatar_url;
        if (profilePatch.card_skin) fallbackPatch.card_skin = profilePatch.card_skin;
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
      const cleanSaved = savedPromo.trim().toUpperCase();
      localStorage.removeItem('auto_fill_premium_code');
      if (cleanSaved.startsWith('VIP-')) {
        setReferralCode(cleanSaved);
        localStorage.setItem('am_referral_code', cleanSaved);
        setBillingCycle('annual');
      } else {
        setPromoCode(cleanSaved);
      }
    }

    const savedRef = localStorage.getItem('am_referral_code');
    if (savedRef) {
      setReferralCode(savedRef.trim().toUpperCase());
    }

    Promise.all([
      supabase
        .from('in_app_store_products')
        .select('*')
        .eq('is_active', true)
        .eq('product_type', 'bundle')
        .order('created_at', { ascending: false }),
      supabase
        .from('themed_annual_bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('creator_signatures').select('creator_name, signature_url')
    ]).then(([{ data: storeProdRows }, { data: legacyBundleRows }, { data: sigRows }]) => {
      if (storeProdRows) {
        const activeSched = storeProdRows.filter((p: any) => isItemWithinSchedule(p));
        setStoreBundles(activeSched);
      }
      if (legacyBundleRows) setLegacyThemedBundles(legacyBundleRows);
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
        const [{ data: profile }, { data: ledgerRows }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('store_payout_ledger').select('product_id').eq('user_id', user.id)
        ]);

        if (ledgerRows) {
          setPurchasedProductIds(
            Array.from(
              new Set(ledgerRows.map((r: any) => String(r.product_id || '')).filter(Boolean))
            )
          );
        }

        if (profile) {
          setCurrentUser(profile);
          if (profile.is_premium) setIsPremium(true);
          const dbSkins: string[] = Array.isArray(profile.unlocked_skins)
            ? profile.unlocked_skins.map(String)
            : [];
          setUnlockedSkins(
            Array.from(new Set([...dbSkins, profile.card_skin || ''].filter(Boolean)))
          );
        } else {
          setCurrentUser({ id: user.id, email: user.email });
        }

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
                card_skin_url: purchasedBundle.card_skin_url,
                card_skin_2_id: purchasedBundle.card_skin_2_id,
                card_skin_2_name: purchasedBundle.card_skin_2_name,
                card_skin_2_url: purchasedBundle.card_skin_2_url,
                avatar_urls: purchasedBundle.avatar_urls || [],
                creator_autograph: purchasedBundle.creator_autograph,
                creator_autograph_2: purchasedBundle.creator_autograph_2,
                bonus_hypes: purchasedBundle.bonus_hypes || 0,
                bundle_title: purchasedBundle.title,
                price_dollars: purchasedBundle.price_dollars
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

        if (params.get('status') === 'sub_success' || params.get('sub_status') === 'success') {
          const curActive = Math.max(
            0,
            Number(profile?.hypes_remaining ?? profile?.super_hypes_left ?? 1)
          );
          const upgradedActive = Math.min(10, Math.max(3, curActive + 2));

          await supabase
            .from('profiles')
            .update({
              is_premium: true,
              hypes_remaining: upgradedActive,
              super_hypes_left: upgradedActive
            })
            .eq('id', user.id);

          setIsPremium(true);
          setRedeemSuccess(
            'Welcome to Saturday AM+ PLUS! Your membership and 3 Weekly Super Hypes are now active.'
          );
          window.dispatchEvent(new Event('profileUpdated'));
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    });
  }, [userTier, grantBundleRewardsToUser]);

  // Unified list of available Collector's Bundles
  const unifiedBundles = useMemo(() => {
    const normalizedStore = storeBundles.map((b: any) => ({
      id: b.id,
      source: 'store_product',
      rawProduct: b,
      title: b.title,
      subtitle: b.description,
      theme_badge: b.promo_badge || 'SPECIAL EDITION ANNUAL BUNDLE',
      price_dollars: Number(b.listed_price_dollars ?? 24.99),
      original_price_dollars: Number(b.normal_price_dollars ?? 35),
      include_1yr_sub: b.include_1yr_sub !== false,
      bonus_hypes: Number(b.bonus_vaulted_hypes ?? 10),
      card_skin_ids: Array.isArray(b.card_skin_ids) ? b.card_skin_ids : [],
      avatar_urls: Array.isArray(b.avatar_urls) ? b.avatar_urls.filter(Boolean) : [],
      autograph_creators: Array.isArray(b.autograph_creators)
        ? b.autograph_creators.filter(Boolean)
        : [],
      commission_creators: Array.isArray(b.commission_creators)
        ? b.commission_creators.filter(Boolean)
        : [],
      commission_bounty_dollars: Number(b.commission_bounty_dollars ?? 5.0)
    }));

    const storeTitlesLower = new Set(
      normalizedStore.map(b => String(b.title || '').trim().toLowerCase())
    );

    const normalizedLegacy = legacyThemedBundles
      .filter(lb => !storeTitlesLower.has(String(lb.title || '').trim().toLowerCase()))
      .map((lb: any) => ({
        id: lb.id,
        source: 'legacy_themed',
        rawProduct: lb,
        title: lb.title,
        subtitle: lb.subtitle,
        theme_badge: lb.theme_badge || 'SPECIAL EDITION ANNUAL BUNDLE',
        price_dollars: Number(lb.price_dollars ?? 24.99),
        original_price_dollars: Number(lb.original_price_dollars ?? 35),
        include_1yr_sub: true,
        bonus_hypes: Number(lb.bonus_hypes ?? 10),
        card_skin_ids: [lb.card_skin_id, lb.card_skin_2_id].filter(Boolean),
        card_skin_url: lb.card_skin_url,
        card_skin_name: lb.card_skin_name,
        avatar_urls: Array.isArray(lb.avatar_urls) ? lb.avatar_urls.filter(Boolean) : [],
        autograph_creators: [lb.creator_autograph, lb.creator_autograph_2].filter(Boolean),
        commission_creators: [lb.creator_autograph, lb.creator_autograph_2].filter(Boolean),
        commission_bounty_dollars: 5.0
      }));

    return [...normalizedStore, ...normalizedLegacy];
  }, [storeBundles, legacyThemedBundles]);

  const isBundleOwnedByUser = useCallback(
    (bundle: any): boolean => {
      if (!bundle || !currentUser) return false;
      if (purchasedProductIds.includes(String(bundle.id))) return true;
      const skinIds: string[] = Array.isArray(bundle.card_skin_ids)
        ? bundle.card_skin_ids.filter(Boolean).map(String)
        : [];
      if (skinIds.length > 0 && skinIds.every(id => unlockedSkins.includes(id))) {
        return true;
      }
      return false;
    },
    [currentUser, purchasedProductIds, unlockedSkins]
  );

  // Unowned bundles eligible for the Pre-Checkout Upsell Modal
  const unownedUpsellBundles = useMemo(() => {
    return unifiedBundles.filter(b => b.include_1yr_sub && !isBundleOwnedByUser(b));
  }, [unifiedBundles, isBundleOwnedByUser]);

  const activeUpsellBundle = unownedUpsellBundles[0] || null;

  // Execute Basic Monthly ($1.99) or Annual ($20) Stripe Checkout
  const executeBasicSubscriptionCheckout = async (plan: 'monthly' | 'annual') => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setShowBundleUpsellModal(false);
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

  // Intercept Annual ($20) Click to Show the Simple Collector Subscription Prompt First
  const handleStartSubscriptionClick = async (plan: 'monthly' | 'annual') => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    if (plan === 'annual' && unownedUpsellBundles.length > 0) {
      setShowBundleUpsellModal(true);
      return;
    }

    await executeBasicSubscriptionCheckout(plan);
  };

  // Start Checkout for a Collector's Annual Bundle
  const handleBuyThemedBundle = async (bundle: any) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setShowBundleUpsellModal(false);

    if (isBundleOwnedByUser(bundle)) {
      setRedeemSuccess(
        `"${bundle.title}" is already in your collection! Click "View My Loadout" to equip your Card Skins, Avatars & Autographs.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoadingBundleId(bundle.id);
    try {
      const [{ data: existingLedger }, { data: freshProf }] = await Promise.all([
        supabase
          .from('store_payout_ledger')
          .select('id')
          .eq('user_id', activeUserId)
          .eq('product_id', String(bundle.id))
          .limit(1)
          .maybeSingle(),
        supabase.from('profiles').select('unlocked_skins').eq('id', activeUserId).maybeSingle()
      ]);

      const dbSkins: string[] = Array.isArray(freshProf?.unlocked_skins)
        ? freshProf.unlocked_skins.map(String)
        : [];
      const bSkinIds: string[] = Array.isArray(bundle.card_skin_ids)
        ? bundle.card_skin_ids.filter(Boolean).map(String)
        : [];
      const alreadyHasSkins = bSkinIds.length > 0 && bSkinIds.every(id => dbSkins.includes(id));

      if (existingLedger || alreadyHasSkins) {
        setPurchasedProductIds(prev => Array.from(new Set([...prev, String(bundle.id)])));
        setRedeemSuccess(
          `"${bundle.title}" is already in your collection! Click "View My Loadout" to equip your Card Skins, Avatars & Autographs.`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const listedPrice = Number(bundle.price_dollars || 24.99);
      const returnUrl =
        bundle.source === 'store_product'
          ? `${window.location.origin}/?view=shop&store_product_success=${encodeURIComponent(
              bundle.id
            )}`
          : `${window.location.origin}/?view=sub&bundle_status=success&bundle_id=${encodeURIComponent(
              bundle.id
            )}`;

      const commCreators: string[] = Array.isArray(bundle.commission_creators)
        ? bundle.commission_creators.filter(Boolean)
        : [];
      const creatorBountyDollars =
        commCreators.length > 0 ? Number(bundle.commission_bounty_dollars ?? 5.0) : 0;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'themed_bundle',
          productType: 'bundle',
          plan: 'annual',
          billingCycle: 'annual',
          bundleId: bundle.id,
          bundleTitle: bundle.title,
          amountDollars: listedPrice,
          amountCents: Math.round(listedPrice * 100),
          creatorNames: commCreators,
          creatorBountyDollars,
          userId: activeUserId,
          userEmail: user?.email || currentUser?.email,
          returnUrl
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
      alert('Unable to start bundle checkout: ' + (err.message || 'Please try again.'));
    } finally {
      setLoadingBundleId(null);
    }
  };

  // ============================================================================
  // UNIFIED "REDEEM A CODE" HANDLER (ACCEPTS EVERY CODE TYPE IN ONE BOX)
  // ============================================================================
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return;

    setRedeemError(null);
    setRedeemSuccess(null);

    // 1. Creator Onboarding Invite Code (SAM-CR-...)
    if (cleanCode.startsWith('SAM-CR-')) {
      localStorage.setItem('am_pending_creator_invite', cleanCode);
      window.location.href = `/?creator_invite=${encodeURIComponent(cleanCode)}`;
      return;
    }

    // 2. Creator / Partner Referral Code (VIP-...) -> Unlocks 3-Day Free Trial on Annual Plan
    if (cleanCode.startsWith('VIP-')) {
      setReferralCode(cleanCode);
      localStorage.setItem('am_referral_code', cleanCode);
      setBillingCycle('annual');
      setPromoCode('');
      setRedeemSuccess(
        `Partner Referral Code "${cleanCode}" applied! Your 3-Day Free Trial on the $20/yr Annual Pass is now unlocked above.`
      );
      mainPricingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;

    if (!activeUserId) {
      localStorage.setItem('auto_fill_premium_code', cleanCode);
      if (onLoginClick) onLoginClick();
      return;
    }

    setIsRedeeming(true);

    try {
      const { data: currentProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .maybeSingle();

      const alreadyPremium = Boolean(isPremium || currentProf?.is_premium);

      // 3. 5-Digit Creator Autograph PIN (e.g. 12345)
      if (/^\d{5}$/.test(cleanCode)) {
        const { data: pinData } = await supabase
          .from('bingo_codes')
          .select('*')
          .eq('code', cleanCode)
          .maybeSingle();

        if (!pinData) {
          throw new Error('Invalid 5-digit Autograph PIN. Please check the number and try again.');
        }
        if (pinData.expires_at && new Date() > new Date(pinData.expires_at)) {
          throw new Error('This 5-digit Autograph PIN has expired.');
        }
        const pinUsed = Number(pinData.times_used || 0);
        const pinMax = Number(pinData.max_uses || 999999);
        if (pinMax > 0 && pinUsed >= pinMax) {
          throw new Error(
            pinMax === 1
              ? 'This 1-Time Fan Gift PIN has already been redeemed!'
              : 'This PIN has reached its maximum redemptions.'
          );
        }

        await supabase
          .from('bingo_codes')
          .update({ times_used: pinUsed + 1 })
          .eq('id', pinData.id);

        const unlockedCreator = await unlockFlashContestAutograph(
          activeUserId,
          pinData.creator_name
        );

        await supabase
          .from('profiles')
          .update({ fandom_score: (Number(currentProf?.fandom_score) || 0) + 25 })
          .eq('id', activeUserId);

        window.dispatchEvent(new Event('profileUpdated'));
        setPromoCode('');
        setRedeemSuccess(
          `Autograph Unlocked! You received ${
            unlockedCreator || pinData.creator_name
          }'s Gold Autograph (+25 Fandom Pts)!`
        );
        setIsRedeeming(false);
        return;
      }

      // 4. Custom Promo / Bundle / Gift Sub Code from `promo_codes`
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

        const rawBundle: any =
          typeof promoRow.bundle_config === 'object' && promoRow.bundle_config !== null
            ? promoRow.bundle_config
            : {};

        const isCreatorMonthlyGift = Boolean(
          rawBundle.is_creator_monthly_gift ||
            rawBundle.non_stackable ||
            promoRow.gift_month_key ||
            cleanCode.startsWith('GIFT-')
        );

        const hasCustomRewards =
          !isCreatorMonthlyGift &&
          Boolean(
            promoRow.creator_name ||
              rawBundle.creator_autograph ||
              rawBundle.creator_autograph_2 ||
              rawBundle.card_skin_id ||
              rawBundle.card_skin_2_id ||
              (rawBundle.avatar_urls && rawBundle.avatar_urls.length > 0) ||
              Number(rawBundle.bonus_hypes || 0) > 0
          );

        if (alreadyPremium && (isCreatorMonthlyGift || !hasCustomRewards)) {
          throw new Error(
            'Gift Sub codes cannot be stacked on an active Saturday AM+ PLUS membership! Your code was not used so you can gift it to a friend.'
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
            include_1yr_sub: isCreatorMonthlyGift ? true : rawBundle.include_1yr_sub !== false,
            card_skin_id: rawBundle.card_skin_id,
            card_skin_name: rawBundle.card_skin_name,
            card_skin_url: rawBundle.card_skin_url,
            card_skin_2_id: rawBundle.card_skin_2_id,
            card_skin_2_name: rawBundle.card_skin_2_name,
            card_skin_2_url: rawBundle.card_skin_2_url,
            avatar_urls: rawBundle.avatar_urls || [],
            creator_autograph: rawBundle.creator_autograph || promoRow.creator_name,
            creator_autograph_2: rawBundle.creator_autograph_2,
            bonus_hypes: rawBundle.bonus_hypes || 0,
            bundle_title:
              rawBundle.bundle_title ||
              (isCreatorMonthlyGift
                ? `${promoRow.creator_name || 'Creator'} 1-Year PLUS Gift Sub`
                : undefined)
          },
          alreadyPremium
        );

        setPromoCode('');
        setRedeemSuccess(
          `${rawBundle.bundle_title ? `${rawBundle.bundle_title} Unlocked!` : 'Code Activated!'} You received: ${unlockedParts.join(' + ')}!`
        );
        setIsRedeeming(false);
        return;
      }

      // 5. Standard 1-Year Store Batch Access Key (`redeem_premium_code` RPC)
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
        throw new Error('Invalid or already redeemed code.');
      }

      const curActive = Math.max(
        0,
        Number(currentProf?.hypes_remaining ?? currentProf?.super_hypes_left ?? 1)
      );
      const nextActive = Math.min(10, Math.max(3, curActive + 2));

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          hypes_remaining: nextActive,
          super_hypes_left: nextActive
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
    '3 Weekly Super Hypes (Rollover Cap: 10) to Boost Series & Creators',
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

  const renderStampedCardPreview = (skin: any) => {
    const stamps: any[] = Array.isArray(skin?.signature_stamps) ? skin.signature_stamps : [];
    return (
      <div
        key={skin.id}
        className="relative w-full aspect-[1.58] rounded-xl overflow-hidden border-2 border-[#fe9a00]/80 bg-zinc-900 shadow-lg"
        style={{ containerType: 'inline-size' }}
      >
        <img src={skin.image_url} alt={skin.name} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.12) 50%, transparent 55%)'
          }}
        />
        {stamps.map((st: any) => {
          const bgClass =
            st.color_mode === 'white'
              ? 'bg-white'
              : st.color_mode === 'black'
              ? 'bg-black'
              : 'bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500';
          return (
            <div
              key={st.id}
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                width: `${st.scale}cqi`,
                aspectRatio: '2.2 / 1',
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-20 pointer-events-none"
            >
              <div
                className={`w-full h-full ${bgClass} drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]`}
                style={{
                  WebkitMaskImage: `url('${st.signature_url}')`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: `url('${st.signature_url}')`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center'
                }}
              />
            </div>
          );
        })}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2.5 py-1.5 flex items-center justify-between z-30">
          <span className="text-[9px] font-black italic uppercase tracking-wider text-white truncate">
            {skin.name}
          </span>
          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#fe9a00] text-black shrink-0">
            Hype Card
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-48 pt-6 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in">
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
              Code Applied!
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
          1. STANDARD MONTHLY / BASIC ANNUAL SUBSCRIPTION CARD (AT THE TOP)
      ===================================================================== */}
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

      <div
        ref={mainPricingCardRef}
        className="bg-zinc-950/90 backdrop-blur-xl border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(254,154,0,0.18)] mb-10"
      >
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

            <p className="text-[10px] text-zinc-400 font-bold mb-4 leading-relaxed">
              {billingCycle === 'annual'
                ? hasReferralCode
                  ? 'Includes 3-Day Free Trial ($0 today), then $20/yr (~$1.67/mo). Cancel anytime.'
                  : 'Special Annual Rate (~$1.67/mo instead of $35.99/yr). Cancel anytime.'
                : 'Special Monthly Rate ($1.99/mo instead of $2.99/mo). Cancel anytime.'}
            </p>

            {/* Active Partner Referral Badge (When a VIP-... code has been redeemed below) */}
            {billingCycle === 'annual' && hasReferralCode && (
              <div className="w-full mb-4 px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/60 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  3-Day Trial Active ({referralCode})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReferralCode('');
                    localStorage.removeItem('am_referral_code');
                  }}
                  className="text-zinc-400 hover:text-white cursor-pointer shrink-0"
                  title="Remove referral code"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Simple Inline Collector Subscription Callout (Scrolls Down to Bundles) */}
            {billingCycle === 'annual' && unifiedBundles.length > 0 && (
              <div
                onClick={scrollToCollectorBundles}
                className="w-full mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-black to-amber-950/60 border border-[#fe9a00]/60 hover:border-yellow-300 text-left cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Collector Subscriptions
                  </span>
                  <span className="flex items-center gap-0.5 text-yellow-300 group-hover:text-white">
                    See Below <ArrowDown className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[10px] text-zinc-200 font-bold mt-1 leading-snug">
                  Check out our Collector Subscriptions! They&apos;re only <strong className="text-[#fe9a00]">+$4.99</strong> — get the same 1-Yr sub, but with even more cool stuff!
                </p>
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
                onClick={() => handleStartSubscriptionClick(billingCycle)}
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

      {/* =====================================================================
          2. SINGLE UNIFIED "REDEEM A CODE" BOX (HANDLES ALL PROMO & VIP CODES)
      ===================================================================== */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center text-[#fe9a00] shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
              Redeem a Code
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold">
              Enter any valid Promo Code, Gift Sub, Bundle Code, Creator Referral (VIP-...), or Autograph PIN below.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <input
            type="text"
            placeholder="Enter Code"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
          />
          <button
            type="submit"
            disabled={isRedeeming || !promoCode.trim()}
            className="px-6 py-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 shrink-0"
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
            You&apos;ll be prompted to sign in or create a free account so we can attach your unlocked rewards to your profile.
          </p>
        )}
      </div>

      {/* =====================================================================
          3. COLLECTOR SUBSCRIPTIONS / ANNUAL BUNDLES (AT THE BOTTOM)
      ===================================================================== */}
      {unifiedBundles.length > 0 && (
        <div
          id="collector-bundles-section"
          ref={collectorBundlesRef}
          className="pt-4 space-y-5 scroll-mt-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Gift className="w-5 h-5 text-[#fe9a00]" />
              <div>
                <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white">
                  Collector <span className="text-[#fe9a00]">Subscriptions</span>
                </h2>
                <p className="text-[11px] text-zinc-300 font-bold">
                  Only +$4.99 more — get the exact same 1-Yr PLUS sub, but with even more cool stuff!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {unifiedBundles.map(bundle => {
              const bundleSkins = (bundle.card_skin_ids || [])
                .map((id: any) => (cardSkins || []).find((s: any) => String(s.id) === String(id)))
                .filter(Boolean);
              const avatars: string[] = bundle.avatar_urls || [];
              const autographs: string[] = bundle.autograph_creators || [];
              const price = Number(bundle.price_dollars || 24.99);
              const normalPrice = Number(bundle.original_price_dollars || 35);
              const hasDiscount = normalPrice > price && normalPrice > 0;
              const discountPct = hasDiscount
                ? Math.round(((normalPrice - price) / normalPrice) * 100)
                : 0;
              const isOwned = isBundleOwnedByUser(bundle);

              return (
                <div
                  key={bundle.id}
                  className="bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-black border-2 border-[#fe9a00] rounded-3xl p-5 sm:p-7 shadow-[0_0_45px_rgba(254,154,0,0.22)] relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 fill-black" />
                            {bundle.theme_badge}
                          </span>
                          {isOwned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest">
                              ✓ IN YOUR COLLECTION
                            </span>
                          ) : (
                            discountPct > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest">
                                SAVE {discountPct}% OFF
                              </span>
                            )
                          )}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                          {bundle.title}
                        </h3>
                        {bundle.subtitle && (
                          <p className="text-xs text-zinc-300 font-bold mt-1 leading-relaxed">
                            {bundle.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Included Perks Pills */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-[#fe9a00]" /> 1-Year Full App Pass
                        </span>
                        {bundleSkins.length > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#fe9a00]" /> {bundleSkins.length} Stamped Hype Card{bundleSkins.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {avatars.length > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#fe9a00]" /> {avatars.length} Exclusive Avatars
                          </span>
                        )}
                        {autographs.length > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-[#fe9a00] flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5" /> {autographs.join(' & ')}
                          </span>
                        )}
                        {Number(bundle.bonus_hypes) > 0 && (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-yellow-300 text-[10px] font-black uppercase tracking-wider text-yellow-200 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" /> +{bundle.bonus_hypes} Vaulted Gold Hypes
                          </span>
                        )}
                      </div>

                      {/* Stamped Hype Cards Preview */}
                      {bundleSkins.length > 0 && (
                        <div
                          className={`grid gap-3 pt-1 ${
                            bundleSkins.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2'
                          }`}
                        >
                          {bundleSkins.map((sk: any) => renderStampedCardPreview(sk))}
                        </div>
                      )}

                      {/* Avatars & Gold Autographs Strip */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {avatars.length > 0 && (
                          <div className="flex items-center gap-2.5 bg-black/70 border border-zinc-800 rounded-2xl p-2 pr-3">
                            <div className="flex -space-x-2">
                              {avatars.slice(0, 5).map((avUrl, idx) => (
                                <img
                                  key={idx}
                                  src={avUrl}
                                  alt={`Avatar ${idx + 1}`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900"
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

                        {autographs.map((cName, idx) => {
                          const sigUrl = getSignatureUrlForCreator(cName);
                          if (!sigUrl) return null;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-black/70 border border-zinc-800 rounded-2xl p-2 px-3"
                            >
                              <div className="w-16 h-8 flex items-center justify-center">
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
                                <span className="text-[7px] font-black uppercase tracking-widest text-[#fe9a00] block">
                                  Autograph
                                </span>
                                <span className="text-[9px] font-black uppercase text-white">
                                  {cName}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Price & CTA */}
                    <div className="lg:w-64 bg-black/90 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                        Collector Subscription
                      </span>
                      <div className="flex items-baseline gap-2 my-1.5">
                        {hasDiscount && (
                          <span className="text-lg font-black italic text-zinc-500 line-through">
                            ${normalPrice}
                          </span>
                        )}
                        <span className="text-4xl font-black italic text-white">${price}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold mb-4 leading-relaxed">
                        Includes 1-Yr PLUS ($20 value) + all themed cosmetics, autographs &amp; +10 Gold Hypes permanently unlocked.
                      </p>

                      {isOwned ? (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate
                              ? onNavigate({ action: 'profile' })
                              : (window.location.href = '/?view=profile')
                          }
                          className="w-full py-3.5 bg-emerald-500 hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer"
                        >
                          ✓ In Collection • View Profile
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingBundleId === bundle.id}
                          onClick={() => handleBuyThemedBundle(bundle)}
                          className="w-full py-3.5 bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SIMPLE PRE-CHECKOUT COLLECTOR SUBSCRIPTION UPSELL MODAL
      ===================================================================== */}
      {showBundleUpsellModal && activeUpsellBundle && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowBundleUpsellModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.3)] relative"
          >
            <button
              type="button"
              onClick={() => setShowBundleUpsellModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-[#fe9a00]/15 border border-[#fe9a00]/50 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(254,154,0,0.3)]">
              <Gift className="w-8 h-8 text-[#fe9a00]" />
            </div>

            <span className="px-3 py-0.5 rounded-full bg-[#fe9a00]/20 border border-[#fe9a00]/40 text-[#fe9a00] text-[9px] font-black uppercase tracking-widest mb-2">
              Wait! Before You Checkout
            </span>

            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              Check Out Our Collector Subscriptions!
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 font-bold leading-relaxed mb-6">
              They&apos;re only <span className="text-[#fe9a00] font-black">+$4.99</span> — you get the <span className="text-white font-black">same 1-Yr sub</span>, but with even more cool stuff (Hype Card Skins, Exclusive Avatars, Creator Autographs &amp; +10 Gold Hypes)!
            </p>

            <button
              type="button"
              onClick={scrollToCollectorBundles}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-wider text-[11px] sm:text-xs shadow-[0_0_25px_rgba(254,154,0,0.4)] mb-2.5 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span>View Collector Subscriptions (+$4.99)</span>
            </button>

            <button
              type="button"
              disabled={isLoadingCheckout}
              onClick={() => executeBasicSubscriptionCheckout('annual')}
              className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-black uppercase tracking-widest text-[11px] transition-colors cursor-pointer"
            >
              {hasReferralCode
                ? 'Continue with Basic 3-Day Free Trial ($20/yr)'
                : 'Continue with Basic 1-Yr Sub ($20/yr)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SubscriptionPage = Subscription;
export default Subscription;