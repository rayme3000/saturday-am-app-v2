import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  CreditCard,
  Layout,
  RefreshCw,
  Layers,
  Trash2,
  Sparkles,
  BookOpen,
  Palette,
  Image as ImageIcon,
  Move,
  RotateCcw,
  BookmarkPlus,
  FolderOpen,
  ArrowLeft,
  Sliders
} from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

interface AssetPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  desc: string;
}

const PRESETS: AssetPreset[] = [
  {
    id: 'listing_4_3',
    name: 'Shopify Product Shot (4:3)',
    width: 1200,
    height: 900,
    desc: 'Standard AM Shop catalog listing card (1200×900)'
  },
  {
    id: 'listing_square',
    name: 'Shopify Square Listing / Mobile Hero (1:1)',
    width: 1200,
    height: 1200,
    desc: 'Square product shot, IG feed, or mobile banner (1200×1200)'
  },
  {
    id: 'banner_desktop',
    name: 'Shopify Wide Collection Hero Banner',
    width: 1920,
    height: 720,
    desc: 'Split left/right storefront hero & collection banner (1920×720)'
  },
  {
    id: 'promo_16_9',
    name: 'App Upsell / Social Spotlight (16:9)',
    width: 1200,
    height: 675,
    desc: 'Wide split layout for Upsell Popups & social cards (1200×675)'
  },
  {
    id: 'promo_story',
    name: 'IG / TikTok Vertical Promo Story (9:16)',
    width: 1080,
    height: 1920,
    desc: 'Full-screen vertical promo story (1080×1920)'
  }
];

interface ThemePalette {
  id: string;
  name: string;
  inner: string;
  outer: string;
  accent: string;
  subColor: string;
}

const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'am_orange',
    name: 'AM Signature Orange',
    inner: '#fe9a00',
    outer: '#c24e00',
    accent: '#ffdf00',
    subColor: '#000000'
  },
  {
    id: 'midnight_gold',
    name: 'Vault Midnight & Gold',
    inner: '#27272a',
    outer: '#09090b',
    accent: '#fe9a00',
    subColor: '#fe9a00'
  },
  {
    id: 'crimson_hype',
    name: 'Shonen Crimson Burst',
    inner: '#ef4444',
    outer: '#7f1d1d',
    accent: '#ffdf00',
    subColor: '#ffffff'
  },
  {
    id: 'cyber_indigo',
    name: 'Electric Indigo',
    inner: '#4f46e5',
    outer: '#1e1b4b',
    accent: '#38bdf8',
    subColor: '#ffffff'
  }
];

type LayoutMode =
  | 'single_book'
  | 'bundle_3'
  | 'bundle_5'
  | 'complete_merch'
  | 'gift_cards'
  | 'flat_poster';

type LayerKey = 'art' | 'headline' | 'subtext' | 'badge' | 'flame';

interface LayerTransform {
  x: number;
  y: number;
  scale: number;
}

type LayerTransformMap = Record<LayerKey, LayerTransform>;

interface SavedShopifyTemplate {
  id: string;
  name: string;
  createdAt: string;
  presetId: string;
  layoutMode: LayoutMode;
  themeId: string;
  usePhotoOwnBg: boolean;
  merchFitMode: 'contain' | 'cover';
  showFlameWatermark: boolean;
  flameOpacity: number;
  headlineWrapMode: 'auto' | 'two_line' | 'single_line';
  promoText: string;
  subText: string;
  showPriceBadge: boolean;
  badgeValue: string;
  badgeSubLabel: string;
  transforms: LayerTransformMap;
}

interface UploadedArtwork {
  id: string;
  name: string;
  dataUrl: string;
}

interface LayerBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

const TEMPLATES_STORAGE_KEY = 'am_shopify_saved_templates_v1';
const HYPE_FLAME_R2_URL =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png';

const LAYER_LABELS: Record<LayerKey, string> = {
  art: 'Books / Merch',
  headline: 'Headline',
  subtext: 'Subtext',
  badge: 'Price Tag',
  flame: 'Hype Flame'
};

const buildDefaultTransforms = (preset: AssetPreset, mode: LayoutMode): LayerTransformMap => {
  const isWide = preset.width / preset.height >= 1.55;
  if (isWide) {
    const isMulti = mode === 'bundle_3' || mode === 'bundle_5';
    return {
      art: { x: isMulti ? 0.27 : 0.19, y: 0.5, scale: 1.0 },
      headline: { x: isMulti ? 0.66 : 0.56, y: 0.43, scale: 1.0 },
      subtext: { x: isMulti ? 0.66 : 0.56, y: 0.72, scale: 1.0 },
      badge: { x: 0.89, y: 0.34, scale: 1.0 },
      flame: { x: 0.48, y: 0.5, scale: 1.0 }
    };
  }

  return {
    art: { x: 0.5, y: 0.51, scale: 1.0 },
    headline: { x: 0.5, y: 0.085, scale: 1.0 },
    subtext: { x: 0.5, y: 0.93, scale: 1.0 },
    badge: {
      x: mode === 'bundle_3' || mode === 'bundle_5' ? 0.84 : 0.8,
      y: mode === 'bundle_3' || mode === 'bundle_5' ? 0.73 : 0.63,
      scale: 1.0
    },
    flame: { x: 0.22, y: 0.44, scale: 1.0 }
  };
};

const imageCache = new Map<string, HTMLImageElement>();

const loadImageCached = (src: string): Promise<HTMLImageElement | null> =>
  new Promise(resolve => {
    if (!src) return resolve(null);
    if (imageCache.has(src)) return resolve(imageCache.get(src)!);

    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

let cachedFlameSilhouetteCanvas: HTMLCanvasElement | null = null;
let flameLoadPromise: Promise<HTMLCanvasElement | null> | null = null;

const loadOfficialHypeFlameWatermark = (): Promise<HTMLCanvasElement | null> => {
  if (cachedFlameSilhouetteCanvas) return Promise.resolve(cachedFlameSilhouetteCanvas);
  if (flameLoadPromise) return flameLoadPromise;

  flameLoadPromise = (async () => {
    const urlsToTry = ['/api/hype-flame', HYPE_FLAME_R2_URL];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) continue;
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) continue;

        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const img = await loadImageCached(dataUrl);
        if (!img || !img.naturalWidth) continue;

        const off = document.createElement('canvas');
        off.width = img.naturalWidth;
        off.height = img.naturalHeight;
        const octx = off.getContext('2d');
        if (!octx) continue;

        octx.drawImage(img, 0, 0);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#000000';
        octx.fillRect(0, 0, off.width, off.height);

        cachedFlameSilhouetteCanvas = off;
        return off;
      } catch {
        // try next source
      }
    }
    return null;
  })();

  return flameLoadPromise;
};

