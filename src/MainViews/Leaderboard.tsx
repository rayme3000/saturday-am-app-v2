import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Flame, Crown, Star, Zap, Activity, TrendingUp, Calendar, Users, MessageSquare, PenTool, BookOpen, Library, User } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';
import { DecoratedAvatar } from '../Components/DecoratedAvatar';
import { FeatureTutorialModal, TutorialHelpButton } from '../Components/FeatureTutorialModal';

const leaderboardTutorialSlides = [
  {
    id: 'leaderboard-1',
    title: 'Global Rankings',
    description: "Boost series and creators by hyping, liking, and commenting! Your interactions earn Fandom Score, helping you climb the Top Fans leaderboard to win exclusive prizes. You can also track what's trending right now in the Weekly Hype, or check out the ultimate monthly rankings in The Big 3.",
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Videos/Leaderboard.mp4'
  }
];

export default function Leaderboard({ onBack, currentUser, onNavigate }: any) {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'fans'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [forceTutorial, setForceTutorial] = useState(false);

  const [superFans, setSuperFans] = useState<any[]>([]);
  const [big3, setBig3] = useState<any[]>([]);
  const [big3Creators, setBig3Creators] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  
  const [topSeries, setTopSeries] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [topCharacters, setTopCharacters] = useState<any[]>([]);
  const [topWeeklyChapters, setTopWeeklyChapters] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);

      try {
        const now = new Date();
        const lastSaturday = new Date(now);
        lastSaturday.setDate(now.getDate() - ((now.getDay() + 1) % 7));
        lastSaturday.setHours(0, 0, 0, 0);

        // --- WEEKLY TOP SUPPORTERS (Bypassing RPC for strict date filtering) ---
        const [
          { data: weeklyHypes },
          { data: weeklySeriesLikes },
          { data: weeklyChapterLikes },
          { data: weeklyComments }
        ] = await Promise.all([
          supabase.from('hypes').select('user_id').gte('created_at', lastSaturday.toISOString()),
          supabase.from('series_likes').select('user_id').gte('created_at', lastSaturday.toISOString()),
          supabase.from('chapter_likes').select('user_id').gte('created_at', lastSaturday.toISOString()),
          supabase.from('series_comments').select('user_id').gte('created_at', lastSaturday.toISOString())
        ]);

        const fanActivityCounts: Record<string, number> = {};
        const countActivity = (arr: any[] | null, points: number) => {
          if (!arr) return;
          arr.forEach(item => {
            if (item.user_id) fanActivityCounts[item.user_id] = (fanActivityCounts[item.user_id] || 0) + points;
          });
        };

        countActivity(weeklyHypes, 1);
        countActivity(weeklySeriesLikes, 1);
        countActivity(weeklyChapterLikes, 1);
        countActivity(weeklyComments, 3); // Comments weighted higher

        const activeUserIds = Object.keys(fanActivityCounts);
        if (activeUserIds.length > 0) {
          const top10Ids = activeUserIds.sort((a, b) => fanActivityCounts[b] - fanActivityCounts[a]).slice(0, 10);
          
          const { data: topProfiles } = await supabase.from('profiles').select('id, username, avatar_url, avatar_frame_id, is_premium').in('id', top10Ids);
          
          if (topProfiles) {
            const formattedTop10 = top10Ids.map((id, index) => {
              const profile = topProfiles.find((p: any) => p.id === id) || { username: 'Unknown Fan' };
              let rankClass = 'C-Class Rank';
              if (index < 3) rankClass = 'S-Class Rank';
              else if (index < 6) rankClass = 'A-Class Rank';
              else if (index < 9) rankClass = 'B-Class Rank';
              
              return { 
                id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                frame_id: profile.avatar_frame_id || profile.frame_id,
                is_premium: profile.is_premium,
                rank: index + 1,
                class: rankClass
              };
            });
            setSuperFans(formattedTop10);
          }
        } else {
          setSuperFans([]);
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
        }

        if (seriesList.length > 0) {
          const weeklyRankedSeries = [...seriesList]
            .map((s: any) => ({ ...s, hypeScore: s.weekly_hype || 0 }))
            .sort((a, b) => b.hypeScore - a.hypeScore);
          setTopSeries(weeklyRankedSeries.slice(0, 5));
        }

        const { data: allCreatorHypes } = await supabase.from('hypes').select('target_id, created_at').eq('target_type', 'creator');
        const { data: allCreatorsData } = await supabase.from('series_creators').select('name, avatar_url, role, series_slug');
        
        if (allCreatorHypes && allCreatorsData) {
            const weeklyCreatorHypes = allCreatorHypes.filter((h: any) => new Date(h.created_at) >= lastSaturday);
            const creatorHypeCounts: Record<string, number> = {};
            weeklyCreatorHypes.forEach((h: any) => { creatorHypeCounts[h.target_id] = (creatorHypeCounts[h.target_id] || 0) + 1; });
            
            const uniqueCreatorsMap = new Map();
            allCreatorsData.forEach((c: any) => { if (!uniqueCreatorsMap.has(c.name)) uniqueCreatorsMap.set(c.name, c); });
            const rankedCreators = Array.from(uniqueCreatorsMap.values())
                .map((c: any) => ({ ...c, hypeScore: creatorHypeCounts[c.name] || 0 }))
                .sort((a, b) => b.hypeScore - a.hypeScore).slice(0, 5);
            setTopCreators(rankedCreators);
        }

        const { data: allCharHypes } = await supabase.from('hypes').select('target_id, created_at').eq('target_type', 'character');
        const { data: allCharsData } = await supabase.from('series_characters').select('id, name, headshot_url, series_slug');
        
        if (allCharHypes && allCharsData) {
            const weeklyCharHypes = allCharHypes.filter((h: any) => new Date(h.created_at) >= lastSaturday);
            const charHypeCounts: Record<string, number> = {};
            weeklyCharHypes.forEach((h: any) => { charHypeCounts[h.target_id] = (charHypeCounts[h.target_id] || 0) + 1; });
            
            const rankedChars = allCharsData
                .map((c: any) => {
                  const sTitle = seriesList.find((s:any) => s.slug === c.series_slug)?.title || 'Unknown Series';
                  return { ...c, series_title: sTitle, hypeScore: charHypeCounts[String(c.id)] || 0 };
                })
                .sort((a: any, b: any) => b.hypeScore - a.hypeScore).slice(0, 5);
            setTopCharacters(rankedChars);
        }

        // --- WEEKLY TOP CHAPTERS (Bypassing RPC for strict date filtering) ---
        const [chapterHypesRes, chapterLikesRes] = await Promise.all([
          supabase.from('hypes').select('target_id').eq('target_type', 'chapter').gte('created_at', lastSaturday.toISOString()),
          supabase.from('chapter_likes').select('chapter_id').gte('created_at', lastSaturday.toISOString())
        ]);

        const chapterInteractionCounts: Record<string, number> = {};
        
        if (chapterHypesRes.data) {
          chapterHypesRes.data.forEach((h: any) => { 
            chapterInteractionCounts[h.target_id] = (chapterInteractionCounts[h.target_id] || 0) + 1; 
          });
        }
        if (chapterLikesRes.data) {
          chapterLikesRes.data.forEach((l: any) => { 
            chapterInteractionCounts[l.chapter_id] = (chapterInteractionCounts[l.chapter_id] || 0) + 1; 
          });
        }

        const trendingChapIds = Object.keys(chapterInteractionCounts);
        
        if (trendingChapIds.length > 0) {
          const { data: chapsData } = await supabase
            .from('chapters')
            .select('id, title, chapter_number, series_slug, thumbnail_url')
            .in('id', trendingChapIds);
            
          if (chapsData) {
            const rankedChaps = chapsData.map((c: any) => {
              const sData = seriesList.find((s:any) => s.slug === c.series_slug);
              return { 
                ...c, 
                series_title: sData?.title || 'Unknown Series', 
                cover_url: sData?.cover_url,
                hypeScore: chapterInteractionCounts[c.id] || 0 
              };
            }).sort((a: any, b: any) => b.hypeScore - a.hypeScore);
            
            setTopWeeklyChapters(rankedChaps.slice(0, 3));
          }
        } else {
          setTopWeeklyChapters([]);
        }

        if (allCreatorsData) {
          const combinedCreatorScores: Record<string, number> = {};
          
          if (allCreatorHypes) {
            allCreatorHypes.forEach((h: any) => {
              combinedCreatorScores[h.target_id] = (combinedCreatorScores[h.target_id] || 0) + 1;
            });
          }

          const seriesToCreatorMap: Record<string, string> = {};
          seriesList.forEach((s: any) => { if (s.creator_name) seriesToCreatorMap[s.slug] = s.creator_name; });
          allCreatorsData.forEach((c: any) => { if (c.series_slug && c.name) seriesToCreatorMap[c.series_slug] = c.name; });

          if (superHypes) {
            superHypes.forEach((h: any) => {
              const creatorName = seriesToCreatorMap[h.series_slug];
              if (creatorName) {
                combinedCreatorScores[creatorName] = (combinedCreatorScores[creatorName] || 0) + 1;
              }
            });
          }

          const uniqueCreatorMap = new Map();
          allCreatorsData.forEach((c: any) => { if (!uniqueCreatorMap.has(c.name)) uniqueCreatorMap.set(c.name, c); });
          
          const rankedBig3Creators = Array.from(uniqueCreatorMap.values())
            .map((c: any) => ({ ...c, hypeScore: combinedCreatorScores[c.name] || 0 }))
            .sort((a, b) => b.hypeScore - a.hypeScore);
            
          setBig3Creators(rankedBig3Creators.slice(0, 3));
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

  const LeaderboardCategory = ({ title, subtitle, items, type = 'series' }: { title: string, subtitle: string, items: any[], type?: 'series' | 'creator' | 'character' | 'chapter' }) => (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 mb-6 animate-fade-in">
       <div className="flex justify-between items-end mb-4 border-b border-zinc-800/50 pb-3 px-2">
         <h3 className="text-lg sm:text-xl font-black italic uppercase text-white flex items-center gap-2">
           {type === 'chapter' && <BookOpen className="w-5 h-5 text-[#fe9a00]" />}
           {type === 'series' && <Library className="w-5 h-5 text-[#fe9a00]" />}
           {type === 'character' && <User className="w-5 h-5 text-[#fe9a00]" />}
           {type === 'creator' && <PenTool className="w-5 h-5 text-[#fe9a00]" />}
           {title}
         </h3>
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
                    (item.thumbnail_url || item.sticker_url || item.cover_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg')
                  } className="w-full h-full object-cover" alt="" />
               </div>
               <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-black text-white uppercase text-sm truncate">
                    {type === 'creator' || type === 'character' ? item.name : 
                     type === 'chapter' ? `Ch. ${item.chapter_number} - ${item.title}` : item.title}
                  </span>
                  {type === 'creator' && item.role && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.role}</span>}
                  {type === 'character' && item.series_title && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.series_title}</span>}
                  {type === 'series' && item.creator_name && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.creator_name}</span>}
                  {type === 'chapter' && item.series_title && <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.series_title}</span>}
               </div>
               <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="text-[11px] font-black text-[#fe9a00] flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 fill-[#fe9a00]"/> {item.hypeScore || 0}</span>
               </div>
            </div>
          )) : (
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest text-center py-8">
              {activeTab === 'weekly' ? 'No hypes yet this week. Be the first!' : 'Not enough rankings data yet.'}
            </p>
          )}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-white relative pb-32">
      
      <FeatureTutorialModal 
        tutorialId="leaderboards_guide" 
        slides={leaderboardTutorialSlides} 
        forceOpen={forceTutorial}
        onClose={() => setForceTutorial(false)}
      />

      <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/95 to-transparent" />
      </div>

      <div className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg border-b border-zinc-800/50 pt-6 pb-4 px-4 sm:pt-8 sm:px-8 pr-24 sm:pr-32 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={onBack} className="p-3 bg-zinc-900/90 backdrop-blur-md rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors transform -skew-x-12 shadow-xl shrink-0">
              <div className="transform skew-x-12 flex items-center gap-2"><ArrowLeft className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Home</span></div>
            </button>
            <div className="pointer-events-auto shrink-0">
              <TutorialHelpButton onClick={(e: any) => { e.stopPropagation(); setForceTutorial(true); }} />
            </div>
          </div>
          
          <div className="flex flex-col items-end drop-shadow-lg pointer-events-none mr-12 sm:mr-16 md:mr-0">
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
                
                <LeaderboardCategory title="Most Hype Chapters" items={topWeeklyChapters} subtitle="Chapter Engagement" type="chapter" />
                <LeaderboardCategory title="Most Hype Series" items={topSeries} subtitle="Overall Hypes" type="series" />
                <LeaderboardCategory title="Most Hype Characters" items={topCharacters} subtitle="Fan Favorites" type="character" />
                <LeaderboardCategory title="Most Hype Creators" items={topCreators} subtitle="Creator Support" type="creator" />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="animate-fade-in space-y-12 pb-12">
                <div className="flex flex-col items-center mt-4">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 mb-2 drop-shadow-lg">
                    <Crown className="w-6 h-6 text-yellow-500" /> The Big 3 Series
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
                          <div className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Star className="w-4 h-4 text-zinc-400" /> #2</div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform group-hover:rotate-0">
                            <img src={big3[1].sticker_url || big3[1].character_url || big3[1].cover_url} className="w-full h-full object-cover object-top" alt="Rank 2" />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[1].title}</span>
                          <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest mt-1"><Flame className="w-3 h-3 inline pb-0.5"/> {big3[1].hypeScore}</span>
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
                          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mt-1"><Flame className="w-3.5 h-3.5 inline pb-0.5"/> {big3[0].hypeScore}</span>
                        </div>
                      </button>

                      {/* Rank 3 */}
                      <button 
                        type="button"
                        className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        onClick={(e) => handleRouteToSeries(e, big3[2])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Star className="w-4 h-4 text-amber-600" /> #3</div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform group-hover:rotate-0">
                            <img src={big3[2].sticker_url || big3[2].character_url || big3[2].cover_url} className="w-full h-full object-cover object-top" alt="Rank 3" />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3[2].title}</span>
                          <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest mt-1"><Flame className="w-3 h-3 inline pb-0.5"/> {big3[2].hypeScore}</span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 w-full max-w-lg pointer-events-none mt-8">
                       <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Not enough data to calculate The Big 3 yet.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center mt-16 pt-16 border-t border-zinc-800/50">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 mb-2 drop-shadow-lg">
                    <PenTool className="w-6 h-6 text-yellow-500" /> The Big 3 Creators
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-12 text-center max-w-sm">
                    Combined Score of Creator Hypes + Monthly Series Hypes
                  </p>

                  {big3Creators.length === 3 ? (
                    <div className="flex items-end justify-center gap-4 sm:gap-8 w-full px-2 mt-8 pointer-events-none">
                      {/* Rank 2 */}
                      <div className="flex flex-col items-center w-[30%] opacity-90 transition-all group">
                        <div className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Star className="w-4 h-4 text-zinc-400" /> #2</div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform">
                          <img src={big3Creators[1].avatar_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'} className="w-full h-full object-cover object-top" alt="Rank 2" />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3Creators[1].name}</span>
                        <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest mt-1"><Flame className="w-3 h-3 inline pb-0.5"/> {big3Creators[1].hypeScore}</span>
                      </div>

                      {/* Rank 1 */}
                      <div className="flex flex-col items-center w-[35%] z-30 transition-all group pb-8 relative">
                        <div className="text-xs sm:text-sm font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1 animate-pulse"><Crown className="w-4 h-4 text-yellow-500" /> #1</div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-32 h-32 sm:w-44 sm:h-44 border-[6px] border-yellow-500 shadow-[0_15px_40px_rgba(234,179,8,0.6)] transform transition-transform">
                          <img src={big3Creators[0].avatar_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'} className="w-full h-full object-cover object-top" alt="Rank 1" />
                        </div>
                        <span className="mt-5 text-[10px] sm:text-xs font-black text-[#fe9a00] uppercase tracking-wider text-center line-clamp-2 drop-shadow-md">{big3Creators[0].name}</span>
                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mt-1"><Flame className="w-3.5 h-3.5 inline pb-0.5"/> {big3Creators[0].hypeScore}</span>
                      </div>

                      {/* Rank 3 */}
                      <div className="flex flex-col items-center w-[30%] opacity-90 transition-all group">
                        <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Star className="w-4 h-4 text-amber-600" /> #3</div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform">
                          <img src={big3Creators[2].avatar_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'} className="w-full h-full object-cover object-top" alt="Rank 3" />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">{big3Creators[2].name}</span>
                        <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest mt-1"><Flame className="w-3 h-3 inline pb-0.5"/> {big3Creators[2].hypeScore}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 w-full max-w-lg pointer-events-none mt-8">
                       <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Not enough data to calculate The Big 3 Creators yet.</p>
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
                          <Activity className="w-3 h-3 text-[#fe9a00]" /> Active Supporter
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col items-end pl-4 border-l border-zinc-800">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${fan.rank <= 3 ? 'text-yellow-500' : 'text-zinc-500'}`}>{fan.class}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 pointer-events-none">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No supporters found yet this week. Start supporting to rank up!</p>
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
                  </div>
                )}
              </div>
            )}
            
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