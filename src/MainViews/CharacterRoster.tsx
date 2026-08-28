import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Flame, ArrowLeft, Shield, Swords, MapPin, Activity, User, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

const getGridGlowClasses = (role: string, isMc: boolean) => {
  if (role === 'Hero' && isMc) return 'border-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.8)]';
  if (role === 'Hero') return 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]';
  if (role === 'Villain') return 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]';
  return 'border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]';
};

const getModalGlowClasses = (role: string, isMc: boolean) => {
  if (role === 'Hero' && isMc) return 'border-[#fe9a00] shadow-[0_0_40px_rgba(254,154,0,0.6)]';
  if (role === 'Hero') return 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)]';
  if (role === 'Villain') return 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)]';
  return 'border-white shadow-[0_0_40px_rgba(255,255,255,0.4)]';
};

const getModalBackdropGlow = (role: string, isMc: boolean) => {
  if (role === 'Hero' && isMc) return 'from-[#fe9a00]/20';
  if (role === 'Hero') return 'from-cyan-400/20';
  if (role === 'Villain') return 'from-red-600/20';
  return 'from-white/20';
};

export const CharacterRoster = ({ onBack, onNavigate, currentUser }: any) => {
  const { seriesList = [] } = useSeriesData() || {};
  
  const [rawCharacters, setRawCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterAffiliation, setFilterAffiliation] = useState('All');
  const [sortBy, setSortBy] = useState('Role'); 
  
  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [charHypes, setCharHypes] = useState<Record<string, boolean>>({});
  
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showAltForm, setShowAltForm] = useState(false);

  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('series_characters').select('*').order('id', { ascending: true });
        if (error) throw error;
        setRawCharacters(data || []);
      } catch (err) {
        console.error("Failed to fetch characters:", err);
        setRawCharacters([]); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  const characters = useMemo(() => {
    if (!Array.isArray(rawCharacters)) return [];
    const safeSeriesList = Array.isArray(seriesList) ? seriesList : [];
    
    return rawCharacters.map(c => {
      const s = safeSeriesList.find((series: any) => series?.slug === c?.series_slug);
      return { ...c, series_title: s?.title || 'Unknown Series' };
    });
  }, [rawCharacters, seriesList]);

  const groupedChars = useMemo(() => {
    let result = characters || [];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => (c?.name || '').toLowerCase().includes(lowerQuery));
    }
    if (filterRole !== 'All') result = result.filter(c => c?.role_type === filterRole);
    if (filterAffiliation !== 'All') result = result.filter(c => c?.element === filterAffiliation);

    const groups: { name: string | null, items: any[] }[] = [];

    if (sortBy === 'Role') {
      const mcHeroes = result.filter(c => c?.is_mc && c?.role_type === 'Hero');
      const heroes = result.filter(c => !c?.is_mc && c?.role_type === 'Hero');
      const villains = result.filter(c => c?.role_type === 'Villain');
      const neutrals = result.filter(c => c?.role_type === 'Neutral');
      
      if (mcHeroes.length) groups.push({ name: 'Main Characters', items: mcHeroes });
      if (heroes.length) groups.push({ name: 'Heroes', items: heroes });
      if (villains.length) groups.push({ name: 'Villains', items: villains });
      if (neutrals.length) groups.push({ name: 'Neutral', items: neutrals });
    } else if (sortBy === 'Series' || sortBy === 'Affiliation') {
      const key = sortBy === 'Series' ? 'series_title' : 'element';
      const uniqueKeys = Array.from(new Set(result.map(c => c[key]).filter(Boolean))).sort();
      uniqueKeys.forEach(k => {
        groups.push({ name: k as string, items: result.filter(c => c[key] === k) });
      });
      const unassigned = result.filter(c => !c[key]);
      if (unassigned.length) groups.push({ name: 'Unassigned', items: unassigned });
    } else {
      const sorted = [...result].sort((a, b) => sortBy === 'A-Z' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
      groups.push({ name: null, items: sorted }); 
    }

    return groups;
  }, [characters, searchQuery, filterRole, filterAffiliation, sortBy]);

  const uniqueAffiliations = ['All', ...Array.from(new Set((characters || []).map(c => c?.element).filter(Boolean)))];

  const handleHypeCharacter = async (char: any) => {
    if (!currentUser) return alert("Create a Free Account to hype characters!");
    if (charHypes[char?.id]) return;

    setCharHypes(prev => ({ ...prev, [char?.id]: true }));

    try {
      await supabase.from('hypes').insert([{ 
        user_id: currentUser.id, 
        target_type: 'character', 
        target_id: String(char?.id) 
      }]);

      const { data: profile } = await supabase.from('profiles').select('total_hypes, fandom_score').eq('id', currentUser.id).maybeSingle();
      if (profile) {
        await supabase.from('profiles').update({ 
          total_hypes: (profile.total_hypes || 0) + 1,
          fandom_score: (profile.fandom_score || 0) + 5
        }).eq('id', currentUser.id);
        window.dispatchEvent(new Event('profileUpdated'));
      }

      if (char?.series_slug) {
        const { data: seriesData } = await supabase.from('series').select('weekly_hype, total_hype').eq('slug', char.series_slug).maybeSingle();
        if (seriesData) {
          await supabase.from('series').update({
            weekly_hype: (seriesData.weekly_hype || 0) + 5,
            total_hype: (seriesData.total_hype || 0) + 5
          }).eq('slug', char.series_slug);
        }
      }
    } catch(e) {
      console.error("Error updating leaderboard scores for character hype:", e);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white relative z-[100] pb-48">
      <div className="fixed inset-0 z-0 bg-black pointer-events-none">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="w-full h-full object-cover opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black" />
      </div>

      <div className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-xl px-6 pt-6 pb-4 border-b border-zinc-800 mb-8 shadow-xl pr-16 sm:pr-24">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-max">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
              Characters
            </h1>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-zinc-900/80 border border-zinc-700 text-white text-xs rounded-lg pl-9 pr-4 py-2.5 focus:border-[#fe9a00] outline-none w-full sm:w-32 lg:w-48 shadow-inner" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-zinc-900/80 border border-zinc-700 text-white text-xs rounded-lg px-4 py-2.5 outline-none cursor-pointer shadow-inner">
                <option value="Role">Sort: Roles (Default)</option>
                <option value="Custom Order">Sort: Custom Order</option>
                <option value="A-Z">Sort: A-Z</option>
                <option value="Z-A">Sort: Z-A</option>
                <option value="Series">Sort: Series</option>
                <option value="Affiliation">Sort: Affiliation</option>
              </select>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-zinc-900/80 border border-zinc-700 text-white text-xs rounded-lg px-4 py-2.5 outline-none cursor-pointer shadow-inner">
                <option value="All">All Roles</option><option value="Hero">Hero</option><option value="Villain">Villain</option><option value="Neutral">Neutral</option>
              </select>
              <select value={filterAffiliation} onChange={(e) => setFilterAffiliation(e.target.value)} className="bg-zinc-900/80 border border-zinc-700 text-white text-xs rounded-lg px-4 py-2.5 outline-none cursor-pointer shadow-inner">
                {uniqueAffiliations.map(el => <option key={el} value={el}>{el === 'All' ? 'All Affiliations' : el}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {isLoading ? (
          <div className="text-center py-20 bg-black/40 backdrop-blur-md rounded-2xl border border-zinc-800">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading Database...</p>
          </div>
        ) : (
          <>
            {groupedChars.map((group, gIdx) => (
              <div key={gIdx} className="mb-12">
                {group.name && (
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="font-black italic uppercase text-[#fe9a00] text-xl whitespace-nowrap">{group.name}</h3>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {group.items.map((char, index) => (
                    <div key={char?.id || index} onClick={() => { setSelectedChar(char); setShowMobileDetails(false); setShowAltForm(false); }} className="flex flex-col items-center group cursor-pointer animate-fade-in-up">
                      <div className={`relative w-full aspect-square rounded-2xl bg-zinc-900 overflow-hidden mb-2 transition-all duration-300 group-hover:-translate-y-2 flex items-center justify-center border-2 ${getGridGlowClasses(char?.role_type, char?.is_mc)}`}>
                        <User className="w-10 h-10 text-zinc-600 absolute z-0" />
                        
                        {char?.headshot_url && (
                          <img 
                            src={char.headshot_url} 
                            alt={char?.name} 
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            className="w-full h-full object-cover relative z-10 bg-zinc-900" 
                          />
                        )}

                        {char?.is_mc && <div className="absolute top-0 right-0 bg-[#fe9a00] text-black text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg z-20 uppercase">MC</div>}
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none" />
                        {char?.element && char.element !== 'None' && <span className="absolute bottom-1.5 right-1.5 text-[8px] font-black uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10 z-30">{char.element}</span>}
                      </div>
                      <span className="text-[11px] font-black text-white uppercase text-center truncate w-full px-1">{char?.name || 'Unknown'}</span>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest text-center truncate w-full mt-0.5">{char?.series_title || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {groupedChars.length === 0 && (
              <div className="text-center py-20 text-zinc-500 text-xs font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md rounded-2xl border border-zinc-800">
                No characters found in database.
              </div>
            )}

            <div className="mt-16 pt-8 border-t border-zinc-800/50">
              <button 
                onClick={onBack}
                className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" /> Return to App
              </button>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedChar && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in p-4 sm:p-6" onClick={() => setSelectedChar(null)}>
          
          <div className="w-full max-w-5xl max-h-[90vh] bg-black border border-zinc-800 rounded-3xl relative flex flex-col md:flex-row shadow-2xl overflow-y-auto md:overflow-hidden no-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedChar(null)} className="absolute top-4 right-4 z-50 p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className={`w-full md:w-2/5 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 p-8 flex flex-col items-center justify-center relative overflow-hidden shrink-0 ${showMobileDetails ? 'pb-8' : 'pb-32 md:pb-8'}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${getModalBackdropGlow(selectedChar?.role_type, selectedChar?.is_mc)} to-transparent opacity-50 z-0 transition-colors duration-500`} />
              
              <div className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 overflow-hidden mb-6 bg-zinc-900 flex items-center justify-center transition-all duration-500 z-10 ${getModalGlowClasses(selectedChar?.role_type, selectedChar?.is_mc)}`}>
                <User className="w-16 h-16 text-zinc-600 absolute z-0" />
                {selectedChar?.headshot_url && (
                  <img 
                    src={showAltForm ? (selectedChar.alt_headshot_url || selectedChar.headshot_url) : selectedChar.headshot_url} 
                    alt={selectedChar?.name} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover relative z-10 bg-zinc-900 animate-fade-in" 
                  />
                )}
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-1 text-center relative z-10 drop-shadow-md transition-all duration-300">
                {showAltForm ? (selectedChar?.alt_form_name || selectedChar?.name) : (selectedChar?.name || 'UNKNOWN')}
              </h2>
              <p className="text-sm sm:text-base font-bold text-zinc-400 uppercase tracking-widest mb-8 text-center relative z-10">
                {selectedChar?.series_title}
              </p>

              {/* TRANSFORM BUTTON - EXACTLY ABOVE HYPE BUTTON */}
              {selectedChar?.alt_headshot_url && (
                <button 
                  onClick={() => setShowAltForm(!showAltForm)}
                  className="w-full max-w-[240px] mb-4 flex items-center justify-center gap-2 py-3 border border-white rounded-xl font-black uppercase tracking-widest text-[10px] text-white hover:bg-white hover:text-black transition-colors relative z-20 bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.7)] animate-pulse"
                >
                  <RefreshCw className="w-4 h-4" />
                  {showAltForm ? 'Return to Base Form' : 'Alternate Form'}
                </button>
              )}
              
              {/* HYPE BUTTON */}
              <button 
                onClick={() => handleHypeCharacter(selectedChar)} 
                disabled={selectedChar?.id && charHypes[selectedChar.id]} 
                className={`w-full max-w-[240px] flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase tracking-widest transition-all text-xs relative z-10 shadow-lg ${selectedChar?.id && charHypes[selectedChar.id] ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]' : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'}`}
              >
                <Flame className={`w-4 h-4 ${selectedChar?.id && charHypes[selectedChar.id] ? 'fill-[#fe9a00]' : ''}`} />
                {(selectedChar?.id && charHypes[selectedChar.id]) ? 'HYPED!' : 'HYPE CHARACTER'}
              </button>

              <button 
                onClick={() => { const seriesSlug = selectedChar?.series_slug; setSelectedChar(null); if (seriesSlug) onNavigate({ slug: seriesSlug, action: 'series' }); }} 
                className="md:hidden w-full max-w-[240px] bg-zinc-800 text-white py-4 mt-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-colors relative z-10 shadow-lg"
              >
                Read Series
              </button>

              <button 
                onClick={() => setShowMobileDetails(!showMobileDetails)} 
                className="md:hidden w-full max-w-[240px] mt-4 flex items-center justify-center gap-2 py-3 border border-zinc-800 bg-black/40 backdrop-blur-md rounded-xl font-black uppercase tracking-widest text-[10px] text-zinc-400 hover:text-white transition-colors relative z-10"
              >
                {showMobileDetails ? 'Hide Stats & Lore' : 'View Stats & Lore'}
                {showMobileDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <div className={`w-full md:w-3/5 px-6 pt-6 sm:px-10 sm:pt-10 overflow-visible md:overflow-y-auto no-scrollbar bg-black flex-col relative z-10 ${showMobileDetails ? 'flex' : 'hidden md:flex'}`}>
              
              <div className="flex items-center gap-3 mb-8 shrink-0">
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${selectedChar?.role_type === 'Hero' ? 'bg-blue-900/30 text-blue-400 border-blue-900' : selectedChar?.role_type === 'Villain' ? 'bg-red-900/30 text-red-400 border-red-900' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                  {selectedChar?.role_type || 'Unknown'}
                </span>
                {selectedChar?.is_mc && (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/50">
                    Main Character
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 shrink-0">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center text-center shadow-inner">
                  <Shield className="w-5 h-5 text-zinc-500 mb-2" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Affiliation</span>
                  <span className="text-xs sm:text-sm font-black text-white">{selectedChar?.element || 'N/A'}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center text-center shadow-inner">
                  <Swords className="w-5 h-5 text-zinc-500 mb-2" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Power Type</span>
                  <span className="text-xs sm:text-sm font-black text-white">{selectedChar?.weapon || 'None'}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center text-center shadow-inner">
                  <Activity className="w-5 h-5 text-zinc-500 mb-2" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Age</span>
                  <span className="text-xs sm:text-sm font-black text-white">{selectedChar?.age || 'Unknown'}</span>
                </div>
              </div>

              <div className="space-y-6 mb-8 shrink-0">
                <div>
                  <h4 className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">Origin Story</h4>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-medium">{selectedChar?.origin || 'Origin data restricted.'}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">Powers & Abilities</h4>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-medium">{selectedChar?.powers || 'None recorded.'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">Weaknesses</h4>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-medium">{selectedChar?.weakness || 'None recorded.'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 sm:p-8 mb-8 grid grid-cols-2 gap-6 shadow-inner shrink-0">
                <div>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Height</span>
                  <span className="text-xs sm:text-sm font-black text-white">{selectedChar?.height || '???'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Ethnicity</span>
                  <span className="text-xs sm:text-sm font-black text-white">{selectedChar?.ethnicity || '???'}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">In-World Location</span>
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#fe9a00]"/> {selectedChar?.location || '???'}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">First Appearance</span>
                  <span className="text-xs sm:text-sm font-black text-[#fe9a00]">{selectedChar?.first_appearance || '???'}</span>
                </div>
              </div>

              <button 
                onClick={() => { const seriesSlug = selectedChar?.series_slug; setSelectedChar(null); if (seriesSlug) onNavigate({ slug: seriesSlug, action: 'series' }); }} 
                className="hidden md:block w-full bg-zinc-800 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm hover:bg-zinc-700 transition-colors mt-auto shrink-0 z-20 relative"
              >
                Read Series
              </button>

              <div className="w-full min-h-[150px] shrink-0"></div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};