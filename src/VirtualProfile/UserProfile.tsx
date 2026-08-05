import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, BookOpen, Award, Check, Star, Settings, CreditCard, X, User, Plus, Lock, Trophy, Activity } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { APP_ICONS } from '../appIcons';

// --- NEW: Importing the standalone GlobalFlexCard component ---
import { GlobalFlexCard } from '../Components/GlobalFlexCard';

// --- SHARED PROFILE ANIMATION RENDERER ---
const RenderFrameAnimations = ({ anim, color }: { anim: string, color: string }) => {
  if (!anim || anim === 'none') return null;
  return (
    <>
      {/* Base Animations */}
      {anim === 'orbit' && <div className="absolute rounded-full border-2 border-transparent pointer-events-none animate-[spin_3s_linear_infinite]" style={{ width: '130%', height: '130%', borderTopColor: color, borderRightColor: color }} />}
      {anim === 'pulse' && <div className="absolute rounded-full pointer-events-none animate-ping opacity-20" style={{ width: '100%', height: '100%', backgroundColor: color }} />}
      {anim === 'spin' && <div className="absolute rounded-full pointer-events-none animate-[spin_4s_linear_infinite]" style={{ width: '115%', height: '115%', border: `2px dashed ${color}` }} />}

      {/* Anime Animations */}
      {anim === 'aura-burst' && (
        <>
          <div className="absolute rounded-full border-[3px] opacity-60 animate-[ping_0.8s_ease-out_infinite]" style={{ width: '120%', height: '120%', borderColor: color }} />
          <div className="absolute rounded-full border-[6px] blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '130%', height: '130%', borderColor: color }} />
        </>
      )}
      {anim === 'evil-aura' && (
        <>
          <div className="absolute rounded-full border-[8px] blur-md animate-[spin_3s_linear_infinite_reverse] opacity-70" style={{ width: '140%', height: '140%', borderColor: color, borderTopColor: 'transparent' }} />
          <div className="absolute rounded-full border-[4px] blur-sm animate-[pulse_2s_ease-in-out_infinite] opacity-80" style={{ width: '120%', height: '120%', borderColor: '#000000', borderBottomColor: color }} />
        </>
      )}
      {anim === 'blade-slash' && (
        <div className="absolute rounded-full border-transparent animate-[spin_0.5s_cubic-bezier(0.1,0.8,0.1,1)_infinite]" style={{ width: '150%', height: '150%', borderTopColor: color, borderRightColor: '#ffffff', borderWidth: '2px 0 0 0' }} />
      )}
      {anim === 'chakra' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_1.5s_linear_infinite]" style={{ width: '120%', height: '120%', borderTopColor: color, borderBottomColor: color, borderWidth: '4px', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full border-transparent animate-[spin_1s_linear_infinite_reverse]" style={{ width: '135%', height: '135%', borderLeftColor: color, borderRightColor: color, borderWidth: '2px', borderStyle: 'dashed' }} />
        </>
      )}
      {anim === 'spirit-bomb' && (
        <div className="absolute rounded-full bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '150%', height: '150%', boxShadow: `0 0 20px 5px ${color}, inset 0 0 15px 5px ${color}`, filter: 'blur(4px)' }} />
      )}
      {anim === 'limit-breaker' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_0.5s_linear_infinite]" style={{ width: '140%', height: '140%', borderTopColor: color, borderBottomColor: color, borderStyle: 'dashed', borderWidth: '4px', filter: `drop-shadow(0 0 10px ${color})` }} />
          <div className="absolute rounded-full animate-[ping_1s_ease-out_infinite] opacity-40" style={{ width: '110%', height: '110%', backgroundColor: color }} />
        </>
      )}
      {anim === 'hollow' && (
        <div className="absolute rounded-full border-transparent animate-[spin_2s_linear_infinite_reverse]" style={{ width: '125%', height: '125%', borderTopColor: color, borderBottomColor: '#000000', borderWidth: '6px', borderStyle: 'dotted', filter: `drop-shadow(0 0 5px ${color})` }} />
      )}
    </>
  );
};

