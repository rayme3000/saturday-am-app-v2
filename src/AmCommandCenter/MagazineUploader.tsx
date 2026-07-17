import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

export const MagazineUploader = ({ Dropzone, onDirty, onClean }: any) => {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [targetMagazine, setTargetMagazine] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  const [firstPageSide, setFirstPageSide] = useState<'left' | 'right'>('left');

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '', coverUrl: '', synopsis: '', 
    pages: [] as string[], previewPages: [] as string[],
    brand: 'AM', isPublished: false, isScheduled: false,
    publishDate: new Date().toISOString().split('T')[0], publishTime: '12:00'
  });

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
          publishDate: selected.publish_at ? new Date(selected.publish_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          publishTime: selected.publish_at ? new Date(selected.publish_at).toTimeString().substring(0, 5) : '12:00',
          pages: selected.pages || [], previewPages: selected.preview_pages || [], brand: selected.brand || 'AM', 
          isPublished: selected.is_published || false, isScheduled: !!selected.publish_at
        });
      }
    }
  }, [targetMagazine, magazines]);

  // DRAG AND DROP
  const handlePageClick = (index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) setSelectedPages(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b));
    else if (e.shiftKey && selectedPages.length > 0) {
      const start = Math.min(selectedPages[selectedPages.length - 1], index), end = Math.max(selectedPages[selectedPages.length - 1], index);
      setSelectedPages(Array.from(new Set([...selectedPages, ...Array.from({length: end-start+1}, (_, i)=>start+i)])).sort((a,b)=>a-b));
    } else setSelectedPages([index]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!selectedPages.includes(index)) setSelectedPages([index]);
    setDraggedItem(index); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", index.toString()); 
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault(); if (selectedPages.length === 0) return;
    const currentPages = [...formData.pages];
    const pagesToMove = selectedPages.map(i => currentPages[i]);
    const remainingPages = currentPages.filter((_, i) => !selectedPages.includes(i));
    let insertIndex = dropIndex - selectedPages.filter(i => i < dropIndex).length;
    remainingPages.splice(Math.max(0, insertIndex), 0, ...pagesToMove);
    setFormData({ ...formData, pages: remainingPages }); setSelectedPages([]); setDraggedItem(null); setDragOverItem(null);
    if (onDirty) onDirty();
  };

  const handleSaveMagazine = async (publishStatus: boolean) => {
    setIsSaving(true);
    try {
      if (!formData.title.trim()) throw new Error("Title required.");
      const publishTimestamp = (publishStatus || formData.isScheduled) ? new Date(`${formData.publishDate}T${formData.publishTime}`).toISOString() : new Date().toISOString();
      const payload = { title: formData.title, cover_url: formData.coverUrl, synopsis: formData.synopsis, pages: formData.pages, preview_pages: formData.previewPages, brand: formData.brand, is_published: publishStatus, publish_at: publishTimestamp };
      
      if (targetMagazine === 'new') await supabase.from('magazines').insert([payload]);
      else await supabase.from('magazines').update(payload).eq('id', targetMagazine);
      
      alert(`SUCCESS! Saved.`); setTargetMagazine('new'); if (onClean) onClean();
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4 shadow-md">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Editor Mode</label>
          <select value={targetMagazine} onChange={(e) => setTargetMagazine(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
            <option value="new">+ CREATE NEW ISSUE</option>
            {magazines.map(m => <option key={m.id} value={m.id}>{m.is_published ? '[LIVE] ' : '[DRAFT] '} {m.title}</option>)}
          </select>
        </div>
        {targetMagazine !== 'new' && (
          <button onClick={async () => { if(window.confirm('Delete?')) { await supabase.from('magazines').delete().eq('id', targetMagazine); setTargetMagazine('new'); } }} className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded font-bold uppercase text-[10px] hover:bg-red-500 hover:text-white">Delete</button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800 pb-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Issue Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Magazine Brand</label>
            <select value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
              <option value="AM">Saturday AM</option><option value="PM">Saturday PM</option>
            </select>
          </div>
        </div>

        <div className="border-b border-zinc-800 pb-6">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Synopsis</label>
          <textarea rows={3} value={formData.synopsis} onChange={(e) => setFormData({...formData, synopsis: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm" />
        </div>

        {/* First Page Placement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-zinc-800">
          <div className="bg-black border border-zinc-800 rounded-xl p-4 flex flex-col justify-center">
            <h4 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-[#fe9a00]" /> First Page Placement</h4>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button onClick={() => setFirstPageSide('left')} className={`flex-1 px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${firstPageSide === 'left' ? 'bg-[#fe9a00] text-black' : 'text-zinc-600'}`}>Left</button>
              <button onClick={() => setFirstPageSide('right')} className={`flex-1 px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${firstPageSide === 'right' ? 'bg-[#fe9a00] text-black' : 'text-zinc-600'}`}>Right</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">High-Res Cover</h3>
            {formData.coverUrl && <img src={formData.coverUrl} className="w-full aspect-[1424/2000] object-cover rounded-lg mb-4" alt="Cover" />}
            <Dropzone label="+ Upload Cover" folderPath="magazine-covers" onUploadComplete={(url: any) => setFormData({...formData, coverUrl: url})} />
          </div>

          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">"In This Issue" Previews</h3>
              {formData.previewPages.length > 0 && (
                <div className="bg-black border border-zinc-800 p-2 rounded mb-4">
                  <div className="grid grid-cols-4 gap-2">
                    {formData.previewPages.map((url, i) => (<img key={i} src={url} className="w-full aspect-[2/3] object-cover rounded" alt="Prev" />))}
                  </div>
                </div>
              )}
              <Dropzone label="+ Batch Upload Previews (Max 4)" multiple={true} folderPath="magazine-pages" onUploadComplete={(urls: any) => setFormData({...formData, previewPages: [...formData.previewPages, ...urls].slice(0, 4)})} />
            </div>

            <div>
              <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Full Issue Pages</h3>
              {formData.pages.length > 0 && (
                <div className="bg-black border border-zinc-800 p-3 rounded mb-4 max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
                    {formData.pages.map((url, i) => (
                      <div key={i} draggable onMouseDown={(e) => handlePageClick(i, e)} onDragStart={(e) => handleDragStart(e, i)} onDragEnter={() => setDragOverItem(i)} onDragEnd={() => { setDraggedItem(null); setDragOverItem(null); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, i)} className={`relative aspect-[2/3] rounded border-2 select-none ${selectedPages.includes(i) ? 'border-[#fe9a00] z-10' : dragOverItem === i ? 'border-white border-dashed' : 'border-zinc-800'}`}>
                        <div className="absolute top-1 left-1 bg-black/80 px-1 py-0.5 rounded text-white text-[8px]">{i+1}</div>
                        <img src={url} alt={`Pg ${i+1}`} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Dropzone label="+ Batch Upload Issue" multiple={true} folderPath="magazine-pages" onUploadComplete={(urls: any) => setFormData({...formData, pages: [...formData.pages, ...urls]})} />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-black border border-zinc-800 p-5 rounded-xl shadow-inner mt-8">
           <div className="flex items-center justify-between">
             <h4 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4 text-[#fe9a00]" /> Schedule</h4>
             <input type="checkbox" checked={formData.isScheduled} onChange={(e) => setFormData({...formData, isScheduled: e.target.checked})} className="accent-[#fe9a00]" />
           </div>
           {formData.isScheduled && (
             <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-zinc-800">
               <input type="date" value={formData.publishDate} onChange={(e) => setFormData({...formData, publishDate: e.target.value})} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
               <input type="time" value={formData.publishTime} onChange={(e) => setFormData({...formData, publishTime: e.target.value})} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
             </div>
           )}
        </div>

        <div className="flex gap-4 pt-6 border-t border-zinc-800">
          <button onClick={() => handleSaveMagazine(false)} disabled={isSaving} className="w-1/2 bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded">{formData.isPublished ? 'Revert to Draft' : 'Save Draft'}</button>
          <button onClick={() => handleSaveMagazine(true)} disabled={isSaving} className="w-1/2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded">{formData.isScheduled ? 'Schedule' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
};