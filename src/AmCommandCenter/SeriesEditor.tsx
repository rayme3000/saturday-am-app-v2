import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Trash2, Eye, EyeOff, Plus, ChevronDown, ChevronUp, User, X, ArrowUp, ArrowDown, Crop, Calendar, Bell } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

const toLocalDateString = (isoString?: string | null) => {
  const d = isoString ? new Date(isoString) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalTimeString = (isoString?: string | null) => {
  if (!isoString) return '12:00';
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
};

const COUNTRY_CODES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }, { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' }, { code: 'FR', name: 'France' }, 
  { code: 'DE', name: 'Germany' }, { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' }, { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' }, { code: 'MY', name: 'Malaysia' }, { code: 'SG', name: 'Singapore' }, { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' }, { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'EG', name: 'Egypt' }, { code: 'KE', name: 'Kenya' }, { code: 'GH', name: 'Ghana' },
  { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' }, { code: 'PL', name: 'Poland' }, { code: 'SE', name: 'Sweden' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' }, { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
  { code: 'NO', name: 'Norway' }, { code: 'FI', name: 'Finland' }, { code: 'DK', name: 'Denmark' },
  { code: 'IE', name: 'Ireland' }, { code: 'PT', name: 'Portugal' }, { code: 'GR', name: 'Greece' }, { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'IL', name: 'Israel' }, { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Peru' }, { code: 'VE', name: 'Venezuela' },
  { code: 'JM', name: 'Jamaica' }, { code: 'PR', name: 'Puerto Rico' }, { code: 'Bahamas', name: 'Bahamas' }, { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' }, { code: 'KW', name: 'Kuwait' }, { code: 'QA', name: 'Qatar' }, { code: 'BH', name: 'Bahrain' }, 
  { code: 'OM', name: 'Oman' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CU', name: 'Cuba' }, 
  { code: 'SV', name: 'El Salvador' }, { code: 'PA', name: 'Panama' }, { code: 'MG', name: 'Madagascar' }
].sort((a, b) => a.name.localeCompare(b.name));

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

const HEIGHT_PRESETS: string[] = [];
for (let ft = 2; ft <= 10; ft++) {
  for (let in_ = 0; in_ <= 11; in_++) {
    HEIGHT_PRESETS.push(`${ft}'${in_}"`);
  }
}

export const SeriesEditor = ({ Dropzone, ThumbnailCropperModal, setIsDirty }: any) => {
  const [targetSeries, setTargetSeries] = useState('new');
  const { seriesList = [] } = useSeriesData();
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  const [bannerCropper, setBannerCropper] = useState<{ isOpen: boolean; device: 'desktop' | 'mobile' } | null>(null);
  const [charCropperOpen, setCharCropperOpen] = useState(false);

  const [existingCreators, setExistingCreators] = useState<any[]>([]);
  const [expandedCharIndex, setExpandedCharIndex] = useState<number | null>(null);
  const [seriesChapters, setSeriesChapters] = useState<any[]>([]);
  
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ charIndex: number, field: string, altIndex?: number } | null>(null);

  const [formData, setFormData] = useState({ 
    seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', 
    bannerPositionDesktop: '50% 50%', bannerPositionMobile: '50% 50%',
    bannerScaleDesktop: 100, bannerScaleMobile: 100,
    characterAlign: 'center', characterScale: 140,
    logoScale: 100, logoOffset: 16,
    cardColor: '#18181b', cardPattern: 'none',
    synopsis: '', awards: '', hasAwards: false, 
    contentRating: 'T',
    isHidden: false,
    isScheduled: false,
    autoNotify: true,
    publishDate: toLocalDateString(),
    publishTime: '12:00',
    creators: [{ role: 'Creator', name: '', bio: '', flagCode1: '', flagCode2: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }],
    characters: [] as any[] 
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
              const flags = (c.flag_code || '').split(',');
              uniqueCreators.push({
                name: c.name.trim(), 
                role: c.role, 
                flagCode1: flags[0]?.trim() || '', 
                flagCode2: flags[1]?.trim() || '', 
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
        setSeriesChapters([]);
        setFormData({ 
          seriesTitle: '', bannerUrl: '', logoUrl: '', characterUrl: '', 
          bannerPositionDesktop: '50% 50%', bannerPositionMobile: '50% 50%',
          bannerScaleDesktop: 100, bannerScaleMobile: 100,
          characterAlign: 'center', characterScale: 140, logoScale: 100, logoOffset: 16, 
          cardColor: '#18181b', cardPattern: 'none',
          synopsis: '', awards: '', hasAwards: false, 
          contentRating: 'T', 
          isHidden: false,    
          isScheduled: false,
          autoNotify: true,
          publishDate: toLocalDateString(),
          publishTime: '12:00',
          creators: [{ role: 'Creator', name: '', flagCode1: '', flagCode2: '', avatar: '', bio: '', instagram: '', twitter: '', supportLink: '', is_visible: true }],
          characters: [] 
        });
      } else {
        const selectedSeries = seriesList.find((s: any) => s.slug === targetSeries);
        if (selectedSeries) {
          const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSeries).order('id', { ascending: true });
          const { data: charData } = await supabase.from('series_characters').select('*').eq('series_slug', targetSeries).order('id', { ascending: true });
          
          const { data: chapData } = await supabase.from('chapters').select('id, chapter_number, title').eq('series_slug', targetSeries).order('chapter_number', { ascending: true });
          setSeriesChapters(chapData || []);

          let loadedCreators = [];
          if (creatorData && creatorData.length > 0) { 
            loadedCreators = creatorData.map(c => {
              const flags = (c.flag_code || '').split(',');
              return { 
                role: c.role || 'Creator', name: c.name || '', 
                flagCode1: flags[0]?.trim() || '', 
                flagCode2: flags[1]?.trim() || '', 
                avatar: c.avatar_url || '', bio: c.bio || '', twitter: c.twitter_url || '', 
                instagram: c.instagram_url || '', supportLink: c.support_url || '', is_visible: c.is_visible !== false
              };
            }); 
          } else { 
            const flags = (selectedSeries.flag_code || '').split(',');
            loadedCreators = [{ 
              role: 'Creator', name: selectedSeries.creator_name || '', 
              flagCode1: flags[0]?.trim() || '', 
              flagCode2: flags[1]?.trim() || '', 
              avatar: selectedSeries.creator_avatar || '', bio: selectedSeries.creator_bio || '', twitter: selectedSeries.creator_twitter || '', instagram: selectedSeries.creator_instagram || '', supportLink: selectedSeries.creator_support_link || '', is_visible: true 
            }]; 
          }

          const isFutureScheduled = Boolean(selectedSeries.publish_at && new Date(selectedSeries.publish_at).getTime() > Date.now());
          
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
            hasAwards: selectedSeries.has_awards || false, 
            contentRating: selectedSeries.content_rating || 'T', 
            isHidden: selectedSeries.is_hidden || false,
            isScheduled: isFutureScheduled,
            autoNotify: false,
            publishDate: toLocalDateString(selectedSeries.publish_at),
            publishTime: toLocalTimeString(selectedSeries.publish_at),
            creators: loadedCreators,
            characters: charData || [] 
          });
        }
      }
    };
    fetchSeriesData();
  }, [targetSeries, seriesList]);

  const handleInputChange = (field: any, value: any) => { 
    setFormData(prev => ({ ...prev, [field]: value })); 
    if (setIsDirty) setIsDirty(true);
  };

  const handleCharacterChange = (index: number, field: string, value: any) => {
    const newChars = [...formData.characters];
    newChars[index] = { ...newChars[index], [field]: value };
    handleInputChange('characters', newChars);
  };

  const handleAddAltForm = (charIndex: number) => {
    const newChars = [...formData.characters];
    const forms = newChars[charIndex].alt_forms || [];
    newChars[charIndex] = { ...newChars[charIndex], alt_forms: [...forms, { name: '', url: '' }] };
    handleInputChange('characters', newChars);
  };

  const handleAltFormChange = (charIndex: number, altIndex: number, field: string, value: string) => {
    const newChars = [...formData.characters];
    newChars[charIndex].alt_forms[altIndex] = { ...newChars[charIndex].alt_forms[altIndex], [field]: value };
    handleInputChange('characters', newChars);
  };

  const handleRemoveAltForm = (charIndex: number, altIndex: number) => {
    const newChars = [...formData.characters];
    newChars[charIndex].alt_forms.splice(altIndex, 1);
    handleInputChange('characters', newChars);
  };

  const handleAddCharacter = () => {
    handleInputChange('characters', [...formData.characters, {
      name: '', role_type: 'Hero', is_mc: false, element: 'AM', weapon: '',
      headshot_url: '', alt_form_name: '', alt_headshot_url: '', alt_forms: [], age: '', height: '', location: '', ethnicity: '', first_appearance: '', origin: '', powers: '', weakness: '', is_hidden: false
    }]);
    setExpandedCharIndex(formData.characters.length);
  };

  const moveCharacter = (index: number, direction: 'up' | 'down', e: any) => {
    e.stopPropagation();
    if (direction === 'up' && index > 0) {
      const newChars = [...formData.characters];
      [newChars[index - 1], newChars[index]] = [newChars[index], newChars[index - 1]];
      handleInputChange('characters', newChars);
    } else if (direction === 'down' && index < formData.characters.length - 1) {
      const newChars = [...formData.characters];
      [newChars[index], newChars[index + 1]] = [newChars[index + 1], newChars[index]];
      handleInputChange('characters', newChars);
    }
  };

  const handleBannerCropComplete = (croppedArea: any, _croppedAreaPixels: any, zoom: number) => {
    if (!bannerCropper) return;
    const isDesktop = bannerCropper.device === 'desktop';
    
    const relativeX = croppedArea.width < 100 
      ? Math.round((croppedArea.x / (100 - croppedArea.width)) * 100) 
      : 50;

    const relativeY = croppedArea.height < 100 
      ? Math.round((croppedArea.y / (100 - croppedArea.height)) * 100) 
      : 50;

    const safeX = Math.min(100, Math.max(0, relativeX));
    const safeY = Math.min(100, Math.max(0, relativeY));
    const newPos = `${safeX}% ${safeY}%`;
    const newScale = Math.round(zoom * 100);

    if (isDesktop) {
      handleInputChange('bannerPositionDesktop', newPos);
      handleInputChange('bannerScaleDesktop', newScale);
    } else {
      handleInputChange('bannerPositionMobile', newPos);
      handleInputChange('bannerScaleMobile', newScale);
    }

    setBannerCropper(null);
  };

  const handleCharCropComplete = (croppedArea: any, _croppedAreaPixels: any, zoom: number) => {
    const relativeY = croppedArea.height < 100 
      ? Math.round((croppedArea.y / (100 - croppedArea.height)) * 100) 
      : 50;
    
    const align = relativeY < 35 ? 'top' : relativeY > 65 ? 'bottom' : 'center';
    const scale = Math.round(zoom * 140);

    handleInputChange('characterAlign', align);
    handleInputChange('characterScale', scale);
    setCharCropperOpen(false);
  };

  const handleSaveSeries = async () => {
    setIsSaving(true);
    try {
      const slug = formData.seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const activeSlug = targetSeries === 'new' ? slug : targetSeries;
      const primaryCreator = formData.creators[0]; 

      const existingSeriesObj = seriesList.find((s: any) => s.slug === activeSlug);
      let publishTimestamp: string | null = existingSeriesObj?.publish_at || null;
      if (formData.isScheduled) {
        publishTimestamp = new Date(`${formData.publishDate}T${formData.publishTime}`).toISOString();
      } else if (targetSeries === 'new' && !publishTimestamp) {
        publishTimestamp = new Date().toISOString();
      }

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
        content_rating: formData.contentRating, 
        is_hidden: formData.isHidden,
        publish_at: publishTimestamp,
        creator_name: primaryCreator.name, 
        flag_code: [primaryCreator.flagCode1, primaryCreator.flagCode2].filter(Boolean).join(','), 
        creator_avatar: primaryCreator.avatar, 
        creator_bio: primaryCreator.bio, creator_twitter: primaryCreator.twitter, creator_instagram: primaryCreator.instagram, 
        creator_support_link: primaryCreator.supportLink, updated_at: new Date().toISOString() 
      }, { onConflict: 'slug' });

      if (seriesError) throw seriesError;

      const { error: deleteError } = await supabase.from('series_creators').delete().eq('series_slug', activeSlug);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('series_creators').insert(formData.creators.map(c => ({ 
        series_slug: activeSlug, role: c.role || 'Creator', name: c.name, 
        flag_code: [c.flagCode1, c.flagCode2].filter(Boolean).join(','), 
        bio: c.bio, 
        avatar_url: c.avatar,
        twitter_url: c.twitter, instagram_url: c.instagram, 
        support_url: c.supportLink, 
        is_visible: c.is_visible !== false 
      })));
      if (insertError) throw insertError;

      const { error: deleteCharError } = await supabase.from('series_characters').delete().eq('series_slug', activeSlug);
      if (deleteCharError) throw deleteCharError;

      if (formData.characters.length > 0) {
        const charPayload = formData.characters.map(c => {
           const { id, fullbody_url, ...rest } = c; 
           return { ...rest, alt_forms: c.alt_forms || [], series_slug: activeSlug };
        });
        const { error: insertCharError } = await supabase.from('series_characters').insert(charPayload);
        if (insertCharError) throw insertCharError;
      }

      // Sync automated New Series Drop notification if enabled and not hidden
      const notifKey = `series_${activeSlug}`;
      if (formData.isHidden) {
        await supabase.from('app_notifications').delete().eq('source_key', notifKey);
      } else if (formData.autoNotify) {
        const effectiveReleaseIso = publishTimestamp || new Date().toISOString();
        await supabase.from('app_notifications').upsert(
          [
            {
              title: 'New Series Drop!',
              message: `${formData.seriesTitle} is now on Saturday AM! Tap to start reading.`,
              thumbnail_url: formData.bannerUrl || formData.characterUrl || null,
              link_target: activeSlug,
              publish_at: effectiveReleaseIso,
              created_at: effectiveReleaseIso,
              source_key: notifKey
            }
          ],
          { onConflict: 'source_key' }
        );
      }
  
      window.dispatchEvent(new Event('seriesUpdated'));
      alert(`SUCCESS! Series Saved.`);
      if (setIsDirty) setIsDirty(false);
    } catch (error: any) { 
      console.error("Database Save Error:", error);
      alert(`FAILED TO SAVE! Supabase returned: ${error.message}`); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDeleteSeries = async () => {
    const challenge = window.prompt('Are you sure you want to permanently delete this series? This cannot be undone.\n\nType "DELETE" to confirm:');
    if (challenge?.trim().toUpperCase() !== 'DELETE') {
      return;
    }
    
    setIsSaving(true);
    try { 
      await supabase.from('app_notifications').delete().eq('source_key', `series_${targetSeries}`);
      const { error: creatorErr } = await supabase.from('series_creators').delete().eq('series_slug', targetSeries);
      if (creatorErr) throw creatorErr;

      const { error: charErr } = await supabase.from('series_characters').delete().eq('series_slug', targetSeries);
      if (charErr) throw charErr;

      const { data: deletedData, error: seriesErr } = await supabase
        .from('series')
        .delete()
        .eq('slug', targetSeries)
        .select();

      if (seriesErr) throw seriesErr;

      if (!deletedData || deletedData.length === 0) {
        throw new Error("Supabase RLS Policy blocked the deletion!");
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      alert("Series permanently deleted!"); 
      if (setIsDirty) setIsDirty(false);
      window.location.reload(); 
    } catch (error: any) { 
      alert('Failed to delete series:\n\n' + error.message + '\n\nNote: If this series has Chapters uploaded, you must delete its Chapters in the Chapter Uploader first!'); 
    } finally {
      setIsSaving(false);
    }
  };

  const activePosition = previewDevice === 'desktop' ? formData.bannerPositionDesktop : formData.bannerPositionMobile;
  const activeScale = previewDevice === 'desktop' ? formData.bannerScaleDesktop : formData.bannerScaleMobile;

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
    <div className="space-y-6 animate-fade-in-up pb-32 relative">
      
      {/* 1. Character Headshot Crop Modal */}
      <input 
        type="file" 
        id="headshot-upload" 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && cropTarget !== null) {
            const file = e.target.files[0];
            setCropFile(file);
            setCropImageUrl(URL.createObjectURL(file)); 
            e.target.value = ''; 
          }
        }} 
      />

      {cropImageUrl && ThumbnailCropperModal && (
        <ThumbnailCropperModal
          imageUrl={cropImageUrl}
          aspect={1}
          title="Crop Character Headshot (1:1)"
          uploadFolder="characters/headshots"
          onCropComplete={(newUrl: any) => {
            if (cropTarget) {
              if (cropTarget.field === 'alt_forms' && cropTarget.altIndex !== undefined) {
                const newChars = [...formData.characters];
                newChars[cropTarget.charIndex].alt_forms[cropTarget.altIndex].url = newUrl;
                handleInputChange('characters', newChars);
              } else {
                handleCharacterChange(cropTarget.charIndex, cropTarget.field, newUrl);
              }
            }
            setCropImageUrl(null);
            setCropTarget(null);
          }}
          onCancel={() => {
            setCropImageUrl(null);
            setCropTarget(null);
          }}
        />
      )}

      {/* 2. Visual Drag/Zoom Crop Window for Hero Banner (Desktop / Mobile) */}
      {bannerCropper && bannerCropper.isOpen && formData.bannerUrl && ThumbnailCropperModal && (
        <ThumbnailCropperModal
          imageUrl={formData.bannerUrl}
          aspect={bannerCropper.device === 'desktop' ? (21 / 9) : (4 / 5)}
          title={`Crop & Position ${bannerCropper.device === 'desktop' ? 'Desktop Banner (21:9)' : 'Mobile Banner (4:5)'}`}
          onCropAreaComplete={handleBannerCropComplete}
          onCancel={() => setBannerCropper(null)}
        />
      )}

      {/* 3. Visual Drag/Zoom Crop Window for Character Render (2:3 Cutout) */}
      {charCropperOpen && formData.characterUrl && ThumbnailCropperModal && (
        <ThumbnailCropperModal
          imageUrl={formData.characterUrl}
          aspect={2 / 3}
          title="Crop Character Render (2:3 Cutout)"
          onCropAreaComplete={handleCharCropComplete}
          onCancel={() => setCharCropperOpen(false)}
        />
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Editor Mode</label>
          <select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm">
            <option value="new">+ CREATE NEW SERIES</option>
            {seriesList.map((s: any) => <option key={s.id} value={s.slug}>{s.title}</option>)}
          </select>
        </div>
        {targetSeries !== 'new' && (
          <button 
            onClick={handleDeleteSeries} 
            disabled={isSaving}
            className={`px-6 py-3 border rounded font-bold uppercase text-[10px] tracking-widest transition-colors ${
              isSaving 
                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                : 'bg-red-900/20 text-red-500 border-red-900 hover:bg-red-500 hover:text-white'
            }`}
          >
            {isSaving ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-zinc-800 pb-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#fe9a00] uppercase mb-2">Series Title</label>
            <input type="text" value={formData.seriesTitle} onChange={(e) => handleInputChange('seriesTitle', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Content Rating</label>
            <select value={formData.contentRating} onChange={(e) => handleInputChange('contentRating', e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00] transition-colors">
              <option value="E">E / All Ages</option>
              <option value="Y">Y / Youth (10+)</option>
              <option value="T">T / Teen (13+)</option>
              <option value="OT">OT / Older Teen (16+)</option>
              <option value="M">M / Mature (18+)</option>
            </select>
          </div>
        </div>

        {/* VISIBILITY, SCHEDULING & AUTO-NOTIFICATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${formData.isHidden ? 'bg-red-900/10 border-red-900/50' : 'bg-black border-zinc-800'}`}>
            <div className="flex items-center gap-3">
               <input type="checkbox" checked={formData.isHidden} onChange={(e) => handleInputChange('isHidden', e.target.checked)} className="accent-red-500 w-5 h-5 cursor-pointer" />
               <label className={`text-xs font-black uppercase tracking-widest ${formData.isHidden ? 'text-red-500' : 'text-zinc-400'}`}>Hide Series (Unpublish)</label>
            </div>
            {formData.isHidden && <span className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 uppercase tracking-widest"><EyeOff className="w-3 h-3"/> Hidden</span>}
          </div>

          <div className="bg-black border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoNotify}
                onChange={(e) => handleInputChange('autoNotify', e.target.checked)}
                className="accent-[#fe9a00] w-4 h-4"
              />
              <Bell className="w-3.5 h-3.5 text-[#fe9a00]" />
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Notify Fans on Launch</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700">
              <input
                type="checkbox"
                checked={formData.isScheduled}
                onChange={(e) => handleInputChange('isScheduled', e.target.checked)}
                className="accent-[#fe9a00]"
              />
              <Calendar className="w-3.5 h-3.5 text-[#fe9a00]" />
              <span className="text-[10px] font-black text-zinc-300 uppercase">Schedule Launch</span>
            </label>
          </div>
        </div>

        {formData.isScheduled && (
          <div className="bg-black border border-[#fe9a00]/40 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Series Launch Date</label>
              <input type="date" value={formData.publishDate} onChange={(e) => handleInputChange('publishDate', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-white text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Series Launch Time</label>
              <input type="time" value={formData.publishTime} onChange={(e) => handleInputChange('publishTime', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-white text-xs" />
            </div>
          </div>
        )}
        
        {/* HERO BANNER SECTION: CLEAN DRAG/ZOOM CROP WINDOW (NO SLIDERS) */}
        <div className="border-b border-zinc-800 pb-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[#fe9a00] uppercase text-xs">Series Hero Banner</h3>
             {formData.bannerUrl && (
               <button type="button" onClick={() => { if(window.confirm("Remove this Banner?")) handleInputChange('bannerUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                 <Trash2 className="w-3 h-3" /> Remove Banner
               </button>
             )}
           </div>
           
           <Dropzone label={formData.bannerUrl ? "Replace Banner" : "+ Add Banner"} height="p-6" folderPath="series-banners" onUploadComplete={(url: any) => handleInputChange('bannerUrl', url)} />
           
           {formData.bannerUrl && (
             <div className="mt-6 bg-black p-4 sm:p-6 rounded-xl border border-zinc-800 space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                 <div className="flex items-center gap-2">
                   <Crop className="w-4 h-4 text-[#fe9a00]" />
                   <span className="text-[11px] font-black text-white uppercase tracking-wider">Crop & Position Framing</span>
                 </div>

                 <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-700">
                     <button onClick={() => setPreviewDevice('desktop')} type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${previewDevice === 'desktop' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}>
                       <Monitor className="w-3 h-3" /> Desktop
                     </button>
                     <button onClick={() => setPreviewDevice('mobile')} type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${previewDevice === 'mobile' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}>
                       <Smartphone className="w-3 h-3" /> Mobile
                     </button>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col items-center justify-center bg-zinc-900/60 rounded-xl p-4 sm:p-8 border border-zinc-800">
                 <div 
                   onClick={() => setBannerCropper({ isOpen: true, device: previewDevice })}
                   title="Click to open crop window"
                   className={`relative overflow-hidden bg-black border-2 border-zinc-700 shadow-2xl transition-all duration-300 cursor-pointer group ${previewDevice === 'desktop' ? 'w-full aspect-[21/9] sm:aspect-[3/1] rounded-xl' : 'w-[200px] sm:w-[240px] aspect-[4/5] rounded-3xl'}`}
                 >
                   <img 
                     src={formData.bannerUrl} 
                     alt="Banner Preview" 
                     className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
                     style={{ 
                       objectPosition: activePosition,
                       transform: `scale(${activeScale / 100})`,
                       transformOrigin: activePosition
                     }}
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                   
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity backdrop-blur-[2px]">
                     <div className="w-12 h-12 rounded-full bg-[#fe9a00] text-black flex items-center justify-center shadow-xl">
                       <Crop className="w-6 h-6" />
                     </div>
                     <span className="bg-black/90 border border-zinc-700 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                       Click to Adjust {previewDevice === 'desktop' ? 'Desktop (21:9)' : 'Mobile (4:5)'} Framing
                     </span>
                   </div>
                 </div>

                 <button
                   type="button"
                   onClick={() => setBannerCropper({ isOpen: true, device: previewDevice })}
                   className="mt-6 flex items-center gap-2 bg-[#fe9a00] hover:bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
                 >
                   <Crop className="w-4 h-4" /> Open {previewDevice === 'desktop' ? 'Desktop' : 'Mobile'} Crop Window
                 </button>
               </div>
             </div>
           )}
        </div>

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
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-sm cursor-pointer"
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
        
        {/* LOGO & CHARACTER RENDER SECTION: VISUAL CROP WINDOW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-zinc-800 pb-6">
           <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between mb-2">
               <h3 className="font-bold text-[#fe9a00] uppercase text-xs">Logo</h3>
               {formData.logoUrl && (
                 <button type="button" onClick={() => { if(window.confirm("Remove this Logo?")) handleInputChange('logoUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer">
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
               <div className="flex items-center gap-2">
                 {formData.characterUrl && (
                   <button 
                     type="button" 
                     onClick={() => setCharCropperOpen(true)}
                     className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-2.5 py-1 rounded flex items-center gap-1 hover:bg-white transition-colors cursor-pointer"
                   >
                     <Crop className="w-3 h-3" /> Crop Window
                   </button>
                 )}
                 {formData.characterUrl && (
                   <button type="button" onClick={() => { if(window.confirm("Remove this Render?")) handleInputChange('characterUrl', '') }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                     <Trash2 className="w-3 h-3" /> Remove
                   </button>
                 )}
               </div>
             </div>

             <div className="flex gap-4 items-start">
               <div className="flex-1 flex flex-col gap-3">
                 <Dropzone label={formData.characterUrl ? "Replace Character" : "+ Add Character"} folderPath="series-characters" onUploadComplete={(url: any) => handleInputChange('characterUrl', url)} />
                 {formData.characterUrl && (
                   <button 
                     type="button" 
                     onClick={() => setCharCropperOpen(true)}
                     className="w-full py-3.5 bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-all flex items-center justify-center gap-2 border border-zinc-700 hover:border-[#fe9a00] cursor-pointer"
                   >
                     <Crop className="w-4 h-4" /> Open Character Crop Window (2:3)
                   </button>
                 )}
               </div>

               {formData.characterUrl && (
                 <div className="w-28 sm:w-36 flex-shrink-0 flex flex-col items-center">
                   <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 self-start">Live Card Preview</span>
                   <div 
                     onClick={() => setCharCropperOpen(true)}
                     className="w-full relative overflow-hidden rounded-lg aspect-[2/3] border border-zinc-800 shadow-xl group/charpreview cursor-pointer"
                     style={getPatternStyle(formData.cardColor, formData.cardPattern)}
                     title="Click to adjust character crop"
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-0" />
                     
                     <img 
                       src={formData.characterUrl} alt="Preview" 
                       className={`absolute left-1/2 -translate-x-1/2 max-w-none object-contain z-10 transition-all duration-300 pointer-events-none ${formData.characterAlign === 'top' ? 'top-0' : formData.characterAlign === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}`}
                       style={{ width: `${formData.characterScale || 140}%`, height: '120%' }}
                     />
                     <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />
                     
                     {formData.logoUrl && (
                       <div className="absolute left-0 right-0 flex justify-center z-30 px-2 transition-all duration-300 pointer-events-none" style={{ bottom: `${formData.logoOffset ?? 16}px` }}>
                         <img src={formData.logoUrl} alt="Logo" className="max-h-24 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" style={{ width: `${formData.logoScale ?? 100}%` }} />
                       </div>
                     )}

                     <div className="absolute inset-0 bg-black/70 z-40 opacity-0 group-hover/charpreview:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity backdrop-blur-sm">
                       <Crop className="w-5 h-5 text-[#fe9a00]" />
                       <span className="text-[9px] font-black text-white uppercase tracking-widest text-center px-1">
                         Adjust Crop
                       </span>
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
            <input type="checkbox" checked={formData.hasAwards} onChange={(e) => handleInputChange('hasAwards', e.target.checked)} className="accent-[#fe9a00] w-4 h-4 cursor-pointer" />
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
                 }} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-800 px-3 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors cursor-pointer">
                   Swap Order
                 </button>
               )}
               <button onClick={() => { 
                 if (formData.creators.length > 1 && !window.confirm("Are you sure you want to remove this co-creator?")) return;
                 const nc = formData.creators.length > 1 ? [formData.creators[0]] : [...formData.creators, { role: 'Co-creator', name: '', bio: '', flagCode1: '', flagCode2: '', avatar: '', instagram: '', twitter: '', supportLink: '', is_visible: true }]; 
                 handleInputChange('creators', nc); 
               }} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-800 px-3 py-2 rounded hover:bg-[#fe9a00] hover:text-black transition-colors cursor-pointer">
                 {formData.creators.length > 1 ? '- Remove Co-creator' : '+ Add Co-creator'}
               </button>
             </div>
           </div>
           
           <div className={`grid ${formData.creators.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
             {formData.creators.map((c, i) => {
                const isCustomFlag1 = c.flagCode1 && !COUNTRY_CODES.some(cc => cc.code === c.flagCode1);
                const selectValue1 = isCustomFlag1 ? 'OTHER' : c.flagCode1;

                const isCustomFlag2 = c.flagCode2 && !COUNTRY_CODES.some(cc => cc.code === c.flagCode2);
                const selectValue2 = isCustomFlag2 ? 'OTHER' : c.flagCode2;

                return (
                  <div key={i} className="bg-black p-4 rounded border border-zinc-800 space-y-4 relative">
                    <div className="flex items-center justify-between bg-zinc-900 p-2.5 rounded border border-zinc-700 mb-2">
                      <div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider block">Creator Visibility</span>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Show in Creators Roster & Bingo</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { 
                          const nc = [...formData.creators]; 
                          nc[i].is_visible = nc[i].is_visible === false ? true : false; 
                          handleInputChange('creators', nc); 
                        }} 
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                          c.is_visible !== false 
                            ? 'bg-green-900/30 text-green-400 border border-green-800/60 hover:bg-green-900/50' 
                            : 'bg-red-900/30 text-red-400 border border-red-800/60 hover:bg-red-900/50'
                        }`}
                      >
                        {c.is_visible !== false ? <><Eye className="w-3 h-3" /> Visible</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                      </button>
                    </div>

                    <select 
                      className="w-full bg-black border border-[#fe9a00]/30 text-[#fe9a00] rounded p-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                      onChange={(e) => handleAutofillCreator(i, e.target.value)}
                      value=""
                    >
                      <option value="" disabled>-- Quick Fill: Select Existing Creator --</option>
                      {existingCreators.map(ec => (
                        <option key={ec.name} value={ec.name} className="text-white bg-zinc-900">{ec.name}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input type="text" placeholder="Role (e.g., Creator)" value={c.role} onChange={(e) => { const nc = [...formData.creators]; nc[i].role = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      <input type="text" placeholder="Full Name" value={c.name} onChange={(e) => { const nc = [...formData.creators]; nc[i].name = e.target.value; handleInputChange('creators', nc); }} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      
                      <div className="flex gap-2">
                        <select 
                          value={selectValue1} 
                          onChange={(e) => { 
                            const nc = [...formData.creators]; 
                            nc[i].flagCode1 = e.target.value === 'OTHER' ? (isCustomFlag1 ? c.flagCode1 : '') : e.target.value; 
                            handleInputChange('creators', nc); 
                          }} 
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00] cursor-pointer"
                        >
                          <option value="">-- Flag 1 --</option>
                          {COUNTRY_CODES.map(country => (
                            <option key={country.code} value={country.code}>{country.name}</option>
                          ))}
                          <option value="OTHER">Other (Enter Code)</option>
                        </select>

                        {(isCustomFlag1 || selectValue1 === 'OTHER') && (
                          <input 
                            type="text" 
                            placeholder="Code" 
                            maxLength={2}
                            value={c.flagCode1} 
                            onChange={(e) => { 
                              const nc = [...formData.creators]; 
                              nc[i].flagCode1 = e.target.value.toUpperCase(); 
                              handleInputChange('creators', nc); 
                            }} 
                            className="w-12 text-center bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs font-black focus:border-[#fe9a00]"
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <select 
                          value={selectValue2} 
                          onChange={(e) => { 
                            const nc = [...formData.creators]; 
                            nc[i].flagCode2 = e.target.value === 'OTHER' ? (isCustomFlag2 ? c.flagCode2 : '') : e.target.value; 
                            handleInputChange('creators', nc); 
                          }} 
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00] cursor-pointer"
                        >
                          <option value="">-- Flag 2 (Opt) --</option>
                          {COUNTRY_CODES.map(country => (
                            <option key={country.code} value={country.code}>{country.name}</option>
                          ))}
                          <option value="OTHER">Other (Enter Code)</option>
                        </select>

                        {(isCustomFlag2 || selectValue2 === 'OTHER') && (
                          <input 
                            type="text" 
                            placeholder="Code" 
                            maxLength={2}
                            value={c.flagCode2} 
                            onChange={(e) => { 
                              const nc = [...formData.creators]; 
                              nc[i].flagCode2 = e.target.value.toUpperCase(); 
                              handleInputChange('creators', nc); 
                            }} 
                            className="w-12 text-center bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs font-black focus:border-[#fe9a00]"
                          />
                        )}
                      </div>

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
                );
             })}
           </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-xl italic text-[#fe9a00] uppercase tracking-tighter">Character Roster</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Build the Wiki Database</p>
            </div>
            <button onClick={handleAddCharacter} className="bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Add Character
            </button>
          </div>

          <div className="space-y-4">
            {formData.characters.map((char, i) => {
              const isCustomHeight = char.height && !HEIGHT_PRESETS.includes(char.height);
              
              return (
              <div key={i} className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                <div 
                  onClick={() => setExpandedCharIndex(expandedCharIndex === i ? null : i)}
                  className="flex items-center justify-between p-4 bg-zinc-900/50 cursor-pointer hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 mr-2">
                      <button onClick={(e) => moveCharacter(i, 'up', e)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer" disabled={i === 0}>
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => moveCharacter(i, 'down', e)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer" disabled={i === formData.characters.length - 1}>
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                      <User className="w-5 h-5 text-zinc-600 absolute" />
                      {char.headshot_url && (
                        <img 
                          key={char.headshot_url}
                          src={char.headshot_url} 
                          className="w-full h-full object-cover relative z-10" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-white tracking-widest text-sm">{char.name || 'Unnamed Character'}</h4>
                      <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest">{char.role_type} {char.is_mc && '• MAIN CHARACTER'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCharacterChange(i, 'is_hidden', !char.is_hidden); }}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border transition-colors cursor-pointer ${
                        char.is_hidden 
                          ? 'bg-red-950 border-red-900 text-red-500 hover:bg-red-900' 
                          : 'bg-green-950 border-green-900 text-green-500 hover:bg-green-900'
                      }`}
                    >
                      {char.is_hidden ? 'Hidden' : 'Visible'}
                    </button>
                    {expandedCharIndex === i ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                  </div>
                </div>

                {expandedCharIndex === i && (
                  <div className="p-6 border-t border-zinc-800 space-y-6 animate-fade-in">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Character Name" value={char.name} onChange={(e) => handleCharacterChange(i, 'name', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      <div className="flex gap-4">
                        <select value={char.role_type} onChange={(e) => handleCharacterChange(i, 'role_type', e.target.value)} className="w-1/2 bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs cursor-pointer">
                          <option value="Hero">Hero</option><option value="Villain">Villain</option><option value="Neutral">Neutral</option>
                        </select>
                        <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded p-3">
                          <input type="checkbox" checked={char.is_mc} onChange={(e) => handleCharacterChange(i, 'is_mc', e.target.checked)} className="w-4 h-4 accent-[#fe9a00] cursor-pointer" />
                          <label className="text-[10px] font-black uppercase text-white tracking-widest">Is Main Character?</label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-800 pt-6">
                      
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Affiliation</label>
                        <div className="flex gap-2">
                          <select 
                            value={['AM', 'PM', 'Pilot Manga'].includes(char.element) ? char.element : (char.element ? 'Custom' : 'AM')} 
                            onChange={(e) => {
                              if (e.target.value === 'Custom') handleCharacterChange(i, 'element', 'Custom Entry');
                              else handleCharacterChange(i, 'element', e.target.value);
                            }}
                            className={`${['AM', 'PM', 'Pilot Manga'].includes(char.element) || !char.element ? 'w-full' : 'w-1/2'} bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs cursor-pointer`}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                            <option value="Pilot Manga">Pilot Manga</option>
                            <option value="Custom">Custom...</option>
                          </select>
                          {(!['AM', 'PM', 'Pilot Manga'].includes(char.element) && char.element) && (
                            <input 
                              type="text" 
                              placeholder="Custom Affiliation..." 
                              value={char.element === 'Custom Entry' ? '' : char.element} 
                              onChange={(e) => handleCharacterChange(i, 'element', e.target.value)} 
                              className="w-1/2 bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" 
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Power Type / Class</label>
                        <input type="text" placeholder="e.g. Fire, Magic, Tech" value={char.weapon} onChange={(e) => handleCharacterChange(i, 'weapon', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 border-t border-zinc-800 pt-6">
                      <input type="text" placeholder="Age" value={char.age} onChange={(e) => handleCharacterChange(i, 'age', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      
                      <div className="flex gap-2">
                        <select 
                          value={isCustomHeight ? 'Custom' : (char.height || '')} 
                          onChange={(e) => {
                            if (e.target.value === 'Custom') handleCharacterChange(i, 'height', 'Custom Entry');
                            else handleCharacterChange(i, 'height', e.target.value);
                          }}
                          className={`${isCustomHeight ? 'w-[45%] px-1' : 'w-full'} bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00] cursor-pointer`}
                        >
                          <option value="">Height</option>
                          {HEIGHT_PRESETS.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                          <option value="Custom">Custom</option>
                        </select>
                        {isCustomHeight && (
                          <input 
                            type="text" 
                            placeholder="e.g. 5'10&quot;" 
                            value={char.height === 'Custom Entry' ? '' : char.height} 
                            onChange={(e) => handleCharacterChange(i, 'height', e.target.value)} 
                            className="w-[55%] bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs px-2 focus:border-[#fe9a00]" 
                          />
                        )}
                      </div>
                      
                      <input type="text" placeholder="Ethnicity" value={char.ethnicity} onChange={(e) => handleCharacterChange(i, 'ethnicity', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      <input type="text" placeholder="In-World Location" value={char.location} onChange={(e) => handleCharacterChange(i, 'location', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" />
                      
                      <div className="col-span-2 flex gap-2">
                        <select 
                          value={(char.first_appearance && !seriesChapters.some(ch => `Chapter ${ch.chapter_number}` === char.first_appearance)) ? 'Custom' : (char.first_appearance || '')} 
                          onChange={(e) => {
                            if (e.target.value === 'Custom') handleCharacterChange(i, 'first_appearance', 'Custom Entry');
                            else handleCharacterChange(i, 'first_appearance', e.target.value);
                          }}
                          className={`${(char.first_appearance && !seriesChapters.some(ch => `Chapter ${ch.chapter_number}` === char.first_appearance)) ? 'w-1/2' : 'w-full'} bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs cursor-pointer`}
                        >
                          <option value="">-- 1st Appearance --</option>
                          {seriesChapters.map(ch => (
                            <option key={ch.id} value={`Chapter ${ch.chapter_number}`}>Ch. {ch.chapter_number}</option>
                          ))}
                          <option value="Custom">Custom...</option>
                        </select>
                        {(char.first_appearance && !seriesChapters.some(ch => `Chapter ${ch.chapter_number}` === char.first_appearance)) && (
                          <input 
                            type="text" 
                            placeholder="Type appearance..." 
                            value={char.first_appearance === 'Custom Entry' ? '' : char.first_appearance} 
                            onChange={(e) => handleCharacterChange(i, 'first_appearance', e.target.value)} 
                            className="w-1/2 bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs" 
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-zinc-800 pt-6">
                      <textarea placeholder="Origin Story..." value={char.origin} onChange={(e) => handleCharacterChange(i, 'origin', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs h-20 resize-none" />
                      <textarea placeholder="Powers & Abilities..." value={char.powers} onChange={(e) => handleCharacterChange(i, 'powers', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs h-16 resize-none" />
                      <textarea placeholder="Weaknesses..." value={char.weakness} onChange={(e) => handleCharacterChange(i, 'weakness', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-xs h-16 resize-none" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 border-t border-zinc-800 pt-6">
                      
                      <div className="w-full sm:w-1/2 flex flex-col items-center">
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center">Character Thumbnail (1:1)</label>
                        <button 
                          type="button"
                          onClick={() => {
                             setCropTarget({ charIndex: i, field: 'headshot_url' });
                             document.getElementById('headshot-upload')?.click();
                          }}
                          className="w-full max-w-[200px] mx-auto mb-3 py-4 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors bg-black flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          {char.headshot_url ? 'Replace Headshot' : '+ Add Headshot'}
                        </button>
                        <div className="relative w-24 h-24 mx-auto rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
                          <User className="w-10 h-10 text-zinc-600 absolute" />
                          {char.headshot_url && <img src={char.headshot_url} className="w-full h-full object-cover relative z-10 bg-zinc-900" alt="Headshot" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>}
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 flex flex-col items-center">
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center">Alternate Form 1 (Optional)</label>
                        
                        <input 
                          type="text" 
                          placeholder="Alt Form Name (e.g. Arodihs)" 
                          value={char.alt_form_name || ''} 
                          onChange={(e) => handleCharacterChange(i, 'alt_form_name', e.target.value)} 
                          className="w-full max-w-[200px] bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px] mb-3 text-center" 
                        />

                        <button 
                          type="button"
                          onClick={() => {
                             setCropTarget({ charIndex: i, field: 'alt_headshot_url' });
                             document.getElementById('headshot-upload')?.click();
                          }}
                          className="w-full max-w-[200px] mx-auto mb-3 py-4 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors bg-black flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          {char.alt_headshot_url ? 'Replace Alt Form 1' : '+ Add Alt Form 1'}
                        </button>
                        <div className="relative w-24 h-24 mx-auto rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
                          <User className="w-10 h-10 text-zinc-600 absolute" />
                          {char.alt_headshot_url && <img src={char.alt_headshot_url} className="w-full h-full object-cover relative z-10 bg-zinc-900" alt="Alt Form" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>}
                        </div>
                      </div>
                    </div>

                    <div className="w-full border-t border-zinc-800 pt-6 mt-6">
                      <div className="flex justify-between items-center mb-4">
                         <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Additional Alternate Forms</label>
                         <button type="button" onClick={() => handleAddAltForm(i)} className="text-[10px] font-black text-[#fe9a00] hover:text-white uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700 cursor-pointer">
                           + Add Form
                         </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(char.alt_forms || []).map((alt: any, altIdx: number) => (
                           <div key={altIdx} className="flex flex-col items-center bg-black p-4 rounded-xl border border-zinc-800 relative">
                             <button type="button" onClick={() => handleRemoveAltForm(i, altIdx)} className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                             <input type="text" placeholder="Form Name" value={alt.name} onChange={(e) => handleAltFormChange(i, altIdx, 'name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-[10px] mb-3 text-center" />
                             
                             <button 
                               type="button" 
                               onClick={() => { 
                                 setCropTarget({ charIndex: i, field: 'alt_forms', altIndex: altIdx }); 
                                 document.getElementById('headshot-upload')?.click(); 
                               }} 
                               className="w-full mx-auto mb-3 py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors bg-black flex justify-center cursor-pointer"
                             >
                                {alt.url ? 'Replace Image' : '+ Image (1:1)'}
                             </button>
                             
                             <div className="relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
                                {alt.url ? <img src={alt.url} className="w-full h-full object-cover relative z-10 bg-zinc-900" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <User className="w-6 h-6 text-zinc-600 absolute" />}
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => { if(window.confirm("Remove character?")) { const nc = [...formData.characters]; nc.splice(i,1); handleInputChange('characters', nc); } }} className="w-full mt-4 py-3 bg-red-900/20 text-red-500 border border-red-900 rounded font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                      Remove Character
                    </button>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>

        <button onClick={handleSaveSeries} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded mt-4 hover:bg-white transition-colors cursor-pointer">
          {isSaving ? 'SAVING...' : 'Save Series & Roster'}
        </button>
      </div>
    </div>
  );
};