const drawRoundedRectPath = (
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
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const draw3DPaperbackVolume = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxWidth: number,
  maxHeight: number,
  tiltRadians = 0
): { w: number; h: number } => {
  const natW = Math.max(1, img.naturalWidth || 680);
  const natH = Math.max(1, img.naturalHeight || 1000);
  const scale = Math.min(maxWidth / natW, maxHeight / natH);
  const bw = natW * scale;
  const bh = natH * scale;

  ctx.save();
  ctx.translate(cx, cy);
  if (tiltRadians !== 0) ctx.rotate(tiltRadians);

  const pageEdgeWidth = Math.max(4, Math.round(bw * 0.02));
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(bw / 2 - 1, -bh / 2 + 3, pageEdgeWidth, bh - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(bw / 2 + pageEdgeWidth - 2, -bh / 2 + 3, 2, bh - 6);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.56)';
  ctx.shadowBlur = Math.round(bh * 0.08);
  ctx.shadowOffsetX = Math.round(bh * 0.026);
  ctx.shadowOffsetY = Math.round(bh * 0.042);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.restore();

  ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);

  const spineWidth = Math.max(8, Math.round(bw * 0.046));
  const spineGrad = ctx.createLinearGradient(-bw / 2, 0, -bw / 2 + spineWidth, 0);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  spineGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.28)');
  spineGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.2)');
  spineGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.12)');
  spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(-bw / 2, -bh / 2, spineWidth, bh);

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

  ctx.restore();
  return { w: bw, h: bh };
};

const drawImageCoverClipped = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  verticalFocus = 0.28
) => {
  const iw = Math.max(1, img.naturalWidth || dw);
  const ih = Math.max(1, img.naturalHeight || dh);
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * verticalFocus;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

const drawTiltedGiftCard = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  cardWidth: number,
  tiltRadians: number
) => {
  const cw = cardWidth;
  const ch = cw / 1.586;
  const radius = Math.max(14, Math.round(cw * 0.045));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tiltRadians);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.52)';
  ctx.shadowBlur = Math.round(ch * 0.12);
  ctx.shadowOffsetX = Math.round(ch * 0.04);
  ctx.shadowOffsetY = Math.round(ch * 0.06);
  drawRoundedRectPath(ctx, -cw / 2, -ch / 2, cw, ch, radius);
  ctx.fillStyle = '#18181b';
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, -cw / 2, -ch / 2, cw, ch, radius);
  ctx.clip();
  drawImageCoverClipped(ctx, img, -cw / 2, -ch / 2, cw, ch, 0.25);

  const sheen = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.restore();

  drawRoundedRectPath(ctx, -cw / 2, -ch / 2, cw, ch, radius);
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
};

const sampleCornerColor = (img: HTMLImageElement): string => {
  try {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext('2d');
    if (!ctx) return '#ffffff';
    ctx.drawImage(
      img,
      0,
      0,
      Math.min(12, img.naturalWidth),
      Math.min(12, img.naturalHeight),
      0,
      0,
      4,
      4
    );
    const d = ctx.getImageData(1, 1, 1, 1).data;
    if (d[3] < 200) return '#ffffff';
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
  } catch {
    return '#ffffff';
  }
};

const splitIntoBalancedLines = (text: string): string[] => {
  const clean = text.trim().toUpperCase();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  if (words.length <= 2) return [clean];

  let bestIdx = Math.ceil(words.length / 2);
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    const diff = Math.abs(l1.length - l2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(' '), words.slice(bestIdx).join(' ')];
};

export interface ShopifyAssetGenProps {
  isStandalonePortal?: boolean;
  onExitStandalone?: () => void;
}

