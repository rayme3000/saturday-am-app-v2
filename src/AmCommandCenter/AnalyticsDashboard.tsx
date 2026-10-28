import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Users,
  Crown,
  BookOpen,
  RefreshCw,
  TrendingUp,
  Calendar,
  Clock,
  UserCheck,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  MousePointerClick,
  Globe,
  AlertTriangle,
  Flame,
  MessageSquare,
  Eye,
  Filter,
  Award,
  Zap,
  Heart,
  Sparkles,
  Search,
  DollarSign,
  BarChart3,
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

// Matches Leaderboard.tsx & CreatorPayoutTracker.tsx staff/creator exclusions
export const EXCLUDED_STAFF_ADMIN_EMAILS = new Set([
  'odunze.oguguo@yahoo.com',
  'saturday.editorial@gmail.com',
  'demetrene.billups@gmail.com',
  'publisher@saturday-am.com',
  'rayme3000@gmail.com',
  'saturdayam.writer@gmail.com',
  'dropkickanimation@gmail.com',
  'fsimmonds4@gmail.com'
]);

export const ELEVATED_CREATOR_STAFF_ROLES = new Set([
  'creator',
  'core_creator',
  'staff',
  'influencer',
  'admin',
  'moderator'
]);

export const isStaffOrCreatorProfile = (p: any): boolean => {
  if (!p) return false;
  const role = String(p.role || 'reader').trim().toLowerCase();
  const email = String(p.email || '').trim().toLowerCase();
  const hasLinkedCreator = Boolean(String(p.linked_creator_name || '').trim());
  return (
    Boolean(p.is_admin) ||
    ELEVATED_CREATOR_STAFF_ROLES.has(role) ||
    EXCLUDED_STAFF_ADMIN_EMAILS.has(email) ||
    hasLinkedCreator
  );
};

const calculateTrend = (current: number, past: number) => {
  if (past === 0) {
    if (current === 0) return { pct: '0', isPositive: true, isNeutral: true };
    return { pct: '100', isPositive: true, isNeutral: false };
  }
  const change = ((current - past) / past) * 100;
  return {
    pct: Math.abs(change).toFixed(1),
    isPositive: change > 0,
    isNeutral: change === 0
  };
};

const TrendBadge = ({
  current,
  past,
  label
}: {
  current: number;
  past: number;
  label?: string;
}) => {
  const trend = calculateTrend(current, past);
  if (trend.isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 text-[9px] text-zinc-400 font-black uppercase tracking-wider">
        0% {label || ''}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
        trend.isPositive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-red-500/10 text-red-400 border-red-500/30'
      }`}
    >
      {trend.isPositive ? (
        <ArrowUp className="w-2.5 h-2.5" />
      ) : (
        <ArrowDown className="w-2.5 h-2.5" />
      )}
      {trend.pct}% {label ? <span className="opacity-75 ml-0.5">{label}</span> : null}
    </span>
  );
};

const SqlTrendBadge = ({ pct }: { pct: number }) => {
  if (Number(pct) === 0) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-[10px] text-zinc-500 font-bold">
        0%
      </span>
    );
  }
  const isPositive = Number(pct) > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black justify-center border ${
        isPositive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-red-500/10 text-red-400 border-red-500/30'
      }`}
    >
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
};

