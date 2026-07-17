import React, { useState, useEffect } from 'react';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { MagazineUploader } from './MagazineUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { supabase } from '../supabase';

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
    { id: 'stickers', label: 'Sticker Maker' },
    { id: 'cardskins', label: 'Card Skin Studio' }
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
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'cardskins' && <CardSkinMaker />}
        </div>
      </div>
    </div>
  );
};