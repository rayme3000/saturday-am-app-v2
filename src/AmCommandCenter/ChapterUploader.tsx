import React, { useState, useEffect } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Crop, Image as ImageIcon, MapPin, Share2, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { MangaReader } from '../MainViews/MangaReader';
import {
  STORAGE_TRACKS_KEY,
  getMatchingDropDatesForTrack,
  toNineAmEstIso
} from './ReleaseScheduler';
import type { TrackAssignment } from './ReleaseScheduler';

export const ChapterUploader = ({ Dropzone, ThumbnailCropperModal, setIsDirty, onDirty, onClean }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [targetSeries, setTargetSeries] = useState('');
  const [targetChapter, setTargetChapter] = useState('new');
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // --- CROPPER STATES ---
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'thumbnail' | 'shareZone'>('thumbnail');
  const [showPageSelector, setShowPageSelector] = useState(false);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  // --- HOTSPOT STATES ---
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [activeHotspotPage, setActiveHotspotPage] = useState<number | null>(null);
  const [hotspotMode, setHotspotMode] = useState<'info' | 'share'>('info');
  const [hotspotDraft, setHotspotDraft] = useState<{x: number, y: number, id?: any} | null>(null);
  const [hotspotForm, setHotspotForm] = useState({ content: '' });

  const [formData, setFormData] = useState({
    chapterNumber: '',
    title: '',
    thumbnailUrl: '',
    thumbnailScale: 100,
    thumbnailPosition: '50% 50%',
    pages: [] as string[]
  });

  // Helper: Find if targetSeries is assigned to a release track in ReleaseScheduler
  const getAssignedTrackForSeries = (slug: string): TrackAssignment | null => {
    if (!slug) return null;
    try {
      const raw = localStorage.getItem(STORAGE_TRACKS_KEY);
      if (raw) {
        const tracks: TrackAssignment[] = JSON.parse(raw);
        const found = tracks.find(t => t.seriesSlug === slug && !t.paused);
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return null;
  };

  useEffect(() => {
    const fetchChapters = async () => {
      if (!targetSeries) { setExistingChapters([]); return; }
      const { data } = await supabase
        .from('chapters')
        .select('*')
        .eq('series_slug', targetSeries)
        .order('chapter_number', { ascending: false });

      if (!data) return;

      // Auto-schedule any chapters missing a scheduled date if this series is in the Release Scheduler
      const assignedTrack = getAssignedTrackForSeries(targetSeries);
      const hasFutureScheduled = data.some(
        (c: any) => c.publish_at && new Date(c.publish_at).getTime() > Date.now()
      );
      const unscheduledDrafts = data.filter((c: any) => !c.is_published || !c.publish_at);

      if ((assignedTrack || hasFutureScheduled) && unscheduledDrafts.length > 0) {
        const now = Date.now();
        const unreleased = [...data]
          .filter((c: any) => !c.is_published || !c.publish_at || new Date(c.publish_at).getTime() > now)
          .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));

        const dayType = assignedTrack?.dayType || 'SATURDAY';
        const cadence =
          assignedTrack?.cadence ||
          (targetSeries.toLowerCase().includes('apple-black') &&
          !targetSeries.toLowerCase().includes('origin') &&
          !targetSeries.toLowerCase().includes('annual')
            ? 'odd_weeks'
            : 'weekly');
        const countPerDrop = Math.max(1, assignedTrack?.chaptersPerDrop || 1);
        const startOffset = assignedTrack?.startWeekOffset || 1;

        const validDates = getMatchingDropDatesForTrack(
          dayType,
          cadence,
          startOffset,
          Math.ceil(unreleased.length / countPerDrop)
        );

        let cursor = 0;
        for (const dropDay of validDates) {
          if (cursor >= unreleased.length) break;
          const publishIso = toNineAmEstIso(dropDay.dateStr, '09:00');
          for (let i = 0; i < countPerDrop; i++) {
            if (cursor >= unreleased.length) break;
            const ch = unreleased[cursor];
            cursor++;
            await supabase
              .from('chapters')
              .update({ is_published: true, publish_at: publishIso })
              .eq('id', ch.id);
          }
        }

        const { data: refreshed } = await supabase
          .from('chapters')
          .select('*')
          .eq('series_slug', targetSeries)
          .order('chapter_number', { ascending: false });
        if (refreshed) {
          setExistingChapters(refreshed);
          return;
        }
      }

      setExistingChapters(data);
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
        pages: []
      });
      setHotspots([]); 
    } else {
      const selected = existingChapters.find(c => c.id === targetChapter);
      if (selected) {
        const fetchPagesAndHotspots = async () => {
          const { data: pagesData } = await supabase.from('pages').select('image_url').eq('chapter_id', targetChapter).order('page_order', { ascending: true });
          const { data: hotspotData } = await supabase.from('page_hotspots').select('*').eq('chapter_id', targetChapter);
          
          setFormData({
            chapterNumber: selected.chapter_number.toString(),
            title: selected.title || '',
            thumbnailUrl: selected.thumbnail_url || '',
            thumbnailScale: selected.thumbnail_scale || 100,
            thumbnailPosition: selected.thumbnail_position || '50% 50%',
            pages: pagesData ? pagesData.map(p => p.image_url) : []
          });
          
          if (hotspotData) setHotspots(hotspotData);
        };
        fetchPagesAndHotspots();
      }
    }
  }, [targetChapter, existingChapters]);

  useEffect(() => { 
    setTargetChapter('new'); 
  }, [targetSeries]);

  const openHotspotEditor = (index: number, mode: 'info' | 'share') => {
    if (targetChapter === 'new') return alert("Please save the chapter first before adding hotspots.");
    setActiveHotspotPage(index);
    setHotspotMode(mode);
    setHotspotDraft(null);
    setHotspotForm({ content: '' });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (hotspotDraft?.id) {
      setHotspotDraft({ ...hotspotDraft, x, y });
    } else {
      setHotspotDraft({ x, y });
      setHotspotForm({ content: '' });
    }
  };

  const saveHotspot = async () => {
    if (!hotspotDraft || activeHotspotPage === null) return;
    if (hotspotMode === 'info' && !hotspotForm.content) return alert("Please add content for the Author Comments.");
    if (hotspotMode === 'share' && (!hotspotForm.content || !hotspotForm.content.startsWith('http'))) return alert("Please crop a panel for this share zone.");
    
    setIsSaving(true);
    const payload = {
      chapter_id: targetChapter,
      page_index: activeHotspotPage,
      x_percent: hotspotDraft.x,
      y_percent: hotspotDraft.y,
      title: hotspotMode === 'share' ? 'Hype Share' : 'Author Comments',
      content: hotspotForm.content,
      icon_type: hotspotMode
    };
    
    if (hotspotDraft.id) {
      const { data, error } = await supabase.from('page_hotspots').update(payload).eq('id', hotspotDraft.id).select().single();
      setIsSaving(false);
      if (error) {
        alert("Error saving hotspot: " + error.message);
      } else {
        setHotspots(prev => prev.map(h => String(h.id) === String(hotspotDraft.id) ? data : h));
        setHotspotDraft(null);
      }
    } else {
      const { data, error } = await supabase.from('page_hotspots').insert([payload]).select().single();
      setIsSaving(false);
      if (error) {
        alert("Error saving hotspot: " + error.message);
      } else {
        setHotspots(prev => [...prev, data]);
        setHotspotDraft(null);
      }
    }
  };

  const deleteHotspot = async (id: any) => {
    if (!window.confirm("Delete this hotspot?")) return;
    setIsSaving(true);

    const { error } = await supabase.from('page_hotspots').delete().eq('id', id);
    setIsSaving(false);

    if (error) {
      console.error("Failed to delete hotspot from Supabase:", error);
      alert("Failed to delete from database: " + error.message);
      return;
    }

    setHotspots(prev => prev.filter(h => String(h.id) !== String(id)));
    if (hotspotDraft && String(hotspotDraft.id) === String(id)) {
      setHotspotDraft(null);
    }
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

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
    if (hotspots.length > 0) {
      if (!window.confirm("WARNING: Moving pages will desync existing Hotspots. You may need to delete and recreate them. Continue?")) return;
    }

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
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

  const removePage = (index: number) => {
    if (!window.confirm(`Are you sure you want to remove page ${index + 1}?`)) return;
    if (hotspots.length > 0) {
      if (!window.confirm("WARNING: Deleting a page will desync existing Hotspots. You may need to delete and recreate them. Continue?")) return;
    }
    const newPages = formData.pages.filter((_, i) => i !== index);
    setFormData({ ...formData, pages: newPages });
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    if (hotspots.length > 0) {
      if (!window.confirm("WARNING: Moving pages will desync existing Hotspots. You may need to delete and recreate them. Continue?")) return;
    }
    const newPages = [...formData.pages];
    if (direction === 'left' && index > 0) [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    else if (direction === 'right' && index < newPages.length - 1) [newPages[index + 1], newPages[index]] = [newPages[index], newPages[index + 1]];
    setFormData({ ...formData, pages: newPages });
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

  // Computes the next available scheduled slot for a new chapter so it is immediately Scheduled instead of a Draft
  const computeNextScheduledIsoForNewChapter = (): string => {
    const assignedTrack = getAssignedTrackForSeries(targetSeries);
    const now = Date.now();
    const futureScheduled = existingChapters
      .filter((c: any) => c.publish_at && new Date(c.publish_at).getTime() > now)
      .sort((a: any, b: any) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());

    if (assignedTrack) {
      const countPerDrop = Math.max(1, assignedTrack.chaptersPerDrop || 1);
      const totalUnreleasedAfterInsert = futureScheduled.length + 1;
      const dropIndex = Math.floor((totalUnreleasedAfterInsert - 1) / countPerDrop);
      const validDates = getMatchingDropDatesForTrack(
        assignedTrack.dayType,
        assignedTrack.cadence,
        assignedTrack.startWeekOffset || 1,
        dropIndex + 2
      );
      const picked = validDates[dropIndex] || validDates[validDates.length - 1];
      if (picked) return toNineAmEstIso(picked.dateStr, '09:00');
    }

    if (futureScheduled.length > 0) {
      const latestDate = new Date(futureScheduled[futureScheduled.length - 1].publish_at);
      const intervalDays = targetSeries.toLowerCase().includes('apple-black') ? 14 : 7;
      latestDate.setDate(latestDate.getDate() + intervalDays);
      return latestDate.toISOString();
    }

    // Default to next Saturday at 9:00 AM EST
    const nextSat = getMatchingDropDatesForTrack('SATURDAY', 'weekly', 1, 1)[0];
    return toNineAmEstIso(nextSat.dateStr, '09:00');
  };

  const handleSaveToVault = async () => {
    if (!targetSeries) return alert("Please select a series first.");
    if (!formData.chapterNumber) return alert("Please enter a chapter number.");
    if (formData.pages.length === 0) return alert("Please upload at least one page.");

    setIsSaving(true);
    let currentChapterId = targetChapter;
    try {
      const chapterPayload: any = {
        series_slug: targetSeries,
        chapter_number: Number(formData.chapterNumber),
        title: formData.title || `Chapter ${formData.chapterNumber}`,
        thumbnail_url: formData.thumbnailUrl || formData.pages[0],
        thumbnail_scale: formData.thumbnailScale,
        thumbnail_position: formData.thumbnailPosition
      };

      if (targetChapter === 'new') {
        chapterPayload.is_published = true;
        chapterPayload.publish_at = computeNextScheduledIsoForNewChapter();
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

      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
      
      alert(`SUCCESS! Chapter ${formData.chapterNumber} saved and queued in the release schedule.`);
      setTargetChapter(currentChapterId); 
      setRefreshKey(prev => prev + 1);
      if (setIsDirty) setIsDirty(false);
      if (onClean) onClean();
    } catch (error: any) { 
      alert("Failed: " + error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDeleteChapter = async (chapterId: any, chapterNum: any) => {
    const challenge = window.prompt(`Are you sure you want to permanently delete Chapter ${chapterNum}? This cannot be undone.

Type "DELETE" to confirm:`);
    if (challenge?.trim().toUpperCase() !== 'DELETE') {
      return;
    }
    
    try {
      await supabase.from('app_notifications').delete().eq('source_key', `chapter_${chapterId}`);
      await supabase.from('chapters').delete().eq('id', chapterId);
      if (targetChapter === chapterId) setTargetChapter('new'); 
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
    } catch (error: any) { alert('Failed: ' + error.message); }
  };

  const posParts = formData.thumbnailPosition.split(' ');
  const xVal = parseInt(posParts[0]) || 50;
  const yVal = parseInt(posParts[1]) || 50;

  // Compute fallback queue dates for display in case a chapter in the list hasn't refreshed its publish_at yet
  const assignedTrackForDisplay = getAssignedTrackForSeries(targetSeries);
  const unreleasedSortedAsc = [...existingChapters]
    .filter((c: any) => !c.is_published || !c.publish_at || new Date(c.publish_at).getTime() > Date.now())
    .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));

  const fallbackDatesForDisplay = getMatchingDropDatesForTrack(
    assignedTrackForDisplay?.dayType || 'SATURDAY',
    assignedTrackForDisplay?.cadence ||
      (targetSeries.toLowerCase().includes('apple-black') ? 'odd_weeks' : 'weekly'),
    assignedTrackForDisplay?.startWeekOffset || 1,
    Math.max(4, unreleasedSortedAsc.length)
  );

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      
      {/* --- HOTSPOT EDITOR MODAL --- */}
      {activeHotspotPage !== null && (
        <div className={`fixed inset-0 z-[7000] bg-black/95 p-4 sm:p-6 animate-fade-in backdrop-blur-md ${cropSourceImage ? 'hidden' : 'flex'}`}>
           <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-inner">
              <div className="relative inline-block max-h-full max-w-full">
                 <img
                    src={formData.pages[activeHotspotPage]}
                    className="max-h-[85vh] object-contain cursor-crosshair border border-white/10"
                    onClick={handleImageClick}
                    draggable={false}
                    alt="Hotspot Editor Target"
                 />
                 
                 {hotspots.filter(h => h.page_index === activeHotspotPage && h.id !== hotspotDraft?.id).map(h => {
                    const isShare = h.icon_type === 'share';
                    return (
                      <div 
                        key={h.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setHotspotMode(h.icon_type || 'info');
                          setHotspotDraft({ x: h.x_percent, y: h.y_percent, id: h.id });
                          setHotspotForm({ content: h.content });
                        }}
                        style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }} 
                        className={`absolute -ml-3 -mt-3 w-6 h-6 rounded-full flex items-center justify-center p-1 shadow-[0_0_15px_rgba(254,154,0,0.8)] group transition-transform hover:scale-110 cursor-pointer ${isShare ? 'bg-black border-2 border-red-500' : 'bg-black/80 backdrop-blur-md border border-[#fe9a00]'}`}
                      >
                         {isShare ? (
                           <Share2 className="w-3 h-3 text-red-500" />
                         ) : (
                           <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain drop-shadow-md" alt="marker" />
                         )}
                         <button 
                           onClick={(e) => { 
                             e.preventDefault(); 
                             e.stopPropagation(); 
                             deleteHotspot(h.id); 
                           }} 
                           className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"
                         >
                           <X className="w-3 h-3"/>
                         </button>
                      </div>
                    );
                 })}

                 {hotspotDraft && (
                    <div style={{ top: `${hotspotDraft.y}%`, left: `${hotspotDraft.x}%` }} className={`absolute -ml-3 -mt-3 w-6 h-6 rounded-full flex items-center justify-center p-1 animate-pulse shadow-[0_0_20px_white] ${hotspotMode === 'share' ? 'bg-black border-2 border-red-500' : 'bg-black border-2 border-white'}`}>
                       {hotspotMode === 'share' ? (
                         <Share2 className="w-3 h-3 text-red-500" />
                       ) : (
                         <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain brightness-0 invert" alt="draft marker" />
                       )}
                    </div>
                 )}
              </div>
           </div>

           <div className="w-80 ml-4 sm:ml-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden shrink-0">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/50">
                 <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-[10px] sm:text-xs flex items-center gap-2">
                   {hotspotMode === 'share' ? <Share2 className="w-4 h-4" /> : <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-4 h-4 object-contain" alt="foot" />}
                   {hotspotMode === 'share' ? 'Hype Share Zone' : 'Author Comments'}
                 </h3>
                 <button onClick={() => {setActiveHotspotPage(null); setHotspotDraft(null);}} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                 <p className="text-[10px] text-zinc-400 font-bold mb-6 leading-relaxed bg-black p-3 rounded border border-zinc-800">
                   {hotspotMode === 'share' 
                     ? 'Click anywhere to place the Share button. Then crop out the specific panel you want fans to share.' 
                     : 'Click anywhere on the manga page to drop an Author Comment, or click an existing footprint to edit it.'}
                 </p>

                 {hotspotDraft ? (
                    <div className="flex flex-col gap-4 animate-fade-in-up">
                       {hotspotMode === 'info' ? (
                         <div>
                           <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Author Note / Description</label>
                           <textarea rows={8} value={hotspotForm.content} onChange={e=>setHotspotForm({ content: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-xs font-medium leading-relaxed focus:outline-none focus:border-[#fe9a00]" placeholder="Enter author notes or lore here... URLs will automatically turn into clickable links!" />
                         </div>
                       ) : (
                         <div className="flex flex-col items-center gap-3">
                           <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest self-start">Share Panel Crop</label>
                           {hotspotForm.content && hotspotForm.content.startsWith('http') ? (
                             <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-700 group bg-black">
                                <img src={hotspotForm.content} alt="Cropped Share" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/opacity-100 flex items-center justify-center transition-opacity">
                                   <button onClick={() => { setCropTarget('shareZone'); setCropSourceImage(formData.pages[activeHotspotPage!]); }} className="p-3 bg-black border border-zinc-700 text-[#fe9a00] rounded-full hover:bg-zinc-800 transition-colors shadow-lg cursor-pointer"><Crop className="w-5 h-5" /></button>
                                </div>
                             </div>
                           ) : (
                             <button onClick={() => { setCropTarget('shareZone'); setCropSourceImage(formData.pages[activeHotspotPage!]); }} className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 bg-black/50 rounded-xl text-zinc-500 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-colors cursor-pointer">
                                <Crop className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Crop Panel</span>
                             </button>
                           )}
                         </div>
                       )}

                       <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
                          <button onClick={() => setHotspotDraft(null)} className="flex-1 bg-zinc-800 text-white font-black uppercase tracking-widest py-3 rounded text-[10px] hover:bg-zinc-700 transition-colors cursor-pointer">Cancel</button>
                          <button onClick={saveHotspot} disabled={isSaving} className="flex-1 bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded text-[10px] hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)] disabled:opacity-50 cursor-pointer">
                            {hotspotDraft.id ? 'Update Comment' : 'Save Comment'}
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center bg-black/30">
                       {hotspotMode === 'share' ? <Share2 className="w-10 h-10 mb-4 opacity-30 text-zinc-600" /> : <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-10 h-10 object-contain mb-4 opacity-30 grayscale invert" alt="waiting" />}
                       <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-relaxed">Waiting for<br/>placement...</span>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {isPreviewOpen && <MangaReader pages={formData.pages} readingDirection="ltr" onClose={() => setIsPreviewOpen(false)} />}
      
      {/* HIGHEST Z-INDEX CONTAINER FOR CROPPER */}
      {cropSourceImage && (
        <div className="fixed inset-0 z-[9999]">
          <ThumbnailCropperModal 
            imageUrl={cropSourceImage} 
            onCropComplete={(newUrl: any) => { 
              if (cropTarget === 'thumbnail') {
                setFormData({...formData, thumbnailUrl: newUrl}); 
                if (setIsDirty) setIsDirty(true);
                if (onDirty) onDirty(); 
              } else if (cropTarget === 'shareZone') {
                setHotspotForm({ content: newUrl });
              }
              setCropSourceImage(null); 
            }} 
            onCancel={() => setCropSourceImage(null)} 
          />
        </div>
      )}

      {showPageSelector && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => setShowPageSelector(false)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-[#fe9a00]" />
                <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-widest">Select Thumbnail Source</h3>
              </div>
              <button onClick={() => setShowPageSelector(false)} className="text-zinc-500 hover:text-white p-2 cursor-pointer"><X className="w-6 h-6" /></button>
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
                    onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(url); setShowPageSelector(false); }} 
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
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
                    {targetChapter === 'new' ? 'New Chapter Upload' : `Editing Chapter ${formData.chapterNumber}`}
                  </h3>
                </div>
                {targetChapter !== 'new' && (<button onClick={() => setTargetChapter('new')} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors cursor-pointer">+ Add New Chapter</button>)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Number</label>
                  <input type="number" step="0.1" value={formData.chapterNumber} onChange={(e) => { setFormData({...formData, chapterNumber: e.target.value}); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Title</label>
                  <input type="text" placeholder="e.g., The Beginning..." value={formData.title} onChange={(e) => { setFormData({...formData, title: e.target.value}); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
                <div>
                  <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Thumbnail</h3>
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
                        <button onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(formData.thumbnailUrl); }} className="p-3 bg-black border border-zinc-700 text-[#fe9a00] rounded-full pointer-events-auto hover:bg-zinc-800 transition-colors cursor-pointer" title="Re-crop Thumbnail"><Crop className="w-5 h-5" /></button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Dropzone label={formData.thumbnailUrl ? "Replace Thumb" : "+ Upload Thumb"} height="p-4" folderPath="chapter-thumbnails" onUploadComplete={(url: any) => { setFormData({...formData, thumbnailUrl: url}); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} />
                    </div>
                    <button 
                      onClick={() => setShowPageSelector(true)}
                      className="flex-shrink-0 flex flex-col items-center justify-center px-3 bg-black border border-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-800 hover:text-[#fe9a00] transition-colors cursor-pointer"
                      title="Crop from an uploaded page"
                    >
                      <BookOpen className="w-4 h-4 mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">From<br/>Pages</span>
                    </button>
                  </div>
                  
                  {formData.thumbnailUrl && (
                    <div className="bg-black border border-zinc-800 p-3 rounded-xl mt-4 space-y-3">
                       <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Fine-Tune Thumb</h4>
                       <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-zinc-400 w-10">Zoom</span>
                         <input type="range" min="50" max="300" value={formData.thumbnailScale} onChange={(e) => { setFormData({...formData, thumbnailScale: Number(e.target.value)}); if (setIsDirty) setIsDirty(true); }} className="flex-1 accent-[#fe9a00]" />
                         <span className="text-[9px] font-black text-white w-8">{formData.thumbnailScale}%</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-zinc-400 w-10">X-Axis</span>
                         <input type="range" min="0" max="100" value={xVal} onChange={(e) => { setFormData({...formData, thumbnailPosition: `${e.target.value}% ${yVal}%`}); if (setIsDirty) setIsDirty(true); }} className="flex-1 accent-[#fe9a00]" />
                         <span className="text-[9px] font-black text-white w-8">{xVal}%</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-zinc-400 w-10">Y-Axis</span>
                         <input type="range" min="0" max="100" value={yVal} onChange={(e) => { setFormData({...formData, thumbnailPosition: `${xVal}% ${e.target.value}%`}); if (setIsDirty) setIsDirty(true); }} className="flex-1 accent-[#fe9a00]" />
                         <span className="text-[9px] font-black text-white w-8">{yVal}%</span>
                       </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Chapter Pages</h3>
                    {formData.pages.length > 0 && (<button onClick={() => setIsPreviewOpen(true)} className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-3 py-1.5 rounded hover:bg-[#fe9a00] hover:text-black cursor-pointer">Preview Reader</button>)}
                  </div>
                  
                  {formData.pages.length > 0 && (
                    <div className="bg-black border border-zinc-800 p-3 rounded mb-4 max-h-[400px] overflow-y-auto">
                      <p className="text-xs text-[#fe9a00] font-bold mb-3 uppercase tracking-widest">{formData.pages.length} Pages</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {formData.pages.map((url, i) => (
                          <div key={i} draggable={true} onMouseDown={(e) => handlePageClick(i, e)} onDragStart={(e) => handleDragStart(e, i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => handleDrop(e, i)} className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all select-none ${selectedPages.includes(i) ? 'border-[#fe9a00] scale-95 z-10 group/page' : dragOverItem === i ? 'border-white border-dashed scale-105 opacity-80 group/page' : 'border-zinc-800 hover:border-zinc-600 group/page'}`}>
                            
                            <div className="absolute top-1 left-1 z-20 bg-black/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-700">PG {i+1}</div>
                            
                            {hotspots.filter(h => h.page_index === i).length > 0 && (
                              <div className="absolute top-1 right-1 z-20 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-900 shadow-md">
                                {hotspots.filter(h => h.page_index === i).length} Features
                              </div>
                            )}

                            {/* --- AUTHOR COMMENTS BUTTON --- */}
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (targetChapter === 'new') return alert("Please click 'Upload & Schedule Chapter' below before adding Author Comments hotspots.");
                                 openHotspotEditor(i, 'info');
                              }} 
                              className="absolute bottom-1 right-10 z-20 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-zinc-700 hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] text-[#fe9a00] transition-all shadow-md cursor-pointer" 
                              title="Add Author Comments"
                            >
                               <MapPin className="w-4 h-4 drop-shadow-md" />
                            </button>
                            
                            {/* --- HYPE SHARE ZONE BUTTON --- */}
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (targetChapter === 'new') return alert("Please click 'Upload & Schedule Chapter' below before adding Share Zones.");
                                 openHotspotEditor(i, 'share');
                              }} 
                              className="absolute bottom-1 right-1 z-20 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-zinc-700 hover:bg-red-500 hover:text-white hover:border-red-500 text-red-500 transition-all shadow-md cursor-pointer" 
                              title="Add Hype Share Zone"
                            >
                               <Share2 className="w-4 h-4 drop-shadow-md" />
                            </button>

                            <img src={url} alt={`Pg ${i+1}`} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/page:opacity-100 flex flex-col justify-between p-1 z-10 pointer-events-none">
                              <div className="flex justify-between w-full pointer-events-auto">
                                <button onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(url); }} className="p-1 hover:text-white text-zinc-400 cursor-pointer" title="Crop this page"><Crop className="w-3.5 h-3.5" /></button>
                                <button onClick={() => removePage(i)} className="p-1 hover:text-red-500 text-zinc-400 cursor-pointer" title="Delete page"><X className="w-4 h-4" /></button>
                              </div>
                              <div className="flex justify-between w-full pointer-events-auto">
                                <button onClick={() => movePage(i, 'left')} className="p-1 hover:text-[#fe9a00] text-zinc-400 cursor-pointer" title="Move Left"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => movePage(i, 'right')} className="p-1 hover:text-[#fe9a00] text-zinc-400 cursor-pointer" title="Move Right"><ChevronRight className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Dropzone label="+ Add Pages" multiple={true} height="p-6" folderPath="manga-pages" onUploadComplete={(urls: any) => { setFormData({...formData, pages: [...formData.pages, ...urls]}); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              <button onClick={handleSaveToVault} disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} className={`w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-50' : 'hover:bg-white shadow-[0_0_20px_rgba(254,154,0,0.25)]'}`}>
                {targetChapter === 'new' ? '+ Upload & Schedule Chapter' : 'Save Chapter Updates'}
              </button>
            </div>
            
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col max-h-[800px]">
            <div className="flex flex-col justify-center items-center mb-6 pb-6 border-b border-zinc-800 text-center">
              <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-2">Series Chapter Queue</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 mb-4 leading-relaxed">
                Release dates and syndication schedules are managed in the Master Release Scheduler.
              </p>
              <button 
                onClick={() => document.getElementById('release-scheduler-tab-trigger')?.click()}
                className="text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-[#fe9a00] hover:text-black transition-colors px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-md"
              >
                Go to Release Scheduler <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {existingChapters.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No chapters uploaded yet.</p>
                </div>
              ) : (
                existingChapters.map(ch => {
                  const isLive = ch.is_published && ch.publish_at && new Date(ch.publish_at).getTime() <= Date.now();
                  const queueIdx = unreleasedSortedAsc.findIndex((u: any) => String(u.id) === String(ch.id));
                  const fallbackDateObj = queueIdx >= 0 ? fallbackDatesForDisplay[queueIdx] : null;
                  const scheduledDateLabel = ch.publish_at
                    ? `Scheduled: ${new Date(ch.publish_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : fallbackDateObj
                    ? `Scheduled: ${fallbackDateObj.label}`
                    : 'Scheduled';

                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setTargetChapter(ch.id);
                        if (setIsDirty) setIsDirty(false);
                        if (onClean) onClean();
                      }}
                      className={`rounded-xl p-3 flex gap-3 items-center group cursor-pointer transition-colors border ${
                        targetChapter === ch.id
                          ? 'bg-zinc-800 border-[#fe9a00]'
                          : 'bg-black border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
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

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                          <span className="text-xs font-black text-white uppercase tracking-wider shrink-0">
                            CH. {ch.chapter_number}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase shrink-0 ${
                              isLive
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40'
                            }`}
                          >
                            {isLive ? 'Live' : scheduledDateLabel}
                          </span>
                        </div>
                        <h4 className="text-[11px] text-zinc-400 font-bold truncate">
                          {ch.title || `Chapter ${ch.chapter_number}`}
                        </h4>
                      </div>

                      <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(ch.id, ch.chapter_number);
                          }}
                          className="text-zinc-500 hover:text-red-500 p-1.5 cursor-pointer"
                          title="Delete Chapter"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};