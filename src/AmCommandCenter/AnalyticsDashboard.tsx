import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Crown, BookOpen, RefreshCw, TrendingUp, Calendar, Clock, UserCheck, ArrowUp, ArrowDown, ShoppingCart, MousePointerClick, Globe, AlertTriangle, Flame, MessageSquare, Eye, Filter, Award } from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

const calculateTrend = (current: number, past: number) => {
  if (past === 0) {
    if (current === 0) return { pct: 0, isPositive: true, isNeutral: true };
    return { pct: 100, isPositive: true, isNeutral: false };
  }
  const change = ((current - past) / past) * 100;
  return {
    pct: Math.abs(change).toFixed(1),
    isPositive: change > 0,
    isNeutral: change === 0
  };
};

const TrendBadge = ({ current, past }: { current: number, past: number }) => {
  const trend = calculateTrend(current, past);
  if (trend.isNeutral) return <span className="text-[9px] text-zinc-500 font-bold ml-2">0%</span>;
  
  return (
    <span className={`text-[9px] font-black ml-2 flex items-center gap-0.5 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {trend.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {trend.pct}%
    </span>
  );
};

const SqlTrendBadge = ({ pct }: { pct: number }) => {
  if (Number(pct) === 0) return <span className="text-[10px] text-zinc-500 font-bold">0%</span>;
  const isPositive = Number(pct) > 0;
  
  return (
    <span className={`text-[10px] font-black flex items-center gap-0.5 justify-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
};

export const AdminLeaderboardHistory = () => {
  const [historyDocs, setHistoryDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [category, setCategory] = useState<'chapter' | 'character' | 'series' | 'creators' | 'fans'>('chapter');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [periodType, category]);

  const fetchHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leaderboard_history')
      .select('*')
      .eq('period_type', periodType)
      .eq('category', category)
      .order('period_end', { ascending: false });

    if (data && !error) {
      setHistoryDocs(data);
      if (data.length > 0) setSelectedSnapshotId(data[0].id);
      else setSelectedSnapshotId(null);
    } else {
      setHistoryDocs([]);
      setSelectedSnapshotId(null);
    }
    setIsLoading(false);
  };

  const handlePeriodChange = (newPeriod: 'weekly' | 'monthly') => {
    setPeriodType(newPeriod);
    setCategory(newPeriod === 'weekly' ? 'chapter' : 'series');
  };

  const activeSnapshot = historyDocs.find(doc => doc.id === selectedSnapshotId);
  const rankingData = activeSnapshot ? activeSnapshot.ranking_data : [];

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 shadow-lg w-full animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#fe9a00]">Leaderboard Archive</h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Historical JSONB Snapshot Data</p>
        </div>
        
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0">
          <button 
            onClick={() => handlePeriodChange('weekly')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors cursor-pointer ${periodType === 'weekly' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => handlePeriodChange('monthly')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors cursor-pointer ${periodType === 'monthly' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black border border-zinc-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <Filter className="w-3 h-3" /> Select Category
            </h3>
            <div className="flex flex-col gap-2">
              {periodType === 'weekly' ? (
                <>
                  <button onClick={() => setCategory('chapter')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'chapter' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Most Hype Chapters</button>
                  <button onClick={() => setCategory('series')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'series' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Most Hype Series</button>
                  <button onClick={() => setCategory('character')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'character' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Top Characters</button>
                  <button onClick={() => setCategory('creators')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'creators' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Top Creators</button>
                </>
              ) : (
                <>
                  <button onClick={() => setCategory('series')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'series' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Big 3 Series</button>
                  <button onClick={() => setCategory('creators')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'creators' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Big 3 Creators</button>
                  <button onClick={() => setCategory('fans')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${category === 'fans' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Top Fans</button>
                </>
              )}
            </div>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Select Date Range
            </h3>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
              {isLoading ? (
                <div className="text-zinc-500 text-xs font-bold animate-pulse p-4">Loading dates...</div>
              ) : historyDocs.length === 0 ? (
                <div className="text-zinc-600 text-xs font-bold p-4">No archives found.</div>
              ) : (
                historyDocs.map((doc) => {
                  const endDate = new Date(doc.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const isActive = selectedSnapshotId === doc.id;
                  return (
                    <button 
                      key={doc.id}
                      onClick={() => setSelectedSnapshotId(doc.id)}
                      className={`p-3 rounded-lg text-xs font-bold transition-colors text-left border cursor-pointer ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      Ending: {endDate}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-black border border-zinc-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <Award className="w-5 h-5 text-[#fe9a00]" /> 
                {category === 'chapter' ? 'Top Chapters' : category === 'character' ? 'Top Characters' : category === 'series' ? 'Top Series' : category === 'creators' ? 'Top Creators' : 'Top Fans'}
              </h3>
              {activeSnapshot && (
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
                  Recorded: {new Date(activeSnapshot.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {!activeSnapshot ? (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold uppercase tracking-widest text-xs p-12">
                  Select an archive to view results
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-16 text-center">Rank</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Name / Title</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#fe9a00] text-right">Final Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(rankingData) ? rankingData : []).map((row: any, index: number) => (
                      <tr key={index} className="border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors">
                        <td className="p-4 text-center">
                          <span className={`text-sm font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-zinc-300' : index === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {(row.avatar_url || row.cover_url) && (
                              <img src={row.avatar_url || row.cover_url} className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-black" alt="avatar" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-white leading-none">
                                {row.name || row.title || row.username || 'Unknown'}
                              </p>
                              {row.series_slug && (
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                  {row.series_slug}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-black text-white">
                            {(row.score || 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!Array.isArray(rankingData) || rankingData.length === 0) && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs">
                          No data recorded for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsDashboard = () => {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'global' | 'series' | 'leaderboards'>('global');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null); 
  
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [seriesStats, setSeriesStats] = useState<any[]>([]);
  const [telemetryStats, setTelemetryStats] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      // Fetch RPCs + Live Ground-Truth Tables using safe select('*') so missing optional columns never fail
      const [
        globalRpcRes,
        seriesRpcRes,
        telemetryRpcRes,
        profilesRes,
        seriesTableRes,
        chaptersTableRes,
        readingHistoryRes,
        completedReadsRes,
        hypesRes,
        superHypesRes,
        pageReactsRes,
        seriesCommentsRes,
        seriesLikesRes
      ] = await Promise.all([
        supabase.rpc('get_advanced_app_health'),
        supabase.rpc('get_series_health_analytics'),
        supabase.rpc('get_telemetry_stats'),
        supabase.from('profiles').select('*'),
        supabase.from('series').select('*'),
        supabase.from('chapters').select('id, series_slug'),
        supabase.from('reading_history').select('*'),
        supabase.from('completed_reads').select('*'),
        supabase.from('hypes').select('*'),
        supabase.from('super_hypes').select('*'),
        supabase.from('page_reacts').select('*'),
        supabase.from('series_comments').select('*'),
        supabase.from('series_likes').select('*')
      ]);

      // --- 1. COMPUTE VERIFIED GLOBAL HEALTH ---
      const profiles = profilesRes.data || [];
      const totalUsersLive = profiles.length;
      const premiumUsersLive = profiles.filter((p: any) => p.is_premium).length;
      const freeUsersLive = Math.max(0, totalUsersLive - premiumUsersLive);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfToday.getDate() - 1);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - 7);
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);

      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfToday.getDate() - 30);
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setDate(startOfMonth.getDate() - 30);

      const startOfQuarter = new Date(startOfToday);
      startOfQuarter.setDate(startOfToday.getDate() - 90);
      const startOfLastQuarter = new Date(startOfQuarter);
      startOfLastQuarter.setDate(startOfQuarter.getDate() - 90);

      const startOfYear = new Date(startOfToday);
      startOfYear.setDate(startOfToday.getDate() - 365);
      const startOfLastYear = new Date(startOfYear);
      startOfLastYear.setDate(startOfYear.getDate() - 365);

      const historyRows = readingHistoryRes.data || [];
      const completedRows = completedReadsRes.data || [];
      const readEvents = historyRows.length >= completedRows.length
        ? historyRows.map((r: any) => new Date(r.updated_at || r.created_at || now))
        : completedRows.map((r: any) => new Date(r.created_at || now));

      const active30dSet = new Set<string>();
      historyRows.forEach((r: any) => {
        if (r.user_id && r.updated_at && new Date(r.updated_at) >= startOfMonth) {
          active30dSet.add(r.user_id);
        }
      });

      const countBetween = (start: Date, end?: Date) =>
        readEvents.filter(d => d >= start && (!end || d < end)).length;

      const sumProfileReads = profiles.reduce((acc: number, p: any) => acc + (Number(p.chapters_read) || 0), 0);
      const liveReadsLifetime = Math.max(readEvents.length, completedRows.length, sumProfileReads);

      const rpcGlobal = globalRpcRes.data || {};
      setGlobalStats({
        total_users: Math.max(Number(rpcGlobal.total_users || 0), totalUsersLive),
        premium_users: premiumUsersLive,
        free_users: Math.max(Number(rpcGlobal.total_users || 0) - premiumUsersLive, freeUsersLive),
        active_30d: Math.max(Number(rpcGlobal.active_30d || 0), active30dSet.size),
        reads_today: Math.max(Number(rpcGlobal.reads_today || 0), countBetween(startOfToday)),
        reads_yesterday: Math.max(Number(rpcGlobal.reads_yesterday || 0), countBetween(startOfYesterday, startOfToday)),
        reads_week: Math.max(Number(rpcGlobal.reads_week || 0), countBetween(startOfWeek)),
        reads_last_week: Math.max(Number(rpcGlobal.reads_last_week || 0), countBetween(startOfLastWeek, startOfWeek)),
        reads_month: Math.max(Number(rpcGlobal.reads_month || 0), countBetween(startOfMonth)),
        reads_last_month: Math.max(Number(rpcGlobal.reads_last_month || 0), countBetween(startOfLastMonth, startOfMonth)),
        reads_quarter: Math.max(Number(rpcGlobal.reads_quarter || 0), countBetween(startOfQuarter)),
        reads_last_quarter: Math.max(Number(rpcGlobal.reads_last_quarter || 0), countBetween(startOfLastQuarter, startOfQuarter)),
        reads_year: Math.max(Number(rpcGlobal.reads_year || 0), countBetween(startOfYear)),
        reads_last_year: Math.max(Number(rpcGlobal.reads_last_year || 0), countBetween(startOfLastYear, startOfYear)),
        reads_lifetime: Math.max(Number(rpcGlobal.reads_lifetime || 0), liveReadsLifetime)
      });

      // --- 2. COMPUTE VERIFIED SERIES HEALTH ---
      const chaptersList = chaptersTableRes.data || [];
      const chapToSeries = new Map<string, string>();
      chaptersList.forEach((c: any) => chapToSeries.set(String(c.id), c.series_slug));

      const readsPerSeries: Record<string, number> = {};
      const currentMonthReadsPerSeries: Record<string, number> = {};
      const lastMonthReadsPerSeries: Record<string, number> = {};

      historyRows.forEach((r: any) => {
        const slug = chapToSeries.get(String(r.chapter_id));
        if (slug) {
          readsPerSeries[slug] = (readsPerSeries[slug] || 0) + 1;
          const dt = new Date(r.updated_at || r.created_at || now);
          if (dt >= startOfMonth) currentMonthReadsPerSeries[slug] = (currentMonthReadsPerSeries[slug] || 0) + 1;
          else if (dt >= startOfLastMonth && dt < startOfMonth) lastMonthReadsPerSeries[slug] = (lastMonthReadsPerSeries[slug] || 0) + 1;
        }
      });

      completedRows.forEach((r: any) => {
        const slug = chapToSeries.get(String(r.chapter_id));
        if (slug && !readsPerSeries[slug]) {
          readsPerSeries[slug] = (readsPerSeries[slug] || 0) + 1;
        }
      });

      const hypesPerSeries: Record<string, number> = {};
      (superHypesRes.data || []).forEach((sh: any) => {
        if (sh.series_slug) hypesPerSeries[sh.series_slug] = (hypesPerSeries[sh.series_slug] || 0) + 1;
      });
      (hypesRes.data || []).forEach((h: any) => {
        if (h.target_type === 'series' && h.target_id) {
          hypesPerSeries[h.target_id] = (hypesPerSeries[h.target_id] || 0) + 1;
        } else if (h.target_type === 'chapter' && h.target_id) {
          const slug = chapToSeries.get(String(h.target_id));
          if (slug) hypesPerSeries[slug] = (hypesPerSeries[slug] || 0) + 1;
        }
      });
      (seriesLikesRes.data || []).forEach((sl: any) => {
        if (sl.series_slug) hypesPerSeries[sl.series_slug] = (hypesPerSeries[sl.series_slug] || 0) + 1;
      });

      const reactsPerSeries: Record<string, number> = {};
      (pageReactsRes.data || []).forEach((pr: any) => {
        const slug = chapToSeries.get(String(pr.chapter_id));
        if (slug) reactsPerSeries[slug] = (reactsPerSeries[slug] || 0) + 1;
      });

      const commentsPerSeries: Record<string, number> = {};
      (seriesCommentsRes.data || []).forEach((sc: any) => {
        if (sc.series_slug) commentsPerSeries[sc.series_slug] = (commentsPerSeries[sc.series_slug] || 0) + 1;
      });

      const rpcSeriesArray = Array.isArray(seriesRpcRes.data) ? seriesRpcRes.data : [];
      const rpcSeriesMap = new Map<string, any>();
      rpcSeriesArray.forEach((s: any) => {
        if (s.series_slug || s.slug) rpcSeriesMap.set(s.series_slug || s.slug, s);
      });

      // Use seriesTableRes.data OR fallback to useSeriesData().seriesList OR rpcSeriesArray so it is never empty!
      const rawSeriesSource =
        (seriesTableRes.data && seriesTableRes.data.length > 0)
          ? seriesTableRes.data
          : (seriesList && seriesList.length > 0)
            ? seriesList
            : rpcSeriesArray;

      const visibleSeries = rawSeriesSource.filter((s: any) => s.is_hidden !== true);

      const mergedSeriesStats = visibleSeries.map((s: any) => {
        const slug = s.slug || s.series_slug;
        const rpcItem = rpcSeriesMap.get(slug) || {};

        const totalReads = Math.max(Number(rpcItem.total_reads || 0), readsPerSeries[slug] || 0);
        const pageVisits = Math.max(Number(rpcItem.page_visits || 0), totalReads);
        const totalHypes = Math.max(
          Number(rpcItem.total_hypes || 0),
          hypesPerSeries[slug] || 0,
          Number(s.total_hype || s.hype_count || 0)
        );
        const totalReacts = Math.max(Number(rpcItem.total_reacts || 0), reactsPerSeries[slug] || 0);
        const totalComments = Math.max(Number(rpcItem.total_comments || 0), commentsPerSeries[slug] || 0);
        const ctr = pageVisits > 0 ? Math.min(100, (totalReads / pageVisits) * 100) : Number(rpcItem.ctr_percentage || 0);

        const curM = currentMonthReadsPerSeries[slug] || 0;
        const lastM = lastMonthReadsPerSeries[slug] || 0;
        const liveTrend = lastM > 0 ? ((curM - lastM) / lastM) * 100 : (curM > 0 ? 100 : 0);
        const trendPct = rpcItem.trend_percentage !== undefined && Number(rpcItem.trend_percentage) !== 0
          ? Number(rpcItem.trend_percentage)
          : liveTrend;

        return {
          series_slug: slug,
          title: s.title || rpcItem.title || 'Unknown Series',
          cover_url: s.cover_url || rpcItem.cover_url,
          trend_percentage: trendPct,
          page_visits: pageVisits,
          total_reads: totalReads,
          ctr_percentage: ctr,
          total_hypes: totalHypes,
          total_reacts: totalReacts,
          total_comments: totalComments
        };
      }).sort((a: any, b: any) => (b.total_reads + b.total_hypes * 5 + b.total_reacts * 2 + b.total_comments * 3) - (a.total_reads + a.total_hypes * 5 + a.total_reacts * 2 + a.total_comments * 3));

      setSeriesStats(mergedSeriesStats);

      if (telemetryRpcRes.data) {
        setTelemetryStats(telemetryRpcRes.data);
      }
    } catch (error: any) {
      console.error("Analytics Error:", error);
      setDbError(error.message || "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [seriesList]);

  useEffect(() => {
    fetchAnalytics();

    const subscription = supabase.channel('realtime_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_history' }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completed_reads' }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hypes' }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'super_hypes' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-[#fe9a00] animate-spin" />
        <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Crunching Data...</span>
      </div>
    );
  }

  const conversionRate = globalStats?.total_users > 0 
    ? ((globalStats?.premium_users / globalStats?.total_users) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-6xl mx-auto relative">
      
      {/* ERROR DISPLAY BOX */}
      {dbError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-1">Database Sync Error</h3>
            <p className="text-zinc-300 text-xs font-bold leading-relaxed">{dbError}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#fe9a00]" />
          <h2 className="text-2xl font-black uppercase italic tracking-widest text-[#fe9a00]">Analytics Engine</h2>
        </div>
        <button onClick={fetchAnalytics} className="flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap bg-black p-1 rounded-lg mb-8 border border-zinc-800 max-w-lg gap-1">
        <button onClick={() => setActiveTab('global')} className={`flex-1 min-w-[100px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'global' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Global Health</button>
        <button onClick={() => setActiveTab('series')} className={`flex-1 min-w-[100px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'series' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Series Health</button>
        <button onClick={() => setActiveTab('leaderboards')} className={`flex-1 min-w-[120px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'leaderboards' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Leaderboard Archive</button>
      </div>

      {activeTab === 'global' && globalStats && (
        <div className="space-y-6 animate-fade-in">
            
          {/* USER METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="w-4 h-4 text-blue-500" /></div>
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total Accounts</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">{(globalStats?.total_users || 0).toLocaleString()}</span>
            </div>

            <div className="bg-black border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20"><Crown className="w-4 h-4 text-purple-400" /></div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Subscribers</span>
                </div>
                <span className="text-purple-400 font-bold text-[10px] bg-purple-900/40 px-2 py-0.5 rounded">{conversionRate}%</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">{(globalStats?.premium_users || 0).toLocaleString()}</span>
            </div>

            <div className="bg-black border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-zinc-800 rounded-lg"><UserCheck className="w-4 h-4 text-zinc-400" /></div>
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Free Accounts</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">{(globalStats?.free_users || 0).toLocaleString()}</span>
            </div>

            <div className="bg-black border border-[#fe9a00]/30 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[#fe9a00]/5" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-[#fe9a00]/20 rounded-lg"><Activity className="w-4 h-4 text-[#fe9a00]" /></div>
                <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest">30-Day Active</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white relative z-10">{(globalStats?.active_30d || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* TELEMETRY EVENTS ROW */}
          {telemetryStats && (
            <>
              <h3 className="text-sm font-black italic uppercase text-zinc-400 mt-8 mb-2 border-b border-zinc-800 pb-2">Engagement Telemetry</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Total App Sessions</span>
                  </div>
                  <span className="text-2xl font-black text-white">{(telemetryStats?.total_sessions || 0).toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Unique Visitors</span>
                  </div>
                  <span className="text-2xl font-black text-white">{(telemetryStats?.unique_visitors || 0).toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Store Clicks</span>
                  </div>
                  <span className="text-2xl font-black text-white">{(telemetryStats?.store_visits || 0).toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Banner Clicks</span>
                  </div>
                  <span className="text-2xl font-black text-white">{(telemetryStats?.banner_clicks || 0).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          {/* ENGAGEMENT TIMEFRAMES ROW */}
          <h3 className="text-sm font-black italic uppercase text-zinc-400 mt-8 mb-2 border-b border-zinc-800 pb-2">Chapter Reads (vs Previous Period)</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-4 animate-pulse" title="Live Metric" />
              <div className="flex items-center justify-between mb-2 pr-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Today</span>
                </div>
                <TrendBadge current={globalStats?.reads_today || 0} past={globalStats?.reads_yesterday || 0} />
              </div>
              <span className="text-2xl font-black text-white">{(globalStats?.reads_today || 0).toLocaleString()}</span>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Week</span>
                </div>
                <TrendBadge current={globalStats?.reads_week || 0} past={globalStats?.reads_last_week || 0} />
              </div>
              <span className="text-2xl font-black text-white">{(globalStats?.reads_week || 0).toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Month</span>
                </div>
                <TrendBadge current={globalStats?.reads_month || 0} past={globalStats?.reads_last_month || 0} />
              </div>
              <span className="text-2xl font-black text-white">{(globalStats?.reads_month || 0).toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Quarter</span>
                </div>
                <TrendBadge current={globalStats?.reads_quarter || 0} past={globalStats?.reads_last_quarter || 0} />
              </div>
              <span className="text-2xl font-black text-white">{(globalStats?.reads_quarter || 0).toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Year</span>
                </div>
                <TrendBadge current={globalStats?.reads_year || 0} past={globalStats?.reads_last_year || 0} />
              </div>
              <span className="text-2xl font-black text-white">{(globalStats?.reads_year || 0).toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl bg-gradient-to-br from-black to-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3 text-[#fe9a00]" />
                  <span className="text-[9px] text-[#fe9a00] font-black uppercase tracking-widest">Lifetime Total</span>
                </div>
              </div>
              <span className="text-2xl font-black text-[#fe9a00]">{(globalStats?.reads_lifetime || 0).toLocaleString()}</span>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'series' && (
        <div className="animate-fade-in bg-black border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500">Rank</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500">Series Title</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">Trend <span className="lowercase font-bold">(MoM)</span></th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right"><Eye className="w-3 h-3 inline mb-0.5"/> Page Visits</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[#fe9a00] text-right">Lifetime Reads</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-blue-400 text-right"><Filter className="w-3 h-3 inline mb-0.5"/> CTR</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right"><Flame className="w-3 h-3 inline mb-0.5"/> Hypes</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">Quick Reacts</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right"><MessageSquare className="w-3 h-3 inline mb-0.5"/> Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(Array.isArray(seriesStats) ? seriesStats : []).map((series, index) => (
                  <tr key={series.series_slug || index} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="p-4 w-12 text-center font-black italic text-zinc-600 group-hover:text-white transition-colors">{index + 1}</td>
                    <td className="p-4 flex items-center gap-3">
                      <img src={series.cover_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'} className="w-8 h-8 rounded object-cover border border-zinc-700" alt="Cover" />
                      <span className="font-bold text-sm text-white">{series.title || 'Unknown Series'}</span>
                    </td>
                    <td className="p-4 text-center">
                       <SqlTrendBadge pct={series.trend_percentage || 0} />
                    </td>
                    <td className="p-4 text-right font-bold text-zinc-300">{(Number(series.page_visits) || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-black tracking-wider text-[#fe9a00]">{(Number(series.total_reads) || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-blue-400 bg-blue-900/10">{(Number(series.ctr_percentage) || 0).toFixed(1)}%</td>
                    <td className="p-4 text-right font-bold text-zinc-300">{(Number(series.total_hypes) || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-zinc-400">{(Number(series.total_reacts) || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-zinc-500">{(Number(series.total_comments) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!Array.isArray(seriesStats) || seriesStats.length === 0) && !dbError && (
             <div className="p-8 text-center text-zinc-500 font-bold text-xs tracking-widest uppercase">No series data available.</div>
          )}
        </div>
      )}

      {activeTab === 'leaderboards' && <AdminLeaderboardHistory />}
    </div>
  );
};