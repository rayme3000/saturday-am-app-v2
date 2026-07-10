import React, { useState, useEffect } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Crop, Calendar, Play } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export const ChapterUploader = ({ Dropzone, onDirty, onClean }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [targetSeries, setTargetSeries] = useState('');
  const [targetChapter, setTargetChapter] = useState('new');
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    chapterNumber: '', title: '', thumbnailUrl: '', pages: [] as string[], isPublished: false 
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
      setFormData({ chapterNumber: nextNum.toString(), title: '', thumbnailUrl: '', pages: [], isPublished: false });
    } else {
      const selected = existingChapters.find(c => c.id === targetChapter);
      if (selected) {
        const fetchPages = async () => {
          const { data } = await supabase.from('pages').select('image_url').eq('chapter_id', targetChapter).order('page_order', { ascending: true });
          setFormData({ 
            chapterNumber: selected.chapter_number.toString(), 
            title: selected.title || '', 
            thumbnailUrl: selected.thumbnail_url || '', 
            pages: data ? data.map(p => p.image_url) : [], 
            isPublished: selected.is_published || false 
          });
        };
        fetchPages();
      }
    }
  }, [targetChapter, existingChapters]);

  const removePage = (index: number) => {
    const newPages = formData.pages.filter((_, i) => i !== index);
    setFormData({ ...formData, pages: newPages });
  };

  const handleSaveChapter = async (publishStatus: boolean) => {
    if (!targetSeries) return alert("Select series.");
    setIsSaving(true);
    
    // Fix: Defined currentChapterId explicitly
    let currentChapterId = targetChapter;
    
    try {
      const chapterPayload = {
        series_slug: targetSeries,
        chapter_number: Number(formData.chapterNumber),
        title: formData.title || `Chapter ${formData.chapterNumber}`,
        thumbnail_url: formData.thumbnailUrl || formData.pages[0],
        is_published: publishStatus
      };

      if (targetChapter === 'new') {
        const { data: newCh, error } = await supabase.from('chapters').insert([chapterPayload]).select().single();
        if (error) throw error;
        currentChapterId = newCh.id;
      } else {
        const { error } = await supabase.from('chapters').update(chapterPayload).eq('id', targetChapter);
        if (error) throw error;
        await supabase.from('pages').delete().eq('chapter_id', currentChapterId);
      }

      await supabase.from('pages').insert(formData.pages.map((url, index) => ({ 
        chapter_id: currentChapterId, 
        page_order: index + 1, 
        image_url: url 
      })));

      alert("Saved!"); 
      setTargetChapter('new'); 
      setRefreshKey(prev => prev + 1); 
      if (onClean) onClean();
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Series Selector */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Select Target Series</label>
        <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
          <option value="">-- Choose a Series to Manage --</option>
          {seriesList.map((s: any) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </div>

      {targetSeries && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md space-y-6">
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white" placeholder="Chapter Title" />
            
            <Dropzone 
              label="+ Upload Chapter Pages" 
              multiple={true} 
              folderPath="manga-pages" 
              onUploadComplete={(urls: string[]) => setFormData({...formData, pages: [...formData.pages, ...urls]})} 
            />

            <button 
              onClick={() => handleSaveChapter(true)} 
              className="w-full bg-[#fe9a00] text-black font-black uppercase py-4 rounded hover:bg-white transition-colors"
            >
              {isSaving ? 'PUBLISHING...' : 'Publish Chapter'}
            </button>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
             <h3 className="font-bold text-[#fe9a00] uppercase text-xs mb-4">Chapter Roster</h3>
             {existingChapters.map((ch: any) => (
               <div key={ch.id} onClick={() => setTargetChapter(ch.id)} className="cursor-pointer p-2 border-b border-zinc-800 hover:bg-zinc-800 text-sm text-white">
                 {ch.title || `Chapter ${ch.chapter_number}`}
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};