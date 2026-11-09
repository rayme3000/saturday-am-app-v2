import { useState } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export const StickerMaker = ({ Dropzone, ThumbnailCropperModal }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [selectedSeries, setSelectedSeries] = useState('');
  const [stickerUrl, setStickerUrl] = useState('');

  const [stickerBgColor, setStickerBgColor] = useState('transparent');
  const [stickerScale, setStickerScale] = useState(100);
  const [stickerPosition, setStickerPosition] = useState('50% 50%');

  const [isSaving, setIsSaving] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState(false);

  const loadSeriesIntoEditor = (slug: string) => {
    setSelectedSeries(slug);
    const active = seriesList.find((s: any) => s.slug === slug);
    if (active) {
      setStickerUrl(active.sticker_url || '');
      setStickerBgColor(active.sticker_bg_color || 'transparent');
      setStickerScale(active.sticker_scale || 100);
      setStickerPosition(active.sticker_position || '50% 50%');
    } else {
      setStickerUrl('');
      setStickerBgColor('transparent');
      setStickerScale(100);
      setStickerPosition('50% 50%');
    }
    setIsCleared(false);
  };

  const handleSeriesChange = (e: any) => {
    loadSeriesIntoEditor(e.target.value);
  };

  const activeSeries = seriesList.find((s: any) => s.slug === selectedSeries);
  const currentDisplayUrl = stickerUrl || (!isCleared && activeSeries?.sticker_url);

  const posParts = stickerPosition.split(' ');
  const xVal = parseInt(posParts[0]) || 50;
  const yVal = parseInt(posParts[1]) || 50;

  const handleSaveSticker = async () => {
    if (!selectedSeries) return alert('Please select a series.');

    const isRemoving = !currentDisplayUrl && isCleared;

    if (isRemoving) {
      if (!window.confirm('Are you sure you want to remove this sticker from the Vault?'))
        return;
    }

    setIsSaving(true);
    try {
      const payload = {
        sticker_url: currentDisplayUrl || null,
        sticker_bg_color: currentDisplayUrl ? stickerBgColor : 'transparent',
        sticker_scale: currentDisplayUrl ? stickerScale : 100,
        sticker_position: currentDisplayUrl ? stickerPosition : '50% 50%'
      };

      const { error } = await supabase
        .from('series')
        .update(payload)
        .eq('slug', selectedSeries);

      if (error) throw error;

      alert(
        currentDisplayUrl
          ? 'Sticker saved to Vault!'
          : 'Sticker removed from Vault.'
      );

      if (isRemoving) {
        setStickerUrl('');
        setIsCleared(false);
        setSelectedSeries('');
      } else {
        setIsCleared(false);
      }
      window.dispatchEvent(new Event('vaultUpdated'));
    } catch (e: any) {
      alert('Error saving sticker: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const seriesWithStickers = seriesList.filter((s: any) => Boolean(s.sticker_url));

  return (
    <div className="space-y-6 animate-fade-in-up mt-6">
      {cropSourceImage && (
        <ThumbnailCropperModal
          imageUrl={cropSourceImage}
          uploadFolder="series-stickers"
          onCropComplete={(newUrl: any) => {
            setStickerUrl(newUrl);
            setCropSourceImage(null);
            setIsCleared(false);
          }}
          onCancel={() => setCropSourceImage(null)}
        />
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md relative">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
              Club Sticker Vault
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
              Create & fine-tune Top 5 Series Stickers for the Hype Card back
            </p>
          </div>
          {currentDisplayUrl && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Remove this Sticker?')) {
                  setStickerUrl('');
                  setIsCleared(true);
                }
              }}
              className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Remove Sticker
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center">
            {currentDisplayUrl ? (
              <>
                <div
                  className="relative w-full aspect-square max-w-[200px] mx-auto group/sticker mb-4 rounded-full overflow-hidden border-4 border-zinc-700 transition-colors"
                  style={{ backgroundColor: stickerBgColor }}
                >
                  <img
                    src={currentDisplayUrl}
                    className="w-full h-full object-cover transition-all"
                    style={{
                      objectPosition: stickerPosition,
                      transform: `scale(${stickerScale / 100})`
                    }}
                    alt="Sticker Preview"
                  />
                  <div
                    className="absolute inset-0 bg-black/80 z-40 opacity-0 group-hover/sticker:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm cursor-pointer"
                    onClick={() => {
                      if (window.confirm('Remove this Sticker?')) {
                        setStickerUrl('');
                        setIsCleared(true);
                      }
                    }}
                  >
                    <div className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-[200px]">
                  <Dropzone
                    label="Replace Sticker Image"
                    height="p-3 rounded-full"
                    folderPath="temp"
                    onUploadComplete={(url: any) => {
                      setStickerUrl(url);
                      setIsCleared(false);
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="w-full aspect-square max-w-[200px] mx-auto rounded-full overflow-hidden border-2 border-dashed border-zinc-700">
                <Dropzone
                  label="+ Upload Image"
                  height="h-full min-h-[200px]"
                  folderPath="temp"
                  onUploadComplete={(url: any) => {
                    setStickerUrl(url);
                    setIsCleared(false);
                  }}
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col justify-center">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Target Series
            </label>
            <select
              value={selectedSeries}
              onChange={handleSeriesChange}
              className="w-full bg-black border border-zinc-700 rounded-xl p-3.5 text-white font-bold mb-6 focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="">-- Choose Series --</option>
              {seriesList.map((s: any) => (
                <option key={s.id} value={s.slug}>
                  {s.title} {s.sticker_url ? '(In Vault)' : ''}
                </option>
              ))}
            </select>

            {currentDisplayUrl && (
              <div className="bg-black border border-zinc-800 p-4 rounded-xl mb-6 space-y-4">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  Fine-Tune Sticker
                </h4>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-400 w-16">Background</span>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded p-1 flex-1">
                    <input
                      type="color"
                      value={stickerBgColor === 'transparent' ? '#000000' : stickerBgColor}
                      onChange={e => setStickerBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-xs text-white font-mono uppercase">
                      {stickerBgColor}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStickerBgColor('transparent')}
                      className="ml-auto text-[9px] px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-400 w-16">Zoom</span>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={stickerScale}
                    onChange={e => setStickerScale(Number(e.target.value))}
                    className="flex-1 accent-[#fe9a00]"
                  />
                  <span className="text-[10px] font-black text-white w-8">{stickerScale}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-400 w-16">X-Axis</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={xVal}
                    onChange={e => setStickerPosition(`${e.target.value}% ${yVal}%`)}
                    className="flex-1 accent-[#fe9a00]"
                  />
                  <span className="text-[10px] font-black text-white w-8">{xVal}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-400 w-16">Y-Axis</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={yVal}
                    onChange={e => setStickerPosition(`${xVal}% ${e.target.value}%`)}
                    className="flex-1 accent-[#fe9a00]"
                  />
                  <span className="text-[10px] font-black text-white w-8">{yVal}%</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveSticker}
              disabled={isSaving || !selectedSeries || (!currentDisplayUrl && !isCleared)}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                isSaving || !selectedSeries || (!currentDisplayUrl && !isCleared)
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : !currentDisplayUrl && isCleared
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-500 hover:text-white border border-red-900'
                  : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'
              }`}
            >
              {isSaving
                ? 'SAVING...'
                : !currentDisplayUrl && isCleared
                ? 'REMOVE STICKER FROM VAULT'
                : 'SAVE STICKER TO VAULT'}
            </button>
          </div>
        </div>
      </div>

      {/* STICKER VAULT GALLERY */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">
          Club Sticker Vault ({seriesWithStickers.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {seriesWithStickers.map((s: any) => (
            <div
              key={s.id || s.slug}
              onClick={() => {
                loadSeriesIntoEditor(s.slug);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`bg-black border border-zinc-800 hover:border-[#fe9a00] rounded-xl p-3.5 flex flex-col items-center text-center relative group cursor-pointer transition-all ${
                selectedSeries === s.slug ? 'ring-2 ring-[#fe9a00]' : ''
              }`}
            >
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/80 text-zinc-300 group-hover:text-[#fe9a00] text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 z-10 border border-zinc-700 flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" /> Edit
              </span>
              <div
                className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-[#fe9a00] mb-2.5"
                style={{ backgroundColor: s.sticker_bg_color || 'transparent' }}
              >
                <img
                  src={s.sticker_url}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: s.sticker_position || '50% 50%',
                    transform: `scale(${(s.sticker_scale || 100) / 100})`
                  }}
                />
              </div>
              <h4 className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                {s.title}
              </h4>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};