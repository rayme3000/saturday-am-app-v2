import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CreditCard,
  Sparkles,
  Loader2,
  Gift,
  Crown,
  PenTool,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Eye
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { doCreatorNamesMatch } from '../VirtualProfile/BingoBook';

// Capture URL params immediately at module load BEFORE App.tsx router strips window.location.search
const captureInitialUrlParams = () => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const successId = params.get('store_product_success');
  const itemTarget = params.get('item');
  if (successId) {
    sessionStorage.setItem('am_pending_store_product_success', successId);
  }
  if (itemTarget) {
    sessionStorage.setItem('am_pending_store_item_inspect', itemTarget);
  }
};
captureInitialUrlParams();

const fullHypeIconUrl =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';

const hypeIconMaskStyle: React.CSSProperties = {
  WebkitMaskImage: `url('${fullHypeIconUrl}')`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskImage: `url('${fullHypeIconUrl}')`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center'
};

export const DEFAULT_LOADOUT_SKIN_NAMES = new Set([
  'carbon black',
  'karbon black',
  'saturday white',
  'saturday karbon black',
  'saturday carbon black'
]);

export const isDefaultBuiltInSkin = (skin: any): boolean => {
  if (!skin) return false;
  if (skin.is_default_skin === true) return true;
  const cleanName = String(skin.name || '').trim().toLowerCase();
  return DEFAULT_LOADOUT_SKIN_NAMES.has(cleanName);
};

export const isFreeStoreSkin = (skin: any): boolean => {
  if (!skin) return false;
  return Number(skin.price_cents ?? 99) === 0;
};

export const isItemWithinSchedule = (item: any): boolean => {
  if (!item) return false;
  const now = Date.now();
  if (item.available_from) {
    const startMs = new Date(item.available_from).getTime();
    if (!isNaN(startMs) && now < startMs) return false;
  }
  if (item.available_until) {
    const endMs = new Date(item.available_until).getTime();
    if (!isNaN(endMs) && now > endMs) return false;
  }
  return true;
};

interface InAppStoreSectionProps {
  onLoginClick?: () => void;
  onNavigate?: (dest: any) => void;
}

const INITIAL_GRID_LIMIT = 6;