export const AdminLeaderboardHistory = () => {
  const [historyDocs, setHistoryDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [category, setCategory] = useState<
    'chapter' | 'character' | 'series' | 'creators' | 'fans'
  >('chapter');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 shadow-lg w-full animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#fe9a00]">
            Leaderboard Archive
          </h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
            Historical JSONB Snapshot Data
          </p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0">
          <button
            onClick={() => handlePeriodChange('weekly')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors cursor-pointer ${
              periodType === 'weekly'
                ? 'bg-[#fe9a00] text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => handlePeriodChange('monthly')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors cursor-pointer ${
              periodType === 'monthly'
                ? 'bg-[#fe9a00] text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
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
                  <button
                    onClick={() => setCategory('chapter')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'chapter'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Most Hype Chapters
                  </button>
                  <button
                    onClick={() => setCategory('series')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'series'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Most Hype Series
                  </button>
                  <button
                    onClick={() => setCategory('character')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'character'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Top Characters
                  </button>
                  <button
                    onClick={() => setCategory('creators')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'creators'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Top Creators
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCategory('series')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'series'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Big 3 Series
                  </button>
                  <button
                    onClick={() => setCategory('creators')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'creators'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Big 3 Creators
                  </button>
                  <button
                    onClick={() => setCategory('fans')}
                    className={`py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-colors text-left border cursor-pointer ${
                      category === 'fans'
                        ? 'bg-zinc-800 border-[#fe9a00] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    Top Fans
                  </button>
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
                <div className="text-zinc-500 text-xs font-bold animate-pulse p-4">
                  Loading dates...
                </div>
              ) : historyDocs.length === 0 ? (
                <div className="text-zinc-600 text-xs font-bold p-4">No archives found.</div>
              ) : (
                historyDocs.map(doc => {
                  const endDate = new Date(doc.period_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const isActive = selectedSnapshotId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedSnapshotId(doc.id)}
                      className={`p-3 rounded-lg text-xs font-bold transition-colors text-left border cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
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
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-white">
                <Award className="w-5 h-5 text-[#fe9a00]" />
                {category === 'chapter'
                  ? 'Top Chapters'
                  : category === 'character'
                  ? 'Top Characters'
                  : category === 'series'
                  ? 'Top Series'
                  : category === 'creators'
                  ? 'Top Creators'
                  : 'Top Fans'}
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
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-16 text-center">
                        Rank
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Name / Title
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#fe9a00] text-right">
                        Final Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(rankingData) ? rankingData : []).map(
                      (row: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors"
                        >
                          <td className="p-4 text-center">
                            <span
                              className={`text-sm font-black ${
                                index === 0
                                  ? 'text-yellow-400'
                                  : index === 1
                                  ? 'text-zinc-300'
                                  : index === 2
                                  ? 'text-amber-600'
                                  : 'text-zinc-600'
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {(row.avatar_url || row.cover_url) && (
                                <img
                                  src={row.avatar_url || row.cover_url}
                                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-black"
                                  alt="avatar"
                                />
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
                      )
                    )}
                    {(!Array.isArray(rankingData) || rankingData.length === 0) && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-12 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs"
                        >
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

interface DailyChartBucket {
  dateKey: string;
  label: string;
  shortLabel: string;
  reads: number;
  completed: number;
  signups: number;
  engagements: number;
}

type AudienceFilterMode = 'fans_only' | 'staff_creators_only' | 'all_combined';

export const AnalyticsDashboard = () => {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'global' | 'engagement' | 'series' | 'leaderboards'>(
    'global'
  );
  // Default to PURE FANS ONLY so Creator/Staff testing never pollutes your user metrics
  const [audienceMode, setAudienceMode] = useState<AudienceFilterMode>('fans_only');

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Raw tables cached in memory so switching Audience Mode (Fans vs Staff/Creators vs All) is instant
  const [rawTables, setRawTables] = useState<any>(null);

  // Series Table Filtering & Sorting
  const [seriesSearch, setSeriesSearch] = useState('');
  const [seriesSortKey, setSeriesSortKey] = useState<
    'score' | 'reads' | 'completed' | 'hypes' | 'likes' | 'ctr' | 'comments' | 'trend'
  >('score');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const [
        profilesRes,
        adminDirRes,
        seriesTableRes,
        chaptersTableRes,
        readingHistoryRes,
        completedReadsRes,
        hypesRes,
        superHypesRes,
        pageReactsRes,
        seriesCommentsRes,
        seriesLikesRes,
        chapterLikesRes,
        characterLikesRes,
        creatorLikesRes,
        creatorTipsRes,
        telemetryEventsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').limit(10000),
        supabase.rpc('get_admin_user_directory', { p_search: '', p_limit: 5000, p_offset: 0 }),
        supabase.from('series').select('*'),
        supabase.from('chapters').select('id, series_slug, chapter_number, title'),
        supabase.from('reading_history').select('*').limit(25000),
        supabase.from('completed_reads').select('*').limit(25000),
        supabase.from('hypes').select('*').limit(25000),
        supabase.from('super_hypes').select('*').limit(25000),
        supabase.from('page_reacts').select('*').limit(25000),
        supabase.from('series_comments').select('*').limit(25000),
        supabase.from('series_likes').select('*').limit(25000),
        supabase.from('chapter_likes').select('*').limit(25000),
        supabase.from('character_likes').select('*').limit(25000),
        supabase.from('creator_likes').select('*').limit(25000),
        supabase.from('creator_tips').select('*').limit(10000),
        supabase.from('telemetry_events').select('*').limit(30000)
      ]);

      // Merge auth.users created_at/email from get_admin_user_directory with public.profiles
      const authDirMap = new Map<string, any>();
      if (Array.isArray(adminDirRes.data)) {
        adminDirRes.data.forEach((u: any) => {
          if (u.id) authDirMap.set(String(u.id), u);
        });
      }

      const rawProfiles = (profilesRes.data || []).map((p: any) => {
        const authUser = authDirMap.get(String(p.id)) || {};
        return {
          ...authUser,
          ...p,
          id: String(p.id),
          email: String(p.email || authUser.email || '').trim(),
          created_at: authUser.created_at || p.created_at || p.tos_accepted_at || null
        };
      });

      setRawTables({
        profiles: rawProfiles,
        series: seriesTableRes.data || [],
        chapters: chaptersTableRes.data || [],
        readingHistory: readingHistoryRes.data || [],
        completedReads: completedReadsRes.data || [],
        hypes: hypesRes.data || [],
        superHypes: superHypesRes.data || [],
        pageReacts: pageReactsRes.data || [],
        seriesComments: seriesCommentsRes.data || [],
        seriesLikes: seriesLikesRes.data || [],
        chapterLikes: chapterLikesRes.data || [],
        characterLikes: characterLikesRes.data || [],
        creatorLikes: creatorLikesRes.data || [],
        creatorTips: creatorTipsRes.data || [],
        telemetryEvents: telemetryEventsRes.data || []
      });

      setLastRefreshed(new Date());
    } catch (error: any) {
      console.error('Analytics Fetch Error:', error);
      setDbError(error.message || 'Unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const subscription = supabase
      .channel('realtime_analytics_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_history' }, () => {
        fetchAnalytics();
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completed_reads' },
        () => {
          fetchAnalytics();
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hypes' }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'super_hypes' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchAnalytics]);

  // --- COMPUTE AIRTIGHT METRICS BASED ON SELECTED AUDIENCE MODE ---
  const computed = useMemo(() => {
    if (!rawTables) return null;

    const allProfiles: any[] = rawTables.profiles || [];
    const staffCreatorIds = new Set<string>();
    const staffCreatorEmails = new Set<string>(EXCLUDED_STAFF_ADMIN_EMAILS);

    const fanProfiles: any[] = [];
    const staffCreatorProfiles: any[] = [];

    allProfiles.forEach(p => {
      if (isStaffOrCreatorProfile(p)) {
        staffCreatorIds.add(String(p.id));
        if (p.email) staffCreatorEmails.add(String(p.email).toLowerCase());
        staffCreatorProfiles.push(p);
      } else {
        fanProfiles.push(p);
      }
    });

    // Helper: Does an event row belong to the currently selected Audience Mode?
    const matchesAudience = (row: any): boolean => {
      if (audienceMode === 'all_combined') return true;
      const uid = row?.user_id || row?.id;
      const email = String(row?.donor_email || row?.email || '').trim().toLowerCase();
      const isElevated =
        (uid && staffCreatorIds.has(String(uid))) ||
        (email && staffCreatorEmails.has(email));

      if (audienceMode === 'fans_only') return !isElevated;
      return Boolean(isElevated);
    };

    const activeProfiles =
      audienceMode === 'fans_only'
        ? fanProfiles
        : audienceMode === 'staff_creators_only'
        ? staffCreatorProfiles
        : allProfiles;

    const totalUsers = activeProfiles.length;
    const premiumUsers = activeProfiles.filter(p => Boolean(p.is_premium)).length;
    const freeUsers = Math.max(0, totalUsers - premiumUsers);

    // Date boundaries
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

    const profileDates = activeProfiles
      .map(p => {
        const raw = p.created_at || p.updated_at;
        return raw ? new Date(raw) : null;
      })
      .filter((d): d is Date => Boolean(d && !isNaN(d.getTime())));

    const countDatesBetween = (dates: Date[], start: Date, end?: Date) =>
      dates.filter(d => d >= start && (!end || d < end)).length;

    const growthStats = {
      newUsersToday: countDatesBetween(profileDates, startOfToday),
      newUsersYesterday: countDatesBetween(profileDates, startOfYesterday, startOfToday),
      newUsersWeek: countDatesBetween(profileDates, startOfWeek),
      newUsersLastWeek: countDatesBetween(profileDates, startOfLastWeek, startOfWeek),
      newUsersMonth: countDatesBetween(profileDates, startOfMonth),
      newUsersLastMonth: countDatesBetween(profileDates, startOfLastMonth, startOfMonth)
    };

    const recentUsers = [...activeProfiles]
      .sort((a, b) => {
        const da = new Date(a.created_at || a.updated_at || 0).getTime();
        const db = new Date(b.created_at || b.updated_at || 0).getTime();
        return db - da;
      })
      .slice(0, 8);

    // Filter activity tables by Audience Mode
    const historyRows = (rawTables.readingHistory || []).filter(matchesAudience);
    const completedRows = (rawTables.completedReads || []).filter(matchesAudience);
    const superHypesData = (rawTables.superHypes || []).filter(matchesAudience);
    const rawHypesData = (rawTables.hypes || []).filter(matchesAudience);
    const reactsData = (rawTables.pageReacts || []).filter(matchesAudience);
    const commentsData = (rawTables.seriesComments || []).filter(matchesAudience);
    const seriesLikesData = (rawTables.seriesLikes || []).filter(matchesAudience);
    const chapterLikesData = (rawTables.chapterLikes || []).filter(matchesAudience);
    const characterLikesData = (rawTables.characterLikes || []).filter(matchesAudience);
    const creatorLikesData = (rawTables.creatorLikes || []).filter(matchesAudience);
    const tipsData = (rawTables.creatorTips || []).filter(matchesAudience);
    const telemetryRows = (rawTables.telemetryEvents || []).filter(matchesAudience);

    // --- DE-DUPLICATE SUPER HYPES FROM HYPES TABLE ---
    // In HypeEconomyContext.tsx, spendSuperHype inserts 1 row into super_hypes AND 1 row into hypes (target_type='series').
    // We remove those mirror rows from rawHypesData so Standard Hypes and Super Hypes are 100% distinct and never double-counted!
    const superHypeFingerprints = new Map<string, number>();
    superHypesData.forEach((sh: any) => {
      const minuteBucket = sh.created_at ? String(sh.created_at).slice(0, 16) : '';
      const key = `${sh.user_id}_${sh.series_slug}_${minuteBucket}`;
      superHypeFingerprints.set(key, (superHypeFingerprints.get(key) || 0) + 1);
    });

    const pureStandardHypesData = rawHypesData.filter((h: any) => {
      if (h.target_type !== 'series') return true;
      const minuteBucket = h.created_at ? String(h.created_at).slice(0, 16) : '';
      const key = `${h.user_id}_${h.target_id}_${minuteBucket}`;
      const count = superHypeFingerprints.get(key) || 0;
      if (count > 0) {
        superHypeFingerprints.set(key, count - 1);
        return false; // Skip mirror row created by spendSuperHype
      }
      return true;
    });

    // Active 7d and 30d Users (across reading_history, hypes, super_hypes, reacts, comments, likes)
    const active7dSet = new Set<string>();
    const active30dSet = new Set<string>();
    const registerActiveUser = (uid?: string, rawDt?: string) => {
      if (!uid || !rawDt) return;
      const dt = new Date(rawDt);
      if (isNaN(dt.getTime())) return;
      if (dt >= startOfWeek) active7dSet.add(String(uid));
      if (dt >= startOfMonth) active30dSet.add(String(uid));
    };

    historyRows.forEach((r: any) => registerActiveUser(r.user_id, r.updated_at || r.created_at));
    completedRows.forEach((r: any) => registerActiveUser(r.user_id, r.created_at));
    pureStandardHypesData.forEach((r: any) => registerActiveUser(r.user_id, r.created_at));
    superHypesData.forEach((r: any) => registerActiveUser(r.user_id, r.created_at));
    reactsData.forEach((r: any) => registerActiveUser(r.user_id, r.created_at));
    commentsData.forEach((r: any) => registerActiveUser(r.user_id, r.created_at));

    // Chapter Read Timestamps (Unique user+chapter opens in reading_history)
    const readDates: Date[] = historyRows
      .map((r: any) => new Date(r.updated_at || r.created_at || now))
      .filter((d: Date) => !isNaN(d.getTime()));

    const sumProfileCompletedReads = activeProfiles.reduce(
      (acc: number, p: any) => acc + (Number(p.chapters_read) || 0),
      0
    );

    const chaptersOpenedLifetime = Math.max(historyRows.length, completedRows.length);
    const chaptersCompletedLifetime = Math.max(completedRows.length, sumProfileCompletedReads);

    const globalStats = {
      total_users: totalUsers,
      premium_users: premiumUsers,
      free_users: freeUsers,
      active_7d: active7dSet.size,
      active_30d: active30dSet.size,
      reads_today: countDatesBetween(readDates, startOfToday),
      reads_yesterday: countDatesBetween(readDates, startOfYesterday, startOfToday),
      reads_week: countDatesBetween(readDates, startOfWeek),
      reads_last_week: countDatesBetween(readDates, startOfLastWeek, startOfWeek),
      reads_month: countDatesBetween(readDates, startOfMonth),
      reads_last_month: countDatesBetween(readDates, startOfLastMonth, startOfMonth),
      reads_quarter: countDatesBetween(readDates, startOfQuarter),
      reads_last_quarter: countDatesBetween(readDates, startOfLastQuarter, startOfQuarter),
      reads_year: countDatesBetween(readDates, startOfYear),
      reads_last_year: countDatesBetween(readDates, startOfLastYear, startOfYear),
      reads_lifetime: chaptersOpenedLifetime,
      completed_lifetime: chaptersCompletedLifetime
    };

    // --- 14-DAY DAILY TIMELINE BUCKETS ---
    const buckets: DailyChartBucket[] = [];
    const bucketMap = new Map<string, DailyChartBucket>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(startOfToday.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const shortLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const bucket: DailyChartBucket = {
        dateKey: key,
        label,
        shortLabel,
        reads: 0,
        completed: 0,
        signups: 0,
        engagements: 0
      };
      buckets.push(bucket);
      bucketMap.set(key, bucket);
    }

    readDates.forEach(dt => {
      const key = dt.toISOString().split('T')[0];
      const b = bucketMap.get(key);
      if (b) b.reads += 1;
    });

    completedRows.forEach((r: any) => {
      if (r.created_at) {
        const dt = new Date(r.created_at);
        if (!isNaN(dt.getTime())) {
          const key = dt.toISOString().split('T')[0];
          const b = bucketMap.get(key);
          if (b) b.completed += 1;
        }
      }
    });

    profileDates.forEach(dt => {
      const key = dt.toISOString().split('T')[0];
      const b = bucketMap.get(key);
      if (b) b.signups += 1;
    });

    [
      ...pureStandardHypesData,
      ...superHypesData,
      ...reactsData,
      ...commentsData,
      ...seriesLikesData,
      ...chapterLikesData,
      ...characterLikesData,
      ...creatorLikesData
    ].forEach((ev: any) => {
      const raw = ev.created_at || ev.updated_at;
      if (raw) {
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) {
          const key = dt.toISOString().split('T')[0];
          const b = bucketMap.get(key);
          if (b) b.engagements += 1;
        }
      }
    });

    // --- TELEMETRY STATS (FILTERED BY AUDIENCE MODE) ---
    const uniqueSessions = new Set<string>();
    const uniqueVisitorIds = new Set<string>();
    let storeClicks = 0;
    let bannerClicks = 0;
    const seriesVisitsPerSlug: Record<string, number> = {};

    telemetryRows.forEach((t: any) => {
      if (t.session_id) uniqueSessions.add(String(t.session_id));
      if (t.user_id) uniqueVisitorIds.add(String(t.user_id));
      else if (t.session_id) uniqueVisitorIds.add(String(t.session_id));

      const evType = String(t.event_type || '').toLowerCase();
      const meta = t.metadata || t.event_data || {};
      const slug = meta?.series_slug || meta?.slug;

      if (evType === 'series_page_visit' || evType === 'series_visit') {
        if (slug) {
          seriesVisitsPerSlug[slug] = (seriesVisitsPerSlug[slug] || 0) + 1;
        }
      } else if (evType.includes('store') || evType.includes('shop')) {
        storeClicks += 1;
      } else if (evType.includes('banner') || evType.includes('slide') || evType.includes('hero')) {
        bannerClicks += 1;
      }
    });

    const telemetryStats = {
      total_sessions: uniqueSessions.size,
      unique_visitors: uniqueVisitorIds.size,
      store_visits: storeClicks,
      banner_clicks: bannerClicks
    };

    // --- FEATURE ENGAGEMENT BREAKDOWN ---
    const totalLikesAllTypes =
      seriesLikesData.length +
      chapterLikesData.length +
      characterLikesData.length +
      creatorLikesData.length;

    const hypesByTarget = {
      series: pureStandardHypesData.filter((h: any) => h.target_type === 'series').length,
      chapter: pureStandardHypesData.filter((h: any) => h.target_type === 'chapter').length,
      character: pureStandardHypesData.filter((h: any) => h.target_type === 'character').length,
      creator: pureStandardHypesData.filter((h: any) => h.target_type === 'creator').length
    };

    const totalTipDollars = tipsData.reduce(
      (sum: number, t: any) => sum + (Number(t.amount_dollars) || 0),
      0
    );

    const engagementBreakdown = {
      chapterReads: chaptersOpenedLifetime,
      completedChapters: chaptersCompletedLifetime,
      standardHypes: pureStandardHypesData.length,
      hypesByTarget,
      superHypes: superHypesData.length,
      quickReacts: reactsData.length,
      totalLikes: totalLikesAllTypes,
      seriesLikes: seriesLikesData.length,
      chapterLikes: chapterLikesData.length,
      characterLikes: characterLikesData.length,
      creatorLikes: creatorLikesData.length,
      comments: commentsData.length,
      creatorTipsCount: tipsData.length,
      creatorTipsDollars: totalTipDollars
    };

    // --- SERIES PERFORMANCE & HEALTH ---
    const chaptersList = rawTables.chapters || [];
    const chapToSeries = new Map<string, string>();
    const chapToNumber = new Map<string, number>();
    chaptersList.forEach((c: any) => {
      chapToSeries.set(String(c.id), c.series_slug);
      if (c.chapter_number !== undefined) {
        chapToNumber.set(String(c.id), Number(c.chapter_number));
      }
    });

    const rawSeriesSource =
      rawTables.series && rawTables.series.length > 0 ? rawTables.series : seriesList || [];
    const seriesTitleMap = new Map<string, string>();
    rawSeriesSource.forEach((s: any) => {
      if (s.slug) seriesTitleMap.set(s.slug, s.title || s.slug);
    });

    // Recent Community Activity Feed
    const feedItems: any[] = [];
    superHypesData.slice(-8).forEach((sh: any) => {
      feedItems.push({
        type: 'super_hype',
        label: `Super Hype dropped on ${
          seriesTitleMap.get(sh.series_slug) || sh.series_slug || 'a series'
        }`,
        timestamp: sh.created_at || now.toISOString()
      });
    });
    commentsData.slice(-8).forEach((cm: any) => {
      feedItems.push({
        type: 'comment',
        label: `${cm.user_name || 'A fan'} commented on ${
          seriesTitleMap.get(cm.series_slug) || cm.series_slug || 'a series'
        }`,
        sub: cm.text ? `"${String(cm.text).slice(0, 65)}"` : '',
        timestamp: cm.created_at || now.toISOString()
      });
    });
    tipsData.slice(-8).forEach((tp: any) => {
      feedItems.push({
        type: 'tip',
        label: `${tp.donor_name || 'A supporter'} tipped $${tp.amount_dollars || 5} to ${
          tp.creator_name || 'Creator'
        }`,
        sub: tp.fan_message ? `"${String(tp.fan_message).slice(0, 65)}"` : '',
        timestamp: tp.created_at || now.toISOString()
      });
    });
    historyRows.slice(-10).forEach((rh: any) => {
      const sSlug = chapToSeries.get(String(rh.chapter_id));
      const chNum = chapToNumber.get(String(rh.chapter_id));
      if (sSlug) {
        feedItems.push({
          type: 'read',
          label: `Reader opened ${seriesTitleMap.get(sSlug) || sSlug}${
            chNum ? ` • Ch. ${chNum}` : ''
          }`,
          timestamp: rh.updated_at || rh.created_at || now.toISOString()
        });
      }
    });
    feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Per-Series Aggregations
    const readsPerSeries: Record<string, number> = {};
    const completedPerSeries: Record<string, number> = {};
    const currentMonthReadsPerSeries: Record<string, number> = {};
    const lastMonthReadsPerSeries: Record<string, number> = {};

    historyRows.forEach((r: any) => {
      const slug = chapToSeries.get(String(r.chapter_id));
      if (slug) {
        readsPerSeries[slug] = (readsPerSeries[slug] || 0) + 1;
        const dt = new Date(r.updated_at || r.created_at || now);
        if (dt >= startOfMonth) {
          currentMonthReadsPerSeries[slug] = (currentMonthReadsPerSeries[slug] || 0) + 1;
        } else if (dt >= startOfLastMonth && dt < startOfMonth) {
          lastMonthReadsPerSeries[slug] = (lastMonthReadsPerSeries[slug] || 0) + 1;
        }
      }
    });

    completedRows.forEach((r: any) => {
      const slug = chapToSeries.get(String(r.chapter_id));
      if (slug) {
        completedPerSeries[slug] = (completedPerSeries[slug] || 0) + 1;
      }
    });

    const standardHypesPerSeries: Record<string, number> = {};
    const superHypesPerSeries: Record<string, number> = {};

    superHypesData.forEach((sh: any) => {
      if (sh.series_slug) {
        superHypesPerSeries[sh.series_slug] = (superHypesPerSeries[sh.series_slug] || 0) + 1;
      }
    });

    pureStandardHypesData.forEach((h: any) => {
      if (h.target_type === 'series' && h.target_id) {
        standardHypesPerSeries[h.target_id] = (standardHypesPerSeries[h.target_id] || 0) + 1;
      } else if (h.target_type === 'chapter' && h.target_id) {
        const slug = chapToSeries.get(String(h.target_id));
        if (slug) standardHypesPerSeries[slug] = (standardHypesPerSeries[slug] || 0) + 1;
      }
    });

    const likesPerSeries: Record<string, number> = {};
    seriesLikesData.forEach((sl: any) => {
      if (sl.series_slug) {
        likesPerSeries[sl.series_slug] = (likesPerSeries[sl.series_slug] || 0) + 1;
      }
    });
    chapterLikesData.forEach((cl: any) => {
      const slug = chapToSeries.get(String(cl.chapter_id));
      if (slug) {
        likesPerSeries[slug] = (likesPerSeries[slug] || 0) + 1;
      }
    });

    const reactsPerSeries: Record<string, number> = {};
    reactsData.forEach((pr: any) => {
      const slug = chapToSeries.get(String(pr.chapter_id));
      if (slug) reactsPerSeries[slug] = (reactsPerSeries[slug] || 0) + 1;
    });

    const commentsPerSeries: Record<string, number> = {};
    commentsData.forEach((sc: any) => {
      if (sc.series_slug) {
        commentsPerSeries[sc.series_slug] = (commentsPerSeries[sc.series_slug] || 0) + 1;
      }
    });

    const visibleSeries = rawSeriesSource.filter((s: any) => s.is_hidden !== true);

    const seriesStats = visibleSeries.map((s: any) => {
      const slug = s.slug || s.series_slug;
      const totalReads = Math.max(readsPerSeries[slug] || 0, completedPerSeries[slug] || 0);
      const completedReads = completedPerSeries[slug] || 0;
      const telemetryVisits = seriesVisitsPerSlug[slug] || 0;
      const pageVisits = Math.max(telemetryVisits, totalReads);

      const stdHypes = standardHypesPerSeries[slug] || 0;
      const supHypes = superHypesPerSeries[slug] || 0;
      const totalHypeActions = stdHypes + supHypes;

      const totalLikes = likesPerSeries[slug] || 0;
      const totalReacts = reactsPerSeries[slug] || 0;
      const totalComments = commentsPerSeries[slug] || 0;

      const ctr = pageVisits > 0 ? Math.min(100, (totalReads / pageVisits) * 100) : 0;

      const curM = currentMonthReadsPerSeries[slug] || 0;
      const lastM = lastMonthReadsPerSeries[slug] || 0;
      const trendPct = lastM > 0 ? ((curM - lastM) / lastM) * 100 : curM > 0 ? 100 : 0;

      const engagementScore =
        totalReads +
        completedReads * 2 +
        supHypes * 10 +
        stdHypes * 5 +
        totalLikes * 2 +
        totalReacts * 2 +
        totalComments * 3;

      return {
        series_slug: slug,
        title: s.title || 'Unknown Series',
        creator_name: s.creator_name || 'Saturday AM',
        cover_url: s.cover_url,
        trend_percentage: trendPct,
        page_visits: pageVisits,
        total_reads: totalReads,
        completed_reads: completedReads,
        ctr_percentage: ctr,
        total_hypes: totalHypeActions,
        standard_hypes: stdHypes,
        super_hypes: supHypes,
        total_likes: totalLikes,
        total_reacts: totalReacts,
        total_comments: totalComments,
        engagement_score: engagementScore
      };
    });

    return {
      countsSummary: {
        pureFansCount: fanProfiles.length,
        pureFansProCount: fanProfiles.filter(p => Boolean(p.is_premium)).length,
        staffCreatorsCount: staffCreatorProfiles.length,
        staffCreatorsProCount: staffCreatorProfiles.filter(p => Boolean(p.is_premium)).length,
        allAccountsCount: allProfiles.length
      },
      globalStats,
      growthStats,
      dailyTimeline: buckets,
      recentUsers,
      telemetryStats,
      engagementBreakdown,
      recentActivityFeed: feedItems.slice(0, 12),
      seriesStats
    };
  }, [rawTables, audienceMode, seriesList]);

  const sortedAndFilteredSeries = useMemo(() => {
    const list = computed?.seriesStats || [];
    const q = seriesSearch.trim().toLowerCase();
    const filtered = list.filter(
      (s: any) =>
        !q ||
        String(s.title || '')
          .toLowerCase()
          .includes(q) ||
        String(s.creator_name || '')
          .toLowerCase()
          .includes(q)
    );

    return [...filtered].sort((a: any, b: any) => {
      if (seriesSortKey === 'reads') return b.total_reads - a.total_reads;
      if (seriesSortKey === 'completed') return b.completed_reads - a.completed_reads;
      if (seriesSortKey === 'hypes') return b.total_hypes - a.total_hypes;
      if (seriesSortKey === 'likes') return b.total_likes - a.total_likes;
      if (seriesSortKey === 'ctr') return b.ctr_percentage - a.ctr_percentage;
      if (seriesSortKey === 'comments') return b.total_comments - a.total_comments;
      if (seriesSortKey === 'trend') return b.trend_percentage - a.trend_percentage;
      return b.engagement_score - a.engagement_score;
    });
  }, [computed?.seriesStats, seriesSearch, seriesSortKey]);

  const maxEngagementScore = useMemo(() => {
    const list = computed?.seriesStats || [];
    if (list.length === 0) return 1;
    return Math.max(1, ...list.map((s: any) => s.engagement_score || 0));
  }, [computed?.seriesStats]);

  const maxDailyReads = useMemo(() => {
    const list = computed?.dailyTimeline || [];
    if (list.length === 0) return 1;
    return Math.max(1, ...list.map((d: DailyChartBucket) => Math.max(d.reads, d.signups)));
  }, [computed?.dailyTimeline]);

  if (isLoading || !computed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <RefreshCw className="w-8 h-8 text-[#fe9a00] animate-spin" />
        <span className="text-zinc-400 font-black uppercase tracking-widest text-[11px]">
          Auditing Ground-Truth Fan & Creator Data...
        </span>
      </div>
    );
  }

  const {
    countsSummary,
    globalStats,
    growthStats,
    dailyTimeline,
    recentUsers,
    telemetryStats,
    engagementBreakdown,
    recentActivityFeed
  } = computed;

  const conversionRate =
    globalStats.total_users > 0
      ? ((globalStats.premium_users / globalStats.total_users) * 100).toFixed(1)
      : '0.0';

  const activeRetentionRate =
    globalStats.total_users > 0
      ? Math.min(100, (globalStats.active_30d / globalStats.total_users) * 100).toFixed(1)
      : '0.0';

  const completionRatio =
    globalStats.reads_lifetime > 0
      ? Math.min(100, (globalStats.completed_lifetime / globalStats.reads_lifetime) * 100).toFixed(
          1
        )
      : '0.0';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-6xl mx-auto relative text-white space-y-6">
      {/* ERROR DISPLAY BOX */}
      {dbError && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-1">
              Database Sync Warning
            </h3>
            <p className="text-zinc-300 text-xs font-bold leading-relaxed">{dbError}</p>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#fe9a00] text-[10px] font-black uppercase tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Saturday AM • Verified Ground-Truth Intelligence
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#fe9a00]" />
            <h2 className="text-2xl font-black uppercase italic tracking-wider text-white">
              App Growth & Engagement Engine
            </h2>
          </div>
        </div>

        {/* AUDIENCE FILTER SWITCHER (PURE FANS VS CREATORS/STAFF VS ALL) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setAudienceMode('fans_only')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                audienceMode === 'fans_only'
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Excludes all Staff, Admins, and Linked Creators from counts and charts"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Pure Fans Only ({countsSummary.pureFansCount})
            </button>

            <button
              type="button"
              onClick={() => setAudienceMode('staff_creators_only')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                audienceMode === 'staff_creators_only'
                  ? 'bg-[#fe9a00] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Inspect activity from Creators, Staff, and Admins only"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Creators & Staff ({countsSummary.staffCreatorsCount})
            </button>

            <button
              type="button"
              onClick={() => setAudienceMode('all_combined')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                audienceMode === 'all_combined'
                  ? 'bg-zinc-200 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({countsSummary.allAccountsCount})
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-zinc-800 hover:border-[#fe9a00] text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            title={`Last synced at ${lastRefreshed.toLocaleTimeString()}`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#fe9a00]" /> Refresh
          </button>
        </div>
      </div>

      {/* AUDIENCE SEPARATION SUMMARY BANNER */}
      <div className="bg-black/90 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              audienceMode === 'fans_only'
                ? 'bg-emerald-400'
                : audienceMode === 'staff_creators_only'
                ? 'bg-[#fe9a00]'
                : 'bg-blue-400'
            }`}
          />
          <span className="font-bold text-zinc-300">
            {audienceMode === 'fans_only'
              ? 'Active Filter: Pure Fans Only — All Staff, Admins & Creator accounts (and their reads/hypes/likes) are excluded.'
              : audienceMode === 'staff_creators_only'
              ? 'Active Filter: Creators & Staff Only — Viewing internal testing and creator activity.'
              : 'Active Filter: All Combined — Showing Fans + Creators + Staff together.'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shrink-0">
          <span className="text-emerald-400">
            {countsSummary.pureFansCount} Pure Fans ({countsSummary.pureFansProCount} Pro)
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-[#fe9a00]">
            {countsSummary.staffCreatorsCount} Creators/Staff ({countsSummary.staffCreatorsProCount}{' '}
            Pro)
          </span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap bg-black p-1.5 rounded-xl border border-zinc-800 gap-1.5">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'global'
              ? 'bg-[#fe9a00] text-black shadow-[0_0_20px_rgba(254,154,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Growth & Overview
        </button>

        <button
          onClick={() => setActiveTab('engagement')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'engagement'
              ? 'bg-[#fe9a00] text-black shadow-[0_0_20px_rgba(254,154,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> Feature Engagement
        </button>

        <button
          onClick={() => setActiveTab('series')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'series'
              ? 'bg-[#fe9a00] text-black shadow-[0_0_20px_rgba(254,154,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Series Performance
        </button>

        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'leaderboards'
              ? 'bg-[#fe9a00] text-black shadow-[0_0_20px_rgba(254,154,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" /> Leaderboard Archive
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: GROWTH & OVERVIEW                                              */}
      {/* ===================================================================== */}
      {activeTab === 'global' && (
        <div className="space-y-6 animate-fade-in">
          {/* EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Accounts in Active Filter */}
            <div className="bg-gradient-to-br from-black via-zinc-950 to-blue-950/20 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded-xl">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    {audienceMode === 'fans_only' ? 'Pure Fan Accounts' : 'Total Accounts'}
                  </span>
                </div>
                <TrendBadge
                  current={growthStats.newUsersMonth}
                  past={growthStats.newUsersLastMonth}
                  label="30d"
                />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-white">
                  {globalStats.total_users.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-blue-400">
                  +{growthStats.newUsersWeek} this wk
                </span>
              </div>
            </div>

            {/* Subscribers & Conversion */}
            <div className="bg-gradient-to-br from-black via-zinc-950 to-purple-950/25 border border-purple-500/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/15 border border-purple-500/30 rounded-xl">
                    <Crown className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    PLUS Subscribers
                  </span>
                </div>
                <span className="text-purple-300 font-black text-[10px] bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  {conversionRate}% Conv.
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-white">
                  {globalStats.premium_users.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-zinc-500">
                  {globalStats.free_users.toLocaleString()} Standard
                </span>
              </div>
            </div>

            {/* 30-Day Active & Stickiness */}
            <div className="bg-gradient-to-br from-black via-zinc-950 to-amber-950/25 border border-[#fe9a00]/40 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#fe9a00]/15 border border-[#fe9a00]/30 rounded-xl">
                    <Activity className="w-4 h-4 text-[#fe9a00]" />
                  </div>
                  <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest">
                    30-Day Active
                  </span>
                </div>
                <span className="text-[#fe9a00] font-black text-[10px] bg-[#fe9a00]/15 px-2 py-0.5 rounded-full">
                  {activeRetentionRate}% Active
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-white">
                  {globalStats.active_30d.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {globalStats.active_7d.toLocaleString()} in last 7d
                </span>
              </div>
            </div>

            {/* Chapters Opened vs Completed */}
            <div className="bg-gradient-to-br from-black via-zinc-950 to-emerald-950/20 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    Chapters Opened
                  </span>
                </div>
                <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  {completionRatio}% Finished
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-[#fe9a00]">
                  {globalStats.reads_lifetime.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {globalStats.completed_lifetime.toLocaleString()} 100% Read
                </span>
              </div>
            </div>
          </div>

          {/* NEW USER ACQUISITION VELOCITY ROW */}
          <div className="bg-black/80 border border-zinc-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  New Signup Velocity ({audienceMode === 'fans_only' ? 'Pure Fans' : 'Selected Audience'})
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Compared to Immediately Preceding Period
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-800/90 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                    New Signups Today
                  </span>
                  <span className="text-2xl font-black text-white">
                    +{growthStats.newUsersToday.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    Yesterday: {growthStats.newUsersYesterday}
                  </span>
                </div>
                <TrendBadge
                  current={growthStats.newUsersToday}
                  past={growthStats.newUsersYesterday}
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-800/90 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                    New Signups (Last 7 Days)
                  </span>
                  <span className="text-2xl font-black text-white">
                    +{growthStats.newUsersWeek.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    Prior 7d: {growthStats.newUsersLastWeek}
                  </span>
                </div>
                <TrendBadge
                  current={growthStats.newUsersWeek}
                  past={growthStats.newUsersLastWeek}
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-800/90 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">
                    New Signups (Last 30 Days)
                  </span>
                  <span className="text-2xl font-black text-white">
                    +{growthStats.newUsersMonth.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    Prior 30d: {growthStats.newUsersLastMonth}
                  </span>
                </div>
                <TrendBadge
                  current={growthStats.newUsersMonth}
                  past={growthStats.newUsersLastMonth}
                />
              </div>
            </div>
          </div>

          {/* 14-DAY INTERACTIVE ACTIVITY & GROWTH TIMELINE CHART */}
          <div className="bg-black/80 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#fe9a00]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">
                    14-Day Daily Activity & Signup Trajectory
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  Hover over any day to inspect daily chapter reads, 100% completions, new signups,
                  and interactions.
                </p>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-[#fe9a00]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#fe9a00]" /> Chapter Reads
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> New Signups
                </span>
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 px-2 border-b border-zinc-800">
              {dailyTimeline.map((day: DailyChartBucket) => {
                const readHeightPct = Math.max(
                  day.reads > 0 ? 8 : 2,
                  Math.round((day.reads / maxDailyReads) * 100)
                );
                const signupHeightPct = Math.max(
                  day.signups > 0 ? 8 : 2,
                  Math.round((day.signups / maxDailyReads) * 100)
                );

                return (
                  <div
                    key={day.dateKey}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap text-center">
                      <p className="text-[9px] font-black uppercase text-white">{day.label}</p>
                      <p className="text-[9px] font-bold text-[#fe9a00]">
                        {day.reads} Opened ({day.completed} Finished)
                      </p>
                      <p className="text-[9px] font-bold text-blue-400">
                        +{day.signups} New Signups • {day.engagements} Actions
                      </p>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                      <div
                        className="w-1/2 max-w-[14px] bg-gradient-to-t from-[#fe9a00]/60 to-[#fe9a00] rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${readHeightPct}%` }}
                      />
                      <div
                        className="w-1/2 max-w-[14px] bg-gradient-to-t from-blue-600/60 to-blue-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${signupHeightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between gap-1.5 sm:gap-3 pt-2 px-2">
              {dailyTimeline.map((day: DailyChartBucket) => (
                <div key={day.dateKey} className="flex-1 text-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-500 block">
                    {day.shortLabel}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600 hidden sm:block">
                    {day.label.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CHAPTER READS ACROSS TIMEFRAMES */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#fe9a00]" /> Chapter Reading Velocity (vs
              Previous Period)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#fe9a00]" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                      Today
                    </span>
                  </div>
                  <TrendBadge
                    current={globalStats.reads_today || 0}
                    past={globalStats.reads_yesterday || 0}
                  />
                </div>
                <span className="text-2xl font-black text-white">
                  {(globalStats.reads_today || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                  Yesterday: {(globalStats.reads_yesterday || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                      This Week (7d)
                    </span>
                  </div>
                  <TrendBadge
                    current={globalStats.reads_week || 0}
                    past={globalStats.reads_last_week || 0}
                  />
                </div>
                <span className="text-2xl font-black text-white">
                  {(globalStats.reads_week || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                  Prior 7d: {(globalStats.reads_last_week || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                      This Month (30d)
                    </span>
                  </div>
                  <TrendBadge
                    current={globalStats.reads_month || 0}
                    past={globalStats.reads_last_month || 0}
                  />
                </div>
                <span className="text-2xl font-black text-white">
                  {(globalStats.reads_month || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                  Prior 30d: {(globalStats.reads_last_month || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                      This Quarter (90d)
                    </span>
                  </div>
                  <TrendBadge
                    current={globalStats.reads_quarter || 0}
                    past={globalStats.reads_last_quarter || 0}
                  />
                </div>
                <span className="text-2xl font-black text-white">
                  {(globalStats.reads_quarter || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                  Prior 90d: {(globalStats.reads_last_quarter || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                      This Year (365d)
                    </span>
                  </div>
                  <TrendBadge
                    current={globalStats.reads_year || 0}
                    past={globalStats.reads_last_year || 0}
                  />
                </div>
                <span className="text-2xl font-black text-white">
                  {(globalStats.reads_year || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                  Prior Year: {(globalStats.reads_last_year || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-gradient-to-br from-black via-zinc-950 to-amber-950/30 border border-[#fe9a00]/40 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest">
                      100% Completed Chapters
                    </span>
                  </div>
                </div>
                <span className="text-2xl font-black text-[#fe9a00]">
                  {globalStats.completed_lifetime.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                  Out of {globalStats.reads_lifetime.toLocaleString()} Opened ({completionRatio}%)
                </span>
              </div>
            </div>
          </div>

          {/* RECENT USER SIGNUPS & TELEMETRY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent User Signups */}
            <div className="lg:col-span-7 bg-black/80 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#fe9a00]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">
                    Newest Accounts ({audienceMode === 'fans_only' ? 'Pure Fans' : 'Selected View'})
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Latest 8 Signups
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentUsers.map((u: any, idx: number) => (
                  <div
                    key={u.id || idx}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          u.avatar_url ||
                          `${CLOUDFLARE_BASE_URL}/other%20icons/AM%20Hype%20icon%20full.png`
                        }
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">
                          {u.username || u.first_name || u.email?.split('@')[0] || 'Reader'}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-bold truncate">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'Recent'}{' '}
                          • Score: {u.fandom_score || 0}
                        </p>
                      </div>
                    </div>

                    {u.is_premium ? (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[8px] font-black uppercase tracking-widest shrink-0">
                        PLUS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 text-[8px] font-black uppercase tracking-widest shrink-0">
                        FREE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Telemetry Snapshot */}
            <div className="lg:col-span-5 bg-black/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#fe9a00]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">
                      Verified Session Telemetry
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                        Unique Sessions
                      </span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {(telemetryStats?.total_sessions || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3 h-3 text-zinc-500" />
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                        Unique Visitors
                      </span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {(telemetryStats?.unique_visitors || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShoppingCart className="w-3 h-3 text-zinc-500" />
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                        Shop Clicks
                      </span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {(telemetryStats?.store_visits || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MousePointerClick className="w-3 h-3 text-zinc-500" />
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                        Banner Clicks
                      </span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {(telemetryStats?.banner_clicks || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                <span>Standard vs. PLUS Split:</span>
                <span className="text-white font-black">
                  {globalStats.free_users} Free • {globalStats.premium_users} PLUS ({conversionRate}
                  %)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: FEATURE ENGAGEMENT (WHAT USERS ARE ENGAGING WITH)              */}
      {/* ===================================================================== */}
      {activeTab === 'engagement' && (
        <div className="space-y-6 animate-fade-in">
          {/* ENGAGEMENT PILLARS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-black border border-zinc-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-[#fe9a00] mb-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Chapters Opened
                </span>
              </div>
              <p className="text-2xl font-black text-white">
                {engagementBreakdown.chapterReads.toLocaleString()}
              </p>
              <p className="text-[9px] text-emerald-400 font-bold mt-1">
                {engagementBreakdown.completedChapters.toLocaleString()} finished 100%
              </p>
            </div>

            <div className="bg-black border border-zinc-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Flame className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Standard Hypes
                </span>
              </div>
              <p className="text-2xl font-black text-white">
                {engagementBreakdown.standardHypes.toLocaleString()}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">
                Ch:{engagementBreakdown.hypesByTarget.chapter} • Ser:
                {engagementBreakdown.hypesByTarget.series} • Chr:
                {engagementBreakdown.hypesByTarget.character} • Cr:
                {engagementBreakdown.hypesByTarget.creator}
              </p>
            </div>

            <div className="bg-black border border-purple-500/30 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Super Hypes</span>
              </div>
              <p className="text-2xl font-black text-white">
                {engagementBreakdown.superHypes.toLocaleString()}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">
                De-duplicated (+10 Score)
              </p>
            </div>

            <div className="bg-black border border-zinc-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Smart Comments
                </span>
              </div>
              <p className="text-2xl font-black text-white">
                {engagementBreakdown.quickReacts.toLocaleString()}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">In-reader page reactions</p>
            </div>

            <div className="bg-black border border-zinc-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <Heart className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Total Likes</span>
              </div>
              <p className="text-2xl font-black text-white">
                {engagementBreakdown.totalLikes.toLocaleString()}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">
                Ser:{engagementBreakdown.seriesLikes} • Ch:{engagementBreakdown.chapterLikes} • Chr:
                {engagementBreakdown.characterLikes} • Cr:{engagementBreakdown.creatorLikes}
              </p>
            </div>

            <div className="bg-black border border-emerald-500/30 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Creator Tips
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-400">
                ${engagementBreakdown.creatorTipsDollars.toLocaleString()}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">
                {engagementBreakdown.creatorTipsCount} direct fan tips
              </p>
            </div>
          </div>

          {/* INTERACTION DISTRIBUTION + LIVE COMMUNITY ACTIVITY FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Visual Feature Share */}
            <div className="lg:col-span-6 bg-black/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#fe9a00]">
                  How Fans Interact With Content
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  De-duplicated breakdown of non-read community actions across all app features.
                </p>
              </div>

              {(() => {
                const items = [
                  {
                    label: 'Standard Hypes (Chapters, Series, Characters, Creators)',
                    count: engagementBreakdown.standardHypes,
                    color: 'bg-[#fe9a00]'
                  },
                  {
                    label: 'Total Heart Likes (Series, Chapters, Characters, Creators)',
                    count: engagementBreakdown.totalLikes,
                    color: 'bg-red-500'
                  },
                  {
                    label: 'In-Reader Smart Comments (Page Quick Reacts)',
                    count: engagementBreakdown.quickReacts,
                    color: 'bg-cyan-400'
                  },
                  {
                    label: 'Super Hypes (Main Series Boosts)',
                    count: engagementBreakdown.superHypes,
                    color: 'bg-purple-500'
                  },
                  {
                    label: 'Series Discussion Comments',
                    count: engagementBreakdown.comments,
                    color: 'bg-blue-400'
                  },
                  {
                    label: 'Direct Creator Tips & Fanmail',
                    count: engagementBreakdown.creatorTipsCount,
                    color: 'bg-emerald-400'
                  }
                ];
                const totalActions = Math.max(
                  1,
                  items.reduce((acc, i) => acc + i.count, 0)
                );

                return (
                  <div className="space-y-3.5 pt-2">
                    {items.map(item => {
                      const pct = Math.round((item.count / totalActions) * 100);
                      return (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-300">{item.label}</span>
                            <span className="text-white font-black">
                              {item.count.toLocaleString()}{' '}
                              <span className="text-zinc-500 text-[10px]">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(item.count > 0 ? 4 : 0, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Right: Live Community Pulse */}
            <div className="lg:col-span-6 bg-black/80 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">
                    Recent Community Activity Pulse
                  </h3>
                </div>
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                  {audienceMode === 'fans_only' ? 'Pure Fans Stream' : 'Live Stream'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {recentActivityFeed.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-bold py-8 text-center">
                    No recent activity events recorded for this filter.
                  </p>
                ) : (
                  recentActivityFeed.map((ev: any, i: number) => (
                    <div
                      key={i}
                      className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            ev.type === 'tip'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : ev.type === 'super_hype'
                              ? 'bg-purple-500/20 text-purple-400'
                              : ev.type === 'comment'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[#fe9a00]/20 text-[#fe9a00]'
                          }`}
                        >
                          {ev.type === 'tip' ? (
                            <DollarSign className="w-3.5 h-3.5" />
                          ) : ev.type === 'super_hype' ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : ev.type === 'comment' ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white leading-snug">{ev.label}</p>
                          {ev.sub && (
                            <p className="text-[10px] text-zinc-400 italic truncate mt-0.5">
                              {ev.sub}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-bold whitespace-nowrap shrink-0">
                        {new Date(ev.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SERIES PERFORMANCE & ENGAGEMENT RANKINGS                       */}
      {/* ===================================================================== */}
      {activeTab === 'series' && (
        <div className="space-y-6 animate-fade-in">
          {/* TOP 3 ENGAGED SERIES PODIUM */}
          {sortedAndFilteredSeries.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedAndFilteredSeries.slice(0, 3).map((topSeries: any, idx: number) => (
                <div
                  key={topSeries.series_slug}
                  className={`p-4 rounded-2xl border flex items-center gap-4 relative overflow-hidden ${
                    idx === 0
                      ? 'bg-gradient-to-br from-amber-950/40 via-black to-zinc-950 border-[#fe9a00]'
                      : 'bg-black/80 border-zinc-800'
                  }`}
                >
                  <img
                    src={
                      topSeries.cover_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`
                    }
                    alt={topSeries.title}
                    className="w-14 h-20 rounded-xl object-cover border border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1 ${
                        idx === 0
                          ? 'bg-[#fe9a00] text-black'
                          : idx === 1
                          ? 'bg-zinc-300 text-black'
                          : 'bg-amber-700 text-white'
                      }`}
                    >
                      #{idx + 1} Most Engaged
                    </span>
                    <h4 className="text-sm font-black uppercase italic text-white truncate">
                      {topSeries.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-bold text-zinc-400">
                      <span className="text-[#fe9a00]">
                        {topSeries.total_reads.toLocaleString()} Reads
                      </span>
                      <span>•</span>
                      <span>{topSeries.total_hypes.toLocaleString()} Hypes</span>
                      <span>•</span>
                      <span className="text-red-400">
                        {topSeries.total_likes.toLocaleString()} Likes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEARCH & SORT CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/80 border border-zinc-800 p-4 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search series title or creator..."
                value={seriesSearch}
                onChange={e => setSeriesSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-1">
                Sort By:
              </span>
              {[
                { key: 'score', label: 'Overall Score' },
                { key: 'reads', label: 'Opened Reads' },
                { key: 'completed', label: '100% Finished' },
                { key: 'hypes', label: 'Hypes' },
                { key: 'likes', label: 'Likes' },
                { key: 'ctr', label: 'CTR %' },
                { key: 'comments', label: 'Comments' },
                { key: 'trend', label: 'MoM Trend' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSeriesSortKey(opt.key as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors border ${
                    seriesSortKey === opt.key
                      ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* SERIES PERFORMANCE TABLE */}
          <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800">
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 w-12 text-center">
                      #
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      Series & Engagement Share
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">
                      Trend <span className="lowercase font-bold">(MoM)</span>
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">
                      <Eye className="w-3 h-3 inline mb-0.5" /> Visits
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[#fe9a00] text-right">
                      Opened Reads
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-emerald-400 text-right">
                      100% Finished
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-blue-400 text-right">
                      <Filter className="w-3 h-3 inline mb-0.5" /> Reader CTR
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">
                      <Flame className="w-3 h-3 inline mb-0.5 text-[#fe9a00]" /> Hypes (Sup/Std)
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-red-400 text-right">
                      <Heart className="w-3 h-3 inline mb-0.5" /> Likes
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">
                      Smart Reacts
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">
                      <MessageSquare className="w-3 h-3 inline mb-0.5" /> Comments
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {sortedAndFilteredSeries.map((series: any, index: number) => {
                    const barPct = Math.max(
                      4,
                      Math.round(((series.engagement_score || 0) / maxEngagementScore) * 100)
                    );
                    return (
                      <tr
                        key={series.series_slug || index}
                        className="hover:bg-zinc-900/60 transition-colors group"
                      >
                        <td className="p-4 text-center font-black italic text-zinc-500 group-hover:text-white">
                          {index + 1}
                        </td>
                        <td className="p-4 min-w-[230px]">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                series.cover_url ||
                                `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`
                              }
                              className="w-9 h-12 rounded-lg object-cover border border-zinc-700 shrink-0"
                              alt="Cover"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-sm text-white block truncate">
                                {series.title || 'Unknown Series'}
                              </span>
                              <div className="w-full max-w-[170px] h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className="h-full bg-gradient-to-r from-[#fe9a00] to-amber-400 rounded-full"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <SqlTrendBadge pct={series.trend_percentage || 0} />
                        </td>
                        <td className="p-4 text-right font-bold text-zinc-300">
                          {(Number(series.page_visits) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-black tracking-wider text-[#fe9a00] text-sm">
                          {(Number(series.total_reads) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400">
                          {(Number(series.completed_reads) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-blue-400 bg-blue-950/15">
                          {(Number(series.ctr_percentage) || 0).toFixed(1)}%
                        </td>
                        <td className="p-4 text-right font-bold text-zinc-200">
                          {(Number(series.total_hypes) || 0).toLocaleString()}{' '}
                          <span className="text-[10px] text-zinc-500">
                            ({series.super_hypes}/{series.standard_hypes})
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-red-400">
                          {(Number(series.total_likes) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-zinc-400">
                          {(Number(series.total_reacts) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-zinc-400">
                          {(Number(series.total_comments) || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedAndFilteredSeries.length === 0 && !dbError && (
              <div className="p-10 text-center text-zinc-500 font-bold text-xs tracking-widest uppercase">
                No matching series found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: LEADERBOARD ARCHIVE                                            */}
      {/* ===================================================================== */}
      {activeTab === 'leaderboards' && <AdminLeaderboardHistory />}
    </div>
  );
};