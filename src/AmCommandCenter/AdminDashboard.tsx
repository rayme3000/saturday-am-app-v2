import React, { useState, useEffect } from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { FrameMaker } from './FrameMaker'; 
import { ModerationDashboard } from './ModerationDashboard';
import { supabase } from '../supabase';
import { Bell, Send, BookOpen, Star, Sparkles, Newspaper } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const useUnsavedWarning = (hasUnsavedChanges: boolean) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
};

const NotificationCenter = () => {
  const { seriesList = [] } = useSeriesData();
  const [notifType, setNotifType] = useState<'chapter' | 'feature' | 'news' | 'custom'>('chapter');
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState('');
  const [title, setTitle] = useState('New Chapter Drop!');
  const [message, setMessage] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: 'chapter' | 'feature' | 'news' | 'custom') => {
    setNotifType(type);
    setSelectedSeriesSlug('');
    if (type === 'feature') {
      setTitle('App Feature Update'); setMessage(''); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget('');
    } else if (type === 'news') {
      setTitle('Saturday AM News'); setMessage('News from Saturday AM'); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget('news');
    } else if (type === 'chapter') {
      setTitle('New Chapter Drop!'); setMessage(''); setThumbnailUrl(''); setLinkTarget('');
    } else {
      setTitle(''); setMessage(''); setThumbnailUrl(''); setLinkTarget('');
    }
  };

  const handleSeriesSelect = (slug: string) => {
    setSelectedSeriesSlug(slug);
    const series = seriesList.find((s: any) => s.slug === slug);
    if (series) {
      setMessage(`Chapter Drop: NEW ${series.title}!`); setThumbnailUrl(series.cover_url || ''); setLinkTarget(series.slug);
    } else {
      setMessage(''); setThumbnailUrl(''); setLinkTarget('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Title and Message are required!");
    setIsSubmitting(true);
    const { error } = await supabase.from('app_notifications').insert([{ title, message, thumbnail_url: thumbnailUrl || null, link_target: linkTarget || null }]);
    setIsSubmitting(false);
    if (error) { alert("Error: " + error.message); } 
    else { alert("Notification Blasted Successfully!"); handleTypeChange(notifType); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Bell className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Push Notification Blaster</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button onClick={() => handleTypeChange('chapter')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'chapter' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><BookOpen className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Chapter</span></button>
        <button onClick={() => handleTypeChange('feature')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'feature' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Sparkles className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Update</span></button>
        <button onClick={() => handleTypeChange('news')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'news' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Newspaper className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">AM News</span></button>
        <button onClick={() => handleTypeChange('custom')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'custom' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Star className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Custom</span></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {notifType === 'chapter' && (
          <div className="p-4 bg-black border border-zinc-800 rounded-xl mb-4">
            <label className="block text-[#fe9a00] font-bold uppercase tracking-widest text-[10px] mb-2">Select Series to Auto-Fill</label>
            <select value={selectedSeriesSlug} onChange={(e) => handleSeriesSelect(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]">
              <option value="">-- Choose a Series --</option>
              {seriesList.map((series: any) => <option key={series.id} value={series.slug}>{series.title}</option>)}
            </select>
          </div>
        )}
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Notification Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={50} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. New Chapter Drop!" /></div>
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Message Body</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} maxLength={150} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="Brief description of the update..." /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Thumbnail URL</label><input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="https://..." /></div>
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Link Target</label><input type="text" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. apple-black" /></div>
        </div>
        {thumbnailUrl && (
          <div className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl"><img src={thumbnailUrl} alt="Thumbnail Preview" className="w-12 h-12 object-cover rounded border border-zinc-700" /><span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Thumbnail Preview</span></div>
        )}
        <button type="submit" disabled={isSubmitting} className="mt-6 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />{isSubmitting ? 'Broadcasting...' : 'Blast Notification'}
        </button>
      </form>
    </div>
  );
};

export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [activePin, setActivePin] = useState('Loading...');
  const [pinExpiration, setPinExpiration] = useState('');
  const [newGeneratedPin, setNewGeneratedPin] = useState('');
  const [expireHours, setExpireHours] = useState(24);

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedWarning(isDirty);

  const handleTabChange = (tabId: string) => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to leave this tab? Your progress will be lost.")) {
      return;
    }
    setIsDirty(false);
    setActiveTab(tabId);
  };

  const handleExit = () => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to exit? Your progress will be lost.")) {
      return;
    }
    setIsDirty(false);
    onBack();
  };

  useEffect(() => {
    const fetchActivePin = async () => {
      const { data } = await supabase.from('bingo_settings').select('*').eq('id', 1).single();
      if (data) {
        setActivePin(data.current_pin);
        setPinExpiration(new Date(data.expires_at).toLocaleString());
      }
    };
    fetchActivePin();
  }, []);

  const generateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setNewGeneratedPin(random);
  };

  const saveNewPin = async () => {
    if (!newGeneratedPin) return alert("Please generate a PIN first.");
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + Number(expireHours));

    const { error } = await supabase.from('bingo_settings').update({ current_pin: newGeneratedPin, expires_at: expirationDate.toISOString() }).eq('id', 1);
    if (error) {
      alert("Error saving PIN: " + error.message);
    } else {
      alert("Success! Universal PIN updated.");
      setActivePin(newGeneratedPin);
      setPinExpiration(expirationDate.toLocaleString());
      setNewGeneratedPin(''); 
    }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics' }, { id: 'home', label: 'Home Editor' },
    { id: 'series', label: 'Series Page Editor' }, { id: 'chapter', label: 'Chapter Upload' },
    { id: 'avatars', label: 'Avatar Maker' }, { id: 'frames', label: 'Frame Maker' }, 
    { id: 'stickers', label: 'Sticker Maker' }, { id: 'cardskins', label: 'Card Skin Studio' },
    { id: 'moderation', label: 'Moderation' }, { id: 'notifications', label: 'Push Alerts' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Logged in as Administrator</p>
          </div>
          <button onClick={handleExit} className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors">
            Exit Vault
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-6 mb-8 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)} 
              className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 ${activeTab === tab.id ? 'text-[#fe9a00] border-[#fe9a00]' : 'text-zinc-500 border-transparent hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Tracker: Instantly flags unsaved changes if ANY keystroke/click occurs below this line */}
        <div className="mt-6" onInput={() => setIsDirty(true)} onChangeCapture={() => setIsDirty(true)}>
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} setIsDirty={setIsDirty} />}
          {activeTab === 'series' && <SeriesEditor Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'chapter' && <ChapterUploader Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'avatars' && <AvatarMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'frames' && <FrameMaker setIsDirty={setIsDirty} />} 
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'cardskins' && <CardSkinMaker setIsDirty={setIsDirty} />}
          {activeTab === 'moderation' && <ModerationDashboard />}
          {activeTab === 'notifications' && <NotificationCenter />}
        </div>
      </div>
    </div>
  );
};