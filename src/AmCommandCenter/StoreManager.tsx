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
  Sparkles,
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
  Image as ImageIcon
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

export interface SavedStoreTemplate {
  id: string;
  template_name: string;
  template_payload: typeof EMPTY_PRODUCT_FORM;
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

const EMPTY_PRODUCT_FORM = {
  id: '' as string,
  slug: '' as string,
  product_type: 'bundle' as 'single_skin' | 'avatar_pack' | 'bundle',
  title: '',
  description: '',
  promo_badge: '',
  listed_price_dollars: '24.99',
  normal_price_dollars: '35.00',
  promo_code: '',
  include_1yr_sub: true,
  card_skin_1: '',
  card_skin_2: '',
  avatar_1: '',
  avatar_2: '',
  avatar_3: '',
  avatar_4: '',
  avatar_5: '',
  background_avatar_url: '',
  autograph_1: '',
  autograph_2: '',
  bonus_vaulted_hypes: 10,
  commission_creator_1: '',
  commission_creator_2: '',
  commission_bounty_dollars: 5.0,
  available_from: '',
  available_until: '',
  is_active: true
};

const BUILT_IN_SUBSCRIPTION_BUNDLE_TEMPLATE: typeof EMPTY_PRODUCT_FORM = {
  ...EMPTY_PRODUCT_FORM,
  product_type: 'bundle',
  title: 'MMWOG Diwali Annual Bundle',
  description:
    'Includes 1-Year Full App Pass, 2 Exclusive Hype Cards by Oscar Fong, 5 Character Avatars (Dia, Anil, Nilay, Tricia, Steel Tusk Durga), Oscar Fong & Frederick L. Jones Autographs, and +10 Vaulted Gold Hypes!',
  promo_badge: 'SPECIAL BUNDLE',
  listed_price_dollars: '24.99',
  normal_price_dollars: '35.00',
  promo_code: 'DIWALI-2026',
  include_1yr_sub: true,
  autograph_1: 'Oscar Fong',
  autograph_2: 'Frederick L. Jones',
  bonus_vaulted_hypes: 10,
  commission_creator_1: 'Oscar Fong',
  commission_creator_2: 'Frederick L. Jones',
  commission_bounty_dollars: 5.0,
  is_active: true
};

export const StoreManager: React.FC<{ setIsDirty?: (v: boolean) => void }> = ({ setIsDirty }) => {
  const { seriesList = [], vaultAvatars = [] } = useSeriesData();
  const [products, setProducts] = useState<any[]>([]);
  const [skins, setSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [dbCreators, setDbCreators] = useState<string[]>([]);
  const [signatureMap, setSignatureMap] = useState<Record<string, string>>({});
  const [customTemplates, setCustomTemplates] = useState<SavedStoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Shopify-style Product Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT_FORM });

