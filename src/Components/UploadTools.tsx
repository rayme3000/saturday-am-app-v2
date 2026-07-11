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
          // Take a static snapshot of dropped files
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
            // Take a static snapshot of clicked files before clearing the input
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

export const ThumbnailCropperModal = ({ imageUrl, onCropComplete, onCancel }: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedFile: any = await getCroppedImg(imageUrl, croppedAreaPixels);
      const publicUrl = await uploadToSupabase(croppedFile, 'chapter-thumbnails');
      if (publicUrl) onCropComplete(publicUrl);
    } catch(e) {
      alert("Cropping failed. Please try again.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg mb-4 flex justify-between items-center">
         <h3 className="text-white font-black text-lg tracking-widest uppercase">Crop Thumbnail</h3>
         <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
      </div>
      
      <div className="relative w-full max-w-lg aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden">
         <Cropper
           image={imageUrl}
           crop={crop}
           zoom={zoom}
           aspect={1}
           onCropChange={setCrop}
           onCropComplete={(area, areaPixels) => setCroppedAreaPixels(areaPixels)}
           onZoomChange={setZoom}
         />
      </div>

      <div className="w-full max-w-lg mt-6 space-y-6">
         <input 
           type="range" 
           min={1} max={3} step={0.1} 
           value={zoom} 
           onChange={(e) => setZoom(Number(e.target.value))} 
           className="w-full accent-[#fe9a00]" 
         />
         <button onClick={handleSave} disabled={isProcessing} className="w-full py-4 bg-[#fe9a00] text-black font-black tracking-widest rounded hover:bg-white transition-colors">
           {isProcessing ? 'PROCESSING & UPLOADING...' : 'SAVE CROPPED THUMBNAIL'}
         </button>
      </div>
    </div>
  );
};