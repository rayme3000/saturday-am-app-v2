import React, { useState, useEffect } from 'react';
import { User, Trophy, Flame, Star, BookOpen, RotateCcw, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { APP_ICONS } from '../appIcons';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// --- SEPARATED CARD ANIMATION RENDERER ---
const RenderCardAnimations = ({ anim, color }: { anim: string, color: string }) => {
  if (!anim || anim === 'none') return null;
  const sBorder = { borderWidth: '0.4cqi', borderStyle: 'solid' };
  const dBorder = { borderWidth: '0.4cqi', borderStyle: 'dashed' };
  
  return (
    <>
      {anim === 'orbit' && <div className="absolute rounded-full border-transparent pointer-events-none animate-[spin_3s_linear_infinite]" style={{ width: '130%', height: '130%', borderTopColor: color, borderRightColor: color, ...sBorder }} />}
      {anim === 'pulse' && <div className="absolute rounded-full pointer-events-none animate-ping opacity-20" style={{ width: '100%', height: '100%', backgroundColor: color }} />}
      {anim === 'spin' && <div className="absolute rounded-full pointer-events-none animate-[spin_4s_linear_infinite]" style={{ width: '115%', height: '115%', borderColor: color, ...dBorder }} />}
      {anim === 'aura-burst' && (
        <>
          <div className="absolute rounded-full opacity-60 animate-[ping_0.8s_ease-out_infinite]" style={{ width: '120%', height: '120%', borderColor: color, borderWidth: '0.6cqi', borderStyle: 'solid' }} />
          <div className="absolute rounded-full blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '130%', height: '130%', borderColor: color, borderWidth: '1cqi', borderStyle: 'solid' }} />
        </>
      )}
      {anim === 'evil-aura' && (
        <>
          <div className="absolute rounded-full blur-md animate-[spin_3s_linear_infinite_reverse] opacity-70" style={{ width: '140%', height: '140%', borderColor: color, borderTopColor: 'transparent', borderStyle: 'solid', borderWidth: '1.2cqi' }} />
          <div className="absolute rounded-full blur-sm animate-[pulse_2s_ease-in-out_infinite] opacity-80" style={{ width: '120%', height: '120%', borderColor: '#000000', borderBottomColor: color, borderStyle: 'solid', borderWidth: '0.6cqi' }} />
        </>
      )}
      {anim === 'blade-slash' && (
        <div className="absolute rounded-full border-transparent animate-[spin_0.5s_cubic-bezier(0.1,0.8,0.1,1)_infinite]" style={{ width: '150%', height: '150%', borderTopColor: color, borderRightColor: '#ffffff', borderWidth: '0.4cqi 0 0 0', borderStyle: 'solid' }} />
      )}
      {anim === 'chakra' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_1.5s_linear_infinite]" style={{ width: '120%', height: '120%', borderTopColor: color, borderBottomColor: color, borderWidth: '0.8cqi', borderStyle: 'solid', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full border-transparent animate-[spin_1s_linear_infinite_reverse]" style={{ width: '135%', height: '135%', borderLeftColor: color, borderRightColor: color, borderWidth: '0.4cqi', borderStyle: 'dashed' }} />
        </>
      )}
      {anim === 'spirit-bomb' && (
        <div className="absolute rounded-full bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '150%', height: '150%', boxShadow: `0 0 3cqi 1cqi ${color}, inset 0 0 1.5cqi 0.5cqi ${color}`, filter: 'blur(4px)' }} />
      )}
      {anim === 'limit-breaker' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_0.5s_linear_infinite]" style={{ width: '140%', height: '140%', borderTopColor: color, borderBottomColor: color, borderStyle: 'dashed', borderWidth: '0.8cqi' }} />
          <div className="absolute rounded-full animate-[ping_1s_ease-out_infinite] opacity-40" style={{ width: '110%', height: '110%', backgroundColor: color }} />
        </>
      )}
      {anim === 'hollow' && (
        <div className="absolute rounded-full border-transparent animate-[spin_2s_linear_infinite_reverse]" style={{ width: '125%', height: '125%', borderTopColor: color, borderBottomColor: '#000000', borderWidth: '1cqi', borderStyle: 'dotted' }} />
      )}
    </>
  );
};