  // Visual Avatar Picker Modal State
  const [activeAvatarSlotKey, setActiveAvatarSlotKey] = useState<string | null>(null);
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
    setTimeout(() => setStatusToast(null), 3500);
  };

  const fetchCatalogAndVault = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: prodData },
        { data: skinsData },
        { data: avatarsData },
        { data: creatorsData },
        { data: sigsData },
        templatesRes
      ] = await Promise.all([
        supabase
          .from('in_app_store_products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('card_skins').select('*').order('created_at', { ascending: false }),
        supabase.from('avatars').select('*').order('created_at', { ascending: false }),
        supabase.from('series_creators').select('name'),
        supabase.from('creator_signatures').select('creator_name, signature_url'),
        supabase
          .from('in_app_store_templates')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (prodData) setProducts(prodData);
      if (skinsData) setSkins(skinsData);
      if (avatarsData) setDbAvatars(avatarsData);

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
  }, [fetchCatalogAndVault]);

  const allVaultAvatars = useMemo(() => {
    return dbAvatars.length > 0 ? dbAvatars : vaultAvatars || [];
  }, [dbAvatars, vaultAvatars]);

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

  const handleSelectProductType = (nextType: 'bundle' | 'single_skin' | 'avatar_pack') => {
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
      } else if (nextType === 'avatar_pack') {
        if (currentListed > 0 && currentListed < 5) nextListed = '5.00';
        if (!prev.id) {
          nextListed = '5.00';
          nextNormal = '';
        }
      } else if (nextType === 'bundle' && !prev.id) {
        nextListed = '24.99';
        nextNormal = '35.00';
      }

      return {
        ...prev,
        product_type: nextType,
        listed_price_dollars: nextListed,
        normal_price_dollars: nextNormal,
        include_1yr_sub: nextType === 'bundle' ? prev.include_1yr_sub : false
      };
    });
  };

  const openNewProductModal = (preset?: 'subscription_bundle' | 'single_skin' | 'avatar_pack') => {
    if (preset === 'subscription_bundle') {
      setForm({
        ...BUILT_IN_SUBSCRIPTION_BUNDLE_TEMPLATE,
        id: '',
        slug: ''
      });
    } else if (preset === 'single_skin') {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        product_type: 'single_skin',
        title: '',
        description:
          'Unlock this exclusive Hype Card skin for your profile & permanent art collection.',
        promo_badge: '',
        listed_price_dollars: '10.00',
        normal_price_dollars: '',
        promo_code: '',
        include_1yr_sub: false,
        bonus_vaulted_hypes: 0,
        commission_bounty_dollars: 0,
        is_active: true
      });
    } else if (preset === 'avatar_pack') {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        product_type: 'avatar_pack',
        title: '',
        description: 'Unlock this exclusive Character Avatar Pack for your profile loadout.',
        promo_badge: 'AVATAR PACK',
        listed_price_dollars: '5.00',
        normal_price_dollars: '',
        promo_code: '',
        include_1yr_sub: false,
        bonus_vaulted_hypes: 0,
        commission_bounty_dollars: 0,
        is_active: true
      });
    } else {
      setForm({ ...EMPTY_PRODUCT_FORM });
    }
    setIsComposerOpen(true);
  };

  const applySavedTemplate = (tplPayload: typeof EMPTY_PRODUCT_FORM) => {
    setForm({
      ...EMPTY_PRODUCT_FORM,
      ...tplPayload,
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
      const payloadToSave = {
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
    const skinIds: string[] = Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : [];
    const avUrls: string[] = Array.isArray(prod.avatar_urls) ? prod.avatar_urls : [];
    const autoList: string[] = Array.isArray(prod.autograph_creators)
      ? prod.autograph_creators
      : [];
    const commList: string[] = Array.isArray(prod.commission_creators)
      ? prod.commission_creators
      : [];

    const normalizedType =
      prod.product_type === 'single_avatar' ? 'avatar_pack' : prod.product_type || 'bundle';

    setForm({
      id: prod.id,
      slug: prod.slug || '',
      product_type: normalizedType,
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
      card_skin_1: skinIds[0] || '',
      card_skin_2: skinIds[1] || '',
      avatar_1: avUrls[0] || '',
      avatar_2: avUrls[1] || '',
      avatar_3: avUrls[2] || '',
      avatar_4: avUrls[3] || '',
      avatar_5: avUrls[4] || '',
      background_avatar_url: prod.background_avatar_url || avUrls[0] || '',
      autograph_1: autoList[0] || '',
      autograph_2: autoList[1] || '',
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

  const saveProductWithStatus = async (publishActiveStatus: boolean) => {
    if (!form.title.trim()) return alert('Please enter a Product Title.');

    const listedPrice = Math.max(0, Number(form.listed_price_dollars || 0));

    if (form.product_type === 'single_skin' && listedPrice > 0 && listedPrice < 10) {
      return alert(
        'Individual Hype Card Skins must be priced at $10.00 or higher (or $0.00 for a Free Starter Skin).'
      );
    }

    if (form.product_type === 'avatar_pack' && listedPrice > 0 && listedPrice < 5) {
      return alert('Character Avatar Packs must be priced at $5.00 or higher.');
    }

    const avatarUrls =
      form.product_type === 'single_skin'
        ? []
        : [form.avatar_1, form.avatar_2, form.avatar_3, form.avatar_4, form.avatar_5].filter(
            Boolean
          );

    if (form.product_type === 'avatar_pack' && avatarUrls.length === 0) {
      return alert('Please attach at least 1 character avatar from your Vault to this Avatar Pack.');
    }

    setSaving(true);
    try {
      const cardSkinIds =
        form.product_type === 'avatar_pack'
          ? []
          : form.product_type === 'single_skin'
          ? [form.card_skin_1].filter(Boolean)
          : [form.card_skin_1, form.card_skin_2].filter(Boolean);

      const autographCreators =
        form.product_type === 'bundle'
          ? [form.autograph_1, form.autograph_2].filter(Boolean)
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

      // Resolve selected frosted background avatar (defaults to first attached avatar)
      const chosenBgAvatar =
        form.background_avatar_url && avatarUrls.includes(form.background_avatar_url)
          ? form.background_avatar_url
          : avatarUrls[0] || null;

      const payload: Record<string, any> = {
        slug: cleanSlug,
        product_type: form.product_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        promo_badge: form.promo_badge.trim().toUpperCase() || null,
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
        is_active: publishActiveStatus
      };

      const executeUpsert = async (dataPayload: Record<string, any>) => {
        if (form.id) {
          return supabase.from('in_app_store_products').update(dataPayload).eq('id', form.id);
        } else {
          return supabase.from('in_app_store_products').insert([dataPayload]);
        }
      };

      let { error } = await executeUpsert(payload);
      // Graceful fallback if background_avatar_url column hasn't been added via SQL yet
      if (error && String(error.message || '').includes('background_avatar_url')) {
        const { background_avatar_url, ...fallbackPayload } = payload;
        const retryRes = await executeUpsert(fallbackPayload);
        error = retryRes.error;
      }
      if (error) throw error;

      if (form.product_type === 'bundle') {
        const sk1 = skins.find(s => String(s.id) === String(cardSkinIds[0]));
        const sk2 = skins.find(s => String(s.id) === String(cardSkinIds[1]));

        await supabase.from('themed_annual_bundles').upsert(
          [
            {
              title: payload.title,
              subtitle: payload.description,
              theme_badge: payload.promo_badge || 'SPECIAL EDITION BUNDLE',
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
              is_active: publishActiveStatus
            }
          ],
          { onConflict: 'title' }
        );
      }

      if (setIsDirty) setIsDirty(false);
      setIsComposerOpen(false);
      await fetchCatalogAndVault();
      showToast(
        publishActiveStatus
          ? `Published "${payload.title}" to the live In-App Store!`
          : `Saved "${payload.title}" as a Hidden Draft!`
      );
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (prod: any) => {
    const nextStatus = !prod.is_active;
    await supabase
      .from('in_app_store_products')
      .update({ is_active: nextStatus })
      .eq('id', prod.id);
    if (prod.product_type === 'bundle') {
      await supabase
        .from('themed_annual_bundles')
        .update({ is_active: nextStatus })
        .eq('title', prod.title);
    }
    fetchCatalogAndVault();
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
    setSelectedSigToAdd(Object.keys(signatureMap)[0] || '');
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
  const selectedSkin1Obj = skins.find(s => String(s.id) === String(form.card_skin_1));
  const selectedSkin2Obj = skins.find(s => String(s.id) === String(form.card_skin_2));

  const activeFormAvatars = [
    form.avatar_1,
    form.avatar_2,
    form.avatar_3,
    form.avatar_4,
    form.avatar_5
  ].filter(Boolean);

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
              In-App Store <span className="text-[#fe9a00]">Products</span>
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Subscription Bundles ($5 Creator Bounty) • Card Skins ($10+ / 100% Platform) • Avatar Packs ($5+ / 100% Platform)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openNewProductModal('subscription_bundle')}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#fe9a00] border border-[#fe9a00]/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> + Subscription Bundle Template
          </button>
          <button
            type="button"
            onClick={() => openNewProductModal()}
            className="px-5 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.35)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add New Item
          </button>
        </div>
      </div>

      {/* EMPTY STATE OR SHOPIFY-STYLE PRODUCT CATALOG */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#fe9a00]" /> Loading Store Products...
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
            Items created in your Avatar, Card Skin, Frame, and Signature makers stay safely in your private Vault until you list them here. Click below to add a Subscription Bundle, a $10+ Hype Card Skin, or a $5+ Avatar Pack!
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
              onClick={() => openNewProductModal('subscription_bundle')}
              className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-black uppercase tracking-widest text-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#fe9a00]" /> Load Subscription Bundle Template
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(prod => {
            const listed = Number(prod.listed_price_dollars || 0);
            const normal = Number(prod.normal_price_dollars || 0);
            const pctOff =
              normal > listed && normal > 0 ? Math.round(((normal - listed) / normal) * 100) : 0;

            const skinIds: string[] = Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : [];
            const firstSkin = skins.find(s => String(s.id) === String(skinIds[0]));
            const avUrls: string[] = Array.isArray(prod.avatar_urls) ? prod.avatar_urls : [];
            const thumbUrl = firstSkin?.image_url || avUrls[0] || '';
            const commCreators: string[] = Array.isArray(prod.commission_creators)
              ? prod.commission_creators.filter(Boolean)
              : [];
            const bountyAmt = Number(prod.commission_bounty_dollars ?? 5.0);

            return (
              <div
                key={prod.id}
                className={`bg-black border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                  prod.is_active
                    ? 'border-zinc-800 hover:border-[#fe9a00]/50'
                    : 'border-dashed border-zinc-800 opacity-70'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {prod.product_type === 'avatar_pack' && avUrls.length > 0 ? (
                    <div className="relative w-24 h-14 rounded-xl overflow-hidden border border-[#fe9a00]/60 bg-zinc-950 flex items-center justify-center shrink-0">
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
                            alt="Avatar Pack"
                            className="w-8 h-8 rounded-full object-cover border border-[#fe9a00] bg-zinc-900"
                          />
                        ))}
                      </div>
                    </div>
                  ) : thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={prod.title}
                      className="w-20 h-14 object-cover rounded-xl border border-zinc-700 shrink-0 bg-zinc-900"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          prod.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {prod.is_active ? 'Published (Live)' : 'Draft (Hidden)'}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {prod.product_type === 'bundle'
                          ? 'Subscription Bundle'
                          : prod.product_type === 'avatar_pack' ||
                            prod.product_type === 'single_avatar'
                          ? `Avatar Pack (${avUrls.length})`
                          : 'Hype Card Skin'}
                      </span>
                      {prod.promo_badge && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#fe9a00] text-black">
                          {prod.promo_badge}
                        </span>
                      )}
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
                        Price:{' '}
                        <strong className="text-[#fe9a00]">
                          {listed === 0 ? 'FREE' : `$${listed.toFixed(2)}`}
                        </strong>
                        {normal > listed && (
                          <span className="line-through text-zinc-600 ml-1">
                            ${normal.toFixed(2)}
                          </span>
                        )}
                      </span>
                      {prod.product_type === 'bundle' && commCreators.length > 0 ? (
                        <span>
                          • Creator Bounty:{' '}
                          <strong className="text-emerald-400">
                            ${bountyAmt.toFixed(2)} Flat ({commCreators.join(' & ')})
                          </strong>
                        </span>
                      ) : (
                        <span>
                          • <strong className="text-zinc-300">100% Platform Revenue</strong>
                        </span>
                      )}
                      {prod.available_until && (
                        <span className="text-amber-400">
                          • Ends {new Date(prod.available_until).toLocaleDateString()}
                        </span>
                      )}
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
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Link Copied
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5 text-[#fe9a00]" /> Product Link
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
                    className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer ${
                      prod.is_active
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                        : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/40'
                    }`}
                  >
                    {prod.is_active ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Move to Draft
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Publish Now
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
          })}
        </div>
      )}

      {/* =====================================================================
          SHOPIFY-STYLE UNIFIED ADD / EDIT PRODUCT MODAL
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
                  {form.id ? `Edit Store Product: ${form.title}` : 'Add New Store Item / Bundle'}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                  Subscription Bundles ($5 Creator Bounty) • Individual Card Skins ($10+ Min) • Avatar Packs ($5+ Min)
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

            {/* 1. PRODUCT TYPE SELECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'bundle',
                  label: 'Subscription Bundle',
                  desc: '1-Yr Pass + Up to 2 Cards, 5 Avatars, 2 Autographs & +Hypes ($5 Creator Bounty)'
                },
                {
                  id: 'single_skin',
                  label: 'Individual Hype Card Skin',
                  desc: '1 Hype Card Skin ($10.00+ Min • 100% Platform Revenue)'
                },
                {
                  id: 'avatar_pack',
                  label: 'Character Avatar Pack',
                  desc: 'Up to 5 Character Avatars Sold as a Pack ($5.00+ Min • 100% Platform Revenue)'
                }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectProductType(t.id as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    form.product_type === t.id
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
              ))}
            </div>

            {/* 2. TITLE, DESCRIPTION & PROMO BADGE */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      form.product_type === 'avatar_pack'
                        ? 'e.g. MMWOG Diwali Avatar Pack'
                        : form.product_type === 'single_skin'
                        ? 'e.g. Apple Black Gold Hype Card Skin'
                        : 'e.g. MMWOG Diwali Annual Bundle'
                    }
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Promo / Event Badge (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DIWALI SPECIAL"
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

            {/* 3. VAULT ITEMS SELECTION WITH LIVE ART PREVIEWS */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-5">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
                <Layers className="w-4 h-4" /> Attach Vault Items to This Product
              </h4>

              {/* HYPE CARD SKINS WITH VISUAL THUMBNAIL PREVIEW */}
              {form.product_type !== 'avatar_pack' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white">
                        Hype Card Skin #1 (From Vault)
                      </label>
                      {form.card_skin_1 && (
                        <button
                          type="button"
                          onClick={() => openSignatureStudioById(form.card_skin_1)}
                          className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" /> Stamp Signatures on Card
                        </button>
                      )}
                    </div>
                    <select
                      value={form.card_skin_1}
                      onChange={e => setForm(prev => ({ ...prev, card_skin_1: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="">-- Select Card Skin #1 --</option>
                      {skins.map(sk => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name}
                        </option>
                      ))}
                    </select>
                    {selectedSkin1Obj?.image_url && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={selectedSkin1Obj.image_url}
                          alt={selectedSkin1Obj.name}
                          className="w-24 aspect-[1.58] object-cover rounded-lg border border-[#fe9a00] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block text-[10px] font-black uppercase text-white truncate">
                            {selectedSkin1Obj.name}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-400">
                            {Array.isArray(selectedSkin1Obj.signature_stamps) &&
                            selectedSkin1Obj.signature_stamps.length > 0
                              ? `✓ ${selectedSkin1Obj.signature_stamps.length} Signature(s) Stamped`
                              : '✓ Card Art Attached'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {form.product_type === 'bundle' && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white">
                          Hype Card Skin #2 (Optional 2nd Card)
                        </label>
                        {form.card_skin_2 && (
                          <button
                            type="button"
                            onClick={() => openSignatureStudioById(form.card_skin_2)}
                            className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <PenTool className="w-3 h-3" /> Stamp Signatures on Card
                          </button>
                        )}
                      </div>
                      <select
                        value={form.card_skin_2}
                        onChange={e => setForm(prev => ({ ...prev, card_skin_2: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                      >
                        <option value="">-- None --</option>
                        {skins.map(sk => (
                          <option key={sk.id} value={sk.id}>
                            {sk.name}
                          </option>
                        ))}
                      </select>
                      {selectedSkin2Obj?.image_url && (
                        <div className="flex items-center gap-3 pt-1">
                          <img
                            src={selectedSkin2Obj.image_url}
                            alt={selectedSkin2Obj.name}
                            className="w-24 aspect-[1.58] object-cover rounded-lg border border-[#fe9a00] shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="block text-[10px] font-black uppercase text-white truncate">
                              {selectedSkin2Obj.name}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-400">
                              {Array.isArray(selectedSkin2Obj.signature_stamps) &&
                              selectedSkin2Obj.signature_stamps.length > 0
                                ? `✓ ${selectedSkin2Obj.signature_stamps.length} Signature(s) Stamped`
                                : '✓ Card Art Attached'}
                          </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VISUAL 5-SLOT AVATAR PACK / BUNDLE PICKER + 1-CLICK FROSTED BG SELECTOR */}
              {form.product_type !== 'single_skin' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Up to 5 Character Avatars in Pack/Bundle — Click Any Slot to Select Art, or Set as Frosted Store BG
                    </label>
                    {activeFormAvatars.length > 0 && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                        ✨ Click &ldquo;Set Frosted BG&rdquo; on any avatar below to use it as the blurred card backdrop!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Avatar #1', key: 'avatar_1' },
                      { label: 'Avatar #2', key: 'avatar_2' },
                      { label: 'Avatar #3', key: 'avatar_3' },
                      { label: 'Avatar #4', key: 'avatar_4' },
                      { label: 'Avatar #5', key: 'avatar_5' }
                    ].map((slot, idx) => {
                      const currentUrl = (form as any)[slot.key] as string;
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
                            setActiveAvatarSlotKey(slot.key);
                          }}
                          className={`relative rounded-2xl p-3 flex flex-col items-center justify-between text-center cursor-pointer border transition-all group ${
                            isFrostedBg
                              ? 'bg-zinc-950 border-2 border-[#fe9a00] ring-2 ring-[#fe9a00]/40 shadow-[0_0_20px_rgba(254,154,0,0.3)]'
                              : currentUrl
                              ? 'bg-zinc-950 border-[#fe9a00]/70 shadow-[0_0_15px_rgba(254,154,0,0.15)]'
                              : 'bg-zinc-950/60 border-dashed border-zinc-700 hover:border-[#fe9a00]'
                          }`}
                        >
                          {currentUrl && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setForm(prev => ({
                                  ...prev,
                                  [slot.key]: '',
                                  background_avatar_url:
                                    prev.background_avatar_url === currentUrl
                                      ? ''
                                      : prev.background_avatar_url
                                }));
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-zinc-400 hover:text-red-400 border border-zinc-700 z-10 cursor-pointer"
                              title="Clear Slot"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {currentUrl ? (
                            <>
                              <div className="flex flex-col items-center">
                                <img
                                  src={currentUrl}
                                  alt={matchedAvatar?.name || slot.label}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-[#fe9a00] mb-2 shadow-md group-hover:scale-105 transition-transform"
                                />
                                <span className="text-[10px] font-black text-white leading-tight line-clamp-1">
                                  {matchedAvatar?.name || slot.label}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                                  Click to Change
                                </span>
                              </div>

                              {/* 1-Click Toggle to Set This Avatar as the Frosted Store Card Backdrop */}
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
                                {slot.label}
                              </span>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
                                Browse Art
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* LIVE STORE THUMBNAIL PREVIEW FOR AVATAR PACKS */}
                  {form.product_type === 'avatar_pack' && activeFormAvatars.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" /> Live Store Card Frosted Preview
                        </span>
                        <p className="text-[10px] text-zinc-400 font-bold leading-relaxed max-w-md">
                          Your selected avatar is frosted and blurred in the background so the crisp circular avatars on display pop out on the storefront!
                        </p>
                      </div>

                      <div className="w-60 bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shrink-0 mx-auto sm:mx-0">
                        <div className="relative aspect-[1.58] bg-zinc-950 overflow-hidden flex items-center justify-center">
                          {activeFrostedBgUrl && (
                            <>
                              <img
                                src={activeFrostedBgUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover scale-125 blur-md opacity-50 pointer-events-none"
                              />
                              <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />
                            </>
                          )}
                          <div className="relative z-10 flex items-center justify-center -space-x-2.5 p-2">
                            {activeFormAvatars.map((u, i) => (
                              <img
                                key={i}
                                src={u}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-lg"
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10" />
                          <span className="absolute top-2 left-2 z-20 bg-[#fe9a00] text-black text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                            {activeFormAvatars.length}-PACK
                          </span>
                          <span className="absolute top-2 right-2 z-20 bg-black/85 border border-[#fe9a00] text-[#fe9a00] text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                            ${Number(form.listed_price_dollars || 5).toFixed(2)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black italic uppercase text-white leading-tight line-clamp-2 flex-1">
                            {form.title || 'MMWOG DIWALI AVATAR PACK'}
                          </span>
                          <span className="px-2 py-1 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase shrink-0">
                            Get
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bundle Extras: 2 Autographs, 1-Yr Sub Toggle & +10 Vaulted Gold Hypes */}
              {form.product_type === 'bundle' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80 items-end">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Bingo Autograph #1
                    </label>
                    <select
                      value={form.autograph_1}
                      onChange={e => setForm(prev => ({ ...prev, autograph_1: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
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
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Bingo Autograph #2
                    </label>
                    <select
                      value={form.autograph_2}
                      onChange={e => setForm(prev => ({ ...prev, autograph_2: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
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
                    <label className="block text-[9px] font-black uppercase tracking-widest text-yellow-300 mb-1">
                      <Flame className="w-3 h-3 inline mr-1" /> +Vaulted Gold Hypes
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={200}
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

                  <label className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 cursor-pointer text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <input
                      type="checkbox"
                      checked={form.include_1yr_sub}
                      onChange={e =>
                        setForm(prev => ({ ...prev, include_1yr_sub: e.target.checked }))
                      }
                      className="accent-emerald-400 w-4 h-4"
                    />
                    <Crown className="w-3.5 h-3.5" /> Includes 1-Yr Pass
                  </label>
                </div>
              )}
            </div>

            {/* 4. PRICING FLOORS & FLAT $5 CREATOR BOUNTY / 100% PLATFORM REVENUE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                    Pricing & Promo Code
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
                        : 'Listed Price ($) *'}
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
                      Promo Code (Opt)
                    </label>
                    <input
                      type="text"
                      placeholder="DIWALI-2026"
                      value={form.promo_code}
                      onChange={e =>
                        setForm(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-[#fe9a00]"
                    />
                  </div>
                </div>

                {/* Live Net Retained Cash Summary */}
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

              {/* Creator Bounty (Bundles Only) OR 100% Platform Revenue Badge */}
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
                  onClick={() => saveProductWithStatus(false)}
                  className="px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-black uppercase tracking-widest text-xs flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveProductWithStatus(true)}
                  className="px-7 py-3.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {form.id ? 'Update & Publish' : 'Publish to Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISUAL AVATAR VAULT PICKER MODAL
      ===================================================================== */}
      {activeAvatarSlotKey && (
        <div
          className="fixed inset-0 z-[8600] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveAvatarSlotKey(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col gap-4 shadow-[0_0_50px_rgba(254,154,0,0.3)]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#fe9a00]" /> Select Avatar for{' '}
                  <span className="text-[#fe9a00]">
                    {activeAvatarSlotKey.replace('_', ' #').toUpperCase()}
                  </span>
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Click any character avatar below to attach it to this slot
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAvatarSlotKey(null)}
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
                  placeholder="Search avatar name (e.g. Dia, Anil, Nilay, Tricia, Durga)..."
                  value={avatarSearchQuery}
                  onChange={e => setAvatarSearchQuery(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({ ...prev, [activeAvatarSlotKey]: '' }));
                  setActiveAvatarSlotKey(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950 text-red-400 border border-zinc-800 text-[10px] font-black uppercase tracking-widest cursor-pointer shrink-0"
              >
                Clear Slot
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 overflow-y-auto pr-1 py-1 custom-scrollbar">
              {filteredModalAvatars.map((av: any) => {
                const isSelectedInThisSlot =
                  (form as any)[activeAvatarSlotKey] === av.image_url;
                const isSelectedInAnySlot = [
                  form.avatar_1,
                  form.avatar_2,
                  form.avatar_3,
                  form.avatar_4,
                  form.avatar_5
                ].includes(av.image_url);

                return (
                  <div
                    key={av.id || av.image_url}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        [activeAvatarSlotKey]: av.image_url,
                        background_avatar_url: prev.background_avatar_url || av.image_url
                      }));
                      setActiveAvatarSlotKey(null);
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
                  <PenTool className="w-5 h-5 text-[#fe9a00]" /> Stamp & Resize Signatures —{' '}
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
                      <option value="">-- Choose Signature --</option>
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