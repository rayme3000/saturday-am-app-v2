import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, ArrowLeft, Swords, MapPin, Activity, User,
  Lock, Heart, BookOpen, Zap, AlertCircle, FileText
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import { HypeButton } from '../Components/HypeButton';
import { LikeButton } from '../Components/LikeButton';

const getGridGlowClasses = (role: string, isMc: boolean) => {
  if (role === 'Support' && isMc) return 'border-[#fe9a00]/80 hover:border-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.35)]';
  if (role === 'Support') return 'border-cyan-400/70 hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]';
  if (role === 'Villain') return 'border-red-600/80 hover:border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.35)]';
  return 'border-zinc-700 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]';
};

const getModalGlowClasses = (role: string, isMc: boolean) => {
  if (role === 'Support' && isMc) return 'border-[#fe9a00] shadow-[0_0_35px_rgba(254,154,0,0.5)]';
  if (role === 'Support') return 'border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.5)]';
  if (role === 'Villain') return 'border-red-600 shadow-[0_0_35px_rgba(220,38,38,0.5)]';
  return 'border-white shadow-[0_0_35px_rgba(255,255,255,0.3)]';
};

const getModalBackdropGlow = (role: string, isMc: boolean) => {
  if (role === 'Support' && isMc) return 'from-[#fe9a00]/25';
  if (role === 'Support') return 'from-cyan-400/25';
  if (role === 'Villain') return 'from-red-600/25';
  return 'from-white/15';
};

const getGroupHeaderColor = (groupName: string) => {
  if (groupName === 'Support') return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]';
  if (groupName === 'Villains') return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  if (groupName === 'Neutral') return 'text-zinc-400';
  return 'text-[#fe9a00]';
};