export const GlobalFlexCard = ({ isOpen, onClose }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [profileStats, setProfileStats] = useState({ total_hypes: 0, super_hypes: 0, quick_reacts: 0, chapters_read: 0, rank: "---" });
  const [userProfile, setUserProfile] = useState({ username: 'Reader', avatarUrl: '', cardSkin: '', frameId: '', topFive: [null, null, null, null, null] });
  const [isFlipped, setIsFlipped] = useState(false);
  const [avatarFrames, setAvatarFrames] = useState<any[]>([]);
  const [activeSkins, setActiveSkins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) { setIsFlipped(false); return; }
    
    const fetchStatsAndRank = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch Frames
      const { data: framesData } = await supabase.from('avatar_frames').select('*').eq('is_active', true);
      if (framesData) setAvatarFrames(framesData);

      // Fetch Skins to apply Command Center rules
      const { data: skinsData } = await supabase.from('card_skins').select('*').eq('is_active', true);
      if (skinsData) setActiveSkins(skinsData);

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const { data: allProfiles } = await supabase.from('profiles').select('id, is_premium, total_hypes, super_hypes, quick_reacts, chapters_read');
      
      let myRank: string | number = "---";

      if (allProfiles) {
        const rankedFans = allProfiles
          .map((p) => {
            const score = (p.total_hypes || 0) * 1 + (p.quick_reacts || 0) * 5 + (p.chapters_read || 0) * 5 + (p.super_hypes || 0) * 10 + (p.is_premium ? 20 : 0);
            return { id: p.id, score };
          })
          .filter((p) => p.score > 0)
          .sort((a, b) => b.score - a.score);

        const myIndex = rankedFans.findIndex(f => f.id === user.id);
        if (myIndex !== -1) myRank = myIndex + 1;
      }

      if (data) {
        setProfileStats({ total_hypes: data.total_hypes || 0, super_hypes: data.super_hypes || 0, quick_reacts: data.quick_reacts || 0, chapters_read: data.chapters_read || 0, rank: myRank as string });
        setUserProfile({ username: data.username || 'Reader', avatarUrl: data.avatar_url || '', cardSkin: data.card_skin || '', frameId: data.avatar_frame_id || '', topFive: data.top_five || [null, null, null, null, null] });
      }
      setIsLoading(false);
    };
    fetchStatsAndRank();
  }, [isOpen]);

  if (!isOpen) return null;

  const frame = avatarFrames.find((f: any) => f.id === userProfile.frameId);
  const borderColor = frame ? frame.border_color : 'transparent';
  const glowColor = frame?.glow_color && frame.glow_color !== 'transparent' ? frame.glow_color : 'transparent';
  const animStyle = frame ? frame.animation_style : 'none';

  // Find the exact rules for the applied skin, or strictly default to Saturday White
  const appliedSkin = activeSkins.find(s => s.image_url === userProfile.cardSkin);
  const defaultSkin = activeSkins.find(s => s.name?.toLowerCase() === 'saturday white') || {
    image_url: `${CLOUDFLARE_BASE_URL}/card-skins/saturday-white.png`,
    show_icon: true,
    icon_position: 'top-right'
  };
  const currentSkin = appliedSkin || defaultSkin;

  return (
    <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-[5010] shadow-2xl"><X className="w-6 h-6" /></button>

      <div className="w-[100vw] h-[100vh] flex flex-col items-center justify-center card-perspective p-4 md:p-12">
        {isLoading ? (
          <div className="w-full max-w-5xl aspect-[1.58] rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
             <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div 
            className={`relative w-full max-w-5xl aspect-[1.58] cursor-pointer card-flipper ${isFlipped ? 'is-flipped' : ''}`}
            style={{ containerType: 'inline-size', transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          >
            {/* === FRONT OF CARD === */}
            <div className="absolute inset-0 rounded-xl overflow-hidden bg-white flex flex-col justify-end shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
              <img src={currentSkin.image_url} className="absolute inset-0 w-full h-full object-cover z-0" alt="Card Skin" />
              <div className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)' }} />
              
              {/* Overlays the foot icon dynamically based on Command Center rules */}
              {currentSkin.show_icon !== false && (
                <img 
                  src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" 
                  alt="Saturday AM Logo" 
                  className="absolute z-20 object-contain drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                  style={{ 
                    width: '7cqi', height: '7cqi',
                    top: currentSkin.icon_position === 'top-left' || currentSkin.icon_position === 'top-right' || !currentSkin.icon_position ? '4cqi' : 'auto',
                    bottom: currentSkin.icon_position === 'bottom-left' || currentSkin.icon_position === 'bottom-right' ? '4cqi' : 'auto',
                    left: currentSkin.icon_position === 'top-left' || currentSkin.icon_position === 'bottom-left' ? '4cqi' : 'auto',
                    right: currentSkin.icon_position === 'top-right' || currentSkin.icon_position === 'bottom-right' || !currentSkin.icon_position ? '4cqi' : 'auto'
                  }}
                />
              )}
            </div>

            {/* === BACK OF CARD === */}
            <div className="absolute inset-0 rounded-xl bg-zinc-900 overflow-hidden flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', WebkitTransform: 'rotateY(180deg)', padding: '5cqi' }}>
              <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)' }} />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start border-b border-zinc-800 w-full min-w-0" style={{ paddingBottom: '3.5cqi', paddingRight: '2cqi' }}>
                  <div className="flex items-center min-w-0 flex-1" style={{ gap: '3cqi' }}>
                    
                    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '14cqi', height: '14cqi' }}>
                      <div className="rounded-full overflow-hidden bg-black z-10 flex items-center justify-center transition-all" style={{ width: '12cqi', height: '12cqi', border: frame ? `0.4cqi solid ${borderColor}` : 'none', boxShadow: glowColor !== 'transparent' ? `0 0 2cqi ${glowColor}` : 'none' }}>
                        {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="text-zinc-600" style={{ width: '6cqi', height: '6cqi' }} />}
                      </div>
                      <RenderCardAnimations anim={animStyle} color={borderColor} />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1" style={{ paddingTop: '1cqi' }}>
                      <p className="font-black italic uppercase tracking-wider text-white truncate drop-shadow-md leading-none w-full" style={{ fontSize: '5.5cqi', marginBottom: '1.5cqi' }}>{userProfile.username}</p>
                      <p className="text-[#fe9a00] font-black uppercase tracking-widest truncate leading-tight w-full" style={{ fontSize: '1.4cqi' }}><span>MEMBER SINCE OCT 2023 | STORE DISCOUNT CODE: AMCLUB26</span></p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right justify-center flex-shrink-0 ml-2" style={{ paddingTop: '1cqi' }}>
                    <span className="text-[#fe9a00] font-black uppercase tracking-widest flex items-center" style={{ fontSize: '1.6cqi', gap: '0.8cqi' }}><Trophy style={{ width: '2cqi', height: '2cqi' }} /> Fan Rank</span>
                    <span className="font-black italic text-white drop-shadow-[0_0_10px_rgba(254,154,0,0.5)] leading-none" style={{ fontSize: '6cqi', marginTop: '1.5cqi' }}>#{profileStats.rank}</span>
                  </div>
                </div>

                <div className="flex justify-around items-center bg-black/40 border border-zinc-800/50 shadow-inner" style={{ padding: '3.5cqi 0', borderRadius: '2cqi', margin: 'auto 0' }}>
                  <div className="text-center flex-1 border-r border-zinc-800/50">
                    <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Hypes</p>
                    <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}><Flame style={{ width: '4cqi', height: '4cqi' }} /> {profileStats.total_hypes.toLocaleString()}</p>
                  </div>
                  <div className="text-center flex-1 border-r border-zinc-800/50">
                    <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Super</p>
                    <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}><Star style={{ width: '4cqi', height: '4cqi' }} /> {profileStats.super_hypes?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center flex-1 border-r border-zinc-800/50">
                    <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Reacts</p>
                    <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}><img src={APP_ICONS.QUICK_REACT} alt="Reacts" className="object-contain" style={{ width: '4cqi', height: '4cqi' }} /> {profileStats.quick_reacts.toLocaleString()}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.5cqi', marginBottom: '1.5cqi' }}>Reads</p>
                    <p className="font-black text-[#fe9a00] flex items-center justify-center" style={{ fontSize: '4.5cqi', gap: '1.5cqi' }}><BookOpen style={{ width: '4cqi', height: '4cqi' }} /> {profileStats.chapters_read.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center w-full">
                  <p className="text-zinc-500 uppercase tracking-widest font-bold flex items-center" style={{ fontSize: '1.8cqi', gap: '1cqi', marginBottom: '2.5cqi' }}><Star className="text-[#fe9a00]" style={{ width: '2.5cqi', height: '2.5cqi' }} /> Top 5 Stickers</p>
                  <div className="flex w-full justify-between items-start" style={{ padding: '0 4cqi' }}>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const slug = userProfile.topFive[i];
                      const series = seriesList.find((s:any) => s.slug === slug);
                      if (!series) {
                         return (<div key={i} className="flex flex-col items-center" style={{ width: '16%' }}><div className="rounded-full border border-dashed border-zinc-700/50 bg-black/20 transition-all duration-300" style={{ width: '100%', aspectRatio: '1/1' }} /></div>);
                      }
                      const stickerImage = series.sticker_url || series.character_url || series.cover_url;
                      return (
                        <div key={i} className="flex flex-col items-center" style={{ width: '16%' }}>
                          <div className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5] shadow-[2px_4px_8px_rgba(0,0,0,0.7)] transform hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer flex-shrink-0 ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'}`} style={{ width: '100%', aspectRatio: '1/1', borderWidth: '0.6cqi', marginTop: i === 2 ? '-1.5cqi' : '0' }}>
                            <img src={stickerImage} className="w-full h-full object-cover object-top" alt={`${series.title} sticker`} />
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                          </div>
                          <span className="font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight transition-all" style={{ fontSize: '1.3cqi', marginTop: '1.5cqi' }}>{series.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-zinc-500 font-bold uppercase tracking-widest mt-12 animate-pulse flex items-center gap-2 pointer-events-none text-[10px] md:text-sm"><RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Tap anywhere on card to flip</p>
      </div>
    </div>
  );
};