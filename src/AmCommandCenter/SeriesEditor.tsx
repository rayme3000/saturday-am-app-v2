import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

export const SeriesEditor = ({ Dropzone }: any) => {
  const [targetSeries, setTargetSeries] = useState('new');
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', 
    synopsis: '', awards: '', hasAwards: false, 
    creators: [{ role: 'Creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }] 
  });

  // Load existing series data when selected
  useEffect(() => {
    const fetchSeriesData = async () => {
      if (targetSeries === 'new') {
        setFormData({ seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false, creators: [{ role: 'Creator', name: '', flagCode: '', avatar: '', bio: '', instagram: '', twitter: '', supportLink: '', is_visible: true }] });
      } else {
        const selectedSeries = seriesList.find((s: any) => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries);
          
          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) { 
            loadedCreators = creatorData.map(c => ({ 
              role: c.role || 'Creator', 
              name: c.name || '', 
              flagCode: c.flag_code || '', 
              avatar: c.avatar_url || '', 
              bio: c.bio || '', 
              twitter: c.twitter_url || '', 
              instagram: c.instagram_url || '', 
              supportLink: c.support_url || '', 
              is_visible: c.is_visible !== false // True unless explicitly false
            })); 
          } else { 
            loadedCreators = [{ role: 'Creator', name: selectedSeries.creator_name || '', flagCode: selectedSeries.flag_code || '', avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', is_visible: true }]; 
          }
          
          setFormData({ 
            seriesTitle: selectedSeries.title || '', 
            bannerUrl: selectedSeries.cover_url || '', 
            logoUrl: selectedSeries.logo_url || '', 
            characterUrl: selectedSeries.character_url || '', 
            synopsis: selectedSeries.synopsis || '', 
            awards: selectedSeries.awards || '', 
            hasAwards: selectedSeries.has_awards || false, 
            creators: loadedCreators 
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

      await supabase.from('series').upsert({ 
        slug: activeSlug, 
        title: formData.seriesTitle, 
        synopsis: formData.synopsis, 
        cover_url: formData.bannerUrl, 
        logo_url: formData.logoUrl, 
        character_url: formData.characterUrl, 
        awards: formData.hasAwards ? formData.awards : null, 
        has_awards: formData.hasAwards, 
        creator_name: primaryCreator.name, 
        flag_code: primaryCreator.flagCode, 
        creator_avatar: primaryCreator.avatar, 
        creator_bio: primaryCreator.bio, 
        creator_twitter: primaryCreator.twitter, 
        creator_instagram: primaryCreator.instagram, 
        creator_support_link: primaryCreator.supportLink, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'slug' });

      await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      
      await supabase.from('series_creators').insert(formData.creators.map(c => ({ 
        series_slug: activeSlug, 
        role: c.role || 'Creator', 
        name: c.name, 
        flag_code: c.flagCode, 
        bio: c.bio, 
        avatar_url: c.avatar, 
        twitter_url: c.twitter, 
        instagram_url: c.instagram, 
        support_url: c.supportLink, 
        is_visible: c.is_visible 
      })));
  
      alert(`SUCCESS! Series Saved.`);
    } catch (error: any) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm("Delete this series?")) return;
    try { 
      await supabase.from('series').delete().eq('slug', targetSeries); 
      alert("Deleted!"); 
      setTargetSeries('new'); 
    } catch (error: any) { alert('Failed: ' + error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Target Selector */}
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
        
        <div>
           <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Series Banner</h3>
           {formData.bannerUrl && <img src={formData.bannerUrl} className="w-full h-32 object-cover rounded-lg mb-3" alt="Banner" />}
           <Dropzone label="+ Add Banner" height="p-6" folderPath="series-banners" onUploadComplete={(url: any) => handleInputChange('bannerUrl', url)} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
           <div>
             <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Logo</h3>
             {formData.logoUrl && <img src={formData.logoUrl} className="h-16 mb-3 bg-black p-2 rounded" alt="Logo" />}
             <Dropzone label="+ Add Logo" folderPath="series-logos" onUploadComplete={(url: any) => handleInputChange('logoUrl', url)} />
           </div>
           <div>
             <h3 className="font-bold text-[#fe9a00] mb-2 uppercase text-xs">Character Render</h3>
             {formData.characterUrl && <img src={formData.characterUrl} className="h-16 mb-3 bg-black p-2 rounded" alt="Character" />}
             <Dropzone label="+ Add Character" folderPath="series-characters" onUploadComplete={(url: any) => handleInputChange('characterUrl', url)} />
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
             <button onClick={() => { const nc = formData.creators.length > 1 ? [formData.creators[0]] : [...formData.creators, { role: 'Co-creator', name: '', bio: '', flagCode: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }]; handleInputChange('creators', nc); }} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-800 px-3 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors">
               {formData.creators.length > 1 ? '- Remove Co-creator' : '+ Add Co-creator'}
             </button>
           </div>
           
           <div className={`grid ${formData.creators.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
             {formData.creators.map((c, i) => (
                <div key={i} className="bg-black p-4 rounded border border-zinc-800 space-y-4 relative">
                  
                  {/* BINGO VISIBILITY TOGGLE RESTORED */}
                  <div className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-700 mb-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Bingo Visibility</span>
                    <button 
                      type="button"
                      onClick={() => { 
                        const nc = [...formData.creators]; 
                        nc[i].is_visible = nc[i].is_visible === false ? true : false; 
                        handleInputChange('creators', nc); 
                      }}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-colors ${c.is_visible !== false ? 'bg-green-900/30 text-green-500 hover:bg-green-900/50' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                    >
                      {c.is_visible !== false ? 'Visible' : 'Hidden'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Role (e.g., Creator)" value={c.role} onChange={(e) => { const nc = [...formData.creators]; nc[i].role = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Full Name" value={c.name} onChange={(e) => { const nc = [...formData.creators]; nc[i].name = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                    <input type="text" placeholder="Flag Code (e.g., US)" value={c.flagCode} onChange={(e) => { const nc = [...formData.creators]; nc[i].flagCode = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    {c.avatar ? (
                      <div className="relative group/avatar w-16 h-16 flex-shrink-0 cursor-pointer">
                        <img src={c.avatar} className="w-16 h-16 rounded-full object-cover border border-zinc-700" alt="Creator Avatar" />
                        <button 
                          type="button"
                          onClick={() => { const nc = [...formData.creators]; nc[i].avatar = ''; handleInputChange('creators', nc); }} 
                          className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                        >
                          <X className="w-6 h-6 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 flex-shrink-0">
                        <Dropzone label="+ Avatar" folderPath="avatars" onUploadComplete={(url: any) => { const nc = [...formData.creators]; nc[i].avatar = url; handleInputChange('creators', nc); }} />
                      </div>
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