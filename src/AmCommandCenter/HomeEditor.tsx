import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Edit2,
  Plus,
  LayoutGrid,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle2,
  EyeOff,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export const HomeEditor = ({ Dropzone, setIsDirty, onDirty, onClean }: any) => {
  const { seriesList: contextSeriesList = [] } = useSeriesData();
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [slides, setSlides] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionSeries, setSectionSeries] = useState<Record<string, any[]>>({});

  const [draggedSeriesInfo, setDraggedSeriesInfo] = useState<{
    sectionTitle: string;
    index: number;
  } | null>(null);

  const markDirty = () => {
    if (setIsDirty) setIsDirty(true);
    if (onDirty) onDirty();
  };

  const markClean = () => {
    if (setIsDirty) setIsDirty(false);
    if (onClean) onClean();
  };

  const fetchLayoutData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: slideData }, { data: sectionData }, { data: freshSeriesData }] =
        await Promise.all([
          supabase.from('hero_slides').select('*').order('id', { ascending: true }),
          supabase.from('home_sections').select('*').order('display_order', { ascending: true }),
          supabase.from('series').select('*').order('title', { ascending: true })
        ]);

      const effectiveSeries =
        freshSeriesData && freshSeriesData.length > 0 ? freshSeriesData : contextSeriesList;
      setAllSeries(effectiveSeries);

      if (slideData && slideData.length > 0) {
        setSlides(
          slideData.map((s: any) => ({
            id: s.id,
            desktop_url: s.desktop_url || '',
            mobile_url: s.mobile_url || '',
            linkType: s.link_type || 'series',
            linkTarget: s.link_target || ''
          }))
        );
      } else {
        setSlides([
          { id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }
        ]);
      }

      if (sectionData) {
        setSections(sectionData);
        const mapping: Record<string, any[]> = {};
        sectionData.forEach((sec: any) => {
          mapping[sec.title] = effectiveSeries
            .filter((s: any) => s.home_section === sec.title)
            .sort((a: any, b: any) => (a.display_order ?? 99) - (b.display_order ?? 99));
        });
        setSectionSeries(mapping);
      }
    } catch (err: any) {
      console.error('Error loading HomeEditor:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [contextSeriesList]);

  useEffect(() => {
    fetchLayoutData();
  }, [fetchLayoutData]);

  // --- HERO SLIDESHOW HANDLERS ---
  const addSlide = () => {
    setSlides(prev => [
      ...prev,
      { id: Date.now() + Math.random(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }
    ]);
    markDirty();
  };

  const removeSlide = (idToRemove: any) => {
    if (!window.confirm('Delete this hero slide?')) return;
    setSlides(prev => prev.filter((slide: any) => slide.id !== idToRemove));
    markDirty();
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    markDirty();
  };

  const updateSlide = (id: any, field: string, value: any) => {
    setSlides(prev =>
      prev.map((slide: any) => (slide.id === id ? { ...slide, [field]: value } : slide))
    );
    markDirty();
  };

  // --- SECTION HANDLERS ---
  const createSection = () => {
    const rawTitle = window.prompt('Enter new Home Page section title:');
    const title = rawTitle?.trim();
    if (!title) return;
    if (sections.some((s: any) => s.title.toLowerCase() === title.toLowerCase())) {
      alert('A section with that name already exists!');
      return;
    }
    setSections(prev => [...prev, { title }]);
    setSectionSeries(prev => ({ ...prev, [title]: [] }));
    markDirty();
  };

  const removeSection = (titleToRemove: string) => {
    if (
      !window.confirm(
        `Delete the "${titleToRemove}" section from the Home Page?\n\n(Series inside it will become Unassigned, not deleted.)`
      )
    )
      return;
    setSections(prev => prev.filter((s: any) => s.title !== titleToRemove));
    setSectionSeries(prev => {
      const next = { ...prev };
      delete next[titleToRemove];
      return next;
    });
    markDirty();
  };

  const renameSection = (oldTitle: string) => {
    const rawNew = window.prompt(`Rename "${oldTitle}" to:`, oldTitle);
    const newTitle = rawNew?.trim();
    if (!newTitle || newTitle === oldTitle) return;
    if (sections.some((s: any) => s.title.toLowerCase() === newTitle.toLowerCase())) {
      alert('A section with that name already exists!');
      return;
    }

    setSections(prev =>
      prev.map((s: any) => (s.title === oldTitle ? { ...s, title: newTitle } : s))
    );
    setSectionSeries(prev => {
      const next = { ...prev };
      next[newTitle] = next[oldTitle] || [];
      delete next[oldTitle];
      return next;
    });
    markDirty();
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    markDirty();
  };

  // --- SERIES ASSIGNMENT & REORDERING (PREVENTS DUPLICATE SECTION OVERWRITES) ---
  const findCurrentSectionForSlug = (slug: string): string | null => {
    for (const [secTitle, list] of Object.entries(sectionSeries)) {
      if ((list || []).some((s: any) => s.slug === slug)) {
        return secTitle;
      }
    }
    return null;
  };

  const handleAddSeries = (targetSectionTitle: string, seriesSlug: string) => {
    if (!seriesSlug) return;
    const seriesToAdd = allSeries.find((s: any) => s.slug === seriesSlug);
    if (!seriesToAdd) return;

    // Remove the series from any other section first so it never gets overwritten during save!
    setSectionSeries(prev => {
      const next: Record<string, any[]> = {};
      for (const [secTitle, list] of Object.entries(prev)) {
        next[secTitle] = (list || []).filter((s: any) => s.slug !== seriesSlug);
      }
      next[targetSectionTitle] = [
        ...(next[targetSectionTitle] || []),
        { ...seriesToAdd, home_section: targetSectionTitle }
      ];
      return next;
    });

    markDirty();
  };

  const removeSeriesFromSection = (sectionTitle: string, seriesSlug: string) => {
    setSectionSeries(prev => ({
      ...prev,
      [sectionTitle]: (prev[sectionTitle] || []).filter((s: any) => s.slug !== seriesSlug)
    }));
    markDirty();
  };

  const moveSeries = (sectionTitle: string, index: number, direction: 'up' | 'down') => {
    setSectionSeries(prev => {
      const arr = [...(prev[sectionTitle] || [])];
      if (direction === 'up' && index > 0) {
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      } else if (direction === 'down' && index < arr.length - 1) {
        [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      }
      return { ...prev, [sectionTitle]: arr };
    });
    markDirty();
  };

  const handleSeriesDrop = (targetSectionTitle: string, dropIndex: number) => {
    if (!draggedSeriesInfo) return;
    const { sectionTitle: sourceSection, index: sourceIndex } = draggedSeriesInfo;
    setDraggedSeriesInfo(null);

    if (sourceSection === targetSectionTitle && sourceIndex === dropIndex) return;

    setSectionSeries(prev => {
      const next = { ...prev };
      const sourceArr = [...(next[sourceSection] || [])];
      const [movedItem] = sourceArr.splice(sourceIndex, 1);
      if (!movedItem) return prev;

      if (sourceSection === targetSectionTitle) {
        sourceArr.splice(dropIndex, 0, movedItem);
        next[sourceSection] = sourceArr;
      } else {
        const targetArr = [...(next[targetSectionTitle] || [])].filter(
          (s: any) => s.slug !== movedItem.slug
        );
        targetArr.splice(dropIndex, 0, { ...movedItem, home_section: targetSectionTitle });
        next[sourceSection] = sourceArr;
        next[targetSectionTitle] = targetArr;
      }
      return next;
    });
    markDirty();
  };

  // --- SAVE COMPLETE HOME LAYOUT ---
  const handleSaveHome = async () => {
    setIsSaving(true);
    try {
      // 1. Save Hero Slides
      const { error: slideDelErr } = await supabase
        .from('hero_slides')
        .delete()
        .not('id', 'is', null);
      if (slideDelErr) throw slideDelErr;

      const validSlides = slides
        .filter((s: any) => s.desktop_url || s.mobile_url)
        .map((slide: any) => ({
          desktop_url: slide.desktop_url,
          mobile_url: slide.mobile_url,
          link_type: slide.linkType || 'series',
          link_target: slide.linkTarget || ''
        }));

      if (validSlides.length > 0) {
        const { error: slideInsErr } = await supabase.from('hero_slides').insert(validSlides);
        if (slideInsErr) throw slideInsErr;
      }

      // 2. Save Home Sections Order
      const { error: secDelErr } = await supabase
        .from('home_sections')
        .delete()
        .not('title', 'is', null);
      if (secDelErr) throw secDelErr;

      const newSections = sections.map((sec: any, i: number) => ({
        title: sec.title,
        display_order: i + 1
      }));

      if (newSections.length > 0) {
        const { error: secInsErr } = await supabase.from('home_sections').insert(newSections);
        if (secInsErr) throw secInsErr;
      }

      // 3. Build Deduplicated Series Section Assignments
      const updatesBySlug = new Map<
        string,
        { slug: string; home_section: string; display_order: number }
      >();

      sections.forEach((sec: any) => {
        const seriesInSec = sectionSeries[sec.title] || [];
        seriesInSec.forEach((s: any, idx: number) => {
          if (!s?.slug) return;
          updatesBySlug.set(s.slug, {
            slug: s.slug,
            home_section: sec.title,
            display_order: idx + 1
          });
        });
      });

      allSeries.forEach((s: any) => {
        if (!s?.slug) return;
        if (!updatesBySlug.has(s.slug) && s.home_section && s.home_section !== 'None') {
          updatesBySlug.set(s.slug, {
            slug: s.slug,
            home_section: 'None',
            display_order: 99
          });
        }
      });

      // Execute updates in parallel batches of 6 to avoid connection timeouts
      const allUpdates = Array.from(updatesBySlug.values());
      const batchSize = 6;
      for (let i = 0; i < allUpdates.length; i += batchSize) {
        const batch = allUpdates.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(u =>
            supabase
              .from('series')
              .update({ home_section: u.home_section, display_order: u.display_order })
              .eq('slug', u.slug)
          )
        );
        const failed = results.find(r => r.error);
        if (failed?.error) throw failed.error;
      }

      // 4. Refresh Global App Data Cache Immediately
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchLayoutData();
      markClean();
      alert('SUCCESS! Home Page layout & series sections have been updated.');
    } catch (error: any) {
      alert('Failed to save layout: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute unassigned series so admin can see which series aren't in any section
  const unassignedSeries = allSeries.filter(
    (s: any) => !findCurrentSectionForSlug(s.slug)
  );

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
        <RefreshCw className="w-6 h-6 text-[#fe9a00] animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Loading Live Home Layout...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Sticky Top Action Bar */}
      <div className="sticky top-2 z-40 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
        <div>
          <h2 className="text-sm sm:text-base font-black italic uppercase tracking-wider text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#fe9a00]" /> Home Page Layout & Hero Editor
          </h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
            Assigning a series to a section automatically moves it out of its old section.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchLayoutData}
            disabled={isSaving}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            type="button"
            onClick={handleSaveHome}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(254,154,0,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Saving Layout...' : 'Save Complete Layout'}
          </button>
        </div>
      </div>

      {/* 1. HERO SLIDESHOW MANAGER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#fe9a00]" />
            <div>
              <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-xs">
                Hero Banner Slideshow ({slides.length} Slides)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Desktop (3:1 wide) & Mobile (2:3 vertical) banners displayed at the top of the Home Page
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addSlide}
            className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-4 py-2 rounded-xl hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Slide
          </button>
        </div>

        <div className="space-y-5">
          {slides.map((slide: any, index: number) => (
            <div
              key={slide.id}
              className="bg-black border border-zinc-800 p-4 rounded-xl relative group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest bg-[#fe9a00]/10 border border-[#fe9a00]/30 px-2.5 py-1 rounded">
                  Slide #{index + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Slide Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 'down')}
                    disabled={index === slides.length - 1}
                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Slide Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.id)}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                      title="Delete Slide"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Desktop Banner (Wide)
                  </span>
                  {slide.desktop_url && (
                    <img
                      src={slide.desktop_url}
                      loading="lazy"
                      alt="Desktop Preview"
                      className="w-full h-24 object-cover rounded-lg mb-2 border border-zinc-700"
                    />
                  )}
                  <Dropzone
                    label={slide.desktop_url ? 'Replace Desktop' : '+ Upload Desktop Banner'}
                    height="p-4"
                    folderPath="hero-banners"
                    onUploadComplete={(url: any) => updateSlide(slide.id, 'desktop_url', url)}
                  />
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Mobile Banner (Vertical)
                  </span>
                  {slide.mobile_url && (
                    <img
                      src={slide.mobile_url}
                      loading="lazy"
                      alt="Mobile Preview"
                      className="w-full h-24 object-cover rounded-lg mb-2 border border-zinc-700"
                    />
                  )}
                  <Dropzone
                    label={slide.mobile_url ? 'Replace Mobile' : '+ Upload Mobile Banner'}
                    height="p-4"
                    folderPath="hero-banners"
                    onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)}
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3 mt-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  Click Destination Link
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={slide.linkType}
                    onChange={e => updateSlide(slide.id, 'linkType', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs sm:w-1/3 focus:border-[#fe9a00]"
                  >
                    <option value="series">Specific Series</option>
                    <option value="external">External Web URL</option>
                  </select>
                  {slide.linkType === 'external' ? (
                    <input
                      type="text"
                      placeholder="https://..."
                      value={slide.linkTarget}
                      onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                    />
                  ) : (
                    <select
                      value={slide.linkTarget}
                      onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                    >
                      <option value="">-- Select Series --</option>
                      {allSeries.map((s: any) => (
                        <option key={s.slug} value={s.slug}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SERIES SECTIONS LAYOUT BUILDER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-black uppercase tracking-widest text-[#fe9a00] text-xs">
              Home Page Series Sections ({sections.length} Sections)
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              Drag series to reorder, or select any series from the dropdown to move it into that section.
            </p>
          </div>
          <button
            type="button"
            onClick={createSection}
            className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-4 py-2 rounded-xl hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Section
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((sec: any, secIndex: number) => {
            const listInSec = sectionSeries[sec.title] || [];
            return (
              <div
                key={sec.title}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleSeriesDrop(sec.title, listInSec.length)}
                className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-md"
              >
                <div className="bg-zinc-800/90 px-4 py-3 flex justify-between items-center border-b border-zinc-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black text-[#fe9a00] bg-black/60 px-2 py-0.5 rounded border border-zinc-700">
                      #{secIndex + 1}
                    </span>
                    <h4 className="text-white font-black uppercase text-xs tracking-widest">
                      {sec.title}
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-400">
                      ({listInSec.length} series)
                    </span>
                    <button
                      type="button"
                      onClick={() => renameSection(sec.title)}
                      className="p-1 text-zinc-400 hover:text-[#fe9a00] transition-colors cursor-pointer"
                      title="Rename Section"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSection(secIndex, 'up')}
                      disabled={secIndex === 0}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Section Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(secIndex, 'down')}
                      disabled={secIndex === sections.length - 1}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Section Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.title)}
                      className="p-1.5 rounded bg-zinc-900 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                      title="Delete Section"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {listInSec.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      No series in {sec.title} yet. Use the dropdown below to assign series.
                    </div>
                  )}

                  {listInSec.map((s: any, sIndex: number) => (
                    <div
                      key={s.slug}
                      draggable
                      onDragStart={() =>
                        setDraggedSeriesInfo({ sectionTitle: sec.title, index: sIndex })
                      }
                      onDragOver={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSeriesDrop(sec.title, sIndex);
                      }}
                      className="flex items-center justify-between bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg cursor-grab transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-black text-zinc-500 w-5 text-center">
                          {sIndex + 1}
                        </span>
                        <img
                          src={s.cover_url || s.character_url}
                          loading="lazy"
                          alt={s.title}
                          className="w-9 h-9 object-cover rounded bg-zinc-800 border border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase truncate">
                              {s.title}
                            </span>
                            {s.is_hidden && (
                              <span className="text-[8px] font-black uppercase bg-red-950 text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <EyeOff className="w-2.5 h-2.5" /> Hidden
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block truncate">
                            {s.creator_name || s.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSeries(sec.title, sIndex, 'up')}
                          disabled={sIndex === 0}
                          className="p-1.5 rounded bg-black/60 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSeries(sec.title, sIndex, 'down')}
                          disabled={sIndex === listInSec.length - 1}
                          className="p-1.5 rounded bg-black/60 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSeriesFromSection(sec.title, s.slug)}
                          className="p-1.5 rounded bg-black/60 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                          title={`Remove ${s.title} from ${sec.title}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <select
                    value=""
                    onChange={e => {
                      handleAddSeries(sec.title, e.target.value);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded-lg p-3 text-zinc-300 font-bold text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors"
                  >
                    <option value="">
                      + Assign or Move a Series to {sec.title}...
                    </option>
                    {allSeries
                      .filter((s: any) => !listInSec.some((existing: any) => existing.slug === s.slug))
                      .map((s: any) => {
                        const currentSec = findCurrentSectionForSlug(s.slug);
                        return (
                          <option key={s.slug} value={s.slug}>
                            {s.title}{' '}
                            {currentSec ? `(Move from: ${currentSec})` : '(Unassigned)'}
                            {s.is_hidden ? ' [HIDDEN]' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unassigned Series Quick Tray */}
        {unassignedSeries.length > 0 && (
          <div className="mt-6 bg-black/60 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Unassigned Series ({unassignedSeries.length} not shown on Home Page rows)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedSeries.map((s: any) => (
                <span
                  key={s.slug}
                  className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg"
                >
                  {s.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSaveHome}
        disabled={isSaving}
        className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors shadow-[0_0_25px_rgba(254,154,0,0.3)] cursor-pointer disabled:opacity-50"
      >
        {isSaving ? 'SAVING HOME LAYOUT...' : 'Save Complete Layout'}
      </button>
    </div>
  );
};