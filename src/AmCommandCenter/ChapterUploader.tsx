import React, { useState, useEffect } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Crop, Calendar, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { MangaReader } from '../MainViews/MangaReader';

export const ChapterUploader = ({ Dropzone, ThumbnailCropperModal, onDirty, onClean }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [targetSeries, setTargetSeries] = useState('');
  const [targetChapter, setTargetChapter] = useState('new');
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  
  // NEW STATE: For the Page Selection Modal
  const [showPageSelector, setShowPageSelector] = useState(false);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    chapterNumber: '',
    title: '',
    thumbnailUrl: '',
    thumbnailScale: 100,
    thumbnailPosition: '50% 50%',
    pages: [] as string[],
    isPublished: false,
    isScheduled: false,
    publishDate: new Date().toISOString().split('T')[0],
    publishTime: '12:00'
  });

  useEffect(() => {
    const fetchChapters = async () => {
      if (!targetSeries) { setExistingChapters([]); return; }
      const { data } = await supabase.from('chapters').select('*').eq('series_slug', targetSeries).order('chapter_number', { ascending: false });
      if (data) setExistingChapters(data);
    };
    fetchChapters();
  }, [targetSeries, refreshKey]);

  useEffect(() => {
    if (targetChapter === 'new') {
      const nextNum = existingChapters.length > 0 ? Math.floor(Number(existingChapters[0].chapter_number) + 1) : 1;
      setFormData({ 
        chapterNumber: nextNum.toString(), 
        title: '', 
        thumbnailUrl: '', 
        thumbnailScale: 100,
        thumbnailPosition: '50% 50%',
        pages: [], 
        isPublished: false, 
        isScheduled: false, 
        publishDate: new Date().toISOString().split('T')[0], 
        publishTime: '12:00' 
      });
    } else {
      const selected = existingChapters.find(c => c.id === targetChapter);
      if (selected) {
        const fetchPages = async () => {
          const { data } = await supabase.from('pages').select('image_url').eq('chapter_id', targetChapter).order('page_order', { ascending: true });
          setFormData({
            chapterNumber: selected.chapter_number.toString(),
            title: selected.title || '',
            thumbnailUrl: selected.thumbnail_url || '',
            thumbnailScale: selected.thumbnail_scale || 100,
            thumbnailPosition: selected.thumbnail_position || '50% 50%',
            pages: data ? data.map(p => p.image_url) : [],
            isPublished: selected.is_published || false,
            isScheduled: !!selected.publish_at,
            publishDate: selected.publish_at ? new Date(selected.publish_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            publishTime: selected.publish_at ? new Date(selected.publish_at).toTimeString().substring(0, 5) : '12:00'
          });
        };
        fetchPages();
      }
    }
  }, [targetChapter, existingChapters]);

  useEffect(() => { setTargetChapter('new'); }, [targetSeries]);

  const handlePageClick = (index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedPages(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b));
    } else if (e.shiftKey && selectedPages.length > 0) {
      const lastSelected = selectedPages[selectedPages.length - 1];
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedPages(Array.from(new Set([...selectedPages, ...range])).sort((a, b) => a - b));
    } else {
      setSelectedPages([index]);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!selectedPages.includes(index)) setSelectedPages([index]);
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString()); 
  };

  const handleDragEnter = (index: number) => setDragOverItem(index);
  const handleDragEnd = () => { setDraggedItem(null); setDragOverItem(null); };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (selectedPages.length === 0) return;
    const currentPages = [...formData.pages];
    const pagesToMove = selectedPages.map(i => currentPages[i]);
    const remainingPages = currentPages.filter((_, i) => !selectedPages.includes(i));
    
    let insertIndex = dropIndex;
    const itemsBeforeDrop = selectedPages.filter(i => i < dropIndex).length;
    insertIndex -= itemsBeforeDrop;
    if (insertIndex < 0) insertIndex = 0;

    remainingPages.splice(insertIndex, 0, ...pagesToMove);
    setFormData({ ...formData, pages: remainingPages });
    setSelectedPages([]);
    setDraggedItem(null);
    setDragOverItem(null);
    if (onDirty) onDirty();
  };

  const removePage = (index: number) => {
    if (!window.confirm(`Are you sure you want to remove page ${index + 1}?`)) return;
    const newPages = formData.pages.filter((_, i) => i !== index);
    setFormData({ ...formData, pages: newPages });
    if (onDirty) onDirty();
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...formData.pages];
    if (direction === 'left' && index > 0) [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    else if (direction === 'right' && index < newPages.length - 1) [newPages[index + 1], newPages[index]] = [newPages[index], newPages[index + 1]];
    setFormData({ ...formData, pages: newPages });
    if (onDirty) onDirty();
  };

  const handleSaveChapter = async (publishStatus: boolean) => {
    if (!targetSeries) return alert("Please select a series first.");
    if (!formData.chapterNumber) return alert("Please enter a chapter number.");
    if (formData.pages.length === 0) return alert("Please upload at least one page.");

    setIsSaving(true);
    let currentChapterId = targetChapter;
    try {
      let publishTimestamp = null;
      if (publishStatus || formData.isScheduled) {
         publishTimestamp = formData.isScheduled ? new Date(`${formData.publishDate}T${formData.publishTime}`).toISOString() : new Date().toISOString();
      }

      const chapterPayload = {
        series_slug: targetSeries,
        chapter_number: Number(formData.chapterNumber),
        title: formData.title || `Chapter ${formData.chapterNumber}`,
        thumbnail_url: formData.thumbnailUrl || formData.pages[0],
        thumbnail_scale: formData.thumbnailScale,
        thumbnail_position: formData.thumbnailPosition,
        is_published: publishStatus, 
        publish_at: publishTimestamp 
      };

      if (targetChapter === 'new') {
        const { data: newChapter, error: chapterError } = await supabase.from('chapters').insert([chapterPayload]).select().single();
        if (chapterError) throw chapterError;
        currentChapterId = newChapter.id;
      } else {
        const { error: chapterError } = await supabase.from('chapters').update(chapterPayload).eq('id', targetChapter);
        if (chapterError) throw chapterError;
        await supabase.from('pages').delete().eq('chapter_id', targetChapter);
      }

      const pagePayload = formData.pages.map((url, index) => ({ chapter_id: currentChapterId, page_order: index + 1, image_url: url }));
      const { error: pagesError } = await supabase.from('pages').insert(pagePayload);
      if (pagesError) throw pagesError;

      alert(`SUCCESS! Chapter ${formData.chapterNumber} has been ${publishStatus ? 'PUBLISHED' : 'SAVED AS DRAFT'}.`);
      setTargetChapter('new');
      setRefreshKey(prev => prev + 1);
      if (onClean) onClean();
    } catch (error: any) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteChapter = async (chapterId: any, chapterNum: any) => {
    if (!window.confirm(`Permanently delete Chapter ${chapterNum}?`)) return;
    try {
      await supabase.from('chapters').delete().eq('id', chapterId);
      if (targetChapter === chapterId) setTargetChapter('new'); 
      setRefreshKey(prev => prev + 1);
    } catch (error: any) { alert('Failed: ' + error.message); }
  };

  // Slider Math
  const posParts = formData.thumbnailPosition.split(' ');
  const xVal = parseInt(posParts[0]) || 50;
  const yVal = parseInt(posParts[1]) || 50;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Reader Preview defaults to LTR */}
      {isPreviewOpen && <MangaReader pages={formData.pages} readingDirection="ltr" onClose={() => setIsPreviewOpen(false)} />}
      
      {/* Thumbnail Cropper Modal */}
      {cropSourceImage && (
        <ThumbnailCropperModal 
          imageUrl={cropSourceImage} 
          onCropComplete={(newUrl: any) => { 
            setFormData({...formData, thumbnailUrl: newUrl}); 
            if (onDirty) onDirty(); 
            setCropSourceImage(null); 
          }} 
          onCancel={() => setCropSourceImage(null)} 
        />
      )}

      {/* NEW: Page Selector Modal for Thumbnail Cropping */}
      {showPageSelector && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => setShowPageSelector(false)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-[#fe9a00]" />
                <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-widest">Select Thumbnail Source</h3>
              </div>
              <button onClick={() => setShowPageSelector(false)} className="text-zinc-500 hover:text-white p-2"><X className="w-6 h-6" /></button>
            </div>
            
            {formData.pages.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-xl">
                No pages uploaded yet. Upload your chapter pages first!
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 overflow-y-auto max-h-[60vh] custom-scrollbar p-2">
                {formData.pages.map((url, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setCropSourceImage(url); setShowPageSelector(false); }} 
                    className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer border-2 border-zinc-800 hover:border-[#fe9a00] group transition-all"
                  >
                    <div className="absolute top-1 left-1 bg-black/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-zinc-700 z-10">
                      PG {i+1}
                    </div>
                    <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={`Pg ${i+1}`} />
                    <div className="absolute inset-0 bg-[#fe9a00]/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[2px]">
                      <Crop className="w-8 h-8 text-white drop-shadow-md mb-2" />
                      <span className="bg-black text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Crop Page</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Mode Selector */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Select Target Series (Must have a Series to add chapters)</label>
        <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
          <option value="">-- Choose a Series to Manage --</option>
          {seriesList.map((s: any) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </div>

      {targetSeries && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
                  {targetChapter === 'new' ? 'New Chapter Upload' : `Editing Chapter ${formData.chapterNumber}`}
                </h3>
                {targetChapter !== 'new' && (
                  formData.isPublished ? <span className="bg-green-500/20 text-green-500 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-green-500/30">Live</span> : <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-zinc-700">Draft</span>
                )}
              </div>
              {targetChapter !== 'new' && (<button onClick={() => setTargetChapter('new')} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">+ Create New Chapter</button>)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Number</label>
                <input type="number" step="0.1" value={formData.chapterNumber} onChange={(e) => { setFormData({...formData, chapterNumber: e.target.value}); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Title</label>
                <input type="text" placeholder="e.g., The Beginning..." value={formData.title} onChange={(e) => { setFormData({...formData, title: e.target.value}); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
              <div>
                <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Custom Thumbnail</h3>
                {formData.thumbnailUrl && (
                  <div className="relative group/thumb mb-4 rounded-lg overflow-hidden border border-zinc-700 aspect-square bg-black">
                    <img 
                      src={formData.thumbnailUrl} 
                      className="w-full h-full object-cover transition-all" 
                      style={{ 
                        objectPosition: formData.thumbnailPosition,
                        transform: `scale(${formData.thumbnailScale / 100})`
                      }}
                      alt="Thumb" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                      <button onClick={() => setCropSourceImage(formData.thumbnailUrl)} className="p-3 bg-black border border-zinc-700 text-[#fe9a00] rounded-full pointer-events-auto hover:bg-zinc-800 transition-colors" title="Re-crop Thumbnail"><Crop className="w-5 h-5" /></button>
                    </div>
                  </div>
                )}
                
                {/* NEW DROPZONE + PAGE SELECTOR ROW */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Dropzone label={formData.thumbnailUrl ? "Replace Thumb" : "+ Upload Thumb"} height="p-4" folderPath="chapter-thumbnails" onUploadComplete={(url: any) => { setFormData({...formData, thumbnailUrl: url}); if (onDirty) onDirty(); }} />
                  </div>
                  <button 
                    onClick={() => setShowPageSelector(true)}
                    className="flex-shrink-0 flex flex-col items-center justify-center px-3 bg-black border border-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-800 hover:text-[#fe9a00] transition-colors"
                    title="Crop from an uploaded page"
                  >
                    <BookOpen className="w-4 h-4 mb-1" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">From<br/>Pages</span>
                  </button>
                </div>
                
                {/* THUMBNAIL FINE TUNE SLIDERS */}
                {formData.thumbnailUrl && (
                  <div className="bg-black border border-zinc-800 p-3 rounded-xl mt-4 space-y-3">
                     <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Fine-Tune Thumb</h4>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-zinc-400 w-10">Zoom</span>
                       <input type="range" min="50" max="300" value={formData.thumbnailScale} onChange={(e) => { setFormData({...formData, thumbnailScale: Number(e.target.value)}); if (onDirty) onDirty(); }} className="flex-1 accent-[#fe9a00]" />
                       <span className="text-[9px] font-black text-white w-8">{formData.thumbnailScale}%</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-zinc-400 w-10">X-Axis</span>
                       <input type="range" min="0" max="100" value={xVal} onChange={(e) => { setFormData({...formData, thumbnailPosition: `${e.target.value}% ${yVal}%`}); if (onDirty) onDirty(); }} className="flex-1 accent-[#fe9a00]" />
                       <span className="text-[9px] font-black text-white w-8">{xVal}%</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-zinc-400 w-10">Y-Axis</span>
                       <input type="range" min="0" max="100" value={yVal} onChange={(e) => { setFormData({...formData, thumbnailPosition: `${xVal}% ${e.target.value}%`}); if (onDirty) onDirty(); }} className="flex-1 accent-[#fe9a00]" />
                       <span className="text-[9px] font-black text-white w-8">{yVal}%</span>
                     </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Chapter Pages</h3>
                  {formData.pages.length > 0 && (<button onClick={() => setIsPreviewOpen(true)} className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-3 py-1.5 rounded hover:bg-[#fe9a00] hover:text-black">Preview Reader</button>)}
                </div>
                
                {formData.pages.length > 0 && (
                  <div className="bg-black border border-zinc-800 p-3 rounded mb-4 max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-[#fe9a00] font-bold mb-3 uppercase tracking-widest">{formData.pages.length} Pages</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {formData.pages.map((url, i) => (
                        <div key={i} draggable={true} onMouseDown={(e) => handlePageClick(i, e)} onDragStart={(e) => handleDragStart(e, i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => handleDrop(e, i)} className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all select-none ${selectedPages.includes(i) ? 'border-[#fe9a00] scale-95 z-10' : dragOverItem === i ? 'border-white border-dashed scale-105 opacity-80' : 'border-zinc-800 hover:border-zinc-600 group/page'}`}>
                          <div className="absolute top-1 left-1 z-20 bg-black/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-700">PG {i+1}</div>
                          <img src={url} alt={`Pg ${i+1}`} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/page:opacity-100 flex flex-col justify-between p-1">
                            <div className="flex justify-between w-full">
                              <button onClick={() => setCropSourceImage(url)} className="p-1 hover:text-[#fe9a00] text-zinc-300" title="Crop this page"><Crop className="w-3 h-3" /></button>
                              <button onClick={() => removePage(i)} className="p-1 hover:text-red-500 text-zinc-300" title="Delete page"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="flex justify-between w-full">
                              <button onClick={() => movePage(i, 'left')} className="p-1 hover:text-[#fe9a00] text-zinc-300" title="Move Left"><ChevronLeft className="w-3 h-3" /></button>
                              <button onClick={() => movePage(i, 'right')} className="p-1 hover:text-[#fe9a00] text-zinc-300" title="Move Right"><ChevronRight className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Dropzone label="+ Add Pages" multiple={true} height="p-6" folderPath="manga-pages" onUploadComplete={(urls: any) => { setFormData({...formData, pages: [...formData.pages, ...urls]}); if (onDirty) onDirty(); }} />
              </div>
            </div>

            {/* Scheduling & Publish */}
            <div className="bg-black border border-zinc-800 p-5 rounded-xl shadow-inner mt-8">
               <div className="flex items-center justify-between mb-4">
                 <div><h4 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4 text-[#fe9a00]" /> Release Schedule</h4></div>
                 <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-700">
                   <input type="checkbox" checked={formData.isScheduled} onChange={(e) => setFormData({...formData, isScheduled: e.target.checked})} className="accent-[#fe9a00]" />
                   <span className="text-[10px] font-black text-zinc-300 uppercase">Schedule</span>
                 </label>
               </div>
               {formData.isScheduled && (
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                   <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Release Date</label><input type="date" value={formData.publishDate} onChange={(e) => setFormData({...formData, publishDate: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" /></div>
                   <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Release Time</label><input type="time" value={formData.publishTime} onChange={(e) => setFormData({...formData, publishTime: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" /></div>
                 </div>
               )}
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-800">
              <button onClick={() => handleSaveChapter(false)} disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} className={`w-1/2 bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded border border-zinc-700 ${isSaving ? 'opacity-50' : 'hover:bg-zinc-700'}`}>{formData.isPublished ? 'Revert to Draft' : 'Save Draft'}</button>
              <button onClick={() => handleSaveChapter(true)} disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} className={`w-1/2 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded ${isSaving ? 'opacity-50' : 'hover:bg-white'}`}>{formData.isScheduled ? 'Schedule Release' : (formData.isPublished ? 'Update Live' : 'Publish Now')}</button>
            </div>
            
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col max-h-[800px]">
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-4 pb-4 border-b border-zinc-800">Chapter Roster</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {existingChapters.map(ch => (
                <div key={ch.id} onClick={() => { setTargetChapter(ch.id); if (onClean) onClean(); }} className={`rounded p-3 flex gap-3 items-center group cursor-pointer transition-colors border ${targetChapter === ch.id ? 'bg-zinc-800 border-[#fe9a00]' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden shrink-0">
                    <img 
                      src={ch.thumbnail_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'} 
                      className="w-full h-full object-cover" 
                      style={{
                        objectPosition: ch.thumbnail_position || '50% 50%',
                        transform: `scale(${(ch.thumbnail_scale || 100) / 100})`
                      }}
                      alt="Thumb" 
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[9px] text-[#fe9a00] tracking-widest">CH {ch.chapter_number}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase ${ch.is_published ? 'bg-green-500/20 text-green-500' : 'bg-zinc-700/50 text-zinc-400'}`}>{ch.is_published ? 'Live' : 'Draft'}</span>
                    </div>
                    <h4 className="text-xs text-white font-bold truncate">{ch.title || 'Untitled'}</h4>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id, ch.chapter_number); }} className="text-zinc-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};