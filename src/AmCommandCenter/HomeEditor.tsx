import React, { useState, useEffect } from 'react';
import { X, MoveVertical } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';


export const HomeEditor = ({ Dropzone }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionSeries, setSectionSeries] = useState<any>({});
  
  const [availableMagazines, setAvailableMagazines] = useState<any[]>([]);
  const [featuredMagazines, setFeaturedMagazines] = useState<any[]>([]);

  useEffect(() => {
    const fetchLayoutData = async () => {
      const { data: slideData } = await supabase.from('hero_slides').select('*').order('id', { ascending: true });
      if (slideData && slideData.length > 0) {
        setSlides(slideData.map(s => ({ id: s.id, desktop_url: s.desktop_url || '', mobile_url: s.mobile_url || '', linkType: s.link_type || 'series', linkTarget: s.link_target || '' })));
      } else {
        setSlides([{ id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
      }
      const { data: sectionData } = await supabase.from('home_sections').select('*').order('display_order', { ascending: true });
      if (sectionData) {
        setSections(sectionData);
        const mapping: any = {};
        sectionData.forEach(sec => { mapping[sec.title] = seriesList.filter(s => s.home_section === sec.title).sort((a, b) => (a.display_order || 99) - (b.display_order || 99)); });
        setSectionSeries(mapping);
      }
      
      const { data: magData } = await supabase.from('magazines').select('*').order('publish_date', { ascending: false });
      if (magData) {
        setAvailableMagazines(magData);
        setFeaturedMagazines(magData.filter(m => m.home_section === 'Featured').sort((a,b) => (a.display_order || 99) - (b.display_order || 99)));
      }
    };
    if (seriesList.length > 0) fetchLayoutData();
  }, [seriesList]);

  const addSlide = () => setSlides([...slides, { id: Date.now(), linkType: 'series', linkTarget: '', desktop_url: '', mobile_url: '' }]);
  const removeSlide = (idToRemove: any) => setSlides(slides.filter(slide => slide.id !== idToRemove));
  const updateSlide = (id: any, field: any, value: any) => setSlides(slides.map(slide => slide.id === id ? { ...slide, [field]: value } : slide));
  
  const createSection = () => {
    const title = window.prompt("Enter new section title:");
    if (title && !sections.find(s => s.title === title)) { setSections([...sections, { title }]); setSectionSeries({ ...sectionSeries, [title]: [] }); }
  };
  const removeSection = (titleToRemove: any) => {
    if (!window.confirm(`Delete the "${titleToRemove}" section?`)) return;
    setSections(sections.filter(s => s.title !== titleToRemove));
    const newMapping = { ...sectionSeries }; delete newMapping[titleToRemove]; setSectionSeries(newMapping);
  };
  const moveSection = (index: number, direction: string) => {
    const newArr = [...sections];
    if (direction === 'up' && index > 0) [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    if (direction === 'down' && index < newArr.length - 1) [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    setSections(newArr);
  };
  const handleAddSeries = (sectionTitle: any, seriesSlug: any) => {
    if (!seriesSlug) return;
    const seriesToAdd = seriesList.find(s => s.slug === seriesSlug);
    if (!seriesToAdd || sectionSeries[sectionTitle]?.find((s: any) => s.slug === seriesSlug)) return;
    setSectionSeries({ ...sectionSeries, [sectionTitle]: [...(sectionSeries[sectionTitle] || []), seriesToAdd] });
  };
  const removeSeriesFromSection = (sectionTitle: any, seriesSlug: any) => { setSectionSeries({ ...sectionSeries, [sectionTitle]: sectionSeries[sectionTitle].filter((s: any) => s.slug !== seriesSlug) }); };
  const moveSeries = (sectionTitle: any, index: number, direction: string) => {
    const arr = [...sectionSeries[sectionTitle]];
    if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    setSectionSeries({ ...sectionSeries, [sectionTitle]: arr });
  };

  const handleAddMagazine = (magId: any) => {
    if (!magId) return;
    const magToAdd = availableMagazines.find(m => m.id.toString() === magId.toString());
    if (!magToAdd || featuredMagazines.find((m: any) => m.id === magToAdd.id)) return;
    setFeaturedMagazines([...featuredMagazines, magToAdd]);
  };
  const removeMagazine = (magId: any) => { setFeaturedMagazines(featuredMagazines.filter((m: any) => m.id !== magId)); };
  const moveMagazine = (index: number, direction: string) => {
    const arr = [...featuredMagazines];
    if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    setFeaturedMagazines(arr);
  };

  const handleSaveHome = async () => {
    setIsSaving(true);
    try {
      const { error: slideErr } = await supabase.from('hero_slides').delete().not('id', 'is', null);
      if (slideErr) throw slideErr;

      const validSlides = slides.filter(s => s.desktop_url || s.mobile_url).map(slide => ({ desktop_url: slide.desktop_url, mobile_url: slide.mobile_url, link_type: slide.linkType, link_target: slide.linkTarget }));
      if (validSlides.length > 0) await supabase.from('hero_slides').insert(validSlides);
      
      const { error: secErr } = await supabase.from('home_sections').delete().not('title', 'is', null);
      if (secErr) throw secErr;

      const newSections = sections.map((sec, i) => ({ title: sec.title, display_order: i + 1 }));
      if (newSections.length > 0) await supabase.from('home_sections').insert(newSections);

      const updates: any[] = []; const activeSlugs = new Set();
      Object.entries(sectionSeries).forEach(([sectionTitle, seriesArr]: any) => {
        seriesArr.forEach((s: any, index: number) => { updates.push({ slug: s.slug, home_section: sectionTitle, display_order: index + 1 }); activeSlugs.add(s.slug); });
      });
      seriesList.forEach(s => { if (s.home_section && s.home_section !== 'None' && !activeSlugs.has(s.slug)) updates.push({ slug: s.slug, home_section: 'None', display_order: 99 }); });
      
      for (const u of updates) { 
        const { error: upErr } = await supabase.from('series').update({ home_section: u.home_section, display_order: u.display_order }).eq('slug', u.slug); 
        if (upErr) throw upErr;
      }

      const magUpdates: any[] = [];
      featuredMagazines.forEach((m: any, i: number) => magUpdates.push({ id: m.id, home_section: 'Featured', display_order: i + 1 }));
      availableMagazines.forEach(m => {
        if (!featuredMagazines.find(f => f.id === m.id) && m.home_section === 'Featured') {
          magUpdates.push({ id: m.id, home_section: 'None', display_order: 99 });
        }
      });
      
      for (const u of magUpdates) { 
        const { error: magErr } = await supabase.from('magazines').update({ home_section: u.home_section, display_order: u.display_order }).eq('id', u.id); 
        if (magErr) throw magErr;
      }

      alert("SUCCESS! Home layout has been saved.");
      window.location.reload(); 
    } catch (error: any) { alert('Failed to save layout: ' + error.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Hero Slideshow</h3></div>
          <button onClick={addSlide} className="text-[10px] font-bold bg-zinc-800 px-4 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">+ Add Slide</button>
        </div>
        <div className="space-y-6">
          {slides.map((slide, index) => (
            <div key={slide.id} className="bg-black border border-zinc-800 p-4 rounded-lg relative group">
              {slides.length > 1 && (<button onClick={() => removeSlide(slide.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>)}
              <h4 className="text-[10px] font-bold text-[#fe9a00] mb-4 uppercase tracking-widest">Slide {index + 1}</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  {slide.desktop_url && <img src={slide.desktop_url} alt="Desktop Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone label={slide.desktop_url ? "Replace Desktop" : "+ Desktop Image"} height="p-4" folderPath="hero-banners" onUploadComplete={(url: any) => updateSlide(slide.id, 'desktop_url', url)} />
                </div>
                <div>
                  {slide.mobile_url && <img src={slide.mobile_url} alt="Mobile Preview" className="w-full h-16 object-cover rounded mb-2 border border-zinc-700"/>}
                  <Dropzone label={slide.mobile_url ? "Replace Mobile" : "+ Mobile Image"} height="p-4" folderPath="hero-banners" onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)} />
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4 mt-2">
                <label className="block text-[10px] font-bold text-zinc-400 tracking-widest mb-2">Destination Link</label>
                <div className="flex gap-2">
                  <select value={slide.linkType} onChange={(e) => updateSlide(slide.id, 'linkType', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs w-1/3 focus:border-[#fe9a00]">
                    <option value="series">Specific Series</option><option value="external">External Web URL</option>
                  </select>
                  {slide.linkType === 'external' ? (
                    <input type="text" placeholder="https://..." value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]" />
                  ) : (
                    <select value={slide.linkTarget} onChange={(e) => updateSlide(slide.id, 'linkTarget', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]">
                      <option value="">-- Select Series --</option>
                      {seriesList.map(s => (<option key={s.slug} value={s.slug}>{s.title}</option>))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Featured Magazine Lane (Top)</h3></div>
        </div>
        <div className="bg-black border border-zinc-700 rounded-lg overflow-hidden">
          <div className="p-4 space-y-2">
            {featuredMagazines.map((m: any, mIndex: number) => (
              <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded">
                <div className="flex items-center gap-3"><img src={m.cover_url} alt="" className="w-6 h-8 object-cover rounded bg-zinc-800" /><span className="text-xs font-bold text-white uppercase">{m.title}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => moveMagazine(mIndex, 'up')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                  <button onClick={() => moveMagazine(mIndex, 'down')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => removeMagazine(m.id)} className="p-1 text-zinc-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <select onChange={(e) => { handleAddMagazine(e.target.value); e.target.value = ""; }} className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded p-2 text-zinc-400 text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors">
              <option value="">+ Assign an Issue to the Top Lane...</option>
              {availableMagazines.filter(m => !featuredMagazines.find(f => f.id === m.id)).map(m => (<option key={m.id} value={m.id}>{m.title}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div><h3 className="font-bold text-[#fe9a00] tracking-widest text-xs">Series Layout Builder</h3></div>
          <button onClick={createSection} className="text-[10px] font-bold bg-[#fe9a00] text-black px-4 py-2 rounded hover:bg-white transition-colors">+ Create Section</button>
        </div>
        <div className="space-y-6">
          {sections.map((sec, secIndex) => (
            <div key={sec.title} className="bg-black border border-zinc-700 rounded-lg overflow-hidden">
              <div className="bg-zinc-800 p-3 flex justify-between items-center">
                <h4 className="text-white font-bold text-xs tracking-widest">{sec.title}</h4>
                <div className="flex gap-2">
                  <button onClick={() => moveSection(secIndex, 'up')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                  <button onClick={() => moveSection(secIndex, 'down')} className="text-zinc-400 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => removeSection(sec.title)} className="text-zinc-500 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {sectionSeries[sec.title]?.map((s: any, sIndex: number) => (
                  <div key={s.slug} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded">
                    <div className="flex items-center gap-3"><img src={s.cover_url} alt="" className="w-8 h-8 object-cover rounded bg-zinc-800" /><span className="text-xs font-bold text-white uppercase">{s.title}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => moveSeries(sec.title, sIndex, 'up')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4" /></button>
                      <button onClick={() => moveSeries(sec.title, sIndex, 'down')} className="p-1 text-zinc-500 hover:text-white"><MoveVertical className="w-4 h-4 rotate-180" /></button>
                      <button onClick={() => removeSeriesFromSection(sec.title, s.slug)} className="p-1 text-zinc-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <select onChange={(e) => { handleAddSeries(sec.title, e.target.value); e.target.value = ""; }} className="w-full bg-zinc-900 border border-zinc-700 border-dashed rounded p-2 text-zinc-400 text-xs mt-2 cursor-pointer focus:border-[#fe9a00] transition-colors">
                  <option value="">+ Assign a Series to {sec.title}...</option>
                  {seriesList.filter(s => !sectionSeries[sec.title]?.find((existing: any) => existing.slug === s.slug)).map(s => (<option key={s.slug} value={s.slug}>{s.title}</option>))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={handleSaveHome} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-lg mt-6 hover:bg-white transition-colors">{isSaving ? 'UPDATING...' : 'Save Complete Layout'}</button>
    </div>
  );
};