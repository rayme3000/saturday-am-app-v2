import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Check,
  X,
  PenTool,
  Save,
  Loader2,
  DollarSign,
  Calendar,
  Move,
  PackageOpen,
  Layers,
  Crown,
  Flame,
  BookmarkPlus,
  FileText,
  Upload,
  Search,
  User,
  ShieldCheck,
  Trophy
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export interface CardSignatureStamp {
  id: string;
  creator_name: string;
  signature_url: string;
  x: number;
  y: number;
  scale: number;
  color_mode: 'gold' | 'white' | 'black';
}

export type StoreCatalogSubCategory =
  | 'all'
  | 'sub_bundle'
  | 'hype_card_bundle'
  | 'single_skin'
  | 'avatar_pack'
  | 'emoji_pack'
  | 'collectable';

export interface ProductFormState {
  id: string;
  slug: string;
  product_type: 'single_skin' | 'avatar_pack' | 'bundle' | 'emoji_pack' | 'collectable';
  is_contest_only: boolean;
  title: string;
  description: string;
  promo_badge: string;
  listed_price_dollars: string;
  normal_price_dollars: string;
  promo_code: string;
  include_1yr_sub: boolean;
  card_skin_ids: string[];
  avatar_urls: string[];
  background_avatar_url: string;
  autograph_creators: string[];
  bonus_vaulted_hypes: number;
  commission_creator_1: string;
  commission_creator_2: string;
  commission_bounty_dollars: number;
  available_from: string;
  available_until: string;
  is_active: boolean;
}

export interface SavedStoreTemplate {
  id: string;
  template_name: string;
  template_payload: ProductFormState;
}

const LOCAL_TEMPLATES_STORAGE_KEY = 'am_store_custom_templates_v1';

const toDateTimeLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const makeSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') +
  '-' +
  Math.random().toString(36).slice(2, 6);

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: '',
  slug: '',
  product_type: 'bundle',
  is_contest_only: false,
  title: '',
  description: '',
  promo_badge: '',
  listed_price_dollars: '24.99',
  normal_price_dollars: '35.00',
  promo_code: '',
  include_1yr_sub: true,
  card_skin_ids: [''],
  avatar_urls: ['', '', ''],
  background_avatar_url: '',
  autograph_creators: [''],
  bonus_vaulted_hypes: 10,
  commission_creator_1: '',
  commission_creator_2: '',
  commission_bounty_dollars: 5.0,
  available_from: '',
  available_until: '',
  is_active: true
};

const BUILT_IN_SUBSCRIPTION_BUNDLE_TEMPLATE: ProductFormState = {
  ...EMPTY_PRODUCT_FORM,
  product_type: 'bundle',
  is_contest_only: false,
  title: 'MMWOG Diwali Annual Bundle',
  description:
    'Includes 1-Year Full App Pass, 2 Exclusive Hype Cards by Oscar Fong, 5 Character Avatars (Dia, Anil, Nilay, Tricia, Steel Tusk Durga), Oscar Fong & Frederick L. Jones Autographs, and +10 Vaulted Gold Hypes!',
  promo_badge: 'SPECIAL BUNDLE',
  listed_price_dollars: '24.99',
  normal_price_dollars: '35.00',
  promo_code: 'DIWALI-2026',
  include_1yr_sub: true,
  card_skin_ids: ['', ''],
  avatar_urls: ['', '', '', '', ''],
  autograph_creators: ['Oscar Fong', 'Frederick L. Jones'],
  bonus_vaulted_hypes: 10,
  commission_creator_1: 'Oscar Fong',
  commission_creator_2: 'Frederick L. Jones',
  commission_bounty_dollars: 5.0,
  is_active: true
};

const isContestOnlyProduct = (prod: any): boolean => {
  if (!prod) return false;
  const badge = String(prod.promo_badge || '').toUpperCase();
  return !prod.is_active && badge.includes('CONTEST');
};

