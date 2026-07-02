import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Target, Lock, Unlock, Eraser, CheckCircle } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const BingoBook = ({ onBack }: any) => {
  const { seriesList = [] } = useSeriesData();

  // Dynamically generate ALL creators/writers from your series data
  const CREATOR_TARGETS = useMemo(() => {
    const uniqueCreatorsMap = new Map();

    // The "Ultimate Shredder" - Breaks apart arrays, objects, and combined strings
    const processName = (nameInput: any, defaultAvatar: any, sTitle: string) => {
      if (!nameInput) return;

      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];

      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        let avatarToUse = defaultAvatar;

        if (typeof nameObj === 'object' && nameObj !== null) {
          
          // --- THE MAGIC FILTER ---
          // Because we prioritize series.creators below, this flag will finally be read!
          if (nameObj.is_visible === false) return; 

          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
          // Pull their specific avatar from the DB object if it exists
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

      // 🚨 THIS IS THE KEY FIX 🚨
      // Check if we have the new Supabase relational data first!
      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) {
        processName(series.creators, null, sTitle);
      } else {
        // Fallback for older series that haven't been re-saved in the new editor yet
        processName(series.creator_name || series.creator, series.creator_avatar || series.creator_image, sTitle);
        processName(series.writer_name || series.writer || series.author_name, series.writer_avatar || series.writer_image, sTitle);
        processName(series.artist_name || series.artist || series.illustrator, series.artist_avatar || series.artist_image, sTitle);
        processName(series.co_creator_name || series.co_creator, series.co_creator_avatar || series.co_creator_image, sTitle);
      }
    });

    // Alphabetize the final list
    return Array.from(uniqueCreatorsMap.values())
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((creator: any, index) => ({ id: index + 1, ...creator }));
  }, [seriesList]);

  const [unlockedCreators, setUnlockedCreators] = useState<number[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [signatures, setSignatures] = useState<Record<number, string>>({});
  const [hasDrawn, setHasDrawn] = useState(false);
  
  // Auth & Drawing States
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#fe9a00');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const progressPercentage = CREATOR_TARGETS.length > 0 ? (unlockedCreators.length / CREATOR_TARGETS.length) * 100 : 0;

  // --- CANVAS LOGIC ---
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
    if (isUnlocked) {
      initCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      // If the creator already signed this, load their previous signature onto the canvas
      if (canvas && ctx && selectedTarget && signatures[selectedTarget.id]) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = signatures[selectedTarget.id];
        setHasDrawn(true); // Treat as drawn so they can immediately re-save if desired
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
        const startDrawing = (e: any) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = penColor;
      setIsDrawing(true);
      setHasDrawn(true); // Marks that the canvas is no longer empty
    }
  };
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = penColor;
      setIsDrawing(true);
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
      setHasDrawn(false); // Disable save button since it's empty again
    }
  };

  // --- MOCK AUTH LOGIC ---
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234') { // Mock PIN for testing
      setIsUnlocked(true);
    } else {
      alert("Incorrect Creator PIN. Please try again.");
    }
    setPinInput('');
  };

  const handleSave = () => {
    if (!hasDrawn || !selectedTarget) return; // Prevent saving empty canvas

    const canvas = canvasRef.current;
    if (canvas) {
      // Store the signature image data to allow future updates
      const dataUrl = canvas.toDataURL();
      setSignatures(prev => ({ ...prev, [selectedTarget.id]: dataUrl }));
    }

    // Mark the bounty as completed ONLY after successfully saving
    if (!unlockedCreators.includes(selectedTarget.id)) {
      setUnlockedCreators([...unlockedCreators, selectedTarget.id]);
    }
    closeTargetModal();
  };

  const closeTargetModal = () => {
    setSelectedTarget(null);
    setIsUnlocked(false);
    setPinInput('');
    setHasDrawn(false);
  };

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
    <div className="mb-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#fe9a00]"></div>
      <h2 className="text-[#fe9a00] text-sm font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <Target className="w-5 h-5" /> Mission
      </h2>
      <p className="text-zinc-300 text-sm font-medium leading-relaxed">
        Find these creators at live shows and conventions and get their autograph. Stay tuned to social media to find events and creators near you.
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
                onClick={() => { setSelectedTarget(target); setIsUnlocked(isCaught); }}
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 ${isCaught ? 'border-[#fe9a00]' : 'border-zinc-800 hover:border-zinc-600 grayscale hover:grayscale-0'}`}
              >
                <img src={target.avatar} alt={target.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                
                {/* Overlay details */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-4 text-left">
                  <p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1">{isCaught ? 'Captured' : 'Wanted'}</p>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-wider leading-tight">{target.name}</h3>
                  {target.series?.length > 0 && (
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1 line-clamp-2 leading-tight">
                      {target.series.join(' • ')}
                    </p>
                  )}
                </div>

                {/* Caught Stamp */}
                {isCaught && (
                  <div className="absolute top-3 right-3 text-[#fe9a00] bg-black/50 rounded-full p-1 backdrop-blur-md">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                )}
              </button>
            );
          })}
          {CREATOR_TARGETS.length === 0 && (
            <p className="col-span-full text-center text-zinc-500 font-bold tracking-widest uppercase py-8">No targets found in series data.</p>
          )}
        </div>

      </div>

      {/* TARGET MODAL (Auth & Canvas) */}
      {selectedTarget && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${isUnlocked ? 'text-[#fe9a00]' : 'text-red-500'}`} />
                <span className="font-black uppercase tracking-widest text-sm">{selectedTarget.name}</span>
              </div>
              <button onClick={closeTargetModal} className="text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px]">Close</button>
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 flex flex-col min-h-[400px]">
              
              {!isUnlocked ? (
                /* AUTHENTICATION SCREEN */
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
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">(Hint: use 1234 for testing)</p>
                </div>
              ) : (
                /* CANVAS SCREEN */
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
                  
                  <button onClick={closeTargetModal} className="mt-4 w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">
                    Save Signature & Return to Grid
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BingoBook;