import React, { useState } from 'react';
import { CreditCard, RotateCcw, X, Maximize2, User, Flame, MessageCircle, BookOpen, Star } from 'lucide-react';

export const VirtualMemberCard = ({ isSubscriber, username, avatarUrl, frameId, memberSince, hypes, superHypes, reacts, chaptersRead, skinUrl, topFive, seriesList, onRenew, onChangeSkin, getFrameStyle, getOrbitStyle }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // The inner contents of the card, extracted so we can reuse it in normal and fullscreen modes
  const CardContent = () => (
    <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

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

        <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
            <span className="font-black italic text-[#fe9a00] text-sm sm:text-base tracking-tighter drop-shadow-md">SATURDAY AM</span>
            <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-white drop-shadow-md">Official Member</span>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 p-2 sm:p-2.5 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
          title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
        >
          {isFullscreen ? <X className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />}
        </button>

        {!isSubscriber && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <span className="text-zinc-500 mb-2"><CreditCard className="w-8 h-8" /></span>
              <p className="text-zinc-300 font-black tracking-widest text-xs mb-4 uppercase">Membership Inactive</p>
              <button onClick={(e) => { e.stopPropagation(); onRenew(); }} className="bg-[#fe9a00] text-black px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all">
                Rejoin the Squad
              </button>
          </div>
        )}
      </div>

      {/* === BACK OF CARD === */}
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl bg-zinc-900 overflow-hidden flex flex-col justify-between p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700">
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)' }}
        />
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} 
            className="absolute top-0 right-0 z-30 p-2 sm:p-2.5 bg-black/60 backdrop-blur-md rounded-full text-zinc-300 hover:text-white hover:bg-[#fe9a00] transition-colors shadow-lg"
            title={isFullscreen ? "Close Fullscreen" : "View Fullscreen"}
          >
            {isFullscreen ? <X className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>

          <div className="flex items-center gap-3 border-b border-zinc-800 pb-2 pr-10">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-black z-10 flex items-center justify-center ${getFrameStyle(frameId)}`}>
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="w-5 h-5 text-zinc-600" />}
              </div>
              {getOrbitStyle(frameId) && <div className={`absolute w-full h-full rounded-full border-2 border-transparent ${getOrbitStyle(frameId)}`} />}
            </div>
            <div className="flex flex-col truncate pt-1">
              <p className="font-black text-base sm:text-xl italic uppercase tracking-wider text-white truncate drop-shadow-md leading-none">{username}</p>
              <p className="text-[5px] sm:text-[6px] text-[#fe9a00] font-black uppercase tracking-widest mt-1.5 flex flex-wrap gap-x-1.5 leading-tight">
                <span>MEMBER SINCE {memberSince}</span>
                <span className="text-zinc-600 hidden sm:inline">|</span>
                <span className="text-zinc-400">STORE DISCOUNT CODE: AMCLUB26</span>
              </p>
            </div>
          </div>

          {/* FIX: Stats Row now perfectly symmetrical and fully Orange */}
          <div className={`flex justify-around items-center bg-black/40 rounded-lg border border-zinc-800/50 shadow-inner transition-all duration-300 ${isFullscreen ? 'p-3 sm:p-5 mt-4 mb-2' : 'p-2 mt-1'}`}>
            <div className="text-center w-1/4 border-r border-zinc-800/50">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Hypes</p>
              <p className={`font-black text-[#fe9a00] flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <Flame className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {hypes}
              </p>
            </div>
            <div className="text-center w-1/4 border-r border-zinc-800/50">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Super</p>
              <p className={`font-black text-[#fe9a00] flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <Star className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {superHypes || 0}
              </p>
            </div>
            <div className="text-center w-1/4 border-r border-zinc-800/50">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Reacts</p>
              <p className={`font-black text-[#fe9a00] flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <MessageCircle className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {reacts}
              </p>
            </div>
            <div className="text-center w-1/4">
              <p className={`text-zinc-500 uppercase tracking-widest transition-all duration-300 ${isFullscreen ? 'text-[8px] sm:text-[10px] mb-1' : 'text-[6px] sm:text-[8px] mb-0.5'}`}>Reads</p>
              <p className={`font-black text-[#fe9a00] flex items-center justify-center gap-1 transition-all duration-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'}`}>
                <BookOpen className={`transition-all duration-300 ${isFullscreen ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`} /> {chaptersRead}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center w-full mt-1 sm:mt-2 flex-1">
            <p className={`${isFullscreen ? 'text-[10px] sm:text-[12px] mb-2' : 'text-[8px] sm:text-[9px] mb-1.5'} text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all`}>
              <Star className={`${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} text-[#fe9a00]`} /> Top 5 Stickers
            </p>
            <div className="flex gap-1 w-full justify-between items-start px-1 sm:px-2">
              {[0, 1, 2, 3, 4].map((i) => {
                const slug = topFive[i];
                const series = seriesList.find((s:any) => s.slug === slug);
                
                if (!series) {
                   return (
                     <div key={i} className="flex flex-col items-center w-[18%] gap-1">
                       <div className={`${isFullscreen ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-full border border-dashed border-zinc-700/50 bg-black/20 m-0.5 transition-all duration-300`} />
                     </div>
                   );
                }
                
                const stickerImage = series.sticker_url || series.character_url || series.cover_url;

                return (
                  <div key={i} className="flex flex-col items-center w-[18%] gap-1">
                    <div 
                      className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5]
                        ${isFullscreen ? 'w-16 h-16 sm:w-20 sm:h-20 border-[3px] sm:border-[4px]' : 'w-10 h-10 sm:w-12 sm:h-12 border-[1.5px] sm:border-[2px]'} 
                        shadow-[2px_4px_8px_rgba(0,0,0,0.7)] 
                        transform hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer flex-shrink-0 m-0.5
                        ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'} 
                        ${i === 2 ? '-translate-y-1' : ''}
                      `}
                    >
                      <img 
                        src={stickerImage} 
                        className="w-full h-full object-cover object-top" 
                        alt={`${series.title} sticker`} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                    </div>
                    
                    <span className={`${isFullscreen ? 'text-[7px] sm:text-[9px] mt-1' : 'text-[5px] sm:text-[6px]'} font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight transition-all`}>
                      {series.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center pt-1">
            <p className="text-[6px] sm:text-[7px] text-zinc-500 uppercase tracking-widest leading-relaxed">
              Present this digital pass at live events for discounts.<br/>
              Use code <span className="text-white font-black">AMCLUB26</span> in the Shopify store.
            </p>
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
          <div className="w-full max-w-2xl aspect-[1.58] [perspective:1000px] cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
            {CardContent()}
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-12 animate-pulse flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Tap anywhere on card to flip
          </p>
        </div>
      )}
    </>
  );
};