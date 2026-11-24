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
  Copy,
  Check,
  ExternalLink,
  ArrowLeft
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

type WideLayoutStyle = 'split_hero' | 'full_shelf';

interface UploadedArtwork {
  id: string;
  name: string;
  dataUrl: string;
}

const HYPE_FLAME_R2_URL =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png';

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

        // Convert the official Hype Flame PNG into a crisp monochrome watermark stamp
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

// Strictly preserves exact naturalWidth / naturalHeight — never squishes or stretches covers!
const draw3DPaperbackVolume = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxWidth: number,
  maxHeight: number,
  tiltRadians = 0
) => {
  const natW = Math.max(1, img.naturalWidth || 680);
  const natH = Math.max(1, img.naturalHeight || 1000);
  const scale = Math.min(maxWidth / natW, maxHeight / natH);
  const bw = natW * scale;
  const bh = natH * scale;

  ctx.save();
  ctx.translate(cx, cy);
  if (tiltRadians !== 0) ctx.rotate(tiltRadians);

  // Subtle 3D page-block right edge
  const pageEdgeWidth = Math.max(4, Math.round(bw * 0.02));
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(bw / 2 - 1, -bh / 2 + 3, pageEdgeWidth, bh - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(bw / 2 + pageEdgeWidth - 2, -bh / 2 + 3, 2, bh - 6);

  // Studio drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.56)';
  ctx.shadowBlur = Math.round(bh * 0.08);
  ctx.shadowOffsetX = Math.round(bh * 0.026);
  ctx.shadowOffsetY = Math.round(bh * 0.042);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.restore();

  // Proportional Cover Art
  ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);

  // Paperback spine crease & specular highlight
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
};

// Uses aspect-fill ("object-fit: cover") so portrait art is cropped cleanly instead of squished!
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
    ctx.drawImage(img, 0, 0, Math.min(12, img.naturalWidth), Math.min(12, img.naturalHeight), 0, 0, 4, 4);
    const d = ctx.getImageData(1, 1, 1, 1).data;
    if (d[3] < 200) return '#ffffff';
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
  } catch {
    return '#ffffff';
  }
};

// Splits long headlines cleanly into 2 balanced punchy lines for Wide Hero Banners
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

