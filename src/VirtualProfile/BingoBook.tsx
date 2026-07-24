import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Target, Lock, Unlock, Eraser, CheckCircle, X } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';

const BingoBook = ({ onBack, userTier, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();

  // Dynamically generate ALL creators/writers from your series data
  const CREATOR_TARGETS = useMemo(() => {
    const uniqueCreatorsMap = new Map();

    const processName = (nameInput: any, defaultAvatar: any, sTitle: string) => {
      if (!nameInput) return;

      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];

      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        let avatarToUse = defaultAvatar;

        if (typeof nameObj === 'object' && nameObj !== null) {
          if (nameObj.is_visible === false) return; 
          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
          avatarToUse = nameObj.avatar_url || nameObj.avatar || defaultAvatar; 
        }

        if (typeof nameStr !== 'string') return;

        nameStr = nameStr.replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '');
        const splitNames = nameStr.split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);

        splitNames.forEach(rawName => {
          const cName = rawName.trim();
          if (cName.length < 2) return; 

          const mapKey = cName.toLowerCase();

          if (!uniqueCreatorsMap.has(mapKey)) {
            uniqueCreatorsMap.set(mapKey, {
              name: cName, 
              avatar: avatarToUse || `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=18181b&color=fe9a00&bold=true`,
              series: sTitle ? [sTitle] : []
            });
          } else if (sTitle) {
            const existingProfile = uniqueCreatorsMap.get(mapKey);
            if (!existingProfile.series.includes(sTitle)) {
              existingProfile.series.push(sTitle);
            }
            if (avatarToUse && existingProfile.avatar.includes('ui-avatars')) {
              existingProfile.avatar = avatarToUse;
            }
          }
        });
      });
    };

    seriesList.forEach((series: any) => {
      const sTitle = series.title || series.name;

      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) {
        processName(series.creators, null, sTitle);
      } else {
        processName(series.creator_name || series.creator, series.creator_avatar || series.creator_image, sTitle);
        processName(series.writer_name || series.writer || series.author_name, series.writer_avatar || series.writer_image, sTitle);
        processName(series.artist_name || series.artist || series.illustrator, series.artist_avatar || series.artist_image, sTitle);
        processName(series.co_creator_name || series.co_creator, series.co_creator_avatar || series.co_creator_image, sTitle);
      }
    });

    return Array.from(uniqueCreatorsMap.values())
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((creator: any, index) => ({ id: index + 1, ...creator }));
  }, [seriesList]);

  const [unlockedCreators, setUnlockedCreators] = useState<number[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [signatures, setSignatures] = useState<Record<number, string>>({});
  const [hasDrawn, setHasDrawn] = useState(false);
  const [viewingAutograph, setViewingAutograph] = useState<string | null>(null);
  
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#fe9a00');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- NEW: Custom Alert State ---
  const [alertConfig, setAlertConfig] = useState<{ title: string, message: string } | null>(null);

  const progressPercentage = CREATOR_TARGETS.length > 0 ? (unlockedCreators.length / CREATOR_TARGETS.length) * 100 : 0;
  
  const [isSubscriber, setIsSubscriber] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
        setIsSubscriber(data?.is_premium || false);
      } else {
        setIsSubscriber(false);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (CREATOR_TARGETS.length > 0) {
      localStorage.setItem('am_bingo_total', CREATOR_TARGETS.length.toString());
    }
  }, [CREATOR_TARGETS.length]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
  };

  useEffect(() => {
    const savedHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
    const savedSigs = JSON.parse(localStorage.getItem('am_bingo_sigs') || '{}');
    setUnlockedCreators(savedHunts);
    setSignatures(savedSigs);
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      initCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx && selectedTarget && signatures[selectedTarget.id]) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = signatures[selectedTarget.id];
        setHasDrawn(true); 
      }

      window.addEventListener('resize', initCanvas);
      return () => window.removeEventListener('resize', initCanvas);
    }
  }, [isUnlocked, selectedTarget, signatures]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = penColor;
      setIsDrawing(true);
      setHasDrawn(true); 
    }
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false); 
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('bingo_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) {
        const now = new Date();
        const expiresAt = new Date(data.expires_at);

        if (pinInput === data.current_pin) {
          if (now < expiresAt) {
            setIsUnlocked(true);
          } else {
            setAlertConfig({ title: "PIN Expired", message: "This convention PIN has expired! Ask the AM team for the new one." });
          }
        } else {
          setAlertConfig({ title: "Access Denied", message: "Incorrect Creator PIN. Please try again." });
        }
      }
    } catch (err: any) {
      console.error("Error verifying PIN:", err);
      setAlertConfig({ title: "Connection Error", message: "Error connecting to database. Please check your connection." });
    }
    setPinInput('');
  };

  const handleSave = () => {
    if (!hasDrawn || !selectedTarget) return; 

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      const newSigs = { ...signatures, [selectedTarget.id]: dataUrl };
      setSignatures(newSigs);
      localStorage.setItem('am_bingo_sigs', JSON.stringify(newSigs));
    }

    if (!unlockedCreators.includes(selectedTarget.id)) {
      const newHunts = [...unlockedCreators, selectedTarget.id];
      setUnlockedCreators(newHunts);
      localStorage.setItem('am_bingo_hunts', JSON.stringify(newHunts));
    }
    closeTargetModal();
  };

  const closeTargetModal = () => {
    setSelectedTarget(null);
    setIsUnlocked(false);
    setPinInput('');
    setHasDrawn(false);
  };

  if (isSubscriber === null) return <div className="min-h-screen bg-black" />;

  // --- FULL PAGE LOCK SCREEN FOR FREE USERS ---
  if (isSubscriber === false) {
    return (
      <div className="min-h-screen bg-black text-white relative z-[200] flex flex-col">
        <div className="absolute top-6 left-6 z-50">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-[0_0_30px_rgba(254,154,0,0.2)]">
            <Lock className="w-10 h-10 text-[#fe9a00]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-widest text-white mb-4">Bingo <span className="text-red-600">Book</span></h1>
          <p className="text-zinc-400 font-bold max-w-md mb-8 leading-relaxed">
            The Bingo Book hunt is exclusively for Saturday AM Pro Members. Upgrade your account to collect digital autographs from your favorite creators at live events!
          </p>
          <button 
            onClick={() => onNavigate({ action: 'sub' })} 
            className="bg-[#fe9a00] text-black px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)]"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-fade-in relative z-[200]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" alt="Saturday AM" className="h-8 md:h-10 object-contain drop-shadow-md" />
            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-widest text-white">Bingo <span className="text-red-600">Book</span></h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Mission Briefing */}
        <div className="mb-8 bg-gradient-to-r from-zinc-900 to-black border-2 border-[#fe9a00]/60 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(254,154,0,0.35)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.8)]"></div>
          <h2 className="text-[#fe9a00] text-lg md:text-xl font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-3 drop-shadow-[0_2px_10px_rgba(254,154,0,0.5)]">
            <Target className="w-6 h-6 md:w-7 md:h-7" /> The Mission
          </h2>
          <p className="text-white text-base md:text-lg font-bold leading-relaxed tracking-wide">
            Find these creators at live shows and conventions and get their autograph! Stay tuned to social media to find events and creators near you.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Hunt Progress</h2>
            <span className="text-xl font-black italic text-[#fe9a00]">{unlockedCreators.length} / {CREATOR_TARGETS.length}</span>
          </div>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-gradient-to-r from-[#fe9a00] to-red-600 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Target Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CREATOR_TARGETS.map((target) => {
            const isCaught = unlockedCreators.includes(target.id);
            return (
              <button 
                key={target.id}
                onClick={() => { 
                  setSelectedTarget(target); 
                  setIsUnlocked(isCaught); 
                }}
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  isCaught 
                    ? 'border-zinc-700 grayscale opacity-90' 
                    : 'border-zinc-800 hover:border-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                }`}
              >
                <img 
                  src={target.avatar} 
                  alt={target.name} 
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    isCaught ? 'opacity-30' : 'opacity-100 group-hover:scale-105'
                  }`} 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 text-left">
                  {!isCaught && (
                    <p className="text-xs sm:text-sm text-red-500 font-black uppercase tracking-[0.3em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Wanted
                    </p>
                  )}
                  <h3 className={`font-black uppercase italic tracking-wider leading-tight ${isCaught ? 'text-zinc-500 text-xs' : 'text-white text-sm'}`}>
                    {target.name}
                  </h3>
                  {target.series?.length > 0 && (
                    <p className={`text-[9px] font-bold uppercase mt-1 line-clamp-2 leading-tight ${isCaught ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {target.series.join(' • ')}
                    </p>
                  )}
                </div>

                {isCaught && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                    <span className="text-2xl sm:text-3xl font-black italic uppercase text-[#fe9a00] drop-shadow-[0_0_15px_rgba(254,154,0,0.6)] transform -rotate-12 mb-6 border-y-4 border-[#fe9a00] py-2 px-4 bg-black/50">
                      Collected
                    </span>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setViewingAutograph(signatures[target.id]); }}
                      className="bg-zinc-900 border border-zinc-700 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-colors shadow-2xl"
                    >
                      View Autograph
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TARGET MODAL (Auth & Canvas) */}
      {selectedTarget && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl relative">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${isUnlocked ? 'text-[#fe9a00]' : 'text-red-500'}`} />
                <span className="font-black uppercase tracking-widest text-sm">{selectedTarget.name}</span>
              </div>
              <button onClick={closeTargetModal} className="text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px]">Close</button>
            </div>

            <div className="p-6 flex-1 flex flex-col min-h-[400px]">
              {!isUnlocked ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                    <Lock className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Target Locked</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Hand your device to the creator to unlock</p>
                  </div>
                  
                  <form onSubmit={handlePinSubmit} className="flex gap-2 w-full max-w-xs mt-4">
                    <input 
                      type="password" 
                      maxLength={4}
                      placeholder="CREATOR PIN"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="flex-1 bg-black border border-zinc-700 rounded-lg text-center font-black tracking-[0.5em] text-white focus:outline-none focus:border-red-500"
                    />
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-colors">
                      Unlock
                    </button>
                  </form>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">(Check workplace for PIN)</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-xs text-[#fe9a00] font-black uppercase tracking-widest flex items-center gap-2">
                       <Unlock className="w-4 h-4" /> Canvas Unlocked
                     </span>
                     <div className="flex gap-2">
                        <button onClick={() => setPenColor('#fe9a00')} className={`w-6 h-6 rounded-full bg-[#fe9a00] ${penColor === '#fe9a00' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} />
                        <button onClick={() => setPenColor('#ffffff')} className={`w-6 h-6 rounded-full bg-white ${penColor === '#ffffff' ? 'ring-2 ring-[#fe9a00] ring-offset-2 ring-offset-black' : ''}`} />
                        <button onClick={clearCanvas} className="p-1 text-zinc-500 hover:text-red-500"><Eraser className="w-5 h-5" /></button>
                     </div>
                  </div>

                  <div className="flex-1 border border-dashed border-zinc-700 rounded-xl relative overflow-hidden bg-black touch-none">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full absolute inset-0 z-10 cursor-crosshair"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                  </div>
                  
                  <button onClick={handleSave} className="mt-4 w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">
                    Save Signature & Return to Grid
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN AUTOGRAPH VIEWER */}
      {viewingAutograph && (
        <div 
          className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-fade-in" 
          onClick={() => setViewingAutograph(null)}
        >
          <button 
            onClick={() => setViewingAutograph(null)} 
            className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-full max-h-full w-full h-full flex flex-col items-center justify-center pointer-events-none">
            <img 
              src={viewingAutograph} 
              className="max-w-full max-h-full object-contain drop-shadow-[0_0_30px_rgba(254,154,0,0.5)] pointer-events-auto bg-black border border-zinc-800 rounded-2xl" 
              alt="Creator Autograph" 
              onClick={(e) => e.stopPropagation()} 
            />
            <p className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              Official Saturday AM Autograph
            </p>
          </div>
        </div>
      )}

      {/* IN-APP ALERT MODAL */}
      {alertConfig && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setAlertConfig(null)}>
          <div className="bg-zinc-950 border border-red-900/50 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-[0_0_40px_rgba(239,68,68,0.2)] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setAlertConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-900/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">
              {alertConfig.title}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
              {alertConfig.message}
            </p>
            <button 
              onClick={() => setAlertConfig(null)} 
              className="w-full font-black uppercase tracking-widest py-3 rounded transition-colors bg-red-600 text-white hover:bg-red-500"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoBook;