import React, { useState, useEffect } from 'react';
import { User, Trophy, Flame, Star, BookOpen, RotateCcw, X, MessageSquare, Share2, Heart } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { APP_ICONS } from '../appIcons';
import { FeatureTutorialModal, TutorialHelpButton } from '../Components/FeatureTutorialModal';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const hypeCardTutorialSlides = [
  {
    id: 'hypecard-1',
    title: 'Virtual Hype Card',
    description: 'Not only does your Hype Card cement your status as a Saturday AM superfan, but it also tracks your stats in real time and gives you a discount off in the AM shop. Included with all Pro subscriptions.',
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Videos/HypeCard.mp4'
  },
  {
    id: 'hypecard-2',
    title: 'Flex Your Fandom',
    description: 'Share your fandom with the world. Flex your card at live shows and events to get exclusive discounts on physical merch at our booth.',
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Images/FlexHypeCard.jpg'
  }
];

const getFandomTier = (lifetimeScore: number) => {
  const score = lifetimeScore || 0;
  const tiers = [
    { name: 'Leaf', min: 0, max: 99, color: 'text-emerald-500', hex: '#10b981', bar: 'bg-emerald-500' },
    { name: 'Stone', min: 100, max: 999, color: 'text-white', hex: '#ffffff', bar: 'bg-white' },
    { name: 'Bronze', min: 1000, max: 4999, color: 'text-amber-600', hex: '#d97706', bar: 'bg-amber-600' },
    { name: 'Silver', min: 5000, max: 19999, color: 'text-slate-300', hex: '#cbd5e1', bar: 'bg-slate-300' },
    { name: 'Gold', min: 20000, max: 49999, color: 'text-yellow-400', hex: '#facc15', bar: 'bg-yellow-400' },
    { name: 'Platinum', min: 50000, max: 99999, color: 'text-cyan-300', hex: '#67e8f9', bar: 'bg-cyan-300' },
    { name: 'Diamond', min: 100000, max: Infinity, color: 'text-fuchsia-400', hex: '#e879f9', bar: 'bg-fuchsia-400' }
  ];

  const currentIndex = tiers.findIndex(t => score >= t.min && score <= t.max);
  const currentTier = tiers[currentIndex !== -1 ? currentIndex : 0];
  const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

  let progressPercent = 100;
  if (nextTier) {
    progressPercent = Math.min(100, Math.max(0, ((score - currentTier.min) / (nextTier.min - currentTier.min)) * 100));
  }

  return { currentTier, nextTier, progressPercent };
};

