import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Image as ImageIcon, Scissors, X, Save, RefreshCw, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = imageSrc;
  await new Promise(resolve => {
    image.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx?.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise(resolve => {
    canvas.toBlob(
      (blob: Blob | null) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      'image/webp',
      0.85
    );
  });
};

export const CardSkinMaker = () => {
  const [skins, setSkins] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [showIcon, setShowIcon] = useState(true);
  const [iconPosition, setIconPosition] = useState('top-right');

  useEffect(() => {
    fetchSkins();
  }, []);

  const fetchSkins = async () => {
    if (typeof supabase === 'undefined') return;
    const { data } = await supabase
      .from('card_skins')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSkins(data);
  };

  const handleFileSelect = (e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (imageToCrop && imageToCrop.startsWith('blob:')) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(URL.createObjectURL(file));
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixelsVal: any) => {
    setCroppedAreaPixels(croppedAreaPixelsVal);
  }, []);

  const handleApplyCrop = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(
        imageToCrop as string,
        croppedAreaPixels
      );
      if (!croppedImageBlob) throw new Error('Could not generate cropped WebP blob.');

      const croppedFile = new File([croppedImageBlob], 'cropped_skin.webp', {
        type: 'image/webp'
      });

      if (imageToCrop && imageToCrop.startsWith('blob:')) {
        URL.revokeObjectURL(imageToCrop);
      }
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedFile));
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image.');
    }
  };

  const clearSelection = () => {
    if (imageToCrop && imageToCrop.startsWith('blob:')) {
      URL.revokeObjectURL(imageToCrop);
    }
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToCrop(null);
    setZoom(1);
    const fileInput = document.getElementById('skin-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setShowIcon(true);
    setIconPosition('top-right');
    clearSelection();
  };

  const loadSkinForEdit = (skin: any) => {
    setEditingId(skin.id);
    setName(skin.name);
    setPreviewUrl(skin.image_url);
    setShowIcon(skin.show_icon !== false);
    setIconPosition(skin.icon_position || 'top-right');
    setImageToCrop(null);
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveToVault = async () => {
    if (!name.trim()) return;
    if (!selectedFile && !previewUrl) return;

    setUploading(true);

    try {
      let finalImageUrl = previewUrl;

      if (selectedFile) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `skins/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('card-skins')
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: 'image/webp',
            cacheControl: '31536000'
          });
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl }
        } = supabase.storage.from('card-skins').getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const payload = {
        name: name.trim(),
        image_url: finalImageUrl,
        is_active: true,
        is_store_item: false,
        show_icon: showIcon,
        icon_position: iconPosition
      };

      if (editingId) {
        const { error: dbError } = await supabase
          .from('card_skins')
          .update(payload)
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('card_skins').insert([payload]);
        if (dbError) throw dbError;
      }

      cancelEdit();
      fetchSkins();
      window.dispatchEvent(new Event('vaultUpdated'));
    } catch (error: any) {
      console.error('Error saving skin:', error);
      alert('Save failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteSkin = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this skin from the Vault?'))
      return;
    setSkins(prevSkins => prevSkins.filter(skin => skin.id !== id));

    const { error } = await supabase.from('card_skins').delete().eq('id', id);
    if (error) {
      console.error('Error deleting skin:', error);
      alert('Failed to delete skin: ' + error.message);
      fetchSkins();
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-white w-full max-w-5xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-widest text-[#fe9a00]">
            Card Skin Vault
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
            Upload & crop WebP Hype Card skins to your Vault • List them for sale or bundles in the In-App Store Manager
          </p>
        </div>
        {editingId && (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Edit className="w-3 h-3" /> Editing Skin
          </span>
        )}
      </div>

      <div className="bg-black p-6 rounded-xl border border-zinc-800 mb-10 flex flex-col md:flex-row gap-8 shadow-inner">
        <div className="w-full md:w-1/2 max-w-sm flex flex-col mx-auto md:mx-0">
          <div className="w-full aspect-[1.58] border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden bg-zinc-900 relative shadow-2xl">
            {imageToCrop ? (
              <div className="absolute inset-0">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1.58}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                className="w-full h-full object-cover opacity-80"
                alt="Preview"
              />
            ) : (
              <div className="text-center text-zinc-500 flex flex-col items-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Card Aspect Ratio
                  <br />
                  (Landscape)
                </span>
              </div>
            )}

            {previewUrl && !imageToCrop && showIcon && (
              <img
                src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png"
                alt="Saturday AM Logo"
                className={`absolute w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none z-10 ${
                  iconPosition === 'top-left'
                    ? 'top-3 left-3'
                    : iconPosition === 'top-right'
                    ? 'top-3 right-3'
                    : iconPosition === 'bottom-left'
                    ? 'bottom-3 left-3'
                    : 'bottom-3 right-3'
                }`}
              />
            )}
          </div>

          {imageToCrop && (
            <div className="flex flex-col gap-2 mt-4 px-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  Fine Tune Zoom
                </label>
                <span className="text-[10px] text-[#fe9a00] font-black">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full accent-[#fe9a00] h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-center text-[9px] text-zinc-500 mt-1 uppercase tracking-widest">
                Drag image to reposition
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {imageToCrop ? (
              <button
                onClick={handleApplyCrop}
                className="flex-1 bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-white transition-colors cursor-pointer"
              >
                <Scissors className="w-3 h-3" /> Apply Crop
              </button>
            ) : previewUrl ? (
              <button
                onClick={clearSelection}
                className="flex-1 bg-red-900/40 text-red-400 border border-red-900/50 font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" /> Remove & Replace Image
              </button>
            ) : (
              <>
                <input
                  type="file"
                  id="skin-upload"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="skin-upload"
                  className="flex-1 bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-[10px] py-2 rounded flex items-center justify-center gap-2 hover:bg-zinc-700 cursor-pointer transition-colors border border-zinc-700"
                >
                  <ImageIcon className="w-3 h-3" /> Choose Image
                </label>
              </>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Skin Name (e.g. "MMWOG Diwali Gold")
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg mb-4 focus:outline-none focus:border-[#fe9a00] transition-colors"
            placeholder="Enter skin name..."
          />

          <div className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Footprint Overlay
              </label>
              <button
                type="button"
                onClick={() => setShowIcon(!showIcon)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                  showIcon
                    ? 'bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/30'
                    : 'bg-black text-zinc-500 border border-zinc-700'
                }`}
              >
                {showIcon ? (
                  <>
                    <Eye className="w-3 h-3" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" /> Hidden
                  </>
                )}
              </button>
            </div>

            {showIcon && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setIconPosition(pos)}
                    className={`py-2 px-2 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                      iconPosition === pos
                        ? 'bg-[#fe9a00] text-black'
                        : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {pos.replace('-', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <button
              onClick={handleSaveToVault}
              disabled={
                (!selectedFile && !previewUrl) || !name.trim() || uploading || !!imageToCrop
              }
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(254,154,0,0.2)] cursor-pointer"
            >
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? 'Update Skin in Vault' : 'Add to Vault'}
            </button>

            {editingId && (
              <button
                onClick={cancelEdit}
                disabled={uploading}
                className="w-full bg-transparent border border-zinc-700 text-zinc-400 font-black uppercase tracking-widest py-3 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-6 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">
            Card Skin Vault ({skins.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skins.map(skin => (
            <div
              key={skin.id}
              className="relative rounded-xl overflow-hidden aspect-[1.58] border-2 border-zinc-800 hover:border-[#fe9a00] group shadow-lg transition-all"
            >
              <img src={skin.image_url} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={skin.name} />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12 flex justify-between items-end pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-white truncate pr-2 drop-shadow-md">
                  {skin.name}
                </span>
              </div>

              <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <button
                  onClick={() => loadSkinForEdit(skin)}
                  className="p-3 bg-blue-900/50 text-blue-400 rounded-full hover:bg-blue-500 hover:text-white transition-colors shadow-xl cursor-pointer"
                  title="Edit Skin"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deleteSkin(skin.id)}
                  className="p-3 bg-red-900/50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-xl cursor-pointer"
                  title="Delete Skin"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {skins.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-600 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-xl">
              No skins in Vault yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};