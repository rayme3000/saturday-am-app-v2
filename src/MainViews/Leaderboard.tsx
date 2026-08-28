import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Flame, Crown, Star, Zap, Activity, TrendingUp, Calendar, Users } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';
import { DecoratedAvatar } from '../Components/DecoratedAvatar';

export default function Leaderboard({ onBack, currentUser, onNavigate }: any) {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'fans'>('monthly');
  const [isLoading, setIsLoading] = useState(true);

  const [superFans, setSuperFans] = useState<any[]>([]);
  const [big3, setBig3] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  
  const [topSeries, setTopSeries] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [topCharacters, setTopCharacters] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);

      try {
        const { data: topFans, error: fansError } = await supabase.rpc('fetch_top_ten_fans');
        if (topFans && !fansError) {
          const formattedTop10 = topFans.map((fan: any, index: number) => {
            let rankClass = 'C-Class Rank';
            if (index < 3) rankClass = 'S-Class Rank';
            else if (index < 6) rankClass = 'A-Class Rank';
            else if (index < 9) rankClass = 'B-Class Rank';
            return { ...fan, class: rankClass, score: Number(fan.score) };
          });
          setSuperFans(formattedTop10);
        }

        if (currentUser) {
          const { data: myRankData } = await supabase.rpc('get_personal_rank', { target_user_id: currentUser.id });
          if (myRankData && myRankData.length > 0) {
            const score = Number(myRankData[0].score);
            const rank = Number(myRankData[0].rank);
            let myClass = 'C-Class Rank';
            if (rank <= 3) myClass = 'S-Class Rank';
            else if (rank <= 10) myClass = 'A-Class Rank';
            else if (rank <= 50) myClass = 'B-Class Rank';
            setUserRank({ rank, score, class: myClass });
          }
        }

        const { data: superHypes } = await supabase.from('super_hypes').select('series_slug');
        if (superHypes && seriesList.length > 0) {
          const hypeCounts: Record<string, number> = {};
          superHypes.forEach((h: any) => { hypeCounts[h.series_slug] = (hypeCounts[h.series_slug] || 0) + 1; });

          const rankedSeries = seriesList
            .map((s: any) => ({ ...s, hypeScore: hypeCounts[s.slug] || 0 }))
            .sort((a: any, b: any) => b.hypeScore - a.hypeScore);

          setBig3(rankedSeries.slice(0, 3));
          setTopSeries(rankedSeries.slice(0, 5));
        }

        const { data: creatorHypesData } = await supabase.from('hypes').select('target_id').eq('target_type', 'creator');
        const { data: allCreatorsData } = await supabase.from('series_creators').select('name, avatar_url, role');
        
        if (creatorHypesData && allCreatorsData) {
            const creatorHypeCounts: Record<string, number> = {};
            creatorHypesData.forEach((h: any) => { creatorHypeCounts[h.target_id] = (creatorHypeCounts[h.target_id] || 0) + 1; });
            const uniqueCreatorsMap = new Map();
            allCreatorsData.forEach((c: any) => { if (!uniqueCreatorsMap.has(c.name)) uniqueCreatorsMap.set(c.name, c); });
            const rankedCreators = Array.from(uniqueCreatorsMap.values())
                .map((c: any) => ({ ...c, hypeScore: creatorHypeCounts[c.name] || 0 }))
                .sort((a, b) => b.hypeScore - a.hypeScore).slice(0, 5);
            setTopCreators(rankedCreators);
        }

        const { data: charHypesData } = await supabase.from('hypes').select('target_id').eq('target_type', 'character');
        const { data: allCharsData } = await supabase.from('series_characters').select('id, name, headshot_url, series_slug');
        
        if (charHypesData && allCharsData) {
            const charHypeCounts: Record<string, number> = {};
            charHypesData.forEach((h: any) => { charHypeCounts[h.target_id] = (charHypeCounts[h.target_id] || 0) + 1; });
            
            const rankedChars = allCharsData
                .map((c: any) => {
                  const sTitle = seriesList.find((s:any) => s.slug === c.series_slug)?.title || 'Unknown Series';
                  return { ...c, series_title: sTitle, hypeScore: charHypeCounts[String(c.id)] || 0 };
                })
                .sort((a: any, b: any) => b.hypeScore - a.hypeScore).slice(0, 5);
            setTopCharacters(rankedChars);
        }

      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [seriesList, currentUser]);

  const handleRouteToSeries = (e: React.MouseEvent, seriesObj: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (seriesObj && onNavigate) onNavigate({ ...seriesObj, action: 'series' });
  };

  const LeaderboardCategory = ({ title, subtitle, items, type = 'series' }: { title: string, subtitle: string, items: any[], type?: 'series' | 'creator' | 'character' }) => (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 mb-6 animate-fade-in">
       <div className="flex justify-between items-end mb-4 border-b border-zinc-800/50 pb-3 px-2">
         <h3 className="text-lg sm:text-xl font-black italic uppercase text-white">{title}</h3>
         <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest">{subtitle}</span>
       </div>
       
       <div className="flex flex-col gap-3">
          {items.length > 0 ? items.map((item: any, index: number) => (
            <div 
              key={index} 
              onClick={(e) => type === 'series' && handleRouteToSeries(e, item)}
              className={`flex items-center gap-4 bg-black/40 p-3 rounded-xl border transition-colors ${type === 'series' ? 'cursor-pointer hover:border-zinc-600 border-zinc-800/50' : 'border-transparent'}`}
            >
               <span className={`text-xl sm:text-2xl font-black italic w-6 sm:w-8 text-center ${index === 0 ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : index === 1 ? 'text-zinc-400' : index === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                  {index + 1}
               </span>
               <div className={`w-12 h-12 sm:w-14 sm:h-14 overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700 shadow-md ${type === 'character' ? 'rounded-full' : 'rounded-lg'}`}>
                  <img src={
                    type === 'creator' ? (item.avatar_url || `https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg`) :
                    type === 'character' ? (item.headshot_url || 'https://via.placeholder.com/150') :
                    (item.thumbnail_url || item.sticker_url || item.cover_url)
                  } className="w-full h-full object-cover" alt="" />
               </div>
               <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-black text-white uppercase text-sm truncate">
                    {type === 'creator' || type === 'character' ? item.name : item.title}
                  </span>
                  {type === 'creator' && item.role && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.role}</span>}
                  {type === 'character' && item.series_title && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.series_title}</span>}
                  {type === 'series' && item.creator_name && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.creator_name}</span>}
               </div>
               <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="text-[11px] font-black text-[#fe9a00] flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 fill-[#fe9a00]"/> {item.hypeScore || 0}</span>
               </div>
            </div>
          )) : (
            <p className="text-zinc-500 text-xs font-bold uppercase text-center py-6">Gathering Data...</p>
          )}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-white relative pb-32">
      <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/95 to-transparent" />
      </div>

      {/* HEADER WITH ANTI-COLLISION PADDING */}
      <div className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg border-b border-zinc-800/50 pt-6 pb-4 px-4 sm:pt-8 sm:px-8 pr-16 sm:pr-24 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-3 bg-zinc-900/90 backdrop-blur-md rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors transform -skew-x-12 shadow-xl">
            <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
          </button>
          
          <div className="flex flex-col items-end drop-shadow-lg pointer-events-none">
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] flex items-center gap-2">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8" /> Leaderboard
            </h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Global Rankings</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
        
        <div className="flex bg-zinc-900/60 backdrop-blur-md p-1 rounded-full mb-10 border border-zinc-800 shadow-xl max-w-lg mx-auto">
          <button onClick={() => setActiveTab('weekly')} className={`flex-1 py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 ${activeTab === 'weekly' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> Weekly Hype
          </button>
          <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 ${activeTab === 'monthly' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> The Big 3
          </button>
          <button onClick={() => setActiveTab('fans')} className={`flex-1 py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 ${activeTab === 'fans' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
            <Users className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> Top Fans
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
             <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest animate-pulse">Calculating Scores...</span>
          </div>
        ) : (
          <>
            {activeTab === 'weekly' && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Weekly Polls</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Resets Every Saturday at 12:00 AM</p>
                </div>
                
                <LeaderboardCategory title="Most Hype Series" items={topSeries} subtitle="Overall Hypes" type="series" />
                <LeaderboardCategory title="Most Hype Characters" items={topCharacters} subtitle="Fan Favorites" type="character" />
                <LeaderboardCategory title="Most Hype Creators" items={topCreators} subtitle="Creator Support" type="creator" />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="animate-fade-in space-y-12">
                <div className="flex flex-col items-center mt-4">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 mb-2 drop-shadow-lg">
                    <Crown className="w-6 h-6 text-yellow-500" /> The Big 3
                  </h2>
                  <p className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest mb-12">Resets Last Saturday of the Month</p>

                  {big3.length === 3 ? (
                    <div className="flex items-end justify-center gap-4 sm:gap-8 w-full px-2 mt-8">
                      {/* Rank 2 */}
                      <button 
                        type="button"
                        className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        onClick={(e) => handleRouteToSeries(e, big3[1])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1"><span className="text-sm">🥈</span> #2</div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform group-hover:rotate-0">
                            <img src={big3[1].sticker_url || big3[1].character_url || big3[1].cover_url} className="w-full h-full object-cover object-top" alt="Rank 2" />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[1].title}</span>
                        </div>
                      </button>

                      {/* Rank 1 */}
                      <button 
                        type="button"
                        className="flex flex-col items-center w-[35%] z-30 hover:-translate-y-4 transition-all group pb-8 cursor-pointer relative bg-transparent border-none p-0 focus:outline-none"
                        onClick={(e) => handleRouteToSeries(e, big3[0])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-xs sm:text-sm font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1 animate-pulse"><Crown className="w-4 h-4 text-yellow-500" /> #1</div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-32 h-32 sm:w-44 sm:h-44 border-[6px] border-yellow-500 shadow-[0_15px_40px_rgba(234,179,8,0.6)] transform transition-transform group-hover:scale-105">
                            <img src={big3[0].sticker_url || big3[0].character_url || big3[0].cover_url} className="w-full h-full object-cover object-top" alt="Rank 1" />
                          </div>
                          <span className="mt-5 text-[10px] sm:text-xs font-black text-[#fe9a00] uppercase tracking-wider text-center line-clamp-2 drop-shadow-md">{big3[0].title}</span>
                        </div>
                      </button>

                      {/* Rank 3 */}
                      <button 
                        type="button"
                        className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        onClick={(e) => handleRouteToSeries(e, big3[2])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1"><span className="text-sm">🥉</span> #3</div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform group-hover:rotate-0">
                            <img src={big3[2].sticker_url || big3[2].character_url || big3[2].cover_url} className="w-full h-full object-cover object-top" alt="Rank 3" />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[2].title}</span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 w-full max-w-lg pointer-events-none mt-8">
                       <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Not enough data to calculate The Big 3 yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fans' && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 pointer-events-none">
                    <Zap className="w-5 h-5 text-[#fe9a00]" /> Top 10 Supporters
                  </h2>
                  <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase pointer-events-none">Resets every 7 Days</span>
                </div>

                <div className="flex flex-col gap-3">
                  {superFans.length > 0 ? superFans.map((fan) => (
                    <div key={fan.id} className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-600 transition-colors pointer-events-none">
                      <div className="w-8 flex justify-center">
                        <span className={`text-2xl font-black italic ${fan.rank <= 3 ? 'text-[#fe9a00] drop-shadow-[0_0_10px_rgba(254,154,0,0.5)]' : 'text-zinc-600'}`}>
                          {fan.rank}
                        </span>
                      </div>
                      <DecoratedAvatar avatarUrl={fan.avatar_url} frameId={fan.frame_id} size="w-12 h-12" iconSize="w-5 h-5" />
                      <div className="flex flex-col flex-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white uppercase tracking-wider truncate text-sm sm:text-base">{fan.username}</span>
                          {fan.is_premium && <span className="text-[7px] bg-purple-900/30 text-purple-400 border border-purple-900 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Pro</span>}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#fe9a00]" /> Fandom Score: {fan.score.toLocaleString()}
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col items-end pl-4 border-l border-zinc-800">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${fan.rank <= 3 ? 'text-yellow-500' : 'text-zinc-500'}`}>{fan.class}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 pointer-events-none">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No supporters found yet. Start supporting to rank up!</p>
                    </div>
                  )}
                </div>

                {currentUser && userRank && (
                  <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#fe9a00]/10 border border-[#fe9a00]/30 rounded-xl p-4 sm:p-6 backdrop-blur-md pointer-events-none">
                    <div className="flex items-center gap-4">
                      <DecoratedAvatar avatarUrl={currentUser.avatar_url} frameId={currentUser.frame_id} size="w-14 h-14" iconSize="w-6 h-6" />
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
            
            {/* BOTTOM THUMB ZONE RETURN */}
            <div className="mt-12 mb-8 border-t border-zinc-800 pt-8">
              <button 
                onClick={onBack}
                className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to App
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}