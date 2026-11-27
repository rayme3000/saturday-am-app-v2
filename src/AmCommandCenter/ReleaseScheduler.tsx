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
  Pause,
  Play,
  Calendar,
  BookOpen,
  Lock,
  Search,
  Wrench,
  Clock,
  ArrowRightLeft,
  Package
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';
import {
  getOneShotWednesdaySeries,
  isInOneShotDebutWindow,
  getOneShotFreeCountdown,
  getScheduledOneShotDebutFutureMs
} from '../oneshotWednesday';

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

// Formats a Date or ISO timestamp into YYYY-MM-DD in Eastern Time so UTC offsets never shift the day
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

const toLocalDateTimeValue = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
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

// Fallback defaults used ONLY when a brand-new series has zero scheduled chapters yet.
export const CANONICAL_SERIES_TRACK_DEFAULTS: Record<
  string,
  { dayType: TrackDayType; cadence: CadencePattern; chaptersPerDrop?: number }
> = {
  underground: { dayType: 'WEDNESDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'fan-x-boy': { dayType: 'WEDNESDAY', cadence: 'first_3_then_monthly', chaptersPerDrop: 1 },
  spoon: { dayType: 'WEDNESDAY', cadence: 'weekly', chaptersPerDrop: 3 },
  hammer: { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  redskin: { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  zephyr: { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'titan-king': { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  orisha: { dayType: 'MONDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'apple-black': { dayType: 'SATURDAY', cadence: 'odd_weeks', chaptersPerDrop: 1 },
  'clock-striker': { dayType: 'SATURDAY', cadence: 'launch_then_even', chaptersPerDrop: 1 },
  'saturday-playdate': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'bully-eater': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'gun-bone': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'oblivion-rouge': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  mmwog: { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'yellow-stringer': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 },
  'soul-beat': { dayType: 'SATURDAY', cadence: 'weekly', chaptersPerDrop: 1 }
};

export const doesWeekMatchCadence = (
  weekNum: number,
  cadence: CadencePattern,
  startWeekOffset: number
): boolean => {
  const offset = Math.max(1, startWeekOffset || 1);
  if (weekNum < offset) return false;
  const rel = weekNum - offset;

  switch (cadence) {
    case 'weekly':
      return true;
    case 'odd_weeks':
    case 'even_weeks':
    case 'launch_then_odd':
      // Always start on the chosen Next Start Slot, then space every 2 weeks
      return rel % 2 === 0;
    case 'launch_then_even':
      return rel === 0 || (rel >= 1 && (rel - 1) % 2 === 0);
    case 'first_3_then_monthly':
      return rel < 3 || (rel > 2 && (rel - 2) % 4 === 0);
    case 'monthly_w1':
    case 'monthly_w4':
      return rel % 4 === 0;
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

  const estDateStr = formatDateInput(now);
  const [ey, em, ed] = estDateStr.split('-').map(Number);
  let estHour = now.getHours();
  try {
    const hrPart = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    })
      .formatToParts(now)
      .find(p => p.type === 'hour')?.value;
    if (hrPart !== undefined) estHour = Number(hrPart) % 24;
  } catch {
    // fallback to local hour
  }

  const cursor = new Date(ey, em - 1, ed, 12, 0, 0, 0);

  if (cursor.getDay() === targetDow && estHour >= 9) {
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

const inferStartWeekOffsetFromDb = (
  dayType: TrackDayType,
  firstPublishIso?: string | null
): number => {
  if (!firstPublishIso) return 1;
  const targetDateStr = formatDateInput(new Date(firstPublishIso));
  const upcoming = getUpcomingDatesForDay(dayType, 16);
  const exactMatch = upcoming.find(u => u.dateStr === targetDateStr);
  if (exactMatch) return exactMatch.weekNum;

  const targetMs = new Date(`${targetDateStr}T12:00:00`).getTime();
  for (const u of upcoming) {
    const uMs = new Date(`${u.dateStr}T12:00:00`).getTime();
    if (uMs >= targetMs - 3 * 24 * 60 * 60 * 1000) {
      return u.weekNum;
    }
  }
  return 1;
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

export const ReleaseScheduler = ({ setIsDirty }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [activeSubTab, setActiveSubTab] = useState<'tracks' | 'series_status' | 'chapters'>('tracks');
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [homeSectionsList, setHomeSectionsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoQueueNotifs, setAutoQueueNotifs] = useState(true);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Tab 1: Weekly Tracks state
  const [trackAssignments, setTrackAssignments] = useState<TrackAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TRACKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Tab 2: Series Visibility, Vault & One-Shots state
  const [seriesSearch, setSeriesSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<'all' | 'published' | 'hidden' | 'vault'>('all');
  const [debutScheduleDrafts, setDebutScheduleDrafts] = useState<Record<string, string>>({});

  // Tab 3: Individual Chapters & Multi-Chapter Event Drop state
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState<string>('');
  const [oneOffEdits, setOneOffEdits] = useState<
    Record<string, { date: string; time: string; isPublished: boolean }>
  >({});
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchSeriesSlug, setBatchSeriesSlug] = useState('');
  const [batchDate, setBatchDate] = useState(() => formatDateInput(new Date()));
  const [batchCount, setBatchCount] = useState(3);

  const showNotice = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 5000);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRACKS_KEY, JSON.stringify(trackAssignments));
    } catch {
      // ignore
    }
  }, [trackAssignments]);

  useEffect(() => {
    supabase
      .from('home_sections')
      .select('title, display_order')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setHomeSectionsList(data.map((r: any) => r.title).filter(Boolean));
        }
      });
  }, []);

  const isChapterUnreleased = useCallback((ch: any) => {
    if (!ch.is_published) return true;
    if (ch.publish_at && new Date(ch.publish_at).getTime() > Date.now()) return true;
    return false;
  }, []);

  const isChapterCurrentlyLive = useCallback((ch: any) => {
    if (!ch.is_published) return false;
    if (!ch.publish_at) return true;
    return new Date(ch.publish_at).getTime() <= Date.now();
  }, []);

  // Updates ONLY the single target series' unreleased chapters when explicitly requested
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

          if (autoQueueNotifs && matchedSeries && !matchedSeries.is_hidden) {
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

  const detectCadenceFromDbChapters = (unreleasedChaps: any[], slug: string): CadencePattern => {
    const slugLower = slug.toLowerCase();
    const canonical = CANONICAL_SERIES_TRACK_DEFAULTS[slugLower];

    if (
      unreleasedChaps.length >= 2 &&
      unreleasedChaps[0].publish_at &&
      unreleasedChaps[1].publish_at
    ) {
      const t1 = new Date(unreleasedChaps[0].publish_at).getTime();
      const t2 = new Date(unreleasedChaps[1].publish_at).getTime();
      const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
      if (diffDays >= 13 && diffDays <= 15) {
        return canonical?.cadence === 'even_weeks' || canonical?.cadence === 'launch_then_even'
          ? canonical.cadence
          : 'odd_weeks';
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
        .select(
          'id, series_slug, chapter_number, title, thumbnail_url, is_published, publish_at, created_at'
        )
        .order('series_slug', { ascending: true })
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      const chaptersList = data || [];

      if (chaptersList.length > 0) {
        const now = Date.now();
        const unreleasedBySlug = new Map<string, any[]>();

        chaptersList.forEach((ch: any) => {
          const isUnrel =
            !ch.is_published || (ch.publish_at && new Date(ch.publish_at).getTime() > now);
          if (isUnrel && ch.series_slug) {
            const list = unreleasedBySlug.get(ch.series_slug) || [];
            list.push(ch);
            unreleasedBySlug.set(ch.series_slug, list);
          }
        });

        // Read-only sync from Supabase into local UI state (never overwrites DB dates!)
        setTrackAssignments(prev => {
          const bySlug = new Map<string, TrackAssignment>();
          prev.forEach(t => bySlug.set(t.seriesSlug, t));

          unreleasedBySlug.forEach((unrelChaps, slug) => {
            const matchedSeries = seriesList.find((s: any) => s.slug === slug);
            if (matchedSeries?.home_section === 'Completed Runs') return;

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
            const resolvedDay = dbDayType || existing?.dayType || canonical?.dayType || 'SATURDAY';
            const resolvedCadence = detectCadenceFromDbChapters(sorted, slug);
            const resolvedOffset = firstWithDate?.publish_at
              ? inferStartWeekOffsetFromDb(resolvedDay, firstWithDate.publish_at)
              : existing?.startWeekOffset || 1;

            if (existing) {
              bySlug.set(slug, {
                ...existing,
                dayType: resolvedDay,
                cadence: sorted.length >= 2 ? resolvedCadence : existing.cadence,
                startWeekOffset: resolvedOffset
              });
            } else {
              bySlug.set(slug, {
                id: `${resolvedDay}_${slug}`,
                seriesSlug: slug,
                dayType: resolvedDay,
                cadence: resolvedCadence,
                chaptersPerDrop: canonical?.chaptersPerDrop || 1,
                startWeekOffset: resolvedOffset,
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
  }, [seriesList]);

  useEffect(() => {
    fetchAllChapters();
    const handleVaultUpdated = () => fetchAllChapters();
    window.addEventListener('vaultUpdated', handleVaultUpdated);
    return () => window.removeEventListener('vaultUpdated', handleVaultUpdated);
  }, [fetchAllChapters]);

  const chaptersBySeries = useMemo(() => {
    const map: Record<string, any[]> = {};
    allChapters.forEach((ch: any) => {
      if (!map[ch.series_slug]) map[ch.series_slug] = [];
      map[ch.series_slug].push(ch);
    });
    return map;
  }, [allChapters]);

  // ============================================================================
  // TAB 1 HANDLERS: WEEKLY TRACKS (SAFE PER-SERIES UPDATES ONLY)
  // ============================================================================
  const handleAddSeriesToTrack = async (dayType: TrackDayType, seriesSlug: string) => {
    if (!seriesSlug) return;
    if (trackAssignments.some(t => t.dayType === dayType && t.seriesSlug === seriesSlug)) {
      return alert('This series is already assigned to this release day.');
    }

    const canonical = CANONICAL_SERIES_TRACK_DEFAULTS[seriesSlug.toLowerCase()];
    const newItem: TrackAssignment = {
      id: `${dayType}_${seriesSlug}_${Date.now()}`,
      seriesSlug,
      dayType,
      cadence: canonical?.cadence || 'weekly',
      chaptersPerDrop: canonical?.chaptersPerDrop || 1,
      startWeekOffset: 1,
      paused: false
    };

    const nextTracks = [...trackAssignments.filter(t => t.seriesSlug !== seriesSlug), newItem];
    setTrackAssignments(nextTracks);

    const seriesChaps = chaptersBySeries[seriesSlug] || [];
    const unreleasedCount = seriesChaps.filter(isChapterUnreleased).length;
    if (unreleasedCount > 0) {
      if (
        window.confirm(
          `Schedule the ${unreleasedCount} queued chapter(s) of this series onto ${dayType}s starting Week 1?`
        )
      ) {
        setSaving(true);
        try {
          await syncSingleTrackToDatabase(newItem, seriesChaps);
          window.dispatchEvent(new Event('seriesUpdated'));
          window.dispatchEvent(new Event('vaultUpdated'));
          await fetchAllChapters();
          showNotice(`Scheduled ${unreleasedCount} queued chapter(s) onto ${dayType}s.`);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleUpdateTrackItem = async (id: string, patch: Partial<TrackAssignment>) => {
    const existing = trackAssignments.find(t => t.id === id);
    if (!existing) return;
    const updatedItem: TrackAssignment = { ...existing, ...patch };
    setTrackAssignments(prev => prev.map(item => (item.id === id ? updatedItem : item)));

    // Only touch DB if user changed Day, Cadence, Ch/Drop, or Start Week on an unpaused series with queued chapters
    const scheduleRuleChanged =
      patch.dayType !== undefined ||
      patch.cadence !== undefined ||
      patch.chaptersPerDrop !== undefined ||
      patch.startWeekOffset !== undefined;

    const seriesChaps = chaptersBySeries[updatedItem.seriesSlug] || [];
    const matchedSeries = seriesList.find((s: any) => s.slug === updatedItem.seriesSlug);

    if (scheduleRuleChanged && !updatedItem.paused && seriesChaps.some(isChapterUnreleased)) {
      if (
        !window.confirm(
          `Update queued chapter dates for "${matchedSeries?.title || updatedItem.seriesSlug}" to match this new rule? (Other series will NOT be affected.)`
        )
      ) {
        setTrackAssignments(prev => prev.map(item => (item.id === id ? existing : item)));
        return;
      }

      setSaving(true);
      try {
        const count = await syncSingleTrackToDatabase(updatedItem, seriesChaps);
        window.dispatchEvent(new Event('seriesUpdated'));
        window.dispatchEvent(new Event('vaultUpdated'));
        await fetchAllChapters();
        showNotice(
          `Updated ${count} queued chapter date(s) for ${matchedSeries?.title || updatedItem.seriesSlug}.`
        );
      } catch (err: any) {
        alert('Error updating series schedule: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleRemoveTrackItem = (item: TrackAssignment) => {
    const matchedSeries = seriesList.find((s: any) => s.slug === item.seriesSlug);
    const title = matchedSeries?.title || item.seriesSlug;
    if (
      !window.confirm(
        `Remove "${title}" from the ${item.dayType} board? (Existing chapter dates in the database will remain untouched.)`
      )
    )
      return;
    setTrackAssignments(prev => prev.filter(t => t.id !== item.id));
  };

  // ============================================================================
  // TAB 2 HANDLERS: SERIES VISIBILITY, VAULT (COMPLETED RUNS) & ONE-SHOT DEBUTS
  // ============================================================================
  const handleToggleSeriesPublishStatus = async (seriesObj: any) => {
    const nextHidden = !seriesObj.is_hidden;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('series')
        .update({ is_hidden: nextHidden })
        .eq('slug', seriesObj.slug);
      if (error) throw error;

      if (nextHidden) {
        await supabase
          .from('app_notifications')
          .delete()
          .eq('source_key', `series_${seriesObj.slug}`);
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      showNotice(
        nextHidden
          ? `Unpublished "${seriesObj.title}" (Hidden from readers).`
          : `Published "${seriesObj.title}" (Visible to readers).`
      );
    } catch (err: any) {
      alert('Failed to update series visibility: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSeriesHomeSection = async (seriesObj: any, nextSection: string) => {
    setSaving(true);
    try {
      const patch: Record<string, any> = {
        home_section: nextSection || null
      };
      // If moving directly into Completed Runs without an active debut, set publish_at > 3 days ago so it enters normal Vault/OSW rotation cleanly
      if (nextSection === 'Completed Runs' && !isInOneShotDebutWindow(seriesObj, seriesList)) {
        const futureMs = getScheduledOneShotDebutFutureMs(seriesObj, seriesList);
        if (!futureMs) {
          patch.publish_at = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const { error } = await supabase.from('series').update(patch).eq('slug', seriesObj.slug);
      if (error) throw error;

      // Also remove from weekly ongoing tracks if moved to Completed Runs
      if (nextSection === 'Completed Runs') {
        setTrackAssignments(prev => prev.filter(t => t.seriesSlug !== seriesObj.slug));
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      showNotice(
        nextSection === 'Completed Runs'
          ? `Moved "${seriesObj.title}" into Completed Runs (PLUS Vault & One-Shot Wednesday Rotation).`
          : `Assigned "${seriesObj.title}" to homepage shelf: ${nextSection || 'Unassigned'}.`
      );
    } catch (err: any) {
      alert('Failed to update homepage shelf: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleFreeDebutRun = async (seriesObj: any, customStartLocal?: string) => {
    setSaving(true);
    try {
      let publishIso = new Date().toISOString();
      if (customStartLocal) {
        const parsed = new Date(customStartLocal);
        if (!isNaN(parsed.getTime())) {
          publishIso = parsed.toISOString();
        }
      }

      // 1. Set series to Published, Completed Runs, and set publish_at to the debut start timestamp
      const { error: sErr } = await supabase
        .from('series')
        .update({
          home_section: 'Completed Runs',
          is_hidden: false,
          publish_at: publishIso
        })
        .eq('slug', seriesObj.slug);
      if (sErr) throw sErr;

      // 2. Sync chapters of this One-Shot to publish at the exact same debut timestamp
      await supabase
        .from('chapters')
        .update({
          is_published: true,
          publish_at: publishIso
        })
        .eq('series_slug', seriesObj.slug);

      // 3. Remove from ongoing weekly tracks if it was sitting there
      setTrackAssignments(prev => prev.filter(t => t.seriesSlug !== seriesObj.slug));

      // 4. Queue automated launch notification at debut start time
      if (autoQueueNotifs) {
        await supabase.from('app_notifications').upsert(
          [
            {
              title: '⚡ Special One-Shot Debut (Free Unlock)!',
              message: `Read "${seriesObj.title}" FREE for a limited time before it enters the Saturday AM+ Vault!`,
              thumbnail_url: seriesObj.cover_url || seriesObj.character_url || null,
              link_target: seriesObj.slug,
              publish_at: publishIso,
              created_at: publishIso,
              source_key: `series_${seriesObj.slug}`
            }
          ],
          { onConflict: 'source_key' }
        );
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();

      const isFuture = new Date(publishIso).getTime() > Date.now() + 60000;
      showNotice(
        isFuture
          ? `Scheduled "${seriesObj.title}" Free Debut for ${new Date(
              publishIso
            ).toLocaleString()}! It will automatically move into the PLUS Vault & One-Shot Wednesday rotation afterwards.`
          : `"${seriesObj.title}" is now LIVE & FREE, and will automatically enter the PLUS Vault & One-Shot Wednesday rotation when its debut timer ends!`
      );
    } catch (err: any) {
      alert('Failed to schedule debut: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEndDebutAndMoveToVaultNow = async (seriesObj: any) => {
    setSaving(true);
    try {
      const pastIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('series')
        .update({
          home_section: 'Completed Runs',
          publish_at: pastIso
        })
        .eq('slug', seriesObj.slug);
      if (error) throw error;
      window.dispatchEvent(new Event('seriesUpdated'));
      showNotice(
        `Ended free debut window for "${seriesObj.title}" — now locked in PLUS Vault & One-Shot Wednesday rotation.`
      );
    } catch (err: any) {
      alert('Error ending debut window: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // TAB 3 HANDLERS: INDIVIDUAL CHAPTER PUBLISHING, DATES & MULTI-CHAPTER PACKS
  // ============================================================================
  const currentSeriesChapters = useMemo(() => {
    if (!selectedSeriesSlug) return [];
    return [...(chaptersBySeries[selectedSeriesSlug] || [])].sort(
      (a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number)
    );
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

  const handleToggleSingleChapterVisibility = async (ch: any) => {
    setSaving(true);
    try {
      const nextPub = !ch.is_published;
      const { error } = await supabase
        .from('chapters')
        .update({ is_published: nextPub })
        .eq('id', ch.id);
      if (error) throw error;
      if (!nextPub) {
        await supabase.from('app_notifications').delete().eq('source_key', `chapter_${ch.id}`);
      }
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
    } catch (err: any) {
      alert('Failed to update chapter visibility: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInstantPushChapterLive = async (ch: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          is_published: true,
          publish_at: new Date().toISOString()
        })
        .eq('id', ch.id);
      if (error) throw error;
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
      showNotice(`Chapter ${ch.chapter_number} is now LIVE!`);
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
          matchedSeries &&
          !matchedSeries.is_hidden
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
      if (setIsDirty) setIsDirty(false);
      await fetchAllChapters();
      showNotice(`Saved chapter dates for ${matchedSeries?.title || selectedSeriesSlug}.`);
    } catch (err: any) {
      alert('Error saving chapter dates: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRepairSeriesCutoff = async () => {
    if (!selectedSeriesSlug || currentSeriesChapters.length === 0) return;
    const matchedSeries = seriesList.find((s: any) => s.slug === selectedSeriesSlug);
    const input = window.prompt(
      `Set Live vs. Scheduled Cutoff for ${matchedSeries?.title || selectedSeriesSlug}:\n\nEnter the HIGHEST Chapter Number that should be LIVE right now:`,
      '1'
    );
    if (!input) return;
    const cutoffNum = Number(input.trim());
    if (isNaN(cutoffNum) || cutoffNum < 0) return alert('Invalid chapter number.');

    setSaving(true);
    try {
      const toMakeLive = currentSeriesChapters.filter(
        (c: any) => Number(c.chapter_number) <= cutoffNum
      );
      const toSchedule = currentSeriesChapters.filter(
        (c: any) => Number(c.chapter_number) > cutoffNum
      );

      for (const ch of toMakeLive) {
        const isNewest = Number(ch.chapter_number) === cutoffNum;
        const ts = isNewest
          ? new Date(Date.now() - 60 * 60 * 1000).toISOString()
          : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase
          .from('chapters')
          .update({ is_published: true, publish_at: ts })
          .eq('id', ch.id);
        if (error) throw error;
      }

      if (toSchedule.length > 0) {
        const assignedTrack = trackAssignments.find(t => t.seriesSlug === selectedSeriesSlug);
        const dayType = assignedTrack?.dayType || 'SATURDAY';
        const cadence = assignedTrack?.cadence || 'weekly';
        const countPerDrop = Math.max(1, assignedTrack?.chaptersPerDrop || 1);
        const validDates = getMatchingDropDatesForTrack(
          dayType,
          cadence,
          1,
          Math.ceil(toSchedule.length / countPerDrop) + 2
        );

        let cursor = 0;
        for (const dropDay of validDates) {
          if (cursor >= toSchedule.length) break;
          const publishIso = toNineAmEstIso(dropDay.dateStr, '09:00');
          for (let i = 0; i < countPerDrop; i++) {
            if (cursor >= toSchedule.length) break;
            const ch = toSchedule[cursor++];
            const { error } = await supabase
              .from('chapters')
              .update({ is_published: true, publish_at: publishIso })
              .eq('id', ch.id);
            if (error) throw error;
          }
        }
      }

      window.dispatchEvent(new Event('vaultUpdated'));
      window.dispatchEvent(new Event('seriesUpdated'));
      await fetchAllChapters();
      showNotice(
        `Updated ${matchedSeries?.title}: Ch. 1–${cutoffNum} Live, Ch. ${cutoffNum + 1}+ Scheduled.`
      );
    } catch (err: any) {
      alert('Error repairing cutoff: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleMultiChapterEventDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSeriesSlug || !batchDate) return alert('Please select a series and release date.');

    const unreleased = (chaptersBySeries[batchSeriesSlug] || [])
      .filter(isChapterUnreleased)
      .sort((a: any, b: any) => Number(a.chapter_number) - Number(b.chapter_number));

    if (unreleased.length === 0) {
      return alert('That series has no unreleased/queued chapters to schedule.');
    }

    const picked = unreleased.slice(0, Math.max(1, batchCount));
    const publishIso = toNineAmEstIso(batchDate, '09:00');
    const matchedSeries = seriesList.find((s: any) => s.slug === batchSeriesSlug);

    setSaving(true);
    try {
      for (const ch of picked) {
        const { error } = await supabase
          .from('chapters')
          .update({
            is_published: true,
            publish_at: publishIso
          })
          .eq('id', ch.id);
        if (error) throw error;

        if (autoQueueNotifs && matchedSeries && !matchedSeries.is_hidden) {
          await supabase.from('app_notifications').upsert(
            [
              {
                title: batchTitle.trim() || 'Multi-Chapter Release!',
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

      setShowBatchModal(false);
      setBatchTitle('');
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchAllChapters();
      showNotice(
        `Scheduled ${picked.length} chapter(s) of ${
          matchedSeries?.title || batchSeriesSlug
        } for ${batchDate} at 9:00 AM EST!`
      );
    } catch (err: any) {
      alert('Failed to schedule multi-chapter drop: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTrackColumn = (
    dayType: TrackDayType,
    dayHeading: string,
    accentBorder: string,
    badgeBg: string
  ) => {
    const items = trackAssignments.filter(t => t.dayType === dayType);
    const previewDates = getUpcomingDatesForDay(dayType, 6);

    return (
      <div
        className={`bg-zinc-950 border ${accentBorder} rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span
              className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${badgeBg}`}
            >
              {dayHeading}
            </span>
            <p className="text-[10px] font-bold text-zinc-400 mt-1">
              9:00 AM EST • PLUS Early Access 12h Prior
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
            {items.length} Series
          </span>
        </div>

        <div>
          <select
            value=""
            onChange={e => handleAddSeriesToTrack(dayType, e.target.value)}
            className="w-full bg-black border border-zinc-700 hover:border-[#fe9a00] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
          >
            <option value="">+ Add Ongoing Series to {dayHeading}...</option>
            {seriesList
              .filter((s: any) => s.home_section !== 'Completed Runs')
              .map((s: any) => {
                const chaps = chaptersBySeries[s.slug] || [];
                const queued = chaps.filter(isChapterUnreleased).length;
                return (
                  <option key={s.slug} value={s.slug}>
                    {s.title} ({queued} Queued)
                  </option>
                );
              })}
          </select>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl py-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              No series assigned to {dayHeading}
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

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                    item.paused
                      ? 'bg-zinc-950/60 border-zinc-800 opacity-65'
                      : unreleasedChaps.length > 0
                      ? 'bg-zinc-900/90 border-zinc-700 hover:border-[#fe9a00]/60'
                      : 'bg-zinc-900/40 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black italic uppercase text-white truncate">
                          {fullTitle}
                        </h4>
                        {matchedSeries?.is_hidden && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                            Series Hidden
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                        <span className="text-emerald-400">{liveCount} Live</span>
                        {' • '}
                        <span className={unreleasedChaps.length > 0 ? 'text-[#fe9a00]' : 'text-zinc-500'}>
                          {unreleasedChaps.length} Scheduled
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateTrackItem(item.id, { paused: !item.paused })}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer flex items-center gap-1 ${
                          item.paused
                            ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
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
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 cursor-pointer"
                        title="Remove from Track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Next Upcoming Drop Dates Summary */}
                  {unreleasedChaps.length > 0 && (
                    <div className="bg-black/70 border border-zinc-800 rounded-lg p-2 flex flex-wrap gap-1.5">
                      {unreleasedChaps.slice(0, 4).map((ch: any) => {
                        const dateTxt = ch.publish_at
                          ? new Date(ch.publish_at).toLocaleDateString('en-US', {
                              timeZone: 'America/New_York',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'Unset';
                        return (
                          <span
                            key={ch.id}
                            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200"
                          >
                            Ch.{ch.chapter_number}: <strong className="text-[#fe9a00]">{dateTxt}</strong>
                          </span>
                        );
                      })}
                      {unreleasedChaps.length > 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSeriesSlug(item.seriesSlug);
                            setActiveSubTab('chapters');
                          }}
                          className="text-[9px] font-black text-[#fe9a00] hover:underline px-1 cursor-pointer"
                        >
                          +{unreleasedChaps.length - 4} more →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Clean Generic Controls */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1">
                        <ArrowRightLeft className="w-2.5 h-2.5 inline mr-0.5" /> Day
                      </label>
                      <select
                        value={item.dayType}
                        onChange={e =>
                          handleUpdateTrackItem(item.id, {
                            dayType: e.target.value as TrackDayType
                          })
                        }
                        className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-white font-bold cursor-pointer"
                      >
                        <option value="MONDAY">Mondays</option>
                        <option value="WEDNESDAY">Wednesdays</option>
                        <option value="SATURDAY">Saturdays</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1">
                        Frequency
                      </label>
                      <select
                        value={item.cadence}
                        onChange={e =>
                          handleUpdateTrackItem(item.id, {
                            cadence: e.target.value as CadencePattern
                          })
                        }
                        className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-white font-bold cursor-pointer"
                      >
                        <option value="weekly">Every Week</option>
                        <option value="odd_weeks">Bi-Weekly (Odd Wks)</option>
                        <option value="even_weeks">Bi-Weekly (Even Wks)</option>
                        <option value="launch_then_even">Wk 1 + Even Wks</option>
                        <option value="first_3_then_monthly">3 Weekly → Monthly</option>
                        <option value="monthly_w1">Monthly (1st Wk)</option>
                        <option value="monthly_w4">Monthly (4th Wk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1">
                        Per Drop
                      </label>
                      <select
                        value={item.chaptersPerDrop}
                        onChange={e =>
                          handleUpdateTrackItem(item.id, {
                            chaptersPerDrop: Number(e.target.value)
                          })
                        }
                        className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-[#fe9a00] font-black cursor-pointer"
                      >
                        <option value={1}>1 Ch / Drop</option>
                        <option value={2}>2 Ch / Drop</option>
                        <option value={3}>3 Ch / Drop</option>
                        <option value={5}>5 Ch Pack</option>
                        <option value={10}>10 Ch Pack</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const activeOffset = Math.max(1, item.startWeekOffset || 1);
                    const slotDates =
                      activeOffset > previewDates.length
                        ? getUpcomingDatesForDay(dayType, activeOffset + 2)
                        : previewDates;
                    const expectedFirstDate = slotDates[activeOffset - 1]?.dateStr;
                    const actualFirstDate = unreleasedChaps[0]?.publish_at
                      ? formatDateInput(new Date(unreleasedChaps[0].publish_at))
                      : '';
                    const isOutOfSync =
                      !item.paused &&
                      unreleasedChaps.length > 0 &&
                      expectedFirstDate &&
                      actualFirstDate !== expectedFirstDate;

                    return (
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[9px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-500 uppercase">Next Start Slot:</span>
                          <select
                            value={activeOffset}
                            onChange={e =>
                              handleUpdateTrackItem(item.id, {
                                startWeekOffset: Number(e.target.value)
                              })
                            }
                            className="bg-black border border-zinc-800 rounded px-2 py-0.5 text-zinc-300 font-bold cursor-pointer"
                          >
                            {slotDates.slice(0, Math.max(6, activeOffset)).map(sd => (
                              <option key={sd.weekNum} value={sd.weekNum}>
                                {sd.weekNum === 1
                                  ? `Next ${dayHeading.slice(0, -1)} (${sd.label})`
                                  : `In ${sd.weekNum} Weeks (${sd.label})`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOutOfSync && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTrackItem(item.id, { startWeekOffset: activeOffset })
                              }
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/50 hover:bg-[#fe9a00] hover:text-black cursor-pointer"
                              title="Align queued chapter dates to this exact start slot"
                            >
                              ⚡ Sync Queue
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSeriesSlug(item.seriesSlug);
                              setActiveSubTab('chapters');
                            }}
                            className="text-[9px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                          >
                            Edit Chapters →
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const filteredSeriesForStatusTab = useMemo(() => {
    const q = seriesSearch.trim().toLowerCase();
    return seriesList.filter((s: any) => {
      if (seriesFilter === 'published' && s.is_hidden) return false;
      if (seriesFilter === 'hidden' && !s.is_hidden) return false;
      if (seriesFilter === 'vault' && s.home_section !== 'Completed Runs') return false;
      if (!q) return true;
      return (
        String(s.title || '').toLowerCase().includes(q) ||
        String(s.creator_name || '').toLowerCase().includes(q)
      );
    });
  }, [seriesList, seriesSearch, seriesFilter]);

  const currentWednesdayPick = getOneShotWednesdaySeries(seriesList);

  return (
    <div
      id="release-scheduler-root"
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-lg max-w-7xl mx-auto animate-fade-in space-y-6"
    >
      {/* HEADER & 3 CLEAN SUB-TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#fe9a00]" /> Publishing &amp; Release Scheduler
          </h2>
          <p className="text-[11px] text-zinc-400 font-bold mt-1">
            Manage weekly release days, series visibility, Completed Runs / One-Shot launches, and individual chapter dates in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-black border border-zinc-800 px-3 py-2 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
            <input
              type="checkbox"
              checked={autoQueueNotifs}
              onChange={e => setAutoQueueNotifs(e.target.checked)}
              className="accent-[#fe9a00] w-3.5 h-3.5"
            />
            <Bell className="w-3.5 h-3.5" /> Auto-Queue Push Alerts
          </label>

          <button
            type="button"
            onClick={fetchAllChapters}
            className="px-3.5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* NAVIGATION PILLS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-black p-2 rounded-2xl border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('tracks')}
          className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer border ${
            activeSubTab === 'tracks'
              ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-lg'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4" /> 1. Weekly Release Tracks
          </div>
          <div
            className={`text-[10px] font-bold mt-0.5 ${
              activeSubTab === 'tracks' ? 'text-black/80' : 'text-zinc-500'
            }`}
          >
            Ongoing Monday, Wednesday &amp; Saturday Lineup
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('series_status')}
          className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer border ${
            activeSubTab === 'series_status'
              ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-lg'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> 2. Series Visibility &amp; One-Shots
          </div>
          <div
            className={`text-[10px] font-bold mt-0.5 ${
              activeSubTab === 'series_status' ? 'text-black/80' : 'text-zinc-500'
            }`}
          >
            Publish / Hide Series, PLUS Vault &amp; Free Debuts
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('chapters')}
          className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer border ${
            activeSubTab === 'chapters'
              ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-lg'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> 3. Chapters &amp; Multi-Chapter Drops
          </div>
          <div
            className={`text-[10px] font-bold mt-0.5 ${
              activeSubTab === 'chapters' ? 'text-black/80' : 'text-zinc-500'
            }`}
          >
            Custom Chapter Dates, Hide/Publish &amp; Batch Drops
          </div>
        </button>
      </div>

      {statusBanner && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {statusBanner}
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[10px] text-emerald-400 hover:text-white uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#fe9a00]" /> Loading Current Schedule...
        </div>
      ) : activeSubTab === 'tracks' ? (
        /* ===================================================================
           TAB 1: WEEKLY RELEASE TRACKS (MONDAY / WEDNESDAY / SATURDAY)
        =================================================================== */
        <div className="space-y-4">
          <div className="bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300 font-bold">
            <span>
              🛡️ <strong className="text-white">Safe Per-Series Mode:</strong> Changing a series card below only updates that specific series—your other scheduled series remain untouched.
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('chapters');
                setShowBatchModal(true);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] hover:underline cursor-pointer"
            >
              + Schedule Multi-Chapter Drop →
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {renderTrackColumn(
              'MONDAY',
              'Mondays',
              'border-blue-500/30',
              'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            )}
            {renderTrackColumn(
              'WEDNESDAY',
              'Wednesdays',
              'border-emerald-500/30',
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            )}
            {renderTrackColumn(
              'SATURDAY',
              'Saturdays',
              'border-[#fe9a00]/40',
              'bg-[#fe9a00] text-black'
            )}
          </div>
        </div>
      ) : activeSubTab === 'series_status' ? (
        /* ===================================================================
           TAB 2: SERIES VISIBILITY, COMPLETED RUNS (VAULT) & ONE-SHOT DEBUTS
        =================================================================== */
        <div className="space-y-5">
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: `All Series (${seriesList.length})` },
                  {
                    id: 'published',
                    label: `Published (${seriesList.filter((s: any) => !s.is_hidden).length})`
                  },
                  {
                    id: 'hidden',
                    label: `Unpublished / Hidden (${
                      seriesList.filter((s: any) => s.is_hidden).length
                    })`
                  },
                  {
                    id: 'vault',
                    label: `Completed Runs & One-Shots (${
                      seriesList.filter((s: any) => s.home_section === 'Completed Runs').length
                    })`
                  }
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSeriesFilter(f.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border ${
                    seriesFilter === f.id
                      ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {currentWednesdayPick && (
                <span className="text-[10px] font-bold text-zinc-400 hidden xl:inline">
                  This Week&apos;s One-Shot Wed:{' '}
                  <strong className="text-[#fe9a00]">{currentWednesdayPick.title}</strong>
                </span>
              )}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search series..."
                  value={seriesSearch}
                  onChange={e => setSeriesSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSeriesForStatusTab.map((s: any) => {
              const isCompleted = s.home_section === 'Completed Runs';
              const inDebutNow = isInOneShotDebutWindow(s, seriesList);
              const futureDebutMs = getScheduledOneShotDebutFutureMs(s, seriesList);
              const countdown = inDebutNow ? getOneShotFreeCountdown(s, seriesList) : null;

              const draftValue =
                debutScheduleDrafts[s.slug] !== undefined
                  ? debutScheduleDrafts[s.slug]
                  : futureDebutMs
                  ? toLocalDateTimeValue(futureDebutMs)
                  : '';

              const shelfOptions = Array.from(
                new Set([
                  ...homeSectionsList,
                  'Completed Runs',
                  ...(s.home_section ? [s.home_section] : [])
                ])
              );

              return (
                <div
                  key={s.slug}
                  className={`bg-black border rounded-2xl p-4 space-y-3 transition-all ${
                    s.is_hidden
                      ? 'border-red-900/50 bg-red-950/10'
                      : inDebutNow || futureDebutMs
                      ? 'border-[#fe9a00]'
                      : isCompleted
                      ? 'border-purple-500/40'
                      : 'border-zinc-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={
                          s.cover_url ||
                          s.character_url ||
                          'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg'
                        }
                        alt={s.title}
                        className={`w-14 h-14 rounded-xl object-cover border border-zinc-700 shrink-0 ${
                          s.is_hidden ? 'grayscale opacity-50' : ''
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black italic uppercase text-white truncate">
                            {s.title}
                          </h4>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              s.is_hidden
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                            }`}
                          >
                            {s.is_hidden ? 'Unpublished (Hidden)' : 'Published'}
                          </span>
                          {isCompleted && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Completed Run (Vault &amp; OSW)
                            </span>
                          )}
                          {inDebutNow && (
                            <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-[#fe9a00] text-black">
                              ⚡ Free Debut Active ({countdown} left)
                            </span>
                          )}
                          {futureDebutMs && (
                            <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]">
                              🗓️ Scheduled Free Debut:{' '}
                              {new Date(futureDebutMs).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-zinc-400 mt-0.5">
                          Creator: {s.creator_name || 'Saturday AM'} • Homepage Shelf:{' '}
                          <strong className="text-zinc-200">{s.home_section || 'Unassigned'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Series Visibility & Shelf Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        value={s.home_section || ''}
                        onChange={e => handleAssignSeriesHomeSection(s, e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer focus:border-[#fe9a00]"
                        title="Choose which Homepage section this series belongs to (Select 'Completed Runs' for PLUS Vault & One-Shot Wednesday rotation)"
                      >
                        <option value="">-- Homepage Shelf: None --</option>
                        {shelfOptions.map(sec => (
                          <option key={sec} value={sec}>
                            {sec === 'Completed Runs'
                              ? '🔒 Completed Runs (PLUS Vault & OSW)'
                              : `Shelf: ${sec}`}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggleSeriesPublishStatus(s)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border cursor-pointer transition-colors ${
                          s.is_hidden
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400'
                            : 'bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 border-zinc-700'
                        }`}
                      >
                        {s.is_hidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Publish Series
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Unpublish (Hide)
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSeriesSlug(s.slug);
                          setActiveSubTab('chapters');
                        }}
                        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                      >
                        Chapters ({(chaptersBySeries[s.slug] || []).length})
                      </button>
                    </div>
                  </div>

                  {/* Free Launch / One-Shot Debut Bar */}
                  <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[10px] font-bold text-zinc-400">
                      <strong className="text-[#fe9a00] uppercase">
                        ⚡ Free Debut → Auto-Vault &amp; One-Shot Wednesday:
                      </strong>{' '}
                      Pick a launch date/time (leave blank to launch now). Runs free (48h standard, or Thu → Mon night for Thursday holiday launches), then enters the One-Shot Wednesday rotation automatically.
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <input
                        type="datetime-local"
                        value={draftValue}
                        onChange={e =>
                          setDebutScheduleDrafts(prev => ({ ...prev, [s.slug]: e.target.value }))
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                      />

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleScheduleFreeDebutRun(s, draftValue)}
                        className="px-3.5 py-2 rounded-lg bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] cursor-pointer flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 fill-black" />
                        {draftValue ? 'Schedule Free Debut' : 'Start Free Debut Now'}
                      </button>

                      {(inDebutNow || futureDebutMs) && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleEndDebutAndMoveToVaultNow(s)}
                          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-black uppercase tracking-widest text-[9px] cursor-pointer"
                        >
                          End Debut &amp; Lock in Vault
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ===================================================================
           TAB 3: INDIVIDUAL CHAPTERS & MULTI-CHAPTER EVENT DROPS
        =================================================================== */
        <div className="space-y-5">
          {/* Top Multi-Chapter / Special Event Drop Bar */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#fe9a00]" /> Multi-Chapter &amp; Special Event Drops
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                Release multiple queued chapters of a series together on any date (holiday drops, multi-chapter launches, or catch-up packs).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBatchModal(!showBatchModal)}
              className="px-4 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              {showBatchModal ? 'Close Multi-Chapter Builder' : '+ Schedule Multi-Chapter Drop'}
            </button>
          </div>

          {showBatchModal && (
            <form
              onSubmit={handleScheduleMultiChapterEventDrop}
              className="bg-zinc-950 border-2 border-[#fe9a00]/60 rounded-2xl p-5 space-y-4 animate-fade-in"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Alert Headline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3-Chapter Special Drop!"
                    value={batchTitle}
                    onChange={e => setBatchTitle(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Select Series *
                  </label>
                  <select
                    value={batchSeriesSlug}
                    onChange={e => setBatchSeriesSlug(e.target.value)}
                    required
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Series --</option>
                    {seriesList.map((s: any) => {
                      const q = (chaptersBySeries[s.slug] || []).filter(isChapterUnreleased).length;
                      return (
                        <option key={s.slug} value={s.slug}>
                          {s.title} ({q} Queued)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Release Date (9:00 AM EST) *
                  </label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={e => setBatchDate(e.target.value)}
                    required
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Queued Chapters to Drop
                  </label>
                  <select
                    value={batchCount}
                    onChange={e => setBatchCount(Number(e.target.value))}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-[#fe9a00] font-black cursor-pointer"
                  >
                    <option value={2}>Next 2 Queued Chapters</option>
                    <option value={3}>Next 3 Queued Chapters</option>
                    <option value={5}>Next 5 Queued Chapters</option>
                    <option value={10}>Next 10 Queued Chapters</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl cursor-pointer"
              >
                {saving ? 'Scheduling...' : 'Confirm Multi-Chapter Release Date'}
              </button>
            </form>
          )}

          {/* Per-Series Chapter Inspector */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#fe9a00]">
                  Individual Chapter Publishing &amp; Dates
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                  Select any series to publish chapters immediately, hide/unpublish a chapter, or set custom release dates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSeriesSlug}
                  onChange={e => setSelectedSeriesSlug(e.target.value)}
                  className="bg-zinc-900 border border-[#fe9a00] rounded-xl px-4 py-2.5 text-xs text-white font-bold cursor-pointer"
                >
                  <option value="">-- Select a Series --</option>
                  {seriesList.map((s: any) => {
                    const chaps = chaptersBySeries[s.slug] || [];
                    const queued = chaps.filter(isChapterUnreleased).length;
                    return (
                      <option key={s.slug} value={s.slug}>
                        {s.title} ({chaps.length - queued} Live • {queued} Queued)
                      </option>
                    );
                  })}
                </select>

                {selectedSeriesSlug && currentSeriesChapters.length > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleRepairSeriesCutoff}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                    title="Set which chapter number is the latest live chapter and schedule the rest in order"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Set Live Chapter Cutoff
                  </button>
                )}
              </div>
            </div>

            {!selectedSeriesSlug ? (
              <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                Choose a series from the dropdown above to manage its chapters.
              </div>
            ) : currentSeriesChapters.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                No chapters uploaded for this series yet.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentSeriesChapters.map((ch: any) => {
                    const cId = String(ch.id);
                    const edit = oneOffEdits[cId] || {
                      date: formatDateInput(new Date()),
                      time: '09:00',
                      isPublished: true
                    };
                    const isHidden = !ch.is_published;
                    const isLive = isChapterCurrentlyLive(ch);

                    return (
                      <div
                        key={cId}
                        className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isHidden
                            ? 'bg-red-950/15 border-red-900/40'
                            : isLive
                            ? 'bg-zinc-950 border-zinc-800'
                            : 'bg-zinc-900 border-[#fe9a00]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-black text-white uppercase shrink-0">
                            Ch. {ch.chapter_number}
                          </span>
                          <span className="text-xs font-bold text-zinc-300 truncate">
                            {ch.title || `Chapter ${ch.chapter_number}`}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                              isHidden
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : isLive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40'
                            }`}
                          >
                            {isHidden
                              ? 'Unpublished (Hidden)'
                              : isLive
                              ? 'Live Now'
                              : `Scheduled (${edit.date})`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isLive && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleInstantPushChapterLive(ch)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                            >
                              <Zap className="w-3 h-3 fill-black" /> Publish Now
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleToggleSingleChapterVisibility(ch)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border cursor-pointer ${
                              isHidden
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                : 'bg-zinc-900 hover:bg-red-950 border-zinc-700 text-zinc-300 hover:text-red-300'
                            }`}
                          >
                            {isHidden ? (
                              <>
                                <Eye className="w-3 h-3" /> Re-Enable
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" /> Unpublish (Hide)
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5 bg-black border border-zinc-800 rounded-lg px-2 py-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <input
                              type="date"
                              value={edit.date}
                              onChange={e =>
                                setOneOffEdits(prev => ({
                                  ...prev,
                                  [cId]: { ...edit, date: e.target.value, isPublished: true }
                                }))
                              }
                              className="bg-transparent text-xs text-white font-bold focus:outline-none"
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
                              className="bg-transparent text-xs text-zinc-300 font-bold focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveCustomChapterDates}
                  className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Custom Chapter Dates for Selected Series
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};