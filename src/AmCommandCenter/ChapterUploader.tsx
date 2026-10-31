import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Crop, Image as ImageIcon, MapPin, Share2, ArrowRight, Zap, Clock, Wrench, EyeOff, Eye } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { MangaReader } from '../MainViews/MangaReader';
import { STORAGE_TRACKS_KEY, getMatchingDropDatesForTrack, toNineAmEstIso } from './ReleaseScheduler';
import type { TrackAssignment } from './ReleaseScheduler';

const navigateToReleaseSchedulerTab = () => {
  const byId = document.getElementById('release-scheduler-tab-trigger');
  if (byId) { byId.click(); return; }
  const targetBtn = Array.from(document.querySelectorAll('button, a')).find(
    el => el.textContent?.trim().toUpperCase() === 'RELEASE SCHEDULER'
  ) as HTMLElement | undefined;
  if (targetBtn) { targetBtn.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
};

export const ChapterUploader = ({ Dropzone, ThumbnailCropperModal, setIsDirty, onDirty, onClean }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [targetSeries, setTargetSeries] = useState('');
  const [targetChapter, setTargetChapter] = useState('new');
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedChapterIdRef = useRef<string>('new');

  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'thumbnail' | 'shareZone'>('thumbnail');
  const [showPageSelector, setShowPageSelector] = useState(false);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [activeHotspotPage, setActiveHotspotPage] = useState<number | null>(null);
  const [hotspotMode, setHotspotMode] = useState<'info' | 'share'>('info');
  const [hotspotDraft, setHotspotDraft] = useState<{ x: number; y: number; id?: any } | null>(null);
  const [hotspotForm, setHotspotForm] = useState({ content: '' });

  const [formData, setFormData] = useState({
    chapterNumber: '', title: '', thumbnailUrl: '', thumbnailScale: 100, thumbnailPosition: '50% 50%', pages: [] as string[]
  });

  const getAssignedTrackForSeries = (slug: string): TrackAssignment | null => {
    if (!slug) return null;
    try {
      const raw = localStorage.getItem(STORAGE_TRACKS_KEY);
      if (raw) {
        const tracks: TrackAssignment[] = JSON.parse(raw);
        return tracks.find(t => t.seriesSlug === slug && !t.paused) || null;
      }
    } catch { /* ignore */ }
    return null;
  };

  const isChapterCurrentlyLive = (ch: any): boolean => {
    if (!ch.is_published) return false;
    if (!ch.publish_at) return true;
    return new Date(ch.publish_at).getTime() <= Date.now();
  };

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
      loadedChapterIdRef.current = 'new';
      const nextNum = existingChapters.length > 0 ? Math.floor(Number(existingChapters[0].chapter_number) + 1) : 1;
      setFormData({ chapterNumber: nextNum.toString(), title: '', thumbnailUrl: '', thumbnailScale: 100, thumbnailPosition: '50% 50%', pages: [] });
      setHotspots([]);
    } else {
      const selected = existingChapters.find(c => String(c.id) === String(targetChapter));
      if (selected && loadedChapterIdRef.current !== String(targetChapter)) {
        loadedChapterIdRef.current = String(targetChapter);
        const fetchPagesAndHotspots = async () => {
          const { data: pagesData } = await supabase.from('pages').select('image_url').eq('chapter_id', selected.id).order('page_order', { ascending: true });
          const { data: hotspotData } = await supabase.from('page_hotspots').select('*').eq('chapter_id', selected.id);
          setFormData({
            chapterNumber: selected.chapter_number.toString(),
            title: selected.title || '',
            thumbnailUrl: selected.thumbnail_url || '',
            thumbnailScale: selected.thumbnail_scale || 100,
            thumbnailPosition: selected.thumbnail_position || '50% 50%',
            pages: pagesData ? pagesData.map((p: any) => p.image_url) : []
          });
          if (hotspotData) setHotspots(hotspotData);
        };
        fetchPagesAndHotspots();
      }
    }
  }, [targetChapter, existingChapters]);

  useEffect(() => { loadedChapterIdRef.current = 'new'; setTargetChapter('new'); }, [targetSeries]);

  const computeNextScheduledIsoForNewChapter = (): string => {
    const assignedTrack = getAssignedTrackForSeries(targetSeries);
    const now = Date.now();
    const futureScheduled = existingChapters
      .filter((c: any) => c.publish_at && new Date(c.publish_at).getTime() > now)
      .sort((a: any, b: any) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());

    if (assignedTrack) {
      const countPerDrop = Math.max(1, assignedTrack.chaptersPerDrop || 1);
      const dropIndex = Math.floor(futureScheduled.length / countPerDrop);
      const validDates = getMatchingDropDatesForTrack(assignedTrack.dayType, assignedTrack.cadence, assignedTrack.startWeekOffset || 1, dropIndex + 2);
      const picked = validDates[dropIndex] || validDates[validDates.length - 1];
      if (picked) return toNineAmEstIso(picked.dateStr, '09:00');
    }
    if (futureScheduled.length > 0) {
      const latestDate = new Date(futureScheduled[futureScheduled.length - 1].publish_at);
      latestDate.setDate(latestDate.getDate() + (targetSeries.toLowerCase().includes('apple-black') ? 14 : 7));
      return latestDate.toISOString();
    }
    const nextSat = getMatchingDropDatesForTrack('SATURDAY', 'weekly', 1, 1)[0];
    return toNineAmEstIso(nextSat.dateStr, '09:00');
  };

  const handlePushChapterToLive = async (e: React.MouseEvent, ch: any) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const maxLiveNum = existingChapters.filter(isChapterCurrentlyLive).reduce((max, c) => Math.max(max, Number(c.chapter_number) || 0), 0);
      const effectivePublishAt = Number(ch.chapter_number) < maxLiveNum
        ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();
      const { error } = await supabase.from('chapters').update({ is_published: true, publish_at: effectivePublishAt }).eq('id', ch.id);
      if (error) throw error;
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
    } catch (err: any) { alert('Failed: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleMoveChapterToQueue = async (e: React.MouseEvent, ch: any) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const nextIso = computeNextScheduledIsoForNewChapter();
      const { error } = await supabase.from('chapters').update({ is_published: true, publish_at: nextIso }).eq('id', ch.id);
      if (error) throw error;
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
    } catch (err: any) { alert('Failed: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleToggleUnpublishChapter = async (e: React.MouseEvent, ch: any) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const nextPublishedState = !ch.is_published;
      const { error } = await supabase.from('chapters').update({ is_published: nextPublishedState }).eq('id', ch.id);
      if (error) throw error;
      if (!nextPublishedState) {
        await supabase.from('app_notifications').delete().eq('source_key', `chapter_${ch.id}`);
      }
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
    } catch (err: any) { alert('Failed to toggle chapter visibility: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleRepairSeriesCutoff = async () => {
    if (!targetSeries || existingChapters.length === 0) return;
    const input = window.prompt(
      `Repair Live vs. Scheduled Chapters for ${targetSeries}:\n\nEnter the HIGHEST Chapter Number that should be LIVE right now (e.g. "24"):`,
      '24'
    );
    if (!input) return;
    const cutoffNum = Number(input.trim());
    if (isNaN(cutoffNum) || cutoffNum < 0) return alert('Invalid chapter number.');

    setIsSaving(true);
    try {
      const sortedAsc = [...existingChapters].sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));
      const toMakeLive = sortedAsc.filter((c: any) => Number(c.chapter_number) <= cutoffNum);
      const toSchedule = sortedAsc.filter((c: any) => Number(c.chapter_number) > cutoffNum);

      for (const ch of toMakeLive) {
        const isNewest = Number(ch.chapter_number) === cutoffNum;
        const ts = isNewest ? new Date(Date.now() - 60 * 60 * 1000).toISOString() : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('chapters').update({ is_published: true, publish_at: ts }).eq('id', ch.id);
        if (error) throw error;
      }

      if (toSchedule.length > 0) {
        const assignedTrack = getAssignedTrackForSeries(targetSeries);
        const dayType = assignedTrack?.dayType || 'SATURDAY';
        const cadence = assignedTrack?.cadence || (targetSeries.toLowerCase().includes('apple-black') ? 'odd_weeks' : 'weekly');
        const countPerDrop = Math.max(1, assignedTrack?.chaptersPerDrop || 1);
        const validDates = getMatchingDropDatesForTrack(dayType, cadence, 1, Math.ceil(toSchedule.length / countPerDrop) + 2);

        let cursor = 0;
        for (const dropDay of validDates) {
          if (cursor >= toSchedule.length) break;
          const publishIso = toNineAmEstIso(dropDay.dateStr, '09:00');
          for (let i = 0; i < countPerDrop; i++) {
            if (cursor >= toSchedule.length) break;
            const ch = toSchedule[cursor++];
            const { error } = await supabase.from('chapters').update({ is_published: true, publish_at: publishIso }).eq('id', ch.id);
            if (error) throw error;
          }
        }
      }

      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
      alert(`FIXED! Ch. 1–${cutoffNum} are LIVE, and Ch. ${cutoffNum + 1}+ are scheduled in order!`);
    } catch (err: any) { alert('Error: ' + err.message); } finally { setIsSaving(false); }
  };

  const openHotspotEditor = (index: number, mode: 'info' | 'share') => {
    if (targetChapter === 'new') return alert('Please save the chapter first before adding hotspots.');
    setActiveHotspotPage(index); setHotspotMode(mode); setHotspotDraft(null); setHotspotForm({ content: '' });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (hotspotDraft?.id) setHotspotDraft({ ...hotspotDraft, x, y });
    else { setHotspotDraft({ x, y }); setHotspotForm({ content: '' }); }
  };

  const saveHotspot = async () => {
    if (!hotspotDraft || activeHotspotPage === null) return;
    if (hotspotMode === 'info' && !hotspotForm.content) return alert('Please add content for the Author Comments.');
    if (hotspotMode === 'share' && (!hotspotForm.content || !hotspotForm.content.startsWith('http'))) return alert('Please crop a panel.');
    setIsSaving(true);
    const payload = {
      chapter_id: targetChapter, page_index: activeHotspotPage, x_percent: hotspotDraft.x, y_percent: hotspotDraft.y,
      title: hotspotMode === 'share' ? 'Hype Share' : 'Author Comments', content: hotspotForm.content, icon_type: hotspotMode
    };
    if (hotspotDraft.id) {
      const { data, error } = await supabase.from('page_hotspots').update(payload).eq('id', hotspotDraft.id).select().single();
      setIsSaving(false);
      if (error) alert('Error: ' + error.message);
      else { setHotspots(prev => prev.map(h => (String(h.id) === String(hotspotDraft.id) ? data : h))); setHotspotDraft(null); }
    } else {
      const { data, error } = await supabase.from('page_hotspots').insert([payload]).select().single();
      setIsSaving(false);
      if (error) alert('Error: ' + error.message);
      else { setHotspots(prev => [...prev, data]); setHotspotDraft(null); }
    }
  };

  const deleteHotspot = async (id: any) => {
    if (!window.confirm('Delete this hotspot?')) return;
    setIsSaving(true);
    const { error } = await supabase.from('page_hotspots').delete().eq('id', id);
    setIsSaving(false);
    if (error) return alert('Failed: ' + error.message);
    setHotspots(prev => prev.filter(h => String(h.id) !== String(id)));
    if (hotspotDraft && String(hotspotDraft.id) === String(id)) setHotspotDraft(null);
    if (setIsDirty) setIsDirty(true); if (onDirty) onDirty();
  };

  const handlePageClick = (index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedPages(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b));
    } else if (e.shiftKey && selectedPages.length > 0) {
      const last = selectedPages[selectedPages.length - 1];
      const range = Array.from({ length: Math.abs(last - index) + 1 }, (_, i) => Math.min(last, index) + i);
      setSelectedPages(Array.from(new Set([...selectedPages, ...range])).sort((a, b) => a - b));
    } else setSelectedPages([index]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!selectedPages.includes(index)) setSelectedPages([index]);
    setDraggedItem(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (selectedPages.length === 0) return;
    if (hotspots.length > 0 && !window.confirm('Moving pages will desync existing Hotspots. Continue?')) return;
    const currentPages = [...formData.pages];
    const pagesToMove = selectedPages.map(i => currentPages[i]);
    const remainingPages = currentPages.filter((_, i) => !selectedPages.includes(i));
    const insertIndex = Math.max(0, dropIndex - selectedPages.filter(i => i < dropIndex).length);
    remainingPages.splice(insertIndex, 0, ...pagesToMove);
    setFormData({ ...formData, pages: remainingPages });
    setSelectedPages([]); setDraggedItem(null); setDragOverItem(null);
    if (setIsDirty) setIsDirty(true); if (onDirty) onDirty();
  };

  const removePage = (index: number) => {
    if (!window.confirm(`Remove page ${index + 1}?`)) return;
    setFormData({ ...formData, pages: formData.pages.filter((_, i) => i !== index) });
    if (setIsDirty) setIsDirty(true); if (onDirty) onDirty();
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...formData.pages];
    if (direction === 'left' && index > 0) [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    else if (direction === 'right' && index < newPages.length - 1) [newPages[index + 1], newPages[index]] = [newPages[index], newPages[index + 1]];
    setFormData({ ...formData, pages: newPages });
    if (setIsDirty) setIsDirty(true); if (onDirty) onDirty();
  };

  const handleSaveToVault = async () => {
    if (!targetSeries) return alert('Please select a series first.');
    if (!formData.chapterNumber) return alert('Please enter a chapter number.');
    if (formData.pages.length === 0) return alert('Please upload at least one page.');

    setIsSaving(true);
    let currentChapterId: any = targetChapter;
    try {
      const existingChapterObj = existingChapters.find(c => String(c.id) === String(targetChapter));
      const actualId = existingChapterObj ? existingChapterObj.id : targetChapter;

      const chapterPayload: any = {
        series_slug: targetSeries,
        chapter_number: Number(formData.chapterNumber),
        title: formData.title ? formData.title.trim() : `Chapter ${formData.chapterNumber}`,
        thumbnail_url: formData.thumbnailUrl || formData.pages[0],
        thumbnail_scale: Number(formData.thumbnailScale) || 100,
        thumbnail_position: formData.thumbnailPosition || '50% 50%'
      };

      if (targetChapter === 'new') {
        chapterPayload.is_published = true;
        chapterPayload.publish_at = computeNextScheduledIsoForNewChapter();
        const { data: newChapter, error: chapterError } = await supabase.from('chapters').insert([chapterPayload]).select().single();
        if (chapterError) throw chapterError;
        currentChapterId = newChapter.id;
        const pagePayload = formData.pages.map((url, index) => ({ chapter_id: currentChapterId, page_order: index + 1, image_url: url }));
        const { error: pagesError } = await supabase.from('pages').insert(pagePayload);
        if (pagesError) throw pagesError;
      } else {
        currentChapterId = actualId;
        if (existingChapterObj) {
          chapterPayload.is_published = existingChapterObj.is_published ?? true;
          chapterPayload.publish_at = existingChapterObj.publish_at ?? null;
        }
        const { data: updatedRows, error: chapterError } = await supabase.from('chapters').update(chapterPayload).eq('id', actualId).select();
        if (chapterError) throw chapterError;
        if (!updatedRows || updatedRows.length === 0) {
          const { error: upErr } = await supabase.from('chapters').upsert({ id: actualId, ...chapterPayload }, { onConflict: 'id' });
          if (upErr) throw upErr;
        }

        await supabase.from('pages').delete().eq('chapter_id', actualId);
        const { data: remaining } = await supabase.from('pages').select('id').eq('chapter_id', actualId).order('page_order', { ascending: true });
        if (remaining && remaining.length > 0) {
          for (let i = 0; i < formData.pages.length; i++) {
            if (remaining[i]) await supabase.from('pages').update({ page_order: i + 1, image_url: formData.pages[i] }).eq('id', remaining[i].id);
            else await supabase.from('pages').insert([{ chapter_id: actualId, page_order: i + 1, image_url: formData.pages[i] }]);
          }
        } else {
          const pagePayload = formData.pages.map((url, index) => ({ chapter_id: actualId, page_order: index + 1, image_url: url }));
          const { error: pagesError } = await supabase.from('pages').insert(pagePayload);
          if (pagesError) throw pagesError;
        }
      }

      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
      alert(`SUCCESS! Chapter ${formData.chapterNumber} saved.`);
      loadedChapterIdRef.current = String(currentChapterId);
      setTargetChapter(currentChapterId);
      setRefreshKey(prev => prev + 1);
      if (setIsDirty) setIsDirty(false); if (onClean) onClean();
    } catch (error: any) { alert('Failed: ' + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteChapter = async (chapterId: any, chapterNum: any) => {
    const challenge = window.prompt(`Type "DELETE" to permanently delete Chapter ${chapterNum}:`);
    if (challenge?.trim().toUpperCase() !== 'DELETE') return;
    try {
      await supabase.from('app_notifications').delete().eq('source_key', `chapter_${chapterId}`);
      await supabase.from('chapters').delete().eq('id', chapterId);
      if (String(targetChapter) === String(chapterId)) { loadedChapterIdRef.current = 'new'; setTargetChapter('new'); }
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
    } catch (error: any) { alert('Failed: ' + error.message); }
  };

  const posParts = formData.thumbnailPosition.split(' ');
  const xVal = parseInt(posParts[0]) || 50;
  const yVal = parseInt(posParts[1]) || 50;

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {activeHotspotPage !== null && (
        <div className={`fixed inset-0 z-[7000] bg-black/95 p-4 sm:p-6 animate-fade-in backdrop-blur-md ${cropSourceImage ? 'hidden' : 'flex'}`}>
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-inner">
            <div className="relative inline-block max-h-full max-w-full">
              <img src={formData.pages[activeHotspotPage]} className="max-h-[85vh] object-contain cursor-crosshair border border-white/10" onClick={handleImageClick} draggable={false} alt="Hotspot Target" />
              {hotspots.filter(h => h.page_index === activeHotspotPage && h.id !== hotspotDraft?.id).map(h => {
                const isShare = h.icon_type === 'share';
                return (
                  <div
                    key={h.id}
                    onClick={e => { e.stopPropagation(); setHotspotMode(h.icon_type || 'info'); setHotspotDraft({ x: h.x_percent, y: h.y_percent, id: h.id }); setHotspotForm({ content: h.content }); }}
                    style={{ top: `${h.y_percent}%`, left: `${h.x_percent}%` }}
                    className={`absolute -ml-3 -mt-3 w-6 h-6 rounded-full flex items-center justify-center p-1 shadow-[0_0_15px_rgba(254,154,0,0.8)] group transition-transform hover:scale-110 cursor-pointer ${isShare ? 'bg-black border-2 border-red-500' : 'bg-black/80 backdrop-blur-md border border-[#fe9a00]'}`}
                  >
                    {isShare ? <Share2 className="w-3 h-3 text-red-500" /> : <MapPin className="w-3.5 h-3.5 text-[#fe9a00]" />}
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); deleteHotspot(h.id); }} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-80 ml-4 sm:ml-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden shrink-0">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/50">
              <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-xs">{hotspotMode === 'share' ? 'Hype Share Zone' : 'Author Comments'}</h3>
              <button onClick={() => { setActiveHotspotPage(null); setHotspotDraft(null); }} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 flex-1 flex flex-col overflow-y-auto">
              {hotspotDraft ? (
                <div className="flex flex-col gap-4">
                  {hotspotMode === 'info' ? (
                    <textarea rows={8} value={hotspotForm.content} onChange={e => setHotspotForm({ content: e.target.value })} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-xs" placeholder="Enter author notes..." />
                  ) : (
                    <button onClick={() => { setCropTarget('shareZone'); setCropSourceImage(formData.pages[activeHotspotPage!]); }} className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 bg-black/50 rounded-xl text-zinc-500 hover:text-[#fe9a00] cursor-pointer">
                      <Crop className="w-8 h-8 mb-2" /><span className="text-[10px] font-black uppercase">Crop Panel</span>
                    </button>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setHotspotDraft(null)} className="flex-1 bg-zinc-800 text-white font-black uppercase py-3 rounded text-[10px] cursor-pointer">Cancel</button>
                    <button onClick={saveHotspot} disabled={isSaving} className="flex-1 bg-[#fe9a00] text-black font-black uppercase py-3 rounded text-[10px] cursor-pointer">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center text-[10px] font-black text-zinc-600 uppercase">Click page to place marker</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPreviewOpen && <MangaReader pages={formData.pages} readingDirection="ltr" onClose={() => setIsPreviewOpen(false)} />}

      {cropSourceImage && (
        <div className="fixed inset-0 z-[9999]">
          <ThumbnailCropperModal
            imageUrl={cropSourceImage}
            onCropComplete={(newUrl: any) => {
              if (cropTarget === 'thumbnail') { setFormData(prev => ({ ...prev, thumbnailUrl: newUrl })); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }
              else setHotspotForm({ content: newUrl });
              setCropSourceImage(null);
            }}
            onCancel={() => setCropSourceImage(null)}
          />
        </div>
      )}

      {showPageSelector && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6" onClick={() => setShowPageSelector(false)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3"><ImageIcon className="w-6 h-6 text-[#fe9a00]" /><h3 className="text-lg font-black uppercase text-white tracking-widest">Select Thumbnail Source</h3></div>
              <button onClick={() => setShowPageSelector(false)} className="text-zinc-500 hover:text-white p-2 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 overflow-y-auto max-h-[60vh] p-2">
              {formData.pages.map((url, i) => (
                <div key={i} onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(url); setShowPageSelector(false); }} className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer border-2 border-zinc-800 hover:border-[#fe9a00]">
                  <img src={url} className="w-full h-full object-cover" alt={`Pg ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Select Target Series (Must have a Series to add chapters)</label>
        <select value={targetSeries} onChange={e => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
          <option value="">-- Choose a Series to Manage --</option>
          {seriesList.map((s: any) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </div>

      {targetSeries && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
                  {targetChapter === 'new' ? 'New Chapter Upload' : `Editing Chapter ${formData.chapterNumber}`}
                </h3>
                {targetChapter !== 'new' && (
                  <button type="button" onClick={() => { loadedChapterIdRef.current = 'new'; setTargetChapter('new'); }} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors cursor-pointer">
                    + Add New Chapter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Number</label>
                  <input type="number" step="0.1" value={formData.chapterNumber} onChange={e => { setFormData(prev => ({ ...prev, chapterNumber: e.target.value })); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Chapter Title</label>
                  <input type="text" placeholder="e.g., The Beginning..." value={formData.title} onChange={e => { setFormData(prev => ({ ...prev, title: e.target.value })); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
                <div>
                  <h3 className="font-bold text-[#fe9a00] mb-2 uppercase tracking-widest text-xs">Thumbnail</h3>
                  {formData.thumbnailUrl && (
                    <div className="relative group/thumb mb-4 rounded-lg overflow-hidden border border-zinc-700 aspect-square bg-black">
                      <img src={formData.thumbnailUrl} className="w-full h-full object-cover" style={{ objectPosition: formData.thumbnailPosition, transform: `scale(${formData.thumbnailScale / 100})` }} alt="Thumb" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                        <button type="button" onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(formData.thumbnailUrl); }} className="p-3 bg-black border border-zinc-700 text-[#fe9a00] rounded-full cursor-pointer"><Crop className="w-5 h-5" /></button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Dropzone label={formData.thumbnailUrl ? 'Replace Thumb' : '+ Upload Thumb'} height="p-4" folderPath="chapter-thumbnails" onUploadComplete={(url: any) => { setFormData(prev => ({ ...prev, thumbnailUrl: url })); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} />
                    </div>
                    <button type="button" onClick={() => setShowPageSelector(true)} className="flex-shrink-0 flex flex-col items-center justify-center px-3 bg-black border border-zinc-700 text-zinc-400 rounded-lg hover:text-[#fe9a00] cursor-pointer">
                      <BookOpen className="w-4 h-4 mb-1" /><span className="text-[8px] font-black uppercase text-center leading-tight">From<br />Pages</span>
                    </button>
                  </div>
                  {formData.thumbnailUrl && (
                    <div className="bg-black border border-zinc-800 p-3 rounded-xl mt-4 space-y-3">
                      <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-zinc-400 w-10">Zoom</span><input type="range" min="50" max="300" value={formData.thumbnailScale} onChange={e => setFormData(prev => ({ ...prev, thumbnailScale: Number(e.target.value) }))} className="flex-1 accent-[#fe9a00]" /><span className="text-[9px] font-black text-white w-8">{formData.thumbnailScale}%</span></div>
                      <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-zinc-400 w-10">X-Axis</span><input type="range" min="0" max="100" value={xVal} onChange={e => setFormData(prev => ({ ...prev, thumbnailPosition: `${e.target.value}% ${yVal}%` }))} className="flex-1 accent-[#fe9a00]" /><span className="text-[9px] font-black text-white w-8">{xVal}%</span></div>
                      <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-zinc-400 w-10">Y-Axis</span><input type="range" min="0" max="100" value={yVal} onChange={e => setFormData(prev => ({ ...prev, thumbnailPosition: `${xVal}% ${e.target.value}%` }))} className="flex-1 accent-[#fe9a00]" /><span className="text-[9px] font-black text-white w-8">{yVal}%</span></div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Chapter Pages</h3>
                    {formData.pages.length > 0 && <button type="button" onClick={() => setIsPreviewOpen(true)} className="text-[10px] font-bold uppercase bg-zinc-800 px-3 py-1.5 rounded hover:bg-[#fe9a00] hover:text-black cursor-pointer">Preview Reader</button>}
                  </div>
                  {formData.pages.length > 0 && (
                    <div className="bg-black border border-zinc-800 p-3 rounded mb-4 max-h-[400px] overflow-y-auto">
                      <p className="text-xs text-[#fe9a00] font-bold mb-3 uppercase tracking-widest">{formData.pages.length} Pages</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {formData.pages.map((url, i) => (
                          <div key={i} draggable onMouseDown={e => handlePageClick(i, e)} onDragStart={e => handleDragStart(e, i)} onDragEnter={() => setDragOverItem(i)} onDragEnd={() => { setDraggedItem(null); setDragOverItem(null); }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} onDrop={e => handleDrop(e, i)} className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-grab border-2 select-none group/page ${selectedPages.includes(i) ? 'border-[#fe9a00] scale-95' : dragOverItem === i ? 'border-white border-dashed' : 'border-zinc-800'}`}>
                            <div className="absolute top-1 left-1 z-20 bg-black/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-700">PG {i + 1}</div>
                            <button type="button" onClick={e => { e.stopPropagation(); openHotspotEditor(i, 'info'); }} className="absolute bottom-1 right-10 z-20 bg-black/80 p-1.5 rounded-full border border-zinc-700 text-[#fe9a00] hover:bg-[#fe9a00] hover:text-black cursor-pointer"><MapPin className="w-4 h-4" /></button>
                            <button type="button" onClick={e => { e.stopPropagation(); openHotspotEditor(i, 'share'); }} className="absolute bottom-1 right-1 z-20 bg-black/80 p-1.5 rounded-full border border-zinc-700 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer"><Share2 className="w-4 h-4" /></button>
                            <img src={url} alt={`Pg ${i + 1}`} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/page:opacity-100 flex flex-col justify-between p-1 z-10 pointer-events-none">
                              <div className="flex justify-between w-full pointer-events-auto">
                                <button type="button" onClick={() => { setCropTarget('thumbnail'); setCropSourceImage(url); }} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><Crop className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => removePage(i)} className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                              </div>
                              <div className="flex justify-between w-full pointer-events-auto">
                                <button type="button" onClick={() => movePage(i, 'left')} className="p-1 text-zinc-400 hover:text-[#fe9a00] cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                                <button type="button" onClick={() => movePage(i, 'right')} className="p-1 text-zinc-400 hover:text-[#fe9a00] cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Dropzone label="+ Add Pages" multiple height="p-6" folderPath="manga-pages" onUploadComplete={(urls: any) => { setFormData(prev => ({ ...prev, pages: [...prev.pages, ...urls] })); if (setIsDirty) setIsDirty(true); if (onDirty) onDirty(); }} />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              <button type="button" onClick={handleSaveToVault} disabled={isSaving || !formData.chapterNumber || formData.pages.length === 0} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-xl cursor-pointer hover:bg-white transition-all disabled:opacity-50">
                {isSaving ? 'Saving Chapter...' : targetChapter === 'new' ? '+ Upload & Schedule Chapter' : 'Save Chapter Updates'}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md flex flex-col max-h-[800px]">
            <div className="flex flex-col justify-center items-center mb-5 pb-5 border-b border-zinc-800 text-center gap-2.5">
              <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">Series Chapter Queue</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                Use the buttons on any chapter below to Pull Down (Unpublish), Push Live, or Schedule.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 w-full mt-1">
                <button type="button" onClick={navigateToReleaseSchedulerTab} className="text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-[#fe9a00] hover:text-black transition-colors px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                  Go to Release Scheduler <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" disabled={isSaving} onClick={handleRepairSeriesCutoff} className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00]/15 text-[#fe9a00] border border-[#fe9a00]/50 hover:bg-[#fe9a00] hover:text-black transition-colors px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                  <Wrench className="w-3.5 h-3.5" /> Auto-Fix Live / Queue Order
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {existingChapters.map(ch => {
                const isPulled = !ch.is_published;
                const isLive = isChapterCurrentlyLive(ch);
                const scheduledDateLabel = ch.publish_at
                  ? `Scheduled: ${new Date(ch.publish_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'Scheduled';

                return (
                  <div
                    key={ch.id}
                    onClick={() => { loadedChapterIdRef.current = ''; setTargetChapter(ch.id); if (setIsDirty) setIsDirty(false); if (onClean) onClean(); }}
                    className={`rounded-xl p-3 flex flex-col gap-2.5 group cursor-pointer transition-colors border ${
                      String(targetChapter) === String(ch.id) ? 'bg-zinc-800 border-[#fe9a00]' : 'bg-black border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                        <img src={ch.thumbnail_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'} className={`w-full h-full object-cover ${isPulled ? 'grayscale opacity-40' : ''}`} alt="Thumb" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                          <span className="text-xs font-black text-white uppercase tracking-wider">CH. {ch.chapter_number}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                            isPulled
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : isLive
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40'
                          }`}>
                            {isPulled ? 'PULLED / HIDDEN' : isLive ? 'Live' : scheduledDateLabel}
                          </span>
                        </div>
                        <h4 className="text-[11px] text-zinc-400 font-bold truncate">{ch.title || `Chapter ${ch.chapter_number}`}</h4>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); handleDeleteChapter(ch.id, ch.chapter_number); }} className="text-zinc-500 hover:text-red-500 p-1.5 cursor-pointer shrink-0" title="Permanently Delete Chapter">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-zinc-800/70">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={e => handleToggleUnpublishChapter(e, ch)}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer border ${
                          isPulled
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black'
                            : 'bg-red-950/50 border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        {isPulled ? <><Eye className="w-3 h-3" /> Re-Publish</> : <><EyeOff className="w-3 h-3" /> Pull Down (Hide)</>}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!isLive && (
                          <button type="button" disabled={isSaving} onClick={e => handlePushChapterToLive(e, ch)} className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                            <Zap className="w-3 h-3 fill-black" /> Push Live
                          </button>
                        )}
                        {isLive && (
                          <button type="button" disabled={isSaving} onClick={e => handleMoveChapterToQueue(e, ch)} className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                            <Clock className="w-3 h-3" /> Queue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};