export const ShopifyAssetGen: React.FC<ShopifyAssetGenProps> = ({
  isStandalonePortal = false,
  onExitStandalone
}) => {
  const { seriesList = [] } = useSeriesData();

  const [selectedPreset, setSelectedPreset] = useState<AssetPreset>(PRESETS[0]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single_book');
  const [selectedTheme, setSelectedTheme] = useState<ThemePalette>(THEME_PALETTES[0]);

  const [usePhotoOwnBg, setUsePhotoOwnBg] = useState<boolean>(true);
  const [merchFitMode, setMerchFitMode] = useState<'contain' | 'cover'>('contain');

  const [showFlameWatermark, setShowFlameWatermark] = useState<boolean>(true);
  const [flameOpacity, setFlameOpacity] = useState<number>(0.13);
  const [headlineWrapMode, setHeadlineWrapMode] = useState<'auto' | 'two_line' | 'single_line'>(
    'auto'
  );

  const [promoText, setPromoText] = useState('OUT NOW IN THE AM SHOP!');
  const [subText, setSubText] = useState('FREE SHIPPING ON ORDERS OVER $75 • +BONUS HYPES!');
  const [showPriceBadge, setShowPriceBadge] = useState(true);
  const [badgeValue, setBadgeValue] = useState('$14.99');
  const [badgeSubLabel, setBadgeSubLabel] = useState('');

  const [transforms, setTransforms] = useState<LayerTransformMap>(() =>
    buildDefaultTransforms(PRESETS[0], 'single_book')
  );
  const [activeLayer, setActiveLayer] = useState<LayerKey>('art');
  const [draggingLayer, setDraggingLayer] = useState<LayerKey | null>(null);
  const [hoverLayer, setHoverLayer] = useState<LayerKey | null>(null);

  const [savedTemplates, setSavedTemplates] = useState<SavedShopifyTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateSavedNotice, setTemplateSavedNotice] = useState<string | null>(null);

  const [uploadedArt, setUploadedArt] = useState<UploadedArtwork[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [flameReadyTick, setFlameReadyTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const layerBoxesRef = useRef<Partial<Record<LayerKey, LayerBoundingBox>>>({});
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const isWidePreset = selectedPreset.width / selectedPreset.height >= 1.55;

  useEffect(() => {
    loadOfficialHypeFlameWatermark().then(canvas => {
      if (canvas) setFlameReadyTick(t => t + 1);
    });
  }, []);

  const handlePresetSelect = (preset: AssetPreset) => {
    setSelectedPreset(preset);
    setTransforms(buildDefaultTransforms(preset, layoutMode));
  };

  const handleModeSelect = (mode: LayoutMode) => {
    setLayoutMode(mode);
    setTransforms(buildDefaultTransforms(selectedPreset, mode));
  };

  const updateLayerScale = (layer: LayerKey, nextScale: number) => {
    setTransforms(prev => ({
      ...prev,
      [layer]: { ...prev[layer], scale: nextScale }
    }));
  };

  const resetSingleLayer = (layer: LayerKey) => {
    const def = buildDefaultTransforms(selectedPreset, layoutMode)[layer];
    setTransforms(prev => ({ ...prev, [layer]: def }));
  };

  const resetAllLayers = () => {
    setTransforms(buildDefaultTransforms(selectedPreset, layoutMode));
  };

  const handleSaveTemplate = () => {
    const cleanName =
      templateNameInput.trim() ||
      `${selectedPreset.name.split('(')[0].trim()} • ${
        layoutMode === 'single_book' ? 'Book' : layoutMode.replace('_', ' ')
      }`;

    const newTpl: SavedShopifyTemplate = {
      id: `tpl_${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      presetId: selectedPreset.id,
      layoutMode,
      themeId: selectedTheme.id,
      usePhotoOwnBg,
      merchFitMode,
      showFlameWatermark,
      flameOpacity,
      headlineWrapMode,
      promoText,
      subText,
      showPriceBadge,
      badgeValue,
      badgeSubLabel,
      transforms: JSON.parse(JSON.stringify(transforms))
    };

    const nextList = [newTpl, ...savedTemplates];
    setSavedTemplates(nextList);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore storage quota errors
    }
    setTemplateNameInput('');
    setTemplateSavedNotice(`Saved template "${cleanName}"!`);
    setTimeout(() => setTemplateSavedNotice(null), 3000);
  };

  const handleLoadTemplate = (tpl: SavedShopifyTemplate) => {
    const foundPreset = PRESETS.find(p => p.id === tpl.presetId) || PRESETS[0];
    const foundTheme = THEME_PALETTES.find(t => t.id === tpl.themeId) || THEME_PALETTES[0];
    setSelectedPreset(foundPreset);
    setLayoutMode(tpl.layoutMode);
    setSelectedTheme(foundTheme);
    setUsePhotoOwnBg(tpl.usePhotoOwnBg);
    setMerchFitMode(tpl.merchFitMode);
    setShowFlameWatermark(tpl.showFlameWatermark);
    setFlameOpacity(tpl.flameOpacity ?? 0.13);
    setHeadlineWrapMode(tpl.headlineWrapMode || 'auto');
    setPromoText(tpl.promoText);
    setSubText(tpl.subText);
    setShowPriceBadge(tpl.showPriceBadge);
    setBadgeValue(tpl.badgeValue);
    setBadgeSubLabel(tpl.badgeSubLabel);
    setTransforms(JSON.parse(JSON.stringify(tpl.transforms)));
    setTemplateSavedNotice(`Loaded "${tpl.name}"`);
    setTimeout(() => setTemplateSavedNotice(null), 2200);
  };

  const handleDeleteTemplate = (id: string) => {
    const nextList = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(nextList);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  };

  const handleLocalFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        const dataUrl = String(ev.target?.result || '');
        if (!dataUrl) return;
        await loadImageCached(dataUrl);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const newItem: UploadedArtwork = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          dataUrl
        };
        setUploadedArt(prev => [...prev, newItem]);
        setSelectedIds(prev =>
          layoutMode === 'single_book' ||
          layoutMode === 'flat_poster' ||
          layoutMode === 'complete_merch'
            ? [newItem.id]
            : [...prev, newItem.id]
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleSelectArt = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter(item => item !== id) : prev;
      }
      if (
        layoutMode === 'single_book' ||
        layoutMode === 'flat_poster' ||
        layoutMode === 'complete_merch'
      ) {
        return [id];
      }
      return [...prev, id];
    });
  };

  const removeUploadedArt = (id: string) => {
    setUploadedArt(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const renderCanvas = useCallback(
    async (opts?: { overrideArtList?: UploadedArtwork[]; cleanExport?: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = selectedPreset.width;
      const H = selectedPreset.height;

      const activeItems =
        opts?.overrideArtList ||
        selectedIds
          .map(id => uploadedArt.find(a => a.id === id))
          .filter((a): a is UploadedArtwork => Boolean(a));

      const fallbackPool = activeItems.length > 0 ? activeItems : uploadedArt.slice(0, 5);
      const loadedImages = (
        await Promise.all(fallbackPool.map(item => loadImageCached(item.dataUrl)))
      ).filter((im): im is HTMLImageElement => Boolean(im));

      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      const nextBoxes: Partial<Record<LayerKey, LayerBoundingBox>> = {};
      const isCleanPhotoBg =
        layoutMode === 'complete_merch' && usePhotoOwnBg && loadedImages.length > 0;

      // 1. BACKDROP & DRAGGABLE OFFICIAL HYPE FLAME WATERMARK
      if (isCleanPhotoBg) {
        ctx.fillStyle = sampleCornerColor(loadedImages[0]);
        ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createRadialGradient(
          W * 0.5,
          H * 0.48,
          Math.min(W, H) * 0.08,
          W * 0.5,
          H * 0.5,
          Math.max(W, H) * 0.78
        );
        grad.addColorStop(0, selectedTheme.inner);
        grad.addColorStop(1, selectedTheme.outer);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.075)';
        const step = Math.max(16, Math.round(Math.min(W, H) * 0.02));
        for (let x = step / 2; x < W; x += step) {
          for (let y = step / 2; y < H; y += step) {
            const dx = Math.abs(x - W / 2) / (W / 2);
            const dy = Math.abs(y - H / 2) / (H / 2);
            const edgeFactor = Math.max(0, (dx * dx + dy * dy - 0.25) * 0.9);
            if (edgeFactor > 0.05) {
              ctx.beginPath();
              ctx.arc(x, y, Math.min(step * 0.28, edgeFactor * step * 0.35), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      if (showFlameWatermark && cachedFlameSilhouetteCanvas && !isCleanPhotoBg) {
        const fTrans = transforms.flame;
        const fw = cachedFlameSilhouetteCanvas.width;
        const fh = cachedFlameSilhouetteCanvas.height;
        const targetH = Math.min(H * 0.75, W * 0.52) * fTrans.scale;
        const targetW = targetH * (fw / Math.max(1, fh));
        const fcx = fTrans.x * W;
        const fcy = fTrans.y * H;

        ctx.save();
        ctx.globalAlpha = flameOpacity;
        ctx.drawImage(
          cachedFlameSilhouetteCanvas,
          fcx - targetW / 2,
          fcy - targetH / 2,
          targetW,
          targetH
        );
        ctx.restore();

        nextBoxes.flame = {
          x: fcx - targetW / 2,
          y: fcy - targetH / 2,
          w: targetW,
          h: targetH,
          cx: fcx,
          cy: fcy
        };
      }

      // 2. DRAGGABLE & RESIZABLE BOOKS / MERCH GROUP
      const artT = transforms.art;
      const artCx = artT.x * W;
      const artCy = artT.y * H;
      const stageH = (isWidePreset ? H * 0.82 : H * 0.70) * artT.scale;
      const stageW = (isWidePreset ? W * 0.44 : W * 0.82) * artT.scale;

      if (loadedImages.length === 0) {
        const ph = Math.min(H * 0.68, stageH * 0.85);
        const pw = ph * 0.68;
        ctx.save();
        ctx.strokeStyle = isCleanPhotoBg ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.45)';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 3;
        ctx.strokeRect(artCx - pw / 2, artCy - ph / 2, pw, ph);
        ctx.fillStyle = isCleanPhotoBg ? '#18181b' : 'rgba(255,255,255,0.88)';
        ctx.font = `800 ${Math.round(Math.min(W, H) * 0.025)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DROP ARTWORK', artCx, artCy);
        ctx.restore();

        nextBoxes.art = {
          x: artCx - pw / 2,
          y: artCy - ph / 2,
          w: pw,
          h: ph,
          cx: artCx,
          cy: artCy
        };
      } else if (layoutMode === 'complete_merch') {
        const img = loadedImages[0];
        if (isCleanPhotoBg && merchFitMode === 'cover') {
          const cw = W * artT.scale;
          const ch = H * artT.scale;
          drawImageCoverClipped(ctx, img, artCx - cw / 2, artCy - ch / 2, cw, ch, 0.5);
          nextBoxes.art = {
            x: artCx - cw / 2,
            y: artCy - ch / 2,
            w: cw,
            h: ch,
            cx: artCx,
            cy: artCy
          };
        } else {
          const maxW = (isCleanPhotoBg ? W * 0.9 : stageW) * 1.05;
          const maxH = (isCleanPhotoBg ? H * 0.9 : stageH) * 1.05;
          const scale = Math.min(
            maxW / Math.max(1, img.naturalWidth),
            maxH / Math.max(1, img.naturalHeight)
          );
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          ctx.save();
          if (!isCleanPhotoBg) {
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 28;
            ctx.shadowOffsetY = 14;
          }
          ctx.drawImage(img, artCx - dw / 2, artCy - dh / 2, dw, dh);
          ctx.restore();
          nextBoxes.art = {
            x: artCx - dw / 2,
            y: artCy - dh / 2,
            w: dw,
            h: dh,
            cx: artCx,
            cy: artCy
          };
        }
      } else if (layoutMode === 'single_book') {
        const dim = draw3DPaperbackVolume(ctx, loadedImages[0], artCx, artCy, stageW, stageH, 0);
        nextBoxes.art = {
          x: artCx - dim.w / 2,
          y: artCy - dim.h / 2,
          w: dim.w,
          h: dim.h,
          cx: artCx,
          cy: artCy
        };
      } else if (layoutMode === 'flat_poster') {
        const img = loadedImages[0];
        const scale = Math.min(
          stageW / Math.max(1, img.naturalWidth),
          stageH / Math.max(1, img.naturalHeight)
        );
        const pw = img.naturalWidth * scale;
        const ph = img.naturalHeight * scale;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(artCx - pw / 2 - 10, artCy - ph / 2 - 10, pw + 20, ph + 20);
        ctx.restore();
        ctx.drawImage(img, artCx - pw / 2, artCy - ph / 2, pw, ph);
        nextBoxes.art = {
          x: artCx - pw / 2 - 10,
          y: artCy - ph / 2 - 10,
          w: pw + 20,
          h: ph + 20,
          cx: artCx,
          cy: artCy
        };
      } else if (layoutMode === 'gift_cards') {
        const cardW = Math.min(stageW * 0.85, stageH * 1.15);
        const cardH = cardW / 1.586;
        if (loadedImages.length >= 2) {
          drawTiltedGiftCard(
            ctx,
            loadedImages[1],
            artCx - cardW * 0.18,
            artCy + cardH * 0.14,
            cardW * 0.9,
            -0.13
          );
          drawTiltedGiftCard(
            ctx,
            loadedImages[0],
            artCx + cardW * 0.18,
            artCy - cardH * 0.12,
            cardW * 0.96,
            0.14
          );
          nextBoxes.art = {
            x: artCx - cardW * 0.72,
            y: artCy - cardH * 0.72,
            w: cardW * 1.44,
            h: cardH * 1.44,
            cx: artCx,
            cy: artCy
          };
        } else {
          drawTiltedGiftCard(ctx, loadedImages[0], artCx, artCy, cardW * 1.05, -0.07);
          nextBoxes.art = {
            x: artCx - cardW * 0.56,
            y: artCy - cardH * 0.6,
            w: cardW * 1.12,
            h: cardH * 1.2,
            cx: artCx,
            cy: artCy
          };
        }
      } else if (layoutMode === 'bundle_3') {
        const picks = [
          loadedImages[0],
          loadedImages[1] || loadedImages[0],
          loadedImages[2] || loadedImages[0]
        ];
        const groupSpanW = (isWidePreset ? W * 0.46 : W * 0.86) * artT.scale;
        const maxEachW = groupSpanW * 0.36;
        const spreadX = groupSpanW * 0.32;
        draw3DPaperbackVolume(
          ctx,
          picks[1],
          artCx - spreadX,
          artCy + stageH * 0.03,
          maxEachW * 0.92,
          stageH * 0.84,
          -0.07
        );
        draw3DPaperbackVolume(
          ctx,
          picks[2],
          artCx + spreadX,
          artCy + stageH * 0.03,
          maxEachW * 0.92,
          stageH * 0.84,
          0.07
        );
        const centerDim = draw3DPaperbackVolume(
          ctx,
          picks[0],
          artCx,
          artCy - stageH * 0.01,
          maxEachW,
          stageH * 0.95,
          0
        );
        nextBoxes.art = {
          x: artCx - spreadX - maxEachW * 0.48,
          y: artCy - centerDim.h * 0.52,
          w: (spreadX + maxEachW * 0.48) * 2,
          h: centerDim.h * 1.06,
          cx: artCx,
          cy: artCy
        };
      } else if (layoutMode === 'bundle_5') {
        const picks = Array.from({ length: 5 }, (_, idx) => loadedImages[idx % loadedImages.length]);
        const groupSpanW = (isWidePreset ? W * 0.52 : W * 0.9) * artT.scale;
        const maxEachW = groupSpanW * 0.25;
        const stepX = groupSpanW * 0.205;

        draw3DPaperbackVolume(
          ctx,
          picks[3],
          artCx - stepX * 2,
          artCy + stageH * 0.05,
          maxEachW * 0.9,
          stageH * 0.76,
          -0.09
        );
        draw3DPaperbackVolume(
          ctx,
          picks[4],
          artCx + stepX * 2,
          artCy + stageH * 0.05,
          maxEachW * 0.9,
          stageH * 0.76,
          0.09
        );
        draw3DPaperbackVolume(
          ctx,
          picks[1],
          artCx - stepX,
          artCy + stageH * 0.02,
          maxEachW * 0.95,
          stageH * 0.85,
          -0.045
        );
        draw3DPaperbackVolume(
          ctx,
          picks[2],
          artCx + stepX,
          artCy + stageH * 0.02,
          maxEachW * 0.95,
          stageH * 0.85,
          0.045
        );
        const centerDim = draw3DPaperbackVolume(
          ctx,
          picks[0],
          artCx,
          artCy - stageH * 0.01,
          maxEachW,
          stageH * 0.95,
          0
        );
        nextBoxes.art = {
          x: artCx - stepX * 2 - maxEachW * 0.46,
          y: artCy - centerDim.h * 0.52,
          w: (stepX * 2 + maxEachW * 0.46) * 2,
          h: centerDim.h * 1.08,
          cx: artCx,
          cy: artCy
        };
      }

      // 3. DRAGGABLE & RESIZABLE HEADLINE COPY
      if (promoText.trim()) {
        const hT = transforms.headline;
        const hcx = hT.x * W;
        const hcy = hT.y * H;
        const shouldStack =
          headlineWrapMode === 'two_line' ||
          (headlineWrapMode === 'auto' && isWidePreset && promoText.trim().split(/\s+/).length >= 3);

        const lines = shouldStack
          ? splitIntoBalancedLines(promoText)
          : [promoText.trim().toUpperCase()];

        ctx.save();
        if (!isCleanPhotoBg) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
          ctx.shadowBlur = 16;
          ctx.shadowOffsetY = 4;
        }
        ctx.fillStyle = isCleanPhotoBg ? '#09090b' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const baseHSize = isWidePreset
          ? Math.round(H * (lines.length > 1 ? 0.105 : 0.11))
          : Math.round(Math.min(W * 0.052, H * 0.065));
        const fontSize = Math.max(14, Math.round(baseHSize * hT.scale));
        ctx.font = `italic 900 ${fontSize}px "Unbounded", Impact, sans-serif`;

        const lineHeight = fontSize * 1.14;
        const blockH = lines.length * lineHeight;
        let maxLineW = 80;
        lines.forEach((line, idx) => {
          const m = ctx.measureText(line).width;
          if (m > maxLineW) maxLineW = m;
          const ly = hcy - blockH / 2 + lineHeight / 2 + idx * lineHeight;
          ctx.fillText(line, hcx, ly);
        });
        ctx.restore();

        nextBoxes.headline = {
          x: hcx - maxLineW / 2 - 14,
          y: hcy - blockH / 2 - 10,
          w: maxLineW + 28,
          h: blockH + 20,
          cx: hcx,
          cy: hcy
        };
      }

      // 4. DRAGGABLE & RESIZABLE SUBTEXT COPY
      if (subText.trim()) {
        const sT = transforms.subtext;
        const scx = sT.x * W;
        const scy = sT.y * H;
        const cleanSub = subText.trim().toUpperCase();

        ctx.save();
        ctx.fillStyle = isCleanPhotoBg ? '#18181b' : selectedTheme.subColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const baseSubSize = isWidePreset
          ? Math.round(H * 0.034)
          : Math.round(Math.min(W * 0.024, H * 0.03));
        const subSize = Math.max(11, Math.round(baseSubSize * sT.scale));
        ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(cleanSub, scx, scy);
        const subW = Math.max(60, ctx.measureText(cleanSub).width);
        ctx.restore();

        nextBoxes.subtext = {
          x: scx - subW / 2 - 12,
          y: scy - subSize * 0.85,
          w: subW + 24,
          h: subSize * 1.7,
          cx: scx,
          cy: scy
        };
      }

      // 5. PADDED, DRAGGABLE & RESIZABLE PRICE STICKER
      if (showPriceBadge && badgeValue.trim()) {
        const bT = transforms.badge;
        const baseRadius = Math.round(
          Math.min(W, H) * (isWidePreset ? 0.148 : 0.112) * bT.scale
        );
        const bx = bT.x * W;
        const by = bT.y * H;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.42)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = selectedTheme.accent;
        ctx.beginPath();
        ctx.arc(bx, by, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const borderWidth = Math.max(4, Math.round(baseRadius * 0.065));
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.arc(bx, by, baseRadius - borderWidth / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Enforce 28% inner padding inside the black ring so text never hits the edge
        const innerDiameter = (baseRadius - borderWidth) * 2;
        const maxSafeTextWidth = innerDiameter * 0.72;
        const hasSub = Boolean(badgeSubLabel.trim());

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let valFontSize = Math.round(baseRadius * (hasSub ? 0.48 : 0.56));
        ctx.font = `italic 900 ${valFontSize}px "Unbounded", Impact, sans-serif`;
        while (ctx.measureText(badgeValue.trim()).width > maxSafeTextWidth && valFontSize > 10) {
          valFontSize -= 1;
          ctx.font = `italic 900 ${valFontSize}px "Unbounded", Impact, sans-serif`;
        }

        ctx.fillText(badgeValue.trim(), bx, hasSub ? by - baseRadius * 0.13 : by + 2);

        if (hasSub) {
          let subBadgeSize = Math.round(baseRadius * 0.19);
          ctx.font = `800 ${subBadgeSize}px "Plus Jakarta Sans", sans-serif`;
          while (
            ctx.measureText(badgeSubLabel.trim().toUpperCase()).width > maxSafeTextWidth &&
            subBadgeSize > 8
          ) {
            subBadgeSize -= 1;
            ctx.font = `800 ${subBadgeSize}px "Plus Jakarta Sans", sans-serif`;
          }
          ctx.fillText(badgeSubLabel.trim().toUpperCase(), bx, by + baseRadius * 0.32);
        }
        ctx.restore();

        nextBoxes.badge = {
          x: bx - baseRadius,
          y: by - baseRadius,
          w: baseRadius * 2,
          h: baseRadius * 2,
          cx: bx,
          cy: by
        };
      }

      layerBoxesRef.current = nextBoxes;

      // 6. INTERACTIVE SELECTION BOX GUIDE (Automatically omitted on JPG download!)
      if (!opts?.cleanExport) {
        const guideLayer = draggingLayer || hoverLayer;
        const box = guideLayer ? nextBoxes[guideLayer] : nextBoxes[activeLayer];
        const targetKey = guideLayer || activeLayer;

        if (box && (draggingLayer || hoverLayer)) {
          ctx.save();
          ctx.strokeStyle = '#fe9a00';
          ctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) * 0.003));
          ctx.setLineDash([10, 8]);
          ctx.strokeRect(box.x, box.y, box.w, box.h);

          const tagText = `${LAYER_LABELS[targetKey]} (${Math.round(
            transforms[targetKey].scale * 100
          )}%)`;
          ctx.font = `800 ${Math.max(12, Math.round(Math.min(W, H) * 0.016))}px "Plus Jakarta Sans", sans-serif`;
          const tw = ctx.measureText(tagText).width + 16;
          const th = Math.max(22, Math.round(Math.min(W, H) * 0.028));
          const tx = Math.max(6, Math.min(W - tw - 6, box.x));
          const ty = box.y > th + 8 ? box.y - th - 4 : box.y + 4;

          ctx.setLineDash([]);
          ctx.fillStyle = '#fe9a00';
          drawRoundedRectPath(ctx, tx, ty, tw, th, 6);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(tagText, tx + 8, ty + th / 2);
          ctx.restore();
        }
      }
    },
    [
      selectedPreset,
      isWidePreset,
      selectedTheme,
      layoutMode,
      usePhotoOwnBg,
      merchFitMode,
      showFlameWatermark,
      flameOpacity,
      headlineWrapMode,
      promoText,
      subText,
      showPriceBadge,
      badgeValue,
      badgeSubLabel,
      transforms,
      activeLayer,
      draggingLayer,
      hoverLayer,
      uploadedArt,
      selectedIds,
      flameReadyTick
    ]
  );

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Hit-test topmost interactive layer under cursor (Z-order: Badge → Headline → Subtext → Art → Flame)
  const hitTestLayerAt = (ptX: number, ptY: number): LayerKey | null => {
    const order: LayerKey[] = ['badge', 'headline', 'subtext', 'art', 'flame'];
    for (const key of order) {
      const b = layerBoxesRef.current[key];
      if (!b) continue;
      if (key === 'badge') {
        if (Math.hypot(ptX - b.cx, ptY - b.cy) <= b.w * 0.55) return 'badge';
      } else if (ptX >= b.x && ptX <= b.x + b.w && ptY >= b.y && ptY <= b.y + b.h) {
        return key;
      }
    }
    return null;
  };

  const clientToCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (clientY - rect.top) * (canvas.height / Math.max(1, rect.height))
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    const hit = hitTestLayerAt(pt.x, pt.y);
    if (!hit) return;

    const box = layerBoxesRef.current[hit];
    if (!box) return;

    e.preventDefault();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragOffsetRef.current = { dx: pt.x - box.cx, dy: pt.y - box.cy };
    setActiveLayer(hit);
    setDraggingLayer(hit);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);

    if (draggingLayer) {
      e.preventDefault();
      const nx = (pt.x - dragOffsetRef.current.dx) / canvas.width;
      const ny = (pt.y - dragOffsetRef.current.dy) / canvas.height;
      setTransforms(prev => ({
        ...prev,
        [draggingLayer]: {
          ...prev[draggingLayer],
          x: Math.min(0.96, Math.max(0.04, nx)),
          y: Math.min(0.96, Math.max(0.04, ny))
        }
      }));
      return;
    }

    const hovered = hitTestLayerAt(pt.x, pt.y);
    if (hovered !== hoverLayer) setHoverLayer(hovered);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingLayer) {
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingLayer(null);
    }
  };

  const exportCleanJpg = async (customName?: string, overrideArtList?: UploadedArtwork[]) => {
    await renderCanvas({ overrideArtList, cleanExport: true });
    const canvas = canvasRef.current;
    if (canvas) {
      const url = canvas.toDataURL('image/jpeg', 0.94);
      const link = document.createElement('a');
      const safeSlug = (customName || selectedPreset.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      link.download = `saturday-am-${safeSlug}-${selectedPreset.width}x${selectedPreset.height}.jpg`;
      link.href = url;
      link.click();
    }
    await renderCanvas();
  };

  const handleBatchExportAllSingleShots = async () => {
    if (uploadedArt.length === 0) return;
    setIsExportingBatch(true);
    try {
      for (const art of uploadedArt) {
        await exportCleanJpg(art.name, [art]);
        await new Promise(r => setTimeout(r, 240));
      }
    } finally {
      setIsExportingBatch(false);
    }
  };

  const addCatalogSeriesCover = async (seriesItem: any) => {
    if (!seriesItem?.cover_url) return;
    const id = `series_${seriesItem.slug}`;
    if (uploadedArt.some(a => a.id === id)) {
      toggleSelectArt(id);
      return;
    }
    await loadImageCached(seriesItem.cover_url);
    const newItem: UploadedArtwork = {
      id,
      name: seriesItem.title || seriesItem.slug,
      dataUrl: seriesItem.cover_url
    };
    setUploadedArt(prev => [...prev, newItem]);
    setSelectedIds(prev =>
      layoutMode === 'single_book' ||
      layoutMode === 'flat_poster' ||
      layoutMode === 'complete_merch'
        ? [id]
        : [...prev, id]
    );
  };

  const activeScalePct = Math.round((transforms[activeLayer]?.scale || 1) * 100);

  return (
    <div className={isStandalonePortal ? 'min-h-screen bg-black/95 p-4 sm:p-8' : ''}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white space-y-6 shadow-xl animate-fade-in max-w-6xl mx-auto">
        {/* TOP BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Saturday AM • Interactive Multi-Layer Ad Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-wider text-white flex items-center gap-2.5">
              <Layout className="w-6 h-6 text-[#fe9a00]" />
              Shopify Product Shot &amp; Banner Maker
            </h2>
            <p className="text-xs text-zinc-400 font-bold mt-1">
              Click and drag any layer directly on the canvas (Books, Headline, Subtext, Price Tag, or Hype Flame), adjust sizes, and save reusable templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isStandalonePortal && onExitStandalone && (
              <button
                type="button"
                onClick={onExitStandalone}
                className="bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to App
              </button>
            )}
            <button
              type="button"
              onClick={resetAllLayers}
              className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-300 font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#fe9a00]" /> Reset All Positions
            </button>
            <button
              type="button"
              onClick={() => renderCanvas()}
              className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-200 font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#fe9a00]" /> Refresh
            </button>
          </div>
        </div>

        {/* SAVED TEMPLATES BAR */}
        <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#fe9a00]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                Saved Custom Templates ({savedTemplates.length})
              </span>
              {templateSavedNotice && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  ✓ {templateSavedNotice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={templateNameInput}
                onChange={e => setTemplateNameInput(e.target.value)}
                placeholder="Template name (e.g. Wide Hero Book Drop)..."
                className="w-full sm:w-64 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-3.5 py-2 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" /> Save Template
              </button>
            </div>
          </div>

          {savedTemplates.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {savedTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 hover:border-[#fe9a00] rounded-xl px-3 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadTemplate(tpl)}
                    className="text-[10px] font-black uppercase tracking-wider text-white hover:text-[#fe9a00] cursor-pointer"
                  >
                    {tpl.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="text-zinc-500 hover:text-red-400 cursor-pointer ml-1"
                    title="Delete saved template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT CONTROLS */}
          <div className="xl:col-span-5 space-y-5">
            {/* STEP 1: ARTWORK UPLOAD */}
            <div className="bg-black border border-[#fe9a00]/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                  1. Drop Book Covers or Merch Photos
                </span>
                <span className="text-[9px] font-bold text-zinc-500">
                  {uploadedArt.length} Loaded
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleLocalFilesSelected(e.target.files)}
              />

              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  handleLocalFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-[#fe9a00] bg-zinc-950/80 rounded-xl p-5 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-[#fe9a00] mx-auto mb-1.5" />
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  Click or Drag Covers / Shirt Photos Here
                </p>
                <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                  Multi-file select supported • Proportional zero-squish rendering
                </p>
              </div>

              {uploadedArt.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                  {uploadedArt.map((art, idx) => {
                    const selIdx = selectedIds.indexOf(art.id);
                    const isSelected = selIdx !== -1;
                    return (
                      <div
                        key={art.id}
                        onClick={() => toggleSelectArt(art.id)}
                        className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer aspect-[3/4] bg-zinc-900 ${
                          isSelected
                            ? 'border-[#fe9a00]'
                            : 'border-zinc-800 opacity-65 hover:opacity-100'
                        }`}
                        title={art.name}
                      >
                        <img src={art.dataUrl} alt={art.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#fe9a00] text-black text-[9px] font-black flex items-center justify-center shadow">
                            {selIdx + 1}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeUploadedArt(art.id);
                          }}
                          className="absolute top-1 right-1 p-1 rounded bg-black/80 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] font-bold text-white truncate px-1 py-0.5">
                          {art.name || `Item ${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {seriesList.length > 0 && (
                <div className="pt-1">
                  <select
                    defaultValue=""
                    onChange={e => {
                      const found = seriesList.find((s: any) => s.slug === e.target.value);
                      if (found) addCatalogSeriesCover(found);
                      e.target.value = '';
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-bold text-zinc-300 cursor-pointer focus:outline-none focus:border-[#fe9a00]"
                  >
                    <option value="">+ Or Pull Existing Series Cover from App Database...</option>
                    {seriesList.map((s: any) => (
                      <option key={s.id || s.slug} value={s.slug}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* STEP 2: PRODUCT & MOCKUP STYLE */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                2. Product &amp; Mockup Style
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'single_book', label: 'Single 3D Book', icon: BookOpen },
                  { id: 'bundle_3', label: '3-Book Showcase', icon: Layers },
                  { id: 'bundle_5', label: '5-Book Collection', icon: Layers },
                  { id: 'complete_merch', label: 'Photo / T-Shirt', icon: ImageIcon },
                  { id: 'gift_cards', label: 'Tilted Gift Cards', icon: CreditCard },
                  { id: 'flat_poster', label: 'Framed Art Print', icon: ImageIcon }
                ].map(mode => {
                  const Icon = mode.icon;
                  const active = layoutMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleModeSelect(mode.id as LayoutMode)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        active
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {layoutMode === 'complete_merch' && (
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
                  <label className="flex items-center justify-between gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    <span>Keep Photo&apos;s Own Background (Skip AM Pattern)</span>
                    <input
                      type="checkbox"
                      checked={usePhotoOwnBg}
                      onChange={e => setUsePhotoOwnBg(e.target.checked)}
                      className="accent-[#fe9a00] w-4 h-4"
                    />
                  </label>
                  {usePhotoOwnBg && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMerchFitMode('contain')}
                        className={`py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer ${
                          merchFitMode === 'contain'
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Fit Whole Shirt/Product
                      </button>
                      <button
                        type="button"
                        onClick={() => setMerchFitMode('cover')}
                        className={`py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer ${
                          merchFitMode === 'cover'
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Fill Frame Edge-to-Edge
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 3: DIMENSIONS, BACKDROP & FLAME WATERMARK */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block mb-2">
                  3. Shopify Dimensions Preset
                </span>
                <div className="space-y-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedPreset.id === p.id
                          ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black block">{p.name}</span>
                        <span className="text-[10px] text-zinc-500 font-bold">{p.desc}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#fe9a00] font-bold shrink-0 ml-2">
                        {p.width}×{p.height}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {!(layoutMode === 'complete_merch' && usePhotoOwnBg) && (
                <div className="space-y-3 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#fe9a00]" /> Backdrop Theme &amp; Hype Flame
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PALETTES.map(tp => (
                      <button
                        key={tp.id}
                        type="button"
                        onClick={() => setSelectedTheme(tp)}
                        className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase cursor-pointer ${
                          selectedTheme.id === tp.id
                            ? 'border-[#fe9a00] bg-zinc-900 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${tp.inner}, ${tp.outer})`
                          }}
                        />
                        <span className="truncate">{tp.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <label className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-300 cursor-pointer">
                      <span>Show Official Hype Flame Watermark</span>
                      <input
                        type="checkbox"
                        checked={showFlameWatermark}
                        onChange={e => setShowFlameWatermark(e.target.checked)}
                        className="accent-[#fe9a00] w-3.5 h-3.5"
                      />
                    </label>
                    {showFlameWatermark && (
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase text-zinc-400 shrink-0">
                          Opacity ({Math.round(flameOpacity * 100)}%)
                        </span>
                        <input
                          type="range"
                          min="0.04"
                          max="0.35"
                          step="0.01"
                          value={flameOpacity}
                          onChange={e => setFlameOpacity(Number(e.target.value))}
                          className="flex-1 accent-[#fe9a00] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: COPY & PRICE STICKER */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                4. Copy &amp; Price Sticker Content
              </span>

              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: 'New Vol Drop',
                    top: 'OUT NOW IN THE AM SHOP!',
                    sub: 'FREE SHIPPING ON ORDERS OVER $75 • +BONUS HYPES!',
                    price: '$14.99'
                  },
                  {
                    label: 'Apparel / Merch',
                    top: '',
                    sub: '',
                    price: '$24.99'
                  },
                  {
                    label: 'AM Gift Cards',
                    top: 'SATURDAY AM DIGITAL GIFT CARDS',
                    sub: 'INSTANT DELIVERY • BONUS GOLD HYPES INCLUDED!',
                    price: '$10–$100'
                  },
                  {
                    label: 'Clean Product Only',
                    top: '',
                    sub: '',
                    price: ''
                  }
                ].map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromoText(qp.top);
                      setSubText(qp.sub);
                      if (qp.price) {
                        setShowPriceBadge(true);
                        setBadgeValue(qp.price);
                      } else {
                        setShowPriceBadge(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-800 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    Headline Copy
                  </label>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'auto', label: 'Auto' },
                      { id: 'two_line', label: '2-Line' },
                      { id: 'single_line', label: '1-Line' }
                    ].map(wm => (
                      <button
                        key={wm.id}
                        type="button"
                        onClick={() => setHeadlineWrapMode(wm.id as any)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer ${
                          headlineWrapMode === wm.id
                            ? 'bg-[#fe9a00] text-black'
                            : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {wm.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={promoText}
                  onChange={e => setPromoText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Subtext Copy
                </label>
                <input
                  type="text"
                  value={subText}
                  onChange={e => setSubText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none mt-1"
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider text-zinc-200">
                  <input
                    type="checkbox"
                    checked={showPriceBadge}
                    onChange={e => setShowPriceBadge(e.target.checked)}
                    className="accent-[#fe9a00] w-3.5 h-3.5"
                  />
                  <span>Show Price Tag</span>
                </label>

                {showPriceBadge && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={badgeValue}
                      onChange={e => setBadgeValue(e.target.value)}
                      placeholder="$14.99"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#fe9a00] text-center focus:border-[#fe9a00] outline-none"
                    />
                    <input
                      type="text"
                      value={badgeSubLabel}
                      onChange={e => setBadgeSubLabel(e.target.value)}
                      placeholder="Sublabel (opt)"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white text-center focus:border-[#fe9a00] outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT INTERACTIVE CANVAS + LAYER SIZE INSPECTOR */}
          <div className="xl:col-span-7 space-y-4 xl:sticky xl:top-6">
            {/* MULTI-LAYER SELECTOR & SIZE SLIDER BAR */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Select &amp; Resize Any Layer (Or Click &amp; Drag on Canvas!)
                </span>
                <button
                  type="button"
                  onClick={() => resetSingleLayer(activeLayer)}
                  className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-[#fe9a00] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset {LAYER_LABELS[activeLayer]}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['art', 'headline', 'subtext', 'badge', 'flame'] as LayerKey[]).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveLayer(key)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                      activeLayer === key
                        ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {LAYER_LABELS[key]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-white min-w-[140px]">
                  {LAYER_LABELS[activeLayer]} Size: <strong className="text-[#fe9a00]">{activeScalePct}%</strong>
                </span>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={transforms[activeLayer]?.scale || 1}
                  onChange={e => updateLayerScale(activeLayer, Number(e.target.value))}
                  className="flex-1 accent-[#fe9a00] cursor-pointer"
                />
              </div>
            </div>

            {/* INTERACTIVE CANVAS STAGE */}
            <div className="bg-black border-2 border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                  Live Interactive Canvas ({selectedPreset.width} × {selectedPreset.height} px)
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Move className="w-3 h-3" /> Drag Books, Text, Flame &amp; Price Tag
                </span>
              </div>

              <div className="w-full flex items-center justify-center bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-3 min-h-[340px]">
                <canvas
                  ref={canvasRef}
                  width={selectedPreset.width}
                  height={selectedPreset.height}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onPointerLeave={() => setHoverLayer(null)}
                  style={{
                    aspectRatio: `${selectedPreset.width} / ${selectedPreset.height}`,
                    maxHeight: '540px',
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    touchAction: draggingLayer ? 'none' : 'auto'
                  }}
                  className={`block rounded-lg shadow-2xl border border-zinc-800 select-none ${
                    draggingLayer
                      ? 'cursor-grabbing'
                      : hoverLayer
                      ? 'cursor-grab'
                      : 'cursor-default'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const activeOne = uploadedArt.find(a => a.id === selectedIds[0]);
                  exportCleanJpg(activeOne?.name || layoutMode);
                }}
                className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.35)] transition-colors"
              >
                <Download className="w-4 h-4" /> Download This Shopify JPG
              </button>

              <button
                type="button"
                disabled={uploadedArt.length === 0 || isExportingBatch}
                onClick={handleBatchExportAllSingleShots}
                className="w-full py-4 bg-zinc-950 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/40 font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-40"
              >
                <Layers className="w-4 h-4" />
                {isExportingBatch
                  ? 'Batch Exporting...'
                  : `Batch Export All (${uploadedArt.length}) Items`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyAssetGen;