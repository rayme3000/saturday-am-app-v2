import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trophy,
  Crown,
  Star,
  Zap,
  Activity,
  TrendingUp,
  Calendar,
  Users,
  PenTool,
  BookOpen,
  Library,
  User,
  Flame,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase, trackTelemetry } from '../supabase';
import { DecoratedAvatar } from '../Components/DecoratedAvatar';
import { FeatureTutorialModal, TutorialHelpButton } from '../Components/FeatureTutorialModal';

const getLocalCalendarDateKey = (dateObj = new Date()): string => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const leaderboardTutorialSlides = [
  {
    id: 'leaderboard-1',
    title: 'Global Rankings',
    description:
      'Boost series and creators by supporting creators, completing chapters, dropping Hypes, logging in daily, commenting on series, leaving Smart Comments, and liking content! Your monthly interactions earn Monthly Fandom Points, helping you climb into the Top 5 Most Hype Fans to win monthly prizes. Your all-time Fandom Score stays permanently saved on your Profile & Hype Card!',
    mediaUrl:
      'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Videos/Leaderboard.mp4'
  }
];

const EXCLUDED_STAFF_ADMIN_EMAILS = new Set([
  'odunze.oguguo@yahoo.com',
  'saturday.editorial@gmail.com',
  'demetrene.billups@gmail.com',
  'publisher@saturday-am.com',
  'rayme3000@gmail.com',
  'saturdayam.writer@gmail.com',
  'dropkickanimation@gmail.com',
  'fsimmonds4@gmail.com'
]);

const EXCLUDED_TEST_STAFF_IDS = new Set([
  'abaf26d1-c0d6-4d70-bbbe-9e1784366257', // AMAPPTEST1
  '53bf553c-425a-4d1c-978f-e6bc93910099', // AMAPPTEST2
  'c1bc4936-b192-45bb-a5c7-57900d24a030', // AMAPPTEST3
  '35c470b1-df48-4aa1-bd1c-68a0eb26ee92', // AMAPPTEST5
  '203b25d6-7c80-4161-9a13-debd7299982c', // AMAPPTEST6
  '79cf838d-a214-4d87-a036-b62328547840', // AMTEST5
  '829bc0be-6b8e-42cf-ab61-54624c785c69', // Freeaccount3000
  '6aa6e204-59eb-4444-8fc5-f95d628c16ab'  // rayme3000
]);

const EXCLUDED_TEST_STAFF_USERNAMES = new Set([
  'sano2026',
  'freemium3000',
  'freeaccount3000',
  'rayme3000',
  'fred@saturday.a',
  'fredtest1',
  'fred_test_2',
  'billsup2000',
  'amapptest1',
  'amapptest2',
  'amapptest3',
  'amapptest4',
  'amapptest5',
  'amapptest6',
  'amtest5',
  'erick pedrucci',
  'franksimmonds',
  'jeyodin',
  'odunzeoguguo',
  'oscar fong',
  'stefanoromano',
  'whyt manga'
]);

const GENERIC_PLACEHOLDER_USERNAMES = new Set([
  '',
  'saturday fan',
  'unnamed reader',
  'reader',
  'user',
  'anonymous',
  'null',
  'undefined'
]);

const EXCLUDED_LEADERBOARD_ROLES = new Set([
  'creator',
  'core_creator',
  'staff',
  'influencer',
  'admin',
  'moderator'
]);

const isExcludedStaffOrTestAccount = (p: any): boolean => {
  if (!p) return false;
  const uid = String(p.id || p.user_id || '').trim();
  const role = String(p.role || 'reader').trim().toLowerCase();
  const email = String(p.email || '').trim().toLowerCase();
  const username = String(p.username || '').trim().toLowerCase();
  const hasLinkedCreator = Boolean(String(p.linked_creator_name || '').trim());

  return (
    Boolean(p.is_admin) ||
    hasLinkedCreator ||
    EXCLUDED_TEST_STAFF_IDS.has(uid) ||
    EXCLUDED_LEADERBOARD_ROLES.has(role) ||
    EXCLUDED_STAFF_ADMIN_EMAILS.has(email) ||
    EXCLUDED_TEST_STAFF_USERNAMES.has(username) ||
    username.includes('test') ||
    email.includes('test')
  );
};

const hasValidUniqueFanUsername = (p: any): boolean => {
  const uname = String(p?.username || '').trim().toLowerCase();
  if (!uname || GENERIC_PLACEHOLDER_USERNAMES.has(uname)) return false;
  return true;
};

const getCurrentMonthWindow = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    startIso: startOfMonth.toISOString(),
    endMs: startOfNextMonth.getTime(),
    label,
    monthKey
  };
};

const formatMonthlyResetCountdown = (targetMs: number) => {
  const diff = Math.max(0, targetMs - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    mins: String(mins).padStart(2, '0'),
    secs: String(secs).padStart(2, '0')
  };
};

interface MilestoneNotificationData {
  milestoneTier: 10 | 15 | 25;
  currentRank: number;
  title: string;
  headline: string;
  isPlusUser: boolean;
}

export default function Leaderboard({ onBack, currentUser, onNavigate }: any) {
  const { seriesList = [] } = useSeriesData();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'fans'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [forceTutorial, setForceTutorial] = useState(false);

  const [superFans, setSuperFans] = useState<any[]>([]);
  const [big3, setBig3] = useState<any[]>([]);
  const [big3Creators, setBig3Creators] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [currentMonthLabel, setCurrentMonthLabel] = useState<string>('');
  const [resetTargetMs, setResetTargetMs] = useState<number>(() => getCurrentMonthWindow().endMs);
  const [countdown, setCountdown] = useState(() =>
    formatMonthlyResetCountdown(getCurrentMonthWindow().endMs)
  );
  const [milestoneModal, setMilestoneModal] = useState<MilestoneNotificationData | null>(null);
  const [dayTick, setDayTick] = useState(() => getLocalCalendarDateKey());

  const [topSeries, setTopSeries] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [topCharacters, setTopCharacters] = useState<any[]>([]);
  const [topWeeklyChapters, setTopWeeklyChapters] = useState<any[]>([]);

  // 1-second live countdown ticker + midnight rollover detector
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatMonthlyResetCountdown(resetTargetMs));
      const currentDayKey = getLocalCalendarDateKey();
      setDayTick(prev => (prev !== currentDayKey ? currentDayKey : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetTargetMs]);

  useEffect(() => {
    trackTelemetry('leaderboard_visit', {
      tab: activeTab,
      user_id: currentUser?.id || null
    });
  }, [activeTab, currentUser?.id]);

  // Award +5 Fandom Points once per local calendar day — even if the user stays logged in across midnight!
  useEffect(() => {
    if (!currentUser?.id) return;

    const checkAndAwardDailyLogin = () => {
      const todayKey = getLocalCalendarDateKey();
      const storageKey = `am_daily_login_pts_${currentUser.id}_${todayKey}`;
      if (localStorage.getItem(storageKey)) return;

      localStorage.setItem(storageKey, '1');
      trackTelemetry('daily_login_bonus', { user_id: currentUser.id, date: todayKey });

      supabase
        .from('profiles')
        .select('fandom_score')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('profiles')
              .update({ fandom_score: (Number(data.fandom_score) || 0) + 5 })
              .eq('id', currentUser.id)
              .then(() => window.dispatchEvent(new Event('profileUpdated')));
          }
        });
    };

    checkAndAwardDailyLogin();

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndAwardDailyLogin();
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [currentUser?.id, dayTick]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);

      try {
        const now = new Date();
        const lastSaturday = new Date(now);
        lastSaturday.setDate(now.getDate() - ((now.getDay() + 1) % 7));
        lastSaturday.setHours(0, 0, 0, 0);
        const lastSaturdayIso = lastSaturday.toISOString();

        const { startIso: monthStartIso, endMs, label: monthLabel, monthKey } =
          getCurrentMonthWindow();
        setCurrentMonthLabel(monthLabel);
        setResetTargetMs(endMs);
        setCountdown(formatMonthlyResetCountdown(endMs));

        // 0. FETCH ALL PROFILES TO FILTER STAFF/CREATORS/TESTS AND MAP PURE FANS
        const { data: allProfilesMeta } = await supabase
          .from('profiles')
          .select(
            'id, username, avatar_url, avatar_frame_id, is_premium, fandom_score, quick_reacts, chapters_read, total_hypes, role, is_admin, email, linked_creator_name'
          );

        const excludedUserIds = new Set<string>(EXCLUDED_TEST_STAFF_IDS);
        const profileById = new Map<string, any>();

        (allProfilesMeta || []).forEach((p: any) => {
          profileById.set(String(p.id), p);
          if (isExcludedStaffOrTestAccount(p)) {
            excludedUserIds.add(String(p.id));
          }
        });

        const isFanActivity = (row: any) => {
          const uid = row?.user_id || row?.id;
          if (!uid) return true;
          return !excludedUserIds.has(String(uid));
        };

        // 1. FETCH CURRENT MONTH ACTIVITY ACROSS ALL ENGAGEMENT TABLES FOR MONTHLY FAN RACE
        const [
          monthlyCompletedReadsRes,
          monthlyReadingHistoryRes,
          monthlyHypesRes,
          monthlyReactsRes,
          monthlyCommentsRes,
          monthlySeriesLikesRes,
          monthlyChapterLikesRes,
          monthlyCharLikesRes,
          monthlyCreatorLikesRes,
          monthlyTipsRes,
          monthlyTelemetryRes
        ] = await Promise.all([
          supabase
            .from('completed_reads')
            .select('user_id, chapter_id, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('reading_history')
            .select('user_id, updated_at')
            .gte('updated_at', monthStartIso),
          supabase
            .from('hypes')
            .select('user_id, target_type, target_id, created_at')
            .neq('target_type', 'comment')
            .gte('created_at', monthStartIso),
          supabase
            .from('page_reacts')
            .select('user_id, chapter_id, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('series_comments')
            .select('user_id, series_slug, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('series_likes')
            .select('user_id, series_slug, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('chapter_likes')
            .select('user_id, chapter_id, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('character_likes')
            .select('user_id, character_id, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('creator_likes')
            .select('user_id, creator_id, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('creator_tips')
            .select('user_id, amount_dollars, created_at')
            .gte('created_at', monthStartIso),
          supabase
            .from('telemetry_events')
            .select('user_id, created_at')
            .not('user_id', 'is', null)
            .gte('created_at', monthStartIso)
            .limit(15000)
        ]);

        const monthlyFanScores = new Map<string, number>();
        const activeLoginDaysByUser = new Map<string, Set<string>>();

        const addMonthlyPoints = (uidRaw: any, pts: number) => {
          const uid = String(uidRaw || '').trim();
          if (!uid || excludedUserIds.has(uid)) return;
          monthlyFanScores.set(uid, (monthlyFanScores.get(uid) || 0) + pts);
        };

        const registerUserLoginDay = (uidRaw: any, rawDate: any) => {
          const uid = String(uidRaw || '').trim();
          if (!uid || !rawDate || excludedUserIds.has(uid)) return;
          const parsed = new Date(rawDate);
          const dayStr = !isNaN(parsed.getTime())
            ? getLocalCalendarDateKey(parsed)
            : String(rawDate).slice(0, 10);
          if (!dayStr) return;
          if (!activeLoginDaysByUser.has(uid)) {
            activeLoginDaysByUser.set(uid, new Set());
          }
          activeLoginDaysByUser.get(uid)!.add(dayStr);
        };

        // Direct Creator Tips (+10 pts min or 2x dollar amount)
        (monthlyTipsRes.data || []).forEach((t: any) => {
          const amt = Number(t.amount_dollars || 5);
          addMonthlyPoints(t.user_id, Math.max(10, amt * 2));
          registerUserLoginDay(t.user_id, t.created_at);
        });

        // Completed Chapter Reads (+10 pts per unique chapter read this month)
        const seenMonthlyReads = new Set<string>();
        (monthlyCompletedReadsRes.data || []).forEach((r: any) => {
          const key = `${r.user_id}_${r.chapter_id}`;
          if (!seenMonthlyReads.has(key)) {
            seenMonthlyReads.add(key);
            addMonthlyPoints(r.user_id, 10);
          }
          registerUserLoginDay(r.user_id, r.created_at);
        });

        // All Hypes (+10 pts each)
        (monthlyHypesRes.data || []).forEach((h: any) => {
          addMonthlyPoints(h.user_id, 10);
          registerUserLoginDay(h.user_id, h.created_at);
        });

        // Series Discussion Comments (+3 pts)
        (monthlyCommentsRes.data || []).forEach((c: any) => {
          addMonthlyPoints(c.user_id, 3);
          registerUserLoginDay(c.user_id, c.created_at);
        });

        // Smart Comments / Page Quick Reacts (+2 pts)
        (monthlyReactsRes.data || []).forEach((pr: any) => {
          addMonthlyPoints(pr.user_id, 2);
          registerUserLoginDay(pr.user_id, pr.created_at);
        });

        // Likes (+1 pt each)
        (monthlySeriesLikesRes.data || []).forEach((l: any) => {
          addMonthlyPoints(l.user_id, 1);
          registerUserLoginDay(l.user_id, l.created_at);
        });
        (monthlyChapterLikesRes.data || []).forEach((l: any) => {
          addMonthlyPoints(l.user_id, 1);
          registerUserLoginDay(l.user_id, l.created_at);
        });
        (monthlyCharLikesRes.data || []).forEach((l: any) => {
          addMonthlyPoints(l.user_id, 1);
          registerUserLoginDay(l.user_id, l.created_at);
        });
        (monthlyCreatorLikesRes.data || []).forEach((l: any) => {
          addMonthlyPoints(l.user_id, 1);
          registerUserLoginDay(l.user_id, l.created_at);
        });

        // Also count reading history & telemetry sessions for Daily Login Days (+5 pts per unique active day)
        (monthlyReadingHistoryRes.data || []).forEach((rh: any) => {
          registerUserLoginDay(rh.user_id, rh.updated_at);
        });
        (monthlyTelemetryRes.data || []).forEach((te: any) => {
          registerUserLoginDay(te.user_id, te.created_at);
        });

        if (currentUser?.id && !excludedUserIds.has(String(currentUser.id))) {
          registerUserLoginDay(currentUser.id, now.toISOString());
        }

        // Award +5 pts per unique daily login in the current month
        activeLoginDaysByUser.forEach((daysSet, uid) => {
          if (daysSet.size > 0) {
            addMonthlyPoints(uid, daysSet.size * 5);
          }
        });

        // Build deduplicated Top 10 Pure Fans list (prioritizing Monthly Points, backfilling up to 10 slots)
        const seenUsernames = new Set<string>();
        const seenIds = new Set<string>();
        const allPureFanCandidates: any[] = [];

        (allProfilesMeta || []).forEach((p: any) => {
          const cid = String(p.id || '').trim();
          if (!cid || excludedUserIds.has(cid) || isExcludedStaffOrTestAccount(p)) return;
          if (!hasValidUniqueFanUsername(p)) return;

          const monthlyPts = monthlyFanScores.get(cid) || 0;
          const lifetimePts = Number(p.fandom_score || 0);
          if (monthlyPts <= 0 && lifetimePts <= 0) return;

          allPureFanCandidates.push({
            id: cid,
            username: String(p.username).trim(),
            avatar_url: p.avatar_url || '',
            frame_id: p.frame_id || p.avatar_frame_id || 'none',
            is_premium: Boolean(p.is_premium),
            score: monthlyPts,
            lifetimeScore: lifetimePts
          });
        });

        allPureFanCandidates.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.lifetimeScore - a.lifetimeScore;
        });

        const finalFans: any[] = [];
        for (const cand of allPureFanCandidates) {
          const lowerName = cand.username.toLowerCase();
          if (seenIds.has(cand.id) || seenUsernames.has(lowerName)) continue;
          seenIds.add(cand.id);
          seenUsernames.add(lowerName);
          finalFans.push(cand);
          if (finalFans.length >= 10) break;
        }

        const formattedTop10 = finalFans.slice(0, 10).map((fan: any, index: number) => {
          let rankClass = 'C-Class Rank';
          if (index < 3) rankClass = 'S-Class Rank';
          else if (index < 6) rankClass = 'A-Class Rank';
          else if (index < 9) rankClass = 'B-Class Rank';
          return {
            ...fan,
            rank: index + 1,
            class: rankClass,
            isMostHypeTop5: index < 5
          };
        });

        setSuperFans(formattedTop10);

        // 2. PERSONAL USER RANK & AUTOMATIC MILESTONE NOTIFICATIONS (RANK 25, RANK 15, RANK 10)
        if (currentUser?.id) {
          const myProfile = profileById.get(String(currentUser.id));
          const isCurrentUserExcluded =
            isExcludedStaffOrTestAccount(currentUser) ||
            (myProfile && isExcludedStaffOrTestAccount(myProfile)) ||
            excludedUserIds.has(String(currentUser.id));

          const myMonthlyScore = monthlyFanScores.get(String(currentUser.id)) || 0;
          const myLifetimeScore = Number(
            myProfile?.fandom_score ?? currentUser.fandom_score ?? 0
          );
          const isPlusUser = Boolean(currentUser?.is_premium || myProfile?.is_premium);

          if (isCurrentUserExcluded) {
            setUserRank({
              rank: null,
              isExcludedStaffOrCreator: true,
              score: myMonthlyScore,
              lifetimeScore: myLifetimeScore,
              class: 'Official Creator / Staff'
            });
          } else {
            const higherUniqueNames = new Set<string>();
            allPureFanCandidates.forEach(c => {
              if (c.id === String(currentUser.id)) return;
              if (
                c.score > myMonthlyScore ||
                (c.score === myMonthlyScore && c.lifetimeScore > myLifetimeScore)
              ) {
                higherUniqueNames.add(c.username.toLowerCase());
              }
            });

            const myRank = higherUniqueNames.size + 1;
            let myClass = 'C-Class Rank';
            if (myRank <= 3) myClass = 'S-Class Rank';
            else if (myRank <= 6) myClass = 'A-Class Rank';
            else if (myRank <= 9) myClass = 'B-Class Rank';

            setUserRank({
              rank: myRank,
              score: myMonthlyScore,
              lifetimeScore: myLifetimeScore,
              class: myClass,
              isExcludedStaffOrCreator: false
            });

            // Check if the user has reached a Rank Milestone (Rank 10, Rank 15, or Rank 25) this month
            if (myMonthlyScore > 0 && myRank <= 25) {
              let milestoneTier: 10 | 15 | 25 | null = null;
              let title = '';
              let headline = '';

              if (myRank <= 10) {
                milestoneTier = 10;
                title = `Congrats! You Reached Rank #${myRank}!`;
                headline =
                  "You're in the Top 10 and almost in the run to be one of the Top 5 Most Hype Fans of the Month!";
              } else if (myRank <= 15) {
                milestoneTier = 15;
                title = `Congrats! You Reached Rank #${myRank}!`;
                headline =
                  "You're almost in the Top 10! Keep the momentum going to break into the top tier!";
              } else if (myRank <= 25) {
                milestoneTier = 25;
                title = `Congrats! You Reached Rank #${myRank}!`;
                headline =
                  "You're almost in the Top 20! Keep hyping and reading to climb the monthly leaderboard!";
              }

              if (milestoneTier) {
                const seenMilestoneKey = `am_rank_milestone_${monthKey}_${currentUser.id}_tier_${milestoneTier}`;
                if (!localStorage.getItem(seenMilestoneKey)) {
                  localStorage.setItem(seenMilestoneKey, 'true');
                  setMilestoneModal({
                    milestoneTier,
                    currentRank: myRank,
                    title,
                    headline,
                    isPlusUser
                  });
                }
              }
            }
          }
        }

        // 3. BIG 3 MONTHLY SERIES (Current Month Series Hypes +10 pts each + Total Hype Fallback)
        const monthlyHypes = (monthlyHypesRes.data || []).filter(isFanActivity);

        if (seriesList.length > 0) {
          const hypeCounts: Record<string, number> = {};
          monthlyHypes.forEach((h: any) => {
            if (h.target_type === 'series' && h.target_id) {
              hypeCounts[h.target_id] = (hypeCounts[h.target_id] || 0) + 10;
            }
          });

          const rankedBig3 = seriesList
            .filter((s: any) => !s.is_hidden)
            .map((s: any) => ({
              ...s,
              hypeScore: (hypeCounts[s.slug] || 0) + (s.total_hype || s.hype_count || 0)
            }))
            .sort((a: any, b: any) => b.hypeScore - a.hypeScore);

          setBig3(rankedBig3.slice(0, 3));
        }

        // 4. WEEKLY SERIES HYPES (Fan-Only Weekly Series Hypes +10 pts + Weekly Series Likes +1 pt)
        const [weeklySeriesHypesRes, weeklySeriesLikesRes] = await Promise.all([
          supabase
            .from('hypes')
            .select('target_id, created_at, user_id')
            .eq('target_type', 'series')
            .gte('created_at', lastSaturdayIso),
          supabase
            .from('series_likes')
            .select('series_slug, created_at, user_id')
            .gte('created_at', lastSaturdayIso)
        ]);

        if (seriesList.length > 0) {
          const seriesWeeklyMap: Record<string, number> = {};

          (weeklySeriesHypesRes.data || []).filter(isFanActivity).forEach((h: any) => {
            const key = h.target_id;
            if (key) seriesWeeklyMap[key] = (seriesWeeklyMap[key] || 0) + 10;
          });

          (weeklySeriesLikesRes.data || []).filter(isFanActivity).forEach((l: any) => {
            if (l.series_slug) {
              seriesWeeklyMap[l.series_slug] = (seriesWeeklyMap[l.series_slug] || 0) + 1;
            }
          });

          const weeklyRankedSeries = [...seriesList]
            .filter((s: any) => !s.is_hidden)
            .map((s: any) => ({
              ...s,
              hypeScore: Math.max(seriesWeeklyMap[s.slug] || 0, s.weekly_hype || 0)
            }))
            .sort((a: any, b: any) => b.hypeScore - a.hypeScore);

          setTopSeries(weeklyRankedSeries.slice(0, 5));
        }

        // 5. WEEKLY CREATOR HYPES (+10 pts) & Likes (+1 pt, Fan-Only)
        const [allCreatorHypesRes, allCreatorLikesRes, allCreatorsDataRes] = await Promise.all([
          supabase
            .from('hypes')
            .select('target_id, created_at, user_id')
            .eq('target_type', 'creator')
            .gte('created_at', lastSaturdayIso),
          supabase
            .from('creator_likes')
            .select('creator_id, created_at, user_id')
            .gte('created_at', lastSaturdayIso),
          supabase
            .from('series_creators')
            .select('name, avatar_url, role, series_slug')
            .eq('is_visible', true)
        ]);

        const allCreatorsData = allCreatorsDataRes.data;
        if (allCreatorsData) {
          const creatorHypeCounts: Record<string, number> = {};
          (allCreatorHypesRes.data || []).filter(isFanActivity).forEach((h: any) => {
            creatorHypeCounts[h.target_id] = (creatorHypeCounts[h.target_id] || 0) + 10;
          });
          (allCreatorLikesRes.data || []).filter(isFanActivity).forEach((l: any) => {
            creatorHypeCounts[l.creator_id] = (creatorHypeCounts[l.creator_id] || 0) + 1;
          });

          const uniqueCreatorsMap = new Map();
          allCreatorsData.forEach((c: any) => {
            if (!uniqueCreatorsMap.has(c.name)) uniqueCreatorsMap.set(c.name, c);
          });

          const rankedCreators = Array.from(uniqueCreatorsMap.values())
            .map((c: any) => ({ ...c, hypeScore: creatorHypeCounts[c.name] || 0 }))
            .sort((a, b) => b.hypeScore - a.hypeScore)
            .slice(0, 5);

          setTopCreators(rankedCreators);
        }

        // 6. WEEKLY CHARACTER HYPES (+10 pts) & Likes (+1 pt, Fan-Only)
        const [allCharHypesRes, allCharLikesRes, allCharsDataRes] = await Promise.all([
          supabase
            .from('hypes')
            .select('target_id, created_at, user_id')
            .eq('target_type', 'character')
            .gte('created_at', lastSaturdayIso),
          supabase
            .from('character_likes')
            .select('character_id, created_at, user_id')
            .gte('created_at', lastSaturdayIso),
          supabase
            .from('series_characters')
            .select('id, name, headshot_url, series_slug')
            .eq('is_hidden', false)
        ]);

        const allCharsData = allCharsDataRes.data;
        if (allCharsData) {
          const charHypeCounts: Record<string, number> = {};
          (allCharHypesRes.data || []).filter(isFanActivity).forEach((h: any) => {
            charHypeCounts[String(h.target_id)] =
              (charHypeCounts[String(h.target_id)] || 0) + 10;
          });
          (allCharLikesRes.data || []).filter(isFanActivity).forEach((l: any) => {
            charHypeCounts[String(l.character_id)] =
              (charHypeCounts[String(l.character_id)] || 0) + 1;
          });

          const rankedChars = allCharsData
            .map((c: any) => {
              const sTitle =
                seriesList.find((s: any) => s.slug === c.series_slug)?.title ||
                'Unknown Series';
              return {
                ...c,
                series_title: sTitle,
                hypeScore: charHypeCounts[String(c.id)] || 0
              };
            })
            .sort((a, b) => b.hypeScore - a.hypeScore)
            .slice(0, 5);

          setTopCharacters(rankedChars);
        }

        // 7. WEEKLY TOP CHAPTERS
        const [chapterHypesRes, chapterLikesRes, chapterReactsRes, chapterReadsRes] =
          await Promise.all([
            supabase
              .from('hypes')
              .select('target_id, user_id')
              .eq('target_type', 'chapter')
              .gte('created_at', lastSaturdayIso),
            supabase
              .from('chapter_likes')
              .select('chapter_id, user_id')
              .gte('created_at', lastSaturdayIso),
            supabase
              .from('page_reacts')
              .select('chapter_id, user_id')
              .gte('created_at', lastSaturdayIso),
            supabase
              .from('reading_history')
              .select('chapter_id, user_id')
              .gte('updated_at', lastSaturdayIso)
          ]);

        const chapterInteractionCounts: Record<string, number> = {};
        (chapterHypesRes.data || []).filter(isFanActivity).forEach((h: any) => {
          if (h.target_id)
            chapterInteractionCounts[h.target_id] =
              (chapterInteractionCounts[h.target_id] || 0) + 10;
        });
        (chapterLikesRes.data || []).filter(isFanActivity).forEach((l: any) => {
          if (l.chapter_id)
            chapterInteractionCounts[l.chapter_id] =
              (chapterInteractionCounts[l.chapter_id] || 0) + 2;
        });
        (chapterReactsRes.data || []).filter(isFanActivity).forEach((r: any) => {
          if (r.chapter_id)
            chapterInteractionCounts[r.chapter_id] =
              (chapterInteractionCounts[r.chapter_id] || 0) + 2;
        });
        (chapterReadsRes.data || []).filter(isFanActivity).forEach((rd: any) => {
          if (rd.chapter_id)
            chapterInteractionCounts[rd.chapter_id] =
              (chapterInteractionCounts[rd.chapter_id] || 0) + 1;
        });

        const trendingChapIds = Object.keys(chapterInteractionCounts);

        if (trendingChapIds.length > 0) {
          const { data: chapsData } = await supabase
            .from('chapters')
            .select('id, title, chapter_number, series_slug, thumbnail_url')
            .in('id', trendingChapIds);

          if (chapsData) {
            const rankedChaps = chapsData
              .map((c: any) => {
                const sData = seriesList.find((s: any) => s.slug === c.series_slug);
                return {
                  ...c,
                  series_title: sData?.title || 'Unknown Series',
                  cover_url: sData?.cover_url,
                  hypeScore: chapterInteractionCounts[c.id] || 0
                };
              })
              .sort((a: any, b: any) => b.hypeScore - a.hypeScore);

            setTopWeeklyChapters(rankedChaps.slice(0, 3));
          }
        } else {
          setTopWeeklyChapters([]);
        }

        // 8. MONTHLY BIG 3 CREATORS
        if (allCreatorsData) {
          const combinedCreatorScores: Record<string, number> = {};

          const seriesToCreatorMap: Record<string, string> = {};
          seriesList.forEach((s: any) => {
            if (s.creator_name) seriesToCreatorMap[s.slug] = s.creator_name;
          });
          allCreatorsData.forEach((c: any) => {
            if (c.series_slug && c.name) seriesToCreatorMap[c.series_slug] = c.name;
          });

          monthlyHypes.forEach((h: any) => {
            if (h.target_type === 'creator' && h.target_id) {
              combinedCreatorScores[h.target_id] =
                (combinedCreatorScores[h.target_id] || 0) + 10;
            } else if (h.target_type === 'series' && h.target_id) {
              const creatorName = seriesToCreatorMap[h.target_id];
              if (creatorName) {
                combinedCreatorScores[creatorName] =
                  (combinedCreatorScores[creatorName] || 0) + 10;
              }
            }
          });

          const uniqueCreatorMap = new Map();
          allCreatorsData.forEach((c: any) => {
            if (!uniqueCreatorMap.has(c.name)) uniqueCreatorMap.set(c.name, c);
          });

          const rankedBig3Creators = Array.from(uniqueCreatorMap.values())
            .map((c: any) => ({ ...c, hypeScore: combinedCreatorScores[c.name] || 0 }))
            .sort((a, b) => b.hypeScore - a.hypeScore);

          setBig3Creators(rankedBig3Creators.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [seriesList, currentUser, dayTick]);

  const handleRouteToSeries = (e: React.MouseEvent, seriesObj: any) => {
    e.preventDefault();
    e.stopPropagation();
    trackTelemetry('leaderboard_item_click', {
      tab: activeTab,
      series_slug: seriesObj?.slug || seriesObj?.title || ''
    });
    if (seriesObj && onNavigate) onNavigate({ ...seriesObj, action: 'series' });
  };

  const LeaderboardCategory = ({
    title,
    subtitle,
    items,
    type = 'series'
  }: {
    title: string;
    subtitle: string;
    items: any[];
    type?: 'series' | 'creator' | 'character' | 'chapter';
  }) => (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 mb-6 animate-fade-in">
      <div className="flex justify-between items-end mb-4 border-b border-zinc-800/50 pb-3 px-2">
        <h3 className="text-lg sm:text-xl font-black italic uppercase text-white flex items-center gap-2">
          {type === 'chapter' && <BookOpen className="w-5 h-5 text-[#fe9a00]" />}
          {type === 'series' && <Library className="w-5 h-5 text-[#fe9a00]" />}
          {type === 'character' && <User className="w-5 h-5 text-[#fe9a00]" />}
          {type === 'creator' && <PenTool className="w-5 h-5 text-[#fe9a00]" />}
          {title}
        </h3>
        <span className="text-[9px] font-bold text-[#fe9a00] uppercase tracking-widest">
          {subtitle}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.length > 0 ? (
          items.map((item: any, index: number) => (
            <div
              key={index}
              onClick={e => type === 'series' && handleRouteToSeries(e, item)}
              className={`flex items-center gap-4 bg-black/40 p-3 rounded-xl border transition-colors ${
                type === 'series'
                  ? 'cursor-pointer hover:border-zinc-600 border-zinc-800/50'
                  : 'border-zinc-800/30'
              }`}
            >
              <span
                className={`text-xl sm:text-2xl font-black italic w-6 sm:w-8 text-center shrink-0 ${
                  index === 0
                    ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                    : index === 1
                    ? 'text-zinc-400'
                    : index === 2
                    ? 'text-amber-700'
                    : 'text-zinc-600'
                }`}
              >
                {index + 1}
              </span>
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700 shadow-md ${
                  type === 'character' ? 'rounded-full' : 'rounded-lg'
                }`}
              >
                <img
                  src={
                    type === 'creator'
                      ? item.avatar_url ||
                        `https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg`
                      : type === 'character'
                      ? item.headshot_url || 'https://via.placeholder.com/150'
                      : item.thumbnail_url ||
                        item.sticker_url ||
                        item.cover_url ||
                        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-black text-white uppercase text-sm truncate">
                  {type === 'creator' || type === 'character'
                    ? item.name
                    : type === 'chapter'
                    ? `Ch. ${item.chapter_number} - ${item.title}`
                    : item.title}
                </span>
                {type === 'creator' && item.role && (
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                    {item.role}
                  </span>
                )}
                {type === 'character' && item.series_title && (
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                    {item.series_title}
                  </span>
                )}
                {type === 'series' && item.creator_name && (
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                    {item.creator_name}
                  </span>
                )}
                {type === 'chapter' && item.series_title && (
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                    {item.series_title}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest text-center py-8">
            No rankings data yet for this category.
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

      {/* Automatic Rank Milestone Notification Modal (Rank 25, Rank 15, Rank 10) */}
      {milestoneModal && (
        <div
          className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setMilestoneModal(null)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(254,154,0,0.28)] relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMilestoneModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#fe9a00] text-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(254,154,0,0.6)]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] block">
                  Monthly Leaderboard Milestone
                </span>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white leading-tight">
                  {milestoneModal.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-200 font-bold leading-relaxed mb-5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5">
              {milestoneModal.headline}
            </p>

            <div className="space-y-2.5 mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Pro Tips to Boost Your Score:
              </span>

              <ul className="space-y-2 text-xs font-bold text-zinc-300">
                <li className="flex items-center gap-2.5 bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#fe9a00] shrink-0" />
                  <span>
                    Drop your fave creator a donation{' '}
                    <strong className="text-[#fe9a00] uppercase">HUGE!</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2.5 bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#fe9a00] shrink-0" />
                  <span>Give new series a shot</span>
                </li>
                <li className="flex items-center gap-2.5 bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#fe9a00] shrink-0" />
                  <span>Login everyday</span>
                </li>
                <li className="flex items-center gap-2.5 bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#fe9a00] shrink-0" />
                  <span>Share the app on social media</span>
                </li>

                {!milestoneModal.isPlusUser && (
                  <li className="flex items-center justify-between gap-2 bg-gradient-to-r from-purple-950/60 via-zinc-900 to-black border border-purple-500/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-[11px] text-purple-200 font-black truncate">
                        Upgrade to PLUS and get more hypes
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMilestoneModal(null);
                        if (onNavigate) onNavigate({ action: 'sub' });
                      }}
                      className="px-2.5 py-1 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      Get PLUS
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setMilestoneModal(null)}
              className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer"
            >
              Keep Hyping!
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
        <img
          src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png"
          alt="Manga Collage"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/95 to-transparent" />
      </div>

      <div className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-xl border-b border-zinc-800/80 pt-6 pb-4 px-4 sm:pt-8 sm:px-8 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 relative mb-5">
          <div className="flex items-center gap-2 sm:gap-4 shrink min-w-0 z-10">
            <button
              onClick={onBack}
              className="p-2 sm:p-3 bg-zinc-900/90 backdrop-blur-md rounded-none border border-zinc-700 hover:bg-white hover:text-black transition-colors transform -skew-x-12 shadow-xl shrink-0 cursor-pointer"
            >
              <div className="transform skew-x-12 flex items-center gap-1 sm:gap-2">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                  Home
                </span>
              </div>
            </button>

            <div className="flex sm:hidden flex-col items-start drop-shadow-lg pointer-events-none shrink min-w-0">
              <h1 className="text-lg font-black italic uppercase tracking-tighter text-[#fe9a00] flex items-center gap-1.5 text-left truncate">
                <Trophy className="w-4 h-4 shrink-0" /> Leaderboard
              </h1>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest text-left truncate">
                Live Global Rankings
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg pointer-events-none z-0 w-max">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] flex items-center gap-2 text-center">
              <Trophy className="w-8 h-8 shrink-0" /> Leaderboard
            </h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
              Live Global Rankings
            </span>
          </div>

          <div className="pointer-events-auto shrink-0 flex items-center mr-14 sm:mr-0 z-10">
            <TutorialHelpButton
              onClick={(e: any) => {
                e.stopPropagation();
                setForceTutorial(true);
              }}
            />
          </div>
        </div>

        <div className="flex bg-black/50 p-1 rounded-full border border-zinc-800 shadow-inner max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'weekly'
                ? 'bg-[#fe9a00] text-black shadow-lg'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> Weekly Hype
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-[#fe9a00] text-black shadow-lg'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> The Big 3
          </button>
          <button
            onClick={() => setActiveTab('fans')}
            className={`flex-1 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'fans'
                ? 'bg-[#fe9a00] text-black shadow-lg'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" /> Top Fans
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
            <span className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest animate-pulse">
              Calculating Scores...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'weekly' && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Weekly Polls
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                    Resets Every Saturday at 12:00 AM • Fan Votes Only
                  </p>
                </div>

                <LeaderboardCategory
                  title="Most Hype Chapters"
                  items={topWeeklyChapters}
                  subtitle="Chapter Engagement"
                  type="chapter"
                />
                <LeaderboardCategory
                  title="Most Hype Series"
                  items={topSeries}
                  subtitle="Overall Hypes"
                  type="series"
                />
                <LeaderboardCategory
                  title="Most Hype Characters"
                  items={topCharacters}
                  subtitle="Fan Favorites"
                  type="character"
                />
                <LeaderboardCategory
                  title="Most Hype Creators"
                  items={topCreators}
                  subtitle="Creator Support"
                  type="creator"
                />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="animate-fade-in space-y-12 pb-12">
                <div className="flex flex-col items-center mt-4">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 mb-2 drop-shadow-lg">
                    <Crown className="w-6 h-6 text-yellow-500" /> The Big 3 Series
                  </h2>
                  <p className="text-[10px] text-[#fe9a00] font-black uppercase tracking-widest mb-12">
                    Resets Last Saturday of the Month
                  </p>

                  {big3.length === 3 ? (
                    <div className="flex items-end justify-center gap-4 sm:gap-8 w-full px-2 mt-8">
                      <button
                        type="button"
                        className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        onClick={e => handleRouteToSeries(e, big3[1])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <Star className="w-4 h-4 text-zinc-400" /> #2
                          </div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform group-hover:rotate-0">
                            <img
                              src={
                                big3[1].sticker_url ||
                                big3[1].character_url ||
                                big3[1].cover_url
                              }
                              className="w-full h-full object-cover object-top"
                              alt="Rank 2"
                            />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">
                            {big3[1].title}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="flex flex-col items-center w-[35%] z-30 hover:-translate-y-4 transition-all group pb-8 cursor-pointer relative bg-transparent border-none p-0 focus:outline-none"
                        onClick={e => handleRouteToSeries(e, big3[0])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-xs sm:text-sm font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1 animate-pulse">
                            <Crown className="w-4 h-4 text-yellow-500" /> #1
                          </div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-32 h-32 sm:w-44 sm:h-44 border-[6px] border-yellow-500 shadow-[0_15px_40px_rgba(234,179,8,0.6)] transform transition-transform group-hover:scale-105">
                            <img
                              src={
                                big3[0].sticker_url ||
                                big3[0].character_url ||
                                big3[0].cover_url
                              }
                              className="w-full h-full object-cover object-top"
                              alt="Rank 1"
                            />
                          </div>
                          <span className="mt-5 text-[10px] sm:text-xs font-black text-[#fe9a00] uppercase tracking-wider text-center line-clamp-2 drop-shadow-md">
                            {big3[0].title}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="flex flex-col items-center w-[30%] opacity-90 hover:opacity-100 transition-all hover:-translate-y-2 group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        onClick={e => handleRouteToSeries(e, big3[2])}
                      >
                        <div className="pointer-events-none flex flex-col items-center w-full">
                          <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-600" /> #3
                          </div>
                          <div className="relative rounded-full overflow-hidden bg-[#f4f4f5] w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform group-hover:rotate-0">
                            <img
                              src={
                                big3[2].sticker_url ||
                                big3[2].character_url ||
                                big3[2].cover_url
                              }
                              className="w-full h-full object-cover object-top"
                              alt="Rank 3"
                            />
                          </div>
                          <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">
                            {big3[2].title}
                          </span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 w-full max-w-lg pointer-events-none mt-8">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                        Not enough data to calculate The Big 3 yet.
                      </p>
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
                      <div className="flex flex-col items-center w-[30%] opacity-90 transition-all group">
                        <div className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                          <Star className="w-4 h-4 text-zinc-400" /> #2
                        </div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-zinc-400 shadow-[0_10px_30px_rgba(161,161,170,0.4)] transform -rotate-6 transition-transform">
                          <img
                            src={
                              big3Creators[1].avatar_url ||
                              'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'
                            }
                            className="w-full h-full object-cover object-top"
                            alt="Rank 2"
                          />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">
                          {big3Creators[1].name}
                        </span>
                      </div>

                      <div className="flex flex-col items-center w-[35%] z-30 transition-all group pb-8 relative">
                        <div className="text-xs sm:text-sm font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1 animate-pulse">
                          <Crown className="w-4 h-4 text-yellow-500" /> #1
                        </div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-32 h-32 sm:w-44 sm:h-44 border-[6px] border-yellow-500 shadow-[0_15px_40px_rgba(234,179,8,0.6)] transform transition-transform">
                          <img
                            src={
                              big3Creators[0].avatar_url ||
                              'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'
                            }
                            className="w-full h-full object-cover object-top"
                            alt="Rank 1"
                          />
                        </div>
                        <span className="mt-5 text-[10px] sm:text-xs font-black text-[#fe9a00] uppercase tracking-wider text-center line-clamp-2 drop-shadow-md">
                          {big3Creators[0].name}
                        </span>
                      </div>

                      <div className="flex flex-col items-center w-[30%] opacity-90 transition-all group">
                        <div className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-600" /> #3
                        </div>
                        <div className="relative rounded-full overflow-hidden bg-zinc-800 w-24 h-24 sm:w-32 sm:h-32 border-[4px] border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.4)] transform rotate-6 transition-transform">
                          <img
                            src={
                              big3Creators[2].avatar_url ||
                              'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'
                            }
                            className="w-full h-full object-cover object-top"
                            alt="Rank 3"
                          />
                        </div>
                        <span className="mt-4 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider text-center line-clamp-2">
                          {big3Creators[2].name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 w-full max-w-lg pointer-events-none mt-8">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                        Not enough data to calculate The Big 3 Creators yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fans' && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                {/* Monthly Top 5 Supporters Prize Box + Live Reset Countdown Timer */}
                <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-black border-2 border-[#fe9a00] rounded-2xl p-4 sm:p-5 mb-6 shadow-[0_0_30px_rgba(254,154,0,0.18)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#fe9a00] text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(254,154,0,0.6)]">
                      <Flame className="w-6 h-6 fill-black" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] block">
                        {currentMonthLabel || 'Monthly'} Leaderboard • Top 5 Monthly Prize Race
                      </span>
                      <h3 className="text-base sm:text-lg font-black italic uppercase text-white leading-tight mt-0.5">
                        Top 5 Supporters Win Monthly Prizes!
                      </h3>
                      <p className="text-[10px] text-zinc-300 font-bold mt-1 leading-relaxed">
                        Increase your Fandom Score by supporting creators, completing chapters, dropping Hypes, logging in daily, commenting on series, leaving Smart Comments, and liking content! Your all-time Fandom Score stays permanently on your Profile & Hype Card.
                      </p>
                    </div>
                  </div>

                  {/* Live Monthly Reset Countdown Box */}
                  <div className="bg-black/90 border border-[#fe9a00]/60 rounded-xl px-3.5 py-2.5 flex flex-col items-center justify-center shrink-0 shadow-inner">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-[#fe9a00] animate-pulse" /> Resets In
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-black text-[#fe9a00]">
                      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-center">
                        <span>{countdown.days}</span>
                        <span className="text-[8px] text-zinc-500 ml-0.5">d</span>
                      </div>
                      <span>:</span>
                      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-center">
                        <span>{countdown.hours}</span>
                        <span className="text-[8px] text-zinc-500 ml-0.5">h</span>
                      </div>
                      <span>:</span>
                      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-center">
                        <span>{countdown.mins}</span>
                        <span className="text-[8px] text-zinc-500 ml-0.5">m</span>
                      </div>
                      <span>:</span>
                      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-center">
                        <span className="text-white">{countdown.secs}</span>
                        <span className="text-[8px] text-zinc-500 ml-0.5">s</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 pointer-events-none">
                    <Zap className="w-5 h-5 text-[#fe9a00]" /> Top 10 Supporters
                  </h2>
                  <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase pointer-events-none">
                    Top 5 Highlighted as Most Hype Fans
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {superFans.length > 0 ? (
                    superFans.map((fan, idx) => (
                      <React.Fragment key={fan.id}>
                        {idx === 5 && (
                          <div className="flex items-center gap-3 py-2 px-2">
                            <div className="flex-1 h-px bg-zinc-800" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              Ranks #6 – #10 • Chasing Top 5 Most Hype Fans
                            </span>
                            <div className="flex-1 h-px bg-zinc-800" />
                          </div>
                        )}
                        <div
                          className={`flex items-center gap-4 backdrop-blur-md p-4 rounded-xl border shadow-lg transition-colors pointer-events-none ${
                            fan.isMostHypeTop5
                              ? 'bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-amber-950/35 border-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.15)]'
                              : 'bg-zinc-900/80 border-zinc-800'
                          }`}
                        >
                          <div className="w-8 flex justify-center">
                            <span
                              className={`text-2xl font-black italic ${
                                fan.isMostHypeTop5
                                  ? 'text-[#fe9a00] drop-shadow-[0_0_10px_rgba(254,154,0,0.5)]'
                                  : 'text-zinc-600'
                              }`}
                            >
                              {fan.rank}
                            </span>
                          </div>
                          <DecoratedAvatar
                            avatarUrl={fan.avatar_url}
                            frameId={fan.frame_id}
                            size="w-12 h-12"
                            iconSize="w-5 h-5"
                          />
                          <div className="flex flex-col flex-1 truncate">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-white uppercase tracking-wider truncate text-sm sm:text-base">
                                {fan.username}
                              </span>
                              {fan.is_premium && (
                                <span className="text-[7px] bg-purple-900/30 text-purple-400 border border-purple-900 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">
                                  Pro
                                </span>
                              )}
                              {fan.isMostHypeTop5 && (
                                <span className="text-[7px] bg-[#fe9a00] text-black px-2 py-0.5 rounded-full uppercase font-black tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(254,154,0,0.5)]">
                                  <Flame className="w-2.5 h-2.5 fill-black" /> Most Hype Fan
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#fe9a00] flex items-center gap-1">
                                <Activity className="w-3 h-3 text-[#fe9a00]" />
                                {(fan.score || 0).toLocaleString()} Monthly Pts
                              </span>
                              <span className="text-zinc-600 text-[9px]">•</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                                All-Time: {(fan.lifetimeScore || 0).toLocaleString()} Pts
                              </span>
                            </div>
                          </div>
                          <div className="hidden sm:flex flex-col items-end pl-4 border-l border-zinc-800">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                fan.isMostHypeTop5 ? 'text-[#fe9a00]' : 'text-zinc-500'
                              }`}
                            >
                              {fan.isMostHypeTop5 ? 'Top 5 Prize Zone' : fan.class}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="text-center py-12 border border-zinc-800 rounded-xl bg-black/40 pointer-events-none">
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                        No supporters found yet this month. Start supporting to rank up!
                      </p>
                    </div>
                  )}
                </div>

                {currentUser && userRank && (
                  <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#fe9a00]/10 border border-[#fe9a00]/30 rounded-xl p-4 sm:p-6 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <DecoratedAvatar
                        avatarUrl={currentUser.avatar_url}
                        frameId={currentUser.frame_id}
                        size="w-14 h-14"
                        iconSize="w-6 h-6"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                          Your {currentMonthLabel || 'Monthly'} Rank
                        </span>
                        {userRank.isExcludedStaffOrCreator ? (
                          <span className="text-xs sm:text-sm font-black uppercase text-zinc-300 tracking-wider mt-0.5">
                            Creator / Staff Account (Unranked — Fan-Only Leaderboard)
                          </span>
                        ) : (
                          <span className="text-xl font-black italic uppercase text-white tracking-wider">
                            #{userRank.rank}{' '}
                            <span className="text-xs text-[#fe9a00] ml-2">
                              ({(userRank.score || 0).toLocaleString()} Monthly Pts)
                            </span>
                          </span>
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                          Profile All-Time Fandom Score:{' '}
                          {(userRank.lifetimeScore || 0).toLocaleString()} PTS
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-12 mb-8 border-t border-zinc-800 pt-8">
              <button
                onClick={onBack}
                className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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