const formatStat = (num: number) => {
  if (!num) return '0';
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

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
  const [profileStats, setProfileStats] = useState({ 
    total_hypes: 0, super_hypes: 0, quick_reacts: 0, chapters_read: 0, rank: "---", score: 0, shares: 0, creator_supports: 0 
  });
  const [userProfile, setUserProfile] = useState({ username: 'Reader', avatarUrl: '', cardSkin: '', frameId: '', topFive: [null, null, null, null, null] });
  const [isFlipped, setIsFlipped] = useState(false);
  const [avatarFrames, setAvatarFrames] = useState<any[]>([]);
  const [activeSkins, setActiveSkins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceTutorial, setForceTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
      return () => window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) { 
      setIsFlipped(false);
      if (screen.orientation && screen.orientation.unlock) {
        try { screen.orientation.unlock(); } catch (e) { /* ignore */ }
      }
      return; 
    }
    
    if (screen.orientation && screen.orientation.lock) {
      try {
        screen.orientation.lock('landscape').catch(() => {});
      } catch (e) { console.error(e); }
    }

    const fetchStatsAndRank = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: framesData } = await supabase.from('avatar_frames').select('*').eq('is_active', true);
      if (framesData) setAvatarFrames(framesData);

      const { data: skinsData } = await supabase.from('card_skins').select('*').eq('is_active', true);
      if (skinsData) setActiveSkins(skinsData);

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      
      let myRank: string | number = "---";

      const { data: myRankData } = await supabase.rpc('get_personal_rank', { target_user_id: user.id });
      if (myRankData && myRankData.length > 0) {
        myRank = Number(myRankData[0].rank);
      }

      if (data) {
        setProfileStats({ 
          total_hypes: data.total_hypes || 0, 
          super_hypes: data.super_hypes || 0, 
          quick_reacts: data.quick_reacts || 0, 
          chapters_read: data.chapters_read || 0, 
          shares: data.shares || 0,
          creator_supports: data.creator_supports || 0,
          rank: myRank as string,
          score: data.lifetime_score !== undefined ? data.lifetime_score : data.score || 0
        });
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

  const appliedSkin = activeSkins.find(s => s.image_url === userProfile.cardSkin);
  const defaultSkin = activeSkins.find(s => s.name?.toLowerCase() === 'saturday white') || {
    image_url: `${CLOUDFLARE_BASE_URL}/card-skins/saturday-white.png`,
    show_icon: true,
    icon_position: 'top-right'
  };
  const currentSkin = appliedSkin || defaultSkin;
  
  const { currentTier, nextTier, progressPercent } = getFandomTier(profileStats.score);

  return (
    <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden" onClick={onClose}>
      
      <FeatureTutorialModal 
        tutorialId="flex_hype_card" 
        slides={hypeCardTutorialSlides} 
        forceOpen={forceTutorial}
        onClose={() => setForceTutorial(false)}
      />

      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-[5010]">
        <TutorialHelpButton onClick={(e: any) => { e.stopPropagation(); setForceTutorial(true); }} />
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-black transition-colors z-[5010] shadow-xl">
        <X className="w-6 h-6" />
      </button>

      <div 
        className="relative w-full max-w-5xl aspect-[1.58] portrait:w-auto portrait:h-[calc(100vw-48px)] portrait:max-w-[calc(100dvh-120px)] portrait:rotate-90 flex-shrink-0" 
        style={{ perspective: '2000px', WebkitPerspective: '2000px' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
             <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div 
            className="absolute inset-0 w-full h-full cursor-pointer will-change-transform"
            style={{ 
              transformStyle: 'preserve-3d', 
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          >
            {/* FRONT OF CARD */}
            <div 
              className="absolute inset-0 w-full h-full rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700 overflow-hidden will-change-transform" 
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                WebkitTransform: 'rotateY(0deg)'
              }}
            >
              <div className="w-full h-full relative" style={{ containerType: 'inline-size' }}>
                <img src={currentSkin.image_url} className="absolute inset-0 w-full h-full object-cover z-0" alt="Card Skin" />
                <div className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)' }} />
                
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
            </div>

            {/* BACK OF CARD */}
            <div 
              className="absolute inset-0 w-full h-full rounded-2xl bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-700 overflow-hidden will-change-transform" 
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden', 
                transform: 'rotateY(180deg)',
                WebkitTransform: 'rotateY(180deg)'
              }}
            >
              <style>{`
                @keyframes heavy-pulse {
                  0%, 100% { opacity: 0.6; }
                  50% { opacity: 1; }
                }
              `}</style>
              
              {/* Cranked-Up Radial Background Glow */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none mix-blend-screen"
                style={{ 
                  background: `radial-gradient(ellipse at 50% 100%, ${currentTier.hex}80 0%, transparent 85%)`,
                  animation: 'heavy-pulse 4s ease-in-out infinite'
                }} 
              />
              
              <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)' }} />
              
              <div className="w-full h-full relative flex flex-col justify-between z-10" style={{ containerType: 'inline-size', padding: '4cqi 5cqi' }}>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  
                  {/* HEADER */}
                  <div className="flex justify-between items-start border-b border-white/10 w-full min-w-0" style={{ paddingBottom: '2.5cqi', paddingRight: '2cqi' }}>
                    <div className="flex items-center min-w-0 flex-1" style={{ gap: '3cqi', width: '60%' }}>
                      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '14cqi', height: '14cqi' }}>
                        <div className="rounded-full overflow-hidden bg-black z-10 flex items-center justify-center transition-all" style={{ width: '12cqi', height: '12cqi', border: frame ? `0.4cqi solid ${borderColor}` : 'none', boxShadow: glowColor !== 'transparent' ? `0 0 2cqi ${glowColor}` : 'none' }}>
                          {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="text-zinc-600" style={{ width: '6cqi', height: '6cqi' }} />}
                        </div>
                        <RenderCardAnimations anim={animStyle} color={borderColor} />
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <p className="font-black italic uppercase tracking-wider text-white drop-shadow-md leading-tight line-clamp-2 break-words" style={{ fontSize: '4.8cqi', marginBottom: '0.5cqi' }}>
                          {userProfile.username}
                        </p>
                        <p className="text-[#fe9a00] font-black uppercase tracking-widest truncate leading-tight w-full" style={{ fontSize: '1.4cqi', marginBottom: '1.2cqi' }}>
                          AM CLUB | EST. 2023
                        </p>
                        <h3 className="font-black uppercase tracking-widest italic text-[#fe9a00] drop-shadow-md" style={{ fontSize: '2.5cqi' }}>
                          AM Super Fan <span className={currentTier.color} style={{ fontSize: '2.5cqi', textShadow: `0 0 2cqi ${currentTier.hex}` }}>| {currentTier.name}</span>
                        </h3>
                      </div>
                    </div>

                    {/* HYPE CARD STATS UI */}
                    <div className="flex flex-col flex-shrink-0 ml-2" style={{ width: '35cqi', paddingTop: '1cqi' }}>
                      <div className="flex justify-between items-end" style={{ marginBottom: '1cqi' }}>
                        <div className="text-left">
                          <span className="font-bold text-zinc-400 uppercase tracking-widest block" style={{ fontSize: '1.6cqi', marginBottom: '0.5cqi' }}>
                            Monthly Rank
                          </span>
                          <span className="font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] leading-none block" style={{ fontSize: '4.5cqi' }}>
                            #{profileStats.rank}
                          </span>
                        </div>
                        <span className="font-black text-[#fe9a00] flex flex-col items-end justify-center" style={{ fontSize: '3cqi', textShadow: '0 0 1.5cqi rgba(254,154,0,0.5)' }}>
                          {profileStats.score?.toLocaleString() || 0} 
                          <span className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.2cqi', textShadow: 'none' }}>Points</span>
                        </span>
                      </div>

                      <div className="relative w-full bg-zinc-900 rounded-full border border-white/10 overflow-hidden shadow-inner" style={{ height: '2cqi', marginTop: '1.5cqi' }}>
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${currentTier.bar} shadow-[0_0_1cqi_rgba(255,255,255,0.3)]`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {nextTier ? (
                        <div className="flex justify-start items-center" style={{ marginTop: '1cqi' }}>
                          <span className="font-bold text-zinc-400 uppercase tracking-widest" style={{ fontSize: '1.4cqi' }}>
                            {Math.round(progressPercent)}% to <span style={{ color: nextTier.hex, textShadow: `0 0 1.5cqi ${nextTier.hex}` }}>{nextTier.name} Rank</span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-left" style={{ marginTop: '1cqi' }}>
                          <span className="font-black text-[#fe9a00] uppercase tracking-widest" style={{ fontSize: '1.4cqi' }}>
                            Max Rank Achieved
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STATS */}
                  <div className="flex justify-between items-center bg-black/40 border border-white/5 shadow-inner" style={{ padding: '2cqi 0', borderRadius: '2cqi', margin: 'auto 0' }}>
                    <div className="text-center flex-1 border-r border-white/5">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Hypes</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><Flame style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.total_hypes)}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-white/5">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Super</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><Star style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.super_hypes)}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-white/5">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Comments</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><MessageSquare style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.quick_reacts)}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-white/5">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Reads</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><BookOpen style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.chapters_read)}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-white/5">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Shares</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><Share2 style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.shares)}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: '1.1cqi', marginBottom: '0.8cqi' }}>Support</p>
                      <p className="font-black text-[#fe9a00] flex items-center justify-center drop-shadow-md" style={{ fontSize: '3cqi', gap: '0.8cqi' }}><Heart style={{ width: '2.5cqi', height: '2.5cqi' }} /> {formatStat(profileStats.creator_supports)}</p>
                    </div>
                  </div>

                  {/* TOP 5 */}
                  <div className="flex flex-col justify-center w-full">
                    <p className="text-zinc-400 uppercase tracking-widest font-bold flex items-center" style={{ fontSize: '1.4cqi', gap: '1cqi', marginBottom: '1.5cqi' }}><Star className="text-[#fe9a00]" style={{ width: '2cqi', height: '2cqi' }} /> Top 5 Stickers</p>
                    <div className="flex w-full justify-between items-start" style={{ padding: '0 3cqi' }}>
                      {[0, 1, 2, 3, 4].map((i) => {
                        const slug = userProfile.topFive[i];
                        const series = seriesList.find((s:any) => s.slug === slug);
                        if (!series) {
                           return (<div key={i} className="flex flex-col items-center" style={{ width: '16%' }}><div className="rounded-full border border-dashed border-zinc-700/50 bg-black/20 transition-all duration-300" style={{ width: '100%', aspectRatio: '1/1' }} /></div>);
                        }
                        const stickerImage = series.sticker_url || series.character_url || series.cover_url;
                        return (
                          <div key={i} className="flex flex-col items-center" style={{ width: '16%' }}>
                            <div className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5] shadow-[2px_4px_8px_rgba(0,0,0,0.7)] transform hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer flex-shrink-0 ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'}`} style={{ width: '100%', aspectRatio: '1/1', borderWidth: '0.6cqi', marginTop: i === 2 ? '-1cqi' : '0' }}>
                              <img src={stickerImage} className="w-full h-full object-cover object-top" alt={`${series.title} sticker`} />
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight transition-all drop-shadow-md" style={{ fontSize: '1.3cqi', marginTop: '1cqi' }}>{series.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Text Anchored to bottom of physical screen */}
      <p className="absolute bottom-8 md:bottom-12 text-zinc-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-2 pointer-events-none text-xs z-[5010]">
        <RotateCcw className="w-4 h-4" /> Tap anywhere on card to flip
      </p>
    </div>
  );
};