import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, BookOpen, Award, Check, Star, Settings, CreditCard, X, User, RotateCcw, Plus, Lock } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// --- 1. GLOBAL FLEX CARD COMPONENT ---
export const GlobalFlexCard = ({ isOpen, onClose }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [profileStats, setProfileStats] = useState({ total_hypes: 0, super_hypes: 0, quick_reacts: 0, chapters_read: 0 });
  const [userProfile, setUserProfile] = useState({ username: 'Reader', avatarUrl: '', frameId: 'none', cardSkin: '', topFive: [null, null, null, null, null] });
  const [isFlipped, setIsFlipped] = useState(false);

  const BASIC_FRAMES = [
    { id: 'none', name: 'Original', style: 'border-2 border-zinc-800' },
    { id: 'red', name: 'Solid Red', style: 'border-2 border-red-600' },
    { id: 'yellow', name: 'Solid Yellow', style: 'border-2 border-yellow-500' },
    { id: 'cyan', name: 'Solid Cyan', style: 'border-2 border-cyan-500' },
  ];
  
  const PREMIUM_FRAMES = [
    { id: 'gold', name: 'Ultra Gold', style: 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]', orbit: 'border-t-yellow-400 border-r-yellow-400 animate-[spin_3s_linear_infinite]' },
    { id: 'appleblack', name: 'Apple Black', style: 'border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]', orbit: 'border-t-red-500 border-l-red-500 animate-[spin_2.5s_linear_infinite]' },
    { id: 'clockstriker', name: 'Clock Striker', style: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]', orbit: 'border-b-cyan-400 border-r-cyan-400 animate-[spin_3s_linear_infinite_reverse]' },
  ];

  const getFrameStyle = (id: string) => [...BASIC_FRAMES, ...PREMIUM_FRAMES].find(f => f.id === id)?.style || 'border-2 border-zinc-800';
  const getOrbitStyle = (id: string) => PREMIUM_FRAMES.find(f => f.id === id)?.orbit || '';

  useEffect(() => {
    if (!isOpen) { setIsFlipped(false); return; }
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfileStats({ total_hypes: data.total_hypes || 0, super_hypes: data.super_hypes || 0, quick_reacts: data.quick_reacts || 0, chapters_read: data.chapters_read || 0 });
          // FIXED: Corrected column names here so the Flex Card properly reads them
          setUserProfile({ username: data.username || 'Reader', avatarUrl: data.avatar_url || '', frameId: data.frame_url || 'none', cardSkin: data.card_skin_url || '', topFive: data.top_series || [null, null, null, null, null] });
        }
      }
    };
    fetchStats();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-[350] shadow-2xl">
        <X className="w-6 h-6" />
      </button>

      <div className="w-[100vw] h-[100vh] flex flex-col items-center justify-center card-perspective p-4 md:p-12">
        <div 
          className={`relative w-full max-w-4xl aspect-[1.58] cursor-pointer card-flipper ${isFlipped ? 'is-flipped' : ''}`}
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
        >
          {/* === FRONT OF CARD === */}
          <div className="absolute inset-0 w-full h-full bg-zinc-900 rounded-2xl md:rounded-[2rem] border-2 border-zinc-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden card-face flex flex-col justify-end">
            <img src={userProfile.cardSkin || "https://zcadkovymrnjpjaxvnao.supabase.co/storage/v1/object/public/card-skins/skins/1781908112888_8ozh4h.jpg"} className="absolute inset-0 w-full h-full object-cover z-0" alt="Card Skin" />
            <div className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)' }} />
            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 pointer-events-none">
              <img 
                src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" 
                alt="Saturday AM" 
                className="h-8 md:h-14 object-contain drop-shadow-xl" 
              />
            </div>
          </div>

          {/* === BACK OF CARD === */}
          <div className="absolute inset-0 w-full h-full bg-zinc-900 rounded-2xl md:rounded-[2rem] border-2 border-zinc-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between p-4 md:p-10 card-face card-back">
            <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 25%, transparent 30%, transparent 45%, rgba(255,255,255,0.02) 50%, transparent 55%)' }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              
              <div className="flex items-center gap-4 border-b border-zinc-800 pb-4 md:pb-6">
                <div className="relative w-16 h-16 md:w-24 md:h-24 flex items-center justify-center flex-shrink-0">
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden bg-black z-10 flex items-center justify-center ${getFrameStyle(userProfile.frameId)}`}>
                    {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <User className="w-8 h-8 md:w-10 md:h-10 text-zinc-600" />}
                  </div>
                  {getOrbitStyle(userProfile.frameId) && <div className={`absolute w-full h-full rounded-full border-2 border-transparent ${getOrbitStyle(userProfile.frameId)}`} />}
                </div>
                <div className="flex flex-col truncate pt-1">
                  <p className="font-black text-2xl md:text-5xl italic uppercase tracking-wider text-white truncate drop-shadow-md leading-none">{userProfile.username}</p>
                  <p className="text-[8px] md:text-[12px] text-[#fe9a00] font-black uppercase tracking-widest mt-2 flex flex-wrap gap-x-2 leading-tight">
                    <span>MEMBER SINCE OCT 2023</span>
                    <span className="text-zinc-600 hidden sm:inline">|</span>
                    <span className="text-zinc-400">STORE DISCOUNT CODE: AMCLUB26</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-around items-center bg-black/40 rounded-xl border border-zinc-800/50 shadow-inner p-4 md:p-6 mt-4 mb-4">
                <div className="text-center flex-1 border-r border-zinc-800/50 px-1">
                  <p className="text-zinc-500 uppercase tracking-widest text-[8px] md:text-xs mb-1 md:mb-2">Hypes</p>
                  <p className="font-black text-[#fe9a00] flex items-center justify-center gap-1 md:gap-2 text-lg md:text-3xl">
                    <Flame className="w-4 h-4 md:w-6 md:h-6" /> {profileStats.total_hypes.toLocaleString()}
                  </p>
                </div>
                <div className="text-center flex-1 border-r border-zinc-800/50 px-1">
                  <p className="text-zinc-500 uppercase tracking-widest text-[8px] md:text-xs mb-1 md:mb-2">Super</p>
                  <p className="font-black text-purple-500 flex items-center justify-center gap-1 md:gap-2 text-lg md:text-3xl">
                    <Star className="w-4 h-4 md:w-6 md:h-6" /> {profileStats.super_hypes?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center flex-1 border-r border-zinc-800/50 px-1">
                  <p className="text-zinc-500 uppercase tracking-widest text-[8px] md:text-xs mb-1 md:mb-2">Reacts</p>
                  <p className="font-black text-cyan-400 flex items-center justify-center gap-1 md:gap-2 text-lg md:text-3xl">
                    <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Quick%20React%20icon.png" alt="Quick React" className="w-4 h-4 md:w-6 md:h-6 object-contain" /> {profileStats.quick_reacts.toLocaleString()}
                  </p>
                </div>
                <div className="text-center flex-1 px-1">
                  <p className="text-zinc-500 uppercase tracking-widest text-[8px] md:text-xs mb-1 md:mb-2">Reads</p>
                  <p className="font-black text-zinc-300 flex items-center justify-center gap-1 md:gap-2 text-lg md:text-3xl">
                    <BookOpen className="w-4 h-4 md:w-6 md:h-6" /> {profileStats.chapters_read.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center w-full flex-1">
                <p className="text-[10px] md:text-sm text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-2 md:mb-4">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-[#fe9a00]" /> Top 5 Stickers
                </p>
                <div className="flex gap-2 md:gap-6 w-full justify-between items-start px-2 md:px-8">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const slug = userProfile.topFive[i];
                    const series = seriesList.find((s:any) => s.slug === slug);
                    
                    if (!series) {
                       return (
                         <div key={i} className="flex flex-col items-center w-[18%] gap-2">
                           <div className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 border-dashed border-zinc-700/50 bg-black/20 transition-all duration-300" />
                         </div>
                       );
                    }
                    
                    const stickerImage = series.sticker_url || series.character_url || series.cover_url;

                    return (
                      <div key={i} className="flex flex-col items-center w-[18%] gap-2">
                        <div 
                          className={`relative rounded-full overflow-hidden bg-[#f4f4f5] border-[#f4f4f5]
                            w-16 h-16 md:w-32 md:h-32 border-[3px] md:border-[6px]
                            shadow-[2px_4px_8px_rgba(0,0,0,0.7)] md:shadow-[4px_8px_16px_rgba(0,0,0,0.7)]
                            transform hover:scale-110 transition-all duration-300 flex-shrink-0
                            ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'} 
                            ${i === 2 ? '-translate-y-2 md:-translate-y-4' : ''}
                          `}
                        >
                          <img src={stickerImage} loading="lazy" className="w-full h-full object-cover object-top" alt={`${series.title} sticker`} />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none mix-blend-overlay" />
                        </div>
                        <span className="text-[8px] md:text-[12px] font-black uppercase tracking-widest text-zinc-400 text-center w-full truncate leading-tight mt-1 transition-all">
                          {series.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pt-4 md:pt-6 mt-auto">
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Present this digital pass at live events for discounts.<br/>
                  Use code <span className="text-white font-black">AMCLUB26</span> in the Shopify store.
                </p>
              </div>

            </div>
          </div>
        </div>

        <p className="text-zinc-500 text-[10px] md:text-[12px] font-bold uppercase tracking-widest mt-12 animate-pulse flex items-center gap-2 pointer-events-none">
          <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Tap anywhere on card to flip
        </p>
      </div>
    </div>
  );
};

// --- 2. MAIN USER PROFILE COMPONENT ---
export const UserProfile = ({ onBack, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [showFlexCard, setShowFlexCard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  const [vaultAvatars, setVaultAvatars] = useState<any[]>([]);
  const [cardSkins, setCardSkins] = useState<any[]>([]); 
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);   
  const [upsellConfig, setUpsellConfig] = useState<{ title: string, message: string } | null>(null);
  const [userProfile, setUserProfile] = useState({
    username: 'Reader',
    avatarUrl: '', 
    frameId: 'none',
    cardSkin: '', 
    topFive: [null, null, null, null, null] as (string | null)[]
  });

  const [tempProfile, setTempProfile] = useState({...userProfile});

  const [profileStats, setProfileStats] = useState({
    total_hypes: 0,
    super_hypes: 0,
    quick_reacts: 0,
    chapters_read: 0
  });

  const [unlockedHunts, setUnlockedHunts] = useState(0);
  const [totalHunts, setTotalHunts] = useState(11);

  // --- 1. FETCH AVATARS AND SKINS (Standalone Hook) ---
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (typeof supabase !== 'undefined') {
        const { data: avatars } = await supabase.from('avatars').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (avatars) setVaultAvatars(avatars);
        
        const { data: skins } = await supabase.from('card_skins').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (skins) setCardSkins(skins);
      }
    };
    fetchData();
  }, []);

  // --- 2. FETCH USER STATS & BINGO BOOK (Standalone Hook) ---
  useEffect(() => {
    // 1. Grab local Bingo Book progress immediately on load
    const savedHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
    setUnlockedHunts(savedHunts.length);
    
    // Check if the Bingo Book gave us a new total to use!
    const savedTotal = localStorage.getItem('am_bingo_total');
    if (savedTotal) setTotalHunts(parseInt(savedTotal));

    // 2. Fetch the rest of the database stats
    const fetchUserStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        const fallbackName = user.user_metadata?.username || 'Reader';

        // FIXED: REVERTED BACK TO YOUR CORRECT DATABASE COLUMNS!
        const { data, error } = await supabase
          .from('profiles')
          .select('username, is_premium, total_hypes, super_hypes, quick_reacts, chapters_read, top_series, card_skin_url, avatar_url, frame_url')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfileStats({
            total_hypes: data.total_hypes || 0,
            super_hypes: data.super_hypes || 0,
            quick_reacts: data.quick_reacts || 0,
            chapters_read: data.chapters_read || 0
          });

          setIsSubscriber(data.is_premium || false);

          const loadedProfile = {
            ...userProfile,
            username: data.username || fallbackName,
            topFive: data.top_series || [null, null, null, null, null],
            cardSkin: data.card_skin_url || '',
            avatarUrl: data.avatar_url || '',
            frameId: data.frame_url || 'none'
          };

          setUserProfile(loadedProfile);
          setTempProfile(loadedProfile);
        } else {
          // GHOST USER SAFETY NET
          const ghostProfile = { ...userProfile, username: fallbackName };
          setUserProfile(ghostProfile);
          setTempProfile(ghostProfile);
        }
      } else {
        // Reset to default if logged out
        setIsLoggedIn(false);
        setUserProfile({ username: 'Reader', avatarUrl: '', frameId: 'none', cardSkin: '', topFive: [null, null, null, null, null] });
      }
    };

    // Run it once on initial load
    fetchUserStats();

    // 3. THE MAGIC LISTENER: Listen for logins/logouts and re-run the fetch!
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserStats();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const openEditor = (targetTab = 'faves', slotIndex: number | null = null) => {
    // Prevent visitors from opening the editor modal, but let Free Accounts in!
    if (!isLoggedIn) {
      setUpsellConfig({
        title: 'create a free account',
        message: 'Create a Free Account to customize your profile loadout, equip your favorite series, and track your stats!'
      });
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

      // CHANGED: Use .update() instead of .upsert() to prevent constraint errors!
      const { error } = await supabase
        .from('profiles')
        .update({
          username: realName, 
          top_series: tempProfile.topFive,
          card_skin_url: tempProfile.cardSkin,
          avatar_url: tempProfile.avatarUrl,
          frame_url: tempProfile.frameId
        })
        .eq('id', user.id); // Must specify exactly which row to update

      if (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save! Check your Supabase RLS policies.");
        return;
      }
    }

    setUserProfile({...tempProfile});
    setIsEditing(false);
    alert("Profile Loadout Saved Successfully!"); 
  };

  const fallbackSeriesList = [
    { slug: 'apple-black', title: 'Apple Black', creator_name: 'Whyt Manga', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/apple-black-cover.jpg' },
    { slug: 'clock-striker', title: 'Clock Striker', creator_name: 'Frederick Ward', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/clock-striker-cover.jpg' },
    { slug: 'titan-king', title: 'Titan King', creator_name: 'Tony Gold', cover_url: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/titan-king-cover.jpg' },
  ];
  const displaySeriesList = seriesList && seriesList.length > 0 ? seriesList : fallbackSeriesList;

  const BASIC_FRAMES = [
    { id: 'none', name: 'Original', style: 'border-2 border-zinc-800' },
    { id: 'red', name: 'Solid Red', style: 'border-2 border-red-600' },
    { id: 'yellow', name: 'Solid Yellow', style: 'border-2 border-yellow-500' },
    { id: 'cyan', name: 'Solid Cyan', style: 'border-2 border-cyan-500' },
  ];

  const PREMIUM_FRAMES = [
    { id: 'gold', name: 'Ultra Gold', style: 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]', orbit: 'border-t-yellow-400 border-r-yellow-400 animate-[spin_3s_linear_infinite]' },
    { id: 'appleblack', name: 'Apple Black', style: 'border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]', orbit: 'border-t-red-500 border-l-red-500 animate-[spin_2.5s_linear_infinite]' },
    { id: 'clockstriker', name: 'Clock Striker', style: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]', orbit: 'border-b-cyan-400 border-r-cyan-400 animate-[spin_3s_linear_infinite_reverse]' },
  ];

  const getFrameStyle = (id: string) => [...BASIC_FRAMES, ...PREMIUM_FRAMES].find(f => f.id === id)?.style || 'border-2 border-zinc-800';
  const getOrbitStyle = (id: string) => PREMIUM_FRAMES.find(f => f.id === id)?.orbit || '';

  const renderMiniCard = (seriesSlug: string, isEditingMode: boolean, onClick: () => void) => {
    const series = displaySeriesList.find((s: any) => s.slug === seriesSlug);
    if (!series) return null;

    const prefetchSeriesPage = () => {
      import('../MainViews/SeriesDetailPage'); 
    };

    return (
      <div 
        key={seriesSlug} 
        onClick={onClick} 
        onMouseEnter={prefetchSeriesPage}
        onTouchStart={prefetchSeriesPage}
        className={`w-24 sm:w-28 flex-shrink-0 aspect-[2/3] relative rounded-lg overflow-hidden cursor-pointer group/card transition-all ${
          isEditingMode ? 'border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)]' : 'border border-zinc-800 shadow-lg hover:border-[#fe9a00]/50'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
        <img 
          src={series.character_url || series.cover_url} 
          loading="lazy"
          alt={`${series.title} Character`} 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4"
        />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-30 px-2 h-8 sm:h-10">
          {series.logo_url ? (
            <img src={series.logo_url} loading="lazy" alt={series.title} className="w-full max-h-full object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" />
          ) : (
            <span className="text-[7px] sm:text-[8px] font-black uppercase text-white text-center drop-shadow-md leading-tight line-clamp-2">
              {series.title}
            </span>
          )}
        </div>
        {isEditingMode && (
          <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity backdrop-blur-[2px]">
            <span className="text-[#fe9a00] font-black text-[8px] uppercase tracking-widest shadow-xl">Change</span>
          </div>
        )}
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
    <div className="min-h-screen bg-black text-white relative pb-20">
      <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-zinc-900/90 rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors z-20 transform -skew-x-12">
        <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
      </button>

      {/* --- UPSELL MODAL OVERLAY --- */}
      {upsellConfig && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setUpsellConfig(null)}>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Lock className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              {upsellConfig.title}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
              {upsellConfig.message}
            </p>
            <button 
              onClick={() => {
                setUpsellConfig(null);
                onNavigate({ action: 'settings' }); 
              }} 
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]"
            >
              sign up for free
            </button>
          </div>
        </div>
      )}

      <div className="w-full h-48 sm:h-64 bg-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      <div className="max-w-4xl mx-auto relative -mt-16 sm:-mt-24">
        
        {/* --- USER HEADER --- */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-12 px-6">
          <div className="relative group cursor-pointer" onClick={() => openEditor('art')}>
            <div className={`relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center`}>
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden relative z-10 bg-zinc-900 flex items-center justify-center ${getFrameStyle(userProfile.frameId)}`}>
                {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : <User className="w-12 h-12 text-zinc-500" />}
              </div>
              {PREMIUM_FRAMES.some(p => p.id === userProfile.frameId) && ( <div className={`absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[3px] border-transparent pointer-events-none ${getOrbitStyle(userProfile.frameId)}`} /> )}
            </div>
          </div>

          <div className="text-center sm:text-left pb-2">
            <button 
              onClick={() => openEditor('faves')} 
              className="flex items-center gap-2 bg-[#fe9a00] text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all mb-3 shadow-[0_0_15px_rgba(254,154,0,0.3)]"
            >
              <Settings className="w-3 h-3" /> Edit Profile
            </button>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter">{userProfile.username}</h1>
            <p className={`text-xs font-black uppercase tracking-widest mt-1 italic ${isSubscriber ? 'text-purple-400' : 'text-zinc-500'}`}>
               {isSubscriber ? 'Premium Saturday AM+ Member' : 'Standard Member'}
            </p>
          </div>
          
          <div className="sm:ml-auto flex items-center gap-3 mt-4 sm:mt-0">
            <button onClick={() => onNavigate({ action: 'settings' })} className="bg-zinc-900 border border-zinc-700 p-3 rounded-full hover:border-white transition-colors group"><Settings className="w-5 h-5 text-zinc-400 group-hover:text-white" /></button>
          </div>
        </div>

        {/* --- STATS & LOADOUT --- */}
        <div className="mb-12 border-t border-zinc-800 pt-8 px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <Flame className="w-6 h-6 text-[#fe9a00] mb-2" />
              <span className="text-3xl font-black">{profileStats.total_hypes.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Hypes</span>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <Star className="w-6 h-6 text-purple-500 mb-2" />
              <span className="text-3xl font-black">{profileStats.super_hypes?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Super Hypes</span>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              {/* --- CUSTOM QUICK REACT ICON --- */}
              <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Quick%20React%20icon.png" alt="Reacts" className="w-6 h-6 object-contain mb-2 drop-shadow-md" />
              <span className="text-3xl font-black">{profileStats.quick_reacts.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Quick Reacts</span>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
              <BookOpen className="w-6 h-6 text-zinc-400 mb-2" />
              <span className="text-3xl font-black">{profileStats.chapters_read.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Chapters Read</span>
            </div>
            <div className={`flex flex-col gap-1 p-5 bg-zinc-900 rounded-xl border relative overflow-hidden ${isSubscriber ? 'border-[#fe9a00]/30' : 'border-zinc-800 opacity-50'}`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${isSubscriber ? 'bg-[#fe9a00]/10' : 'bg-zinc-800'}`}></div>
              <Award className={`w-6 h-6 mb-2 relative z-10 ${isSubscriber ? 'text-[#fe9a00]' : 'text-zinc-500'}`} />
              <span className="text-2xl font-black mt-1 text-white relative z-10">{isSubscriber ? 'Active' : 'N/A'}</span>
              <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold relative z-10">Premium Status</span>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 mb-2 mt-8 flex flex-col sm:flex-row items-center gap-6 shadow-lg">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#fe9a00]" /> Bingo Book Hunts
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                  <span className="text-[#fe9a00]">{unlockedHunts}</span> / {totalHunts} Completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-black border border-zinc-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-[#fe9a00] to-yellow-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (unlockedHunts / Math.max(1, totalHunts)) * 100)}%` }} 
                />
              </div>
            </div>
            <button 
              onClick={() => onNavigate({ action: 'bingobook' })} 
              className="w-full sm:w-auto bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-white border border-zinc-700 hover:border-[#fe9a00] px-6 py-3 sm:py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(254,154,0,0.4)]"
            >
              Open Bingo Book
            </button>
          </div>
          
          <div className="flex justify-between items-end mb-4 mt-12">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Star className="w-4 h-4 text-[#fe9a00]" /> Top 5 Fave Series</h3>
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
            <div 
              className="relative w-full max-w-sm aspect-[1.58] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl mb-6 group cursor-pointer" 
              onClick={() => setUpsellConfig({ title: 'Premium Feature', message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.' })}
            >
              <img src="https://zcadkovymrnjpjaxvnao.supabase.co/storage/v1/object/public/card-skins/skins/1781908112888_8ozh4h.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:scale-105 transition-transform duration-700" alt="Card Preview" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-center p-6 text-center">
                 <div className="w-14 h-14 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                   <Lock className="w-6 h-6 text-zinc-400"/>
                 </div>
                 <h3 className="text-white font-black italic text-xl uppercase tracking-widest mb-1 drop-shadow-md">AM Crew Card</h3>
                 <p className="text-[10px] text-[#fe9a00] font-bold uppercase tracking-widest leading-relaxed drop-shadow-md">
                   Customize and get exclusive perks!
                 </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setUpsellConfig({ 
                  title: 'Premium Feature', 
                  message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.' 
                });
              }}
              className="flex items-center gap-3 bg-zinc-800 text-white border border-zinc-700 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] hover:scale-105 transition-all shadow-lg w-full sm:w-auto justify-center"
            >
              <CreditCard className="w-5 h-5"/> Subscribe to Unlock
            </button>
          </div>
        ) : (
          <div className="flex justify-center w-full mt-12 mb-8">
            <button 
              onClick={() => setShowFlexCard(true)}
              className="flex items-center gap-4 bg-[#fe9a00] text-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
            >
              <CreditCard className="w-6 h-6"/> Flex AM Crew Card
            </button>
          </div>
        )}

        <GlobalFlexCard 
          isOpen={showFlexCard} 
          onClose={() => setShowFlexCard(false)} 
        />
      </div>

      {/* --- PROFILE EDITOR MODAL --- */}
      {isEditing && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-black">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Customize Loadout</h2>
              <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0 bg-black">
              <button onClick={() => { setActiveTab('faves'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'faves' ? 'bg-zinc-800 text-[#fe9a00]' : 'text-zinc-500 hover:text-white'}`}>Top 5 Loadout</button>
              <button onClick={() => { setActiveTab('art'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'art' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Character Art</button>
              <button onClick={() => { setActiveTab('frames'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'frames' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Basic Frames</button>
              <button onClick={() => { setActiveTab('premium'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'premium' ? 'bg-purple-900/20 text-purple-400' : 'text-zinc-500 hover:text-white'}`}>Premium Frames ★</button>
              <button onClick={() => { setActiveTab('card'); setSelectingSlot(null); }} className={`flex-1 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === 'card' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Club Card</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-black/40 no-scrollbar">
              
              {/* LOADOUT SELECTOR TAB */}
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

              {/* CARD SKIN SELECTOR TAB */}
              {activeTab === 'card' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-4">Select an artwork skin for your digital club card</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div onClick={() => setTempProfile({...tempProfile, cardSkin: ''})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${!tempProfile.cardSkin ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-zinc-500'}`}>
                      <div className="absolute inset-0 bg-zinc-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80 mix-blend-overlay" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carbon Black</span></div>
                    </div>

                    {displaySeriesList.map((s: any) => (
                      <div key={s.slug} onClick={() => setTempProfile({...tempProfile, cardSkin: s.cover_url})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${tempProfile.cardSkin === s.cover_url ? 'border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.5)] scale-105' : 'border-zinc-800 hover:border-zinc-500'}`}>
                        <img src={s.cover_url} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" alt={s.title} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest text-white">{s.title}</span></div>
                      </div>
                    ))}

                    {cardSkins.map((skin: any) => (
                      <div key={skin.id} onClick={() => setTempProfile({...tempProfile, cardSkin: skin.image_url})} className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[1.58] border-2 transition-all ${tempProfile.cardSkin === skin.image_url ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105' : 'border-zinc-800 hover:border-purple-500/50'}`}>
                        <img src={skin.image_url} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" alt={skin.name} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest text-white text-center px-2">{skin.name}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AVATAR & FRAMES TABS */}
              {(activeTab === 'art' || activeTab === 'frames' || activeTab === 'premium') && (
                <>
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className={`w-16 h-16 rounded-full overflow-hidden bg-zinc-900 z-10 flex items-center justify-center ${getFrameStyle(tempProfile.frameId)}`}>
                        {tempProfile.avatarUrl ? (
                          <img src={tempProfile.avatarUrl} className="w-full h-full object-cover rounded-full" alt="preview" />
                        ) : (
                          <User className="w-8 h-8 text-zinc-500" />
                        )}
                      </div>
                      {PREMIUM_FRAMES.some(p => p.id === tempProfile.frameId) && <div className={`absolute w-20 h-20 rounded-full border-2 border-transparent pointer-events-none ${getOrbitStyle(tempProfile.frameId)}`} />}
                    </div>
                  </div>

                  {activeTab === 'art' && (
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
                  )}

                  {activeTab === 'frames' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {BASIC_FRAMES.map(frame => (
                        <div key={frame.id} onClick={() => setTempProfile({...tempProfile, frameId: frame.id})} className={`relative flex flex-col items-center bg-zinc-900/50 p-4 rounded-xl border transition-all ${tempProfile.frameId === frame.id ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-800 hover:border-zinc-600 cursor-pointer'}`}>
                            <div className={`w-12 h-12 rounded-full z-10 flex items-center justify-center mb-3 bg-zinc-900 ${frame.style}`}><User className="w-5 h-5 text-zinc-600" /></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-center text-zinc-400">{frame.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'premium' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {PREMIUM_FRAMES.map(frame => (
                        <div key={frame.id} onClick={() => setTempProfile({...tempProfile, frameId: frame.id})} className={`relative flex flex-col items-center bg-zinc-900/50 p-4 rounded-xl border transition-all ${tempProfile.frameId === frame.id ? 'border-purple-500 bg-purple-900/10' : 'border-zinc-800 hover:border-purple-900/50 cursor-pointer'}`}>
                            <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                              <div className={`w-10 h-10 rounded-full bg-zinc-900 z-10 flex items-center justify-center ${frame.style}`}><User className="w-5 h-5 text-zinc-600" /></div>
                              <div className={`absolute w-14 h-14 rounded-full border-2 border-transparent ${frame.orbit}`} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-center text-purple-400">{frame.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
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