import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export const StickerMaker = ({ Dropzone, ThumbnailCropperModal }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [selectedSeries, setSelectedSeries] = useState('');
  const [stickerUrl, setStickerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState(false);

  const activeSeries = seriesList.find((s: any) => s.slug === selectedSeries);
  const currentDisplayUrl = stickerUrl || (!isCleared && activeSeries?.sticker_url);

  const handleSaveSticker = async () => {
    if (!selectedSeries) return alert("Please select a series.");
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('series')
        .update({ sticker_url: stickerUrl || null })
        .eq('slug', selectedSeries);
        
      if (error) throw error;
      
      alert(stickerUrl ? "Sticker Saved! It will now appear on user club cards." : "Sticker Successfully Removed.");
      
      setStickerUrl('');
      setIsCleared(false);
      setSelectedSeries('');
    } catch (e: any) {
      alert("Error saving sticker: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md mt-6 relative">
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

      <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">
        Series Sticker Maker
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {currentDisplayUrl ? (
            <div className="relative w-full aspect-square max-w-[200px] mx-auto group/sticker">
              <img 
                src={currentDisplayUrl} 
                className="w-full h-full object-cover rounded-full border-4 border-zinc-700 bg-black" 
                alt="Sticker Preview" 
              />
              <button 
                onClick={() => {
                  setStickerUrl('');
                  setIsCleared(true); 
                }} 
                className="absolute top-0 right-0 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full aspect-square max-w-[200px] mx-auto rounded-full overflow-hidden">
              <Dropzone 
                label="+ Upload & Crop" 
                height="h-full min-h-[200px]" 
                folderPath="temp" 
                onUploadComplete={(url: any) => setCropSourceImage(url)} 
              />
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col justify-center">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Target Series</label>
          <select 
            value={selectedSeries} 
            onChange={(e) => {
              setSelectedSeries(e.target.value);
              setStickerUrl(''); 
              setIsCleared(false); 
            }} 
            className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold mb-6 focus:border-[#fe9a00]"
          >
            <option value="">-- Choose Series --</option>
            {seriesList.map((s: any) => (
              <option key={s.id} value={s.slug}>{s.title} {s.sticker_url ? '(Has Sticker)' : ''}</option>
            ))}
          </select>

          <button 
            onClick={handleSaveSticker} 
            disabled={isSaving || !selectedSeries || (!stickerUrl && !isCleared)} 
            className={`w-full py-4 font-black uppercase tracking-widest rounded transition-all ${
              (isSaving || !selectedSeries || (!stickerUrl && !isCleared)) 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : (!stickerUrl && isCleared) 
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-500 hover:text-white border border-red-900' 
                  : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'
            }`}
          >
            {isSaving ? 'SAVING...' : (!stickerUrl && isCleared) ? 'REMOVE STICKER' : 'SAVE & DEPLOY STICKER'}
          </button>
        </div>
      </div>
    </div>
  );
};