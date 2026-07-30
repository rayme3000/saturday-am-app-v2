import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Flame, Crown, Medal, Star, Zap, Activity } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';

export default function Leaderboard({ onBack, currentUser }: any) {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'fans' | 'series'>('fans');
  const [isLoading, setIsLoading] = useState(true);

  // --- REAL DATA STATES ---
  const [superFans, setSuperFans] = useState<any[]>([]);
  const [big3, setBig3] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);

      try {
        // 1. FETCH REAL SUPER FANS
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_premium, total_hypes, super_hypes, quick_reacts, chapters_read');

        if (profiles) {
          // The Hidden Algorithm (Calculates score on the fly)
          const rankedFans = profiles
            .map((p) => {
              const score = 
                (p.total_hypes || 0) * 1 + 
                (p.quick_reacts || 0) * 5 + 
                (p.chapters_read || 0) * 5 + 
                (p.super_hypes || 0) * 10 + 
                (p.is_premium ? 20 : 0); // Bonus for being a subscriber
              return { ...p, score };
            })
            .filter((p) => p.score > 0) // Filters out visitors and inactive accounts
            .sort((a, b) => b.score - a.score);

          // Assign Ranks and Classes to the Top 10
          const top10 = rankedFans.slice(0, 10).map((fan, index) => {
            let rankClass = 'C-Class Rank';
            if (index < 3) rankClass = 'S-Class Rank';
            else if (index < 6) rankClass = 'A-Class Rank';
            else if (index < 9) rankClass = 'B-Class Rank';
            
            return { ...fan, rank: index + 1, class: rankClass };
          });

          setSuperFans(top10);

          // Find current logged-in user's rank
          if (currentUser) {
            const myIndex = rankedFans.findIndex(f => f.id === currentUser.id);
            if (myIndex !== -1) {
              const myData = rankedFans[myIndex];
              let myClass = 'C-Class Rank';
              if (myIndex < 3) myClass = 'S-Class Rank';
              else if (myIndex < 10) myClass = 'A-Class Rank';
              else if (myIndex < 50) myClass = 'B-Class Rank';
              
              setUserRank({ rank: myIndex + 1, score: myData.score, class: myClass });
            }
          }
        }

        // 2. FETCH REAL BIG 3 SERIES 
        // (Counts actual super_hypes in the database and maps them to your series)
        const { data: hypes } = await supabase.from('super_hypes').select('series_slug');
        
        if (hypes && seriesList.length > 0) {
          const hypeCounts: Record<string, number> = {};
          hypes.forEach((h: any) => {
            hypeCounts[h.series_slug] = (hypeCounts[h.series_slug] || 0) + 1;
          });

          const rankedSeries = seriesList
            .map((s: any) => ({
              ...s,
              hypeScore: hypeCounts[s.slug] || 0
            }))
            .sort((a: any, b: any) => b.hypeScore - a.hypeScore)
            .slice(0, 3); // Get Top 3

          setBig3(rankedSeries);
        }

      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [seriesList, currentUser]);

  return (
    <div className="min-h-screen bg-transparent text-white relative pb-32">
      
      {/* FIXED PARALLAX BACKGROUND */}
      <div className="fixed inset-0 z-[-1] bg-black">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />
      </div>

      {/* HEADER NAV - FIXED OVERLAP ISSUE */}
      <div className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg border-b border-zinc-800/50 pt-6 pb-4 px-6 sm:pt-8 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-3 bg-zinc-900/90 backdrop-blur-md rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors transform -skew-x-12 shadow-xl">
            <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
          </button>
          <div className="flex flex-col items-end drop-shadow-lg">
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] flex items-center gap-2">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8" /> Leaderboard
            </h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Global Rankings</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4">

        {/* CUSTOM TOGGLE TABS */}
        <div className="flex bg-zinc-900/60 backdrop-blur-md p-1 rounded-full mb-8 border border-zinc-800 shadow-xl max-w-sm mx-auto">
          <button onClick={() => setActiveTab('fans')} className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'fans' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>AM Super Fans</button>
          <button onClick={() => setActiveTab('series')} className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'series' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Top Series</button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
             <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest animate-pulse">Calculating Scores...</span>
          </div>
        ) : (
          <>
            {activeTab === 'series' && (
              <div className="animate-fade-in space-y-12">
                
                {/* NEW STICKER PODIUM LAYOUT FOR THE BIG 3 */}
                <div className="flex flex-col items-center mt-8">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 mb-12 drop-shadow-lg">
                    <Crown className="w-6 h-6 text-yellow-500" /> The Big 3
                  </h2>

                  {big3.length === 3 ? (
                    <div className="flex items-end justify-center gap-4 sm:gap-8 w-full px-2">
                      
                      {/* RANK 2 */}
                      <div className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group">
                        <div className="text-[10px] sm:text-xs font-black text-zinc-300 uppercase tracking-widest mb-3 flex items-center gap-1"><Medal className="w-3 h-3 text-zinc-300" /> #2</div>
                        <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-20 h-20 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform group-hover:rotate-0">
                          <img src={big3[1].sticker_url || big3[1].character_url || big3[1].cover_url} className="w-full h-full object-cover object-top" alt="Rank 2" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 mix-blend-overlay pointer-events-none" />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[1].title}</span>
                      </div>

                      {/* RANK 1 */}
                      <div className="flex flex-col items-center w-[35%] z-10 hover:-translate-y-4 transition-all group pb-8">
                        <div className="text-xs sm:text-sm font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1 animate-pulse"><Crown className="w-4 h-4 text-yellow-500" /> #1</div>
                        <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-28 h-28 sm:w-40 sm:h-40 border-[6px] border-yellow-500 shadow-[0_15px_40px_rgba(234,179,8,0.6)] transform transition-transform group-hover:scale-105">
                          <img src={big3[0].sticker_url || big3[0].character_url || big3[0].cover_url} className="w-full h-full object-cover object-top" alt="Rank 1" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 mix-blend-overlay pointer-events-none" />
                        </div>
                        <span className="mt-5 text-[10px] sm:text-xs font-black text-[#fe9a00] uppercase tracking-wider text-center line-clamp-2 drop-shadow-md">{big3[0].title}</span>
                      </div>

                      {/* RANK 3 */}
                      <div className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group">
                        <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Medal className="w-3 h-3 text-amber-700" /> #3</div>
                        <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-20 h-20 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform group-hover:rotate-0">
                          <img src={big3[2].sticker_url || big3[2].character_url || big3[2].cover_url} className="w-full h-full object-cover object-top" alt="Rank 3" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 mix-blend-overlay pointer-events-none" />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[2].title}</span>
                      </div>

                    </div>
                  ) : (
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Not enough data to calculate The Big 3 yet.</p>
                  )}
                </div>

                {/* STORY OF THE WEEK - FIXED FILTER OPACITY */}
                <div className="mt-16 pt-12 border-t border-zinc-800">
                  <div className="relative w-full rounded-3xl overflow-hidden border border-zinc-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
                    <img 
                      src={big3[0]?.cover_url || "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/apple-black-cover.jpg"} 
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700" 
                      alt="Story of the Week" 
                    />
                    {/* Replaced heavy filter with a targeted left-side fade */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
                    
                    <div className="relative z-10 p-6 sm:p-10 flex flex-col justify-center h-full">
                      <div className="flex items-center gap-2 bg-[#fe9a00]/20 w-max px-3 py-1.5 rounded-full border border-[#fe9a00]/50 mb-4 backdrop-blur-md shadow-lg">
                        <Flame className="w-4 h-4 text-[#fe9a00]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">Manga of the Week</span>
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-md leading-none mb-1">{big3[0]?.title || "Apple Black"}</h2>
                      <h3 className="text-lg sm:text-xl font-bold text-zinc-300 drop-shadow-md mb-6">Latest Update</h3>
                      
                      <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-widest max-w-sm leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                        This series generated the highest volume of unique readers and super hypes this week!
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'fans' && (
              <div className="animate-fade-in">
                
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#fe9a00]" /> Top 10 Super Fans
                  </h2>
                  <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">Rankings refresh instantly</span>
                </div>

                <div className="flex flex-col gap-3">
                  {superFans.length > 0 ? superFans.map((fan) => (
                    <div key={fan.id} className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-600 transition-colors">
                      
                      <div className="w-8 flex justify-center">
                        <span className={`text-2xl font-black italic ${fan.rank <= 3 ? 'text-[#fe9a00] drop-shadow-[0_0_10px_rgba(254,154,0,0.5)]' : 'text-zinc-600'}`}>
                          {fan.rank}
                        </span>
                      </div>

                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-700 flex-shrink-0 bg-black">
                        {fan.avatar_url ? (
                           <img src={fan.avatar_url} alt={fan.username} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-zinc-600"><Star className="w-5 h-5"/></div>
                        )}
                      </div>

                      <div className="flex flex-col flex-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white uppercase tracking-wider truncate text-sm sm:text-base">{fan.username}</span>
                          {fan.is_premium && <span className="text-[7px] bg-purple-900/30 text-purple-400 border border-purple-900 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Pro</span>}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#fe9a00]" /> Score: {fan.score.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-end pl-4 border-l border-zinc-800">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${fan.rank <= 3 ? 'text-yellow-500' : 'text-zinc-500'}`}>{fan.class}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No super fans found yet. Start reading to rank up!</p>
                    </div>
                  )}
                </div>

                {/* Current User Personal Rank Hook */}
                {currentUser && userRank && (
                  <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#fe9a00]/10 border border-[#fe9a00]/30 rounded-xl p-4 sm:p-6 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.4)]">
                        <img src={currentUser.avatar_url || 'https://i.pravatar.cc/150?u=99'} alt="You" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">Your Global Rank</span>
                        <span className="text-xl font-black italic uppercase text-white tracking-wider">#{userRank.rank}</span>
                      </div>
                    </div>
                    <div className="text-center sm:text-right flex flex-col items-center sm:items-end w-full sm:w-auto">
                       <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Total Fandom Score</span>
                       <span className="text-sm font-black text-zinc-200 uppercase tracking-widest flex items-center justify-center sm:justify-end gap-1 w-full"><Activity className="w-3 h-3 text-zinc-400"/> {userRank.score.toLocaleString()} Points</span>
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}