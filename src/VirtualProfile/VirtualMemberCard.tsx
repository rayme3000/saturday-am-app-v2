import React, { useState } from 'react';
import { CreditCard, RotateCcw, X, Maximize2, User, Flame, BookOpen, Star, Trophy } from 'lucide-react';
import { APP_ICONS } from '../appIcons';

export const VirtualMemberCard = ({ isSubscriber, username, avatarUrl, frameId, memberSince, hypes, superHypes, reacts, chaptersRead, skinUrl, topFive, seriesList, onRenew, onChangeSkin, getFrameStyle, getOrbitStyle, globalRank = "---" }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const CardContent = () => (
    <div 
      className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      style={{ containerType: 'inline-size' }}
    >
      {/* === FRONT OF CARD === */}
      <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl overflow-hidden bg-zinc-900 flex flex-col justify-end shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700">
        <img 
          src={skinUrl || "https://zcadkovymrnjpjaxvnao.supabase.co/storage/v1/object/public/card-skins/skins/1781908112888_8ozh4h.jpg"} 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          alt="Card Skin" 
        />
        
        <div 
          className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
          style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)' }}
        />

        <div className="absolute z-20 flex flex-col items-end pointer-events-none" style={{ top: '4cqi', right: '4cqi' }}>
            <span className="font-black italic text-[#fe9a00] tracking-tighter drop-shadow-md" style={{ fontSize: '4.5cqi' }}>SATURDAY AM</span>
            <span className="font-black uppercase tracking-[0.3em] text-white drop-shadow-md" style={{ fontSize: '1.2cqi', marginTop: '0.5cqi' }}>Official Member</span>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
          className="absolute z-30 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
          style={{ bottom: '4cqi', right: '4cqi', padding: '1.5cqi' }}
          title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
        >
          {isFullscreen ? <X style={{ width: '3cqi', height: '3cqi' }} /> : <Maximize2 style={{ width: '3cqi', height: '3cqi' }} />}
        </button>

        {!isSubscriber && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <span className="text-zinc-500" style={{ marginBottom: '2cqi' }}><CreditCard style={{ width: '8cqi', height: '8cqi' }} /></span>
              <p className="text-zinc-300 font-black tracking-widest uppercase" style={{ fontSize: '2.5cqi', marginBottom: '3cqi' }}>Membership Inactive</p>
              <button onClick={(e) => { e.stopPropagation(); onRenew(); }} className="bg-[#fe9a00] text-black rounded-full font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all" style={{ padding: '2cqi 5cqi', fontSize: '2cqi' }}>
                Rejoin the Squad
              </button>
          </div>
        )}
      </div>

      {/* === BACK OF CARD === */}
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl bg-zinc-900 overflow-hidden flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700" style={{ padding: '5cqi' }}>
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)' }}
        />
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
            className="absolute top-0 right-0 z-30 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
            style={{ padding: '1.5cqi' }}
            title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
          >
            {isFullscreen ? <X style={{ width: '2.5cqi', height: '2.5cqi' }} /> : <Maximize2 style={{ width: '2.5cqi', height: '2.5cqi' }} />}
          </button>

          <div className="flex justify-between items-start border-b border-zinc-800" style={{ paddingBottom: '3.5cqi', paddingRight: '7cqi' }}>
            <div className="flex items-center" style={{ gap: '3cqi' }}>
              <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '14cqi', height: '14cqi' }}>
                <div className={`rounded-full overflow-hidden bg-black z-10 flex items-center justify-center ${getFrameStyle(frameId)}`} style={{ width: '12cqi', height: '12cqi' }}>
                  {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="text-zinc-600" style={{ width: '6cqi', height: '6cqi' }} />}
                </div>
                {getOrbitStyle(frameId) && <div className={`absolute w-full h-full rounded-full border-2 border-transparent ${getOrbitStyle(frameId)}`} />}
              </div>
              <div className="flex flex-col truncate" style={{ paddingTop: '1cqi' }}>
                <p className="font-black italic uppercase tracking-wider text-white truncate drop-shadow-md leading-none" style={{ fontSize: '5.5cqi', marginBottom: '1.5cqi' }}>{username}</p>
                <p className="text-[#fe9a00] font-black uppercase tracking-widest flex flex-wrap leading-tight" style={{ fontSize: '1.4cqi', gap: '1.5cqi' }}>
                  <span>MEMBER SINCE {memberSince}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">STORE DISCOUNT CODE: AMCLUB26</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end text-right justify-center" style={{ paddingTop: '1cqi' }}>
              <span className="text-[#fe9a00] font-black uppercase tracking-widest flex items-center" style={{ fontSize: '1.6cqi', gap: '0.8cqi' }}>
                 <Trophy style={{ width: '2cqi', height: '2cqi' }} /> Fan Rank
              </span>
              <span className="font-black italic text-white drop-shadow-[0_0_10px_rgba(254,154,0,0.5)] leading-none" style={{ fontSize: '6cqi', marginTop: '1.5cqi' }}>
                 #{globalRank}
              </span>
            </div>
          </div>

          <div className="flex justify-around items-center bg-black/40 border border-zinc-800/50 shadow-inner" style={{ padding: '3.5cqi 0', borderRadius: '2cqi', margin: 'auto 0' }}>
            <div className="text-center flex-1 border-r border-zinc-800/50">
              <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Hypes</p>
              <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}>
                <Flame style={{ width: '4cqi', height: '4cqi' }} /> {hypes}
              </p>
            </div>
            <div className="text-center flex-1 border-r border-zinc-800/50">
              <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Super</p>
              <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}>
                <Star style={{ width: '4cqi', height: '4cqi' }} /> {superHypes || 0}
              </p>
            </div>
            <div className="text-center flex-1 border-r border-zinc-800/50">
              <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Reacts</p>
              <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}>
                <img src={APP_ICONS.QUICK_REACT} alt="Reacts" className="object-contain" style={{ width: '4cqi', height: '4cqi' }} /> {reacts}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Reads</p>
              <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}>
                <BookOpen style={{ width: '4cqi', height: '4cqi' }} /> {chaptersRead}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center w-full">
            <p className="text-zinc-500 uppercase tracking-widest font-bold flex items-center" style={{ fontSize: '1.8cqi', gap: '1cqi', marginBottom: '2.5cqi' }}>
              <Star className="text-[#fe9a00]" style={{ width: '2.5cqi', height: '2.5cqi' }} /> Top 5 Stickers
            </p>
            <div className="flex w-full justify-between items-start" style={{ padding: '0 4cqi' }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const slug = topFive[i];
                const series = seriesList.find((s:any) => s.slug === slug);
                
                if (!series) {
                   return (
                     <div key={i} className="flex flex-col items-center" style={{ width: '16%' }}>
                       <div className="rounded-full border border-dashed border-zinc-700/50 bg-black/20 transition-all duration-300" style={{ width: '100%', aspectRatio: '1/1' }} />
                     </div>
                   );
                }
                
                const stickerImage = series.sticker_url || series.character_url || series.cover_url;

                return (
                  <div key={i} className="flex flex-col items-center" style={{ width: '16%' }}>
                    <div 
                      className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5] shadow-[2px_4px_8px_rgba(0,0,0,0.7)] transform hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer flex-shrink-0
                        ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'} 
                      `}
                      style={{ 
                        width: '100%', 
                        aspectRatio: '1/1',
                        borderWidth: '0.6cqi',
                        marginTop: i === 2 ? '-1.5cqi' : '0' 
                      }}
                    >
                      <img src={stickerImage} className="w-full h-full object-cover object-top" alt={`${series.title} sticker`} />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                    </div>
                    
                    <span className="font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight transition-all" style={{ fontSize: '1.3cqi', marginTop: '1.5cqi' }}>
                      {series.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="border-t border-zinc-800 pt-12 pb-12 w-full max-w-4xl mx-auto px-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" /> Digital AM Club Card
          </h3>
          <div className={`transition-opacity duration-300 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <button onClick={onChangeSkin} className="text-[10px] text-zinc-400 font-black uppercase tracking-widest hover:text-white transition-colors border border-zinc-800 hover:border-zinc-500 px-4 py-1.5 rounded-full bg-zinc-900">
              Change Skin
            </button>
          </div>
        </div>
        
        <div className="relative w-full max-w-sm mx-auto aspect-[1.58] card-perspective mb-8 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          {isSubscriber && <div className={`absolute -inset-4 bg-gradient-to-r from-[#fe9a00]/30 to-purple-600/30 blur-2xl opacity-50 rounded-[3rem] transition-opacity duration-1000`} />}
          {CardContent()}
        </div>
        
        {isSubscriber && !isFlipped && (
          <p className="text-center text-zinc-600 text-[8px] font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2 animate-pulse">
            Tap Card to Flip <RotateCcw className="w-3 h-3" />
          </p>
        )}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in" onClick={() => setIsFullscreen(false)}>
          <div className="w-full max-w-5xl aspect-[1.58] [perspective:1000px] cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
            {CardContent()}
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-12 animate-pulse flex items-center gap-2 md:text-sm">
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Tap anywhere on card to flip
          </p>
        </div>
      )}
    </>
  );
};