const getDefaultBadgePosition = (preset: AssetPreset, mode: LayoutMode): { x: number; y: number } => {
  const ratio = preset.width / preset.height;
  if (ratio >= 1.55) {
    return { x: 0.88, y: 0.36 };
  }
  if (mode === 'bundle_5' || mode === 'bundle_3') {
    return { x: 0.84, y: 0.72 };
  }
  return { x: 0.80, y: 0.62 };
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
  const [wideLayoutStyle, setWideLayoutStyle] = useState<WideLayoutStyle>('split_hero');
  const [selectedTheme, setSelectedTheme] = useState<ThemePalette>(THEME_PALETTES[0]);

  // Complete Photo / Merch options (e.g. t-shirts, hats, mockups that already have their own background)
  const [usePhotoOwnBg, setUsePhotoOwnBg] = useState<boolean>(true);
  const [merchFitMode, setMerchFitMode] = useState<'contain' | 'cover'>('contain');

  const [promoText, setPromoText] = useState('OUT NOW IN THE AM SHOP!');
  const [subText, setSubText] = useState('FREE SHIPPING ON ORDERS OVER $75 • +BONUS HYPES!');
  const [showPriceBadge, setShowPriceBadge] = useState(true);
  const [badgeValue, setBadgeValue] = useState('$14.99');
  const [badgeSubLabel, setBadgeSubLabel] = useState('');
  const [badgeScale, setBadgeScale] = useState<number>(1.0);

  // Draggable Price Sticker normalized coordinates (0..1)
  const [badgePos, setBadgePos] = useState<{ x: number; y: number }>(() =>
    getDefaultBadgePosition(PRESETS[0], 'single_book')
  );
  const [badgeManuallyMoved, setBadgeManuallyMoved] = useState(false);
  const [isDraggingBadge, setIsDraggingBadge] = useState(false);
  const [isHoveringBadge, setIsHoveringBadge] = useState(false);

  const [uploadedArt, setUploadedArt] = useState<UploadedArtwork[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [flameReadyTick, setFlameReadyTick] = useState(0);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const badgeHitBoxRef = useRef<{ cx: number; cy: number; r: number }>({ cx: 0, cy: 0, r: 0 });
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const isWidePreset = selectedPreset.width / selectedPreset.height >= 1.55;

  // Preload official Saturday AM Hype Flame watermark on mount
  useEffect(() => {
    loadOfficialHypeFlameWatermark().then(canvas => {
      if (canvas) setFlameReadyTick(t => t + 1);
    });
  }, []);

  // Auto-adjust default sticker position when switching presets/modes unless manually dragged
  useEffect(() => {
    if (!badgeManuallyMoved) {
      setBadgePos(getDefaultBadgePosition(selectedPreset, layoutMode));
    }
  }, [selectedPreset, layoutMode, badgeManuallyMoved]);

  const resetBadgePosition = () => {
    setBadgeManuallyMoved(false);
    setBadgePos(getDefaultBadgePosition(selectedPreset, layoutMode));
  };

  const copyFredPortalUrl = () => {
    const portalUrl = `${window.location.origin}/ad-studio`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedPortalLink(true);
    setTimeout(() => setCopiedPortalLink(false), 2500);
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
    async (overrideArtList?: UploadedArtwork[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = selectedPreset.width;
      const H = selectedPreset.height;

      const activeItems =
        overrideArtList ||
        selectedIds
          .map(id => uploadedArt.find(a => a.id === id))
          .filter((a): a is UploadedArtwork => Boolean(a));

      const fallbackPool = activeItems.length > 0 ? activeItems : uploadedArt.slice(0, 5);
      const loadedImages = (
        await Promise.all(fallbackPool.map(item => loadImageCached(item.dataUrl)))
      ).filter((im): im is HTMLImageElement => Boolean(im));

      // Update canvas dimensions immediately before painting so switching presets never flashes blank
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      const isCleanPhotoBg =
        layoutMode === 'complete_merch' && usePhotoOwnBg && loadedImages.length > 0;

      // 1. BACKDROP RENDER
      if (isCleanPhotoBg) {
        const bgSample = sampleCornerColor(loadedImages[0]);
        ctx.fillStyle = bgSample;
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

        // Halftone Manga Screentone Dots near edges
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

        // Official Saturday AM Hype Flame Watermark (Proportional)
        if (cachedFlameSilhouetteCanvas) {
          const fw = cachedFlameSilhouetteCanvas.width;
          const fh = cachedFlameSilhouetteCanvas.height;
          const targetH = Math.min(H * 0.78, W * 0.52);
          const targetW = targetH * (fw / Math.max(1, fh));
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.drawImage(
            cachedFlameSilhouetteCanvas,
            isWidePreset ? W * 0.34 : W * 0.03,
            H * 0.08,
            targetW,
            targetH
          );
          ctx.restore();
        }
      }

      const hasTopHeadline = Boolean(promoText.trim());
      const hasBottomSub = Boolean(subText.trim());
      const useSplitWideLayout =
        isWidePreset && wideLayoutStyle === 'split_hero' && !isCleanPhotoBg;

      // 2. ARTWORK & TYPOGRAPHY LAYOUT
      if (useSplitWideLayout) {
        // =====================================================================
        // WIDE SPLIT HERO LAYOUT (Matches Mockup: Art Left • Stacked Copy Center • Price Right)
        // =====================================================================
        const isMultiBook = layoutMode === 'bundle_3' || layoutMode === 'bundle_5';
        const leftZoneWidth = isMultiBook ? W * 0.46 : W * 0.32;
        const leftCenterX = isMultiBook ? W * 0.25 : W * 0.185;
        const stageCenterY = H * 0.5;
        const maxBookH = H * 0.85;

        if (loadedImages.length === 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.setLineDash([12, 10]);
          ctx.lineWidth = 3;
          const ph = H * 0.8;
          const pw = ph * 0.68;
          ctx.strokeRect(leftCenterX - pw / 2, stageCenterY - ph / 2, pw, ph);
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = `800 ${Math.round(H * 0.03)}px "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('DROP COVER ART', leftCenterX, stageCenterY);
          ctx.restore();
        } else if (layoutMode === 'single_book') {
          draw3DPaperbackVolume(
            ctx,
            loadedImages[0],
            leftCenterX,
            stageCenterY,
            leftZoneWidth * 0.88,
            maxBookH,
            0
          );
        } else if (layoutMode === 'flat_poster' || layoutMode === 'complete_merch') {
          const img = loadedImages[0];
          const scale = Math.min(
            (leftZoneWidth * 0.88) / Math.max(1, img.naturalWidth),
            maxBookH / Math.max(1, img.naturalHeight)
          );
          const pw = img.naturalWidth * scale;
          const ph = img.naturalHeight * scale;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = 28;
          ctx.shadowOffsetY = 12;
          if (layoutMode === 'flat_poster') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(leftCenterX - pw / 2 - 8, stageCenterY - ph / 2 - 8, pw + 16, ph + 16);
          }
          ctx.drawImage(img, leftCenterX - pw / 2, stageCenterY - ph / 2, pw, ph);
          ctx.restore();
        } else if (layoutMode === 'gift_cards') {
          const cardW = leftZoneWidth * 0.88;
          if (loadedImages.length >= 2) {
            drawTiltedGiftCard(ctx, loadedImages[1], leftCenterX - cardW * 0.1, stageCenterY + H * 0.08, cardW * 0.88, -0.12);
            drawTiltedGiftCard(ctx, loadedImages[0], leftCenterX + cardW * 0.12, stageCenterY - H * 0.07, cardW * 0.94, 0.12);
          } else {
            drawTiltedGiftCard(ctx, loadedImages[0], leftCenterX, stageCenterY, cardW, -0.06);
          }
        } else if (layoutMode === 'bundle_3') {
          const picks = [
            loadedImages[0],
            loadedImages[1] || loadedImages[0],
            loadedImages[2] || loadedImages[0]
          ];
          const maxEachW = (leftZoneWidth * 0.52);
          const centerH = H * 0.82;
          const sideH = H * 0.72;
          const spread = leftZoneWidth * 0.31;
          draw3DPaperbackVolume(ctx, picks[1], leftCenterX - spread, stageCenterY + H * 0.03, maxEachW, sideH, -0.08);
          draw3DPaperbackVolume(ctx, picks[2], leftCenterX + spread, stageCenterY + H * 0.03, maxEachW, sideH, 0.08);
          draw3DPaperbackVolume(ctx, picks[0], leftCenterX, stageCenterY, maxEachW * 1.08, centerH, 0);
        } else if (layoutMode === 'bundle_5') {
          const picks = Array.from({ length: 5 }, (_, idx) => loadedImages[idx % loadedImages.length]);
          const maxEachW = leftZoneWidth * 0.36;
          const step = leftZoneWidth * 0.19;
          draw3DPaperbackVolume(ctx, picks[3], leftCenterX - step * 2, stageCenterY + H * 0.05, maxEachW, H * 0.64, -0.11);
          draw3DPaperbackVolume(ctx, picks[4], leftCenterX + step * 2, stageCenterY + H * 0.05, maxEachW, H * 0.64, 0.11);
          draw3DPaperbackVolume(ctx, picks[1], leftCenterX - step, stageCenterY + H * 0.02, maxEachW, H * 0.72, -0.05);
          draw3DPaperbackVolume(ctx, picks[2], leftCenterX + step, stageCenterY + H * 0.02, maxEachW, H * 0.72, 0.05);
          draw3DPaperbackVolume(ctx, picks[0], leftCenterX, stageCenterY, maxEachW * 1.06, H * 0.8, 0);
        }

        // Stacked Center Copy Column
        const copyLeftEdge = isMultiBook ? W * 0.49 : W * 0.35;
        const copyRightEdge = showPriceBadge && badgePos.x > 0.72 ? W * 0.76 : W * 0.94;
        const copyMaxW = Math.max(W * 0.25, copyRightEdge - copyLeftEdge);
        const copyCenterX = copyLeftEdge + copyMaxW / 2;

        const lines = splitIntoBalancedLines(promoText);
        let headlineBottomY = H * 0.5;

        if (lines.length > 0) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 5;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let hFontSize = Math.round(H * (lines.length === 1 ? 0.12 : 0.115));
          const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
          ctx.font = `italic 900 ${hFontSize}px "Unbounded", Impact, sans-serif`;
          while (ctx.measureText(longestLine).width > copyMaxW && hFontSize > 22) {
            hFontSize -= 2;
            ctx.font = `italic 900 ${hFontSize}px "Unbounded", Impact, sans-serif`;
          }

          const lineHeight = hFontSize * 1.12;
          const totalBlockH = lines.length * lineHeight;
          const startY =
            (hasBottomSub ? H * 0.43 : H * 0.5) - totalBlockH / 2 + lineHeight / 2;

          lines.forEach((line, idx) => {
            ctx.fillText(line, copyCenterX, startY + idx * lineHeight);
          });
          headlineBottomY = startY + (lines.length - 1) * lineHeight + hFontSize * 0.65;
          ctx.restore();
        }

        if (hasBottomSub) {
          ctx.save();
          ctx.fillStyle = selectedTheme.subColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let subSize = Math.round(H * 0.036);
          ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
          while (ctx.measureText(subText.toUpperCase()).width > copyMaxW * 1.08 && subSize > 13) {
            subSize -= 1;
            ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
          }
          const subY = lines.length > 0 ? Math.min(H * 0.84, headlineBottomY + H * 0.075) : H * 0.5;
          ctx.fillText(subText.toUpperCase(), copyCenterX, subY);
          ctx.restore();
        }
      } else {
        // =====================================================================
        // STANDARD / SQUARE / STORY / FULL-SHELF / CLEAN MERCH PHOTO LAYOUT
        // =====================================================================
        const safeTop = hasTopHeadline ? H * 0.15 : H * 0.06;
        const safeBottom = hasBottomSub ? H * 0.86 : H * 0.94;
        const stageHeight = safeBottom - safeTop;
        const stageCenterY = safeTop + stageHeight / 2;

        if (loadedImages.length === 0) {
          ctx.save();
          ctx.strokeStyle = isCleanPhotoBg ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)';
          ctx.setLineDash([12, 10]);
          ctx.lineWidth = 3;
          const pw = Math.min(W * 0.5, stageHeight * 0.68);
          const ph = stageHeight * 0.82;
          ctx.strokeRect(W / 2 - pw / 2, stageCenterY - ph / 2, pw, ph);
          ctx.fillStyle = isCleanPhotoBg ? '#18181b' : 'rgba(255,255,255,0.88)';
          ctx.font = `800 ${Math.round(Math.min(W, H) * 0.026)}px "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('DROP COVER OR PRODUCT PHOTO', W / 2, stageCenterY);
          ctx.restore();
        } else if (layoutMode === 'complete_merch') {
          const img = loadedImages[0];
          if (isCleanPhotoBg && merchFitMode === 'cover') {
            drawImageCoverClipped(ctx, img, 0, 0, W, H, 0.5);
          } else {
            const availW = isCleanPhotoBg && !hasTopHeadline && !hasBottomSub ? W * 0.94 : W * 0.88;
            const availH = isCleanPhotoBg && !hasTopHeadline && !hasBottomSub ? H * 0.94 : stageHeight * 0.94;
            const scale = Math.min(
              availW / Math.max(1, img.naturalWidth),
              availH / Math.max(1, img.naturalHeight)
            );
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.save();
            if (!isCleanPhotoBg) {
              ctx.shadowColor = 'rgba(0,0,0,0.45)';
              ctx.shadowBlur = 28;
              ctx.shadowOffsetY = 14;
            }
            ctx.drawImage(img, W / 2 - dw / 2, stageCenterY - dh / 2, dw, dh);
            ctx.restore();
          }
        } else if (layoutMode === 'single_book') {
          draw3DPaperbackVolume(
            ctx,
            loadedImages[0],
            W * 0.5,
            stageCenterY,
            W * 0.78,
            stageHeight * 0.92,
            0
          );
        } else if (layoutMode === 'flat_poster') {
          const img = loadedImages[0];
          const scale = Math.min(
            (W * 0.78) / Math.max(1, img.naturalWidth),
            (stageHeight * 0.88) / Math.max(1, img.naturalHeight)
          );
          const pw = img.naturalWidth * scale;
          const ph = img.naturalHeight * scale;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 30;
          ctx.shadowOffsetY = 16;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(W / 2 - pw / 2 - 10, stageCenterY - ph / 2 - 10, pw + 20, ph + 20);
          ctx.restore();
          ctx.drawImage(img, W / 2 - pw / 2, stageCenterY - ph / 2, pw, ph);
        } else if (layoutMode === 'gift_cards') {
          const cardW = Math.min(W * 0.54, stageHeight * 1.12);
          if (loadedImages.length >= 2) {
            drawTiltedGiftCard(
              ctx,
              loadedImages[1],
              W * 0.39,
              stageCenterY + stageHeight * 0.1,
              cardW * 0.9,
              -0.13
            );
            drawTiltedGiftCard(
              ctx,
              loadedImages[0],
              W * 0.60,
              stageCenterY - stageHeight * 0.08,
              cardW * 0.96,
              0.14
            );
          } else {
            drawTiltedGiftCard(ctx, loadedImages[0], W * 0.5, stageCenterY, cardW * 1.05, -0.07);
          }
        } else if (layoutMode === 'bundle_3') {
          // Wide-spread 3-Book Showcase: 85–90% of every cover clearly visible!
          const picks = [
            loadedImages[0],
            loadedImages[1] || loadedImages[0],
            loadedImages[2] || loadedImages[0]
          ];
          const maxEachW = W * 0.31;
          const centerH = stageHeight * 0.88;
          const sideH = stageHeight * 0.78;
          const spreadX = W * 0.285;

          draw3DPaperbackVolume(ctx, picks[1], W * 0.5 - spreadX, stageCenterY + stageHeight * 0.03, maxEachW * 0.92, sideH, -0.07);
          draw3DPaperbackVolume(ctx, picks[2], W * 0.5 + spreadX, stageCenterY + stageHeight * 0.03, maxEachW * 0.92, sideH, 0.07);
          draw3DPaperbackVolume(ctx, picks[0], W * 0.5, stageCenterY - stageHeight * 0.01, maxEachW, centerH, 0);
        } else if (layoutMode === 'bundle_5') {
          // Wide-spread 5-Book Showcase: Generous column spacing so all 5 covers read clearly!
          const picks = Array.from({ length: 5 }, (_, idx) => loadedImages[idx % loadedImages.length]);
          const maxEachW = W * 0.225;
          const outerH = stageHeight * 0.72;
          const midH = stageHeight * 0.80;
          const centerH = stageHeight * 0.88;
          const stepX = W * 0.19;

          draw3DPaperbackVolume(ctx, picks[3], W * 0.5 - stepX * 2, stageCenterY + stageHeight * 0.05, maxEachW * 0.9, outerH, -0.09);
          draw3DPaperbackVolume(ctx, picks[4], W * 0.5 + stepX * 2, stageCenterY + stageHeight * 0.05, maxEachW * 0.9, outerH, 0.09);
          draw3DPaperbackVolume(ctx, picks[1], W * 0.5 - stepX, stageCenterY + stageHeight * 0.02, maxEachW * 0.95, midH, -0.045);
          draw3DPaperbackVolume(ctx, picks[2], W * 0.5 + stepX, stageCenterY + stageHeight * 0.02, maxEachW * 0.95, midH, 0.045);
          draw3DPaperbackVolume(ctx, picks[0], W * 0.5, stageCenterY - stageHeight * 0.01, maxEachW, centerH, 0);
        }

        // Top Headline & Bottom Subtext
        if (hasTopHeadline) {
          ctx.save();
          if (!isCleanPhotoBg) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 4;
          }
          ctx.fillStyle = isCleanPhotoBg ? '#09090b' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let fontSize = Math.round(Math.min(W * 0.052, H * 0.065));
          ctx.font = `italic 900 ${fontSize}px "Unbounded", Impact, sans-serif`;
          while (ctx.measureText(promoText.toUpperCase()).width > W * 0.9 && fontSize > 18) {
            fontSize -= 2;
            ctx.font = `italic 900 ${fontSize}px "Unbounded", Impact, sans-serif`;
          }
          ctx.fillText(promoText.toUpperCase(), W / 2, H * 0.08);
          ctx.restore();
        }

        if (hasBottomSub) {
          ctx.save();
          ctx.fillStyle = isCleanPhotoBg ? '#18181b' : selectedTheme.subColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let subSize = Math.round(Math.min(W * 0.024, H * 0.03));
          ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
          while (ctx.measureText(subText.toUpperCase()).width > W * 0.92 && subSize > 12) {
            subSize -= 1;
            ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
          }
          ctx.fillText(subText.toUpperCase(), W / 2, H * 0.935);
          ctx.restore();
        }
      }

      // 3. PADDED, DRAGGABLE CIRCULAR PRICE STICKER
      if (showPriceBadge && badgeValue.trim()) {
        const baseRadius = Math.round(
          Math.min(W, H) * (isWidePreset ? 0.148 : 0.112) * badgeScale
        );
        const bx = Math.min(W - baseRadius - 8, Math.max(baseRadius + 8, badgePos.x * W));
        const by = Math.min(H - baseRadius - 8, Math.max(baseRadius + 8, badgePos.y * H));

        badgeHitBoxRef.current = { cx: bx, cy: by, r: baseRadius };

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

        // Enforce 28% inner padding inside the black ring so text ALWAYS has generous breathing room
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

        ctx.fillText(
          badgeValue.trim(),
          bx,
          hasSub ? by - baseRadius * 0.13 : by + 2
        );

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
      } else {
        badgeHitBoxRef.current = { cx: -9999, cy: -9999, r: 0 };
      }
    },
    [
      selectedPreset,
      isWidePreset,
      wideLayoutStyle,
      selectedTheme,
      layoutMode,
      usePhotoOwnBg,
      merchFitMode,
      promoText,
      subText,
      showPriceBadge,
      badgeValue,
      badgeSubLabel,
      badgeScale,
      badgePos,
      uploadedArt,
      selectedIds,
      flameReadyTick
    ]
  );

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // --- POINTER DRAG HANDLERS FOR LIVE CANVAS PRICE STICKER ---
  const clientToCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!showPriceBadge || !badgeValue.trim()) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    const { cx, cy, r } = badgeHitBoxRef.current;
    if (Math.hypot(pt.x - cx, pt.y - cy) <= r * 1.15) {
      e.preventDefault();
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      dragOffsetRef.current = { dx: pt.x - cx, dy: pt.y - cy };
      setIsDraggingBadge(true);
      setBadgeManuallyMoved(true);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);

    if (isDraggingBadge) {
      e.preventDefault();
      const targetX = (pt.x - dragOffsetRef.current.dx) / canvas.width;
      const targetY = (pt.y - dragOffsetRef.current.dy) / canvas.height;
      setBadgePos({
        x: Math.min(0.94, Math.max(0.06, targetX)),
        y: Math.min(0.94, Math.max(0.06, targetY))
      });
      return;
    }

    if (showPriceBadge && badgeValue.trim()) {
      const { cx, cy, r } = badgeHitBoxRef.current;
      setIsHoveringBadge(Math.hypot(pt.x - cx, pt.y - cy) <= r * 1.15);
    } else if (isHoveringBadge) {
      setIsHoveringBadge(false);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingBadge) {
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDraggingBadge(false);
    }
  };

  const downloadCurrentCanvas = (customName?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/jpeg', 0.94);
    const link = document.createElement('a');
    const safeSlug = (customName || selectedPreset.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.download = `saturday-am-${safeSlug}-${selectedPreset.width}x${selectedPreset.height}.jpg`;
    link.href = url;
    link.click();
  };

  const handleBatchExportAllSingleShots = async () => {
    if (uploadedArt.length === 0) return;
    setIsExportingBatch(true);
    try {
      for (const art of uploadedArt) {
        await renderCanvas([art]);
        await new Promise(r => setTimeout(r, 100));
        downloadCurrentCanvas(art.name);
        await new Promise(r => setTimeout(r, 220));
      }
      await renderCanvas();
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

  return (
    <div
      className={`${
        isStandalonePortal
          ? 'min-h-screen bg-black/95 p-4 sm:p-8'
          : ''
      }`}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white space-y-6 shadow-xl animate-fade-in max-w-6xl mx-auto">
        {/* HEADER + FRED'S DIRECT PORTAL LINK */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Saturday AM • Instant Ad &amp; Shopify Mockup Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-wider text-white flex items-center gap-2.5">
              <Layout className="w-6 h-6 text-[#fe9a00]" />
              Shopify Product Shot &amp; Banner Maker
            </h2>
            <p className="text-xs text-zinc-400 font-bold mt-1">
              Proportional 3D books, wide split-hero banners, clean t-shirt/merch mode, and a drag-anywhere price sticker.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isStandalonePortal && onExitStandalone ? (
              <button
                type="button"
                onClick={onExitStandalone}
                className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-200 font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#fe9a00]" /> Open Manga Hype App
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={copyFredPortalUrl}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer shadow-lg"
                  title="Copy standalone link (/ad-studio) for Fred — bypasses AM Command Center"
                >
                  {copiedPortalLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied /ad-studio Link!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Fred&apos;s Direct Link
                    </>
                  )}
                </button>
                <a
                  href="/ad-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-300 hover:text-white font-black uppercase tracking-widest px-3 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5"
                  title="Preview Fred's standalone Ad Studio page"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#fe9a00]" /> Portal
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => renderCanvas()}
              className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-200 font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#fe9a00]" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT CONTROLS */}
          <div className="xl:col-span-5 space-y-5">
            {/* STEP 1: DROP COVERS OR PRODUCT PHOTOS */}
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
                  Select 1 or multiple PNG/JPG files at once
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

            {/* STEP 2: MOCKUP STYLE */}
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
                      onClick={() => setLayoutMode(mode.id as LayoutMode)}
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

              {/* COMPLETE PHOTO / T-SHIRT OPTIONS */}
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

              {/* WIDE BANNER COMPOSITION TOGGLE */}
              {isWidePreset && !(layoutMode === 'complete_merch' && usePhotoOwnBg) && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                    Wide Banner Composition
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWideLayoutStyle('split_hero')}
                      className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer ${
                        wideLayoutStyle === 'split_hero'
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                          : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Split Hero (Art Left • Copy Right)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWideLayoutStyle('full_shelf')}
                      className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer ${
                        wideLayoutStyle === 'full_shelf'
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                          : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Full-Width Shelf Row
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: DIMENSIONS & BACKDROP THEME */}
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
                      onClick={() => setSelectedPreset(p)}
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
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 mb-2">
                    <Palette className="w-3.5 h-3.5 text-[#fe9a00]" /> Backdrop Theme
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
                </div>
              )}
            </div>

            {/* STEP 4: COPY & DRAGGABLE PRICE STICKER */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
                4. Copy &amp; Draggable Price Sticker
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
                    label: 'No Text / No Badge',
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
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Headline (Auto-stacks on Wide Banners • Leave blank for clean shot)
                </label>
                <input
                  type="text"
                  value={promoText}
                  onChange={e => setPromoText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Subtext Callout
                </label>
                <input
                  type="text"
                  value={subText}
                  onChange={e => setSubText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none mt-1"
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showPriceBadge}
                      onChange={e => setShowPriceBadge(e.target.checked)}
                      className="accent-[#fe9a00] w-3.5 h-3.5"
                    />
                    <span>Show Price Sticker (Drag on Canvas!)</span>
                  </label>

                  {showPriceBadge && (
                    <button
                      type="button"
                      onClick={resetBadgePosition}
                      className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-[#fe9a00] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Pos
                    </button>
                  )}
                </div>

                {showPriceBadge && (
                  <>
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

                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 shrink-0">
                        Sticker Size ({Math.round(badgeScale * 100)}%)
                      </span>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.05"
                        value={badgeScale}
                        onChange={e => setBadgeScale(Number(e.target.value))}
                        className="flex-1 accent-[#fe9a00] cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT LIVE PROPORTIONAL PREVIEW & EXPORT */}
          <div className="xl:col-span-7 space-y-4 xl:sticky xl:top-6">
            <div className="bg-black border-2 border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                  Live Proportional Preview ({selectedPreset.width} × {selectedPreset.height} px)
                </span>
                {showPriceBadge && badgeValue.trim() && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Move className="w-3 h-3" /> Drag Yellow Price Tag Anywhere
                  </span>
                )}
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
                  style={{
                    aspectRatio: `${selectedPreset.width} / ${selectedPreset.height}`,
                    maxHeight: '540px',
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    touchAction: isDraggingBadge ? 'none' : 'auto'
                  }}
                  className={`block rounded-lg shadow-2xl border border-zinc-800 select-none ${
                    isDraggingBadge
                      ? 'cursor-grabbing'
                      : isHoveringBadge
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
                  downloadCurrentCanvas(activeOne?.name || layoutMode);
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