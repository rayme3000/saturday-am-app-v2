import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { FrameMaker } from './FrameMaker'; 
import { ModerationDashboard } from './ModerationDashboard';
import { supabase } from '../supabase';
import { Bell, Send, BookOpen, Star, Sparkles, Newspaper, Key, Trash2, Mic, PenTool } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const useUnsavedWarning = (hasUnsavedChanges: boolean) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
};

const PromoCodeManager = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [tier, setTier] = useState('free');
  const [maxUses, setMaxUses] = useState(100);
  const [expireDays, setExpireDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCodes = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  useEffect(() => { fetchCodes(); }, []);

  const generateRandom = () => {
    setNewCode('BETA-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return alert("Please enter or generate a code.");
    setIsSubmitting(true);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expireDays));
    
    const { error } = await supabase.from('promo_codes').insert([{ code: newCode.toUpperCase().trim(), tier, max_uses: maxUses, expires_at: expiresAt.toISOString() }]);
    setIsSubmitting(false);
    
    if (error) alert("Error creating code: " + error.message);
    else { alert('Access Key Generated!'); setNewCode(''); fetchCodes(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this access key?")) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (!error) fetchCodes();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Key className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Access Key Generator</h2>
      </div>

      <form onSubmit={handleCreate} className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Custom Code (or Random)</label>
            <div className="flex gap-2">
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} required placeholder="e.g. VIP-ACCESS-99" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg text-[#fe9a00] px-4 py-3 font-black tracking-widest text-sm focus:outline-none focus:border-[#fe9a00]" />
              <button type="button" onClick={generateRandom} className="bg-zinc-800 text-white px-4 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-zinc-700">Auto</button>
            </div>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Access Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]">
              <option value="free">Standard (Free)</option>
              <option value="premium">Premium (Pro)</option>
            </select>
          </div>

          <div className="w-full md:w-1/4">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Max Uses</label>
            <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} required className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" />
          </div>

          <div className="w-full md:w-1/4">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Valid For (Days)</label>
            <input type="number" min="1" value={expireDays} onChange={e => setExpireDays(Number(e.target.value))} required className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <Key className="w-4 h-4" />{isSubmitting ? 'Generating...' : 'Generate Access Key'}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 sticky top-0 bg-zinc-900 py-2">Active Promos & Beta Keys</h3>
        {codes.length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold italic">No active keys found.</p>
        ) : (
          codes.map((c) => {
            const isExpired = new Date() > new Date(c.expires_at);
            const isDepleted = c.times_used >= c.max_uses;
            const statusColor = (isExpired || isDepleted) ? 'text-red-500 border-red-900 bg-red-900/10' : 'text-emerald-500 border-emerald-900 bg-emerald-900/10';

            return (
              <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black border border-zinc-800 p-4 rounded-xl gap-4">
                <div>
                  <h4 className="font-black tracking-widest text-[#fe9a00] text-lg">{c.code}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${statusColor}`}>
                      {(isExpired || isDepleted) ? 'INACTIVE' : 'ACTIVE'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tier: <span className="text-white">{c.tier}</span></span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Used: <span className="text-white">{c.times_used} / {c.max_uses}</span></span>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2 font-mono">Expires: {new Date(c.expires_at).toLocaleString()}</p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

const MasterSignatureManager = ({ Dropzone }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [signatures, setSignatures] = useState<any[]>([]);
  const [activePins, setActivePins] = useState<Record<string, string>>({});
  const [creatorName, setCreatorName] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map();
    const processName = (nameInput: any) => {
      if (!nameInput) return;
      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];
      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        if (typeof nameObj === 'object' && nameObj !== null) {
          if (nameObj.is_visible === false) return; 
          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
        }
        if (typeof nameStr !== 'string') return;
        nameStr = nameStr.replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '');
        const splitNames = nameStr.split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);
        splitNames.forEach(rawName => {
          const cName = rawName.trim();
          if (cName.length >= 2) {
            const mapKey = cName.toLowerCase();
            if (!uniqueMap.has(mapKey)) uniqueMap.set(mapKey, cName);
          }
        });
      });
    };

    seriesList.forEach((series: any) => {
      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) processName(series.creators);
      else {
        processName(series.creator_name || series.creator);
        processName(series.writer_name || series.writer || series.author_name);
        processName(series.artist_name || series.artist || series.illustrator);
        processName(series.co_creator_name || series.co_creator);
      }
    });
    return Array.from(uniqueMap.values()).sort((a: any, b: any) => a.localeCompare(b));
  }, [seriesList]);

  const fetchSignaturesAndPins = async () => {
    const { data: sigs } = await supabase.from('creator_signatures').select('*').order('creator_name', { ascending: true });
    if (sigs) setSignatures(sigs);

    const { data: codes } = await supabase.from('bingo_codes').select('code, creator_name, expires_at');
    if (codes) {
      const pinMap: Record<string, string> = {};
      const now = new Date();
      codes.forEach(c => {
        if (new Date(c.expires_at) > now) {
          pinMap[c.creator_name] = c.code;
        }
      });
      setActivePins(pinMap);
    }
  };

  useEffect(() => { fetchSignaturesAndPins(); }, []);

  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setCreatorName(selectedName);
    
    const existingSig = signatures.find(s => s.creator_name === selectedName);
    if (existingSig) {
      setSignatureUrl(existingSig.signature_url);
    } else {
      setSignatureUrl('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName || !signatureUrl) return alert("Please select a creator and upload a signature image.");
    setIsSubmitting(true);
    const { error } = await supabase.from('creator_signatures').upsert({ creator_name: creatorName.trim(), signature_url: signatureUrl }, { onConflict: 'creator_name' });
    setIsSubmitting(false);

    if (error) alert("Error saving signature: " + error.message);
    else { alert('Signature Vault Updated!'); setCreatorName(''); setSignatureUrl(''); fetchSignaturesAndPins(); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this signature? Fans will no longer be able to claim it.")) return;
    const { error } = await supabase.from('creator_signatures').delete().eq('id', id);
    if (!error) fetchSignaturesAndPins();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <PenTool className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Signature Vault</h2>
      </div>
      <form onSubmit={handleSave} className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4">
        <p className="text-xs text-zinc-400 font-bold mb-4">Upload pre-drawn transparent PNG signatures or sketches.</p>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Select Creator</label>
            <select value={creatorName} onChange={handleCreatorChange} required className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] mb-4 cursor-pointer">
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map((name: string) => <option key={name} value={name}>{name}</option>)}
            </select>
            {signatureUrl && (
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex justify-center items-center">
                <img src={signatureUrl} alt="Preview" className="max-h-32 object-contain" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Upload Transparent PNG</label>
            <Dropzone label={signatureUrl ? "Replace Signature" : "+ Upload PNG"} height="p-6" folderPath="creator-signatures" onUploadComplete={(url: string) => setSignatureUrl(url)} />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting || !signatureUrl || !creatorName} className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <PenTool className="w-4 h-4" />{isSubmitting ? 'Saving...' : 'Save to Vault'}
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {signatures.length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold italic col-span-full">No signatures in the vault yet.</p>
        ) : (
          signatures.map((sig) => (
            <div key={sig.id} className="bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col group relative">
              <div className="bg-zinc-900 relative aspect-[3/1] p-4 flex items-center justify-center border-b border-zinc-800">
                <img src={sig.signature_url} className="w-full h-full object-contain" alt="Signature" />
                
                {activePins[sig.creator_name] && (
                  <div className="absolute top-2 left-2 bg-[#fe9a00] text-black text-[10px] font-black tracking-widest px-2 py-0.5 rounded shadow-lg z-10 uppercase">
                    PIN: {activePins[sig.creator_name]}
                  </div>
                )}

                <button onClick={() => handleDelete(sig.id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-lg z-20" title="Delete Signature"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="p-3 text-center"><h4 className="font-black text-xs text-white uppercase tracking-widest truncate">{sig.creator_name}</h4></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const BingoCodeManager = () => {
  const { seriesList = [] } = useSeriesData();
  const [codes, setCodes] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [duration, setDuration] = useState('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map();
    const processName = (nameInput: any) => {
      if (!nameInput) return;
      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];
      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        if (typeof nameObj === 'object' && nameObj !== null) {
          if (nameObj.is_visible === false) return; 
          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
        }
        if (typeof nameStr !== 'string') return;
        nameStr = nameStr.replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '');
        const splitNames = nameStr.split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);
        splitNames.forEach(rawName => {
          const cName = rawName.trim();
          if (cName.length >= 2) {
            const mapKey = cName.toLowerCase();
            if (!uniqueMap.has(mapKey)) uniqueMap.set(mapKey, cName);
          }
        });
      });
    };

    seriesList.forEach((series: any) => {
      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) processName(series.creators);
      else {
        processName(series.creator_name || series.creator);
        processName(series.writer_name || series.writer || series.author_name);
        processName(series.artist_name || series.artist || series.illustrator);
        processName(series.co_creator_name || series.co_creator);
      }
    });
    return Array.from(uniqueMap.values()).sort((a: any, b: any) => a.localeCompare(b));
  }, [seriesList]);

  const fetchCodes = async () => {
    const { data } = await supabase.from('bingo_codes').select('*').order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName) return alert("Please select a Creator.");
    setIsSubmitting(true);
    
    const pin = Math.floor(10000 + Math.random() * 90000).toString(); 
    
    let expiresAt = new Date();
    if (duration === '30m') expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    else if (duration === '1h') expiresAt.setHours(expiresAt.getHours() + 1);
    else if (duration === '12h') expiresAt.setHours(expiresAt.getHours() + 12);
    else if (duration === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
    else if (duration === '72h') expiresAt.setHours(expiresAt.getHours() + 72);
    else if (duration === 'permanent') expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    
    const { error } = await supabase.from('bingo_codes').insert([{
      code: pin,
      creator_name: creatorName.trim(),
      event_name: 'Standard Unlock', 
      max_uses: 999999, 
      expires_at: expiresAt.toISOString()
    }]);
    
    setIsSubmitting(false);
    if (error) alert("Error creating PIN: " + error.message);
    else { alert(`Code Generated: ${pin}`); setCreatorName(''); fetchCodes(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this PIN?")) return;
    const { error } = await supabase.from('bingo_codes').delete().eq('id', id);
    if (!error) fetchCodes();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Mic className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Bingo Codes</h2>
      </div>

      <form onSubmit={handleCreate} className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Select Creator</label>
            <select 
              value={creatorName} 
              onChange={e => setCreatorName(e.target.value)} 
              required 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map((name: string) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Duration</label>
            <select 
              value={duration} 
              onChange={e => setDuration(e.target.value)} 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="72h">72 Hours</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <Key className="w-4 h-4" />{isSubmitting ? 'Generating...' : 'Generate 5-Digit PIN'}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 sticky top-0 bg-zinc-900 py-2">Active PINs</h3>
        {codes.length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold italic">No active PINs found.</p>
        ) : (
          codes.map((c) => {
            const isExpired = new Date() > new Date(c.expires_at);
            const statusColor = isExpired ? 'text-red-500 border-red-900 bg-red-900/10' : 'text-[#fe9a00] border-[#fe9a00]/50 bg-[#fe9a00]/10';

            return (
              <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black border border-zinc-800 p-4 rounded-xl gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black tracking-[0.5em] text-white text-2xl">{c.code}</h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${statusColor}`}>
                      {isExpired ? 'EXPIRED' : 'LIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Creator: <span className="text-[#fe9a00]">{c.creator_name}</span></span>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2 font-mono">Expires: {new Date(c.expires_at).getFullYear() > 2090 ? 'Never (Permanent)' : new Date(c.expires_at).toLocaleString()}</p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

const NotificationCenter = () => {
  const { seriesList = [] } = useSeriesData();
  const [notifType, setNotifType] = useState<'chapter' | 'feature' | 'news' | 'custom'>('chapter');
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState('');
  const [title, setTitle] = useState('New Chapter Drop!');
  const [message, setMessage] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: 'chapter' | 'feature' | 'news' | 'custom') => {
    setNotifType(type); setSelectedSeriesSlug('');
    if (type === 'feature') { setTitle('App Feature Update'); setMessage(''); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget(''); } 
    else if (type === 'news') { setTitle('Saturday AM News'); setMessage('News from Saturday AM'); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget('news'); } 
    else if (type === 'chapter') { setTitle('New Chapter Drop!'); setMessage(''); setThumbnailUrl(''); setLinkTarget(''); } 
    else { setTitle(''); setMessage(''); setThumbnailUrl(''); setLinkTarget(''); }
  };

  const handleSeriesSelect = (slug: string) => {
    setSelectedSeriesSlug(slug);
    const series = seriesList.find((s: any) => s.slug === slug);
    if (series) { setMessage(`Chapter Drop: NEW ${series.title}!`); setThumbnailUrl(series.cover_url || ''); setLinkTarget(series.slug); } 
    else { setMessage(''); setThumbnailUrl(''); setLinkTarget(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Title and Message are required!");
    setIsSubmitting(true);
    const { error } = await supabase.from('app_notifications').insert([{ title, message, thumbnail_url: thumbnailUrl || null, link_target: linkTarget || null }]);
    setIsSubmitting(false);
    if (error) alert("Error: " + error.message);
    else { alert("Notification Blasted Successfully!"); handleTypeChange(notifType); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Bell className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Push Notification Blaster</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button onClick={() => handleTypeChange('chapter')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'chapter' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><BookOpen className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Chapter</span></button>
        <button onClick={() => handleTypeChange('feature')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'feature' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Sparkles className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Update</span></button>
        <button onClick={() => handleTypeChange('news')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'news' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Newspaper className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">AM News</span></button>
        <button onClick={() => handleTypeChange('custom')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'custom' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Star className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Custom</span></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {notifType === 'chapter' && (
          <div className="p-4 bg-black border border-zinc-800 rounded-xl mb-4">
            <label className="block text-[#fe9a00] font-bold uppercase tracking-widest text-[10px] mb-2">Select Series to Auto-Fill</label>
            <select value={selectedSeriesSlug} onChange={(e) => handleSeriesSelect(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]">
              <option value="">-- Choose a Series --</option>
              {seriesList.map((series: any) => <option key={series.id} value={series.slug}>{series.title}</option>)}
            </select>
          </div>
        )}
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Notification Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={50} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. New Chapter Drop!" /></div>
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Message Body</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} maxLength={150} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="Brief description of the update..." /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Thumbnail URL</label><input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="https://..." /></div>
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Link Target</label><input type="text" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. apple-black" /></div>
        </div>
        {thumbnailUrl && (
          <div className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl"><img src={thumbnailUrl} alt="Thumbnail Preview" className="w-12 h-12 object-cover rounded border border-zinc-700" /><span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Thumbnail Preview</span></div>
        )}
        <button type="submit" disabled={isSubmitting} className="mt-6 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />{isSubmitting ? 'Broadcasting...' : 'Blast Notification'}
        </button>
      </form>
    </div>
  );
};

export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedWarning(isDirty);

  const handleMarkDirty = useCallback(() => {
    if (!isDirty) {
      setTimeout(() => setIsDirty(true), 10);
    }
  }, [isDirty]);

  const handleTabChange = (tabId: string) => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to leave this tab? Your progress will be lost.")) return;
    setIsDirty(false); setActiveTab(tabId);
  };

  const handleExit = () => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to exit? Your progress will be lost.")) return;
    setIsDirty(false); onBack();
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics' }, { id: 'home', label: 'Home Editor' },
    { id: 'series', label: 'Series Page Editor' }, { id: 'chapter', label: 'Chapter Upload' },
    { id: 'avatars', label: 'Avatar Maker' }, { id: 'frames', label: 'Frame Maker' }, 
    { id: 'stickers', label: 'Sticker Maker' }, { id: 'cardskins', label: 'Card Skin Studio' },
    { id: 'accesskeys', label: 'Access Keys' }, 
    { id: 'signatures', label: 'Signature Vault' },
    { id: 'bingocodes', label: 'Bingo Codes' },
    { id: 'moderation', label: 'Moderation' }, { id: 'notifications', label: 'Push Alerts' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Logged in as Administrator</p>
          </div>
          <button onClick={handleExit} className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors">
            Exit Vault
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-6 mb-8 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 ${activeTab === tab.id ? 'text-[#fe9a00] border-[#fe9a00]' : 'text-zinc-500 border-transparent hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6" onInput={handleMarkDirty} onChange={handleMarkDirty}>
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} setIsDirty={setIsDirty} />}
          {activeTab === 'series' && <SeriesEditor Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'chapter' && <ChapterUploader Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'avatars' && <AvatarMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'frames' && <FrameMaker setIsDirty={setIsDirty} />} 
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'cardskins' && <CardSkinMaker setIsDirty={setIsDirty} />}
          {activeTab === 'accesskeys' && <PromoCodeManager />} 
          {activeTab === 'signatures' && <MasterSignatureManager Dropzone={Dropzone} />}
          {activeTab === 'bingocodes' && <BingoCodeManager />} 
          {activeTab === 'moderation' && <ModerationDashboard />}
          {activeTab === 'notifications' && <NotificationCenter />}
        </div>
      </div>
    </div>
  );
};