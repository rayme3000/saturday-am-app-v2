import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Calendar, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabase';

const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", maxDim = 1200, onUploadComplete }: any) => {
  const fileInputRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files: any) => {
    setIsUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      // Assuming you have your compressImage function accessible or imported
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

const uploadToSupabase = async (file: any, folderPath: any) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  const { error } = await supabase.storage.from('saturday-am-vault').upload(filePath, file, { upsert: true });
  if (error) { alert('Error uploading: ' + error.message); return null; }
  const { data } = supabase.storage.from('saturday-am-vault').getPublicUrl(filePath);
  return data.publicUrl;
};

export const MagazineUploader = ({ onDirty, onClean }: any) => {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [targetMagazine, setTargetMagazine] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', coverUrl: '', synopsis: '', pages: [] as string[], previewPages: [] as string[], brand: 'AM', isPublished: false, isScheduled: false, publishDate: new Date().toISOString().split('T')[0], publishTime: '12:00' });

  useEffect(() => {
    const fetchMagazines = async () => {
      const { data } = await supabase.from('magazines').select('*').order('publish_date', { ascending: false });
      if (data) setMagazines(data);
    };
    fetchMagazines();
  }, [isSaving]);

  useEffect(() => {
    if (targetMagazine === 'new') {
      setFormData({ title: '', coverUrl: '', synopsis: '', publishDate: new Date().toISOString().split('T')[0], pages: [], previewPages: [], brand: 'AM', isPublished: false, isScheduled: false, publishTime: '12:00' });
    } else {
      const selected = magazines.find(m => m.id.toString() === targetMagazine);
      if (selected) {
        setFormData({
          title: selected.title || '', coverUrl: selected.cover_url || '', synopsis: selected.synopsis || '',
          publishDate: selected.publish_date ? new Date(selected.publish_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          publishTime: selected.publish_date ? new Date(selected.publish_date).toTimeString().substring(0, 5) : '12:00',
          pages: selected.pages || [], previewPages: selected.preview_pages || [], brand: selected.brand || 'AM', isPublished: selected.is_published || false, isScheduled: !!selected.publish_at
        });
      }
    }
  }, [targetMagazine, magazines]);

  const handleSaveMagazine = async (publishStatus: boolean) => {
    setIsSaving(true);
    try {
      if (!formData.title) throw new Error("Title required.");
      const publishTimestamp = formData.isScheduled ? new Date(`${formData.publishDate}T${formData.publishTime}`).toISOString() : new Date().toISOString();
      const payload = { title: formData.title, cover_url: formData.coverUrl, synopsis: formData.synopsis, pages: formData.pages, preview_pages: formData.previewPages, brand: formData.brand, is_published: publishStatus, publish_at: publishTimestamp };
      
      if (targetMagazine === 'new') await supabase.from('magazines').insert([payload]);
      else await supabase.from('magazines').update(payload).eq('id', targetMagazine);
      
      alert("Saved!"); setTargetMagazine('new'); if (onClean) onClean();
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Target Selector */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4 shadow-md">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Editor Mode</label>
          <select value={targetMagazine} onChange={(e) => setTargetMagazine(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
            <option value="new">+ CREATE NEW ISSUE</option>
            {magazines.map(m => <option key={m.id} value={m.id}>{m.is_published ? '[LIVE] ' : '[DRAFT] '} {m.title}</option>)}
          </select>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Issue Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Publish Date</label>
            <input type="date" value={formData.publishDate} onChange={(e) => setFormData({...formData, publishDate: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold" />
          </div>
        </div>

        <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Synopsis</label>
        <textarea rows={4} value={formData.synopsis} onChange={(e) => setFormData({...formData, synopsis: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Dropzone label={formData.coverUrl ? "Cover Uploaded" : "+ Upload Cover"} folderPath="magazine-covers" onUploadComplete={(url: any) => setFormData({...formData, coverUrl: url})} />
          <Dropzone label="+ Add Pages" multiple={true} folderPath="magazine-pages" onUploadComplete={(urls: any) => setFormData({...formData, pages: [...formData.pages, ...urls]})} />
        </div>

        <button onClick={() => handleSaveMagazine(true)} className="w-full bg-[#fe9a00] text-black font-black uppercase py-4 rounded hover:bg-white transition-colors">
          {isSaving ? 'PROCESSING...' : 'PUBLISH'}
        </button>
      </div>
    </div>
  );
};