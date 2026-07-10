import React, { useState, useEffect } from 'react';
import { X, Crop, BookOpen, MoveHorizontal } from 'lucide-react';
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

  useEffect(() => {
    const fetchSeriesData = async () => {
      if (targetSeries === 'new') {
        setFormData({ seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', synopsis: '', awards: '', hasAwards: false, creators: [{ role: 'Creator', name: '', flagCode: '', avatar: '', bio: '', instagram: '', twitter: '', supportLink: '', is_visible: true }] });
      } else {
        const selectedSeries = seriesList.find(s => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries);
          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) { 
            loadedCreators = creatorData.map(c => ({ 
              role: c.role || 'Creator', name: c.name || '', flagCode: c.flag_code || '', avatar: c.avatar_url || '', bio: c.bio || '', twitter: c.twitter_url || '', instagram: c.instagram_url || '', supportLink: c.support_url || '', is_visible: c.is_visible !== false 
            })); 
          } else { 
            loadedCreators = [{ role: 'Creator', name: selectedSeries.creator_name || '', flagCode: selectedSeries.flag_code || '', avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', is_visible: true }]; 
          }
          setFormData({ seriesTitle: selectedSeries.title || '', bannerUrl: selectedSeries.cover_url || '', logoUrl: selectedSeries.logo_url || '', characterUrl: selectedSeries.character_url || '', synopsis: selectedSeries.synopsis || '', awards: selectedSeries.awards || '', hasAwards: selectedSeries.has_awards || false, creators: loadedCreators });
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
      await supabase.from('series').upsert({ slug: activeSlug, title: formData.seriesTitle, synopsis: formData.synopsis, cover_url: formData.bannerUrl, logo_url: formData.logoUrl, character_url: formData.characterUrl, awards: formData.hasAwards ? formData.awards : null, has_awards: formData.hasAwards, creator_name: primaryCreator.name, flag_code: primaryCreator.flagCode, creator_avatar: primaryCreator.avatar, creator_bio: primaryCreator.bio, creator_twitter: primaryCreator.twitter, creator_instagram: primaryCreator.instagram, creator_support_link: primaryCreator.supportLink, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
      await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      await supabase.from('series_creators').insert(formData.creators.map(c => ({ series_slug: activeSlug, role: c.role, name: c.name, flag_code: c.flagCode, bio: c.bio, avatar_url: c.avatar, twitter_url: c.twitter, instagram_url: c.instagram, support_url: c.supportLink, is_visible: c.is_visible })));
      alert(`SUCCESS! Saved.`);
    } catch (error: any) { alert("Failed: " + error.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Target Selector */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4 shadow-md">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2 tracking-widest">Editor Mode</label>
          <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
            <option value="new">+ CREATE NEW SERIES</option>
            {seriesList.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
          </select>
        </div>
      </div>
      
      {/* Form Body - You can copy the rest of your existing SeriesEditor JSX here */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6">Series Details</h3>
        {/* ... Paste your existing form fields here ... */}
        <button onClick={handleSaveSeries} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded mt-4 hover:bg-white transition-colors">{isSaving ? 'SAVING...' : 'Save Series'}</button>
      </div>
    </div>
  );
};