export const InAppStoreSection: React.FC<InAppStoreSectionProps> = ({
  onLoginClick,
  onNavigate
}) => {
  const { cardSkins = [], vaultAvatars = [] } = useSeriesData();
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>([]);
  const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>([]);
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);
  const [equippedSkinUrl, setEquippedSkinUrl] = useState<string>('');
  const [masterSignatures, setMasterSignatures] = useState<Record<string, string>>({});
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [storeToast, setStoreToast] = useState<string | null>(null);

  // Duplicate Purchase Safety Modal State
  const [alreadyOwnedProduct, setAlreadyOwnedProduct] = useState<any | null>(null);

  // Filter, Search, Carousel & Modal Inspection State
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'bundles' | 'skins' | 'avatars' | 'free'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGridItems, setShowAllGridItems] = useState(false);
  const [activeBundleIdx, setActiveBundleIdx] = useState(0);
  const [inspectedProduct, setInspectedProduct] = useState<any | null>(null);

  const bundleCarouselRef = useRef<HTMLDivElement | null>(null);
  const processedSuccessRef = useRef<string | null>(null);

  useEffect(() => {
    captureInitialUrlParams();
  }, []);

  // Hide the floating Hype pill when the Tap-to-Inspect or Already-Owned modal is open
  useEffect(() => {
    if (!inspectedProduct && !alreadyOwnedProduct) return;
    window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
    };
  }, [inspectedProduct, alreadyOwnedProduct]);

  const navigateToUserProfile = useCallback(() => {
    setAlreadyOwnedProduct(null);
    setInspectedProduct(null);
    if (onNavigate) {
      onNavigate({ action: 'profile' });
      return;
    }
    window.location.href = `${window.location.origin}/?view=profile`;
  }, [onNavigate]);

  const fetchStoreData = useCallback(async () => {
    const [
      { data: prodRows },
      { data: sigRows },
      { data: { user } }
    ] = await Promise.all([
      supabase
        .from('in_app_store_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('creator_signatures').select('creator_name, signature_url'),
      supabase.auth.getUser()
    ]);

    if (prodRows) {
      setStoreProducts(prodRows);
      const params = new URLSearchParams(window.location.search);
      const targetItem =
        params.get('item') ||
        sessionStorage.getItem('am_target_store_item') ||
        sessionStorage.getItem('am_pending_store_item_inspect');
      if (targetItem) {
        sessionStorage.removeItem('am_target_store_item');
        sessionStorage.removeItem('am_pending_store_item_inspect');
        const matched = prodRows.find(
          (p: any) => p.slug === targetItem || String(p.id) === targetItem
        );
        if (matched) setInspectedProduct(matched);
      }
    }

    if (sigRows) {
      const map: Record<string, string> = {};
      sigRows.forEach((r: any) => {
        if (r.creator_name && r.signature_url) {
          map[r.creator_name.trim()] = r.signature_url;
        }
      });
      setMasterSignatures(map);
    }

    if (user) {
      const [{ data: prof }, { data: ledgerRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('store_payout_ledger')
          .select('product_id')
          .eq('user_id', user.id)
      ]);

      if (ledgerRows) {
        setPurchasedProductIds(
          Array.from(
            new Set(ledgerRows.map((r: any) => String(r.product_id || '')).filter(Boolean))
          )
        );
      }

      if (prof) {
        setCurrentUser(prof);
        const currentEquipped = prof.card_skin || '';
        setEquippedSkinUrl(currentEquipped);

        const dbSkins: string[] = Array.isArray(prof.unlocked_skins)
          ? prof.unlocked_skins.map(String)
          : [];
        let localSkins: string[] = [];
        try {
          localSkins = JSON.parse(localStorage.getItem(`am_unlocked_skins_${user.id}`) || '[]').map(String);
        } catch {
          // ignore
        }
        setUnlockedSkins(
          Array.from(new Set([...dbSkins, ...localSkins, currentEquipped].filter(Boolean)))
        );

        const dbAvs: string[] = Array.isArray(prof.unlocked_avatars)
          ? prof.unlocked_avatars.map(String)
          : [];
        setUnlockedAvatars(dbAvs);
      }
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
    window.addEventListener('profileUpdated', fetchStoreData);
    window.addEventListener('vaultUpdated', fetchStoreData);
    return () => {
      window.removeEventListener('profileUpdated', fetchStoreData);
      window.removeEventListener('vaultUpdated', fetchStoreData);
    };
  }, [fetchStoreData]);

  // Unified helper: checks if a user already owns a bundle or store product
  const isProductOwnedByUser = useCallback(
    (prod: any): boolean => {
      if (!prod || !currentUser) return false;

      if (purchasedProductIds.includes(String(prod.id))) return true;

      const skinIds: string[] = Array.isArray(prod.card_skin_ids)
        ? prod.card_skin_ids.filter(Boolean).map(String)
        : [];
      const prodSkins = skinIds
        .map(id => (cardSkins || []).find((s: any) => String(s.id) === String(id)))
        .filter(Boolean);
      const avatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean).map(String)
        : [];

      const hasAllSkins =
        skinIds.length > 0 &&
        skinIds.every((id, idx) => {
          const skinObj = prodSkins[idx];
          return (
            unlockedSkins.includes(String(id)) ||
            (skinObj?.image_url && unlockedSkins.includes(String(skinObj.image_url))) ||
            (skinObj?.image_url && equippedSkinUrl === skinObj.image_url)
          );
        });

      const hasAllAvatars =
        avatars.length > 0 && avatars.every(url => unlockedAvatars.includes(String(url)));

      if (prod.product_type === 'bundle') {
        if (skinIds.length > 0 && avatars.length > 0) return hasAllSkins && hasAllAvatars;
        if (skinIds.length > 0) return hasAllSkins;
        if (avatars.length > 0) return hasAllAvatars;
      }

      if (skinIds.length > 0 && hasAllSkins) return true;
      if (avatars.length > 0 && hasAllAvatars) return true;

      return false;
    },
    [currentUser, purchasedProductIds, cardSkins, unlockedSkins, unlockedAvatars, equippedSkinUrl]
  );

  // Grant unlocked items & record Creator Bounty + Dev Allocation in store_payout_ledger
  const grantStoreProductToUser = useCallback(
    async (prod: any, userId: string, prof: any, recordLedger = true) => {
      const { data: existingPurchase } = await supabase
        .from('store_payout_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', String(prod.id))
        .limit(1)
        .maybeSingle();

      if (existingPurchase) {
        setPurchasedProductIds(prev => Array.from(new Set([...prev, String(prod.id)])));
        setAlreadyOwnedProduct(prod);
        return;
      }

      const skinIds: string[] = Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : [];
      const resolvedSkins = skinIds
        .map(id => (cardSkins || []).find((s: any) => String(s.id) === String(id)))
        .filter(Boolean);
      const skinUrls = resolvedSkins.map((s: any) => s.image_url).filter(Boolean);

      const existingSkins: string[] = Array.isArray(prof.unlocked_skins)
        ? prof.unlocked_skins.map(String)
        : [];
      const nextSkins = Array.from(
        new Set([...existingSkins, ...skinIds.map(String), ...skinUrls].filter(Boolean))
      );

      const existingAvatars: string[] = Array.isArray(prof.unlocked_avatars)
        ? prof.unlocked_avatars.map(String)
        : [];
      const prodAvatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      const nextAvatars = Array.from(new Set([...existingAvatars, ...prodAvatars]));

      const existingAutographs: string[] = Array.isArray(prof.unlocked_autographs)
        ? prof.unlocked_autographs.map(String)
        : [];
      const prodAutographs: string[] = Array.isArray(prod.autograph_creators)
        ? prod.autograph_creators.filter(Boolean)
        : [];
      const nextAutographs = Array.from(new Set([...existingAutographs, ...prodAutographs]));

      try {
        if (prodAutographs.length > 0) {
          const savedHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
          localStorage.setItem(
            'am_bingo_hunts',
            JSON.stringify(Array.from(new Set([...savedHunts, ...prodAutographs])))
          );
        }
        localStorage.setItem(`am_unlocked_skins_${userId}`, JSON.stringify(nextSkins));
      } catch {
        // ignore
      }

      const bonusVaulted = Number(prod.bonus_vaulted_hypes || 0);
      const currentVaulted = Number(prof.vaulted_hypes || 0);
      const nextVaulted = currentVaulted + bonusVaulted;

      const patch: Record<string, any> = {
        unlocked_skins: nextSkins,
        unlocked_avatars: nextAvatars,
        unlocked_autographs: nextAutographs,
        vaulted_hypes: nextVaulted
      };

      if (prod.include_1yr_sub) {
        patch.is_premium = true;
        patch.subscription_tier = 'annual';
        const currentActive = Number(prof.hypes_remaining ?? prof.super_hypes_left ?? 3);
        const toppedActive = Math.min(10, Math.max(3, currentActive));
        patch.hypes_remaining = toppedActive;
        patch.super_hypes_left = toppedActive;
      }

      if (skinUrls[0]) {
        patch.card_skin = skinUrls[0];
        setEquippedSkinUrl(skinUrls[0]);
      }
      if (prodAvatars[0] && !prof.avatar_url) {
        patch.avatar_url = prodAvatars[0];
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);

      if (updateErr) {
        const fallbackPatch: Record<string, any> = {
          vaulted_hypes: nextVaulted
        };
        if (prod.include_1yr_sub) {
          fallbackPatch.is_premium = true;
          fallbackPatch.hypes_remaining = patch.hypes_remaining;
          fallbackPatch.super_hypes_left = patch.super_hypes_left;
        }
        if (skinUrls[0]) fallbackPatch.card_skin = skinUrls[0];
        if (prodAvatars[0] && !prof.avatar_url) fallbackPatch.avatar_url = prodAvatars[0];
        await supabase.from('profiles').update(fallbackPatch).eq('id', userId);
      }

      // Record Creator Commission & Dev Allocation on ALL paid store products (Bundles, Skins & Avatar Packs)
      const gross = Math.max(0, Number(prod.listed_price_dollars || 0));
      if (recordLedger && gross > 0) {
        const stripeFee = Number((gross * 0.029 + 0.30).toFixed(2));
        const commCreators: string[] = Array.isArray(prod.commission_creators)
          ? prod.commission_creators.filter(Boolean)
          : [];
        const isBundle = prod.product_type === 'bundle';
        const creatorBounty =
          isBundle && commCreators.length > 0
            ? Number(prod.commission_bounty_dollars ?? 5.0)
            : 0;

        // Dev Cut is factored in on both Bundles ($1.50) and Avatar Packs / Single Skins (custom dev_allocation_dollars or 10% of gross)
        const devAllocation =
          prod.dev_allocation_dollars !== undefined && prod.dev_allocation_dollars !== null
            ? Number(prod.dev_allocation_dollars)
            : isBundle && prod.include_1yr_sub
            ? 1.50
            : Number((gross * 0.10).toFixed(2));

        const netSatAm = Math.max(
          0,
          Number((gross - stripeFee - creatorBounty - devAllocation).toFixed(2))
        );

        await supabase.from('store_payout_ledger').insert([
          {
            user_id: userId,
            user_email: prof.email || null,
            product_id: String(prod.id),
            product_title: prod.title,
            product_type: prod.product_type || 'bundle',
            gross_amount_dollars: gross,
            stripe_fee_dollars: stripeFee,
            creator_bounty_dollars: creatorBounty,
            creator_names: commCreators,
            dev_allocation_dollars: devAllocation,
            net_saturday_am_dollars: netSatAm,
            status: 'completed'
          }
        ]);
      }

      setPurchasedProductIds(prev => Array.from(new Set([...prev, String(prod.id)])));
      setUnlockedSkins(nextSkins);
      setUnlockedAvatars(nextAvatars);
      setStoreToast(
        `🎉 Unlocked "${prod.title}"! ${
          bonusVaulted > 0 ? `+${bonusVaulted} Gold Hypes & ` : ''
        }Your new items are ready in your Profile Loadout!`
      );
      window.dispatchEvent(new Event('profileUpdated'));
    },
    [cardSkins]
  );

  // Process Stripe return URL OR sessionStorage-captured store_product_success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successProdId =
      params.get('store_product_success') ||
      sessionStorage.getItem('am_pending_store_product_success');

    if (!successProdId || storeProducts.length === 0) return;
    if (processedSuccessRef.current === successProdId) return;

    const matchedProd =
      successProdId === 'latest'
        ? storeProducts.find((p: any) => p.product_type === 'bundle') || storeProducts[0]
        : storeProducts.find(
            (p: any) =>
              String(p.id) === successProdId ||
              String(p.slug) === successProdId ||
              String(p.id).startsWith(successProdId.slice(0, 8))
          );

    if (!matchedProd) return;
    processedSuccessRef.current = successProdId;
    sessionStorage.removeItem('am_pending_store_product_success');

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (prof) {
        await grantStoreProductToUser(matchedProd, user.id, prof, true);
      }
    });
  }, [storeProducts, grantStoreProductToUser]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeProducts.filter(p => {
      if (!p.is_active || !isItemWithinSchedule(p)) return false;
      if (q) {
        const matchTitle = String(p.title || '').toLowerCase().includes(q);
        const matchDesc = String(p.description || '').toLowerCase().includes(q);
        const matchBadge = String(p.promo_badge || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchBadge) return false;
      }
      return true;
    });
  }, [storeProducts, searchQuery]);

  const bundlesList = useMemo(() => {
    if (activeCategory === 'skins' || activeCategory === 'avatars') return [];
    return visibleProducts.filter(p => {
      if (p.product_type !== 'bundle') return false;
      if (activeCategory === 'free' && Number(p.listed_price_dollars || 0) > 0) return false;
      return true;
    });
  }, [visibleProducts, activeCategory]);

  const singleItemsList = useMemo(() => {
    if (activeCategory === 'bundles') return [];
    return visibleProducts.filter(p => {
      if (p.product_type === 'bundle') return false;
      if (activeCategory === 'skins' && p.product_type !== 'single_skin') return false;
      if (
        activeCategory === 'avatars' &&
        p.product_type !== 'avatar_pack' &&
        p.product_type !== 'single_avatar'
      )
        return false;
      if (activeCategory === 'free' && Number(p.listed_price_dollars || 0) > 0) return false;
      return true;
    });
  }, [visibleProducts, activeCategory]);

  const displayedGridItems = useMemo(() => {
    if (showAllGridItems) return singleItemsList;
    return singleItemsList.slice(0, INITIAL_GRID_LIMIT);
  }, [singleItemsList, showAllGridItems]);

  const scrollBundleCarouselTo = (index: number) => {
    if (!bundleCarouselRef.current || bundlesList.length === 0) return;
    const bounded = Math.max(0, Math.min(bundlesList.length - 1, index));
    setActiveBundleIdx(bounded);
    const container = bundleCarouselRef.current;
    const child = container.children[bounded] as HTMLElement | undefined;
    if (child) {
      container.scrollTo({
        left: child.offsetLeft - container.offsetLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleCarouselScroll = () => {
    if (!bundleCarouselRef.current) return;
    const container = bundleCarouselRef.current;
    const idx = Math.round(container.scrollLeft / Math.max(1, container.clientWidth * 0.85));
    setActiveBundleIdx(Math.max(0, Math.min(bundlesList.length - 1, idx)));
  };

  const handleUnlockOrClaimProduct = async (prod: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const activeUserId = currentUser?.id || user?.id;
    if (!activeUserId) {
      if (onLoginClick) onLoginClick();
      return;
    }

    if (isProductOwnedByUser(prod)) {
      setInspectedProduct(null);
      setAlreadyOwnedProduct(prod);
      return;
    }

    setLoadingActionId(prod.id);
    try {
      const [{ data: existingLedger }, { data: freshProf }] = await Promise.all([
        supabase
          .from('store_payout_ledger')
          .select('id')
          .eq('user_id', activeUserId)
          .eq('product_id', String(prod.id))
          .limit(1)
          .maybeSingle(),
        supabase.from('profiles').select('*').eq('id', activeUserId).maybeSingle()
      ]);

      const dbUnlockedSkins: string[] = Array.isArray(freshProf?.unlocked_skins)
        ? freshProf.unlocked_skins.map(String)
        : [];
      const prodSkinIds: string[] = Array.isArray(prod.card_skin_ids)
        ? prod.card_skin_ids.filter(Boolean).map(String)
        : [];
      const alreadyHasSkinsInDb =
        prodSkinIds.length > 0 && prodSkinIds.every(id => dbUnlockedSkins.includes(id));

      const dbUnlockedAvatars: string[] = Array.isArray(freshProf?.unlocked_avatars)
        ? freshProf.unlocked_avatars.map(String)
        : [];
      const prodAvatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean).map(String)
        : [];
      const alreadyHasAvatarsInDb =
        prod.product_type !== 'bundle' &&
        prodAvatars.length > 0 &&
        prodAvatars.every(url => dbUnlockedAvatars.includes(url));

      if (existingLedger || alreadyHasSkinsInDb || alreadyHasAvatarsInDb) {
        setPurchasedProductIds(prev => Array.from(new Set([...prev, String(prod.id)])));
        setInspectedProduct(null);
        setAlreadyOwnedProduct(prod);
        return;
      }

      const listedPrice = Number(prod.listed_price_dollars || 0);

      if (listedPrice <= 0) {
        if (freshProf) {
          await grantStoreProductToUser(prod, activeUserId, freshProf, false);
          setInspectedProduct(null);
        }
        return;
      }

      const returnUrl = `${window.location.origin}/?view=shop&store_product_success=${encodeURIComponent(
        prod.id
      )}`;

      const commCreators: string[] = Array.isArray(prod.commission_creators)
        ? prod.commission_creators.filter(Boolean)
        : [];
      const creatorBountyDollars =
        prod.product_type === 'bundle' && commCreators.length > 0
          ? Number(prod.commission_bounty_dollars ?? 5.0)
          : 0;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: prod.product_type === 'bundle' ? 'themed_bundle' : 'store_item',
          productType: prod.product_type,
          plan: prod.include_1yr_sub ? 'annual' : undefined,
          billingCycle: prod.include_1yr_sub ? 'annual' : undefined,
          bundleId: prod.id,
          bundleTitle: prod.title,
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
      alert('Unable to start checkout: ' + (err.message || 'Please try again.'));
    } finally {
      setLoadingActionId(null);
    }
  };

  const getSignatureUrlForCreator = (creatorName?: string) => {
    if (!creatorName) return '';
    for (const [k, url] of Object.entries(masterSignatures)) {
      if (url && doCreatorNamesMatch(creatorName, k)) return url;
    }
    return '';
  };

  const renderStampedCardPreview = (skin: any, compact = false) => {
    const stamps: any[] = Array.isArray(skin?.signature_stamps) ? skin.signature_stamps : [];
    return (
      <div
        key={skin.id}
        className="relative w-full aspect-[1.58] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-[#fe9a00]/80 bg-zinc-900 shadow-[0_10px_25px_rgba(0,0,0,0.85)] group/card transition-all duration-300 hover:border-white"
        style={{ containerType: 'inline-size' }}
      >
        <img
          src={skin.image_url}
          alt={skin.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
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

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 py-2 flex items-center justify-between z-30">
          <span
            className={`${
              compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'
            } font-black italic uppercase tracking-wider text-white drop-shadow-md truncate`}
          >
            {skin.name}
          </span>
          {!compact && (
            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#fe9a00] text-black shrink-0">
              Hype Card
            </span>
          )}
        </div>
      </div>
    );
  };

  if (storeProducts.length === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 mb-12 animate-fade-in">
      {storeToast && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {storeToast}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={navigateToUserProfile}
              className="px-3.5 py-1.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              View My Loadout
            </button>
            <button
              type="button"
              onClick={() => setStoreToast(null)}
              className="text-[10px] font-black uppercase text-emerald-300 hover:text-white cursor-pointer px-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* STICKY FILTER PILLS + SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Drops (${visibleProducts.length})` },
            { id: 'bundles', label: 'Bundles' },
            { id: 'skins', label: 'Card Skins ($10+)' },
            { id: 'avatars', label: 'Avatar Packs ($5+)' },
            { id: 'free', label: 'Free Claims' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id as any);
                setShowAllGridItems(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeCategory === tab.id
                  ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.35)]'
                  : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search drops, series..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
            />
          </div>
          <button
            type="button"
            onClick={navigateToUserProfile}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-colors shrink-0 cursor-pointer"
          >
            My Loadout
          </button>
        </div>
      </div>

      {/* 1. HORIZONTAL SNAP-SCROLL BUNDLE CAROUSEL */}
      {bundlesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#fe9a00]" />
              <h2 className="text-base sm:text-lg font-black italic uppercase tracking-wider text-white">
                Special Edition <span className="text-[#fe9a00]">Bundles ({bundlesList.length})</span>
              </h2>
            </div>

            {bundlesList.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Swipe ({activeBundleIdx + 1}/{bundlesList.length})
                </span>
                <button
                  type="button"
                  onClick={() => scrollBundleCarouselTo(activeBundleIdx - 1)}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollBundleCarouselTo(activeBundleIdx + 1)}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={bundleCarouselRef}
            onScroll={handleCarouselScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2"
          >
            {bundlesList.map(bundle => {
              const skinIds: string[] = Array.isArray(bundle.card_skin_ids)
                ? bundle.card_skin_ids
                : [];
              const bundleSkins = skinIds
                .map(id => (cardSkins || []).find((s: any) => String(s.id) === String(id)))
                .filter(Boolean);
              const avatars: string[] = Array.isArray(bundle.avatar_urls)
                ? bundle.avatar_urls.filter(Boolean)
                : [];
              const autographs: string[] = Array.isArray(bundle.autograph_creators)
                ? bundle.autograph_creators.filter(Boolean)
                : [];
              const price = Number(bundle.listed_price_dollars || 0);
              const normalPrice = Number(bundle.normal_price_dollars || 0);
              const hasDiscount = normalPrice > price && normalPrice > 0;
              const discountPct = hasDiscount
                ? Math.round(((normalPrice - price) / normalPrice) * 100)
                : 0;
              const bonusHypes = Number(bundle.bonus_vaulted_hypes || 0);

              const isBundleOwned = isProductOwnedByUser(bundle);

              return (
                <div
                  key={bundle.id}
                  onClick={() => setInspectedProduct(bundle)}
                  className={`snap-center shrink-0 ${
                    bundlesList.length > 1 ? 'w-[92%] sm:w-[88%] lg:w-[92%]' : 'w-full'
                  } relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-black border-2 border-[#fe9a00] rounded-3xl p-4 sm:p-6 shadow-[0_0_35px_rgba(254,154,0,0.18)] cursor-pointer group/bundle`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {bundle.promo_badge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fe9a00] text-black text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                          <Sparkles className="w-2.5 h-2.5 fill-black" />
                          {bundle.promo_badge}
                        </span>
                      )}
                      {isBundleOwned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                          ✓ IN YOUR COLLECTION
                        </span>
                      ) : (
                        discountPct > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                            SAVE {discountPct}% OFF
                          </span>
                        )
                      )}
                      {bundle.available_until && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-black uppercase tracking-widest">
                          <Clock className="w-2.5 h-2.5" /> Ends{' '}
                          {new Date(bundle.available_until).toLocaleDateString()}
                        </span>
                      )}
                      <h3 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-white">
                        {bundle.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {bundle.include_1yr_sub && (
                        <span className="px-2.5 py-1 rounded-xl bg-black/90 border border-[#fe9a00]/50 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                          <Crown className="w-3 h-3 text-[#fe9a00]" /> 1-Yr Pass
                        </span>
                      )}
                      {bonusHypes > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-950/90 border border-yellow-300 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-yellow-200 flex items-center gap-1">
                          <div
                            className="w-3 h-3 bg-gradient-to-t from-amber-400 via-yellow-200 to-white"
                            style={hypeIconMaskStyle}
                          />
                          +{bonusHypes} Gold Hypes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Stage: Side-by-Side Hype Cards */}
                  {bundleSkins.length > 0 && (
                    <div
                      className={`grid gap-2.5 sm:gap-4 mb-4 ${
                        bundleSkins.length === 1
                          ? 'grid-cols-1 max-w-md mx-auto'
                          : 'grid-cols-2'
                      }`}
                    >
                      {bundleSkins.map((sk: any) => renderStampedCardPreview(sk, true))}
                    </div>
                  )}

                  {/* Bottom Bar: Avatars + Autographs + Price & CTA */}
                  <div className="bg-black/85 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      {avatars.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {avatars.slice(0, 5).map((avUrl, idx) => (
                            <img
                              key={idx}
                              src={avUrl}
                              alt={`Avatar ${idx + 1}`}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900 shadow-md"
                            />
                          ))}
                        </div>
                      )}

                      {autographs.length > 0 && (
                        <div className="flex items-center gap-2 md:border-l md:border-zinc-800 md:pl-4">
                          {autographs.map((cName, idx) => {
                            const sigUrl = getSignatureUrlForCreator(cName);
                            return (
                              <div
                                key={idx}
                                className="bg-zinc-950 border border-[#fe9a00]/40 rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center"
                              >
                                {sigUrl && (
                                  <div className="w-16 sm:w-20 h-7 flex items-center justify-center">
                                    <div
                                      className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500"
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
                                )}
                                <span className="text-[7px] font-black uppercase tracking-widest text-[#fe9a00]">
                                  {cName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 shrink-0">
                      <div className="text-left md:text-right mr-1">
                        <div className="flex items-baseline gap-1.5">
                          {hasDiscount && (
                            <span className="text-sm font-black italic text-zinc-500 line-through">
                              ${normalPrice}
                            </span>
                          )}
                          <span className="text-2xl sm:text-3xl font-black italic text-white leading-none">
                            {price === 0 ? 'FREE' : `$${price}`}
                          </span>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#fe9a00] flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> Tap Card to Inspect
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={loadingActionId === bundle.id}
                        onClick={e => handleUnlockOrClaimProduct(bundle, e)}
                        className={`px-5 py-3.5 font-black uppercase tracking-widest text-[11px] rounded-xl transition-all cursor-pointer shrink-0 ${
                          isBundleOwned
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-400 hover:text-black'
                            : 'bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black shadow-[0_0_20px_rgba(254,154,0,0.4)]'
                        }`}
                      >
                        {loadingActionId === bundle.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isBundleOwned ? (
                          '✓ In Collection'
                        ) : price === 0 ? (
                          'Claim Free'
                        ) : (
                          `Unlock ($${price})`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {bundlesList.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {bundlesList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollBundleCarouselTo(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeBundleIdx === idx ? 'w-6 bg-[#fe9a00]' : 'w-1.5 bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          2. DIGITAL LOADOUT DROPS (FROSTED AVATAR BG + FULL MULTI-LINE TITLE)
      ===================================================================== */}
      {singleItemsList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#fe9a00]" />
              <h2 className="text-base sm:text-lg font-black italic uppercase tracking-wider text-white">
                Digital <span className="text-[#fe9a00]">Loadout Drops ({singleItemsList.length})</span>
              </h2>
            </div>

            {singleItemsList.length > INITIAL_GRID_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllGridItems(!showAllGridItems)}
                className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showAllGridItems
                  ? 'Show Less'
                  : `View All (${singleItemsList.length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayedGridItems.map(item => {
              const skinId = item.card_skin_ids?.[0];
              const linkedSkin = (cardSkins || []).find((s: any) => String(s.id) === String(skinId));
              const itemAvatars: string[] = Array.isArray(item.avatar_urls)
                ? item.avatar_urls.filter(Boolean)
                : [];
              const isAvatarItem =
                item.product_type === 'avatar_pack' ||
                item.product_type === 'single_avatar' ||
                (!linkedSkin && itemAvatars.length > 0);
              const frostedBgAvatarUrl =
                item.background_avatar_url || itemAvatars[0] || '';
              const previewImg = linkedSkin?.image_url || itemAvatars[0] || '';
              const stamps: any[] = Array.isArray(linkedSkin?.signature_stamps)
                ? linkedSkin.signature_stamps
                : [];

              const price = Number(item.listed_price_dollars || 0);
              const normalPrice = Number(item.normal_price_dollars || 0);
              const pctOff =
                normalPrice > price && normalPrice > 0
                  ? Math.round(((normalPrice - price) / normalPrice) * 100)
                  : 0;

              const isOwned = isProductOwnedByUser(item);
              const isEquipped = Boolean(linkedSkin && equippedSkinUrl === linkedSkin.image_url);

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectedProduct(item)}
                  className="bg-black border border-zinc-800 hover:border-[#fe9a00] rounded-2xl overflow-hidden flex flex-col justify-between transition-all group cursor-pointer shadow-lg"
                >
                  <div
                    className="relative aspect-[1.58] bg-zinc-950 overflow-hidden flex items-center justify-center"
                    style={{ containerType: 'inline-size' }}
                  >
                    {/* FROSTED / BLURRED AVATAR BACKDROP FOR AVATAR PACKS & SINGLE AVATARS */}
                    {isAvatarItem && frostedBgAvatarUrl && (
                      <>
                        <img
                          src={frostedBgAvatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover scale-125 blur-md opacity-50 group-hover:scale-135 transition-transform duration-700 pointer-events-none select-none"
                        />
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />
                      </>
                    )}

                    {itemAvatars.length > 1 ? (
                      <div className="relative z-10 flex items-center justify-center -space-x-2.5 sm:-space-x-3 p-3">
                        {itemAvatars.slice(0, 5).map((avUrl: string, idx: number) => (
                          <img
                            key={idx}
                            src={avUrl}
                            alt={`${item.title} ${idx + 1}`}
                            loading="lazy"
                            className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-[0_6px_16px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform"
                          />
                        ))}
                      </div>
                    ) : (
                      previewImg && (
                        <img
                          src={previewImg}
                          alt={item.title}
                          loading="lazy"
                          className={`relative z-10 ${
                            isAvatarItem
                              ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#fe9a00] shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
                              : 'w-full h-full object-cover'
                          } group-hover:scale-105 transition-transform duration-500`}
                        />
                      )
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10" />

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
                            className={`w-full h-full ${bgClass}`}
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

                    <div className="absolute top-2 left-2 z-30 flex gap-1">
                      {pctOff > 0 && (
                        <span className="bg-emerald-400 text-black text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                          {pctOff}% OFF
                        </span>
                      )}
                      {itemAvatars.length > 1 && (
                        <span className="bg-[#fe9a00] text-black text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow">
                          {itemAvatars.length}-PACK
                        </span>
                      )}
                    </div>

                    <span className="absolute top-2 right-2 z-30 bg-black/85 border border-[#fe9a00] text-[#fe9a00] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow">
                      {price === 0 ? 'FREE' : `$${price.toFixed(2)}`}
                    </span>
                  </div>

                  {/* Full 2-Line Title Support so "MMWOG DIWALI AVATAR PACK" is Never Cut Off */}
                  <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 bg-zinc-950 border-t border-zinc-900 min-h-[52px]">
                    <h3 className="text-[10px] sm:text-xs font-black italic uppercase tracking-wider text-white leading-tight line-clamp-2 break-words flex-1">
                      {item.title}
                    </h3>

                    {isEquipped ? (
                      <button
                        type="button"
                        onClick={e => handleUnlockOrClaimProduct(item, e)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-[#fe9a00] text-[8px] font-black uppercase shrink-0 cursor-pointer"
                      >
                        Active
                      </button>
                    ) : isOwned ? (
                      <button
                        type="button"
                        onClick={e => handleUnlockOrClaimProduct(item, e)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase shrink-0 cursor-pointer"
                      >
                        Owned
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingActionId === item.id}
                        onClick={e => handleUnlockOrClaimProduct(item, e)}
                        className="px-3 py-1.5 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer shrink-0"
                      >
                        {price === 0 ? 'Claim' : 'Get'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {singleItemsList.length > INITIAL_GRID_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllGridItems(!showAllGridItems)}
              className="w-full py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {showAllGridItems ? (
                <>
                  <ChevronUp className="w-4 h-4 text-[#fe9a00]" /> Collapse Digital Drops
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-[#fe9a00]" /> Show All {singleItemsList.length} Digital Drops
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* =====================================================================
          3. TAP-TO-INSPECT FULL VISUAL SHOWCASE MODAL (WITH TOP & BOTTOM SPACERS)
      ===================================================================== */}
      {inspectedProduct && (
        <div
          className="fixed inset-0 z-[9000] bg-black/92 backdrop-blur-xl flex items-start justify-center p-4 pt-24 sm:pt-28 pb-36 sm:pb-40 overflow-y-auto animate-fade-in"
          onClick={() => setInspectedProduct(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-2 border-[#fe9a00] rounded-3xl p-5 sm:p-7 max-w-3xl w-full space-y-5 shadow-[0_0_60px_rgba(254,154,0,0.3)] relative"
          >
            <button
              type="button"
              onClick={() => setInspectedProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {(() => {
              const prod = inspectedProduct;
              const skinIds: string[] = Array.isArray(prod.card_skin_ids)
                ? prod.card_skin_ids
                : [];
              const prodSkins = skinIds
                .map(id => (cardSkins || []).find((s: any) => String(s.id) === String(id)))
                .filter(Boolean);
              const avatars: string[] = Array.isArray(prod.avatar_urls)
                ? prod.avatar_urls.filter(Boolean)
                : [];
              const autographs: string[] = Array.isArray(prod.autograph_creators)
                ? prod.autograph_creators.filter(Boolean)
                : [];
              const price = Number(prod.listed_price_dollars || 0);
              const normalPrice = Number(prod.normal_price_dollars || 0);
              const hasDiscount = normalPrice > price && normalPrice > 0;
              const discountPct = hasDiscount
                ? Math.round(((normalPrice - price) / normalPrice) * 100)
                : 0;
              const bonusHypes = Number(prod.bonus_vaulted_hypes || 0);
              const isOwned = isProductOwnedByUser(prod);

              return (
                <>
                  {/* Top Cushion so Headline & Description Never Clip Under Sticky Header */}
                  <div className="pt-1 pr-10">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {prod.promo_badge && (
                        <span className="px-3 py-0.5 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest">
                          {prod.promo_badge}
                        </span>
                      )}
                      {isOwned ? (
                        <span className="px-3 py-0.5 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest">
                          ✓ ALREADY IN YOUR COLLECTION
                        </span>
                      ) : (
                        discountPct > 0 && (
                          <span className="px-3 py-0.5 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest">
                            SAVE {discountPct}% OFF
                          </span>
                        )
                      )}
                      {prod.include_1yr_sub && (
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-[#fe9a00]/50 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Crown className="w-3 h-3 text-[#fe9a00]" /> 1-Year VIP Pass
                        </span>
                      )}
                      {bonusHypes > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-yellow-300 text-yellow-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          +{bonusHypes} Gold Hypes
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                      {prod.title}
                    </h3>
                    {prod.description && (
                      <p className="text-xs sm:text-sm text-zinc-300 font-bold mt-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Full-Size Hype Cards Showcase */}
                  {prodSkins.length > 0 && (
                    <div
                      className={`grid gap-4 ${
                        prodSkins.length === 1
                          ? 'grid-cols-1 max-w-md mx-auto'
                          : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {prodSkins.map((sk: any) => renderStampedCardPreview(sk))}
                    </div>
                  )}

                  {/* Full-Size Character Avatars Showcase (with Frosted Avatar Backdrop) */}
                  {avatars.length > 0 && (
                    <div className="relative overflow-hidden bg-black/80 border border-zinc-800 rounded-2xl p-5">
                      {prodSkins.length === 0 && avatars[0] && (
                        <>
                          <img
                            src={prod.background_avatar_url || avatars[0]}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-30 pointer-events-none select-none"
                          />
                          <div className="absolute inset-0 bg-black/55 pointer-events-none" />
                        </>
                      )}
                      <span className="relative z-10 block text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-3.5 text-center">
                        {avatars.length} Exclusive Character Avatar{avatars.length > 1 ? 's' : ''}
                      </span>
                      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
                        {avatars.map((avUrl, idx) => {
                          const matchedAv = (vaultAvatars || []).find(
                            (a: any) => a.image_url === avUrl
                          );
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                              <img
                                src={avUrl}
                                alt={matchedAv?.name || 'Avatar'}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900 shadow-lg"
                              />
                              {matchedAv?.name && (
                                <span className="text-[9px] font-black uppercase text-zinc-200">
                                  {matchedAv.name.replace(/mmwog/i, '').trim()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full-Size Creator Autographs Showcase */}
                  {autographs.length > 0 && (
                    <div className="bg-black/70 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-center gap-4">
                      {autographs.map((cName, idx) => {
                        const sigUrl = getSignatureUrlForCreator(cName);
                        return (
                          <div
                            key={idx}
                            className="bg-zinc-950 border border-[#fe9a00]/40 rounded-xl px-4 py-2 flex flex-col items-center"
                          >
                            {sigUrl ? (
                              <div className="w-24 h-10 flex items-center justify-center mb-1">
                                <div
                                  className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500"
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
                            ) : (
                              <PenTool className="w-5 h-5 text-[#fe9a00] my-1" />
                            )}
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00]">
                              {cName} Autograph
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Checkout Bar */}
                  <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-lg font-black italic text-zinc-500 line-through">
                            ${normalPrice}
                          </span>
                        )}
                        <span className="text-3xl sm:text-4xl font-black italic text-[#fe9a00]">
                          {price === 0 ? 'FREE' : `$${price}`}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                        <ShieldCheck className="w-3 h-3 text-[#fe9a00]" />{' '}
                        {isOwned
                          ? 'Duplicate Purchase Protection Active'
                          : 'Secure Stripe Checkout'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                      {isOwned ? (
                        <button
                          type="button"
                          onClick={navigateToUserProfile}
                          className="w-full sm:w-auto px-7 py-4 rounded-xl bg-emerald-500 hover:bg-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer"
                        >
                          ✓ In Collection • View in Profile
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingActionId === prod.id}
                          onClick={e => handleUnlockOrClaimProduct(prod, e)}
                          className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(254,154,0,0.45)] cursor-pointer"
                        >
                          {loadingActionId === prod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : price === 0 ? (
                            'Claim Free Now'
                          ) : (
                            `Unlock Now ($${price})`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. DUPLICATE PURCHASE SAFETY MODAL ("ALREADY IN YOUR COLLECTION") */}
      {alreadyOwnedProduct && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setAlreadyOwnedProduct(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-emerald-500 rounded-3xl p-7 sm:p-8 max-w-md w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] relative"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase tracking-widest mb-2">
              Duplicate Purchase Protection
            </span>

            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              Already in Your Collection!
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 font-bold leading-relaxed mb-6">
              You already unlocked <span className="text-[#fe9a00] font-black">&ldquo;{alreadyOwnedProduct.title}&rdquo;</span>! To protect your wallet, we prevented a duplicate purchase. All included Card Skins, Avatars, and Autographs are ready to equip in your Profile.
            </p>

            <button
              type="button"
              onClick={navigateToUserProfile}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(254,154,0,0.4)] mb-2.5 cursor-pointer"
            >
              View in My Profile &amp; Loadout
            </button>

            <button
              type="button"
              onClick={() => setAlreadyOwnedProduct(null)}
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] transition-colors cursor-pointer"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
};