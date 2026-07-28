import React, { useState, useEffect } from 'react';
import { X, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// --- ULTRA-MODERN CSS PATTERN GENERATOR ---
const getPatternStyle = (color: string, pattern: string) => {
  const baseColor = color || '#18181b';
  const darkLine = 'rgba(0,0,0,0.15)'; 
  const lightGlow = 'rgba(255,255,255,0.15)';

  if (pattern === 'dots') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(${darkLine} 1px, transparent 1px)`, backgroundSize: '10px 10px' };
  if (pattern === 'pinstripes') return { backgroundColor: baseColor, backgroundImage: `repeating-linear-gradient(45deg, ${darkLine} 0, ${darkLine} 1px, transparent 1px, transparent 8px)` };
  if (pattern === 'mesh') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(${darkLine} 1px, transparent 1px), linear-gradient(90deg, ${darkLine} 1px, transparent 1px)`, backgroundSize: '14px 14px' };
  if (pattern === 'glow') return { backgroundColor: baseColor, backgroundImage: `radial-gradient(circle at 50% 0%, ${lightGlow} 0%, transparent 70%)` };
  if (pattern === 'cut') return { backgroundColor: baseColor, backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.04) 50%, transparent 50%)` };
  
  return { backgroundColor: baseColor }; 
};

const POSITION_PRESETS = [
  { label: 'Top Left', value: '0% 0%' }, { label: 'Top Center', value: '50% 0%' }, { label: 'Top Right', value: '100% 0%' },
  { label: 'Center Left', value: '0% 50%' }, { label: 'Center', value: '50% 50%' }, { label: 'Center Right', value: '100% 50%' },
  { label: 'Bottom Left', value: '0% 100%' }, { label: 'Bottom Center', value: '50% 100%' }, { label: 'Bottom Right', value: '100% 100%' },
];

export const SeriesEditor = ({ Dropzone }: any) => {
  const [targetSeries, setTargetSeries] = useState('new');
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  const [existingCreators, setExistingCreators] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ 
    seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', 
    bannerPositionDesktop: '50% 50%', bannerPositionMobile: '50% 50%',
    bannerScaleDesktop: 100, bannerScaleMobile: 100,
    characterAlign: 'center', characterScale: 140,
    logoScale: 100, logoOffset: 16,
    cardColor: '#18181b', cardPattern: 'none',
    synopsis: '', awards: '', hasAwards: false, 
    creators: [{ role: 'Creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }] 
  });

  useEffect(() => {
    const fetchAllCreators = async () => {
      const { data } = await supabase.from('series_creators').select('*');
      if (data) {
        const uniqueCreators: any[] = [];
        const map = new Map();
        
        for (const c of data) {
          if (c.name) {
            const normalizedName = c.name.trim().toLowerCase();
            if (!map.has(normalizedName)) {
              map.set(normalizedName, true);
              uniqueCreators.push({
                name: c.name.trim(), 
                role: c.role, flagCode: c.flag_code, 
                avatar: c.avatar_url, bio: c.bio, twitter: c.twitter_url, 
                instagram: c.instagram_url, supportLink: c.support_url
              });
            }
          }
        }
        
        uniqueCreators.sort((a, b) => a.name.localeCompare(b.name));
        setExistingCreators(uniqueCreators);
      }
    };
    fetchAllCreators();
  }, []);

  useEffect(() => {
    const fetchSeriesData = async () => {
      if (targetSeries === 'new') {
        setFormData({ 
          seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', 
          bannerPositionDesktop: '50% 50%', bannerPositionMobile: '50% 50%',
          bannerScaleDesktop: 100, bannerScaleMobile: 100,
          characterAlign: 'center', characterScale: 140, logoScale: 100, logoOffset: 16, 
          cardColor: '#18181b', cardPattern: 'none',
          synopsis: '', awards: '', hasAwards: false, 
          creators: [{ role: 'Creator', name: '', flagCode: '', avatar: '', bio: '', instagram: '', twitter: '', supportLink: '', is_visible: true }] 
        });
      } else {
        const selectedSeries = seriesList.find((s: any) => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries).order('id', { ascending: true });
          
          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) { 
            loadedCreators = creatorData.map(c => ({ 
              role: c.role || 'Creator', name: c.name || '', flagCode: c.flag_code || '', 
              avatar: c.avatar_url || '', bio: c.bio || '', twitter: c.twitter_url || '', 
              instagram: c.instagram_url || '', supportLink: c.support_url || '', is_visible: c.is_visible !== false
            })); 
          } else { 
            loadedCreators = [{ role: 'Creator', name: selectedSeries.creator_name || '', flagCode: selectedSeries.flag_code || '', avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', is_visible: true }]; 
          }
          
          setFormData({ 
            seriesTitle: selectedSeries.title || '', bannerUrl: selectedSeries.cover_url || '', 
            bannerPositionDesktop: selectedSeries.banner_position_desktop || '50% 50%',
            bannerPositionMobile: selectedSeries.banner_position_mobile || '50% 50%',
            bannerScaleDesktop: selectedSeries.banner_scale_desktop || 100,
            bannerScaleMobile: selectedSeries.banner_scale_mobile || 100,
            logoUrl: selectedSeries.logo_url || '', characterUrl: selectedSeries.character_url || '', 
            characterAlign: selectedSeries.character_align || 'center',
            characterScale: selectedSeries.character_scale || 140,
            logoScale: selectedSeries.logo_scale ?? 100,
            logoOffset: selectedSeries.logo_offset ?? 16,
            cardColor: selectedSeries.card_color || '#18181b',
            cardPattern: selectedSeries.card_pattern || 'none',
            synopsis: selectedSeries.synopsis || '', awards: selectedSeries.awards || '', 
            hasAwards: selectedSeries.has_awards || false, creators: loadedCreators 
          });
        }
      }
    };
    fetchSeriesData();
  }, [targetSeries, seriesList]);

  const handleInputChange = (field: any, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const handleSaveSeries = async () => {
    setIsSaving(true);
    try {
      const slug = formData.seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const activeSlug = targetSeries === 'new' ? slug : targetSeries;
      const primaryCreator = formData.creators[0]; 

      const { error: seriesError } = await supabase.from('series').upsert({ 
        slug: activeSlug, title: formData.seriesTitle, synopsis: formData.synopsis, 
        cover_url: formData.bannerUrl, 
        banner_position_desktop: formData.bannerPositionDesktop, 
        banner_position_mobile: formData.bannerPositionMobile,
        banner_scale_desktop: formData.bannerScaleDesktop,
        banner_scale_mobile: formData.bannerScaleMobile,
        logo_url: formData.logoUrl, character_url: formData.characterUrl, 
        character_align: formData.characterAlign, character_scale: formData.characterScale,
        logo_scale: formData.logoScale, logo_offset: formData.logoOffset,
        card_color: formData.cardColor, card_pattern: formData.cardPattern,
        awards: formData.hasAwards ? formData.awards : null, has_awards: formData.hasAwards, 
        creator_name: primaryCreator.name, flag_code: primaryCreator.flagCode, creator_avatar: primaryCreator.avatar, 
        creator_bio: primaryCreator.bio, creator_twitter: primaryCreator.twitter, creator_instagram: primaryCreator.instagram, 
        creator_support_link: primaryCreator.supportLink, updated_at: new Date().toISOString() 
      }, { onConflict: 'slug' });

      if (seriesError) throw seriesError;

      const { error: deleteError } = await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('series_creators').insert(formData.creators.map(c => ({ 
        series_slug: activeSlug, role: c.role || 'Creator', name: c.name, flag_code: c.flagCode, 
        bio: c.bio, avatar_url: c.avatar, twitter_url: c.twitter, instagram_url: c.instagram, 
        support_url: c.supportLink, is_visible: c.is_visible 
      })));
      if (insertError) throw insertError;
  
      alert(`SUCCESS! Series Saved.`);
    } catch (error: any) { 
      console.error("Database Save Error:", error);
      alert(`FAILED TO SAVE! Supabase returned: ${error.message}`); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm("Delete this series?")) return;
    try { 
      await supabase.from('series').delete().eq('slug', targetSeries); 
      alert("Deleted!"); setTargetSeries('new'); 
    } catch (error: any) { alert('Failed: ' + error.message); }
  };

  const activePosition = previewDevice === 'desktop' ? formData.bannerPositionDesktop : formData.bannerPositionMobile;
  const activeScale = previewDevice === 'desktop' ? formData.bannerScaleDesktop : formData.bannerScaleMobile;
  
  const posParts = activePosition.split(' ');
  const xVal = parseInt(posParts[0]) || 50;
  const yVal = parseInt(posParts[1]) || 50;
  
  const updatePosition = (newPos: string) => {
    handleInputChange(previewDevice === 'desktop' ? 'bannerPositionDesktop' : 'bannerPositionMobile', newPos);
  };

  const updateScale = (newScale: number) => {
    handleInputChange(previewDevice === 'desktop' ? 'bannerScaleDesktop' : 'bannerScaleMobile', newScale);
  };

  const handleAutofillCreator = (index: number, selectedName: string) => {
    if (!selectedName) return;
    const found = existingCreators.find(c => c.name === selectedName);
    if (found) {
      const nc = [...formData.creators];
      nc[index] = { ...nc[index], ...found, role: nc[index].role || found.role || 'Creator' };
      handleInputChange('creators', nc);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Editor Mode</label>
          <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
            <option value="new">+ CREATE NEW SERIES</option>
            {seriesList.map((s: any) => <option key={s.id} value={s.slug}>{s.title}</option>)}
          </select>
        </div>
        {targetSeries !== 'new' && (<button onClick={handleDeleteSeries} className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-colors">Delete</button>)}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
        <div className="border-b border-zinc-800 pb-6">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Series Title</label>
          <input type="text" value={formData.seriesTitle} onChange={(e) => handleInputChange('seriesTitle', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold" />
        </div>
        
        {/* --- HERO BANNER & PREVIEW SECTION --- */}
        <div className="border-b border-zinc-800 pb-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[#fe9a00] uppercase text-xs">Series Hero Banner</h3>
             {formData.bannerUrl && (
               <button type="button" onClick={() => { if(window.confirm("Remove this Banner?")) handleInputChange('bannerUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1">
                 <Trash2 className="w-3 h-3" /> Remove Banner
               </button>
             )}
           </div>
           
           <Dropzone label={formData.bannerUrl ? "Replace Banner" : "+ Add Banner"} height="p-6" folderPath="series-banners" onUploadComplete={(url: any) => handleInputChange('bannerUrl', url)} />
           
           {formData.bannerUrl && (
             <div className="mt-6 bg-black p-4 sm:p-6 rounded-xl border border-zinc-800 space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Banner Alignment & Zoom</span>
                 <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-700 w-max">
                   <button onClick={() => setPreviewDevice('desktop')} type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${previewDevice === 'desktop' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}>
                     <Monitor className="w-3 h-3" /> Desktop
                   </button>
                   <button onClick={() => setPreviewDevice('mobile')} type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${previewDevice === 'mobile' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}>
                     <Smartphone className="w-3 h-3" /> Mobile
                   </button>
                 </div>
               </div>

               <div className="flex justify-center bg-zinc-900 rounded-lg p-4 border border-zinc-800 overflow-hidden">
                 <div className={`relative overflow-hidden bg-black border border-zinc-700 shadow-xl transition-all duration-300 ${previewDevice === 'desktop' ? 'w-full aspect-[21/9] sm:aspect-[3/1] rounded-xl' : 'w-[200px] sm:w-[240px] aspect-[4/5] rounded-3xl'}`}>
                   <img 
                     src={formData.bannerUrl} 
                     alt="Banner Preview" 
                     className="w-full h-full object-cover transition-all duration-300"
                     style={{ 
                       objectPosition: activePosition,
                       transform: `scale(${activeScale / 100})`
                     }}
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                 </div>
               </div>

               <div className="flex flex-col md:flex-row gap-6">
                 <div className="w-full md:w-1/2">
                   <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">Quick Focal Point</label>
                   <div className="grid grid-cols-3 gap-2">
                     {POSITION_PRESETS.map((preset) => (
                       <button
                         key={preset.value} type="button" onClick={() => updatePosition(preset.value)}
                         className={`p-2 text-[9px] font-black uppercase tracking-wider rounded transition-colors border ${activePosition === preset.value ? 'bg-[#fe9a00] text-black border-[#fe9a00]' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
                       >
                         {preset.label}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="w-full md:w-1/2 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                   <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fine-Tune Controls</label>
                   
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold text-zinc-400 w-12 text-right">Zoom</span>
                     <input type="range" min="100" max="300" value={activeScale} onChange={(e) => updateScale(Number(e.target.value))} className="flex-1 accent-[#fe9a00]" />
                     <span className="text-[10px] font-black text-white w-8">{activeScale}%</span>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold text-zinc-400 w-12 text-right">X-Axis</span>
                     <input type="range" min="0" max="100" value={xVal} onChange={(e) => updatePosition(`${e.target.value}% ${yVal}%`)} className="flex-1 accent-[#fe9a00]" />
                     <span className="text-[10px] font-black text-white w-8">{xVal}%</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold text-zinc-400 w-12 text-right">Y-Axis</span>
                     <input type="range" min="0" max="100" value={yVal} onChange={(e) => updatePosition(`${xVal}% ${e.target.value}%`)} className="flex-1 accent-[#fe9a00]" />
                     <span className="text-[10px] font-black text-white w-8">{yVal}%</span>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>

        {/* --- CARD STYLING SECTION --- */}
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Card Background Color</label>
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded p-2">
              <input 
                type="color" 
                value={formData.cardColor} 
                onChange={(e) => handleInputChange('cardColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <span className="text-xs text-white font-mono uppercase">{formData.cardColor}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {['#18181b', '#fe9a00', '#dc2626', '#3b82f6', '#16a34a', '#a855f7', '#4f46e5', '#db2777'].map(color => (
                <button 
                  key={color} 
                  type="button"
                  onClick={() => handleInputChange('cardColor', color)}
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Card Pattern</label>
            <select 
              value={formData.cardPattern} 
              onChange={(e) => handleInputChange('cardPattern', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00]"
            >
              <option value="none">Solid Color (None)</option>
              <option value="dots">Micro Dots</option>
              <option value="pinstripes">Subtle Pinstripes</option>
              <option value="mesh">Fine Mesh</option>
              <option value="glow">Top Glow Aura</option>
              <option value="cut">Diagonal Cut</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-zinc-800 pb-6">
           <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between mb-2">
               <h3 className="font-bold text-[#fe9a00] uppercase text-xs">Logo</h3>
               {formData.logoUrl && (
                 <button type="button" onClick={() => { if(window.confirm("Remove this Logo?")) handleInputChange('logoUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1">
                   <Trash2 className="w-3 h-3" /> Remove Logo
                 </button>
               )}
             </div>
             
             {formData.logoUrl && <img src={formData.logoUrl} className="h-16 mb-3 bg-black p-2 rounded object-contain border border-zinc-800" alt="Logo" />}
             
             <Dropzone label={formData.logoUrl ? "Replace Logo" : "+ Add Logo"} folderPath="series-logos" onUploadComplete={(url: any) => handleInputChange('logoUrl', url)} />
             
             <div className="flex gap-4 w-full mt-2">
               <div className="flex-1">
                 <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Zoom ({formData.logoScale ?? 100}%)</label>
                 <input type="range" min="30" max="200" value={formData.logoScale ?? 100} onChange={(e) => handleInputChange('logoScale', parseInt(e.target.value))} className="w-full accent-[#fe9a00] cursor-pointer" />
               </div>
               <div className="flex-1">
                 <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Placement ({formData.logoOffset ?? 16}px)</label>
                 <input type="range" min="0" max="150" value={formData.logoOffset ?? 16} onChange={(e) => handleInputChange('logoOffset', parseInt(e.target.value))} className="w-full accent-[#fe9a00] cursor-pointer" />
               </div>
             </div>
           </div>
           
           <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-[#fe9a00] uppercase text-xs">Character Render</h3>
               {formData.characterUrl && (
                 <button type="button" onClick={() => { if(window.confirm("Remove this Render?")) handleInputChange('characterUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1">
                   <Trash2 className="w-3 h-3" /> Remove Render
                 </button>
               )}
             </div>

             <div className="flex gap-4">
               <div className="flex-1 flex flex-col gap-4">
                 <Dropzone label={formData.characterUrl ? "Replace Character" : "+ Add Character"} folderPath="series-characters" onUploadComplete={(url: any) => handleInputChange('characterUrl', url)} />
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Alignment</label>
                   <select value={formData.characterAlign} onChange={(e) => handleInputChange('characterAlign', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-[#fe9a00]">
                     <option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Zoom ({formData.characterScale || 140}%)</label>
                   <input type="range" min="50" max="250" value={formData.characterScale || 140} onChange={(e) => handleInputChange('characterScale', parseInt(e.target.value))} className="w-full accent-[#fe9a00] cursor-pointer" />
                 </div>
               </div>

               {formData.characterUrl && (
                 <div className="w-24 sm:w-32 flex-shrink-0 flex flex-col items-center">
                   <div className="flex justify-between items-center w-full mb-2 px-1">
                     <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Live Preview</span>
                     <button type="button" onClick={() => { if(window.confirm("Remove this Render?")) handleInputChange('characterUrl', '') }} className="text-[8px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Clear</button>
                   </div>
                   <div 
                     className="w-full relative overflow-hidden rounded-md aspect-[2/3] border border-zinc-800 shadow-lg group/charpreview"
                     style={getPatternStyle(formData.cardColor, formData.cardPattern)}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                     
                     <img 
                       src={formData.characterUrl} alt="Preview" 
                       className={`absolute left-1/2 -translate-x-1/2 max-w-none object-contain z-10 transition-all duration-300 ${formData.characterAlign === 'top' ? 'top-0' : formData.characterAlign === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}`}
                       style={{ width: `${formData.characterScale || 140}%`, height: '120%' }}
                     />
                     <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
                     
                     {formData.logoUrl && (
                       <div className="absolute left-0 right-0 flex justify-center z-30 px-2 transition-all duration-300" style={{ bottom: `${formData.logoOffset ?? 16}px` }}>
                         <img src={formData.logoUrl} alt="Logo" className="max-h-24 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" style={{ width: `${formData.logoScale ?? 100}%` }} />
                       </div>
                     )}

                     <div className="absolute inset-0 bg-black/80 z-40 opacity-0 group-hover/charpreview:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm cursor-pointer" onClick={() => { if(window.confirm("Remove this Render?")) handleInputChange('characterUrl', '') }}>
                       <div className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                         <Trash2 className="w-6 h-6" />
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Synopsis</label>
          <textarea rows={3} value={formData.synopsis} onChange={(e) => handleInputChange('synopsis', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm" />
        </div>
        
        <div className="bg-black p-4 rounded border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={formData.hasAwards} onChange={(e) => handleInputChange('hasAwards', e.target.checked)} className="accent-[#fe9a00] w-4 h-4" />
            <label className="text-[10px] font-bold text-white uppercase tracking-widest">Enable Awards</label>
          </div>
          {formData.hasAwards && (<input type="text" placeholder="e.g., 2025 Bronze Award Winner" value={formData.awards || ''} onChange={(e) => handleInputChange('awards', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />)}
        </div>
        
        <div className="border-t border-zinc-800 pt-6">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-[#fe9a00] uppercase text-xs tracking-widest">Creators</h3>
             <div className="flex items-center gap-2">
               {formData.creators.length > 1 && (
                 <button type="button" onClick={() => { 
                   const nc = [...formData.creators]; 
                   const temp = nc[0]; 
                   nc[0] = nc[1]; 
                   nc[1] = temp; 
                   handleInputChange('creators', nc); 
                 }} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-800 px-3 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
                   Swap Order
                 </button>
               )}
               <button onClick={() => { 
                 if (formData.creators.length > 1 && !window.confirm("Are you sure you want to remove this co-creator?")) return;
                 const nc = formData.creators.length > 1 ? [formData.creators[0]] : [...formData.creators, { role: 'Co-creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }]; 
                 handleInputChange('creators', nc); 
               }} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-800 px-3 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
                 {formData.creators.length > 1 ? '- Remove Co-creator' : '+ Add Co-creator'}
               </button>
             </div>
           </div>
           
           <div className={`grid ${formData.creators.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
             {formData.creators.map((c, i) => (
                <div key={i} className="bg-black p-4 rounded border border-zinc-800 space-y-4 relative">
                  
                  <div className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-700 mb-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Bingo Visibility</span>
                    <button type="button" onClick={() => { const nc = [...formData.creators]; nc[i].is_visible = nc[i].is_visible === false ? true : false; handleInputChange('creators', nc); }} className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-colors ${c.is_visible !== false ? 'bg-green-900/30 text-green-500 hover:bg-green-900/50' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                      {c.is_visible !== false ? 'Visible' : 'Hidden'}
                    </button>
                  </div>

                  <select 
                    className="w-full bg-black border border-[#fe9a00]/30 text-[#fe9a00] rounded p-2 text-[10px] font-bold uppercase tracking-widest"
                    onChange={(e) => handleAutofillCreator(i, e.target.value)}
                    value=""
                  >
                    <option value="" disabled>-- Quick Fill: Select Existing Creator --</option>
                    {existingCreators.map(ec => (
                      <option key={ec.name} value={ec.name} className="text-white bg-zinc-900">{ec.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Role (e.g., Creator)" value={c.role} onChange={(e) => { const nc = [...formData.creators]; nc[i].role = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Full Name" value={c.name} onChange={(e) => { const nc = [...formData.creators]; nc[i].name = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Flag Code (e.g., BR)" value={c.flagCode} onChange={(e) => { const nc = [...formData.creators]; nc[i].flagCode = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    {c.avatar ? (
                      <div className="relative group/avatar w-16 h-16 flex-shrink-0 cursor-pointer">
                        <img src={c.avatar} className="w-16 h-16 rounded-full object-cover border border-zinc-700" alt="Avatar" />
                        <button type="button" onClick={() => { if(window.confirm("Remove this Avatar?")) { const nc = [...formData.creators]; nc[i].avatar = ''; handleInputChange('creators', nc); } }} className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"><X className="w-6 h-6 text-red-500" /></button>
                      </div>
                    ) : (
                      <div className="w-24 flex-shrink-0"><Dropzone label="+ Avatar" folderPath="avatars" onUploadComplete={(url: any) => { const nc = [...formData.creators]; nc[i].avatar = url; handleInputChange('creators', nc); }} /></div>
                    )}
                    <textarea placeholder="Creator Bio..." value={c.bio} onChange={(e) => { const nc = [...formData.creators]; nc[i].bio = e.target.value; handleInputChange('creators', nc); }} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs h-20" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Twitter URL" value={c.twitter} onChange={(e) => { const nc = [...formData.creators]; nc[i].twitter = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Instagram URL" value={c.instagram} onChange={(e) => { const nc = [...formData.creators]; nc[i].instagram = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Support URL" value={c.supportLink} onChange={(e) => { const nc = [...formData.creators]; nc[i].supportLink = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                  </div>
                </div>
             ))}
           </div>
        </div>
        <button onClick={handleSaveSeries} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded mt-4 hover:bg-white transition-colors">
          {isSaving ? 'SAVING...' : 'Save Series Details'}
        </button>
      </div>
    </div>
  );
};