// Helper to break giant walls of text or numbered strings ("1. ... 2. ...") into clean, readable chunks
const formatLoreChunks = (rawText?: string): string[] => {
  if (!rawText || !rawText.trim()) return [];
  const clean = rawText.trim();

  // Check if text uses numbered points like "1. ... 2. ..."
  if (/\b1\.\s/.test(clean) && /\b2\.\s/.test(clean)) {
    return clean
      .split(/(?=\b\d+\.\s)/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Otherwise split by line breaks or group every 2 sentences so it never forms a giant wall
  const paragraphs = clean.split(/\n+/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)\vert{}[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = sentences.slice(i, i + 2).join(' ').trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
};

export const CharacterRoster = ({ onBack, onNavigate, currentUser, onLoginClick }: any) => {
  const { seriesList = [] } = useSeriesData() || {};

  const [rawCharacters, setRawCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSelection, setViewSelection] = useState('Sort:Role');
  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'combat' | 'origin' | 'vitals'>('combat');

  const [charLikes, setCharLikes] = useState<Record<string, boolean>>({});
  const [upsellConfig, setUpsellConfig] = useState<{ type: 'visitor' | 'premium'; message: string } | null>(null);

  // Notify app overlay listener when character dossier modal is open
  useEffect(() => {
    if (selectedChar) {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
      return () => {
        window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
      };
    }
  }, [selectedChar]);

  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('series_characters')
          .select('*')
          .or('is_hidden.is.null,is_hidden.eq.false')
          .order('id', { ascending: true });
        if (error) throw error;
        const updatedRoles = (data || []).map(c => ({
          ...c,
          role_type: c.role_type === 'Hero' ? 'Support' : c.role_type
        }));
        setRawCharacters(updatedRoles);
      } catch (err) {
        console.error('Failed to fetch characters:', err);
        setRawCharacters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (!currentUser || !rawCharacters.length) return;
    const fetchCharLikes = async () => {
      const charIds = rawCharacters.map(c => c.id);
      const { data } = await supabase
        .from('character_likes')
        .select('character_id')
        .eq('user_id', currentUser.id)
        .in('character_id', charIds);
      if (data) {
        const likesMap: Record<string, boolean> = {};
        data.forEach(row => {
          likesMap[row.character_id] = true;
        });
        setCharLikes(likesMap);
      }
    };
    fetchCharLikes();
  }, [currentUser, rawCharacters]);

  const characters = useMemo(() => {
    if (!Array.isArray(rawCharacters)) return [];
    const safeSeriesList = Array.isArray(seriesList) ? seriesList : [];
    return rawCharacters.map(c => {
      const s = safeSeriesList.find((series: any) => series?.slug === c?.series_slug);
      return { ...c, series_title: s?.title || 'Unknown Series' };
    });
  }, [rawCharacters, seriesList]);

  const uniqueAffiliations = Array.from(new Set((characters || []).map(c => c?.element).filter(Boolean))).sort();

  const groupedChars = useMemo(() => {
    let result = characters || [];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          (c?.name || '').toLowerCase().includes(lowerQuery) ||
          (c?.series_title || '').toLowerCase().includes(lowerQuery)
      );
    }

    const isRoleFilter = viewSelection.startsWith('RoleFilter:');
    const isAffilFilter = viewSelection.startsWith('AffilFilter:');
    const isSort = viewSelection.startsWith('Sort:');

    if (isRoleFilter) {
      const activeRole = viewSelection.replace('RoleFilter:', '');
      result = result.filter(c => c?.role_type === activeRole);
    }
    if (isAffilFilter) {
      const activeAffil = viewSelection.replace('AffilFilter:', '');
      result = result.filter(c => c?.element === activeAffil);
    }

    const groups: { name: string | null; items: any[] }[] = [];
    const currentSortBy = isSort ? viewSelection.replace('Sort:', '') : 'A-Z';

    if (currentSortBy === 'Role') {
      const mcHeroes = result.filter(c => c?.is_mc && c?.role_type === 'Support');
      const heroes = result.filter(c => !c?.is_mc && c?.role_type === 'Support');
      const villains = result.filter(c => c?.role_type === 'Villain');
      const neutrals = result.filter(c => c?.role_type === 'Neutral');

      if (mcHeroes.length) groups.push({ name: 'Main Characters', items: mcHeroes });
      if (heroes.length) groups.push({ name: 'Support', items: heroes });
      if (villains.length) groups.push({ name: 'Villains', items: villains });
      if (neutrals.length) groups.push({ name: 'Neutral', items: neutrals });
    } else if (currentSortBy === 'Series' || currentSortBy === 'Affiliation') {
      const key = currentSortBy === 'Series' ? 'series_title' : 'element';
      const uniqueKeys = Array.from(new Set(result.map(c => c[key]).filter(Boolean))).sort();
      uniqueKeys.forEach(k => {
        groups.push({ name: k as string, items: result.filter(c => c[key] === k) });
      });
      const unassigned = result.filter(c => !c[key]);
      if (unassigned.length) groups.push({ name: 'Unassigned', items: unassigned });
    } else {
      const sorted = [...result].sort((a, b) => {
        if (currentSortBy === 'A-Z') return (a.name || '').localeCompare(b.name || '');
        if (currentSortBy === 'Z-A') return (b.name || '').localeCompare(a.name || '');
        return 0;
      });
      groups.push({ name: null, items: sorted });
    }

    return groups;
  }, [characters, searchQuery, viewSelection]);

  const handleToggleGridLike = async (e: React.MouseEvent, char: any) => {
    e.stopPropagation();
    if (!currentUser) {
      setUpsellConfig({ type: 'visitor', message: 'Create a Free Account to like characters!' });
      return;
    }
    const currentlyLiked = charLikes[char.id];
    setCharLikes(prev => ({ ...prev, [char.id]: !currentlyLiked }));

    try {
      if (currentlyLiked) {
        await supabase.from('character_likes').delete().match({ user_id: currentUser.id, character_id: char.id });
      } else {
        await supabase.from('character_likes').insert([{ user_id: currentUser.id, character_id: char.id }]);
      }
    } catch (err) {
      console.error('Failed to sync character like:', err);
      setCharLikes(prev => ({ ...prev, [char.id]: currentlyLiked }));
    }
  };

  const openCharacterDossier = (char: any) => {
    setSelectedChar(char);
    setActiveTab('combat');
  };

  const powerChunks = useMemo(() => formatLoreChunks(selectedChar?.powers), [selectedChar?.powers]);
  const weaknessChunks = useMemo(() => formatLoreChunks(selectedChar?.weakness), [selectedChar?.weakness]);
  const originChunks = useMemo(() => formatLoreChunks(selectedChar?.origin), [selectedChar?.origin]);

  return (
    <div className="min-h-screen bg-transparent text-white relative z-[100] pb-48">
      {upsellConfig && (
        <div
          className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative">
            <button
              onClick={() => setUpsellConfig(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Lock className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              {upsellConfig.type === 'visitor' ? 'Account Required' : 'Premium Feature'}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            <button
              onClick={() => {
                setUpsellConfig(null);
                if (onLoginClick) onLoginClick();
                else if (onNavigate) onNavigate({ action: 'login' });
              }}
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors cursor-pointer"
            >
              Log In / Sign Up
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-0 bg-black pointer-events-none">
        <img
          src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png"
          alt="Manga Collage"
          className="w-full h-full object-cover opacity-30 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black" />
      </div>

      {/* Top Sticky Filter Header */}
      <div className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-xl px-6 pt-6 pb-4 border-b border-zinc-800 mb-8 shadow-xl pr-16 sm:pr-24">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-max cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
                Character <span className="text-[#fe9a00]">Roster</span>
              </h1>
              <p className="text-[11px] font-bold text-zinc-400 mt-1">
                Tap any fighter card to inspect combat abilities, origin files & drop Hypes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search character or series..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-zinc-900/90 border border-zinc-700 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:border-[#fe9a00] outline-none w-full sm:w-56 lg:w-64 shadow-inner font-bold"
                />
              </div>
              <select
                value={viewSelection}
                onChange={e => setViewSelection(e.target.value)}
                className="bg-zinc-900/90 border border-zinc-700 text-white text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer shadow-inner flex-1 lg:flex-initial min-w-[170px]"
              >
                <optgroup label="Sort & Group">
                  <option value="Sort:Role">Group: Roles (Default)</option>
                  <option value="Sort:Custom Order">Sort: Custom Order</option>
                  <option value="Sort:A-Z">Sort: A-Z</option>
                  <option value="Sort:Z-A">Sort: Z-A</option>
                  <option value="Sort:Series">Group: Series</option>
                  <option value="Sort:Affiliation">Group: Affiliation</option>
                </optgroup>
                <optgroup label="Filter by Role">
                  <option value="RoleFilter:Support">Role: Support</option>
                  <option value="RoleFilter:Villain">Role: Villain</option>
                  <option value="RoleFilter:Neutral">Role: Neutral</option>
                </optgroup>
                {uniqueAffiliations.length > 0 && (
                  <optgroup label="Filter by Affiliation">
                    {uniqueAffiliations.map((el: any) => (
                      <option key={el} value={`AffilFilter:${el}`}>
                        Affiliation: {el}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Character Grid */}
      <div className="max-w-7xl mx-auto px-6 py-4 relative z-10">
        {isLoading ? (
          <div className="text-center py-20 bg-black/40 backdrop-blur-md rounded-2xl border border-zinc-800">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading Roster...</p>
          </div>
        ) : (
          <>
            {groupedChars.map((group, gIdx) => (
              <div key={gIdx} className="mb-12">
                {group.name && (
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className={`font-black italic uppercase text-xl whitespace-nowrap ${getGroupHeaderColor(group.name)}`}>
                      {group.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                      {group.items.length}
                    </span>
                    <div className="flex-1 h-px bg-zinc-800/80" />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                  {group.items.map((char, index) => (
                    <div
                      key={char?.id || index}
                      onClick={() => openCharacterDossier(char)}
                      className={`group relative rounded-2xl bg-zinc-950/90 border-2 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col ${getGridGlowClasses(
                        char?.role_type,
                        char?.is_mc
                      )}`}
                    >
                      <div className="relative w-full aspect-[4/4.3] bg-zinc-900 overflow-hidden flex items-center justify-center">
                        <User className="w-10 h-10 text-zinc-700 absolute z-0" />
                        {char?.headshot_url && (
                          <img
                            src={char.headshot_url}
                            alt={char?.name}
                            loading="lazy"
                            decoding="async"
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
                          />
                        )}

                        {char?.is_mc && (
                          <div className="absolute top-2 right-2 bg-[#fe9a00] text-black text-[8px] font-black px-2 py-0.5 rounded-md z-20 uppercase tracking-widest shadow">
                            MC
                          </div>
                        )}

                        <button
                          onClick={e => handleToggleGridLike(e, char)}
                          className="absolute top-2 left-2 z-30 p-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 hover:bg-zinc-800 transition-all shadow-md cursor-pointer"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${
                              charLikes[char.id] ? 'fill-red-500 text-red-500' : 'text-zinc-300 hover:text-red-400'
                            }`}
                          />
                        </button>

                        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-20 pointer-events-none" />

                        {char?.element && char.element !== 'None' && (
                          <span className="absolute bottom-2 right-2 text-[8px] font-black uppercase tracking-widest bg-black/80 text-zinc-200 px-2 py-0.5 rounded border border-white/10 z-30">
                            {char.element}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-zinc-950 flex flex-col items-center text-center">
                        <span className="text-xs font-black italic text-white uppercase truncate w-full group-hover:text-[#fe9a00] transition-colors">
                          {char?.name || 'Unknown'}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate w-full mt-0.5">
                          {char?.series_title || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {groupedChars.length === 0 && (
              <div className="text-center py-20 text-zinc-500 text-xs font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md rounded-2xl border border-zinc-800">
                No characters found matching your search.
              </div>
            )}

            <div className="mt-16 pt-8 border-t border-zinc-800/50">
              <button
                onClick={onBack}
                className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to App
              </button>
            </div>
          </>
        )}
      </div>

      {/* SLEEK TABBED FIGHTER DOSSIER MODAL (WITH SPACER CLEARANCE FOR AM CONSOLE) */}
      {selectedChar && (
        <div
          className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in px-3 pt-3 pb-24 sm:px-6 sm:pt-6 sm:pb-28"
          onClick={() => setSelectedChar(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[82vh] bg-zinc-950 border border-zinc-800 rounded-3xl relative flex flex-col md:flex-row shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedChar(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-zinc-900/90 border border-zinc-700 rounded-full text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT HERO COLUMN: Portrait, Identity & Actions */}
            <div className="w-full md:w-[38%] bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800/80 p-6 sm:p-7 flex flex-col items-center justify-between relative z-30 shrink-0">
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${getModalBackdropGlow(
                    selectedChar?.role_type,
                    selectedChar?.is_mc
                  )} to-transparent opacity-60`}
                />
              </div>

              <div className="flex flex-col items-center w-full relative z-10">
                {/* Role Pill */}
                <div className="mb-4">
                  {selectedChar?.is_mc ? (
                    <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/50">
                      Main Character
                    </span>
                  ) : (
                    <span
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${
                        selectedChar?.role_type === 'Support'
                          ? 'bg-cyan-950/50 text-cyan-400 border-cyan-500/40'
                          : selectedChar?.role_type === 'Villain'
                          ? 'bg-red-950/50 text-red-400 border-red-500/40'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {selectedChar?.role_type || 'Fighter'}
                    </span>
                  )}
                </div>

                {/* Avatar Portrait */}
                <div
                  className={`relative w-32 h-32 sm:w-44 sm:h-44 rounded-3xl border-2 overflow-hidden mb-4 bg-zinc-900 flex items-center justify-center ${getModalGlowClasses(
                    selectedChar?.role_type,
                    selectedChar?.is_mc
                  )}`}
                >
                  <User className="w-12 h-12 text-zinc-700 absolute z-0" />
                  {selectedChar?.headshot_url && (
                    <img
                      src={selectedChar.headshot_url}
                      alt={selectedChar?.name}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-full object-cover relative z-10"
                    />
                  )}
                </div>

                {/* Name & Series */}
                <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white text-center leading-none mb-1">
                  {selectedChar?.name || 'UNKNOWN'}
                </h2>
                <button
                  onClick={() => {
                    const seriesSlug = selectedChar?.series_slug;
                    setSelectedChar(null);
                    if (seriesSlug) onNavigate({ slug: seriesSlug, action: 'series' });
                  }}
                  className="text-xs font-black uppercase tracking-widest text-[#fe9a00] hover:underline text-center mb-5 cursor-pointer"
                >
                  {selectedChar?.series_title} →
                </button>

                {/* Compact Quick-Stat Strip */}
                <div className="grid grid-cols-3 gap-2 w-full mb-5">
                  <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-2.5 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Affiliation</span>
                    <span className="text-[11px] font-black text-white truncate block mt-0.5">
                      {selectedChar?.element || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-2.5 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Power</span>
                    <span className="text-[11px] font-black text-[#fe9a00] truncate block mt-0.5">
                      {selectedChar?.weapon || 'Standard'}
                    </span>
                  </div>
                  <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-2.5 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Age</span>
                    <span className="text-[11px] font-black text-white truncate block mt-0.5">
                      {selectedChar?.age || '???'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Hype Character + Like + Read Series) */}
              <div className="w-full space-y-2.5 relative z-40">
                <div className="flex gap-2.5 w-full h-12">
                  <div className="flex-1 [&>button]:h-full [&>button]:w-full">
                    <HypeButton
                      targetType="character"
                      targetId={selectedChar?.id}
                      seriesSlug={selectedChar?.series_slug}
                      userId={currentUser?.id}
                      isPremium={Boolean(currentUser?.is_premium)}
                      variant="default"
                      onRequireAuth={() =>
                        setUpsellConfig({ type: 'visitor', message: 'Create a Free Account to hype characters!' })
                      }
                    />
                  </div>
                  <div className="w-12 shrink-0 [&>button]:h-full [&>button]:w-full">
                    <LikeButton
                      targetType="character"
                      targetId={selectedChar?.id}
                      userId={currentUser?.id}
                      variant="default"
                      onRequireAuth={() =>
                        setUpsellConfig({ type: 'visitor', message: 'Create a Free Account to like characters!' })
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const seriesSlug = selectedChar?.series_slug;
                    setSelectedChar(null);
                    if (seriesSlug) onNavigate({ slug: seriesSlug, action: 'series' });
                  }}
                  className="w-full bg-zinc-900 hover:bg-white hover:text-black text-zinc-200 border border-zinc-800 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Read {selectedChar?.series_title}
                </button>
              </div>
            </div>

            {/* RIGHT DOSSIER COLUMN: Sleek Tabbed Views (Combat / Origin / Vital File) */}
            <div className="w-full md:w-[62%] flex flex-col bg-black/95 relative z-10 min-h-[320px] max-h-[46vh] md:max-h-[82vh]">
              {/* Dossier Navigation Tabs */}
              <div className="flex items-center gap-2 px-6 pt-5 pb-3 border-b border-zinc-800/80 shrink-0 pr-14">
                <button
                  onClick={() => setActiveTab('combat')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'combat'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> Combat & Powers
                </button>

                <button
                  onClick={() => setActiveTab('origin')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'origin'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Origin Story
                </button>

                <button
                  onClick={() => setActiveTab('vitals')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'vitals'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> Vital File
                </button>
              </div>

              {/* Scrollable Tab Content Area with Dedicated Bottom Spacer */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-36 space-y-5">
                {/* TAB 1: COMBAT & POWERS */}
                {activeTab === 'combat' && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Powers Section */}
                    <div className="bg-zinc-900/50 border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center">
                          <Swords className="w-3.5 h-3.5 text-[#fe9a00]" />
                        </div>
                        <h4 className="text-xs font-black italic uppercase tracking-wider text-[#fe9a00]">
                          Powers & Abilities
                        </h4>
                      </div>

                      {powerChunks.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic font-bold">No powers recorded in database.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {powerChunks.map((chunk, i) => (
                            <div
                              key={i}
                              className="bg-black/60 border border-zinc-800/80 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed"
                            >
                              {chunk}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Weaknesses Section */}
                    <div className="bg-zinc-900/50 border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <h4 className="text-xs font-black italic uppercase tracking-wider text-red-400">
                          Known Weaknesses & Limits
                        </h4>
                      </div>

                      {weaknessChunks.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic font-bold">No weaknesses recorded in database.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {weaknessChunks.map((chunk, i) => (
                            <div
                              key={i}
                              className="bg-black/60 border border-red-950/40 rounded-xl p-3 text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed"
                            >
                              {chunk}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: ORIGIN STORY */}
                {activeTab === 'origin' && (
                  <div className="bg-zinc-900/50 border border-zinc-800/90 rounded-2xl p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-[#fe9a00]/15 border border-[#fe9a00]/40 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-[#fe9a00]" />
                      </div>
                      <h4 className="text-xs font-black italic uppercase tracking-wider text-[#fe9a00]">
                        Classified Origin File
                      </h4>
                    </div>

                    {originChunks.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic font-bold">
                        Origin story is currently classified. Read {selectedChar?.series_title} to uncover their past!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {originChunks.map((chunk, i) => (
                          <p
                            key={i}
                            className="bg-black/60 border border-zinc-800/80 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed"
                          >
                            {chunk}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: VITAL FILE */}
                {activeTab === 'vitals' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                        Height / Build
                      </span>
                      <span className="text-sm font-black text-white">{selectedChar?.height || 'Classified'}</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                        Heritage / Ethnicity
                      </span>
                      <span className="text-sm font-black text-white">{selectedChar?.ethnicity || 'Classified'}</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                        In-World Location
                      </span>
                      <span className="text-sm font-black text-white flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#fe9a00] shrink-0" />
                        {selectedChar?.location || 'Unknown Realm'}
                      </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                        First Appearance
                      </span>
                      <span className="text-sm font-black text-[#fe9a00]">
                        {selectedChar?.first_appearance || 'Chapter 1'}
                      </span>
                    </div>

                    <div className="sm:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-0.5">
                          Featured Series
                        </span>
                        <span className="text-sm font-black italic uppercase text-white">
                          {selectedChar?.series_title}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const seriesSlug = selectedChar?.series_slug;
                          setSelectedChar(null);
                          if (seriesSlug) onNavigate({ slug: seriesSlug, action: 'series' });
                        }}
                        className="px-4 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer"
                      >
                        Jump to Series
                      </button>
                    </div>
                  </div>
                )}

                {/* Dedicated bottom spacer so the AM Console never covers the last item */}
                <div className="w-full h-32 shrink-0 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};