import React, { useState } from 'react';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { MagazineUploader } from './MagazineUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';

export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('home');

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

        {/* Dynamic Content Rendering */}
        <div className="mt-6">
          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} />}
          {activeTab === 'series' && <SeriesEditor Dropzone={Dropzone} />}
          {activeTab === 'chapter' && <ChapterUploader Dropzone={Dropzone} />}
          {activeTab === 'magazine' && <MagazineUploader />}
          {activeTab === 'avatars' && <AvatarMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} />}
          {activeTab === 'cardskins' && <CardSkinMaker />}
        </div>
      </div>
    </div>
  );
};