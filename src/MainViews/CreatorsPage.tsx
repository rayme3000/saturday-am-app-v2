import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { HypeButton } from '../Components/HypeButton';
import { Search, Heart, PenTool, X, Loader2, CheckCircle2, BookOpen, ArrowUpDown } from 'lucide-react';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

interface CreatorProfile {
  name: string;
  role: string;
  bio: string;
  avatar_url: string;
  flag_codes: string[];
  twitter_url?: string;
  instagram_url?: string;
  support_url?: string;
  works: any[];
}

export const CreatorsPage = ({ currentUser, onNavigate, onLoginClick }: any) => {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'works-desc' | 'role-asc'>('name-asc');

  // Donation State
  const [donationCreator, setDonationCreator] = useState<CreatorProfile | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [fanmailText, setFanmailText] = useState('');
  const [donationStep, setDonationStep] = useState<'input' | 'processing' | 'success'>('input');
  const [expandedBios, setExpandedBios] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const [{ data: seriesData }, { data: creatorRows }] = await Promise.all([
          supabase.from('series').select('*').eq('is_hidden', false),
          supabase.from('series_creators').select('*').order('id', { ascending: true })
        ]);

        const seriesMap = new Map<string, any>();
        (seriesData || []).forEach(s => seriesMap.set(s.slug, s));

        // Identify creators explicitly marked hidden in Command Center
        const hiddenCreatorNames = new Set<string>();
        (creatorRows || []).forEach((row: any) => {
          if (row.is_visible === false && row.name) {
            hiddenCreatorNames.add(row.name.trim().toLowerCase());
          }
        });

        const creatorMap = new Map<string, CreatorProfile>();

        // 1. Group credits from series_creators
        (creatorRows || []).forEach((row: any) => {
          if (!row.name) return;
          const key = row.name.trim().toLowerCase();
          if (hiddenCreatorNames.has(key)) return;

          const matchedSeries = seriesMap.get(row.series_slug);

          if (!creatorMap.has(key)) {
            const rawFlags = (row.flag_code || matchedSeries?.flag_code || '')
              .split(',')
              .map((f: string) => f.trim())
              .filter(Boolean);

            creatorMap.set(key, {
              name: row.name.trim(),
              role: row.role || 'Creator',
              bio: row.bio || matchedSeries?.creator_bio || '',
              avatar_url: row.avatar_url || matchedSeries?.creator_avatar || '',
              flag_codes: Array.from(new Set(rawFlags)),
              twitter_url: row.twitter_url || matchedSeries?.creator_twitter || '',
              instagram_url: row.instagram_url || matchedSeries?.creator_instagram || '',
              support_url: row.support_url || matchedSeries?.creator_support_link || '',
              works: matchedSeries ? [matchedSeries] : []
            });
          } else {
            const existing = creatorMap.get(key)!;
            if (matchedSeries && !existing.works.some(w => w.slug === matchedSeries.slug)) {
              existing.works.push(matchedSeries);
            }
            if (!existing.bio && row.bio) existing.bio = row.bio;
            if (!existing.avatar_url && row.avatar_url) existing.avatar_url = row.avatar_url;
            if (!existing.twitter_url && row.twitter_url) existing.twitter_url = row.twitter_url;
            if (!existing.instagram_url && row.instagram_url) existing.instagram_url = row.instagram_url;
          }
        });

        // 2. Add primary creators from series that didn't have entries in series_creators
        (seriesData || []).forEach((s: any) => {
          if (!s.creator_name) return;
          const key = s.creator_name.trim().toLowerCase();
          if (hiddenCreatorNames.has(key) || creatorMap.has(key)) return;

          const rawFlags = (s.flag_code || '').split(',').map((f: string) => f.trim()).filter(Boolean);
          creatorMap.set(key, {
            name: s.creator_name.trim(),
            role: 'Creator',
            bio: s.creator_bio || '',
            avatar_url: s.creator_avatar || '',
            flag_codes: rawFlags,
            twitter_url: s.creator_twitter || '',
            instagram_url: s.creator_instagram || '',
            support_url: s.creator_support_link || '',
            works: [s]
          });
        });

        setCreators(Array.from(creatorMap.values()));
      } catch (err) {
        console.error("Failed to load creators:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  const processedCreators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = creators.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.works.some(w => w.title?.toLowerCase().includes(q))
    );

    return result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'works-desc') return b.works.length - a.works.length;
      if (sortBy === 'role-asc') return (a.role || '').localeCompare(b.role || '');
      return 0;
    });
  }, [creators, searchQuery, sortBy]);

  const handleProcessDonation = () => {
    if (!currentUser?.id) {
      if (onLoginClick) onLoginClick();
      setDonationCreator(null);
      return;
    }

    setDonationStep('processing');
    setTimeout(async () => {
      try {
        const points = donationAmount * 100;
        const { data: profile } = await supabase.from('profiles').select('total_hypes').eq('id', currentUser.id).single();
        if (profile) {
          await supabase.from('profiles').update({ total_hypes: (profile.total_hypes || 0) + points }).eq('id', currentUser.id);
          window.dispatchEvent(new Event('profileUpdated'));
        }
      } catch (e) {
        console.error("Donation simulation error:", e);
      }
      setDonationStep('success');
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-32 pt-6 px-4 max-w-5xl mx-auto">
      
      {/* Sticky Header with Title, Search, and Sort */}
      <div className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl pb-4 pt-2 mb-6 border-b border-zinc-800 rounded-b-2xl px-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 pr-16 sm:pr-20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PenTool className="w-4 h-4 text-[#fe9a00]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">Spotlight</span>
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              Creators Roster
            </h1>
          </div>
          <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">
            {processedCreators.length} Visionaries
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by creator name or manga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#fe9a00] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded-xl">
            <ArrowUpDown className="w-4 h-4 text-[#fe9a00] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort creators"
              className="bg-transparent text-white text-xs font-black uppercase tracking-wider py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="name-asc" className="bg-zinc-950 text-white">Name: A-Z</option>
              <option value="name-desc" className="bg-zinc-950 text-white">Name: Z-A</option>
              <option value="works-desc" className="bg-zinc-950 text-white">Most Titles</option>
              <option value="role-asc" className="bg-zinc-950 text-white">Role</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sleek Creator Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-[#fe9a00] animate-spin" />
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Loading Talent...</p>
        </div>
      ) : processedCreators.length === 0 ? (
        <div className="text-center text-zinc-500 py-16 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-2xl bg-black/40">
          No creators found matching "{searchQuery}".
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {processedCreators.map((creator) => {
            const isBioExpanded = !!expandedBios[creator.name];
            const bioText = creator.bio || 'Official creator for Saturday AM titles.';

            return (
              <div 
                key={creator.name}
                className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-lg hover:border-zinc-700 transition-all backdrop-blur-sm"
              >
                {/* Left Section: Avatar & Creator Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0 md:max-w-[420px] lg:max-w-[460px]">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#fe9a00] overflow-hidden flex-shrink-0 bg-zinc-900 shadow-[0_0_12px_rgba(254,154,0,0.25)]">
                    <img
                      src={creator.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`; }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white truncate">
                        {creator.name}
                      </h2>
                      {creator.flag_codes.map((flag) => (
                        <img
                          key={flag}
                          src={`https://flagcdn.com/${flag.toLowerCase()}.svg`}
                          alt={flag}
                          className="w-4 h-2.5 rounded-[1px] opacity-90 inline-block shadow-sm"
                        />
                      ))}
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] bg-[#fe9a00]/10 px-2 py-0.5 rounded-full border border-[#fe9a00]/20 ml-1">
                        {creator.role}
                      </span>
                    </div>

                    {/* Bio Snippet: Allows 2 to 3 lines without crowding */}
                    <p className={`text-xs text-zinc-400 mt-1.5 leading-relaxed font-medium ${!isBioExpanded ? 'line-clamp-2 sm:line-clamp-3' : ''}`}>
                      {bioText}
                    </p>
                    {bioText.length > 160 && (
                      <button
                        onClick={() => setExpandedBios(prev => ({ ...prev, [creator.name]: !isBioExpanded }))}
                        className="text-[#fe9a00] text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors mt-0.5"
                      >
                        {isBioExpanded ? '- Less' : '+ Bio'}
                      </button>
                    )}

                    {/* Socials */}
                    <div className="flex items-center gap-3 mt-2">
                      {creator.twitter_url && (
                        <a
                          href={creator.twitter_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#fe9a00] transition-colors"
                        >
                          Twitter
                        </a>
                      )}
                      {creator.instagram_url && (
                        <a
                          href={creator.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#fe9a00] transition-colors"
                        >
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center / Right Section: Expanded Works Strip (Fits up to 5-6 covers seamlessly) */}
                {creator.works.length > 0 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 shrink-0 max-w-full md:max-w-[340px] lg:max-w-[460px]">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 hidden xl:block shrink-0">
                      Works
                    </span>
                    {creator.works.map((work) => (
                      <div
                        key={work.slug || work.id}
                        onClick={() => onNavigate(work)}
                        className="w-12 h-16 sm:w-14 sm:h-20 relative rounded-md overflow-hidden border border-zinc-800 hover:border-[#fe9a00] transition-all cursor-pointer group/work shadow-md flex-shrink-0"
                        title={work.title}
                      >
                        <img
                          src={work.character_url || work.cover_url}
                          alt={work.title}
                          className="w-full h-full object-cover group-hover/work:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        {work.logo_url && (
                          <img
                            src={work.logo_url}
                            alt={work.title}
                            className="absolute bottom-1 inset-x-0.5 max-h-5 object-contain mx-auto"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Right Action Buttons: Stacked on Desktop without overlap */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 w-full md:w-28 border-t md:border-t-0 border-zinc-800/80 pt-3 md:pt-0">
                  <div className="flex-1 md:flex-initial w-full [&_button]:w-full [&_button]:justify-center [&_button]:py-2 [&_button]:text-[10px]">
                    <HypeButton
                      targetType="creator"
                      targetId={creator.name}
                      userId={currentUser?.id}
                      variant="default"
                      onRequireAuth={() => onLoginClick && onLoginClick()}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setDonationCreator(creator);
                      setDonationStep('input');
                      setDonationAmount(5);
                      setFanmailText('');
                    }}
                    className="flex-1 md:flex-initial w-full py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-full transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(254,154,0,0.25)] hover:scale-105"
                  >
                    <Heart className="w-3.5 h-3.5 fill-black" />
                    <span>Support</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Donation / Fanmail Modal */}
      {donationCreator && (
        <div className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => { if (donationStep === 'input') setDonationCreator(null); }}>
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
            {donationStep === 'input' && (
              <>
                <button onClick={() => setDonationCreator(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20">
                  <X className="w-6 h-6" />
                </button>
                <div className="p-6 sm:p-8 animate-fade-in">
                  <div className="flex flex-col items-center mb-6 text-center mt-2">
                    <img 
                      src={donationCreator.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#fe9a00] mb-3 shadow-[0_0_15px_rgba(254,154,0,0.3)]" 
                      alt={donationCreator.name} 
                    />
                    <h3 className="text-xl font-black italic uppercase text-white leading-tight">Support {donationCreator.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Send a direct tip & private fanmail</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {[5, 10, 15, 20].map((amount) => (
                      <button 
                        key={amount}
                        onClick={() => setDonationAmount(amount)}
                        className={`py-3 rounded-xl font-black text-sm sm:text-base border-2 transition-all ${donationAmount === amount ? 'bg-[#fe9a00]/10 border-[#fe9a00] text-[#fe9a00]' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <div className="relative mb-6">
                    <textarea 
                      value={fanmailText}
                      onChange={(e) => setFanmailText(e.target.value)}
                      placeholder="Write private fanmail to the creator..."
                      maxLength={250}
                      className="w-full bg-black border border-zinc-800 text-white text-xs px-4 py-3 pb-8 rounded-xl focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-24 font-medium"
                    />
                    <span className="absolute bottom-3 right-3 text-[9px] font-black uppercase tracking-widest text-zinc-600">{fanmailText.length}/250</span>
                  </div>

                  <button 
                    onClick={handleProcessDonation}
                    className="w-full py-4 bg-[#fe9a00] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.3)]"
                  >
                    Donate ${donationAmount}
                  </button>
                </div>
              </>
            )}

            {donationStep === 'processing' && (
              <div className="py-16 flex flex-col items-center justify-center animate-fade-in text-center">
                <Loader2 className="w-12 h-12 text-[#fe9a00] animate-spin mb-4" />
                <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Processing Tip</h3>
                <p className="text-xs text-zinc-400 font-bold">Contacting payment gateway...</p>
              </div>
            )}

            {donationStep === 'success' && (
              <div className="py-12 px-6 flex flex-col items-center justify-center animate-fade-in text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Thank You!</h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-bold mb-8 leading-relaxed max-w-xs">
                  Your ${donationAmount} tip and fanmail have been delivered to {donationCreator.name}. <span className="text-[#fe9a00]">Your Fandom Score has been boosted!</span>
                </p>
                <button 
                  onClick={() => { setDonationCreator(null); setDonationStep('input'); }}
                  className="w-full py-4 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Back to Creators
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};