export const UserProfile = ({ onBack, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [showFlexCard, setShowFlexCard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  const [vaultAvatars, setVaultAvatars] = useState<any[]>([]);
  const [cardSkins, setCardSkins] = useState<any[]>([]); 
  const [vaultFrames, setVaultFrames] = useState<any[]>([]); 
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);   
  const [upsellConfig, setUpsellConfig] = useState<{ title: string, message: string } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorToast, setErrorToast] = useState(''); 
  
  const [userProfile, setUserProfile] = useState({ username: 'Reader', avatarUrl: '', cardSkin: '', frameId: '', topFive: [null, null, null, null, null] as (string | null)[] });
  const [tempProfile, setTempProfile] = useState({...userProfile});
  const [profileStats, setProfileStats] = useState({ total_hypes: 0, super_hypes: 0, quick_reacts: 0, chapters_read: 0, rank: "---", score: 0 });
  const [unlockedHunts, setUnlockedHunts] = useState(0);
  const [totalHunts, setTotalHunts] = useState(11);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (typeof supabase !== 'undefined') {
        const { data: avatars } = await supabase.from('avatars').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (avatars) setVaultAvatars(avatars);
        const { data: skins } = await supabase.from('card_skins').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (skins) setCardSkins(skins);
        const { data: frames } = await supabase.from('avatar_frames').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (frames) setVaultFrames(frames);
      }
    };
    fetchData();
  }, []);

  // --- 2. FETCH USER STATS ---
  useEffect(() => {
    const savedHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
    setUnlockedHunts(savedHunts.length);
    const savedTotal = localStorage.getItem('am_bingo_total');
    if (savedTotal) setTotalHunts(parseInt(savedTotal));

    const fetchUserStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        const fallbackName = user.user_metadata?.username || 'Reader';
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const { data: allProfiles } = await supabase.from('profiles').select('id, is_premium, total_hypes, super_hypes, quick_reacts, chapters_read');
        let myRank: string | number = "---";
        let myScore = 0;

        if (allProfiles) {
          const rankedFans = allProfiles.map((p) => {
              const score = (p.total_hypes || 0) * 1 + (p.quick_reacts || 0) * 5 + (p.chapters_read || 0) * 5 + (p.super_hypes || 0) * 10 + (p.is_premium ? 20 : 0);
              return { id: p.id, score };
            }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score);

          const myIndex = rankedFans.findIndex(f => f.id === user.id);
          if (myIndex !== -1) { myRank = myIndex + 1; myScore = rankedFans[myIndex].score; }
        }

        if (data) {
          setProfileStats({ total_hypes: data.total_hypes || 0, super_hypes: data.super_hypes || 0, quick_reacts: data.quick_reacts || 0, chapters_read: data.chapters_read || 0, rank: myRank as string, score: myScore });
          setIsSubscriber(data.is_premium || false);
          const loadedProfile = { ...userProfile, username: data.username || fallbackName, topFive: data.top_five || [null, null, null, null, null], cardSkin: data.card_skin || '', avatarUrl: data.avatar_url || '', frameId: data.avatar_frame_id || '' };
          setUserProfile(loadedProfile);
          setTempProfile(loadedProfile);
        } else {
          setUserProfile({ ...userProfile, username: fallbackName });
          setTempProfile({ ...userProfile, username: fallbackName });
        }
      } else {
        setIsLoggedIn(false);
        setUserProfile({ username: 'Reader', avatarUrl: '', cardSkin: '', frameId: '', topFive: [null, null, null, null, null] });
      }
    };
    fetchUserStats();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => fetchUserStats());
    return () => authListener.subscription.unsubscribe();
  }, []);

  const openEditor = (targetTab = 'faves', slotIndex: number | null = null) => {
    if (!isLoggedIn) {
      setUpsellConfig({ title: 'create a free account', message: 'Create a Free Account to customize your profile loadout, equip your favorite series, and track your stats!' });
      return;
    }
    setTempProfile({...userProfile});
    setActiveTab(targetTab);
    setSelectingSlot(slotIndex);
    setIsEditing(true);
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const realName = user.user_metadata?.username || tempProfile.username;
      const { error } = await supabase.from('profiles').update({
          username: realName, top_five: tempProfile.topFive, card_skin: tempProfile.cardSkin,
          avatar_url: tempProfile.avatarUrl, avatar_frame_id: tempProfile.frameId === '' ? null : tempProfile.frameId
        }).eq('id', user.id);
      if (error) { setErrorToast("Failed to save! Please check your connection."); setTimeout(() => setErrorToast(''), 3000); return; }
    }
    setUserProfile({...tempProfile});
    setIsEditing(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: tempProfile.avatarUrl, avatar_frame_id: tempProfile.frameId === '' ? null : tempProfile.frameId } }));
  };

  const fallbackSeriesList = [
    { slug: 'apple-black', title: 'Apple Black', creator_name: 'Whyt Manga', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/apple-black-cover.jpg' },
    { slug: 'clock-striker', title: 'Clock Striker', creator_name: 'Frederick Ward', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/clock-striker-cover.jpg' }
  ];
  const displaySeriesList = seriesList && seriesList.length > 0 ? seriesList : fallbackSeriesList;

  const renderAvatarWithFrame = (avatarUrl: string, frameId: string, sizeClass = "w-32 h-32 sm:w-40 sm:h-40", iconSize = "w-12 h-12") => {
    const frame = vaultFrames.find(f => f.id === frameId);
    const borderColor = frame ? frame.border_color : 'transparent';
    const glowColor = frame?.glow_color && frame.glow_color !== 'transparent' ? frame.glow_color : 'transparent';
    const animStyle = frame ? frame.animation_style : 'none';

    return (
      <div className={`relative flex items-center justify-center flex-shrink-0 ${sizeClass}`}>
         <div className={`rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center z-10 w-full h-full transition-all shadow-xl`} style={{ border: frame ? `2px solid ${borderColor}` : '2px solid transparent', boxShadow: glowColor !== 'transparent' ? `0 0 15px ${glowColor}` : 'none' }}>
           {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className={`${iconSize} text-zinc-500`} />}
         </div>
         <RenderFrameAnimations anim={animStyle} color={borderColor} />
      </div>
    );
  };

  const renderMiniCard = (seriesSlug: string, isEditingMode: boolean, onClick: () => void) => {
    const series = displaySeriesList.find((s: any) => s.slug === seriesSlug);
    if (!series) return null;
    return (
      <div onClick={onClick} className={`w-24 sm:w-28 flex-shrink-0 aspect-[2/3] relative rounded-lg overflow-hidden cursor-pointer group/card transition-all ${isEditingMode ? 'border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)]' : 'border border-zinc-800 shadow-lg hover:border-[#fe9a00]/50'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
        <img src={series.character_url || series.cover_url} loading="lazy" alt="Character" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-30 px-2 h-8 sm:h-10">
          {series.logo_url ? <img src={series.logo_url} loading="lazy" alt={series.title} className="w-full max-h-full object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" /> : <span className="text-[7px] sm:text-[8px] font-black uppercase text-white text-center drop-shadow-md leading-tight line-clamp-2">{series.title}</span>}
        </div>
        {isEditingMode && <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity backdrop-blur-[2px]"><span className="text-[#fe9a00] font-black text-[8px] uppercase tracking-widest shadow-xl">Change</span></div>}
      </div>
    );
  };

  const renderEmptySlot = (onClick: () => void) => (
    <div onClick={onClick} className="w-24 sm:w-28 flex-shrink-0 aspect-[2/3] border-2 border-dashed border-zinc-800 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-[#fe9a00] hover:shadow-[0_0_15px_rgba(254,154,0,0.2)] bg-black/50 hover:bg-zinc-900/50 transition-all group">
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full group-hover:bg-[#fe9a00] transition-colors mb-2 shadow-lg"><Plus className="w-5 h-5 text-zinc-500 group-hover:text-black transition-colors" /></div>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-[#fe9a00] transition-colors">Choose a series</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-white relative pb-20">
      
      {/* --- NEW: Renders the connected Flex Card component when triggered --- */}
      <GlobalFlexCard isOpen={showFlexCard} onClose={() => setShowFlexCard(false)} />

      <div className="fixed inset-0 z-[-1] bg-black">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden" />
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      {showSuccessToast && <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[5000] bg-[#fe9a00] text-black px-6 py-3 rounded-full font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.4)] animate-fade-in"><Check className="w-5 h-5" /> Loadout Saved!</div>}
      {errorToast && <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[5000] bg-red-600 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-fade-in"><X className="w-5 h-5" /> {errorToast}</div>}

      <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-zinc-900/90 rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors z-20 transform -skew-x-12">
        <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
      </button>

      {upsellConfig && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setUpsellConfig(null)}>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]"><Lock className="w-8 h-8 text-[#fe9a00]" /></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{upsellConfig.title}</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            <button onClick={() => { setUpsellConfig(null); onNavigate({ action: 'settings' }); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">Sign up / Subscribe</button>
          </div>
        </div>
      )}

      <div className="w-full h-48 sm:h-64 bg-black/40 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
      </div>

      <div className="max-w-4xl mx-auto relative -mt-16 sm:-mt-24">
        
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8 px-6">
          <div className="relative group cursor-pointer" onClick={() => openEditor('frame')}>
            {renderAvatarWithFrame(userProfile.avatarUrl, userProfile.frameId)}
          </div>
          <div className="text-center sm:text-left pb-2">
            <button onClick={() => openEditor('faves')} className="flex items-center gap-2 bg-[#fe9a00] text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all mb-3 shadow-[0_0_15px_rgba(254,154,0,0.3)]"><Settings className="w-3 h-3" /> Edit Profile</button>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter drop-shadow-lg">{userProfile.username}</h1>
            <p className={`text-xs font-black uppercase tracking-widest mt-1 italic drop-shadow-md ${isSubscriber ? 'text-purple-400' : 'text-zinc-400'}`}>{isSubscriber ? 'Premium Saturday AM+ Member' : 'Standard Member'}</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-3 mt-4 sm:mt-0">
            <button onClick={() => onNavigate({ action: 'settings' })} className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 p-3 rounded-full hover:border-white transition-colors group"><Settings className="w-5 h-5 text-zinc-400 group-hover:text-white" /></button>
          </div>
        </div>

        <div className="px-6 mb-10">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6 bg-gradient-to-r from-zinc-900/90 via-black/80 to-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe9a00]/10 rounded-bl-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="bg-[#fe9a00]/20 p-4 rounded-full border border-[#fe9a00]/50 shadow-[0_0_15px_rgba(254,154,0,0.3)]"><Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#fe9a00]" /></div>
              <div className="flex flex-col text-center sm:text-left">
                <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1">Global AM Super Fan Rank</h3>
                <div className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-[#fe9a00] drop-shadow-md">#{profileStats.rank}</div>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end sm:ml-auto border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Fandom Score</span>
              <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-[#fe9a00]" /> {profileStats.score.toLocaleString()}</div>
              <button onClick={() => onNavigate({ action: 'leaderboard' })} className="w-full sm:w-auto bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-white border border-zinc-700 hover:border-[#fe9a00] px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(254,154,0,0.4)]">View Leaderboard</button>
            </div>
          </div>
        </div>

        <div className="mb-12 border-t border-zinc-800/50 pt-8 px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="flex flex-col gap-1 p-5 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-xl"><Flame className="w-6 h-6 text-[#fe9a00] mb-2" /><span className="text-3xl font-black">{profileStats.total_hypes.toLocaleString()}</span><span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Hypes</span></div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-xl"><Star className="w-6 h-6 text-[#fe9a00] mb-2" /><span className="text-3xl font-black">{profileStats.super_hypes?.toLocaleString() || 0}</span><span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Super Hypes</span></div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-xl"><img src={APP_ICONS.QUICK_REACT} alt="Reacts" className="w-6 h-6 object-contain mb-2 drop-shadow-md" /><span className="text-3xl font-black">{profileStats.quick_reacts.toLocaleString()}</span><span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Quick Reacts</span></div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-xl"><BookOpen className="w-6 h-6 text-[#fe9a00] mb-2" /><span className="text-3xl font-black">{profileStats.chapters_read.toLocaleString()}</span><span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Chapters Read</span></div>
            <div className={`flex flex-col gap-1 p-5 bg-zinc-900/80 backdrop-blur-md rounded-xl border relative overflow-hidden shadow-xl ${isSubscriber ? 'border-[#fe9a00]/30' : 'border-zinc-800 opacity-50'}`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${isSubscriber ? 'bg-[#fe9a00]/10' : 'bg-zinc-800'}`}></div>
              <Award className={`w-6 h-6 mb-2 relative z-10 ${isSubscriber ? 'text-[#fe9a00]' : 'text-zinc-500'}`} />
              <span className="text-2xl font-black mt-1 text-white relative z-10">{isSubscriber ? 'Active' : 'N/A'}</span>
              <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold relative z-10">Premium Status</span>
            </div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-5 md:p-6 mb-2 mt-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Check className="w-4 h-4 text-[#fe9a00]" /> Bingo Book Hunts</h3>
                <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase"><span className="text-[#fe9a00]">{unlockedHunts}</span> / {totalHunts} Completed</span>
              </div>
              <div className="w-full h-2.5 bg-black border border-zinc-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#fe9a00] to-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (unlockedHunts / Math.max(1, totalHunts)) * 100)}%` }} />
              </div>
            </div>
            <button onClick={() => onNavigate({ action: 'bingobook' })} className="w-full sm:w-auto bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-white border border-zinc-700 hover:border-[#fe9a00] px-6 py-3 sm:py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(254,154,0,0.4)]">Open Bingo Book</button>
          </div>
          
          <div className="flex justify-between items-end mb-4 mt-12">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-md"><Star className="w-4 h-4 text-[#fe9a00]" /> Top 5 Fave Series</h3>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[0, 1, 2, 3, 4].map((index) => {
              const slug = userProfile.topFive[index];
              return slug ? renderMiniCard(slug, false, () => openEditor('faves', index)) : renderEmptySlot(() => openEditor('faves', index));
            })}
          </div>
        </div>

        {!isSubscriber ? (
          <div className="flex flex-col items-center w-full mt-12 mb-12 px-6">
            <div className="relative w-full max-w-sm aspect-[1.58] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl mb-6 group cursor-pointer" onClick={() => setUpsellConfig({ title: 'Premium Feature', message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.' })}>
              <div className="absolute inset-0 bg-zinc-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-center p-6 text-center">
                 <div className="w-14 h-14 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]"><Lock className="w-6 h-6 text-zinc-400"/></div>
                 <h3 className="text-white font-black italic text-xl uppercase tracking-widest mb-1 drop-shadow-md">AM Crew Card</h3>
                 <p className="text-[10px] text-[#fe9a00] font-bold uppercase tracking-widest leading-relaxed drop-shadow-md">Customize and get exclusive perks!</p>
              </div>
            </div>
            <button onClick={() => { setUpsellConfig({ title: 'Premium Feature', message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.' }); }} className="flex items-center gap-3 bg-zinc-800 text-white border border-zinc-700 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] hover:scale-105 transition-all shadow-lg w-full sm:w-auto justify-center"><CreditCard className="w-5 h-5"/> Subscribe to Unlock</button>
          </div>
        ) : (
          <div className="flex justify-center w-full mt-12 mb-8">
            <button onClick={() => setShowFlexCard(true)} className="flex items-center gap-4 bg-white text-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] w-max"><CreditCard className="w-6 h-6"/> Flex AM Crew Card</button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-black">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Customize Loadout</h2>
              <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0 bg-black">
              <button onClick={() => { setActiveTab('faves'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'faves' ? 'bg-zinc-800 text-[#fe9a00]' : 'text-zinc-500 hover:text-white'}`}>Top 5</button>
              <button onClick={() => { setActiveTab('art'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'art' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Avatar Art</button>
              <button onClick={() => { setActiveTab('frame'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'frame' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Border Frame</button>
              <button onClick={() => { setActiveTab('card'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'card' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Club Card</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-black/40 no-scrollbar">
              
              {activeTab === 'faves' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-2">Equip your favorite series to your profile</p>
                  <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar">
                    {[0, 1, 2, 3, 4].map((index) => {
                      const slug = tempProfile.topFive[index];
                      const isSelected = selectingSlot === index;
                      return (
                        <div key={index} className={`relative transition-transform ${isSelected ? 'scale-110 z-10' : ''}`}>
                          {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#fe9a00] animate-bounce shadow-[0_0_10px_#fe9a00]" />}
                          {slug ? renderMiniCard(slug, true, () => setSelectingSlot(index)) : renderEmptySlot(() => setSelectingSlot(index))}
                        </div>
                      );
                    })}
                  </div>

                  {selectingSlot !== null && (
                    <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl mt-4 animate-fade-in-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
                        <h4 className="text-[#fe9a00] text-[10px] font-black uppercase tracking-widest">Select Series for Slot {selectingSlot + 1}</h4>
                        <button onClick={() => { const newLoadout = [...tempProfile.topFive]; newLoadout[selectingSlot] = null; setTempProfile({...tempProfile, topFive: newLoadout}); setSelectingSlot(null); }} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 border border-red-900/30 px-3 py-1.5 rounded transition-colors bg-red-900/10 hover:bg-red-900/30">Clear Slot</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {displaySeriesList.map((s: any) => {
                          const isAlreadyEquipped = tempProfile.topFive.includes(s.slug);
                          return (
                            <div key={s.slug} onClick={() => { if (isAlreadyEquipped) return; const newLoadout = [...tempProfile.topFive]; newLoadout[selectingSlot] = s.slug; setTempProfile({...tempProfile, topFive: newLoadout}); setSelectingSlot(null); }} className={`relative rounded overflow-hidden cursor-pointer group border flex items-center gap-2 p-1.5 transition-all ${isAlreadyEquipped ? 'opacity-30 border-zinc-800 cursor-not-allowed' : 'border-zinc-800 hover:border-[#fe9a00] bg-black hover:bg-zinc-900'}`}>
                              <img src={s.cover_url} loading="lazy" className="w-8 h-12 object-cover rounded-sm border border-zinc-800" alt="cover" />
                              <span className="text-[9px] font-bold text-white uppercase leading-tight tracking-wider pr-1">{s.title}</span>
                              {isAlreadyEquipped && <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-black text-red-500 uppercase tracking-widest backdrop-blur-[1px]">Equipped</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'card' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-4">Select an artwork skin for your digital club card</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div onClick={() => setTempProfile({...tempProfile, cardSkin: ''})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${!tempProfile.cardSkin ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-zinc-500'}`}>
                      <div className="absolute inset-0 bg-zinc-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80 mix-blend-overlay" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">Carbon Black</span></div>
                    </div>

                    {cardSkins.map((skin: any) => (
                      <div key={skin.id} 
                           onClick={() => {
                              if (!isSubscriber) { setUpsellConfig({ title: 'Premium Feature', message: 'Custom AM Card Skins are exclusively for Pro members! Upgrade to customize your digital pass.' }); return; }
                              setTempProfile({...tempProfile, cardSkin: skin.image_url})
                           }} 
                           className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${tempProfile.cardSkin === skin.image_url ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-[#fe9a00]/50'}`}>
                        <img src={skin.image_url} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" alt={skin.name} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest text-white text-center px-2">{skin.name}</span></div>
                        {!isSubscriber && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10"><Lock className="w-6 h-6 text-zinc-400" /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'art' && (
                <>
                  <div className="flex items-center justify-center mb-8">
                     <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center border-transparent shadow-xl">
                       {tempProfile.avatarUrl ? <img src={tempProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-zinc-500" />}
                     </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    <div onClick={() => setTempProfile({...tempProfile, avatarUrl: ''})} className={`relative cursor-pointer rounded-full p-1 transition-all ${!tempProfile.avatarUrl ? 'bg-[#fe9a00] scale-110 shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'hover:bg-zinc-700'}`}>
                      <div className="w-full aspect-square bg-zinc-800 rounded-full border-2 border-black flex items-center justify-center"><User className="w-8 h-8 text-zinc-500" /></div>
                    </div>
                    {vaultAvatars.map(avatar => (
                      <div key={avatar.id} onClick={() => setTempProfile({...tempProfile, avatarUrl: avatar.image_url})} className={`relative cursor-pointer rounded-full p-1 transition-all ${tempProfile.avatarUrl === avatar.image_url ? 'bg-[#fe9a00] scale-110 shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'hover:bg-zinc-700'}`}>
                        <img src={avatar.image_url} loading="lazy" alt={avatar.name} className="w-full aspect-square object-cover rounded-full border-2 border-black" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'frame' && (
                <>
                  <div className="flex items-center justify-center mb-8">
                     {renderAvatarWithFrame(tempProfile.avatarUrl, tempProfile.frameId, "w-24 h-24 sm:w-32 sm:h-32")}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    <div onClick={() => setTempProfile({...tempProfile, frameId: ''})} className={`relative flex flex-col items-center justify-center cursor-pointer rounded-xl p-3 transition-all ${!tempProfile.frameId ? 'bg-zinc-800 border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'bg-black border border-zinc-800 hover:border-zinc-500'}`}>
                      <div className="w-12 h-12 rounded-full border-2 border-zinc-700 mb-2 flex items-center justify-center"><X className="w-6 h-6 text-zinc-500" /></div>
                      <span className="text-[9px] font-black uppercase text-zinc-400">None</span>
                    </div>
                    
                    {vaultFrames.map((f: any) => (
                      <div key={f.id} 
                           onClick={() => {
                             if (f.tier === 'Premium' && !isSubscriber) {
                               setUpsellConfig({ title: 'Premium Feature', message: 'Premium Avatar Frames are exclusively for Pro members! Upgrade to equip this frame.' });
                               return;
                             }
                             setTempProfile({...tempProfile, frameId: f.id});
                           }} 
                           className={`relative flex flex-col items-center justify-center cursor-pointer rounded-xl p-3 transition-all ${tempProfile.frameId === f.id ? 'bg-zinc-800 border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)]' : 'bg-black border border-zinc-800 hover:border-zinc-500'}`}>
                        
                        <div className="relative flex items-center justify-center w-12 h-12 mb-2 flex-shrink-0">
                           <div className="rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 w-full h-full" style={{ border: `2px solid ${f.border_color}`, boxShadow: f.glow_color !== 'transparent' ? `0 0 10px ${f.glow_color}` : 'none' }} />
                           <RenderFrameAnimations anim={f.animation_style} color={f.border_color} />
                        </div>

                        <span className="text-[9px] font-black text-white uppercase text-center leading-tight line-clamp-1">{f.name}</span>
                        <span className={`text-[7px] font-bold uppercase mt-1 ${f.tier === 'Premium' ? 'text-purple-400' : 'text-zinc-500'}`}>{f.tier}</span>
                        
                        {f.tier === 'Premium' && !isSubscriber && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-xl">
                            <Lock className="w-5 h-5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-black">
              <button onClick={saveProfile} className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">
                Save & Equip Loadout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};