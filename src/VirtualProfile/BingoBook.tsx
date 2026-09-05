import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Target, Lock, X, Sparkles, KeyRound } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';

const BingoBook = ({ onBack, userTier, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();

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
            if (!existingProfile.series.includes(sTitle)) existingProfile.series.push(sTitle);
            if (avatarToUse && existingProfile.avatar.includes('ui-avatars')) existingProfile.avatar = avatarToUse;
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
      .map((creator: any) => ({ id: creator.name, ...creator })); 
  }, [seriesList]);

  const [unlockedCreators, setUnlockedCreators] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [viewingAutograph, setViewingAutograph] = useState<string | null>(null);
  
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string, message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const progressPercentage = CREATOR_TARGETS.length > 0 ? (unlockedCreators.length / CREATOR_TARGETS.length) * 100 : 0;
  
  useEffect(() => {
    if (CREATOR_TARGETS.length > 0) {
      localStorage.setItem('am_bingo_total', CREATOR_TARGETS.length.toString());
      setUnlockedCreators(prev => {
        const validHunts = prev.filter(id => CREATOR_TARGETS.some(t => t.id === id));
        if (validHunts.length !== prev.length) {
          localStorage.setItem('am_bingo_hunts', JSON.stringify(validHunts));
          setSignatures(prevSigs => {
            const validSigs: Record<string, string> = {};
            validHunts.forEach(id => { if (prevSigs[id]) validSigs[id] = prevSigs[id]; });
            localStorage.setItem('am_bingo_sigs', JSON.stringify(validSigs));
            return validSigs;
          });
          return validHunts;
        }
        return prev;
      });
    }
  }, [CREATOR_TARGETS]);

  // --- LIVE SYNC SIGNATURES ON LOAD ---
  useEffect(() => {
    const syncSignatures = async () => {
      const savedHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
      const savedSigs = JSON.parse(localStorage.getItem('am_bingo_sigs') || '{}');
      
      setUnlockedCreators(savedHunts);
      
      if (savedHunts.length > 0) {
        const { data } = await supabase
          .from('creator_signatures')
          .select('creator_name, signature_url')
          .in('creator_name', savedHunts);
          
        if (data && data.length > 0) {
          const freshSigs: Record<string, string> = {};
          data.forEach((row: any) => { freshSigs[row.creator_name] = row.signature_url; });
          setSignatures(freshSigs);
          localStorage.setItem('am_bingo_sigs', JSON.stringify(freshSigs));
        } else {
          setSignatures(savedSigs);
        }
      } else {
        setSignatures(savedSigs);
      }
    };
    syncSignatures();
  }, []);

  const claimSignature = async (creatorName: string, creatorId: string) => {
    const { data: sigData } = await supabase.from('creator_signatures').select('signature_url').eq('creator_name', creatorName).maybeSingle();
    
    if (!sigData || !sigData.signature_url) {
      setAlertConfig({ title: "No Signature Found", message: `${creatorName} hasn't uploaded their master signature/sketch to the vault yet!` });
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('bingo_signatures_log').insert([{
        user_id: user.id,
        creator_name: creatorName,
        event_name: 'Bingo Code Redemption',
        signature_type: 'Standard'
      }]);
    }

    const newSigs = { ...signatures, [creatorId]: sigData.signature_url };
    setSignatures(newSigs);
    localStorage.setItem('am_bingo_sigs', JSON.stringify(newSigs));

    if (!unlockedCreators.includes(creatorId)) {
      const newHunts = [...unlockedCreators, creatorId];
      setUnlockedCreators(newHunts);
      localStorage.setItem('am_bingo_hunts', JSON.stringify(newHunts));
    }
    
    return true;
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pinInput.trim();
    if (!code) return;
    setIsProcessing(true);

    try {
      const { data: codesData, error } = await supabase.from('bingo_codes').select('*').eq('code', code).maybeSingle();
      
      if (error || !codesData) {
        setAlertConfig({ title: "Invalid PIN", message: "This 5-digit PIN does not exist or was entered incorrectly." });
        setIsProcessing(false);
        return;
      }

      if (codesData.creator_name !== selectedTarget.name) {
        setAlertConfig({ title: "Creator Mismatch", message: `This PIN belongs to ${codesData.creator_name}, not ${selectedTarget.name}.` });
        setIsProcessing(false);
        return;
      }

      if (new Date() > new Date(codesData.expires_at)) {
        setAlertConfig({ title: "PIN Expired", message: "This PIN has expired." });
        setIsProcessing(false);
        return;
      }

      const success = await claimSignature(selectedTarget.name, selectedTarget.id);
      if (success) {
        await supabase.from('bingo_codes').update({ times_used: codesData.times_used + 1 }).eq('id', codesData.id);
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error(err);
      setAlertConfig({ title: "Error", message: "A network error occurred. Try again." });
    }
    setPinInput('');
    setIsProcessing(false);
  };

  const closeTargetModal = () => {
    setSelectedTarget(null);
    setIsUnlocked(false);
    setPinInput('');
  };

  if (userTier !== 'premium') {
    return (
      <div className="min-h-screen bg-transparent text-white relative flex flex-col">
        <div className="fixed inset-0 z-[-1] bg-black">
          <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden" />
          <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
        <div className="absolute top-6 left-6 z-40"><button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg"><ArrowLeft className="w-5 h-5 text-white" /></button></div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-[0_0_30px_rgba(254,154,0,0.2)]"><Lock className="w-10 h-10 text-[#fe9a00]" /></div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-widest text-white mb-4">Bingo <span className="text-red-600">Book</span></h1>
          <p className="text-zinc-400 font-bold max-w-md mb-8 leading-relaxed bg-black/40 p-4 rounded-xl backdrop-blur-sm border border-zinc-800">
            The Bingo Book hunt is exclusively for Saturday AM Pro Members. Upgrade your account to collect digital autographs from your favorite creators!
          </p>
          <button onClick={() => onNavigate({ action: 'sub' })} className="bg-[#fe9a00] text-black px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)]">Upgrade to Pro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-24 animate-fade-in relative">
      <div className="fixed inset-0 z-[-1] bg-black">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden" />
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center justify-between pr-16 sm:pr-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3">
            <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" alt="Saturday AM" className="h-8 md:h-10 object-contain drop-shadow-md" />
            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-widest text-white">Bingo <span className="text-red-600">Book</span></h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 bg-gradient-to-r from-zinc-900/90 to-black/90 backdrop-blur-sm border-2 border-[#fe9a00]/60 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(254,154,0,0.35)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.8)]"></div>
          <h2 className="text-[#fe9a00] text-lg md:text-xl font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-3 drop-shadow-[0_2px_10px_rgba(254,154,0,0.5)]"><Target className="w-6 h-6 md:w-7 md:h-7" /> The Mission</h2>
          <p className="text-white text-base md:text-lg font-bold leading-relaxed tracking-wide">Find these creators at live shows or collect their digital signatures online!</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Hunt Progress</h2>
            <span className="text-xl font-black italic text-[#fe9a00]">{unlockedCreators.length} / {CREATOR_TARGETS.length}</span>
          </div>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full bg-gradient-to-r from-[#fe9a00] to-red-600 transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CREATOR_TARGETS.map((target) => {
            const isCaught = unlockedCreators.includes(target.id);
            return (
              <button 
                key={target.id}
                onClick={() => { setSelectedTarget(target); setIsUnlocked(isCaught); }}
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 ${isCaught ? 'border-zinc-700 grayscale opacity-90' : 'border-zinc-800 hover:border-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}
              >
                <img src={target.avatar} alt={target.name} className={`w-full h-full object-cover transition-all duration-500 ${isCaught ? 'opacity-30' : 'opacity-100 group-hover:scale-105'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 text-left">
                  {!isCaught && <p className="text-xs sm:text-sm text-red-500 font-black uppercase tracking-[0.3em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Wanted</p>}
                  <h3 className={`font-black uppercase italic tracking-wider leading-tight ${isCaught ? 'text-zinc-500 text-xs' : 'text-white text-sm'}`}>{target.name}</h3>
                  {target.series?.length > 0 && <p className={`text-[9px] font-bold uppercase mt-1 line-clamp-2 leading-tight ${isCaught ? 'text-zinc-600' : 'text-zinc-400'}`}>{target.series.join(' • ')}</p>}
                </div>
                {isCaught && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                    <span className="text-2xl sm:text-3xl font-black italic uppercase text-[#fe9a00] drop-shadow-[0_0_15px_rgba(254,154,0,0.6)] transform -rotate-12 mb-6 border-y-4 border-[#fe9a00] py-2 px-4 bg-black/50">Collected</span>
                    <div onClick={(e) => { e.stopPropagation(); setViewingAutograph(signatures[target.id]); }} className="bg-zinc-900 border border-zinc-700 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-colors shadow-2xl">View Autograph</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTarget && (
        <div className={`fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in p-4 pb-28`}>
          <div className={`bg-zinc-950 border-zinc-800 flex flex-col shadow-2xl relative transition-all overflow-y-auto max-h-[85vh] w-full max-w-md min-h-[400px] rounded-2xl border`}>
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800 bg-zinc-900 z-50 shrink-0">
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${isUnlocked ? 'text-[#fe9a00]' : 'text-red-500'}`} />
                <span className="font-black uppercase tracking-widest text-sm">{selectedTarget.name}</span>
              </div>
              <button onClick={closeTargetModal} className="text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px]">Close</button>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col w-full">
              {!isUnlocked ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-[#fe9a00] shadow-[0_0_30px_rgba(254,154,0,0.2)]">
                    <KeyRound className="w-8 h-8 text-[#fe9a00]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Unlock Signature</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest px-4">
                      Enter the 5-Digit PIN provided by the creator.
                    </p>
                  </div>
                  <form onSubmit={handlePinSubmit} className="flex flex-col gap-3 w-full max-w-xs mt-4">
                    <input 
                      type="text" 
                      maxLength={5} 
                      placeholder="ENTER PIN" 
                      value={pinInput} 
                      onChange={(e) => setPinInput(e.target.value)} 
                      disabled={isProcessing} 
                      className="w-full bg-black border border-zinc-700 rounded-lg text-center font-black tracking-[0.5em] text-[#fe9a00] text-lg px-4 py-3 focus:outline-none focus:border-[#fe9a00]" 
                    />
                    <button type="submit" disabled={isProcessing} className="w-full bg-[#fe9a00] hover:bg-white text-black px-4 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]">
                      {isProcessing ? 'Verifying...' : 'Unlock'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="text-[#fe9a00] mb-4 animate-bounce"><Sparkles className="w-12 h-12" /></div>
                  <h3 className="text-2xl font-black italic uppercase text-white mb-2">Autograph Collected!</h3>
                  <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-6 px-4">
                    Head over to {selectedTarget.name}'s series pages to view your premium signature on display!
                  </p>
                  <div className="relative w-full aspect-[2/1] bg-black border border-zinc-800 rounded-2xl p-4 flex items-center justify-center shadow-[0_0_40px_rgba(254,154,0,0.3)]">
                    <style>{`
                      @keyframes gold-pulse-glow {
                        0%, 100% { filter: drop-shadow(0 0 10px rgba(254,154,0,0.8)) drop-shadow(0 0 20px rgba(254,154,0,0.4)); transform: scale(1); }
                        50% { filter: drop-shadow(0 0 15px rgba(254,154,0,1)) drop-shadow(0 0 35px rgba(254,154,0,0.8)) drop-shadow(0 0 50px rgba(254,154,0,0.5)); transform: scale(1.03); }
                      }
                      .animate-gold-pulse { animation: gold-pulse-glow 2.5s ease-in-out infinite; }
                    `}</style>
                    <div 
                      className="w-full h-full bg-[#fe9a00] animate-gold-pulse"
                      style={{
                        WebkitMaskImage: `url(${signatures[selectedTarget.id]})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskImage: `url(${signatures[selectedTarget.id]})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center'
                      }}
                    />
                  </div>
                  <button onClick={closeTargetModal} className="mt-8 w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-700 transition-colors">Return to Roster</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN AUTOGRAPH VIEWER */}
      {viewingAutograph && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-fade-in" onClick={() => setViewingAutograph(null)}>
          <button onClick={() => setViewingAutograph(null)} className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl"><X className="w-6 h-6" /></button>
          <div className="relative max-w-full max-h-full w-full h-full flex flex-col items-center justify-center pointer-events-none p-8">
            <style>{`
              @keyframes gold-pulse-glow {
                0%, 100% { filter: drop-shadow(0 0 10px rgba(254,154,0,0.8)) drop-shadow(0 0 20px rgba(254,154,0,0.4)); transform: scale(1); }
                50% { filter: drop-shadow(0 0 15px rgba(254,154,0,1)) drop-shadow(0 0 35px rgba(254,154,0,0.8)) drop-shadow(0 0 50px rgba(254,154,0,0.5)); transform: scale(1.03); }
              }
              .animate-gold-pulse { animation: gold-pulse-glow 2.5s ease-in-out infinite; }
            `}</style>
            <div 
              className="w-full h-1/2 bg-[#fe9a00] pointer-events-auto animate-gold-pulse"
              style={{
                WebkitMaskImage: `url(${viewingAutograph})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${viewingAutograph})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
              onClick={(e) => e.stopPropagation()} 
            />
            <p className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Official Saturday AM Autograph</p>
          </div>
        </div>
      )}

      {alertConfig && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setAlertConfig(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setAlertConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">{alertConfig.title}</h2>
            <p className="text-zinc-300 text-xs font-bold leading-relaxed mb-8">{alertConfig.message}</p>
            <button onClick={() => setAlertConfig(null)} className="w-full font-black uppercase tracking-widest py-3 rounded-lg transition-colors bg-[#fe9a00] text-black hover:bg-white">Acknowledge</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoBook;