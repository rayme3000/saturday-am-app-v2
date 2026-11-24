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
  CheckCircle2,
  Palette
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
    desc: 'Storefront top hero & multi-book collection banner (1920×720)'
  },
  {
    id: 'promo_16_9',
    name: 'App Upsell / Social Spotlight (16:9)',
    width: 1200,
    height: 675,
    desc: 'Fits Upsell Popups, X/Bluesky cards & blog headers (1200×675)'
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

type LayoutMode = 'single_book' | 'bundle_3' | 'bundle_5' | 'gift_cards' | 'flat_poster';

interface UploadedArtwork {
  id: string;
  name: string;
  dataUrl: string;
}

const loadImageSafe = (src: string): Promise<HTMLImageElement | null> =>
  new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

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

// Vector AM Flame Watermark (Zero external CORS taint so canvas.toDataURL always succeeds!)
const drawVectorFlameWatermark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 200;
  ctx.scale(s, s);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(100, 10);
  ctx.bezierCurveTo(135, 55, 175, 85, 170, 138);
  ctx.bezierCurveTo(166, 178, 134, 195, 100, 195);
  ctx.bezierCurveTo(66, 195, 34, 178, 30, 138);
  ctx.bezierCurveTo(27, 105, 48, 82, 62, 68);
  ctx.bezierCurveTo(58, 92, 72, 102, 80, 92);
  ctx.bezierCurveTo(75, 62, 88, 34, 100, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const draw3DPaperbackVolume = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  targetHeight: number,
  tiltRadians = 0
) => {
  const naturalRatio = img.naturalWidth > 0 && img.naturalHeight > 0
    ? img.naturalWidth / img.naturalHeight
    : 0.68;
  const bh = targetHeight;
  const bw = bh * Math.min(0.82, Math.max(0.6, naturalRatio));

  ctx.save();
  ctx.translate(cx, cy);
  if (tiltRadians !== 0) ctx.rotate(tiltRadians);

  // Realistic 3D page-block right edge thickness
  const pageEdgeWidth = Math.max(5, Math.round(bw * 0.022));
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(bw / 2 - 1, -bh / 2 + 3, pageEdgeWidth, bh - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(bw / 2 + pageEdgeWidth - 2, -bh / 2 + 3, 2, bh - 6);

  // Deep studio drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
  ctx.shadowBlur = Math.round(bh * 0.085);
  ctx.shadowOffsetX = Math.round(bh * 0.03);
  ctx.shadowOffsetY = Math.round(bh * 0.045);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.restore();

  // Crisp Cover Art
  ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);

  // Left-edge paperback spine crease & specular highlight
  const spineWidth = Math.max(10, Math.round(bw * 0.048));
  const spineGrad = ctx.createLinearGradient(-bw / 2, 0, -bw / 2 + spineWidth, 0);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
  spineGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.28)');
  spineGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  spineGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.12)');
  spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(-bw / 2, -bh / 2, spineWidth, bh);

  // Subtle top/outer gloss rim
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

  ctx.restore();
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
  const ch = cw / 1.586; // Standard CR80 gift/credit card ratio
  const radius = Math.max(14, Math.round(cw * 0.045));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tiltRadians);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
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
  ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);

  // Subtle diagonal card sheen
  const sheen = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.restore();

  drawRoundedRectPath(ctx, -cw / 2, -ch / 2, cw, ch, radius);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
};

export const ShopifyAssetGen: React.FC = () => {
  const { seriesList = [] } = useSeriesData();

  const [selectedPreset, setSelectedPreset] = useState<AssetPreset>(PRESETS[0]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single_book');
  const [selectedTheme, setSelectedTheme] = useState<ThemePalette>(THEME_PALETTES[0]);

  const [promoText, setPromoText] = useState('OUT NOW IN THE AM SHOP!');
  const [subText, setSubText] = useState('FREE SHIPPING ON ORDERS OVER $75 • +BONUS HYPES!');
  const [showPriceBadge, setShowPriceBadge] = useState(true);
  const [badgeValue, setBadgeValue] = useState('$14.99');
  const [badgeSubLabel, setBadgeSubLabel] = useState('');

  const [uploadedArt, setUploadedArt] = useState<UploadedArtwork[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportingBatch, setIsExportingBatch] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLocalFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = String(ev.target?.result || '');
        if (!dataUrl) return;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const newItem: UploadedArtwork = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          dataUrl
        };
        setUploadedArt(prev => {
          const next = [...prev, newItem];
          return next;
        });
        setSelectedIds(prev => [...prev, newItem.id]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleSelectArt = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (layoutMode === 'single_book' || layoutMode === 'flat_poster') {
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
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      // 1. Radial Brand Backdrop
      ctx.clearRect(0, 0, W, H);
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

      // 2. Halftone Manga Screentone Dots near Corners
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

      // 3. Vector AM Flame Watermark
      drawVectorFlameWatermark(ctx, W * 0.03, H * 0.06, Math.min(W, H) * 0.58);

      // 4. Resolve Active Artwork Images
      const activeItems =
        overrideArtList ||
        selectedIds
          .map(id => uploadedArt.find(a => a.id === id))
          .filter((a): a is UploadedArtwork => Boolean(a));

      const fallbackPool = activeItems.length > 0 ? activeItems : uploadedArt.slice(0, 5);
      const loadedImages = (
        await Promise.all(fallbackPool.map(item => loadImageSafe(item.dataUrl)))
      ).filter((im): im is HTMLImageElement => Boolean(im));

      const hasTopHeadline = Boolean(promoText.trim());
      const hasBottomSub = Boolean(subText.trim());
      const safeTop = hasTopHeadline ? H * 0.16 : H * 0.08;
      const safeBottom = hasBottomSub ? H * 0.86 : H * 0.92;
      const stageHeight = safeBottom - safeTop;
      const stageCenterY = safeTop + stageHeight / 2;

      // 5. Render Chosen Mockup Mode
      if (loadedImages.length === 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 3;
        const pw = Math.min(W * 0.42, stageHeight * 0.68);
        const ph = stageHeight * 0.85;
        ctx.strokeRect(W / 2 - pw / 2, stageCenterY - ph / 2, pw, ph);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `800 ${Math.round(Math.min(W, H) * 0.026)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('DROP COVER PNGs ON THE LEFT', W / 2, stageCenterY);
        ctx.restore();
      } else if (layoutMode === 'single_book') {
        draw3DPaperbackVolume(ctx, loadedImages[0], W * 0.5, stageCenterY, stageHeight * 0.92, 0);
      } else if (layoutMode === 'flat_poster') {
        const img = loadedImages[0];
        const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
        const ph = stageHeight * 0.9;
        const pw = ph * ratio;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(W / 2 - pw / 2 - 8, stageCenterY - ph / 2 - 8, pw + 16, ph + 16);
        ctx.restore();
        ctx.drawImage(img, W / 2 - pw / 2, stageCenterY - ph / 2, pw, ph);
      } else if (layoutMode === 'gift_cards') {
        const cardW = Math.min(W * 0.48, stageHeight * 1.15);
        if (loadedImages.length >= 2) {
          drawTiltedGiftCard(
            ctx,
            loadedImages[1],
            W * 0.41,
            stageCenterY + stageHeight * 0.1,
            cardW * 0.92,
            -0.14
          );
          drawTiltedGiftCard(
            ctx,
            loadedImages[0],
            W * 0.58,
            stageCenterY - stageHeight * 0.08,
            cardW,
            0.16
          );
        } else {
          drawTiltedGiftCard(ctx, loadedImages[0], W * 0.5, stageCenterY, cardW * 1.08, -0.08);
        }
      } else if (layoutMode === 'bundle_3') {
        const picks = [
          loadedImages[0],
          loadedImages[1] || loadedImages[0],
          loadedImages[2] || loadedImages[0]
        ];
        const sideH = stageHeight * 0.78;
        const centerH = stageHeight * 0.92;
        const spreadX = Math.min(W * 0.21, sideH * 0.65);

        draw3DPaperbackVolume(ctx, picks[1], W * 0.5 - spreadX, stageCenterY + sideH * 0.04, sideH, -0.1);
        draw3DPaperbackVolume(ctx, picks[2], W * 0.5 + spreadX, stageCenterY + sideH * 0.04, sideH, 0.1);
        draw3DPaperbackVolume(ctx, picks[0], W * 0.5, stageCenterY, centerH, 0);
      } else if (layoutMode === 'bundle_5') {
        const picks = Array.from({ length: 5 }, (_, idx) => loadedImages[idx % loadedImages.length]);
        const outerH = stageHeight * 0.68;
        const midH = stageHeight * 0.79;
        const centerH = stageHeight * 0.91;
        const stepX = Math.min(W * 0.145, centerH * 0.48);

        draw3DPaperbackVolume(ctx, picks[3], W * 0.5 - stepX * 1.9, stageCenterY + outerH * 0.07, outerH, -0.15);
        draw3DPaperbackVolume(ctx, picks[4], W * 0.5 + stepX * 1.9, stageCenterY + outerH * 0.07, outerH, 0.15);
        draw3DPaperbackVolume(ctx, picks[1], W * 0.5 - stepX, stageCenterY + midH * 0.03, midH, -0.07);
        draw3DPaperbackVolume(ctx, picks[2], W * 0.5 + stepX, stageCenterY + midH * 0.03, midH, 0.07);
        draw3DPaperbackVolume(ctx, picks[0], W * 0.5, stageCenterY, centerH, 0);
      }

      // 6. Optional Circular Price / Promo Sticker
      if (showPriceBadge && badgeValue.trim()) {
        const radius = Math.round(Math.min(W, H) * 0.105);
        const bx = layoutMode === 'bundle_5' ? W * 0.87 : W * 0.76;
        const by = stageCenterY + stageHeight * 0.14;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = selectedTheme.accent;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(5, Math.round(radius * 0.08));
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const valFontSize =
          badgeValue.length > 5
            ? Math.round(radius * 0.44)
            : Math.round(radius * 0.58);
        ctx.font = `italic 900 ${valFontSize}px "Unbounded", Impact, sans-serif`;
        ctx.fillText(
          badgeValue.trim(),
          bx,
          badgeSubLabel.trim() ? by - radius * 0.14 : by + 2
        );

        if (badgeSubLabel.trim()) {
          ctx.font = `800 ${Math.round(radius * 0.2)}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText(badgeSubLabel.trim().toUpperCase(), bx, by + radius * 0.34);
        }
        ctx.restore();
      }

      // 7. Headline & Subtext Typography
      if (hasTopHeadline) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let fontSize = Math.round(Math.min(W * 0.052, H * 0.068));
        ctx.font = `italic 900 ${fontSize}px "Unbounded", Impact, sans-serif`;
        while (ctx.measureText(promoText.toUpperCase()).width > W * 0.9 && fontSize > 18) {
          fontSize -= 2;
          ctx.font = `italic 900 ${fontSize}px "Unbounded", Impact, sans-serif`;
        }
        ctx.fillText(promoText.toUpperCase(), W / 2, H * 0.085);
        ctx.restore();
      }

      if (hasBottomSub) {
        ctx.save();
        ctx.fillStyle = selectedTheme.subColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let subSize = Math.round(Math.min(W * 0.024, H * 0.032));
        ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
        while (ctx.measureText(subText.toUpperCase()).width > W * 0.92 && subSize > 12) {
          subSize -= 1;
          ctx.font = `900 ${subSize}px "Plus Jakarta Sans", sans-serif`;
        }
        ctx.fillText(subText.toUpperCase(), W / 2, H * 0.935);
        ctx.restore();
      }
    },
    [
      selectedPreset,
      selectedTheme,
      layoutMode,
      promoText,
      subText,
      showPriceBadge,
      badgeValue,
      badgeSubLabel,
      uploadedArt,
      selectedIds
    ]
  );

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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

  // 1-Click Batch Export: Automatically generates & downloads individual product shots for ALL uploaded covers!
  const handleBatchExportAllSingleShots = async () => {
    if (uploadedArt.length === 0) return;
    setIsExportingBatch(true);
    try {
      for (const art of uploadedArt) {
        await renderCanvas([art]);
        await new Promise(r => setTimeout(r, 120));
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
    const newItem: UploadedArtwork = {
      id,
      name: seriesItem.title || seriesItem.slug,
      dataUrl: seriesItem.cover_url
    };
    setUploadedArt(prev => [...prev, newItem]);
    setSelectedIds(prev =>
      layoutMode === 'single_book' || layoutMode === 'flat_poster' ? [id] : [...prev, id]
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white space-y-6 shadow-xl animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Zero-Photoshop Shopify Mockup Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-wider text-white flex items-center gap-2.5">
            <Layout className="w-6 h-6 text-[#fe9a00]" />
            Shopify Product Shot &amp; Collection Banner Maker
          </h2>
          <p className="text-xs text-zinc-400 font-bold mt-1">
            Drop Fred&apos;s cover PNGs/JPGs once — instantly export 3D paperback product cards, 3- &amp; 5-book bundle banners, or batch-export every cover in 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {uploadedArt.length > 1 && layoutMode === 'single_book' && (
            <button
              type="button"
              disabled={isExportingBatch}
              onClick={handleBatchExportAllSingleShots}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-[10px] flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExportingBatch
                ? 'Exporting All...'
                : `1-Click Export All (${uploadedArt.length}) Product Shots`}
            </button>
          )}
          <button
            type="button"
            onClick={() => renderCanvas()}
            className="bg-black hover:border-[#fe9a00] border border-zinc-700 text-zinc-200 font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-[10px] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#fe9a00]" /> Refresh Canvas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT CONTROLS */}
        <div className="xl:col-span-5 space-y-5">
          {/* STEP 1: MULTI-FILE LOCAL COVER DROPZONE */}
          <div className="bg-black border border-[#fe9a00]/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                1. Drop Book Covers / Card Art (Multi-Select Supported)
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
                Click or Drag All Cover PNG/JPG Files Here
              </p>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                Renders locally in full resolution — zero upload wait, zero CORS issues
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
                        isSelected ? 'border-[#fe9a00]' : 'border-zinc-800 opacity-65 hover:opacity-100'
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
                        {art.name || `Cover ${idx + 1}`}
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

          {/* STEP 2: MOCKUP LAYOUT MODE */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
              2. Layout &amp; 3D Mockup Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'single_book', label: 'Single 3D Book', icon: BookOpen },
                { id: 'bundle_3', label: '3-Book Fan Bundle', icon: Layers },
                { id: 'bundle_5', label: '5-Book Collection', icon: Layers },
                { id: 'gift_cards', label: 'Tilted Gift Cards', icon: CreditCard },
                { id: 'flat_poster', label: 'Framed Art Print', icon: CheckCircle2 }
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
          </div>

          {/* STEP 3: CANVAS SIZE & COLOR PALETTE */}
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
                      style={{ background: `linear-gradient(135deg, ${tp.inner}, ${tp.outer})` }}
                    />
                    <span className="truncate">{tp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 4: COPY & PRICE STICKER */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
              4. Headline, Free-Shipping Callout &amp; Price Sticker
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
                  label: 'Graphic Novel Set',
                  top: 'BUILD YOUR MANGA SHELF!',
                  sub: 'SPEND $75+ FOR FREE SHIPPING + EARN GOLD HYPES!',
                  price: 'NEW!'
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
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                Top Headline (Leave blank for clean product shot)
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
                Bottom Subtext
              </label>
              <input
                type="text"
                value={subText}
                onChange={e => setSubText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#fe9a00] outline-none mt-1"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider text-zinc-200">
                <input
                  type="checkbox"
                  checked={showPriceBadge}
                  onChange={e => setShowPriceBadge(e.target.checked)}
                  className="accent-[#fe9a00] w-3.5 h-3.5"
                />
                <span>Show Sticker Badge</span>
              </label>

              {showPriceBadge && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={badgeValue}
                    onChange={e => setBadgeValue(e.target.value)}
                    placeholder="$14.99"
                    className="w-24 bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#fe9a00] text-center focus:border-[#fe9a00] outline-none"
                  />
                  <input
                    type="text"
                    value={badgeSubLabel}
                    onChange={e => setBadgeSubLabel(e.target.value)}
                    placeholder="Sublabel (opt)"
                    className="w-28 bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white text-center focus:border-[#fe9a00] outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT LIVE PREVIEW & EXPORT */}
        <div className="xl:col-span-7 space-y-4 sticky top-6">
          <div className="bg-black border-2 border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[420px]">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                Live High-Res Canvas Preview ({selectedPreset.width} × {selectedPreset.height} px)
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                {layoutMode === 'bundle_3'
                  ? 'Click up to 3 covers in order (#1 Center)'
                  : layoutMode === 'bundle_5'
                  ? 'Click up to 5 covers in order (#1 Center)'
                  : 'Click any cover thumbnail to preview'}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={selectedPreset.width}
              height={selectedPreset.height}
              className="w-full h-auto max-h-[560px] object-contain rounded-xl shadow-2xl border border-zinc-800"
            />
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
                : `Batch Export All (${uploadedArt.length}) Covers`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};