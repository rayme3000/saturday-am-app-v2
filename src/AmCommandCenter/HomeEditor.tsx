import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Edit2,
  Plus,
  LayoutGrid,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle2,
  EyeOff,
  FolderOpen,
  Sparkles,
  Package,
  Crop,
  Monitor,
  Smartphone,
  Loader2,
  Crown,
  Flame,
  CreditCard,
  Layers
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

const CREATOR_ALIAS_GROUPS: string[][] = [
  ['odunze oguguo', 'whyt manga', 'whyt', 'odunze oguguo (whyt manga)'],
  ['jeyodin', 'jey odin'],
  ['raymond brown', 'rayme3000'],
  ['frank simmonds', 'effessart'],
  ['stefano romano', 'dropkickanimation'],
  ['erick pedrucci', 'eric pedrucci', 'erick perducci', 'eric perducci'],
  ['huzayfa umar', 'zayf', 'huzayfa umar (zayf)'],
  ['yvan soudy', 'staark', 'yvan soudy (staark)'],
  ['frederick l. jones', 'frederick jones', 'fred jones'],
  ['oscar fong', 'oscar ed fong'],
  ['jr de bard', 'j.r. de bard', 'jr debard']
];

const matchCreatorNames = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = String(nameA).trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanB = String(nameB).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  for (const group of CREATOR_ALIAS_GROUPS) {
    const aIn = group.some(a => cleanA === a || cleanA.includes(a) || a.includes(cleanA));
    const bIn = group.some(b => cleanB === b || cleanB.includes(b) || b.includes(cleanB));
    if (aIn && bIn) return true;
  }
  return false;
};

interface StudioAssetOption {
  id: string;
  label: string;
  type: 'card_skin' | 'avatar';
  image_url: string;
}

interface StudioSignature {
  creator_name: string;
  signature_url: string;
}

const loadCorsImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export const HomeEditor = ({ Dropzone, setIsDirty, onDirty, onClean }: any) => {
  const {
    seriesList: contextSeriesList = [],
    cardSkins: seriesDataSkins = [],
    vaultAvatars: seriesDataAvatars = []
  } = useSeriesData();

  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [slides, setSlides] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionSeries, setSectionSeries] = useState<Record<string, any[]>>({});

  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [dbSkins, setDbSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [creatorSignatures, setCreatorSignatures] = useState<any[]>([]);

  // Active Hero Banner Studio State
  const [activeStudioSlideId, setActiveStudioSlideId] = useState<any | null>(null);
  const [studioProductId, setStudioProductId] = useState<string>('');
  const [studioBgUrl, setStudioBgUrl] = useState<string>('');
  const [activeCropDevice, setActiveCropDevice] = useState<'pc' | 'mobile'>('pc');

  // Separate PC (3:1) Crop Sliders
  const [pcZoom, setPcZoom] = useState<number>(112);
  const [pcPanX, setPcPanX] = useState<number>(50);
  const [pcPanY, setPcPanY] = useState<number>(30);
  const [pcVignette, setPcVignette] = useState<number>(40);

  // Separate Mobile (2:3) Crop Sliders
  const [mobileZoom, setMobileZoom] = useState<number>(118);
  const [mobilePanX, setMobilePanX] = useState<number>(50);
  const [mobilePanY, setMobilePanY] = useState<number>(25);
  const [mobileVignette, setMobileVignette] = useState<number>(45);

  const [studioBadge, setStudioBadge] = useState<string>('SPECIAL EDITION DROP');
  const [studioHeadline, setStudioHeadline] = useState<string>('');
  const [studioSubheadline, setStudioSubheadline] = useState<string>('');
  const [studioPriceLabel, setStudioPriceLabel] = useState<string>('');
  const [studioOrigPriceLabel, setStudioOrigPriceLabel] = useState<string>('');
  const [studioCtaLabel, setStudioCtaLabel] = useState<string>('UNLOCK NOW');
  const [studioAvatars, setStudioAvatars] = useState<string[]>([]);
  const [studioSigs, setStudioSigs] = useState<StudioSignature[]>([]);
  const [studioBonusHypes, setStudioBonusHypes] = useState<number>(0);
  const [studioIncludePass, setStudioIncludePass] = useState<boolean>(false);
  const [studioCardCount, setStudioCardCount] = useState<number>(0);
  const [isGeneratingBanners, setIsGeneratingBanners] = useState<boolean>(false);

  const [draggedSeriesInfo, setDraggedSeriesInfo] = useState<{
    sectionTitle: string;
    index: number;
  } | null>(null);

  const markDirty = () => {
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

  const markClean = () => {
    if (setIsDirty) setIsDirty(false);
    if (onClean) onClean();
  };

  const fetchLayoutData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        { data: slideData },
        { data: sectionData },
        { data: freshSeriesData },
        { data: prodData },
        { data: skinsData },
        { data: vaultSkinsData },
        { data: avatarsData },
        { data: sigsData }
      ] = await Promise.all([
        supabase.from('hero_slides').select('*').order('id', { ascending: true }),
        supabase.from('home_sections').select('*').order('display_order', { ascending: true }),
        supabase.from('series').select('*').order('title', { ascending: true }),
        supabase
          .from('in_app_store_products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('card_skins').select('*'),
        supabase.from('vault_card_skins').select('*'),
        supabase.from('vault_avatars').select('*'),
        supabase.from('creator_signatures').select('creator_name, signature_url')
      ]);

      const effectiveSeries =
        freshSeriesData && freshSeriesData.length > 0 ? freshSeriesData : contextSeriesList;
      setAllSeries(effectiveSeries);

      if (prodData && prodData.length > 0) {
        setStoreProducts(prodData);
        setStudioProductId(String(prodData[0].id));
      }
      setDbSkins([...(skinsData || []), ...(vaultSkinsData || [])]);
      if (avatarsData) setDbAvatars(avatarsData);
      if (sigsData) setCreatorSignatures(sigsData);

      if (slideData && slideData.length > 0) {
        setSlides(
          slideData.map((s: any) => ({
            id: s.id,
            desktop_url: s.desktop_url || '',
            mobile_url: s.mobile_url || '',
            linkType: s.link_type || 'series',
            linkTarget: s.link_target || ''
          }))
        );
      } else {
        setSlides([
          {
            id: Date.now(),
            linkType: 'series',
            linkTarget: '',
            desktop_url: '',
            mobile_url: ''
          }
        ]);
      }

      if (sectionData) {
        setSections(sectionData);
        const mapping: Record<string, any[]> = {};
        sectionData.forEach((sec: any) => {
          mapping[sec.title] = effectiveSeries
            .filter((s: any) => s.home_section === sec.title)
            .sort((a: any, b: any) => (a.display_order ?? 99) - (b.display_order ?? 99));
        });
        setSectionSeries(mapping);
      }
    } catch (err: any) {
      console.error('Error loading HomeEditor:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [contextSeriesList]);

  useEffect(() => {
    fetchLayoutData();
  }, [fetchLayoutData]);

  const allMasterSkins = useMemo(() => {
    const map = new Map<string, any>();
    [...(seriesDataSkins || []), ...(dbSkins || [])].forEach((sk: any) => {
      if (sk && sk.id && sk.image_url) {
        map.set(String(sk.id), sk);
      }
    });
    return Array.from(map.values());
  }, [seriesDataSkins, dbSkins]);

  const allMasterAvatars = useMemo(() => {
    const map = new Map<string, any>();
    [...(seriesDataAvatars || []), ...(dbAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) {
        map.set(String(av.image_url), av);
      }
    });
    return Array.from(map.values());
  }, [seriesDataAvatars, dbAvatars]);

  const buildProductAssets = useCallback(
    (prod: any): StudioAssetOption[] => {
      if (!prod) return [];
      const list: StudioAssetOption[] = [];
      const seen = new Set<string>();

      const rawSkinIds: string[] = [
        ...(Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : []),
        prod.card_skin_id,
        prod.card_skin_2_id
      ]
        .filter(Boolean)
        .map(String);

      rawSkinIds.forEach((id, idx) => {
        const sk = allMasterSkins.find(s => String(s.id) === String(id));
        if (sk?.image_url && !seen.has(sk.image_url)) {
          seen.add(sk.image_url);
          list.push({
            id: `skin_${sk.id}`,
            label: sk.name || `Hype Card #${idx + 1}`,
            type: 'card_skin',
            image_url: sk.image_url
          });
        }
      });

      const avUrls: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      avUrls.forEach((url, idx) => {
        if (seen.has(url)) return;
        seen.add(url);
        const matchedAv = allMasterAvatars.find(a => a.image_url === url);
        const cleanName = matchedAv?.name
          ? matchedAv.name.replace(/mmwog/i, '').trim()
          : `Avatar #${idx + 1}`;
        list.push({
          id: `av_${idx}_${url.slice(-8)}`,
          label: cleanName,
          type: 'avatar',
          image_url: url
        });
      });

      return list;
    },
    [allMasterSkins, allMasterAvatars]
  );

  const selectedStudioProduct = useMemo(() => {
    return (
      storeProducts.find(p => String(p.id) === String(studioProductId)) ||
      storeProducts[0] ||
      null
    );
  }, [storeProducts, studioProductId]);

  const studioProductAssets = useMemo(() => {
    return buildProductAssets(selectedStudioProduct);
  }, [selectedStudioProduct, buildProductAssets]);

  const studioCardAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'card_skin'),
    [studioProductAssets]
  );

  const studioAvatarAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'avatar'),
    [studioProductAssets]
  );

  const loadProductIntoBannerStudio = useCallback(
    (prod: any) => {
      if (!prod) return;
      const assets = buildProductAssets(prod);
      const cards = assets.filter(a => a.type === 'card_skin');
      const avatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      const autographs: string[] = Array.isArray(prod.autograph_creators)
        ? prod.autograph_creators.filter(Boolean)
        : [];

      const matchedSigs: StudioSignature[] = autographs
        .map(cName => {
          const found = creatorSignatures.find(
            s => s.signature_url && matchCreatorNames(cName, s.creator_name)
          );
          return found ? { creator_name: cName, signature_url: found.signature_url } : null;
        })
        .filter(Boolean) as StudioSignature[];

      const price = Number(prod.listed_price_dollars || 0);
      const normalPrice = Number(prod.normal_price_dollars || 0);
      const priceLabel = price === 0 ? 'FREE' : `$${price}`;
      const origLabel = normalPrice > price && normalPrice > 0 ? `$${normalPrice}` : '';

      const bonusHypes = Number(prod.bonus_vaulted_hypes || 0);
      const includePass = Boolean(prod.include_1yr_sub);

      const subParts: string[] = [];
      if (includePass) subParts.push('1-Yr VIP Pass');
      if (bonusHypes > 0) subParts.push(`+${bonusHypes} Gold Hypes`);
      if (cards.length > 0) subParts.push(`${cards.length} Hype Card Skins`);
      if (avatars.length > 0) subParts.push(`${avatars.length} Exclusive Avatars`);

      setStudioBgUrl(cards[0]?.image_url || assets[0]?.image_url || avatars[0] || '');
      setPcZoom(112);
      setPcPanX(50);
      setPcPanY(30);
      setPcVignette(40);

      setMobileZoom(118);
      setMobilePanX(50);
      setMobilePanY(25);
      setMobileVignette(45);

      setStudioBadge(prod.promo_badge || 'SPECIAL STORE DROP');
      setStudioHeadline(String(prod.title || 'SPECIAL EDITION DROP').toUpperCase());
      setStudioSubheadline(
        subParts.join(' • ') || prod.description || 'Limited-Time Digital Loadout Drop'
      );
      setStudioPriceLabel(priceLabel);
      setStudioOrigPriceLabel(origLabel);
      setStudioCtaLabel(price === 0 ? 'CLAIM FREE' : `UNLOCK (${priceLabel})`);
      setStudioAvatars(avatars);
      setStudioSigs(matchedSigs);
      setStudioBonusHypes(bonusHypes);
      setStudioIncludePass(includePass);
      setStudioCardCount(cards.length);
    },
    [buildProductAssets, creatorSignatures]
  );

  const openStudioForSlide = (slideId: any) => {
    if (activeStudioSlideId === slideId) {
      setActiveStudioSlideId(null);
      return;
    }
    setActiveStudioSlideId(slideId);
    const defaultProd =
      storeProducts.find(p => String(p.id) === String(studioProductId)) || storeProducts[0];
    if (defaultProd) {
      setStudioProductId(String(defaultProd.id));
      loadProductIntoBannerStudio(defaultProd);
    }
  };

  // --- CANVAS GENERATOR: Uses PC Crop Sliders for Desktop & Mobile Crop Sliders for Mobile ---
  const renderBannerCanvasToBlob = async (mode: 'desktop' | 'mobile'): Promise<Blob | null> => {
    const W = mode === 'desktop' ? 1800 : 900;
    const H = mode === 'desktop' ? 600 : 1350;

    const activeZoom = mode === 'desktop' ? pcZoom : mobileZoom;
    const activePanX = mode === 'desktop' ? pcPanX : mobilePanX;
    const activePanY = mode === 'desktop' ? pcPanY : mobilePanY;
    const activeVig = mode === 'desktop' ? pcVignette : mobileVignette;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    const bgImg = await loadCorsImage(studioBgUrl);
    if (bgImg) {
      const imgRatio = bgImg.width / Math.max(1, bgImg.height);
      const canvasRatio = W / H;
      let baseW = W;
      let baseH = H;
      if (imgRatio > canvasRatio) {
        baseH = H;
        baseW = H * imgRatio;
      } else {
        baseW = W;
        baseH = W / imgRatio;
      }
      const zoomFactor = Math.max(1, activeZoom / 100);
      const drawW = baseW * zoomFactor;
      const drawH = baseH * zoomFactor;

      const offsetX = (W - drawW) * (activePanX / 100);
      const offsetY = (H - drawH) * (activePanY / 100);
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    }

    const vigAlpha = Math.min(0.95, Math.max(0.15, activeVig / 100));
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
    topGrad.addColorStop(0, `rgba(0,0,0,${Math.min(0.75, vigAlpha * 0.85)})`);
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.28);

    const botGrad = ctx.createLinearGradient(0, H * 0.48, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(0.55, `rgba(0,0,0,${Math.min(0.85, vigAlpha * 1.15)})`);
    botGrad.addColorStop(1, 'rgba(0,0,0,0.96)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H * 0.48, W, H * 0.52);

    const padX = mode === 'desktop' ? 56 : 44;
    const padY = mode === 'desktop' ? 38 : 48;

    let pillX = padX;
    const pillH = mode === 'desktop' ? 38 : 42;
    ctx.font = `900 ${mode === 'desktop' ? 16 : 18}px sans-serif`;

    if (studioBadge) {
      const badgeText = studioBadge.toUpperCase();
      const bW = ctx.measureText(badgeText).width + 32;
      ctx.fillStyle = '#fe9a00';
      drawRoundedRect(ctx, pillX, padY, bW, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, pillX + 16, padY + pillH / 2 + 1);
      pillX += bW + 12;
    }

    if (studioIncludePass) {
      const passText = '👑 1-YR VIP PASS';
      const pW = ctx.measureText(passText).width + 30;
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      drawRoundedRect(ctx, pillX, padY, pW, pillH, pillH / 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fe9a00';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(passText, pillX + 15, padY + pillH / 2 + 1);
      pillX += pW + 12;
    }

    if (studioBonusHypes > 0 && (mode === 'desktop' || !studioIncludePass)) {
      const hypeText = `🔥 +${studioBonusHypes} GOLD HYPES`;
      const hW = ctx.measureText(hypeText).width + 30;
      ctx.fillStyle = 'rgba(69,26,3,0.9)';
      drawRoundedRect(ctx, pillX, padY, hW, pillH, pillH / 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fde047';
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillText(hypeText, pillX + 15, padY + pillH / 2 + 1);
    }

    if (studioPriceLabel) {
      ctx.font = `900 italic ${mode === 'desktop' ? 30 : 34}px sans-serif`;
      const priceW = ctx.measureText(studioPriceLabel).width;
      const boxW = priceW + 44;
      const boxH = mode === 'desktop' ? 50 : 56;
      const boxX = W - padX - boxW;
      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      drawRoundedRect(ctx, boxX, padY - 4, boxW, boxH, 16);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fe9a00';
      ctx.stroke();
      ctx.fillStyle = '#fe9a00';
      ctx.textBaseline = 'middle';
      ctx.fillText(studioPriceLabel, boxX + 22, padY - 4 + boxH / 2 + 2);
    }

    const loadedAvatars = (
      await Promise.all(studioAvatars.slice(0, 5).map(u => loadCorsImage(u)))
    ).filter(Boolean) as HTMLImageElement[];

    if (mode === 'desktop') {
      const bottomBaseY = H - padY;

      ctx.font = '900 18px sans-serif';
      const ctaText = (studioCtaLabel || 'UNLOCK NOW').toUpperCase();
      const ctaW = Math.max(210, ctx.measureText(ctaText).width + 56);
      const ctaH = 56;
      const ctaX = W - padX - ctaW;
      const ctaY = bottomBaseY - ctaH;

      ctx.fillStyle = '#fe9a00';
      drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, 16);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctaText, ctaX + ctaW / 2, ctaY + ctaH / 2 + 1);
      ctx.textAlign = 'left';

      const avSize = 58;
      const avStep = 44;
      const totalAvW =
        loadedAvatars.length > 0 ? avSize + (loadedAvatars.length - 1) * avStep : 0;
      const avStartX = ctaX - totalAvW - 24;
      const avCenterY = ctaY + ctaH / 2;

      loadedAvatars.forEach((avImg, idx) => {
        const cx = avStartX + idx * avStep + avSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avImg, cx - avSize / 2, avCenterY - avSize / 2, avSize, avSize);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#fe9a00';
        ctx.stroke();
      });

      const maxTextW = Math.max(500, (loadedAvatars.length > 0 ? avStartX : ctaX) - padX - 32);
      ctx.font = '900 20px sans-serif';
      ctx.fillStyle = '#fe9a00';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(studioSubheadline.toUpperCase(), padX, bottomBaseY - 4);

      let fontSize = 52;
      ctx.font = `900 italic ${fontSize}px sans-serif`;
      while (ctx.measureText(studioHeadline).width > maxTextW && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `900 italic ${fontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 14;
      ctx.fillText(studioHeadline, padX, bottomBaseY - 34);
      ctx.shadowBlur = 0;
    } else {
      const bottomY = H - padY;

      const ctaH = 68;
      const ctaY = bottomY - ctaH;
      ctx.fillStyle = '#fe9a00';
      drawRoundedRect(ctx, padX, ctaY, W - padX * 2, ctaH, 20);
      ctx.fill();
      ctx.font = '900 24px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((studioCtaLabel || 'UNLOCK NOW').toUpperCase(), W / 2, ctaY + ctaH / 2 + 2);

      const subY = ctaY - 26;
      ctx.font = '900 20px sans-serif';
      ctx.fillStyle = '#fe9a00';
      ctx.fillText(studioSubheadline.toUpperCase(), W / 2, subY);

      ctx.fillStyle = '#ffffff';
      const mFontSize = 52;
      ctx.font = `900 italic ${mFontSize}px sans-serif`;
      const maxMobileTextW = W - padX * 2;
      const words = studioHeadline.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      words.forEach(w => {
        const test = currentLine ? `${currentLine} ${w}` : w;
        if (ctx.measureText(test).width > maxMobileTextW && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = test;
        }
      });
      if (currentLine) lines.push(currentLine);
      lines = lines.slice(0, 2);

      let headlineTopY = subY - 38;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      for (let i = lines.length - 1; i >= 0; i--) {
        ctx.fillText(lines[i], W / 2, headlineTopY);
        headlineTopY -= mFontSize + 6;
      }
      ctx.shadowBlur = 0;

      if (loadedAvatars.length > 0) {
        const avSize = 68;
        const avStep = 52;
        const totalW = avSize + (loadedAvatars.length - 1) * avStep;
        const startX = (W - totalW) / 2;
        const avCenterY = headlineTopY - 22;

        loadedAvatars.forEach((avImg, idx) => {
          const cx = startX + idx * avStep + avSize / 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avImg, cx - avSize / 2, avCenterY - avSize / 2, avSize, avSize);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#fe9a00';
          ctx.stroke();
        });
      }
      ctx.textAlign = 'left';
    }

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png', 0.95);
    });
  };

  const handleGenerateAndApplyBanners = async (slideId: any) => {
    if (!studioBgUrl) {
      alert('Please select a Hype Card or Avatar artwork first!');
      return;
    }

    setIsGeneratingBanners(true);
    try {
      const [desktopBlob, mobileBlob] = await Promise.all([
        renderBannerCanvasToBlob('desktop'),
        renderBannerCanvasToBlob('mobile')
      ]);

      if (!desktopBlob || !mobileBlob) {
        throw new Error('Could not generate banner images.');
      }

      const ts = Date.now();
      const desktopPath = `hero-banners/store_hero_pc_${ts}.png`;
      const mobilePath = `hero-banners/store_hero_mobile_${ts}.png`;

      const [upDesktop, upMobile] = await Promise.all([
        supabase.storage
          .from('assets')
          .upload(desktopPath, desktopBlob, { upsert: true, contentType: 'image/png' }),
        supabase.storage
          .from('assets')
          .upload(mobilePath, mobileBlob, { upsert: true, contentType: 'image/png' })
      ]);

      let desktopFinalUrl = '';
      let mobileFinalUrl = '';

      if (!upDesktop.error) {
        desktopFinalUrl =
          supabase.storage.from('assets').getPublicUrl(desktopPath).data?.publicUrl || '';
      }
      if (!upMobile.error) {
        mobileFinalUrl =
          supabase.storage.from('assets').getPublicUrl(mobilePath).data?.publicUrl || '';
      }

      if (!desktopFinalUrl) desktopFinalUrl = URL.createObjectURL(desktopBlob);
      if (!mobileFinalUrl) mobileFinalUrl = URL.createObjectURL(mobileBlob);

      const storeLink = selectedStudioProduct
        ? `${window.location.origin}/?view=shop&item=${encodeURIComponent(
            selectedStudioProduct.slug || selectedStudioProduct.id
          )}`
        : `${window.location.origin}/?view=shop`;

      setSlides(prev =>
        prev.map((s: any) =>
          s.id === slideId
            ? {
                ...s,
                desktop_url: desktopFinalUrl,
                mobile_url: mobileFinalUrl,
                linkType: 'external',
                linkTarget: storeLink
              }
            : s
        )
      );

      markDirty();
      setActiveStudioSlideId(null);
    } catch (err: any) {
      alert('Failed to generate hero banners: ' + (err.message || 'Please try again.'));
    } finally {
      setIsGeneratingBanners(false);
    }
  };

  const addSlide = () => {
    setSlides(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        linkType: 'series',
        linkTarget: '',
        desktop_url: '',
        mobile_url: ''
      }
    ]);
    markDirty();
  };

  const removeSlide = (idToRemove: any) => {
    if (!window.confirm('Delete this hero slide?')) return;
    setSlides(prev => prev.filter((slide: any) => slide.id !== idToRemove));
    markDirty();
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    markDirty();
  };

  const updateSlide = (id: any, field: string, value: any) => {
    setSlides(prev =>
      prev.map((slide: any) => (slide.id === id ? { ...slide, [field]: value } : slide))
    );
    markDirty();
  };

  const createSection = () => {
    const rawTitle = window.prompt('Enter new Home Page section title:');
    const title = rawTitle?.trim();
    if (!title) return;
    if (sections.some((s: any) => s.title.toLowerCase() === title.toLowerCase())) {
      alert('A section with that name already exists!');
      return;
    }
    setSections(prev => [...prev, { title }]);
    setSectionSeries(prev => ({ ...prev, [title]: [] }));
    markDirty();
  };

  const removeSection = (titleToRemove: string) => {
    if (
      !window.confirm(
        `Delete the "${titleToRemove}" section from the Home Page?\n\n(Series inside it will become Unassigned, not deleted.)`
      )
    )
      return;
    setSections(prev => prev.filter((s: any) => s.title !== titleToRemove));
    setSectionSeries(prev => {
      const next = { ...prev };
      delete next[titleToRemove];
      return next;
    });
    markDirty();
  };

  const renameSection = (oldTitle: string) => {
    const rawNew = window.prompt(`Rename "${oldTitle}" to:`, oldTitle);
    const newTitle = rawNew?.trim();
    if (!newTitle || newTitle === oldTitle) return;
    if (sections.some((s: any) => s.title.toLowerCase() === newTitle.toLowerCase())) {
      alert('A section with that name already exists!');
      return;
    }

    setSections(prev =>
      prev.map((s: any) => (s.title === oldTitle ? { ...s, title: newTitle } : s))
    );
    setSectionSeries(prev => {
      const next = { ...prev };
      next[newTitle] = next[oldTitle] || [];
      delete next[oldTitle];
      return next;
    });
    markDirty();
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    markDirty();
  };

  const findCurrentSectionForSlug = (slug: string): string | null => {
    for (const [secTitle, list] of Object.entries(sectionSeries)) {
      if ((list || []).some((s: any) => s.slug === slug)) {
        return secTitle;
      }
    }
    return null;
  };

  const handleAddSeries = (targetSectionTitle: string, seriesSlug: string) => {
    if (!seriesSlug) return;
    const seriesToAdd = allSeries.find((s: any) => s.slug === seriesSlug);
    if (!seriesToAdd) return;

    setSectionSeries(prev => {
      const next: Record<string, any[]> = {};
      for (const [secTitle, list] of Object.entries(prev)) {
        next[secTitle] = (list || []).filter((s: any) => s.slug !== seriesSlug);
      }
      next[targetSectionTitle] = [
        ...(next[targetSectionTitle] || []),
        { ...seriesToAdd, home_section: targetSectionTitle }
      ];
      return next;
    });

    markDirty();
  };

  const removeSeriesFromSection = (sectionTitle: string, seriesSlug: string) => {
    setSectionSeries(prev => ({
      ...prev,
      [sectionTitle]: (prev[sectionTitle] || []).filter((s: any) => s.slug !== seriesSlug)
    }));
    markDirty();
  };

  const moveSeries = (sectionTitle: string, index: number, direction: 'up' | 'down') => {
    setSectionSeries(prev => {
      const arr = [...(prev[sectionTitle] || [])];
      if (direction === 'up' && index > 0) {
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      } else if (direction === 'down' && index < arr.length - 1) {
        [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      }
      return { ...prev, [sectionTitle]: arr };
    });
    markDirty();
  };

  const handleSeriesDrop = (targetSectionTitle: string, dropIndex: number) => {
    if (!draggedSeriesInfo) return;
    const { sectionTitle: sourceSection, index: sourceIndex } = draggedSeriesInfo;
    setDraggedSeriesInfo(null);

    if (sourceSection === targetSectionTitle && sourceIndex === dropIndex) return;

    setSectionSeries(prev => {
      const next = { ...prev };
      const sourceArr = [...(next[sourceSection] || [])];
      const [movedItem] = sourceArr.splice(sourceIndex, 1);
      if (!movedItem) return prev;

      if (sourceSection === targetSectionTitle) {
        sourceArr.splice(dropIndex, 0, movedItem);
        next[sourceSection] = sourceArr;
      } else {
        const targetArr = [...(next[targetSectionTitle] || [])].filter(
          (s: any) => s.slug !== movedItem.slug
        );
        targetArr.splice(dropIndex, 0, { ...movedItem, home_section: targetSectionTitle });
        next[sourceSection] = sourceArr;
        next[targetSectionTitle] = targetArr;
      }
      return next;
    });
    markDirty();
  };

  const handleSaveHome = async () => {
    setIsSaving(true);
    try {
      const { error: slideDelErr } = await supabase
        .from('hero_slides')
        .delete()
        .not('id', 'is', null);
      if (slideDelErr) throw slideDelErr;

      const validSlides = slides
        .filter((s: any) => s.desktop_url || s.mobile_url)
        .map((slide: any) => ({
          desktop_url: slide.desktop_url,
          mobile_url: slide.mobile_url,
          link_type: slide.linkType || 'series',
          link_target: slide.linkTarget || ''
        }));

      if (validSlides.length > 0) {
        const { error: slideInsErr } = await supabase.from('hero_slides').insert(validSlides);
        if (slideInsErr) throw slideInsErr;
      }

      const { error: secDelErr } = await supabase
        .from('home_sections')
        .delete()
        .not('title', 'is', null);
      if (secDelErr) throw secDelErr;

      const newSections = sections.map((sec: any, i: number) => ({
        title: sec.title,
        display_order: i + 1
      }));

      if (newSections.length > 0) {
        const { error: secInsErr } = await supabase.from('home_sections').insert(newSections);
        if (secInsErr) throw secInsErr;
      }

      const updatesBySlug = new Map<
        string,
        { slug: string; home_section: string; display_order: number }
      >();

      sections.forEach((sec: any) => {
        const seriesInSec = sectionSeries[sec.title] || [];
        seriesInSec.forEach((s: any, idx: number) => {
          if (!s?.slug) return;
          updatesBySlug.set(s.slug, {
            slug: s.slug,
            home_section: sec.title,
            display_order: idx + 1
          });
        });
      });

      allSeries.forEach((s: any) => {
        if (!s?.slug) return;
        if (!updatesBySlug.has(s.slug) && s.home_section && s.home_section !== 'None') {
          updatesBySlug.set(s.slug, {
            slug: s.slug,
            home_section: 'None',
            display_order: 99
          });
        }
      });

      const allUpdates = Array.from(updatesBySlug.values());
      const batchSize = 6;
      for (let i = 0; i < allUpdates.length; i += batchSize) {
        const batch = allUpdates.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(u =>
            supabase
              .from('series')
              .update({ home_section: u.home_section, display_order: u.display_order })
              .eq('slug', u.slug)
          )
        );
        const failed = results.find(r => r.error);
        if (failed?.error) throw failed.error;
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchLayoutData();
      markClean();
      alert('SUCCESS! Home Page layout & series sections have been updated.');
    } catch (error: any) {
      alert('Failed to save layout: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const unassignedSeries = allSeries.filter((s: any) => !findCurrentSectionForSlug(s.slug));

  // Live Preview Renderer using Separate PC vs. Mobile Crop Sliders
  const renderLiveBannerPreview = (mode: 'desktop' | 'mobile') => {
    const zoom = (mode === 'desktop' ? pcZoom : mobileZoom) / 100;
    const panX = mode === 'desktop' ? pcPanX : mobilePanX;
    const panY = mode === 'desktop' ? pcPanY : mobilePanY;
    const vigAlpha = (mode === 'desktop' ? pcVignette : mobileVignette) / 100;

    return (
      <div
        onClick={() => setActiveCropDevice(mode === 'desktop' ? 'pc' : 'mobile')}
        className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all bg-zinc-950 select-none shadow-2xl flex flex-col justify-between cursor-pointer ${
          mode === 'desktop'
            ? 'aspect-[3/1] p-3.5 sm:p-4'
            : 'aspect-[2/3] max-w-[240px] mx-auto p-3.5'
        } ${
          (mode === 'desktop' && activeCropDevice === 'pc') ||
          (mode === 'mobile' && activeCropDevice === 'mobile')
            ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/40'
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
        style={{ containerType: 'inline-size' }}
      >
        {studioBgUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={studioBgUrl}
              alt="Hero Preview"
              className="w-full h-full object-cover transition-transform duration-150"
              style={{
                objectPosition: `${panX}% ${panY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${panX}% ${panY}%`
              }}
            />
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,${Math.min(
              0.7,
              vigAlpha * 0.65
            )}) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 54%, rgba(0,0,0,${Math.min(
              0.96,
              0.55 + vigAlpha * 0.45
            )}) 100%)`
          }}
        />

        <div className="relative z-10 flex items-start justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {studioBadge && (
              <span className="px-2 py-0.5 rounded-full bg-[#fe9a00] text-black text-[7px] sm:text-[8px] font-black uppercase tracking-widest shadow">
                {studioBadge}
              </span>
            )}
            {studioIncludePass && (
              <span className="px-2 py-0.5 rounded-full bg-black/80 border border-[#fe9a00] text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                <Crown className="w-2.5 h-2.5 text-[#fe9a00]" /> 1-Yr Pass
              </span>
            )}
            {studioBonusHypes > 0 && mode === 'desktop' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-yellow-300 text-yellow-200 text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" /> +{studioBonusHypes} Gold
              </span>
            )}
            {studioCardCount > 0 && mode === 'desktop' && (
              <span className="px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-zinc-200 text-[7px] sm:text-[8px] font-black uppercase tracking-widest">
                {studioCardCount} Card{studioCardCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {studioPriceLabel && (
            <div className="px-2 py-0.5 rounded-xl bg-black/90 border border-[#fe9a00] flex items-baseline gap-1 shrink-0">
              {studioOrigPriceLabel && (
                <span className="text-[7px] font-black italic text-zinc-400 line-through">
                  {studioOrigPriceLabel}
                </span>
              )}
              <span className="text-[11px] sm:text-xs font-black italic text-[#fe9a00]">
                {studioPriceLabel}
              </span>
            </div>
          )}
        </div>

        {mode === 'desktop' ? (
          <div className="relative z-10 flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0 flex-1">
              <h4
                className="font-black italic uppercase tracking-tight text-white leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] line-clamp-1"
                style={{ fontSize: 'clamp(0.85rem, 3.2cqi, 1.35rem)' }}
              >
                {studioHeadline}
              </h4>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#fe9a00] mt-0.5 truncate drop-shadow">
                {studioSubheadline}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {studioAvatars.length > 0 && (
                <div className="flex -space-x-2">
                  {studioAvatars.slice(0, 5).map((u, idx) => (
                    <img
                      key={idx}
                      src={u}
                      alt=""
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-md"
                    />
                  ))}
                </div>
              )}

              {studioSigs.map((sig, idx) =>
                sig.signature_url ? (
                  <div
                    key={idx}
                    className="bg-black/85 border border-[#fe9a00]/50 rounded-lg px-1.5 py-0.5 hidden sm:flex flex-col items-center"
                  >
                    <div className="w-9 h-3.5 flex items-center justify-center">
                      <div
                        className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500"
                        style={{
                          WebkitMaskImage: `url('${sig.signature_url}')`,
                          WebkitMaskSize: 'contain',
                          WebkitMaskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskImage: `url('${sig.signature_url}')`,
                          maskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          maskPosition: 'center'
                        }}
                      />
                    </div>
                  </div>
                ) : null
              )}

              <span className="px-3 py-1.5 rounded-xl bg-[#fe9a00] text-black text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg shrink-0">
                {studioCtaLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-center gap-1.5 pt-4">
            {studioAvatars.length > 0 && (
              <div className="flex -space-x-2 mb-0.5">
                {studioAvatars.slice(0, 5).map((u, idx) => (
                  <img
                    key={idx}
                    src={u}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-md"
                  />
                ))}
              </div>
            )}
            <h4 className="text-xs font-black italic uppercase tracking-tight text-white leading-tight line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {studioHeadline}
            </h4>
            <p className="text-[7px] font-black uppercase tracking-wider text-[#fe9a00] line-clamp-1">
              {studioSubheadline}
            </p>
            <span className="w-full py-1.5 rounded-xl bg-[#fe9a00] text-black text-[8px] font-black uppercase tracking-widest shadow-lg mt-0.5">
              {studioCtaLabel}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
        <RefreshCw className="w-6 h-6 text-[#fe9a00] animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Loading Live Home Layout...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="sticky top-2 z-40 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
        <div>
          <h2 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#fe9a00]" /> Home Page Layout &amp; Hero Editor
          </h2>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-0.5">
            Upload custom banners or auto-generate edge-to-edge PC &amp; Mobile banners from any Store Drop in 1 click!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchLayoutData}
            disabled={isSaving}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            type="button"
            onClick={handleSaveHome}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(254,154,0,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Saving Layout...' : 'Save Complete Layout'}
          </button>
        </div>
      </div>

      {/* 1. HERO SLIDESHOW MANAGER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#fe9a00]" />
            <div>
              <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-xs">
                Hero Banner Slideshow ({slides.length} Slides)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Upload custom banners OR click &ldquo;Auto-Build from Store Drop&rdquo; on any slide to frame PC (3:1) &amp; Mobile (2:3) banners!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addSlide}
            className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-4 py-2 rounded-xl hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Slide
          </button>
        </div>

        <div className="space-y-5">
          {slides.map((slide: any, index: number) => {
            const isStudioOpen = activeStudioSlideId === slide.id;

            return (
              <div
                key={slide.id}
                className="bg-black border border-zinc-800 p-4 rounded-xl relative group space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest bg-[#fe9a00]/10 border border-[#fe9a00]/30 px-2.5 py-1 rounded">
                      Slide #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => openStudioForSlide(slide.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isStudioOpen
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.35)]'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-[#fe9a00] border-[#fe9a00]/50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isStudioOpen
                        ? 'Close Store Banner Studio'
                        : '✨ Auto-Build PC & Mobile Banner from Store Drop'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlide(slide.id)}
                        className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                        title="Delete Slide"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* =============================================================
                    STORE PRODUCT HERO BANNER STUDIO (SEPARATE PC & MOBILE SLIDERS)
                ============================================================= */}
                {isStudioOpen && (
                  <div className="bg-gradient-to-b from-zinc-950 via-zinc-900/90 to-black border-2 border-[#fe9a00] rounded-2xl p-5 space-y-5 shadow-[0_0_40px_rgba(254,154,0,0.2)] animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Store Product Hero Studio (Independent PC &amp; Mobile Crop)
                        </span>
                        <h4 className="text-sm sm:text-base font-black italic uppercase text-white mt-0.5">
                          Pick a Store Product &amp; Choose Your Edge-to-Edge Hero Art
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={studioProductId}
                          onChange={e => {
                            const nextId = e.target.value;
                            setStudioProductId(nextId);
                            const found = storeProducts.find(
                              p => String(p.id) === String(nextId)
                            );
                            if (found) loadProductIntoBannerStudio(found);
                          }}
                          className="bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00]"
                        >
                          {storeProducts.map(prod => (
                            <option key={prod.id} value={prod.id}>
                              {prod.title} (${prod.listed_price_dollars ?? 0})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* VISUAL ART PICKER */}
                    <div className="space-y-3">
                      {studioCardAssets.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Included Hype Card Art ({studioCardAssets.length}) — Click to Use as Crisp Edge-to-Edge Hero BG:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {studioCardAssets.map(card => {
                              const active = studioBgUrl === card.image_url;
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => setStudioBgUrl(card.image_url)}
                                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                    active
                                      ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
                                      : 'border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  <div className="w-full aspect-[1.58] bg-zinc-900 overflow-hidden relative">
                                    <img
                                      src={card.image_url}
                                      alt={card.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    {active && (
                                      <span className="absolute top-1.5 right-1.5 bg-emerald-400 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                        ✓ Active Hero Art
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-white truncate w-full px-2 py-1 text-left bg-zinc-950">
                                    {card.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {studioAvatarAssets.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-purple-400" /> Included Character Avatars ({studioAvatarAssets.length}) — Click Any Avatar to Use as Crisp Hero BG:
                          </span>
                          <div className="grid grid-cols-5 gap-2">
                            {studioAvatarAssets.map(av => {
                              const active = studioBgUrl === av.image_url;
                              return (
                                <button
                                  key={av.id}
                                  type="button"
                                  onClick={() => setStudioBgUrl(av.image_url)}
                                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                    active
                                      ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50'
                                      : 'border-zinc-800 hover:border-zinc-600'
                                  }`}
                                >
                                  <div className="w-full aspect-square bg-zinc-900 overflow-hidden relative">
                                    <img
                                      src={av.image_url}
                                      alt={av.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    {active && (
                                      <span className="absolute top-1 right-1 bg-emerald-400 text-black text-[7px] font-black uppercase px-1 rounded">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-black uppercase text-zinc-300 truncate w-full px-1 py-1 text-center bg-zinc-950">
                                    {av.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SEPARATE PC (3:1) & MOBILE (2:3) CROP SLIDERS + SIDE-BY-SIDE PREVIEWS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2 border-t border-zinc-800">
                      <div className="lg:col-span-5 bg-black/70 border border-zinc-800 rounded-xl p-4 space-y-4">
                        {/* Device Switcher Tabs for Crop Sliders */}
                        <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setActiveCropDevice('pc')}
                            className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              activeCropDevice === 'pc'
                                ? 'bg-[#fe9a00] text-black shadow-md'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Monitor className="w-3.5 h-3.5" /> PC Crop (3:1)
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCropDevice('mobile')}
                            className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              activeCropDevice === 'mobile'
                                ? 'bg-[#fe9a00] text-black shadow-md'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Smartphone className="w-3.5 h-3.5" /> Mobile Crop (2:3)
                          </button>
                        </div>

                        {activeCropDevice === 'pc' ? (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> PC / Desktop (3:1) Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPcZoom(112);
                                  setPcPanX(50);
                                  setPcPanY(30);
                                  setPcVignette(40);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset PC Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Zoom</span>
                                  <span className="text-[#fe9a00]">{pcZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={pcZoom}
                                  onChange={e => setPcZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Vignette</span>
                                  <span className="text-[#fe9a00]">{pcVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={pcVignette}
                                  onChange={e => setPcVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan X (Left/Right)</span>
                                  <span className="text-[#fe9a00]">{pcPanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanX}
                                  onChange={e => setPcPanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan Y (Up/Down)</span>
                                  <span className="text-[#fe9a00]">{pcPanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanY}
                                  onChange={e => setPcPanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> Mobile (2:3) Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileZoom(118);
                                  setMobilePanX(50);
                                  setMobilePanY(25);
                                  setMobileVignette(45);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset Mobile Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Zoom</span>
                                  <span className="text-[#fe9a00]">{mobileZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={mobileZoom}
                                  onChange={e => setMobileZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Vignette</span>
                                  <span className="text-[#fe9a00]">{mobileVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={mobileVignette}
                                  onChange={e => setMobileVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan X</span>
                                  <span className="text-[#fe9a00]">{mobilePanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanX}
                                  onChange={e => setMobilePanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan Y</span>
                                  <span className="text-[#fe9a00]">{mobilePanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanY}
                                  onChange={e => setMobilePanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Headline
                            </label>
                            <input
                              type="text"
                              value={studioHeadline}
                              onChange={e => setStudioHeadline(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Subheadline / Perks Line
                            </label>
                            <input
                              type="text"
                              value={studioSubheadline}
                              onChange={e => setStudioSubheadline(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Top Badge
                              </label>
                              <input
                                type="text"
                                value={studioBadge}
                                onChange={e => setStudioBadge(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                CTA Button Text
                              </label>
                              <input
                                type="text"
                                value={studioCtaLabel}
                                onChange={e => setStudioCtaLabel(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#fe9a00]"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingBanners}
                          onClick={() => handleGenerateAndApplyBanners(slide.id)}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingBanners ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Generating PC &amp; Mobile Banners...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-black" /> Generate &amp; Apply PC + Mobile Banners
                            </>
                          )}
                        </button>
                      </div>

                      {/* LIVE PREVIEWS (CLICK EITHER PREVIEW TO SWITCH ACTIVE SLIDERS) */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5" /> Live PC / Desktop Hero Preview (3:1 Widescreen)
                            </span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400">
                              Zoom: {pcZoom}% • X: {pcPanX}% • Y: {pcPanY}%
                            </span>
                          </div>
                          {renderLiveBannerPreview('desktop')}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" /> Live Mobile Hero Preview (2:3 Vertical)
                            </span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400">
                              Zoom: {mobileZoom}% • X: {mobilePanX}% • Y: {mobilePanY}%
                            </span>
                          </div>
                          {renderLiveBannerPreview('mobile')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Desktop Banner (Wide 3:1)
                    </span>
                    {slide.desktop_url && (
                      <img
                        src={slide.desktop_url}
                        loading="lazy"
                        alt="Desktop Preview"
                        className="w-full aspect-[3/1] object-cover rounded-lg mb-2 border border-zinc-700"
                      />
                    )}
                    <Dropzone
                      label={slide.desktop_url ? 'Replace Desktop' : '+ Upload Desktop Banner'}
                      height="p-4"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => updateSlide(slide.id, 'desktop_url', url)}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Mobile Banner (Vertical 2:3)
                    </span>
                    {slide.mobile_url && (
                      <img
                        src={slide.mobile_url}
                        loading="lazy"
                        alt="Mobile Preview"
                        className="w-32 aspect-[2/3] object-cover rounded-lg mb-2 border border-zinc-700 mx-auto"
                      />
                    )}
                    <Dropzone
                      label={slide.mobile_url ? 'Replace Mobile' : '+ Upload Mobile Banner'}
                      height="p-4"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 mt-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Click Destination Link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={slide.linkType}
                      onChange={e => updateSlide(slide.id, 'linkType', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs sm:w-1/3 focus:border-[#fe9a00]"
                    >
                      <option value="series">Specific Series</option>
                      <option value="external">Store Drop / Web URL</option>
                    </select>
                    {slide.linkType === 'external' ? (
                      <input
                        type="text"
                        placeholder="https://..."
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      />
                    ) : (
                      <select
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      >
                        <option value="">-- Select Series --</option>
                        {allSeries.map((s: any) => (
                          <option key={s.slug} value={s.slug}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SERIES SECTIONS LAYOUT BUILDER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-xs">
              Home Page Series Sections ({sections.length} Sections)
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              Drag series to reorder, or select any series from the dropdown to move it into that section.
            </p>
          </div>
          <button
            type="button"
            onClick={createSection}
            className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-4 py-2 rounded-xl hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Section
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((sec: any, secIndex: number) => {
            const listInSec = sectionSeries[sec.title] || [];
            return (
              <div
                key={sec.title}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleSeriesDrop(sec.title, listInSec.length)}
                className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-md"
              >
                <div className="bg-zinc-800/90 px-4 py-3 flex justify-between items-center border-b border-zinc-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black text-[#fe9a00] bg-black/60 px-2 py-0.5 rounded border border-zinc-700">
                      #{secIndex + 1}
                    </span>
                    <h4 className="text-white font-black uppercase text-xs tracking-widest">
                      {sec.title}
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-400">
                      ({listInSec.length} series)
                    </span>
                    <button
                      type="button"
                      onClick={() => renameSection(sec.title)}
                      className="p-1 text-zinc-400 hover:text-[#fe9a00] transition-colors cursor-pointer"
                      title="Rename Section"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSection(secIndex, 'up')}
                      disabled={secIndex === 0}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Section Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(secIndex, 'down')}
                      disabled={secIndex === sections.length - 1}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Section Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.title)}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                      title="Delete Section"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {listInSec.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      No series in {sec.title} yet. Use the dropdown below to assign series.
                    </div>
                  )}

                  {listInSec.map((s: any, sIndex: number) => (
                    <div
                      key={s.slug}
                      draggable
                      onDragStart={() =>
                        setDraggedSeriesInfo({ sectionTitle: sec.title, index: sIndex })
                      }
                      onDragOver={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSeriesDrop(sec.title, sIndex);
                      }}
                      className="flex items-center justify-between bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg cursor-grab transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-black text-zinc-500 w-5 text-center">
                          {sIndex + 1}
                        </span>
                        <img
                          src={s.cover_url || s.character_url}
                          loading="lazy"
                          alt={s.title}
                          className="w-9 h-9 object-cover rounded bg-zinc-800 border border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase truncate">
                              {s.title}
                            </span>
                            {s.is_hidden && (
                              <span className="text-[8px] font-black uppercase bg-red-950 text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <EyeOff className="w-2.5 h-2.5" /> Hidden
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block truncate">
                            {s.creator_name || s.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSeries(sec.title, sIndex, 'up')}
                          disabled={sIndex === 0}
                          className="p-1.5 rounded bg-black/60 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSeries(sec.title, sIndex, 'down')}
                          disabled={sIndex === listInSec.length - 1}
                          className="p-1.5 rounded bg-black/60 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSeriesFromSection(sec.title, s.slug)}
                          className="p-1.5 rounded bg-black/60 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                          title={`Remove ${s.title} from ${sec.title}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <select
                    value=""
                    onChange={e => {
                      handleAddSeries(sec.title, e.target.value);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded-lg p-3 text-zinc-300 font-bold text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors"
                  >
                    <option value="">+ Assign or Move a Series to {sec.title}...</option>
                    {allSeries
                      .filter(
                        (s: any) => !listInSec.some((existing: any) => existing.slug === s.slug)
                      )
                      .map((s: any) => {
                        const currentSec = findCurrentSectionForSlug(s.slug);
                        return (
                          <option key={s.slug} value={s.slug}>
                            {s.title}{' '}
                            {currentSec ? `(Move from: ${currentSec})` : '(Unassigned)'}
                            {s.is_hidden ? ' [HIDDEN]' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {unassignedSeries.length > 0 && (
          <div className="mt-6 bg-black/60 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Unassigned Series ({unassignedSeries.length} not shown on Home Page rows)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedSeries.map((s: any) => (
                <span
                  key={s.slug}
                  className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg"
                >
                  {s.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSaveHome}
        disabled={isSaving}
        className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors shadow-[0_0_25px_rgba(254,154,0,0.3)] cursor-pointer disabled:opacity-50"
      >
        {isSaving ? 'SAVING HOME LAYOUT...' : 'Save Complete Layout'}
      </button>
    </div>
  );
};