export const StoreManager: React.FC<{ setIsDirty?: (v: boolean) => void }> = ({ setIsDirty }) => {
  const {
    seriesList = [],
    cardSkins: contextSkins = [],
    vaultAvatars: contextAvatars = []
  } = useSeriesData();

  const [products, setProducts] = useState<any[]>([]);
  const [dbSkins, setDbSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [dbCreators, setDbCreators] = useState<string[]>([]);
  const [signatureMap, setSignatureMap] = useState<Record<string, string>>({});
  const [customTemplates, setCustomTemplates] = useState<SavedStoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Catalog Organization & Filter State
  const [catalogViewFilter, setCatalogViewFilter] = useState<'all' | 'live' | 'contest'>('all');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<StoreCatalogSubCategory>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Shopify-style Product Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_PRODUCT_FORM });

  // Visual Avatar Picker Modal State (Supports unlimited slots by index)
  const [activeAvatarSlotIndex, setActiveAvatarSlotIndex] = useState<number | null>(null);
  const [avatarSearchQuery, setAvatarSearchQuery] = useState('');

  // Interactive Hype Card Signature Studio Modal State
  const [editingStampSkin, setEditingStampSkin] = useState<any | null>(null);
  const [activeStamps, setActiveStamps] = useState<CardSignatureStamp[]>([]);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [selectedSigToAdd, setSelectedSigToAdd] = useState<string>('');
  const [draggingStampId, setDraggingStampId] = useState<string | null>(null);
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const fetchCatalogAndVault = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: prodData },
        { data: cardSkinsData },
        { data: vaultSkinsData },
        { data: vaultAvatarsData },
        { data: legacyAvatarsData },
        { data: creatorsData },
        { data: sigsData },
        templatesRes
      ] = await Promise.all([
        supabase
          .from('in_app_store_products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('card_skins').select('*').order('created_at', { ascending: false }),
        supabase.from('vault_card_skins').select('*').order('created_at', { ascending: false }),
        supabase.from('vault_avatars').select('*').order('created_at', { ascending: false }),
        supabase.from('avatars').select('*').order('created_at', { ascending: false }),
        supabase.from('series_creators').select('name'),
        supabase.from('creator_signatures').select('creator_name, signature_url'),
        supabase
          .from('in_app_store_templates')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (prodData) setProducts(prodData);

      const mergedDbSkins = [...(cardSkinsData || []), ...(vaultSkinsData || [])];
      setDbSkins(mergedDbSkins);

      const mergedDbAvatars = [...(vaultAvatarsData || []), ...(legacyAvatarsData || [])];
      setDbAvatars(mergedDbAvatars);

      const sigLookup: Record<string, string> = {};
      (sigsData || []).forEach((r: any) => {
        if (r.creator_name && r.signature_url) {
          sigLookup[r.creator_name.trim()] = r.signature_url;
        }
      });
      setSignatureMap(sigLookup);

      const names = [
        ...(creatorsData || []).map((r: any) => r.name),
        ...(sigsData || []).map((r: any) => r.creator_name)
      ].filter(Boolean);
      setDbCreators(names);

      let localList: SavedStoreTemplate[] = [];
      try {
        localList = JSON.parse(localStorage.getItem(LOCAL_TEMPLATES_STORAGE_KEY) || '[]');
      } catch {
        localList = [];
      }

      if (templatesRes?.data && Array.isArray(templatesRes.data)) {
        const dbList: SavedStoreTemplate[] = templatesRes.data.map((row: any) => ({
          id: String(row.id),
          template_name: row.template_name,
          template_payload: row.template_payload || { ...EMPTY_PRODUCT_FORM }
        }));
        const mergedMap = new Map<string, SavedStoreTemplate>();
        [...dbList, ...localList].forEach(t => {
          mergedMap.set(t.template_name.toLowerCase(), t);
        });
        setCustomTemplates(Array.from(mergedMap.values()));
      } else {
        setCustomTemplates(localList);
      }
    } catch (err) {
      console.error('Error loading In-App Store Catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogAndVault();
    window.addEventListener('vaultUpdated', fetchCatalogAndVault);
    window.addEventListener('seriesUpdated', fetchCatalogAndVault);
    return () => {
      window.removeEventListener('vaultUpdated', fetchCatalogAndVault);
      window.removeEventListener('seriesUpdated', fetchCatalogAndVault);
    };
  }, [fetchCatalogAndVault]);

  // Master Synced Card Skins (Merges `card_skins`, `vault_card_skins`, and `useSeriesData` skins!)
  const skins = useMemo(() => {
    const map = new Map<string, any>();
    [...dbSkins, ...(contextSkins || [])].forEach((sk: any) => {
      if (sk && sk.id && sk.image_url) {
        map.set(String(sk.id), sk);
      }
    });
    return Array.from(map.values());
  }, [dbSkins, contextSkins]);

  // Master Synced Avatars (Merges `vault_avatars`, `avatars`, and `useSeriesData` avatars!)
  const allVaultAvatars = useMemo(() => {
    const map = new Map<string, any>();
    [...dbAvatars, ...(contextAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) {
        map.set(String(av.image_url), av);
      }
    });
    return Array.from(map.values());
  }, [dbAvatars, contextAvatars]);

  const filteredModalAvatars = useMemo(() => {
    const q = avatarSearchQuery.trim().toLowerCase();
    if (!q) return allVaultAvatars;
    return allVaultAvatars.filter(
      (av: any) =>
        String(av.name || '').toLowerCase().includes(q) ||
        String(av.series_title || '').toLowerCase().includes(q)
    );
  }, [allVaultAvatars, avatarSearchQuery]);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    dbCreators.forEach(name => {
      if (name && name.trim().length >= 2) uniqueMap.set(name.trim().toLowerCase(), name.trim());
    });
    seriesList.forEach((s: any) => {
      if (s.creator_name) uniqueMap.set(s.creator_name.trim().toLowerCase(), s.creator_name.trim());
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const discountPercentPreview = useMemo(() => {
    const normal = Number(form.normal_price_dollars || 0);
    const listed = Number(form.listed_price_dollars || 0);
    if (normal > listed && normal > 0) {
      return Math.round(((normal - listed) / normal) * 100);
    }
    return 0;
  }, [form.normal_price_dollars, form.listed_price_dollars]);

  // Live Net Retained Cash Breakdown
  const netBreakdownPreview = useMemo(() => {
    const gross = Math.max(0, Number(form.listed_price_dollars || 0));
    if (gross <= 0) {
      return { stripeFee: 0, creatorBounty: 0, devAlloc: 0, netRetained: 0 };
    }
    const stripeFee = Number((gross * 0.029 + 0.3).toFixed(2));
    const hasCreators = Boolean(form.commission_creator_1 || form.commission_creator_2);
    const creatorBounty =
      form.product_type === 'bundle' && hasCreators
        ? Math.max(0, Number(form.commission_bounty_dollars ?? 5.0))
        : 0;
    const devAlloc =
      form.product_type === 'bundle' && form.include_1yr_sub
        ? 1.5
        : Number((gross * 0.1).toFixed(2));
    const netRetained = Math.max(
      0,
      Number((gross - stripeFee - creatorBounty - devAlloc).toFixed(2))
    );
    return { stripeFee, creatorBounty, devAlloc, netRetained };
  }, [
    form.listed_price_dollars,
    form.product_type,
    form.commission_creator_1,
    form.commission_creator_2,
    form.commission_bounty_dollars,
    form.include_1yr_sub
  ]);

  const handleSelectProductType = (
    nextType: 'bundle' | 'single_skin' | 'avatar_pack' | 'emoji_pack' | 'collectable',
    includeSubOverride?: boolean
  ) => {
    setForm(prev => {
      const currentListed = Number(prev.listed_price_dollars || 0);
      let nextListed = prev.listed_price_dollars;
      let nextNormal = prev.normal_price_dollars;

      if (nextType === 'single_skin') {
        if (currentListed > 0 && currentListed < 10) nextListed = '10.00';
        if (!prev.id) {
          nextListed = '10.00';
          nextNormal = '';
        }
      } else if (nextType === 'avatar_pack' || nextType === 'emoji_pack') {
        if (currentListed > 0 && currentListed < 5) nextListed = '5.00';
        if (!prev.id) {
          nextListed = '5.00';
          nextNormal = '';
        }
      } else if (nextType === 'collectable') {
        if (!prev.id) {
          nextListed = '15.00';
          nextNormal = '';
        }
      } else if (nextType === 'bundle' && !prev.id) {
        nextListed = includeSubOverride === false ? '14.99' : '24.99';
        nextNormal = includeSubOverride === false ? '20.00' : '35.00';
      }

      const resolvedIncludeSub =
        nextType === 'bundle'
          ? includeSubOverride !== undefined
            ? includeSubOverride
            : prev.include_1yr_sub
          : false;

      return {
        ...prev,
        product_type: nextType,
        listed_price_dollars: nextListed,
        normal_price_dollars: nextNormal,
        include_1yr_sub: resolvedIncludeSub
      };
    });
  };

  const openNewProductModal = (
    preset?: 'subscription_bundle' | 'contest_bundle' | 'single_skin' | 'avatar_pack'
  ) => {
    fetchCatalogAndVault();
    if (preset === 'subscription_bundle') {
      setForm({
        ...BUILT_IN_SUBSCRIPTION_BUNDLE_TEMPLATE,
        id: '',
        slug: ''
      });
    } else if (preset === 'contest_bundle') {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        product_type: 'bundle',
        is_contest_only: true,
        title: '',
        description:
          'Exclusive Contest Winner Bundle! Includes Hype Card Skins, Character Avatars, Gold Signatures & Bonus Hypes.',
        promo_badge: 'CONTEST PRIZE BUNDLE',
        listed_price_dollars: '24.99',
        normal_price_dollars: '35.00',
        promo_code: `CONTEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        include_1yr_sub: true,
        card_skin_ids: [''],
        avatar_urls: ['', '', ''],
        autograph_creators: [''],
        bonus_vaulted_hypes: 10,
        is_active: false
      });
    } else if (preset === 'single_skin') {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        product_type: 'single_skin',
        is_contest_only: false,
        title: '',
        description:
          'Unlock this exclusive Hype Card skin for your profile & permanent art collection.',
        promo_badge: '',
        listed_price_dollars: '10.00',
        normal_price_dollars: '',
        promo_code: '',
        include_1yr_sub: false,
        card_skin_ids: [''],
        avatar_urls: [],
        autograph_creators: [],
        bonus_vaulted_hypes: 0,
        commission_bounty_dollars: 0,
        is_active: true
      });
    } else if (preset === 'avatar_pack') {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        product_type: 'avatar_pack',
        is_contest_only: false,
        title: '',
        description: 'Unlock this exclusive Character Avatar Pack for your profile loadout.',
        promo_badge: 'AVATAR PACK',
        listed_price_dollars: '5.00',
        normal_price_dollars: '',
        promo_code: '',
        include_1yr_sub: false,
        card_skin_ids: [],
        avatar_urls: ['', '', ''],
        autograph_creators: [],
        bonus_vaulted_hypes: 0,
        commission_bounty_dollars: 0,
        is_active: true
      });
    } else {
      setForm({ ...EMPTY_PRODUCT_FORM });
    }
    setIsComposerOpen(true);
  };

  const applySavedTemplate = (tplPayload: any) => {
    const legacySkins = [tplPayload.card_skin_1, tplPayload.card_skin_2].filter(Boolean);
    const legacyAvatars = [
      tplPayload.avatar_1,
      tplPayload.avatar_2,
      tplPayload.avatar_3,
      tplPayload.avatar_4,
      tplPayload.avatar_5
    ].filter(Boolean);
    const legacyAutos = [tplPayload.autograph_1, tplPayload.autograph_2].filter(Boolean);

    setForm({
      ...EMPTY_PRODUCT_FORM,
      ...tplPayload,
      card_skin_ids:
        Array.isArray(tplPayload.card_skin_ids) && tplPayload.card_skin_ids.length > 0
          ? tplPayload.card_skin_ids
          : legacySkins.length > 0
          ? legacySkins
          : [''],
      avatar_urls:
        Array.isArray(tplPayload.avatar_urls) && tplPayload.avatar_urls.length > 0
          ? tplPayload.avatar_urls
          : legacyAvatars.length > 0
          ? legacyAvatars
          : ['', '', ''],
      autograph_creators:
        Array.isArray(tplPayload.autograph_creators) && tplPayload.autograph_creators.length > 0
          ? tplPayload.autograph_creators
          : legacyAutos.length > 0
          ? legacyAutos
          : [''],
      id: form.id,
      slug: form.id ? form.slug : ''
    });
    if (setIsDirty) setIsDirty(true);
    showToast('Loaded template into product builder!');
  };

  const handleSaveCurrentAsTemplate = async () => {
    const defaultName = form.title.trim()
      ? `${form.title.trim()} Template`
      : 'Custom Subscription Bundle';
    const tplName = window.prompt(
      'Enter a name for this reusable Store Template:',
      defaultName
    );
    if (!tplName || !tplName.trim()) return;

    setSavingTemplate(true);
    try {
      const cleanName = tplName.trim();
      const payloadToSave: ProductFormState = {
        ...form,
        id: '',
        slug: ''
      };

      const newEntry: SavedStoreTemplate = {
        id: `tpl_${Date.now()}`,
        template_name: cleanName,
        template_payload: payloadToSave
      };

      const nextLocal = [
        newEntry,
        ...customTemplates.filter(
          t => t.template_name.toLowerCase() !== cleanName.toLowerCase()
        )
      ];
      try {
        localStorage.setItem(LOCAL_TEMPLATES_STORAGE_KEY, JSON.stringify(nextLocal));
      } catch {
        // ignore
      }
      setCustomTemplates(nextLocal);

      await supabase.from('in_app_store_templates').insert([
        {
          template_name: cleanName,
          template_payload: payloadToSave
        }
      ]);

      showToast(`Saved "${cleanName}" to your Store Templates!`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (tpl: SavedStoreTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete saved template "${tpl.template_name}"?`)) return;

    const next = customTemplates.filter(t => t.id !== tpl.id);
    setCustomTemplates(next);
    try {
      localStorage.setItem(LOCAL_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    await supabase
      .from('in_app_store_templates')
      .delete()
      .eq('template_name', tpl.template_name);
  };

  const openEditProductModal = (prod: any) => {
    fetchCatalogAndVault();
    const skinIds: string[] = Array.isArray(prod.card_skin_ids)
      ? prod.card_skin_ids.filter(Boolean)
      : [prod.card_skin_id, prod.card_skin_2_id].filter(Boolean);
    const avUrls: string[] = Array.isArray(prod.avatar_urls)
      ? prod.avatar_urls.filter(Boolean)
      : [];
    const autoList: string[] = Array.isArray(prod.autograph_creators)
      ? prod.autograph_creators.filter(Boolean)
      : [];
    const commList: string[] = Array.isArray(prod.commission_creators)
      ? prod.commission_creators
      : [];

    const normalizedType =
      prod.product_type === 'single_avatar' ? 'avatar_pack' : prod.product_type || 'bundle';

    const contestOnly = isContestOnlyProduct(prod);

    setForm({
      id: prod.id,
      slug: prod.slug || '',
      product_type: normalizedType,
      is_contest_only: contestOnly,
      title: prod.title || '',
      description: prod.description || '',
      promo_badge: prod.promo_badge || '',
      listed_price_dollars: String(prod.listed_price_dollars ?? 0),
      normal_price_dollars:
        prod.normal_price_dollars !== null && prod.normal_price_dollars !== undefined
          ? String(prod.normal_price_dollars)
          : '',
      promo_code: prod.promo_code || '',
      include_1yr_sub: Boolean(prod.include_1yr_sub),
      card_skin_ids: skinIds.length > 0 ? skinIds : [''],
      avatar_urls: avUrls.length > 0 ? avUrls : ['', '', ''],
      background_avatar_url: prod.background_avatar_url || avUrls[0] || '',
      autograph_creators: autoList.length > 0 ? autoList : [''],
      bonus_vaulted_hypes: Number(prod.bonus_vaulted_hypes || 0),
      commission_creator_1: commList[0] || '',
      commission_creator_2: commList[1] || '',
      commission_bounty_dollars: Number(prod.commission_bounty_dollars ?? 5.0),
      available_from: toDateTimeLocalInput(prod.available_from),
      available_until: toDateTimeLocalInput(prod.available_until),
      is_active: prod.is_active !== false
    });
    setIsComposerOpen(true);
  };

  const saveProductWithStatus = async (
    publishActiveStatus: boolean,
    forceContestOnly?: boolean
  ) => {
    if (!form.title.trim()) return alert('Please enter a Product Title.');

    const isContestBundle =
      forceContestOnly !== undefined ? forceContestOnly : form.is_contest_only;
    // Contest-only bundles are saved with `is_active: false` so they don't appear in the public store
    const effectiveActiveStatus = isContestBundle ? false : publishActiveStatus;

    const listedPrice = Math.max(0, Number(form.listed_price_dollars || 0));

    if (
      !isContestBundle &&
      form.product_type === 'single_skin' &&
      listedPrice > 0 &&
      listedPrice < 10
    ) {
      return alert(
        'Individual Hype Card Skins must be priced at $10.00 or higher (or $0.00 for a Free Starter Skin).'
      );
    }

    if (
      !isContestBundle &&
      form.product_type === 'avatar_pack' &&
      listedPrice > 0 &&
      listedPrice < 5
    ) {
      return alert('Character Avatar Packs must be priced at $5.00 or higher.');
    }

    const avatarUrls =
      form.product_type === 'single_skin'
        ? []
        : Array.from(new Set(form.avatar_urls.filter(Boolean)));

    if (form.product_type === 'avatar_pack' && avatarUrls.length === 0) {
      return alert('Please attach at least 1 character avatar from your Vault to this Avatar Pack.');
    }

    setSaving(true);
    try {
      const cardSkinIds =
        form.product_type === 'avatar_pack'
          ? []
          : form.product_type === 'single_skin'
          ? [form.card_skin_ids[0]].filter(Boolean)
          : Array.from(new Set(form.card_skin_ids.filter(Boolean)));

      const autographCreators =
        form.product_type === 'bundle'
          ? Array.from(new Set(form.autograph_creators.map(s => s.trim()).filter(Boolean)))
          : [];

      const commissionCreators =
        form.product_type === 'bundle'
          ? [form.commission_creator_1, form.commission_creator_2].filter(Boolean)
          : [];
      const flatBounty =
        form.product_type === 'bundle' && commissionCreators.length > 0
          ? Math.max(0, Number(form.commission_bounty_dollars ?? 5.0))
          : 0;

      const cleanSlug = form.slug.trim() || makeSlug(form.title.trim());
      const cleanPromoCode = form.promo_code.trim().toUpperCase().replace(/\s+/g, '-');

      const normalPrice =
        form.normal_price_dollars !== '' && Number(form.normal_price_dollars) > 0
          ? Number(form.normal_price_dollars)
          : null;

      const chosenBgAvatar =
        form.background_avatar_url && avatarUrls.includes(form.background_avatar_url)
          ? form.background_avatar_url
          : avatarUrls[0] || null;

      const rawBadge = form.promo_badge.trim().toUpperCase();
      const finalBadge = isContestBundle
        ? rawBadge.includes('CONTEST')
          ? rawBadge
          : `CONTEST ONLY • ${rawBadge || 'PRIZE BUNDLE'}`
        : rawBadge.replace(/^CONTEST ONLY\s*•\s*/i, '').trim() || null;

      const sk1 = skins.find(s => String(s.id) === String(cardSkinIds[0]));
      const sk2 = skins.find(s => String(s.id) === String(cardSkinIds[1]));

      const payload: Record<string, any> = {
        slug: cleanSlug,
        product_type: form.product_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        promo_badge: finalBadge,
        listed_price_dollars: listedPrice,
        normal_price_dollars: normalPrice,
        promo_code: cleanPromoCode || null,
        include_1yr_sub: form.product_type === 'bundle' ? Boolean(form.include_1yr_sub) : false,
        card_skin_ids: cardSkinIds,
        avatar_urls: avatarUrls,
        background_avatar_url: chosenBgAvatar,
        autograph_creators: autographCreators,
        bonus_vaulted_hypes:
          form.product_type === 'bundle' ? Math.max(0, Number(form.bonus_vaulted_hypes || 0)) : 0,
        commission_creators: commissionCreators,
        commission_bounty_dollars: flatBounty,
        commission_percentage: 0,
        available_from: form.available_from ? new Date(form.available_from).toISOString() : null,
        available_until: form.available_until ? new Date(form.available_until).toISOString() : null,
        is_active: effectiveActiveStatus
      };

      const executeUpsert = async (dataPayload: Record<string, any>) => {
        if (form.id) {
          return supabase.from('in_app_store_products').update(dataPayload).eq('id', form.id);
        } else {
          return supabase.from('in_app_store_products').insert([dataPayload]);
        }
      };

      let { error } = await executeUpsert(payload);
      if (error && String(error.message || '').includes('background_avatar_url')) {
        const { background_avatar_url, ...fallbackPayload } = payload;
        const retryRes = await executeUpsert(fallbackPayload);
        error = retryRes.error;
      }
      if (error) throw error;

      if (form.product_type === 'bundle') {
        await supabase.from('themed_annual_bundles').upsert(
          [
            {
              title: payload.title,
              subtitle: payload.description,
              theme_badge: finalBadge || 'SPECIAL EDITION BUNDLE',
              price_dollars: listedPrice,
              original_price_dollars: normalPrice || listedPrice,
              card_skin_id: cardSkinIds[0] || null,
              card_skin_name: sk1?.name || null,
              card_skin_url: sk1?.image_url || null,
              card_skin_2_id: cardSkinIds[1] || null,
              card_skin_2_name: sk2?.name || null,
              card_skin_2_url: sk2?.image_url || null,
              avatar_urls: avatarUrls,
              creator_autograph: autographCreators[0] || null,
              creator_autograph_2: autographCreators[1] || null,
              bonus_hypes: payload.bonus_vaulted_hypes,
              promo_code: cleanPromoCode || null,
              available_from: payload.available_from,
              available_until: payload.available_until,
              is_active: effectiveActiveStatus
            }
          ],
          { onConflict: 'title' }
        );

        // Also sync or create the redeemable promo code if one was entered
        if (cleanPromoCode) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 365);
          const resolvedSkinObjs = cardSkinIds
            .map(id => skins.find(s => String(s.id) === String(id)))
            .filter(Boolean);

          await supabase.from('promo_codes').upsert(
            [
              {
                code: cleanPromoCode,
                tier: 'premium',
                max_uses: isContestBundle ? 5 : 500,
                times_used: 0,
                expires_at: expiresAt.toISOString(),
                creator_name: autographCreators.join(', ') || null,
                bundle_config: {
                  include_1yr_sub: Boolean(form.include_1yr_sub),
                  is_contest_only: isContestBundle,
                  bundle_title: payload.title,
                  card_skin_id: sk1?.id || undefined,
                  card_skin_name: sk1?.name || undefined,
                  card_skin_url: sk1?.image_url || undefined,
                  card_skin_ids: cardSkinIds,
                  card_skin_names: resolvedSkinObjs.map((s: any) => s.name),
                  card_skin_urls: resolvedSkinObjs.map((s: any) => s.image_url),
                  avatar_urls: avatarUrls,
                  creator_autograph: autographCreators[0] || undefined,
                  creator_autographs: autographCreators,
                  bonus_hypes: payload.bonus_vaulted_hypes
                }
              }
            ],
            { onConflict: 'code' }
          );
        }
      }

      if (setIsDirty) setIsDirty(false);
      setIsComposerOpen(false);
      await fetchCatalogAndVault();
      showToast(
        isContestBundle
          ? `🏆 Saved "${payload.title}" as a Contest-Only Bundle (Hidden from Storefront)! Click "Move to Live Store" anytime to sell it.`
          : effectiveActiveStatus
          ? `🛒 Published "${payload.title}" to the live In-App Store!`
          : `Saved "${payload.title}" as a Hidden Draft!`
      );
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Seamless 1-Click Toggle: Move Contest-Only Bundle <-> Live In-App Store!
  const handleToggleActive = async (prod: any) => {
    const nextStatus = !prod.is_active;
    const rawBadge = String(prod.promo_badge || '').trim();
    const cleanedLiveBadge = rawBadge
      .replace(/^CONTEST ONLY\s*•\s*/i, '')
      .replace(/^CONTEST PRIZE BUNDLE$/i, 'SPECIAL BUNDLE')
      .trim();

    const updatedBadge = nextStatus
      ? cleanedLiveBadge || 'SPECIAL BUNDLE'
      : rawBadge.includes('CONTEST')
      ? rawBadge
      : `CONTEST ONLY • ${cleanedLiveBadge || 'PRIZE BUNDLE'}`;

    await supabase
      .from('in_app_store_products')
      .update({
        is_active: nextStatus,
        promo_badge: updatedBadge
      })
      .eq('id', prod.id);

    if (prod.product_type === 'bundle') {
      await supabase
        .from('themed_annual_bundles')
        .update({
          is_active: nextStatus,
          theme_badge: updatedBadge
        })
        .eq('title', prod.title);
    }

    await fetchCatalogAndVault();
    showToast(
      nextStatus
        ? `🚀 Moved "${prod.title}" into the Live In-App Store!`
        : `🏆 Switched "${prod.title}" to Contest-Only / Hidden from Store!`
    );
  };

  const handleDeleteProduct = async (prod: any) => {
    if (
      !window.confirm(
        `Remove "${prod.title}" from the In-App Store? (Vault items will NOT be deleted)`
      )
    )
      return;
    await supabase.from('in_app_store_products').delete().eq('id', prod.id);
    fetchCatalogAndVault();
  };

  const copyProductLink = (prod: any) => {
    const url = `${window.location.origin}/?view=shop&item=${encodeURIComponent(
      prod.slug || prod.id
    )}`;
    navigator.clipboard.writeText(url);
    setCopiedId(prod.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ============================================================================
  // INTERACTIVE SIGNATURE STUDIO HANDLERS
  // ============================================================================
  const openSignatureStudioById = (skinId: string) => {
    const found = skins.find(s => String(s.id) === String(skinId));
    if (!found) return alert('Select a Card Skin from the dropdown first.');
    const existing = Array.isArray(found.signature_stamps) ? found.signature_stamps : [];
    setEditingStampSkin(found);
    setActiveStamps([...existing]);
    setSelectedStampId(existing[0]?.id || null);
    // Default to "-- Choose a Creator --" ('') unless a signature is already stamped on this card
    setSelectedSigToAdd(existing[0]?.creator_name || '');
  };

  const handleAddSignatureStamp = () => {
    if (!selectedSigToAdd || !signatureMap[selectedSigToAdd]) {
      return alert('Select a creator signature from the dropdown.');
    }
    const newStamp: CardSignatureStamp = {
      id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      creator_name: selectedSigToAdd,
      signature_url: signatureMap[selectedSigToAdd],
      x: 75,
      y: 80,
      scale: 22,
      color_mode: 'gold'
    };
    setActiveStamps(prev => [...prev, newStamp]);
    setSelectedStampId(newStamp.id);
  };

  const handlePointerMoveOnCard = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingStampId || !cardPreviewRef.current) return;
    const rect = cardPreviewRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, Math.round(relX * 10) / 10));
    const clampedY = Math.max(5, Math.min(95, Math.round(relY * 10) / 10));

    setActiveStamps(prev =>
      prev.map(st => (st.id === draggingStampId ? { ...st, x: clampedX, y: clampedY } : st))
    );
  };

  const handleSaveStampsToSkin = async () => {
    if (!editingStampSkin) return;
    const { error } = await supabase
      .from('card_skins')
      .update({ signature_stamps: activeStamps })
      .eq('id', editingStampSkin.id);
    if (error) {
      alert('Error saving signature stamps: ' + error.message);
      return;
    }
    setEditingStampSkin(null);
    await fetchCatalogAndVault();
  };

  const selectedStampObj = activeStamps.find(s => s.id === selectedStampId) || null;
  const activeFormAvatars = form.avatar_urls.filter(Boolean);

  const activeFrostedBgUrl =
    form.background_avatar_url && activeFormAvatars.includes(form.background_avatar_url)
      ? form.background_avatar_url
      : activeFormAvatars[0] || '';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-6xl animate-fade-in space-y-6">
      {statusToast && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-between">
          <span>{statusToast}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-[10px] font-black uppercase text-emerald-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-[#fe9a00]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-white">
              In-App Store <span className="text-[#fe9a00]">&amp; Contest Bundles</span>
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Synced Live: {skins.length} Card Skins • {allVaultAvatars.length} Avatars • {creatorOptions.length} Creators
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchCatalogAndVault}
            className="px-3 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <Loader2 className={`w-3.5 h-3.5 text-[#fe9a00] ${loading ? 'animate-spin' : ''}`} />
            Sync Vault
          </button>
          <button
            type="button"
            onClick={() => openNewProductModal('contest_bundle')}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#fe9a00] border border-[#fe9a00]/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" /> + Contest-Only Bundle
          </button>
          <button
            type="button"
            onClick={() => openNewProductModal()}
            className="px-5 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.35)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Store Item
          </button>
        </div>
      </div>

      {/* PRODUCT & CONTEST BUNDLE CATALOG */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#fe9a00]" /> Loading Store Products &amp; Vault...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-black border-2 border-dashed border-zinc-800 rounded-3xl py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <PackageOpen className="w-8 h-8 text-[#fe9a00]" />
          </div>
          <h3 className="text-xl font-black italic uppercase tracking-wider text-white mb-1">
            Your In-App Store Is Empty
          </h3>
          <p className="text-xs text-zinc-400 font-bold max-w-md mb-6 leading-relaxed">
            Create a Live Store Bundle, a Contest-Only Bundle (hidden from the store until you move it live), a $10+ Hype Card Skin, or a $5+ Avatar Pack!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openNewProductModal()}
              className="px-6 py-3.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add New Store Item
            </button>
            <button
              type="button"
              onClick={() => openNewProductModal('contest_bundle')}
              className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]/50 font-black uppercase tracking-widest text-xs flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4" /> Create Contest-Only Bundle
            </button>
          </div>
        </div>
      ) : (() => {
        const q = catalogSearch.trim().toLowerCase();

        // Classify any product into one of the 6 exact Sub-Categories
        const getProductSubCategory = (prod: any): Exclude<StoreCatalogSubCategory, 'all'> => {
          const rawType = String(prod.product_type || 'bundle').toLowerCase();
          const badgeUpper = String(prod.promo_badge || '').toUpperCase();
          const titleUpper = String(prod.title || '').toUpperCase();

          if (rawType === 'emoji_pack' || badgeUpper.includes('EMOJI') || titleUpper.includes('EMOJI')) {
            return 'emoji_pack';
          }
          if (
            rawType === 'collectable' ||
            badgeUpper.includes('COLLECTABLE') ||
            badgeUpper.includes('COLLECTIBLE') ||
            titleUpper.includes('COLLECTABLE')
          ) {
            return 'collectable';
          }
          if (rawType === 'single_skin') {
            return 'single_skin';
          }
          if (rawType === 'avatar_pack' || rawType === 'single_avatar') {
            return 'avatar_pack';
          }
          // For bundles: distinguish Subscription Bundles vs Hype Card Bundles (no 1-Yr sub)
          return prod.include_1yr_sub ? 'sub_bundle' : 'hype_card_bundle';
        };

        const SUB_CATEGORY_DEFINITIONS: {
          id: Exclude<StoreCatalogSubCategory, 'all'>;
          title: string;
          badgeLabel: string;
          subtitle: string;
          accentBorder: string;
          accentText: string;
        }[] = [
          {
            id: 'sub_bundle',
            title: '👑 Subscription Bundles',
            badgeLabel: '👑 Subscription Bundle',
            subtitle: 'Multi-Card & Avatar Bundles that include a 1-Year PLUS Subscription Pass',
            accentBorder: 'border-amber-500/40',
            accentText: 'text-amber-400'
          },
          {
            id: 'hype_card_bundle',
            title: '📦 Hype Card Bundles',
            badgeLabel: '📦 Hype Card Bundle',
            subtitle: 'Multiple Hype Cards & Avatars bundled together (Without a 1-Year Subscription)',
            accentBorder: 'border-[#fe9a00]/40',
            accentText: 'text-[#fe9a00]'
          },
          {
            id: 'single_skin',
            title: '🃏 Individual Hype Cards',
            badgeLabel: '🃏 Individual Hype Card',
            subtitle: 'Standalone collector Hype Card skins ($10+ minimum in Live Store)',
            accentBorder: 'border-purple-500/40',
            accentText: 'text-purple-400'
          },
          {
            id: 'avatar_pack',
            title: '👥 Avatar Packs',
            badgeLabel: '👥 Avatar Pack',
            subtitle: 'Character profile avatar packs ($5+ minimum in Live Store)',
            accentBorder: 'border-cyan-500/40',
            accentText: 'text-cyan-400'
          },
          {
            id: 'emoji_pack',
            title: '😎 Emojis',
            badgeLabel: '😎 Emoji Pack',
            subtitle: 'Custom Saturday AM comment & reaction emoji packs',
            accentBorder: 'border-pink-500/40',
            accentText: 'text-pink-400'
          },
          {
            id: 'collectable',
            title: '💎 Collectables',
            badgeLabel: '💎 Digital Collectable',
            subtitle: 'Limited-edition digital artifacts, badges & special Vault collectables',
            accentBorder: 'border-emerald-500/40',
            accentText: 'text-emerald-400'
          }
        ];

        const matchesTypeAndSearch = (prod: any) => {
          const subCat = getProductSubCategory(prod);
          if (catalogTypeFilter !== 'all' && subCat !== catalogTypeFilter) return false;
          if (!q) return true;
          const titleStr = String(prod.title || '').toLowerCase();
          const codeStr = String(prod.promo_code || '').toLowerCase();
          const badgeStr = String(prod.promo_badge || '').toLowerCase();
          const commStr = Array.isArray(prod.commission_creators)
            ? prod.commission_creators.join(' ').toLowerCase()
            : '';
          return (
            titleStr.includes(q) ||
            codeStr.includes(q) ||
            badgeStr.includes(q) ||
            commStr.includes(q)
          );
        };

        const liveStoreItems = products.filter(p => Boolean(p.is_active) && matchesTypeAndSearch(p));
        const contestAndDraftItems = products.filter(
          p => !p.is_active && matchesTypeAndSearch(p)
        );

        const totalLiveCount = products.filter(p => Boolean(p.is_active)).length;
        const totalContestCount = products.filter(p => !p.is_active).length;

        const renderProductRow = (prod: any) => {
          const listed = Number(prod.listed_price_dollars || 0);
          const normal = Number(prod.normal_price_dollars || 0);
          const pctOff =
            normal > listed && normal > 0 ? Math.round(((normal - listed) / normal) * 100) : 0;

          const skinIds: string[] = Array.isArray(prod.card_skin_ids)
            ? prod.card_skin_ids.filter(Boolean)
            : [prod.card_skin_id, prod.card_skin_2_id].filter(Boolean);
          const firstSkin = skins.find(s => String(s.id) === String(skinIds[0]));
          const avUrls: string[] = Array.isArray(prod.avatar_urls)
            ? prod.avatar_urls.filter(Boolean)
            : [];
          const autoCreators: string[] = Array.isArray(prod.autograph_creators)
            ? prod.autograph_creators.filter(Boolean)
            : [];
          const thumbUrl = firstSkin?.image_url || prod.card_skin_url || avUrls[0] || '';
          const commCreators: string[] = Array.isArray(prod.commission_creators)
            ? prod.commission_creators.filter(Boolean)
            : [];
          const bountyAmt = Number(prod.commission_bounty_dollars ?? 5.0);
          const contestOnly = isContestOnlyProduct(prod);
          const subCat = getProductSubCategory(prod);

          const typeSummaryBadge =
            subCat === 'sub_bundle'
              ? `👑 Subscription Bundle (1-Yr Pass • ${skinIds.length} Skins • ${avUrls.length} Avatars • ${autoCreators.length} Sigs)`
              : subCat === 'hype_card_bundle'
              ? `📦 Hype Card Bundle (${skinIds.length} Skins • ${avUrls.length} Avatars • No Sub)`
              : subCat === 'avatar_pack'
              ? `👥 Avatar Pack (${avUrls.length} Avatars)`
              : subCat === 'emoji_pack'
              ? `😎 Emoji Pack (${avUrls.length} Emojis)`
              : subCat === 'collectable'
              ? `💎 Collectable`
              : '🃏 Individual Hype Card';

          return (
            <div
              key={prod.id}
              className={`bg-zinc-950/90 border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                prod.is_active
                  ? 'border-zinc-800 hover:border-emerald-500/60'
                  : contestOnly
                  ? 'border-[#fe9a00]/50 hover:border-[#fe9a00]'
                  : 'border-dashed border-zinc-800 opacity-75'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {(subCat === 'avatar_pack' || subCat === 'emoji_pack') && avUrls.length > 0 ? (
                  <div className="relative w-24 h-14 rounded-xl overflow-hidden border border-[#fe9a00]/60 bg-black flex items-center justify-center shrink-0">
                    <img
                      src={prod.background_avatar_url || avUrls[0]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover scale-125 blur-sm opacity-50 pointer-events-none"
                    />
                    <div className="relative z-10 flex -space-x-2">
                      {avUrls.slice(0, 3).map((u, idx) => (
                        <img
                          key={idx}
                          src={u}
                          alt="Pack Preview"
                          className="w-8 h-8 rounded-full object-cover border border-[#fe9a00] bg-zinc-900"
                        />
                      ))}
                    </div>
                  </div>
                ) : thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={prod.title}
                    className="w-24 h-14 object-cover rounded-xl border border-zinc-700 shrink-0 bg-zinc-900"
                  />
                ) : (
                  <div className="w-24 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-zinc-600" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                        prod.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : contestOnly
                          ? 'bg-[#fe9a00] text-black shadow-[0_0_12px_rgba(254,154,0,0.4)]'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {prod.is_active
                        ? '🛒 Live in In-App Store'
                        : contestOnly
                        ? '🏆 Contest-Only Vault'
                        : 'Draft (Hidden)'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black border border-zinc-700 text-zinc-300">
                      {typeSummaryBadge}
                    </span>
                    {pctOff > 0 && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-400 text-black">
                        SAVE {pctOff}% OFF
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-black italic uppercase text-white truncate mt-1">
                    {prod.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-400 mt-0.5">
                    <span>
                      Store Price:{' '}
                      <strong className="text-[#fe9a00]">
                        {listed === 0 ? 'FREE' : `$${listed.toFixed(2)}`}
                      </strong>
                      {normal > listed && (
                        <span className="line-through text-zinc-600 ml-1">
                          ${normal.toFixed(2)}
                        </span>
                      )}
                    </span>
                    {prod.promo_code && (
                      <span className="text-[#fe9a00] font-mono">
                        • Code: <strong>{prod.promo_code}</strong>
                      </span>
                    )}
                    {prod.product_type === 'bundle' && commCreators.length > 0 ? (
                      <span>
                        • Creator Bounty:{' '}
                        <strong className="text-emerald-400">
                          ${bountyAmt.toFixed(2)} ({commCreators.join(' & ')})
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyProductLink(prod)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                  title="Copy Direct Product Link"
                >
                  {copiedId === prod.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 text-[#fe9a00]" /> Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openEditProductModal(prod)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(prod)}
                  className={`px-3.5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-all ${
                    prod.is_active
                      ? 'bg-zinc-900 hover:bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {prod.is_active ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Switch to Contest-Only (Hide)
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> 🚀 Move to Live In-App Store
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteProduct(prod)}
                  className="p-2 text-zinc-500 hover:text-red-500 cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        };

        // Renders the 6 organized Sub-Category shelves inside Live Store or Contest Vault
        const renderCategorizedShelves = (itemsList: any[], isContestSection: boolean) => {
          const visibleCategories = SUB_CATEGORY_DEFINITIONS.filter(
            cat => catalogTypeFilter === 'all' || catalogTypeFilter === cat.id
          );

          return (
            <div className="space-y-4">
              {visibleCategories.map(cat => {
                const catItems = itemsList.filter(p => getProductSubCategory(p) === cat.id);

                return (
                  <div
                    key={cat.id}
                    className={`bg-zinc-950/60 border ${cat.accentBorder} rounded-2xl p-3.5 sm:p-4 space-y-3`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-black uppercase tracking-widest ${cat.accentText}`}>
                            {cat.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-[9px] font-black text-white">
                            {catItems.length}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-zinc-500 mt-0.5">{cat.subtitle}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          fetchCatalogAndVault();
                          const isSubBundle = cat.id === 'sub_bundle';
                          const isHypeCardBundle = cat.id === 'hype_card_bundle';
                          const mappedType: ProductFormState['product_type'] =
                            isSubBundle || isHypeCardBundle
                              ? 'bundle'
                              : (cat.id as ProductFormState['product_type']);

                          setForm({
                            ...EMPTY_PRODUCT_FORM,
                            product_type: mappedType,
                            is_contest_only: isContestSection,
                            is_active: !isContestSection,
                            include_1yr_sub: isSubBundle,
                            listed_price_dollars: isSubBundle
                              ? '24.99'
                              : isHypeCardBundle
                              ? '14.99'
                              : cat.id === 'single_skin'
                              ? '10.00'
                              : cat.id === 'collectable'
                              ? '15.00'
                              : '5.00',
                            normal_price_dollars: isSubBundle
                              ? '35.00'
                              : isHypeCardBundle
                              ? '20.00'
                              : '',
                            promo_badge: isContestSection
                              ? 'CONTEST PRIZE BUNDLE'
                              : cat.id === 'emoji_pack'
                              ? 'EMOJI PACK'
                              : cat.id === 'collectable'
                              ? 'COLLECTABLE'
                              : cat.id === 'avatar_pack'
                              ? 'AVATAR PACK'
                              : isHypeCardBundle
                              ? 'HYPE CARD BUNDLE'
                              : 'SPECIAL BUNDLE',
                            card_skin_ids:
                              cat.id === 'avatar_pack' || cat.id === 'emoji_pack'
                                ? []
                                : isSubBundle || isHypeCardBundle
                                ? ['', '']
                                : [''],
                            avatar_urls:
                              cat.id === 'single_skin' ? [] : ['', '', '']
                          });
                          setIsComposerOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 text-[8px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        + Add {cat.badgeLabel.replace(/^[^\s]+\s/, '')}
                      </button>
                    </div>

                    {catItems.length === 0 ? (
                      <div className="py-3 px-3 rounded-xl bg-black/40 border border-dashed border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold italic text-zinc-500">
                          No {cat.title.replace(/^[^\s]+\s/, '')} in this section yet.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">{catItems.map(renderProductRow)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* FILTER & SEARCH BAR */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Visibility Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatalogViewFilter('all')}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                      catalogViewFilter === 'all'
                        ? 'bg-white text-black border-white shadow'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    All Catalog ({products.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogViewFilter('live')}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-1.5 ${
                      catalogViewFilter === 'live'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-zinc-900 text-emerald-400 border-emerald-500/30 hover:bg-zinc-800'
                    }`}
                  >
                    🛒 Live In-App Store ({totalLiveCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogViewFilter('contest')}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-1.5 ${
                      catalogViewFilter === 'contest'
                        ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                        : 'bg-zinc-900 text-[#fe9a00] border-[#fe9a00]/40 hover:bg-zinc-800'
                    }`}
                  >
                    🏆 Contest-Only Vault ({totalContestCount})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search title, code, creator..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
              </div>

              {/* 6 Sub-Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/80">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-1">
                  Category Filter:
                </span>
                {(
                  [
                    { id: 'all', label: 'All Categories' },
                    { id: 'sub_bundle', label: '👑 Subscription Bundles' },
                    { id: 'hype_card_bundle', label: '📦 Hype Card Bundles' },
                    { id: 'single_skin', label: '🃏 Individual Hype Cards' },
                    { id: 'avatar_pack', label: '👥 Avatar Packs' },
                    { id: 'emoji_pack', label: '😎 Emojis' },
                    { id: 'collectable', label: '💎 Collectables' }
                  ] as const
                ).map(t => {
                  const count =
                    t.id === 'all'
                      ? products.length
                      : products.filter(p => getProductSubCategory(p) === t.id).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCatalogTypeFilter(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                        catalogTypeFilter === t.id
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      {t.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 1: LIVE IN-APP STORE CATALOG (GROUPED INTO 6 SUB-CATEGORIES) */}
            {(catalogViewFilter === 'all' || catalogViewFilter === 'live') && (
              <div className="bg-black border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h3 className="text-sm font-black italic uppercase tracking-widest text-emerald-400">
                        🛒 Live In-App Store Catalog ({liveStoreItems.length})
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400">
                        Organized by Subscription Bundles, Hype Card Bundles, Individual Hype Cards, Avatar Packs, Emojis &amp; Collectables
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewProductModal()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    + Add Live Store Item
                  </button>
                </div>

                {renderCategorizedShelves(liveStoreItems, false)}
              </div>
            )}

            {/* SECTION 2: CONTEST-ONLY PRIZE VAULT (GROUPED INTO 6 SUB-CATEGORIES) */}
            {(catalogViewFilter === 'all' || catalogViewFilter === 'contest') && (
              <div className="bg-black border-2 border-[#fe9a00]/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_0_25px_rgba(254,154,0,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-[#fe9a00]" />
                    <div>
                      <h3 className="text-sm font-black italic uppercase tracking-widest text-[#fe9a00]">
                        🏆 Contest-Only Prize Vault ({contestAndDraftItems.length})
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400">
                        Hidden from the public store • Organized by category for Monthly Leaderboard Super Fan Winners
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewProductModal('contest_bundle')}
                    className="px-3 py-1.5 rounded-xl bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    + New Contest Bundle
                  </button>
                </div>

                {renderCategorizedShelves(contestAndDraftItems, true)}
              </div>
            )}
          </div>
        );
      })()}

      {/* =====================================================================
          UNIFIED ADD / EDIT PRODUCT & CONTEST BUNDLE MODAL
          (NOW WITH ALL 6 CATEGORIES: SUB BUNDLES, HYPE CARD BUNDLES, CARDS, AVATARS, EMOJIS & COLLECTABLES)
      ===================================================================== */}
      {isComposerOpen && (
        <div
          className="fixed inset-0 z-[7500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsComposerOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-6 shadow-[0_0_60px_rgba(254,154,0,0.25)]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#fe9a00]" />
                  {form.id ? `Edit Bundle / Item: ${form.title}` : 'Build Store or Contest Item'}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                  Subscription Bundles • Hype Card Bundles • Individual Cards • Avatar Packs • Emojis • Collectables
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* CONTEST-ONLY vs. LIVE IN-APP STORE MODE SWITCHER */}
            <div className="bg-black border border-[#fe9a00]/50 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                Bundle Visibility Mode (Contest-Only vs. Live In-App Store)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      is_contest_only: false,
                      is_active: true,
                      promo_badge:
                        prev.promo_badge === 'CONTEST PRIZE BUNDLE'
                          ? 'SPECIAL BUNDLE'
                          : prev.promo_badge
                    }))
                  }
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    !form.is_contest_only
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-black uppercase text-emerald-400">
                    🛒 Live in In-App Store
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                    Visible &amp; purchasable by all users in the In-App Store.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      is_contest_only: true,
                      is_active: false,
                      promo_badge: prev.promo_badge || 'CONTEST PRIZE BUNDLE'
                    }))
                  }
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    form.is_contest_only
                      ? 'bg-[#fe9a00]/15 border-[#fe9a00] text-white shadow-[0_0_15px_rgba(254,154,0,0.25)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-black uppercase text-[#fe9a00]">
                    🏆 Contest-Only Bundle (Hidden from Store)
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                    Reserved for Leaderboard Contest Winners! Can be moved to the Live Store in 1 click later.
                  </p>
                </button>
              </div>
            </div>

            {/* TEMPLATE BAR */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1 mr-1">
                  <FileText className="w-3.5 h-3.5 text-[#fe9a00]" /> Templates:
                </span>

                <button
                  type="button"
                  onClick={() => applySavedTemplate(BUILT_IN_SUBSCRIPTION_BUNDLE_TEMPLATE)}
                  className="px-3 py-1.5 rounded-xl bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Subscription Bundle (Default)
                </button>

                {customTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => applySavedTemplate(tpl.template_payload)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[9px] font-black uppercase tracking-widest cursor-pointer"
                  >
                    <span>{tpl.template_name}</span>
                    <button
                      type="button"
                      onClick={e => handleDeleteCustomTemplate(tpl, e)}
                      className="text-zinc-500 hover:text-red-400 ml-1"
                      title="Delete Template"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={savingTemplate}
                onClick={handleSaveCurrentAsTemplate}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-white text-zinc-200 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-[#fe9a00]" />
                {savingTemplate ? 'Saving...' : 'Save Current as Template'}
              </button>
            </div>

            {/* 1. 6-CATEGORY PRODUCT TYPE SELECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  key: 'sub_bundle',
                  type: 'bundle' as const,
                  includeSub: true,
                  label: '👑 Subscription Bundle',
                  desc: 'Includes 1-Yr PLUS Subscription + Multiple Hype Cards, Avatars, Signatures & +Hypes'
                },
                {
                  key: 'hype_card_bundle',
                  type: 'bundle' as const,
                  includeSub: false,
                  label: '📦 Hype Card Bundle (No Sub)',
                  desc: 'Multiple Hype Card Skins & Avatars bundled together WITHOUT a 1-Yr Subscription'
                },
                {
                  key: 'single_skin',
                  type: 'single_skin' as const,
                  includeSub: false,
                  label: '🃏 Individual Hype Card',
                  desc: '1 Standalone Hype Card Skin ($10.00+ Min • 100% Platform Revenue)'
                },
                {
                  key: 'avatar_pack',
                  type: 'avatar_pack' as const,
                  includeSub: false,
                  label: '👥 Avatar Pack',
                  desc: 'Multiple Character Avatars Sold as a Pack ($5.00+ Min • 100% Platform Revenue)'
                },
                {
                  key: 'emoji_pack',
                  type: 'emoji_pack' as const,
                  includeSub: false,
                  label: '😎 Emoji Pack',
                  desc: 'Custom Saturday AM Comment & Reaction Emoji Pack (100% Platform Revenue)'
                },
                {
                  key: 'collectable',
                  type: 'collectable' as const,
                  includeSub: false,
                  label: '💎 Collectable',
                  desc: 'Limited-Edition Digital Artifact, Badge or Special Vault Collectable'
                }
              ].map(t => {
                const isSelected =
                  t.type === 'bundle'
                    ? form.product_type === 'bundle' && Boolean(form.include_1yr_sub) === t.includeSub
                    : form.product_type === t.type;

                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleSelectProductType(t.type, t.includeSub)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#fe9a00]/15 border-[#fe9a00] text-white shadow-[0_0_20px_rgba(254,154,0,0.2)]'
                        : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black uppercase tracking-wider text-[#fe9a00]">
                      {t.label}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400 mt-1 leading-snug">
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 2. TITLE, DESCRIPTION & PROMO BADGE */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Product / Bundle Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Square Up! Top 5 Contest Bundle or MMWOG Diwali Bundle"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Promo / Event Badge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CONTEST PRIZE BUNDLE"
                    value={form.promo_badge}
                    onChange={e =>
                      setForm(prev => ({ ...prev, promo_badge: e.target.value.toUpperCase() }))
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-black text-[#fe9a00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what the fan gets with this item, pack, or bundle..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
                />
              </div>
            </div>

            {/* 3. UNLIMITED VAULT ITEMS SELECTION (+ BUTTONS FOR SKINS, AVATARS & SIGNATURES) */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Attach Vault Items ({skins.length} Skins • {allVaultAvatars.length} Avatars Synced)
                </h4>
                <button
                  type="button"
                  onClick={fetchCatalogAndVault}
                  className="text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-white cursor-pointer"
                >
                  ↻ Refresh Vault List
                </button>
              </div>

              {/* A. UNLIMITED HYPE CARD SKINS (+ BUTTON) */}
              {form.product_type !== 'avatar_pack' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white">
                      Hype Card Skins ({form.card_skin_ids.filter(Boolean).length} Selected)
                    </label>
                    {form.product_type === 'bundle' && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm(prev => ({
                            ...prev,
                            card_skin_ids: [...prev.card_skin_ids, '']
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] cursor-pointer flex items-center gap-1 shadow"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" /> Add Card Skin Slot
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(form.product_type === 'single_skin'
                      ? [form.card_skin_ids[0] || '']
                      : form.card_skin_ids
                    ).map((skinId, idx) => {
                      const skinObj = skins.find(s => String(s.id) === String(skinId));
                      return (
                        <div
                          key={idx}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                              Hype Card Skin #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {skinId && (
                                <button
                                  type="button"
                                  onClick={() => openSignatureStudioById(skinId)}
                                  className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <PenTool className="w-3 h-3" /> Stamp Signatures
                                </button>
                              )}
                              {form.product_type === 'bundle' && form.card_skin_ids.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm(prev => ({
                                      ...prev,
                                      card_skin_ids: prev.card_skin_ids.filter((_, i) => i !== idx)
                                    }))
                                  }
                                  className="text-zinc-500 hover:text-red-400 cursor-pointer"
                                  title="Remove Card Skin Slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <select
                            value={skinId}
                            onChange={e => {
                              const val = e.target.value;
                              setForm(prev => ({
                                ...prev,
                                card_skin_ids: prev.card_skin_ids.map((item, i) =>
                                  i === idx ? val : item
                                )
                              }));
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                          >
                            <option value="">-- Select Card Skin #{idx + 1} --</option>
                            {skins.map(sk => (
                              <option key={sk.id} value={sk.id}>
                                {sk.name} {sk.creator_name ? `by ${sk.creator_name}` : ''}
                              </option>
                            ))}
                          </select>

                          {skinObj?.image_url && (
                            <div className="flex items-center gap-3 pt-1">
                              <img
                                src={skinObj.image_url}
                                alt={skinObj.name}
                                className="w-24 aspect-[1.58] object-cover rounded-lg border border-[#fe9a00] shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="block text-[10px] font-black uppercase text-white truncate">
                                  {skinObj.name}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-400">
                                  {Array.isArray(skinObj.signature_stamps) &&
                                  skinObj.signature_stamps.length > 0
                                    ? `✓ ${skinObj.signature_stamps.length} Signature(s) Stamped`
                                    : '✓ Card Art Attached'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* B. UNLIMITED CHARACTER AVATAR PICKER (+ BUTTON) */}
              {form.product_type !== 'single_skin' && (
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white">
                      Character Avatars in Pack/Bundle ({activeFormAvatars.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          avatar_urls: [...prev.avatar_urls, '']
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] cursor-pointer flex items-center gap-1 shadow"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Avatar Slot
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {form.avatar_urls.map((currentUrl, idx) => {
                      const matchedAvatar = allVaultAvatars.find(
                        (av: any) => av.image_url === currentUrl
                      );
                      const isFrostedBg = Boolean(
                        currentUrl && activeFrostedBgUrl === currentUrl
                      );

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setAvatarSearchQuery('');
                            setActiveAvatarSlotIndex(idx);
                          }}
                          className={`relative rounded-2xl p-3 flex flex-col items-center justify-between text-center cursor-pointer border transition-all group ${
                            isFrostedBg
                              ? 'bg-zinc-950 border-2 border-[#fe9a00] ring-2 ring-[#fe9a00]/40 shadow-[0_0_20px_rgba(254,154,0,0.3)]'
                              : currentUrl
                              ? 'bg-zinc-950 border-[#fe9a00]/70 shadow-[0_0_15px_rgba(254,154,0,0.15)]'
                              : 'bg-zinc-950/60 border-dashed border-zinc-700 hover:border-[#fe9a00]'
                          }`}
                        >
                          {(currentUrl || form.avatar_urls.length > 1) && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setForm(prev => {
                                  const nextUrls =
                                    prev.avatar_urls.length > 1
                                      ? prev.avatar_urls.filter((_, i) => i !== idx)
                                      : [''];
                                  return {
                                    ...prev,
                                    avatar_urls: nextUrls,
                                    background_avatar_url:
                                      prev.background_avatar_url === currentUrl
                                        ? ''
                                        : prev.background_avatar_url
                                  };
                                });
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-zinc-400 hover:text-red-400 border border-zinc-700 z-10 cursor-pointer"
                              title="Remove or Clear Slot"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {currentUrl ? (
                            <>
                              <div className="flex flex-col items-center">
                                <img
                                  src={currentUrl}
                                  alt={matchedAvatar?.name || `Avatar #${idx + 1}`}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-[#fe9a00] mb-2 shadow-md group-hover:scale-105 transition-transform"
                                />
                                <span className="text-[10px] font-black text-white leading-tight line-clamp-1">
                                  {matchedAvatar?.name || `Avatar #${idx + 1}`}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                                  Click to Change
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setForm(prev => ({
                                    ...prev,
                                    background_avatar_url: currentUrl
                                  }));
                                }}
                                className={`mt-2 w-full py-1 px-2 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  isFrostedBg
                                    ? 'bg-emerald-400 text-black shadow'
                                    : 'bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700'
                                }`}
                              >
                                {isFrostedBg ? '✓ Frosted BG' : 'Set Frosted BG'}
                              </button>
                            </>
                          ) : (
                            <div className="py-2 flex flex-col items-center">
                              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 group-hover:border-[#fe9a00] flex items-center justify-center mb-2 transition-colors">
                                <Plus className="w-5 h-5 text-zinc-500 group-hover:text-[#fe9a00]" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">
                                Avatar #{idx + 1}
                              </span>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
                                Browse Vault
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* C. UNLIMITED BINGO AUTOGRAPHS (+ BUTTON), 1-YR SUB TOGGLE & +VAULTED GOLD HYPES */}
              {form.product_type === 'bundle' && (
                <div className="space-y-4 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white">
                      Creator Bingo Autographs ({form.autograph_creators.filter(Boolean).length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          autograph_creators: [...prev.autograph_creators, '']
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] cursor-pointer flex items-center gap-1 shadow"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Signature Slot
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {form.autograph_creators.map((sigCreator, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={sigCreator}
                          onChange={e => {
                            const val = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              autograph_creators: prev.autograph_creators.map((item, i) =>
                                i === idx ? val : item
                              )
                            }));
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          <option value="">-- Autograph #{idx + 1} --</option>
                          {creatorOptions.map(c => (
                            <option key={c} value={c}>
                              {c}&apos;s Signature
                            </option>
                          ))}
                        </select>
                        {form.autograph_creators.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm(prev => ({
                                ...prev,
                                autograph_creators: prev.autograph_creators.filter(
                                  (_, i) => i !== idx
                                )
                              }))
                            }
                            className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer"
                            title="Remove Signature Slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-yellow-300 mb-1">
                        <Flame className="w-3 h-3 inline mr-1" /> +Vaulted Gold Hypes
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={form.bonus_vaulted_hypes}
                        onChange={e =>
                          setForm(prev => ({
                            ...prev,
                            bonus_vaulted_hypes: Number(e.target.value)
                          }))
                        }
                        className="w-full bg-zinc-900 border border-yellow-400/60 rounded-xl px-3 py-2 text-xs font-black text-yellow-300"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="w-full flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 cursor-pointer text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        <input
                          type="checkbox"
                          checked={form.include_1yr_sub}
                          onChange={e =>
                            setForm(prev => ({ ...prev, include_1yr_sub: e.target.checked }))
                          }
                          className="accent-emerald-400 w-4 h-4"
                        />
                        <Crown className="w-3.5 h-3.5" /> Includes 1-Yr PLUS Pass
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. PRICING FLOORS & FLAT $5 CREATOR BOUNTY / 100% PLATFORM REVENUE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                    Pricing &amp; Promo Code
                  </span>
                  {discountPercentPreview > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest">
                      Auto Badge: SAVE {discountPercentPreview}% OFF
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                      {form.product_type === 'single_skin'
                        ? 'Skin Price ($10+ Min) *'
                        : form.product_type === 'avatar_pack'
                        ? 'Pack Price ($5+ Min) *'
                        : 'Store Price ($) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.listed_price_dollars}
                      onChange={e =>
                        setForm(prev => ({ ...prev, listed_price_dollars: e.target.value }))
                      }
                      className="w-full bg-zinc-900 border border-emerald-500 rounded-xl px-3 py-2 text-sm font-black text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Normal Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="e.g. 35.00"
                      value={form.normal_price_dollars}
                      onChange={e =>
                        setForm(prev => ({ ...prev, normal_price_dollars: e.target.value }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold text-zinc-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Winner / Promo Code
                    </label>
                    <input
                      type="text"
                      placeholder="CONTEST-NOV"
                      value={form.promo_code}
                      onChange={e =>
                        setForm(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-[#fe9a00]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[10px] font-bold text-zinc-400">
                  <span>
                    Stripe: ~${netBreakdownPreview.stripeFee.toFixed(2)}
                    {netBreakdownPreview.creatorBounty > 0
                      ? ` • Creator Bounty: $${netBreakdownPreview.creatorBounty.toFixed(2)}`
                      : ''}
                    {netBreakdownPreview.devAlloc > 0
                      ? ` • Dev: $${netBreakdownPreview.devAlloc.toFixed(2)}`
                      : ''}
                  </span>
                  <span className="text-emerald-400 font-black">
                    Sat AM Net Retained: ${netBreakdownPreview.netRetained.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                {form.product_type === 'bundle' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Annual Bundle Creator Bounty
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Flat $5.00 Bounty Model
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                          Creator #1
                        </label>
                        <select
                          value={form.commission_creator_1}
                          onChange={e =>
                            setForm(prev => ({ ...prev, commission_creator_1: e.target.value }))
                          }
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          <option value="">-- None --</option>
                          {creatorOptions.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                          Creator #2 (Opt)
                        </label>
                        <select
                          value={form.commission_creator_2}
                          onChange={e =>
                            setForm(prev => ({ ...prev, commission_creator_2: e.target.value }))
                          }
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          <option value="">-- None --</option>
                          {creatorOptions.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                          Flat Bounty ($)
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          min={0}
                          max={50}
                          value={form.commission_bounty_dollars}
                          onChange={e =>
                            setForm(prev => ({
                              ...prev,
                              commission_bounty_dollars: Number(e.target.value)
                            }))
                          }
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black text-emerald-400"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col justify-center bg-zinc-950 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
                      <ShieldCheck className="w-4 h-4" /> 100% Platform Revenue
                    </div>
                    <p className="text-[11px] text-zinc-300 font-bold leading-relaxed">
                      Individual Hype Card Skins ($10+ min) and Character Avatar Packs ($5+ min) carry zero creator commissions—100% of net proceeds stay with Saturday AM.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. SCHEDULE TIME LIMIT */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" /> Start Date/Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.available_from}
                  onChange={e => setForm(prev => ({ ...prev, available_from: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" /> End Time Limit (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.available_until}
                  onChange={e => setForm(prev => ({ ...prev, available_until: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                />
              </div>
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                disabled={savingTemplate}
                onClick={handleSaveCurrentAsTemplate}
                className="px-4 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]/40 font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                {savingTemplate ? 'Saving Template...' : 'Save as Template'}
              </button>

              <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveProductWithStatus(false, true)}
                  className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/60 font-black uppercase tracking-widest text-xs flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  Save as Contest-Only (Hidden)
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveProductWithStatus(true, false)}
                  className="px-6 py-3.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {form.id ? 'Publish to Live Store' : 'Publish to Live Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISUAL AVATAR VAULT PICKER MODAL (DYNAMIC INDEX SUPPORT)
      ===================================================================== */}
      {activeAvatarSlotIndex !== null && (
        <div
          className="fixed inset-0 z-[8600] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveAvatarSlotIndex(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col gap-4 shadow-[0_0_50px_rgba(254,154,0,0.3)]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#fe9a00]" /> Select Avatar for{' '}
                  <span className="text-[#fe9a00]">SLOT #{activeAvatarSlotIndex + 1}</span>
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Showing all {allVaultAvatars.length} synced avatars from your Vault
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAvatarSlotIndex(null)}
                className="p-2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search avatar name or series..."
                  value={avatarSearchQuery}
                  onChange={e => setAvatarSearchQuery(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    avatar_urls: prev.avatar_urls.map((u, i) =>
                      i === activeAvatarSlotIndex ? '' : u
                    )
                  }));
                  setActiveAvatarSlotIndex(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950 text-red-400 border border-zinc-800 text-[10px] font-black uppercase tracking-widest cursor-pointer shrink-0"
              >
                Clear Slot
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 overflow-y-auto pr-1 py-1 custom-scrollbar">
              {filteredModalAvatars.map((av: any) => {
                const isSelectedInThisSlot =
                  form.avatar_urls[activeAvatarSlotIndex] === av.image_url;
                const isSelectedInAnySlot = form.avatar_urls.includes(av.image_url);

                return (
                  <div
                    key={av.id || av.image_url}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        avatar_urls: prev.avatar_urls.map((u, i) =>
                          i === activeAvatarSlotIndex ? av.image_url : u
                        ),
                        background_avatar_url: prev.background_avatar_url || av.image_url
                      }));
                      setActiveAvatarSlotIndex(null);
                    }}
                    className={`relative rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer border transition-all group ${
                      isSelectedInThisSlot
                        ? 'bg-[#fe9a00]/20 border-[#fe9a00] scale-105 shadow-[0_0_20px_rgba(254,154,0,0.3)]'
                        : isSelectedInAnySlot
                        ? 'bg-zinc-900/90 border-emerald-500/60'
                        : 'bg-black border-zinc-800 hover:border-[#fe9a00]'
                    }`}
                  >
                    {isSelectedInAnySlot && (
                      <span className="absolute top-1.5 right-1.5 bg-[#fe9a00] text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded">
                        Selected
                      </span>
                    )}
                    <img
                      src={av.image_url}
                      alt={av.name}
                      loading="lazy"
                      className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 group-hover:border-[#fe9a00] mb-2 transition-transform group-hover:scale-105"
                    />
                    <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                      {av.name || 'Avatar'}
                    </span>
                  </div>
                );
              })}

              {filteredModalAvatars.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                  No matching avatars found in Vault.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE HYPE CARD SIGNATURE PLACEMENT & RESIZE STUDIO MODAL
      ===================================================================== */}
      {editingStampSkin && (
        <div
          className="fixed inset-0 z-[8500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onPointerUp={() => setDraggingStampId(null)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 max-w-4xl w-full space-y-5 shadow-[0_0_50px_rgba(254,154,0,0.3)] max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#fe9a00]" /> Stamp &amp; Resize Signatures —{' '}
                  <span className="text-[#fe9a00]">{editingStampSkin.name}</span>
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Drop creator signatures onto the card, drag them into position, and use the slider to resize!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStampSkin(null)}
                className="p-2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-2">
                <div
                  ref={cardPreviewRef}
                  onPointerMove={handlePointerMoveOnCard}
                  onPointerUp={() => setDraggingStampId(null)}
                  className="relative w-full aspect-[1.58] rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 select-none shadow-2xl"
                  style={{ containerType: 'inline-size', touchAction: 'none' }}
                >
                  <img
                    src={editingStampSkin.image_url}
                    alt={editingStampSkin.name}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />

                  {activeStamps.map(stamp => {
                    const isSelected = stamp.id === selectedStampId;
                    const bgClass =
                      stamp.color_mode === 'white'
                        ? 'bg-white'
                        : stamp.color_mode === 'black'
                        ? 'bg-black'
                        : 'bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500';

                    return (
                      <div
                        key={stamp.id}
                        onPointerDown={e => {
                          e.stopPropagation();
                          setSelectedStampId(stamp.id);
                          setDraggingStampId(stamp.id);
                        }}
                        style={{
                          left: `${stamp.x}%`,
                          top: `${stamp.y}%`,
                          width: `${stamp.scale}cqi`,
                          aspectRatio: '2.2 / 1',
                          transform: 'translate(-50%, -50%)'
                        }}
                        className={`absolute z-30 cursor-grab active:cursor-grabbing flex items-center justify-center rounded-lg ${
                          isSelected
                            ? 'ring-2 ring-[#fe9a00] bg-black/35'
                            : 'hover:ring-1 hover:ring-white/60'
                        }`}
                      >
                        <div
                          className={`w-full h-full ${bgClass} drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]`}
                          style={{
                            WebkitMaskImage: `url('${stamp.signature_url}')`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskImage: `url('${stamp.signature_url}')`,
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-[#fe9a00]" /> Drag any signature directly on the card preview above!
                </p>
              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#fe9a00] mb-1.5">
                    Add Creator Signature
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSigToAdd}
                      onChange={e => setSelectedSigToAdd(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="">-- Choose a Creator --</option>
                      {Object.keys(signatureMap)
                        .sort((a, b) => a.localeCompare(b))
                        .map(cName => (
                          <option key={cName} value={cName}>
                            {cName}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSignatureStamp}
                      className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl cursor-pointer shrink-0"
                    >
                      + Drop
                    </button>
                  </div>
                </div>

                {selectedStampObj && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-white">
                        {selectedStampObj.creator_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStamps(prev => prev.filter(s => s.id !== selectedStampObj.id));
                          setSelectedStampId(null);
                        }}
                        className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black uppercase text-zinc-400 mb-1">
                        <span>Size</span>
                        <span className="text-[#fe9a00]">{selectedStampObj.scale}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={55}
                        value={selectedStampObj.scale}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setActiveStamps(prev =>
                            prev.map(st =>
                              st.id === selectedStampObj.id ? { ...st, scale: val } : st
                            )
                          );
                        }}
                        className="w-full accent-[#fe9a00]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'gold', label: 'Gold Foil' },
                        { id: 'white', label: 'White Ink' },
                        { id: 'black', label: 'Black Ink' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            setActiveStamps(prev =>
                              prev.map(st =>
                                st.id === selectedStampObj.id
                                  ? { ...st, color_mode: mode.id as any }
                                  : st
                              )
                            );
                          }}
                          className={`py-1.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer ${
                            selectedStampObj.color_mode === mode.id
                              ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveStampsToSkin}
                  className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Signatures on Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};