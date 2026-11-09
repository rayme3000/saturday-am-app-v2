import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
  RefreshCw,
  EyeOff,
  Eye,
  Bell,
  Trash2,
  Star,
  Pause,
  Play,
  Sliders,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// Generates an ISO timestamp corresponding to 9:00 AM Eastern Time (America/New_York) for a given YYYY-MM-DD
export const toNineAmEstIso = (dateStr: string, timeStr: string = '09:00'): string => {
  const cleanTime = (timeStr || '09:00').slice(0, 5);
  const estDate = new Date(`${dateStr}T${cleanTime}:00-05:00`);
  if (!isNaN(estDate.getTime())) {
    return estDate.toISOString();
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = cleanTime.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
};

// Formats a Date or ISO timestamp into YYYY-MM-DD in Eastern Time so UTC offsets never shift the day!
export const formatDateInput = (d: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch {
    // Fallback to local calendar components
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getEstDayOfWeek = (iso: string): number => {
  try {
    const shortDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short'
    }).format(new Date(iso));
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };
    if (map[shortDay] !== undefined) return map[shortDay];
  } catch {
    // fallback
  }
  return new Date(iso).getDay();
};

const formatTimeInput = (iso?: string | null): string => {
  if (!iso) return '09:00';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export type TrackDayType = 'MONDAY' | 'WEDNESDAY' | 'SATURDAY';

export type CadencePattern =
  | 'weekly'
  | 'odd_weeks'
  | 'even_weeks'
  | 'launch_then_even'
  | 'launch_then_odd'
  | 'first_3_then_monthly'
  | 'monthly_w1'
  | 'monthly_w4';

export interface TrackAssignment {
  id: string;
  seriesSlug: string;
  dayType: TrackDayType;
  cadence: CadencePattern;
  chaptersPerDrop: number;
  startWeekOffset: number;
  paused: boolean;
}

export interface WildcardDrop {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  seriesSlug: string;
  chapterIds: string[];
}

// Default track map used ONLY when a series has no existing track assignment and no scheduled chapters yet.
// It NEVER overrides an admin's manual track changes or reschedule!
export const CANONICAL_SERIES_TRACK_DEFAULTS: Record<
  string,
  { dayType: TrackDayType; cadence: CadencePattern; chaptersPerDrop?: number }
> = {
  'underground': { dayType: 'WEDNESDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'fan-x-boy': { dayType: 'WEDNESDAY', cadence: 'first_3_then_monthly', chaptersPerDrop: 1 },
  'spoon': { dayType: 'WEDNESDAY', cadence: 'weekly', chaptersPerDrop: 3 },
  'hammer': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'redskin': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'zephyr': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'titan-king': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'orisha': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'apple-black': { dayType: 'SATURDAY', cadence: 'odd_weeks', chaptersPerDrop: 1 },
  'clock-striker': { dayType: 'SATURDAY', cadence: 'launch_then_even', chaptersPerDrop: 1 },
  'saturday-playdate': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'bully-eater': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'gun-bone': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'oblivion-rouge': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'mmwog': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'yellow-stringer': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'soul-beat': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 }
};

export const doesWeekMatchCadence = (
  weekNum: number,
  cadence: CadencePattern,
  startWeekOffset: number
): boolean => {
  if (weekNum < startWeekOffset) return false;

  switch (cadence) {
    case 'weekly':
      return true;
    case 'odd_weeks':
      return weekNum % 2 === 1;
    case 'even_weeks':
      return weekNum % 2 === 0;
    case 'launch_then_even':
      return weekNum === 1 || weekNum % 2 === 0;
    case 'launch_then_odd':
      return weekNum % 2 === 1;
    case 'first_3_then_monthly':
      return weekNum <= 3 || (weekNum > 3 && (weekNum - 3) % 4 === 0);
    case 'monthly_w1':
      return (weekNum - 1) % 4 === 0;
    case 'monthly_w4':
      return weekNum % 4 === 0;
    default:
      return true;
  }
};

export const getUpcomingDatesForDay = (
  dayType: TrackDayType,
  totalWeeks: number = 104
): { weekNum: number; dateStr: string; label: string }[] => {
  const targetDow = dayType === 'MONDAY' ? 1 : dayType === 'WEDNESDAY' ? 3 : 6;
  const now = new Date();
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (cursor.getDay() === targetDow && now.getHours() >= 9) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor.getDay() !== targetDow) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const results: { weekNum: number; dateStr: string; label: string }[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + (w - 1) * 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    results.push({
      weekNum: w,
      dateStr: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  return results;
};

export const getMatchingDropDatesForTrack = (
  dayType: TrackDayType,
  cadence: CadencePattern,
  startWeekOffset: number,
  requiredDrops: number
): { weekNum: number; dateStr: string; label: string }[] => {
  const needed = Math.max(8, requiredDrops + 4);
  const weeksToGenerate = Math.max(52, needed * 5 + startWeekOffset);
  const allDates = getUpcomingDatesForDay(dayType, weeksToGenerate);
  return allDates.filter(d => doesWeekMatchCadence(d.weekNum, cadence, startWeekOffset));
};

export const STORAGE_TRACKS_KEY = 'am_automation_tracks_v5';
const STORAGE_WILDCARDS_KEY = 'am_automation_wildcards_v3';

export const ReleaseScheduler = ({ setIsDirty }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [mode, setMode] = useState<'tracks' | 'custom'>('tracks');
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoQueueNotifs, setAutoQueueNotifs] = useState(true);

  const [trackAssignments, setTrackAssignments] = useState<TrackAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TRACKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [wildcards, setWildcards] = useState<WildcardDrop[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WILDCARDS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [showWildcardModal, setShowWildcardModal] = useState(false);
  const [wcTitle, setWcTitle] = useState('');
  const [wcDate, setWcDate] = useState(() => formatDateInput(new Date()));
  const [wcTime] = useState('09:00');
  const [wcSeriesSlug, setWcSeriesSlug] = useState('');
  const [wcChapterCount, setWcChapterCount] = useState(6);

  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState<string>('');
  const [oneOffEdits, setOneOffEdits] = useState<
    Record<string, { date: string; time: string; isPublished: boolean }>
  >({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRACKS_KEY, JSON.stringify(trackAssignments));
    } catch {
      // ignore
    }
  }, [trackAssignments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WILDCARDS_KEY, JSON.stringify(wildcards));
    } catch {
      // ignore
    }
  }, [wildcards]);

  const isChapterUnreleased = useCallback((ch: any) => {
    if (!ch.is_published) return true;
    if (ch.publish_at && new Date(ch.publish_at).getTime() > Date.now()) return true;
    return false;
  }, []);

  const syncSingleTrackToDatabase = useCallback(
    async (track: TrackAssignment, chaptersForSeries: any[]) => {
      if (track.paused) return 0;

      const seriesChaps = [...chaptersForSeries]
        .filter(isChapterUnreleased)
        .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));

      if (seriesChaps.length === 0) return 0;

      const countPerDrop = Math.max(1, track.chaptersPerDrop || 1);
      const requiredDrops = Math.ceil(seriesChaps.length / countPerDrop);
      const validDropDates = getMatchingDropDatesForTrack(
        track.dayType,
        track.cadence,
        track.startWeekOffset || 1,
        requiredDrops
      );

      let chapCursor = 0;
      let scheduledCount = 0;
      const matchedSeries = seriesList.find((s: any) => s.slug === track.seriesSlug);

      for (const dropDay of validDropDates) {
        if (chapCursor >= seriesChaps.length) break;
        const publishIso = toNineAmEstIso(dropDay.dateStr, '09:00');

        for (let c = 0; c < countPerDrop; c++) {
          if (chapCursor >= seriesChaps.length) break;
          const targetChap = seriesChaps[chapCursor];
          chapCursor++;

          const { error } = await supabase
            .from('chapters')
            .update({
              is_published: true,
              publish_at: publishIso
            })
            .eq('id', targetChap.id);

          if (error) throw error;
          scheduledCount++;

          if (autoQueueNotifs && matchedSeries) {
            await supabase.from('app_notifications').upsert(
              [
                {
                  title: 'New Chapter Drop!',
                  message: `${matchedSeries.title} Chapter ${targetChap.chapter_number} is now live!`,
                  thumbnail_url: targetChap.thumbnail_url || matchedSeries.cover_url || null,
                  link_target: matchedSeries.slug,
                  publish_at: publishIso,
                  created_at: publishIso,
                  source_key: `chapter_${targetChap.id}`
                }
              ],
              { onConflict: 'source_key' }
            );
          }
        }
      }

      return scheduledCount;
    },
    [autoQueueNotifs, isChapterUnreleased, seriesList]
  );

  // Detects cadence automatically from the gap between the first 2 scheduled chapters in Supabase
  const detectCadenceFromDbChapters = (unreleasedChaps: any[], slug: string): CadencePattern => {
    const slugLower = slug.toLowerCase();
    const canonical = CANONICAL_SERIES_TRACK_DEFAULTS[slugLower];

    if (unreleasedChaps.length >= 2 && unreleasedChaps[0].publish_at && unreleasedChaps[1].publish_at) {
      const t1 = new Date(unreleasedChaps[0].publish_at).getTime();
      const t2 = new Date(unreleasedChaps[1].publish_at).getTime();
      const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
      if (diffDays >= 13 && diffDays <= 15) {
        if (slugLower.includes('clock-striker')) return 'launch_then_even';
        return 'odd_weeks';
      }
      if (diffDays >= 26) {
        return 'monthly_w1';
      }
      if (diffDays >= 6 && diffDays <= 8) {
        return 'weekly';
      }
    }

    return canonical?.cadence || 'weekly';
  };

  const fetchAllChapters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, series_slug, chapter_number, title, thumbnail_url, is_published, publish_at, created_at')
        .order('series_slug', { ascending: true })
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      const chaptersList = data || [];

      if (chaptersList.length > 0) {
        const now = Date.now();
        const unreleasedBySlug = new Map<string, any[]>();

        chaptersList.forEach((ch: any) => {
          const isUnrel = !ch.is_published || (ch.publish_at && new Date(ch.publish_at).getTime() > now);
          if (isUnrel && ch.series_slug) {
            const list = unreleasedBySlug.get(ch.series_slug) || [];
            list.push(ch);
            unreleasedBySlug.set(ch.series_slug, list);
          }
        });

        // Sync trackAssignments with actual Supabase chapter dates FIRST so the database is always the source of truth!
        setTrackAssignments(prev => {
          const bySlug = new Map<string, TrackAssignment>();
          prev.forEach(t => bySlug.set(t.seriesSlug, t));

          unreleasedBySlug.forEach((unrelChaps, slug) => {
            const sorted = [...unrelChaps].sort(
              (a, b) => Number(a.chapter_number) - Number(b.chapter_number)
            );
            const firstWithDate = sorted.find(c => Boolean(c.publish_at));
            let dbDayType: TrackDayType | null = null;

            if (firstWithDate?.publish_at) {
              const dow = getEstDayOfWeek(firstWithDate.publish_at);
              if (dow === 1) dbDayType = 'MONDAY';
              else if (dow === 3) dbDayType = 'WEDNESDAY';
              else if (dow === 6) dbDayType = 'SATURDAY';
            }

            const existing = bySlug.get(slug);
            const canonical = CANONICAL_SERIES_TRACK_DEFAULTS[slug.toLowerCase()];

            if (existing) {
              // If the database already has a valid Mon/Wed/Sat timestamp, trust the DB's dayType so all browsers stay in sync!
              if (dbDayType && existing.dayType !== dbDayType) {
                bySlug.set(slug, {
                  ...existing,
                  dayType: dbDayType,
                  cadence: detectCadenceFromDbChapters(sorted, slug)
                });
              }
            } else {
              const resolvedDay = dbDayType || canonical?.dayType || 'SATURDAY';
              const resolvedCadence = detectCadenceFromDbChapters(sorted, slug);
              bySlug.set(slug, {
                id: `${resolvedDay}_${slug}`,
                seriesSlug: slug,
                dayType: resolvedDay,
                cadence: resolvedCadence,
                chaptersPerDrop: canonical?.chaptersPerDrop || (slug.toLowerCase().includes('spoon') ? 3 : 1),
                startWeekOffset: 1,
                paused: false
              });
            }
          });

          return Array.from(bySlug.values());
        });
      }

      setAllChapters(chaptersList);
    } catch (err: any) {
      console.error('Error loading chapters for scheduler:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllChapters();
    const handleVaultUpdated = () => {
      fetchAllChapters();
    };
    window.addEventListener('vaultUpdated', handleVaultUpdated);
    return () => window.removeEventListener('vaultUpdated', handleVaultUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chaptersBySeries = useMemo(() => {
    const map: Record<string, any[]> = {};
    allChapters.forEach((ch: any) => {
      if (!map[ch.series_slug]) map[ch.series_slug] = [];
      map[ch.series_slug].push(ch);
    });
    return map;
  }, [allChapters]);

  const isTrackOutOfSyncWithDb = useCallback(
    (track: TrackAssignment): boolean => {
      if (track.paused) return false;
      const chaps = (chaptersBySeries[track.seriesSlug] || [])
        .filter(isChapterUnreleased)
        .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));
      if (chaps.length === 0) return false;

      const countPerDrop = Math.max(1, track.chaptersPerDrop || 1);
      const requiredDrops = Math.ceil(chaps.length / countPerDrop);
      const validDropDates = getMatchingDropDatesForTrack(
        track.dayType,
        track.cadence,
        track.startWeekOffset || 1,
        requiredDrops
      );

      let cursor = 0;
      for (const dropDay of validDropDates) {
        for (let c = 0; c < countPerDrop; c++) {
          if (cursor >= chaps.length) break;
          const ch = chaps[cursor++];
          if (!ch.publish_at) return true;
          const dbDateStr = formatDateInput(new Date(ch.publish_at));
          if (dbDateStr !== dropDay.dateStr) return true;
        }
      }
      return false;
    },
    [chaptersBySeries, isChapterUnreleased]
  );

  const handleAddSeriesToTrack = async (dayType: TrackDayType, seriesSlug: string) => {
    if (!seriesSlug) return;
    if (trackAssignments.some(t => t.dayType === dayType && t.seriesSlug === seriesSlug)) {
      return alert('This series is already assigned to this track.');
    }

    const canonical = CANONICAL_SERIES_TRACK_DEFAULTS[seriesSlug.toLowerCase()];
    const defaultCadence: CadencePattern = canonical?.cadence || 'weekly';
    const defaultChPerDrop = canonical?.chaptersPerDrop || (seriesSlug.toLowerCase().includes('spoon') ? 3 : 1);

    const newItem: TrackAssignment = {
      id: `${dayType}_${seriesSlug}_${Date.now()}`,
      seriesSlug,
      dayType,
      cadence: defaultCadence,
      chaptersPerDrop: defaultChPerDrop,
      startWeekOffset: 1,
      paused: false
    };

    const nextTracks = [
      ...trackAssignments.filter(t => t.seriesSlug !== seriesSlug),
      newItem
    ];
    setTrackAssignments(nextTracks);

    const seriesChaps = chaptersBySeries[seriesSlug] || [];
    if (seriesChaps.some(isChapterUnreleased)) {
      setSaving(true);
      try {
        await syncSingleTrackToDatabase(newItem, seriesChaps);
        window.dispatchEvent(new Event('seriesUpdated'));
        window.dispatchEvent(new Event('vaultUpdated'));
        await fetchAllChapters();
      } catch (err: any) {
        console.error('Auto-schedule error on track assignment:', err.message);
      } finally {
        setSaving(false);
      }
    } else if (setIsDirty) {
      setIsDirty(true);
    }
  };

  // Immediately updates Supabase when you change Track Day (Mon/Wed/Sat), Cadence, Ch/Drop, or Start Week!
  const handleUpdateTrackItem = async (id: string, patch: Partial<TrackAssignment>) => {
    const existing = trackAssignments.find(t => t.id === id);
    if (!existing) return;
    const updatedItem: TrackAssignment = { ...existing, ...patch };

    setTrackAssignments(prev => prev.map(item => (item.id === id ? updatedItem : item)));

    const seriesChaps = chaptersBySeries[updatedItem.seriesSlug] || [];
    if (!updatedItem.paused && seriesChaps.some(isChapterUnreleased)) {
      setSaving(true);
      try {
        await syncSingleTrackToDatabase(updatedItem, seriesChaps);
        window.dispatchEvent(new Event('seriesUpdated'));
        window.dispatchEvent(new Event('vaultUpdated'));
        await fetchAllChapters();
      } catch (err: any) {
        console.error('Error auto-syncing updated track:', err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleRemoveTrackItem = async (item: TrackAssignment) => {
    const matchedSeries = seriesList.find((s: any) => s.slug === item.seriesSlug);
    const title = matchedSeries?.title || item.seriesSlug;
    if (!window.confirm(`Remove "${title}" from the ${item.dayType} track?`)) return;

    setTrackAssignments(prev => prev.filter(t => t.id !== item.id));
  };

  const handleApplyLaunchAlternatingPreset = async () => {
    const abSeries = seriesList.find(
      (s: any) =>
        s.slug?.toLowerCase() === 'apple-black' ||
        s.title?.toLowerCase() === 'apple black'
    );
    const csSeries = seriesList.find(
      (s: any) =>
        s.slug?.toLowerCase() === 'clock-striker' ||
        s.title?.toLowerCase() === 'clock striker'
    );

    if (!abSeries && !csSeries) {
      return alert('Could not find Apple Black or Clock Striker in series list.');
    }

    const abTrack: TrackAssignment | null = abSeries
      ? {
          id: `SATURDAY_${abSeries.slug}_ab`,
          seriesSlug: abSeries.slug,
          dayType: 'SATURDAY',
          cadence: 'odd_weeks',
          chaptersPerDrop: 1,
          startWeekOffset: 1,
          paused: false
        }
      : null;

    const csTrack: TrackAssignment | null = csSeries
      ? {
          id: `SATURDAY_${csSeries.slug}_cs`,
          seriesSlug: csSeries.slug,
          dayType: 'SATURDAY',
          cadence: 'even_weeks',
          chaptersPerDrop: 1,
          startWeekOffset: 2,
          paused: false
        }
      : null;

    setTrackAssignments(prev => {
      const filtered = prev.filter(
        t => t.seriesSlug !== abSeries?.slug && t.seriesSlug !== csSeries?.slug
      );
      const next = [...filtered];
      if (abTrack) next.push(abTrack);
      if (csTrack) next.push(csTrack);
      return next;
    });

    setSaving(true);
    try {
      if (abTrack) {
        await syncSingleTrackToDatabase(abTrack, chaptersBySeries[abTrack.seriesSlug] || []);
      }
      if (csTrack) {
        await syncSingleTrackToDatabase(csTrack, chaptersBySeries[csTrack.seriesSlug] || []);
      }
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAllTracksToDatabase = async () => {
    const activeTracks = trackAssignments.filter(t => !t.paused);
    if (activeTracks.length === 0 && wildcards.length === 0) {
      return alert('Assign at least one active series to Monday, Wednesday, or Saturday before syncing.');
    }

    setSaving(true);
    try {
      let totalScheduledChapters = 0;

      for (const track of activeTracks) {
        const seriesChaps = chaptersBySeries[track.seriesSlug] || [];
        const count = await syncSingleTrackToDatabase(track, seriesChaps);
        totalScheduledChapters += count;
      }

      for (const wc of wildcards) {
        const publishIso = toNineAmEstIso(wc.dateStr, wc.timeStr || '09:00');
        const matchedSeries = seriesList.find((s: any) => s.slug === wc.seriesSlug);

        for (const chapId of wc.chapterIds) {
          const targetChap = allChapters.find((c: any) => String(c.id) === String(chapId));
          if (!targetChap) continue;

          const { error } = await supabase
            .from('chapters')
            .update({
              is_published: true,
              publish_at: publishIso
            })
            .eq('id', chapId);

          if (error) throw error;
          totalScheduledChapters++;

          if (autoQueueNotifs && matchedSeries) {
            await supabase.from('app_notifications').upsert(
              [
                {
                  title: wc.title || 'Special Binge Drop!',
                  message: `${matchedSeries.title} Chapter ${targetChap.chapter_number} is now live!`,
                  thumbnail_url: targetChap.thumbnail_url || matchedSeries.cover_url || null,
                  link_target: matchedSeries.slug,
                  publish_at: publishIso,
                  created_at: publishIso,
                  source_key: `chapter_${targetChap.id}`
                }
              ],
              { onConflict: 'source_key' }
            );
          }
        }
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      if (setIsDirty) setIsDirty(false);
      await fetchAllChapters();
      alert(
        `SUCCESS! Synced and scheduled ${totalScheduledChapters} upcoming chapter drop(s) across your active release tracks!`
      );
    } catch (err: any) {
      alert('Error syncing schedule to database: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWildcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wcSeriesSlug || !wcDate) return alert('Select a series and date for the Wildcard drop.');

    const unreleased = (chaptersBySeries[wcSeriesSlug] || [])
      .filter(isChapterUnreleased)
      .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));

    if (unreleased.length === 0) {
      return alert('That series has 0 queued chapters available.');
    }

    const pickedIds = unreleased.slice(0, Math.max(1, wcChapterCount)).map((c: any) => String(c.id));

    const newWc: WildcardDrop = {
      id: `wc_${Date.now()}`,
      title: wcTitle.trim() || 'Special Event / Binge Drop',
      dateStr: wcDate,
      timeStr: wcTime || '09:00',
      seriesSlug: wcSeriesSlug,
      chapterIds: pickedIds
    };

    setWildcards(prev => [...prev, newWc]);
    setWcTitle('');
    setShowWildcardModal(false);
    if (setIsDirty) setIsDirty(true);
  };

  const currentSeriesChapters = useMemo(() => {
    if (!selectedSeriesSlug) return [];
    return chaptersBySeries[selectedSeriesSlug] || [];
  }, [selectedSeriesSlug, chaptersBySeries]);

  useEffect(() => {
    if (!selectedSeriesSlug) {
      setOneOffEdits({});
      return;
    }
    const chaps = chaptersBySeries[selectedSeriesSlug] || [];
    const initialEdits: Record<string, { date: string; time: string; isPublished: boolean }> = {};
    chaps.forEach((c: any) => {
      initialEdits[String(c.id)] = {
        date: c.publish_at ? formatDateInput(new Date(c.publish_at)) : formatDateInput(new Date()),
        time: formatTimeInput(c.publish_at),
        isPublished: c.is_published !== false
      };
    });
    setOneOffEdits(initialEdits);
  }, [selectedSeriesSlug, chaptersBySeries]);

  const handleInstantPushChapterLive = async (ch: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          is_published: true,
          publish_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', ch.id);
      if (error) throw error;
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
    } catch (err: any) {
      alert('Failed to push chapter live: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomChapterDates = async () => {
    if (!selectedSeriesSlug || currentSeriesChapters.length === 0) return;
    setSaving(true);
    try {
      const matchedSeries = seriesList.find((s: any) => s.slug === selectedSeriesSlug);
      for (const ch of currentSeriesChapters) {
        const edit = oneOffEdits[String(ch.id)];
        if (!edit) continue;
        const publishIso = edit.date ? toNineAmEstIso(edit.date, edit.time || '09:00') : null;

        const { error } = await supabase
          .from('chapters')
          .update({
            is_published: edit.isPublished,
            publish_at: publishIso
          })
          .eq('id', ch.id);
        if (error) throw error;

        if (
          autoQueueNotifs &&
          edit.isPublished &&
          publishIso &&
          new Date(publishIso).getTime() > Date.now() &&
          matchedSeries
        ) {
          await supabase.from('app_notifications').upsert(
            [
              {
                title: 'New Chapter Drop!',
                message: `${matchedSeries.title} Chapter ${ch.chapter_number} is now live!`,
                thumbnail_url: ch.thumbnail_url || matchedSeries.cover_url || null,
                link_target: matchedSeries.slug,
                publish_at: publishIso,
                created_at: publishIso,
                source_key: `chapter_${ch.id}`
              }
            ],
            { onConflict: 'source_key' }
          );
        }
      }
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
      alert(`Saved custom chapter release dates for ${matchedSeries?.title || selectedSeriesSlug}!`);
    } catch (err: any) {
      alert('Error saving custom chapter dates: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTrackColumn = (
    dayType: TrackDayType,
    badgeLabel: string,
    subLabel: string,
    accentBorder: string,
    badgeBg: string
  ) => {
    const items = trackAssignments.filter(t => t.dayType === dayType);
    const previewEightDates = getUpcomingDatesForDay(dayType, 8);

    return (
      <div
        className={`bg-zinc-950 border ${accentBorder} rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl`}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3.5">
            <div>
              <span
                className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-1.5 ${badgeBg}`}
              >
                {badgeLabel}
              </span>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-relaxed">
                {subLabel}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
              {items.length} Series
            </span>
          </div>

          {dayType === 'SATURDAY' && (
            <button
              type="button"
              onClick={handleApplyLaunchAlternatingPreset}
              className="w-full py-2 px-3 rounded-xl bg-[#fe9a00]/15 hover:bg-[#fe9a00]/25 border border-[#fe9a00]/50 text-[#fe9a00] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Alternates Apple Black (Odd Weeks) and Clock Striker (Even Weeks) on opposite Saturdays!"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              1-Click Preset: Alternate Apple Black & Clock Striker
            </button>
          )}

          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-3">
            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
              + Assign or Move Series to {dayType}s
            </label>
            <select
              value=""
              onChange={e => {
                handleAddSeriesToTrack(dayType, e.target.value);
              }}
              className="w-full bg-black border border-zinc-700 hover:border-[#fe9a00] rounded-lg px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="">-- Choose Series to Automate --</option>
              {seriesList.map((s: any) => {
                const chaps = chaptersBySeries[s.slug] || [];
                const scheduledCount = chaps.filter(isChapterUnreleased).length;
                const liveCount = chaps.length - scheduledCount;
                return (
                  <option key={s.slug} value={s.slug}>
                    {s.title} ({scheduledCount} Scheduled • {liveCount} Live)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-xl py-10 px-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
                No series assigned to {dayType.toLowerCase()}s yet
              </div>
            ) : (
              items.map(item => {
                const matchedSeries = seriesList.find((s: any) => s.slug === item.seriesSlug);
                const fullTitle = matchedSeries?.title || item.seriesSlug;
                const chaps = chaptersBySeries[item.seriesSlug] || [];
                const unreleasedChaps = chaps
                  .filter(isChapterUnreleased)
                  .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));
                const liveCount = chaps.length - unreleasedChaps.length;

                const countPerDrop = Math.max(1, item.chaptersPerDrop || 1);
                const requiredDrops = Math.max(4, Math.ceil(unreleasedChaps.length / countPerDrop));
                const upcomingDropDates = getMatchingDropDatesForTrack(
                  dayType,
                  item.cadence,
                  item.startWeekOffset || 1,
                  requiredDrops
                ).slice(0, Math.max(4, Math.ceil(unreleasedChaps.length / countPerDrop)));

                const outOfSync = isTrackOutOfSyncWithDb(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                      item.paused
                        ? 'bg-zinc-950/60 border-zinc-800 opacity-65'
                        : outOfSync
                        ? 'bg-amber-950/20 border-amber-500/70 shadow-md'
                        : unreleasedChaps.length > 0
                        ? 'bg-zinc-900/90 border-[#fe9a00]/50 shadow-md'
                        : 'bg-zinc-900/50 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black italic uppercase tracking-wide text-white leading-snug break-words">
                          {fullTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.paused ? (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              PAUSED
                            </span>
                          ) : outOfSync ? (
                            <button
                              type="button"
                              onClick={async () => {
                                setSaving(true);
                                try {
                                  await syncSingleTrackToDatabase(item, chaps);
                                  window.dispatchEvent(new Event('seriesUpdated'));
                                  window.dispatchEvent(new Event('vaultUpdated'));
                                  await fetchAllChapters();
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#fe9a00] hover:bg-white text-black flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" /> Custom Stagger / Click to Re-Sync
                            </button>
                          ) : unreleasedChaps.length > 0 ? (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✓ DB SYNCED • {unreleasedChaps.length} IN QUEUE
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              ALL {liveCount} CH LIVE (0 IN QUEUE)
                            </span>
                          )}

                          {unreleasedChaps.length > 0 && (
                            <span className="text-[9px] font-bold text-[#fe9a00]">
                              Ch. {unreleasedChaps[0].chapter_number}
                              {unreleasedChaps.length > 1
                                ? ` – Ch. ${unreleasedChaps[unreleasedChaps.length - 1].chapter_number}`
                                : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateTrackItem(item.id, { paused: !item.paused })}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border transition-colors cursor-pointer ${
                            item.paused
                              ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300 hover:bg-emerald-600 hover:text-black'
                              : 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-500 hover:text-black'
                          }`}
                          title={item.paused ? 'Resume Syndication' : 'Pause Syndication'}
                        >
                          {item.paused ? (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="w-2.5 h-2.5" /> Pause
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveTrackItem(item)}
                          className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 transition-colors cursor-pointer"
                          title="Remove Series from Track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 1-CLICK RESCHEDULE CONTROLS: MOVE TRACK DAY, CADENCE & CH/DROP */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-[#fe9a00] mb-1 flex items-center gap-1">
                          <ArrowRightLeft className="w-2.5 h-2.5" /> Track Day
                        </label>
                        <select
                          value={item.dayType}
                          onChange={e =>
                            handleUpdateTrackItem(item.id, {
                              dayType: e.target.value as TrackDayType
                            })
                          }
                          className="w-full bg-black border border-[#fe9a00]/50 rounded-lg px-2 py-1.5 text-[11px] text-[#fe9a00] font-black focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                          title="Move this series to Monday, Wednesday, or Saturday and immediately reschedule its queued chapters in Supabase!"
                        >
                          <option value="MONDAY">Mondays</option>
                          <option value="WEDNESDAY">Wednesdays</option>
                          <option value="SATURDAY">Saturdays</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                          Cadence Rule
                        </label>
                        <select
                          value={item.cadence}
                          onChange={e =>
                            handleUpdateTrackItem(item.id, {
                              cadence: e.target.value as CadencePattern
                            })
                          }
                          className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                        >
                          <option value="weekly">Every Week (Weekly)</option>
                          <option value="odd_weeks">Odd Weeks (Wk 1, 3, 5...)</option>
                          <option value="even_weeks">Even Weeks (Wk 2, 4, 6...)</option>
                          <option value="launch_then_even">Launch Wk 1 + Even Wks</option>
                          <option value="first_3_then_monthly">3-Wk Burst → Monthly</option>
                          <option value="monthly_w1">Monthly (Wk 1, 5, 9...)</option>
                          <option value="monthly_w4">Monthly (Wk 4, 8, 12...)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                          Ch / Drop
                        </label>
                        <select
                          value={item.chaptersPerDrop}
                          onChange={e =>
                            handleUpdateTrackItem(item.id, {
                              chaptersPerDrop: Number(e.target.value)
                            })
                          }
                          className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-white font-black focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                        >
                          <option value={1}>1 Ch / Drop</option>
                          <option value={2}>2 Ch / Drop</option>
                          <option value={3}>3 Ch (Spoon)</option>
                          <option value={6}>6 Ch Pack</option>
                          <option value={10}>10 Ch Launch</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[9px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black uppercase tracking-wider text-zinc-500">
                          Start:
                        </span>
                        <select
                          value={item.startWeekOffset || 1}
                          onChange={e =>
                            handleUpdateTrackItem(item.id, {
                              startWeekOffset: Number(e.target.value)
                            })
                          }
                          className="bg-black border border-zinc-800 rounded px-1.5 py-0.5 text-[9px] text-zinc-300 font-bold cursor-pointer"
                        >
                          <option value={1}>Week 1 ({previewEightDates[0]?.label})</option>
                          <option value={2}>Week 2 ({previewEightDates[1]?.label})</option>
                          <option value={3}>Week 3 ({previewEightDates[2]?.label})</option>
                          <option value={4}>Week 4 ({previewEightDates[3]?.label})</option>
                        </select>
                      </div>

                      {/* Displays ACTUAL Database Dates for Each Queued Chapter */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-zinc-500 font-bold">DB Dates:</span>
                        {unreleasedChaps.length > 0 ? (
                          unreleasedChaps.slice(0, 6).map((ch: any) => {
                            const dbLabel = ch.publish_at
                              ? new Date(ch.publish_at).toLocaleDateString('en-US', {
                                  timeZone: 'America/New_York',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : 'Unset';
                            return (
                              <span
                                key={ch.id}
                                className="px-1.5 py-0.5 rounded bg-black border border-zinc-800 text-zinc-200 font-mono text-[8px]"
                                title={`Database publish_at: ${ch.publish_at || 'None'}`}
                              >
                                Ch.{ch.chapter_number}: {dbLabel}
                              </span>
                            );
                          })
                        ) : (
                          upcomingDropDates.slice(0, 4).map(d => (
                            <span
                              key={d.dateStr}
                              className="px-1.5 py-0.5 rounded bg-black border border-zinc-800 text-zinc-500 font-mono text-[8px]"
                            >
                              W{d.weekNum}: {d.label}
                            </span>
                          ))
                        )}
                        {unreleasedChaps.length > 6 && (
                          <span className="text-[8px] text-zinc-500 font-bold">
                            +{unreleasedChaps.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="release-scheduler-root" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-lg max-w-7xl mx-auto animate-fade-in space-y-6">
      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Series Release Queue Status (Click any series pill to inspect or manually edit individual chapter dates)
          </span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
              <input
                type="checkbox"
                checked={autoQueueNotifs}
                onChange={e => setAutoQueueNotifs(e.target.checked)}
                className="accent-[#fe9a00] w-3.5 h-3.5"
              />
              <Bell className="w-3 h-3" /> Auto-Queue Push Alerts
            </label>

            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('tracks')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                  mode === 'tracks' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3 inline mr-1" /> Track Builder
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                  mode === 'custom' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3 inline mr-1" /> Manual Chapter Dates
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
          {seriesList.map((s: any) => {
            const chaps = chaptersBySeries[s.slug] || [];
            const unreleased = chaps.filter(isChapterUnreleased);
            const liveCount = chaps.length - unreleased.length;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => {
                  setSelectedSeriesSlug(s.slug);
                  setMode('custom');
                }}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-black italic uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  unreleased.length > 0
                    ? 'bg-zinc-900 border-[#fe9a00]/50 text-white hover:border-[#fe9a00]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span>{s.title}:</span>
                <span className="text-emerald-400">{liveCount} LIVE</span>
                <span className="text-zinc-600">•</span>
                <span className={unreleased.length > 0 ? 'text-[#fe9a00]' : 'text-zinc-500'}>
                  {unreleased.length} SCHEDULED
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black border border-zinc-800 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowWildcardModal(!showWildcardModal)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
        >
          <Star className="w-3.5 h-3.5 fill-white" /> + Add Wildcard / Holiday Drop
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAllChapters}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
            Refresh Queue
          </button>

          {mode === 'tracks' && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSyncAllTracksToDatabase}
              className="px-5 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(254,154,0,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-black" />}
              Apply & Sync Schedule to Database
            </button>
          )}
        </div>
      </div>

      {/* WILDCARD / BINGE DROP CREATOR MODAL */}
      {showWildcardModal && (
        <form
          onSubmit={handleCreateWildcard}
          className="bg-purple-950/25 border-2 border-purple-500/60 rounded-2xl p-5 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-[#fe9a00] fill-[#fe9a00]" />
              Schedule Special Wildcard / Spoon Binge Pack (Does Not Disrupt Weekly Tracks)
            </span>
            <button
              type="button"
              onClick={() => setShowWildcardModal(false)}
              className="text-[10px] font-black uppercase text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                Event Title
              </label>
              <input
                type="text"
                placeholder="e.g. Spoon 10-Ch Launch Pack"
                value={wcTitle}
                onChange={e => setWcTitle(e.target.value)}
                required
                className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                Target Series
              </label>
              <select
                value={wcSeriesSlug}
                onChange={e => setWcSeriesSlug(e.target.value)}
                required
                className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold"
              >
                <option value="">-- Select Series --</option>
                {seriesList.map((s: any) => {
                  const q = (chaptersBySeries[s.slug] || []).filter(isChapterUnreleased).length;
                  return (
                    <option key={s.slug} value={s.slug}>
                      {s.title} ({q} Scheduled)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                Drop Date
              </label>
              <input
                type="date"
                value={wcDate}
                onChange={e => setWcDate(e.target.value)}
                required
                className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                Chapters to Drop
              </label>
              <select
                value={wcChapterCount}
                onChange={e => setWcChapterCount(Number(e.target.value))}
                className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-[#fe9a00] font-black"
              >
                <option value={1}>1 Chapter</option>
                <option value={3}>3 Chapters</option>
                <option value={6}>6 Chapters (Monthly Pack)</option>
                <option value={10}>10 Chapters (Arc Launch)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-[#fe9a00] text-black font-black uppercase tracking-widest text-xs rounded-xl cursor-pointer"
          >
            + Add Wildcard Binge Drop
          </button>
        </form>
      )}

      {/* ACTIVE WILDCARDS PILL LIST */}
      {wildcards.length > 0 && (
        <div className="bg-purple-950/20 border border-purple-500/40 rounded-2xl p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-purple-300">
            Queued Wildcard / Binge Drops ({wildcards.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {wildcards.map(wc => {
              const s = seriesList.find((item: any) => item.slug === wc.seriesSlug);
              return (
                <div
                  key={wc.id}
                  className="bg-black border border-purple-500/50 rounded-xl px-3 py-2 flex items-center gap-3 text-xs"
                >
                  <span className="font-black text-[#fe9a00] uppercase">{wc.title}</span>
                  <span className="text-white font-bold">
                    {s?.title || wc.seriesSlug} ({wc.chapterIds.length} Ch)
                  </span>
                  <span className="text-zinc-400 font-mono text-[10px]">{wc.dateStr}</span>
                  <button
                    type="button"
                    onClick={() => setWildcards(prev => prev.filter(w => w.id !== wc.id))}
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN VIEW: 3-COLUMN AUTOMATION TRACKS OR MANUAL CHAPTER OVERRIDE */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#fe9a00]" /> Loading Release Queue...
        </div>
      ) : mode === 'tracks' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {renderTrackColumn(
              'MONDAY',
              '📅 MONDAY MOMENTUM TRACK',
              'EVERY MONDAY DROP • @ 09:00 AM EST (PLUS: 12H EARLY)',
              'border-blue-500/30',
              'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            )}

            {renderTrackColumn(
              'WEDNESDAY',
              '🥄 WEDNESDAY ORIGINALS & OSW',
              'EVERY WEDNESDAY DROP • @ 09:00 AM EST (PLUS: 12H EARLY)',
              'border-emerald-500/30',
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            )}

            {renderTrackColumn(
              'SATURDAY',
              '⚡ SATURDAY MORNING FLAGSHIP',
              'EVERY SATURDAY DROP • @ 09:00 AM EST (PLUS: 12H EARLY)',
              'border-[#fe9a00]/40',
              'bg-[#fe9a00] text-black'
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSyncAllTracksToDatabase}
            className="w-full py-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-black" />
            )}
            {saving
              ? 'Syncing All Release Tracks to Database...'
              : 'Sync & Save All Active Release Tracks to Database'}
          </button>
        </>
      ) : (
        <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Individual Series Chapter Date Inspector & Override
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                Inspect or fine-tune exact dates for any individual chapter
              </p>
            </div>

            <select
              value={selectedSeriesSlug}
              onChange={e => setSelectedSeriesSlug(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="">-- Choose Series to Inspect --</option>
              {seriesList.map((s: any) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {selectedSeriesSlug && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {currentSeriesChapters.map((ch: any) => {
                const cId = String(ch.id);
                const edit = oneOffEdits[cId] || {
                  date: formatDateInput(new Date()),
                  time: '09:00',
                  isPublished: true
                };
                const isFuture = isChapterUnreleased(ch);

                return (
                  <div
                    key={cId}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isFuture
                        ? 'bg-zinc-900 border-[#fe9a00]/50'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-white uppercase">
                        Ch. {ch.chapter_number}: {ch.title || `Chapter ${ch.chapter_number}`}
                      </span>
                      {isFuture ? (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40">
                          Scheduled ({edit.date})
                        </span>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400">
                          Live
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isFuture && (
                        <button
                          type="button"
                          onClick={() => handleInstantPushChapterLive(ch)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 fill-black" /> Push Live Now
                        </button>
                      )}
                      <input
                        type="date"
                        value={edit.date}
                        onChange={e =>
                          setOneOffEdits(prev => ({
                            ...prev,
                            [cId]: { ...edit, date: e.target.value, isPublished: true }
                          }))
                        }
                        className="bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                      />
                      <input
                        type="time"
                        value={edit.time}
                        onChange={e =>
                          setOneOffEdits(prev => ({
                            ...prev,
                            [cId]: { ...edit, time: e.target.value, isPublished: true }
                          }))
                        }
                        className="bg-black border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setOneOffEdits(prev => ({
                            ...prev,
                            [cId]: { ...edit, isPublished: !edit.isPublished }
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer ${
                          edit.isPublished
                            ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-300'
                            : 'bg-[#fe9a00]/20 border border-[#fe9a00]/50 text-[#fe9a00]'
                        }`}
                      >
                        {edit.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {edit.isPublished ? 'Active' : 'Queued'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedSeriesSlug && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCustomChapterDates}
              className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Custom Chapter Dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};