import React, { useState, useEffect } from 'react';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { MagazineUploader } from './MagazineUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { FrameMaker } from './FrameMaker'; 
import { ModerationDashboard } from './ModerationDashboard';
import { supabase } from '../supabase';
import { Bell, Send, BookOpen, Star, Sparkles, Newspaper } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

// --- UPDATED: STREAMLINED NOTIFICATION CREATOR ---
const NotificationCenter = () => {
  const { seriesList = [] } = useSeriesData();
  
  const [notifType, setNotifType] = useState<'chapter' | 'feature' | 'news' | 'custom'>('chapter');
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState('');
  
  const [title, setTitle] = useState('New Chapter Drop!');
  const [message, setMessage] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle changing the notification workflow type
  const handleTypeChange = (type: 'chapter' | 'feature' | 'news' | 'custom') => {
    setNotifType(type);
    setSelectedSeriesSlug('');
    
    if (type === 'feature') {
      setTitle('App Feature Update');
      setMessage('');
      setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png');
      setLinkTarget('');
    } else if (type === 'news') {
      setTitle('Saturday AM News');
      setMessage('News from Saturday AM');
      setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png');
      setLinkTarget('news');
    } else if (type === 'chapter') {
      setTitle('New Chapter Drop!');
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    } else {
      setTitle('');
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    }
  };

  // Handle auto-filling data when a series is selected
  const handleSeriesSelect = (slug: string) => {
    setSelectedSeriesSlug(slug);
    const series = seriesList.find((s: any) => s.slug === slug);
    
    if (series) {
      setMessage(`Chapter Drop: NEW ${series.title}!`);
      setThumbnailUrl(series.cover_url || '');
      setLinkTarget(series.slug);
    } else {
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Title and Message are required!");
    
    setIsSubmitting(true);
    const { error } = await supabase.from('app_notifications').insert([{
      title,
      message,
      thumbnail_url: thumbnailUrl || null,
      link_target: linkTarget || null
    }]);
    
    setIsSubmitting(false);
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Notification Blasted Successfully!");
      // Reset form based on current type
      handleTypeChange(notifType);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Bell className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Push Notification Blaster</h2>
      </div>

      {/* WORKFLOW SELECTOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button 
          onClick={() => handleTypeChange('chapter')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'chapter' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}
        >
          <BookOpen className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase tracking-widest text-center">Chapter</span>
        </button>
        <button 
          onClick={() => handleTypeChange('feature')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'feature' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}
        >
          <Sparkles className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase tracking-widest text-center">Update</span>
        </button>
        <button 
          onClick={() => handleTypeChange('news')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'news' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}
        >
          <Newspaper className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase tracking-widest text-center">AM News</span>
        </button>
        <button 
          onClick={() => handleTypeChange('custom')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'custom' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}
        >
          <Star className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase tracking-widest text-center">Custom</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* SERIES DROPDOWN (Only visible if Chapter Drop is selected) */}
        {notifType === 'chapter' && (
          <div className="p-4 bg-black border border-zinc-800 rounded-xl mb-4">
            <label className="block text-[#fe9a00] font-bold uppercase tracking-widest text-[10px] mb-2">Select Series to Auto-Fill</label>
            <select 
              value={selectedSeriesSlug}
              onChange={(e) => handleSeriesSelect(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
            >
              <option value="">-- Choose a Series --</option>
              {seriesList.map((series: any) => (
                <option key={series.id} value={series.slug}>{series.title}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Notification Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
            maxLength={50}
            className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" 
            placeholder="e.g. New Chapter Drop!" 
          />
        </div>
        
        <div>
          <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Message Body</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            required 
            rows={3} 
            maxLength={150}
            className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" 
            placeholder="Brief description of the update..." 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Thumbnail URL</label>
            <input 
              type="url" 
              value={thumbnailUrl} 
              onChange={e => setThumbnailUrl(e.target.value)} 
              className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" 
              placeholder="https://..." 
            />
          </div>

          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Link Target</label>
            <input 
              type="text" 
              value={linkTarget} 
              onChange={e => setLinkTarget(e.target.value)} 
              className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" 
              placeholder="e.g. apple-black" 
            />
          </div>
        </div>

        {/* THUMBNAIL PREVIEW */}
        {thumbnailUrl && (
          <div className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl">
            <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-12 h-12 object-cover rounded border border-zinc-700" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Thumbnail Preview</span>
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="mt-6 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Broadcasting...' : 'Blast Notification'}
        </button>
      </form>
    </div>
  );
};

export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('home');

  // --- BINGO BOOK ADMIN STATES ---
  const [activePin, setActivePin] = useState('Loading...');
  const [pinExpiration, setPinExpiration] = useState('');
  const [newGeneratedPin, setNewGeneratedPin] = useState('');
  const [expireHours, setExpireHours] = useState(24);

  // Fetch the current active PIN on load
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
    // Generates a random 4 digit string between 1000 and 9999
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setNewGeneratedPin(random);
  };

  const saveNewPin = async () => {
    if (!newGeneratedPin) return alert("Please generate a PIN first.");
    
    // Calculate expiration time based on dropdown selection
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + Number(expireHours));

    const { error } = await supabase
      .from('bingo_settings')
      .update({ current_pin: newGeneratedPin, expires_at: expirationDate.toISOString() })
      .eq('id', 1);

    if (error) {
      alert("Error saving PIN: " + error.message);
    } else {
      alert("Success! Universal PIN updated.");
      setActivePin(newGeneratedPin);
      setPinExpiration(expirationDate.toLocaleString());
      setNewGeneratedPin(''); // clear the generator
    }
  };

  const tabs = [
    { id: 'home', label: 'Home Editor' },
    { id: 'series', label: 'Series Page Editor' },
    { id: 'chapter', label: 'Chapter Upload' },
    { id: 'magazine', label: 'Magazine Upload' },
    { id: 'avatars', label: 'Avatar Maker' },
    { id: 'frames', label: 'Frame Maker' }, 
    { id: 'stickers', label: 'Sticker Maker' },
    { id: 'cardskins', label: 'Card Skin Studio' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'notifications', label: 'Push Alerts' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Logged in as Administrator</p>
          </div>
          <button onClick={onBack} className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors">
            Exit Vault
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 sm:gap-6 mb-8 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 ${activeTab === tab.id ? 'text-[#fe9a00] border-[#fe9a00]' : 'text-zinc-500 border-transparent hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* BINGO BOOK SETTINGS PANEL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Bingo Book Control</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side: Current Active PIN */}
            <div className="bg-black border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Currently Active PIN</p>
              <p className="text-5xl font-black tracking-[0.2em] text-white mb-4">{activePin}</p>
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest">
                Expires: <span className="text-red-500">{pinExpiration}</span>
              </p>
            </div>

            {/* Right Side: Generate New PIN */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={generateRandomPin}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-colors"
                >
                  Generate New PIN
                </button>
                <div className="bg-black border border-zinc-700 rounded-xl px-6 flex items-center justify-center font-black tracking-[0.2em] text-2xl text-[#fe9a00]">
                  {newGeneratedPin || '----'}
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Time until expiration</label>
                  <select 
                    value={expireHours}
                    onChange={(e) => setExpireHours(Number(e.target.value))}
                    className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
                  >
                    <option value={12}>12 Hours (Single Day)</option>
                    <option value={24}>24 Hours (Overnight)</option>
                    <option value={48}>48 Hours (Weekend Show)</option>
                    <option value={72}>72 Hours (3-Day Con)</option>
                  </select>
                </div>

                <button 
                  onClick={saveNewPin}
                  className="bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl transition-colors h-[46px]"
                >
                  Save & Push Live
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Rendering */}
        <div className="mt-6">
          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} />}
          {activeTab === 'series' && <SeriesEditor Dropzone={Dropzone} />}
          {activeTab === 'chapter' && <ChapterUploader Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'magazine' && <MagazineUploader Dropzone={Dropzone} />}
          {activeTab === 'avatars' && <AvatarMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'frames' && <FrameMaker />} 
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'cardskins' && <CardSkinMaker />}
          {activeTab === 'moderation' && <ModerationDashboard />}
          {activeTab === 'notifications' && <NotificationCenter />}
        </div>
      </div>
    </div>
  );
};