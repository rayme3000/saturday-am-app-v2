import React, { useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

const compressImage = async (file: any, maxDimension = 1200) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > height && width > maxDimension) { height *= maxDimension / width; width = maxDimension; } 
        else if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob: any) => { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp', lastModified: Date.now() })); }, 'image/webp', 0.85);
      };
    };
  });
};

const uploadToSupabase = async (file: any, folderPath: any) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  try {
    const { error } = await supabase.storage.from('saturday-am-vault').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('saturday-am-vault').getPublicUrl(filePath);
    return publicUrl;
  } catch (error: any) { alert('Error uploading file: ' + error.message); return null; }
};

export const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", maxDim = 1200, onUploadComplete }: any) => {
  const fileInputRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files: any) => {
    setIsUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const optimizedFile = await compressImage(files[i], maxDim);
      const url = await uploadToSupabase(optimizedFile, folderPath);
      if (url) urls.push(url);
    }
    setIsUploading(false);
    if (onUploadComplete && urls.length > 0) { multiple ? onUploadComplete(urls) : onUploadComplete(urls[0]); }
  };

  return (
    <div 
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { 
        e.preventDefault(); 
        setIsDragging(false); 
        if (e.dataTransfer.files.length) {
          const filesArray = Array.from(e.dataTransfer.files);
          processFiles(filesArray); 
        } 
      }}
      className={`w-full bg-black border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${height} ${isDragging ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-700 hover:border-[#fe9a00]'} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        multiple={multiple} 
        onChange={(e: any) => { 
          if (e.target.files.length) {
            const filesArray = Array.from(e.target.files);
            processFiles(filesArray);
            e.target.value = null; 
          }
        }} 
      />
      {isUploading ? (
        <span className="font-bold text-[#fe9a00] text-xs animate-pulse">OPTIMIZING & UPLOADING...</span>
      ) : (
        <>
          <span className="font-bold text-zinc-400 text-xs transition-colors hover:text-[#fe9a00]">{label}</span>
          {subtext && <span className="text-zinc-600 text-[10px] mt-1 text-center group-hover:text-[#fe9a00]/70">{subtext}</span>}
        </>
      )}
    </div>
  );
};

// --- CROPPER ENGINE ---
const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
  const image = new Image();
  image.crossOrigin = "anonymous"; 
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });

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

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], "thumb.webp", { type: "image/webp" }));
    }, 'image/webp', 0.85);
  });
};

export const ThumbnailCropperModal = ({ 
  imageUrl, 
  uploadFolder = 'misc', 
  aspect = 1,
  title = "Crop Thumbnail",
  onCropComplete, 
  onCropAreaComplete,
  onCancel 
}: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<any>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    // If the caller wants the mathematical crop area without re-uploading
    if (onCropAreaComplete && croppedArea) {
      onCropAreaComplete(croppedArea, croppedAreaPixels, zoom);
      return;
    }

    if (!onCropComplete) return;

    setIsProcessing(true);
    try {
      const croppedFile: any = await getCroppedImg(imageUrl, croppedAreaPixels);
      const publicUrl = await uploadToSupabase(croppedFile, uploadFolder);
      if (publicUrl) onCropComplete(publicUrl);
    } catch (e) {
      alert("Cropping failed. Please try again.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl mb-4 flex justify-between items-center">
         <h3 className="text-white font-black text-base sm:text-lg tracking-widest uppercase">{title}</h3>
         <button onClick={onCancel} className="text-zinc-500 hover:text-white p-2 cursor-pointer"><X className="w-6 h-6" /></button>
      </div>
      
      <div className="relative w-full max-w-2xl h-[50vh] sm:h-[60vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
         <Cropper
           image={imageUrl}
           crop={crop}
           zoom={zoom}
           aspect={aspect}
           onCropChange={setCrop}
           onCropComplete={(area, areaPixels) => {
             setCroppedArea(area);
             setCroppedAreaPixels(areaPixels);
           }}
           onZoomChange={setZoom}
         />
      </div>

      <div className="w-full max-w-2xl mt-6 space-y-4">
         <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-12">Zoom</span>
           <input 
             type="range" 
             min={1} max={3} step={0.05} 
             value={zoom} 
             onChange={(e) => setZoom(Number(e.target.value))} 
             className="w-full accent-[#fe9a00] cursor-pointer" 
           />
           <span className="text-[10px] font-black text-[#fe9a00] w-12 text-right">{Math.round(zoom * 100)}%</span>
         </div>

         <div className="flex gap-3">
           <button onClick={onCancel} className="w-1/3 py-4 bg-zinc-800 text-white font-black tracking-widest uppercase text-xs rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer">
             Cancel
           </button>
           <button onClick={handleSave} disabled={isProcessing} className="flex-1 py-4 bg-[#fe9a00] text-black font-black tracking-widest uppercase text-xs rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50 cursor-pointer">
             {isProcessing ? 'PROCESSING & UPLOADING...' : (onCropAreaComplete ? 'SAVE POSITION & FRAMING' : 'SAVE CROPPED IMAGE')}
           </button>
         </div>
      </div>
    </div>
  );
};