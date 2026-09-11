import React, { useState, useEffect } from 'react';
import { Activity, Users, Crown, BookOpen, RefreshCw, TrendingUp, Calendar, Clock, UserCheck, ArrowUp, ArrowDown, ShoppingCart, MousePointerClick, Globe, AlertTriangle, Flame, MessageSquare, Eye, Filter, Award } from 'lucide-react';
import { supabase } from '../supabase';

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
    <span className={`text-[10px] font-black flex items-center gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
};

export const AdminLeaderboardHistory = () => {
  const [historyDocs, setHistoryDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [category, setCategory] = useState<'chapter' | 'character'>('chapter');
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
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors ${periodType === 'weekly' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => handlePeriodChange('monthly')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors ${periodType === 'monthly' ? 'bg-[#fe9a00] text-black' : 'text-zinc-500 hover:text-white'}`}
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
                  <button onClick={() => setCategory('chapter')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border ${category === 'chapter' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Most Hype Chapters</button>
                  <button onClick={() => setCategory('character')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border ${category === 'character' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Top Characters</button>
                </>
              ) : (
                <>
                  <button onClick={() => setCategory('series')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border ${category === 'series' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Big 3 Series</button>
                  <button onClick={() => setCategory('creators')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border ${category === 'creators' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Big 3 Creators</button>
                  <button onClick={() => setCategory('fans')} className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border ${category === 'fans' ? 'bg-zinc-800 border-[#fe9a00] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>Top Fans</button>
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
                      className={`p-3 rounded-lg text-xs font-bold transition-colors text-left border ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
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
                {category === 'chapter' ? 'Top Chapters' : category === 'character' ? 'Top Characters' : category === 'series' ? 'Big 3 Series' : category === 'creators' ? 'Big 3 Creators' : 'Top Fans'}
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
                    {rankingData.map((row: any, index: number) => (
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
                            {row.score?.toLocaleString() || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {rankingData.length === 0 && (
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
  const [activeTab, setActiveTab] = useState<'global' | 'series' | 'leaderboards'>('global');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null); 
  
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [seriesStats, setSeriesStats] = useState<any[]>([]);
  const [telemetryStats, setTelemetryStats] = useState<any>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const { data: globalData, error: globalErr } = await supabase.rpc('get_advanced_app_health');
      if (globalErr) setDbError(prev => (prev ? prev + ' | ' : '') + 'Global Error: ' + globalErr.message);
      else if (globalData) setGlobalStats(globalData);

      const { data: seriesData, error: seriesErr } = await supabase.rpc('get_series_health_analytics');
      if (seriesErr) setDbError(prev => (prev ? prev + ' | ' : '') + 'Series Error: ' + seriesErr.message);
      else if (seriesData) setSeriesStats(seriesData);

      const { data: tData } = await supabase.rpc('get_telemetry_stats');
      if (tData) setTelemetryStats(tData);
    } catch (error: any) {
      console.error("Analytics Error:", error);
      setDbError(error.message || "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    const subscription = supabase.channel('realtime_analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reading_history' }, () => {
        setGlobalStats((prev: any) => prev ? { 
            ...prev, 
            reads_today: prev.reads_today + 1,
            reads_week: prev.reads_week + 1,
            reads_month: prev.reads_month + 1,
            reads_quarter: prev.reads_quarter + 1,
            reads_year: prev.reads_year + 1,
            reads_lifetime: prev.reads_lifetime + 1 
        } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

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
        <button onClick={fetchAnalytics} className="flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap bg-black p-1 rounded-lg mb-8 border border-zinc-800 max-w-lg gap-1">
        <button onClick={() => setActiveTab('global')} className={`flex-1 min-w-[100px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'global' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Global Health</button>
        <button onClick={() => setActiveTab('series')} className={`flex-1 min-w-[100px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'series' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Series Health</button>
        <button onClick={() => setActiveTab('leaderboards')} className={`flex-1 min-w-[120px] py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'leaderboards' ? 'bg-[#fe9a00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Leaderboard Archive</button>
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
              <span className="text-3xl font-black tracking-tighter text-white">{globalStats.total_users.toLocaleString()}</span>
            </div>

            <div className="bg-black border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20"><Crown className="w-4 h-4 text-purple-400" /></div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Subscribers</span>
                </div>
                <span className="text-purple-400 font-bold text-[10px] bg-purple-900/40 px-2 py-0.5 rounded">{conversionRate}%</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">{globalStats.premium_users.toLocaleString()}</span>
            </div>

            <div className="bg-black border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-zinc-800 rounded-lg"><UserCheck className="w-4 h-4 text-zinc-400" /></div>
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Free Accounts</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">{globalStats.free_users.toLocaleString()}</span>
            </div>

            <div className="bg-black border border-[#fe9a00]/30 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[#fe9a00]/5" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-[#fe9a00]/20 rounded-lg"><Activity className="w-4 h-4 text-[#fe9a00]" /></div>
                <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest">30-Day Active</span>
              </div>
              <span className="text-3xl font-black tracking-tighter text-white relative z-10">{globalStats.active_30d.toLocaleString()}</span>
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
                  <span className="text-2xl font-black text-white">{telemetryStats.total_sessions.toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Unique Visitors</span>
                  </div>
                  <span className="text-2xl font-black text-white">{telemetryStats.unique_visitors.toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Store Clicks</span>
                  </div>
                  <span className="text-2xl font-black text-white">{telemetryStats.store_visits.toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Banner Clicks</span>
                  </div>
                  <span className="text-2xl font-black text-white">{telemetryStats.banner_clicks.toLocaleString()}</span>
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
                <TrendBadge current={globalStats.reads_today} past={globalStats.reads_yesterday} />
              </div>
              <span className="text-2xl font-black text-white">{globalStats.reads_today.toLocaleString()}</span>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Week</span>
                </div>
                <TrendBadge current={globalStats.reads_week} past={globalStats.reads_last_week} />
              </div>
              <span className="text-2xl font-black text-white">{globalStats.reads_week.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Month</span>
                </div>
                <TrendBadge current={globalStats.reads_month} past={globalStats.reads_last_month} />
              </div>
              <span className="text-2xl font-black text-white">{globalStats.reads_month.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Quarter</span>
                </div>
                <TrendBadge current={globalStats.reads_quarter} past={globalStats.reads_last_quarter} />
              </div>
              <span className="text-2xl font-black text-white">{globalStats.reads_quarter.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">This Year</span>
                </div>
                <TrendBadge current={globalStats.reads_year} past={globalStats.reads_last_year} />
              </div>
              <span className="text-2xl font-black text-white">{globalStats.reads_year.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl bg-gradient-to-br from-black to-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3 text-[#fe9a00]" />
                  <span className="text-[9px] text-[#fe9a00] font-black uppercase tracking-widest">Lifetime Total</span>
                </div>
              </div>
              <span className="text-2xl font-black text-[#fe9a00]">{globalStats.reads_lifetime.toLocaleString()}</span>
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
                {seriesStats.map((series, index) => (
                  <tr key={series.series_slug} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="p-4 w-12 text-center font-black italic text-zinc-600 group-hover:text-white transition-colors">{index + 1}</td>
                    <td className="p-4 flex items-center gap-3">
                      <img src={series.cover_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'} className="w-8 h-8 rounded object-cover border border-zinc-700" alt="Cover" />
                      <span className="font-bold text-sm text-white">{series.title}</span>
                    </td>
                    <td className="p-4 text-center">
                       <SqlTrendBadge pct={series.trend_percentage} />
                    </td>
                    <td className="p-4 text-right font-bold text-zinc-300">{Number(series.page_visits).toLocaleString()}</td>
                    <td className="p-4 text-right font-black tracking-wider text-[#fe9a00]">{Number(series.total_reads).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-blue-400 bg-blue-900/10">{Number(series.ctr_percentage).toFixed(1)}%</td>
                    <td className="p-4 text-right font-bold text-zinc-300">{Number(series.total_hypes).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-zinc-400">{Number(series.total_reacts).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-zinc-500">{Number(series.total_comments).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {seriesStats.length === 0 && !dbError && (
             <div className="p-8 text-center text-zinc-500 font-bold text-xs tracking-widest uppercase">No series data available.</div>
          )}
        </div>
      )}

      {activeTab === 'leaderboards' && <AdminLeaderboardHistory />}
    </div>
  );
};