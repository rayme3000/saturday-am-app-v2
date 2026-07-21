import React, { useState, useRef } from 'react';
import { supabase } from '../supabase';

export const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", maxDim = 1200, onUploadComplete }: any) => {
  const fileInputRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadToSupabase = async (file: any, folderPath: any) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;
    const { error } = await supabase.storage.from('saturday-am-vault').upload(filePath, file, { upsert: true });
    if (error) { alert('Error uploading: ' + error.message); return null; }
    const { data } = supabase.storage.from('saturday-am-vault').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const processFiles = async (files: any) => {
    setIsUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToSupabase(files[i], folderPath);
      if (url) urls.push(url);
    }
    setIsUploading(false);
    if (onUploadComplete && urls.length > 0) { multiple ? onUploadComplete(urls) : onUploadComplete(urls[0]); }
  };

  return (
    <div onClick={() => !isUploading && fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files)); }} className={`w-full bg-black border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${height} ${isDragging ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-700 hover:border-[#fe9a00]'} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input type="file" className="hidden" ref={fileInputRef} multiple={multiple} onChange={(e: any) => { if (e.target.files.length) processFiles(Array.from(e.target.files)); }} />
      {isUploading ? <span className="font-bold text-[#fe9a00] text-xs animate-pulse">UPLOADING...</span> : <><span className="font-bold text-zinc-400 text-xs">{label}</span>{subtext && <span className="text-zinc-600 text-[10px] mt-1">{subtext}</span>}</>}
    </div>
  );
};