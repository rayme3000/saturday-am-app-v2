import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
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
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
  Save
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSeriesData } from '../userSeriesData';

// Generates an ISO timestamp corresponding to 9:00 AM Local/Eastern Time for a given YYYY-MM-DD
const toNineAmEstIso = (dateStr: string, timeStr: string = '09:00'): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute, 0);
  return d.toISOString();
};

const formatDateInput = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeInput = (iso?: string | null): string => {
  if (!iso) return '09:00';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface MatrixSlot {
  seriesSlug: string;
  chapterId: string;
  persistedInDb?: boolean;
}

interface MatrixDayRow {
  id: string;
  dateStr: string;
  timeStr: string;
  label: string;
  dayType: 'MONDAY' | 'WEDNESDAY' | 'SATURDAY' | 'WILDCARD';
  weekNumber: number; // Always 1..8 relative to TODAY (or 0 for Wildcard Events)
  wildcardTitle?: string;
  slots: MatrixSlot[];
}

// Generates a strictly rolling 8-Week window (Week 1 to Week 8 relative to today) for MON, WED, and SAT (24 total drop days)
const generateRollingEightWeekSlots = (): MatrixDayRow[] => {
  const rows: MatrixDayRow[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const dayCursor = new Date(start);

  // 8 weeks * 3 days per week (Mon, Wed, Sat) = 24 rows
  while (rows.length < 24) {
    const dow = dayCursor.getDay(); // 1 = Monday, 3 = Wednesday, 6 = Saturday
    if (dow === 1 || dow === 3 || dow === 6) {
      const dateStr = formatDateInput(dayCursor);
      const readable = dayCursor.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const dayType: 'MONDAY' | 'WEDNESDAY' | 'SATURDAY' =
        dow === 6 ? 'SATURDAY' : dow === 3 ? 'WEDNESDAY' : 'MONDAY';

      // Default slot counts: Saturday = 4 (Flagship + Hammer + Maximo + Gun+Bone), Wednesday = 4 (Co-Headliner + 3x Spoon), Monday = 3 (Redskin + Zephyr + Fan-X-Boy/Henshin!)
      const defaultSlotCount = dayType === 'SATURDAY' ? 4 : dayType === 'WEDNESDAY' ? 4 : 3;

      // Rolling 1..8 week number (every 3 release days = 1 week)
      const rollingWeekNumber = Math.min(8, Math.max(1, Math.ceil((rows.length + 1) / 3)));

      rows.push({
        id: `std_${dateStr}`,
        dateStr,
        timeStr: '09:00',
        label: readable,
        dayType,
        weekNumber: rollingWeekNumber,
        slots: Array.from({ length: defaultSlotCount }, () => ({
          seriesSlug: '',
          chapterId: '',
          persistedInDb: false
        }))
      });
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }
  return rows;
};

export const ReleaseScheduler = ({ setIsDirty }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [mode, setMode] = useState<'matrix' | 'cadence'>('matrix');
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTargetId, setSavingTargetId] = useState<string | null>(null);
  const [autoQueueNotifs, setAutoQueueNotifs] = useState(true);

  // Rolling 8-Week Standard Rows (Week 1..8 across Mon, Wed, Sat)
  const [matrixRows, setMatrixRows] = useState<MatrixDayRow[]>(() => generateRollingEightWeekSlots());
  // Wildcard / Holiday Special Rows (Separate from the 8-Week rotation so it never disrupts cadence)
  const [wildcardRows, setWildcardRows] = useState<MatrixDayRow[]>([]);
  const [showNewWildcardForm, setShowNewWildcardForm] = useState(false);
  const [newWildcardTitle, setNewWildcardTitle] = useState('');
  const [newWildcardDate, setNewWildcardDate] = useState(() => formatDateInput(new Date()));
  const [newWildcardTime, setNewWildcardTime] = useState('09:00');

  const [dayFilter, setDayFilter] = useState<'ALL' | 'SATURDAY' | 'WEDNESDAY' | 'MONDAY'>('ALL');
  // Open Week 1 by default so the screen is clean and easy to read
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });

  // Mode 2: Single-Series Cadence Stagger & One-Off Override State
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [staggerDay, setStaggerDay] = useState<'SATURDAY' | 'WEDNESDAY' | 'MONDAY'>('SATURDAY');
  const [staggerIntervalWeeks, setStaggerIntervalWeeks] = useState<number>(1);
  const [chaptersPerDropDay, setChaptersPerDropDay] = useState<number>(1);
  const [staggerStartDate, setStaggerStartDate] = useState<string>(() => {
    const firstSat = generateRollingEightWeekSlots().find(r => r.dayType === 'SATURDAY');
    return firstSat ? firstSat.dateStr : formatDateInput(new Date());
  });
  const [staggerTime, setStaggerTime] = useState<string>('09:00');
  const [oneOffEdits, setOneOffEdits] = useState<Record<string, { date: string; time: string; isPublished: boolean }>>({});

  const fetchAllChapters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('series_slug', { ascending: true })
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      const chaptersList = data || [];
      setAllChapters(chaptersList);

      const baseRows = generateRollingEightWeekSlots();
      const detectedWildcardsMap = new Map<string, MatrixDayRow>();
      const now = Date.now();

      chaptersList.forEach((ch: any) => {
        if (!ch.publish_at) return;
        const pubDateObj = new Date(ch.publish_at);
        const pubTime = pubDateObj.getTime();
        // Automatically ignore past dates so old weeks never pile up!
        if (pubTime <= now) return;

        const pubDateStr = formatDateInput(pubDateObj);
        const pubTimeStr = formatTimeInput(ch.publish_at);
        const matchedStandardRow = baseRows.find(r => r.dateStr === pubDateStr);

        if (matchedStandardRow) {
          const emptySlotIdx = matchedStandardRow.slots.findIndex(s => !s.chapterId);
          if (emptySlotIdx !== -1) {
            matchedStandardRow.slots[emptySlotIdx] = {
              seriesSlug: ch.series_slug,
              chapterId: String(ch.id),
              persistedInDb: true
            };
          } else {
            matchedStandardRow.slots.push({
              seriesSlug: ch.series_slug,
              chapterId: String(ch.id),
              persistedInDb: true
            });
          }
        } else {
          // Any future scheduled chapter NOT on the standard 8-week Mon/Wed/Sat dates is automatically loaded as a Wildcard / Holiday Drop!
          if (!detectedWildcardsMap.has(pubDateStr)) {
            const savedNames = JSON.parse(localStorage.getItem('am_wildcard_names') || '{}');
            const readable = pubDateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            detectedWildcardsMap.set(pubDateStr, {
              id: `wildcard_${pubDateStr}`,
              dateStr: pubDateStr,
              timeStr: pubTimeStr,
              label: readable,
              dayType: 'WILDCARD',
              weekNumber: 0,
              wildcardTitle: savedNames[pubDateStr] || 'Special Wildcard / Holiday Drop',
              slots: []
            });
          }
          detectedWildcardsMap.get(pubDateStr)!.slots.push({
            seriesSlug: ch.series_slug,
            chapterId: String(ch.id),
            persistedInDb: true
          });
        }
      });

      setMatrixRows(baseRows);
      setWildcardRows(
        Array.from(detectedWildcardsMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      );
    } catch (err: any) {
      console.error('Error loading chapters for scheduler:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChapters();
  }, []);

  // Group chapters by series_slug for fast lookup
  const chaptersBySeries = useMemo(() => {
    const map: Record<string, any[]> = {};
    allChapters.forEach((ch: any) => {
      if (!map[ch.series_slug]) map[ch.series_slug] = [];
      map[ch.series_slug].push(ch);
    });
    return map;
  }, [allChapters]);

  const isChapterUnreleased = (ch: any) => {
    if (!ch.is_published) return true;
    if (ch.publish_at && new Date(ch.publish_at).getTime() > Date.now()) return true;
    return false;
  };

  // Group standard matrixRows by rolling weekNumber (Always Week 1 to Week 8)
  const groupedWeeks = useMemo(() => {
    const map = new Map<number, MatrixDayRow[]>();
    matrixRows.forEach(row => {
      if (dayFilter !== 'ALL' && row.dayType !== dayFilter) return;
      if (!map.has(row.weekNumber)) map.set(row.weekNumber, []);
      map.get(row.weekNumber)!.push(row);
    });
    return Array.from(map.entries()).map(([weekNumber, days]) => {
      const assignedCount = days.reduce(
        (sum, d) => sum + d.slots.filter(s => Boolean(s.seriesSlug && s.chapterId)).length,
        0
      );
      const dateRangeLabel =
        days.length > 1
          ? `${days[0].label.replace(/,\s*\d{4}$/, '')} – ${days[days.length - 1].label}`
          : days[0]?.label || '';
      return { weekNumber, days, assignedCount, dateRangeLabel };
    });
  }, [matrixRows, dayFilter]);

  const toggleWeekAccordion = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const setAllWeeksExpanded = (open: boolean) => {
    const next: Record<number, boolean> = {};
    for (let i = 1; i <= 8; i++) next[i] = open;
    setExpandedWeeks(next);
  };

  // --- CREATE NEW WILDCARD / HOLIDAY EVENT ---
  const handleCreateWildcardWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWildcardDate) return alert('Please pick a date for your Wildcard / Holiday release.');
    const cleanTitle = newWildcardTitle.trim() || 'Special Holiday / Event Drop';

    const dObj = new Date(`${newWildcardDate}T12:00:00`);
    const readable = dObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const savedNames = JSON.parse(localStorage.getItem('am_wildcard_names') || '{}');
    savedNames[newWildcardDate] = cleanTitle;
    localStorage.setItem('am_wildcard_names', JSON.stringify(savedNames));

    const newRow: MatrixDayRow = {
      id: `wildcard_${newWildcardDate}_${Date.now()}`,
      dateStr: newWildcardDate,
      timeStr: newWildcardTime || '09:00',
      label: readable,
      dayType: 'WILDCARD',
      weekNumber: 0,
      wildcardTitle: cleanTitle,
      slots: [
        { seriesSlug: '', chapterId: '', persistedInDb: false },
        { seriesSlug: '', chapterId: '', persistedInDb: false }
      ]
    };

    setWildcardRows(prev => [...prev, newRow].sort((a, b) => a.dateStr.localeCompare(b.dateStr)));
    setNewWildcardTitle('');
    setShowNewWildcardForm(false);
    if (setIsDirty) setIsDirty(true);
  };

  const handleRemoveEntireWildcardEvent = async (wildcardId: string) => {
    const target = wildcardRows.find(w => w.id === wildcardId);
    if (!target) return;

    const persistedChaps = target.slots.filter(s => s.chapterId && s.persistedInDb);
    if (persistedChaps.length > 0) {
      if (
        !window.confirm(
          `Delete "${target.wildcardTitle}" and return its ${persistedChaps.length} scheduled chapter(s) back to the hidden vault?`
        )
      ) {
        return;
      }
      for (const slot of persistedChaps) {
        await supabase.from('chapters').update({ is_published: false, publish_at: null }).eq('id', slot.chapterId);
        await supabase.from('app_notifications').delete().eq('source_key', `chapter_${slot.chapterId}`);
      }
      window.dispatchEvent(new Event('seriesUpdated'));
    }

    setWildcardRows(prev => prev.filter(w => w.id !== wildcardId));
  };

  // --- ADD / REMOVE / UPDATE SLOTS (WORKS FOR BOTH STANDARD 8-WEEK & WILDCARD ROWS) ---
  const updateTargetRowList = (
    isWildcard: boolean,
    updater: (rows: MatrixDayRow[]) => MatrixDayRow[]
  ) => {
    if (isWildcard) setWildcardRows(updater);
    else setMatrixRows(updater);
  };

  const handleAddSlotToDay = (rowId: string, isWildcard: boolean) => {
    updateTargetRowList(isWildcard, prev =>
      prev.map(row =>
        row.id === rowId
          ? { ...row, slots: [...row.slots, { seriesSlug: '', chapterId: '', persistedInDb: false }] }
          : row
      )
    );
  };

  const handleRemoveOrClearSlot = async (rowId: string, slotIndex: number, isWildcard: boolean) => {
    const list = isWildcard ? wildcardRows : matrixRows;
    const targetRow = list.find(r => r.id === rowId);
    if (!targetRow) return;
    const targetSlot = targetRow.slots[slotIndex];

    if (targetSlot?.chapterId && targetSlot?.persistedInDb) {
      const matchedSeries = seriesList.find((s: any) => s.slug === targetSlot.seriesSlug);
      const matchedChap = allChapters.find((c: any) => String(c.id) === String(targetSlot.chapterId));
      const confirmUnschedule = window.confirm(
        `Remove "${matchedSeries?.title || targetSlot.seriesSlug} - Ch. ${matchedChap?.chapter_number || ''}" from ${targetRow.label} and return it to the hidden vault?`
      );
      if (!confirmUnschedule) return;

      try {
        await supabase
          .from('chapters')
          .update({ is_published: false, publish_at: null })
          .eq('id', targetSlot.chapterId);
        await supabase
          .from('app_notifications')
          .delete()
          .eq('source_key', `chapter_${targetSlot.chapterId}`);
        window.dispatchEvent(new Event('seriesUpdated'));
      } catch (err: any) {
        alert('Error unscheduling chapter: ' + err.message);
        return;
      }
    }

    if (setIsDirty) setIsDirty(true);

    updateTargetRowList(isWildcard, prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        const nextSlots = [...row.slots];
        if (!targetSlot?.seriesSlug && nextSlots.length > 1) {
          nextSlots.splice(slotIndex, 1);
        } else {
          nextSlots[slotIndex] = { seriesSlug: '', chapterId: '', persistedInDb: false };
        }
        return { ...row, slots: nextSlots };
      })
    );
  };

  const handleDeleteSlotBox = async (rowId: string, slotIndex: number, isWildcard: boolean) => {
    const list = isWildcard ? wildcardRows : matrixRows;
    const targetRow = list.find(r => r.id === rowId);
    if (!targetRow) return;
    const targetSlot = targetRow.slots[slotIndex];

    if (targetSlot?.chapterId && targetSlot?.persistedInDb) {
      await handleRemoveOrClearSlot(rowId, slotIndex, isWildcard);
      return;
    }

    updateTargetRowList(isWildcard, prev =>
      prev.map(row => {
        if (row.id !== rowId || row.slots.length <= 1) return row;
        const nextSlots = [...row.slots];
        nextSlots.splice(slotIndex, 1);
        return { ...row, slots: nextSlots };
      })
    );
  };

  const handleSeriesSelect = (rowId: string, slotIndex: number, newSeriesSlug: string, isWildcard: boolean) => {
    if (setIsDirty) setIsDirty(true);

    // For standard 8-Week rows, only check other standard 8-Week rows when auto-picking the next chapter
    // so Wildcard events never disrupt the normal 8-Week sequence!
    const referenceRows = isWildcard ? wildcardRows : matrixRows;

    const assignedIds = new Set<string>();
    referenceRows.forEach(r => {
      r.slots.forEach((s, sIdx) => {
        if (!(r.id === rowId && sIdx === slotIndex) && s.seriesSlug === newSeriesSlug && s.chapterId) {
          assignedIds.add(String(s.chapterId));
        }
      });
    });

    const seriesChaps = (chaptersBySeries[newSeriesSlug] || []).filter(isChapterUnreleased);
    const nextAvailableChap = seriesChaps.find(c => !assignedIds.has(String(c.id))) || seriesChaps[0];

    updateTargetRowList(isWildcard, prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const nextSlots = [...r.slots];
        nextSlots[slotIndex] = newSeriesSlug
          ? {
              seriesSlug: newSeriesSlug,
              chapterId: nextAvailableChap ? String(nextAvailableChap.id) : '',
              persistedInDb: false
            }
          : { seriesSlug: '', chapterId: '', persistedInDb: false };
        return { ...r, slots: nextSlots };
      })
    );
  };

  const handleChapterSelect = (rowId: string, slotIndex: number, newChapterId: string, isWildcard: boolean) => {
    if (setIsDirty) setIsDirty(true);
    updateTargetRowList(isWildcard, prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const nextSlots = [...r.slots];
        nextSlots[slotIndex] = { ...nextSlots[slotIndex], chapterId: newChapterId, persistedInDb: false };
        return { ...r, slots: nextSlots };
      })
    );
  };

  // --- UNIFIED SAVE HELPER: CAN SAVE 1 INDIVIDUAL WEEK, 1 WILDCARD EVENT, OR ALL WEEKS AS A BATCH ---
  const persistRowsToDatabase = async (rowsToSave: MatrixDayRow[], targetLabel: string, targetKey: string) => {
    const assignments: { chapterId: string; seriesSlug: string; publishIso: string }[] = [];

    rowsToSave.forEach(row => {
      const publishIso = toNineAmEstIso(row.dateStr, row.timeStr || '09:00');
      row.slots.forEach(slot => {
        if (slot.seriesSlug && slot.chapterId) {
          assignments.push({
            chapterId: slot.chapterId,
            seriesSlug: slot.seriesSlug,
            publishIso
          });
        }
      });
    });

    if (assignments.length === 0) {
      return alert(`No series/chapters are assigned in ${targetLabel} yet.`);
    }

    setSaving(true);
    setSavingTargetId(targetKey);
    try {
      for (const item of assignments) {
        const { error } = await supabase
          .from('chapters')
          .update({
            is_published: true,
            publish_at: item.publishIso
          })
          .eq('id', item.chapterId);

        if (error) throw error;

        if (autoQueueNotifs) {
          const matchedSeries = seriesList.find((s: any) => s.slug === item.seriesSlug);
          const matchedChap = allChapters.find((c: any) => String(c.id) === String(item.chapterId));
          if (matchedSeries && matchedChap) {
            await supabase.from('app_notifications').upsert(
              [
                {
                  title: 'New Chapter Drop!',
                  message: `${matchedSeries.title} Chapter ${matchedChap.chapter_number} is now live!`,
                  thumbnail_url: matchedChap.thumbnail_url || matchedSeries.cover_url || null,
                  link_target: matchedSeries.slug,
                  publish_at: item.publishIso,
                  created_at: item.publishIso,
                  source_key: `chapter_${matchedChap.id}`
                }
              ],
              { onConflict: 'source_key' }
            );
          }
        }
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      if (setIsDirty) setIsDirty(false);
      await fetchAllChapters();
      alert(`SUCCESS! Saved ${assignments.length} chapter drop(s) for ${targetLabel}!`);
    } catch (err: any) {
      alert(`Error saving ${targetLabel}: ` + err.message);
    } finally {
      setSaving(false);
      setSavingTargetId(null);
    }
  };

  // --- MODE 2: SINGLE-SERIES CADENCE STAGGER & ONE-OFF SCHEDULE ---
  const currentSeriesChapters = useMemo(() => {
    if (!selectedSeriesSlug) return [];
    return chaptersBySeries[selectedSeriesSlug] || [];
  }, [selectedSeriesSlug, chaptersBySeries]);

  useEffect(() => {
    if (!selectedSeriesSlug) {
      setSelectedChapterIds([]);
      setOneOffEdits({});
      return;
    }
    const chaps = chaptersBySeries[selectedSeriesSlug] || [];
    const initialEdits: Record<string, { date: string; time: string; isPublished: boolean }> = {};
    const unreleasedIds: string[] = [];

    chaps.forEach((c: any) => {
      const hasFutureOrExistingDate = Boolean(c.publish_at);
      initialEdits[String(c.id)] = {
        date: hasFutureOrExistingDate ? formatDateInput(new Date(c.publish_at)) : staggerStartDate,
        time: formatTimeInput(c.publish_at),
        isPublished: Boolean(c.is_published)
      };
      if (isChapterUnreleased(c)) {
        unreleasedIds.push(String(c.id));
      }
    });

    setOneOffEdits(initialEdits);
    setSelectedChapterIds(unreleasedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeriesSlug, chaptersBySeries]);

  const applyAutoStaggerToSelection = () => {
    if (selectedChapterIds.length === 0) {
      return alert('Check at least one chapter below to auto-stagger.');
    }

    const baseDate = new Date(`${staggerStartDate}T12:00:00`);
    const targetDow =
      staggerDay === 'SATURDAY' ? 6 : staggerDay === 'WEDNESDAY' ? 3 : 1;

    while (baseDate.getDay() !== targetDow) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const sortedSelected = [...selectedChapterIds].sort((a, b) => {
      const chapA = currentSeriesChapters.find(c => String(c.id) === a);
      const chapB = currentSeriesChapters.find(c => String(c.id) === b);
      return (chapA?.chapter_number || 0) - (chapB?.chapter_number || 0);
    });

    const nextEdits = { ...oneOffEdits };
    const safePerDay = Math.max(1, chaptersPerDropDay);

    sortedSelected.forEach((chapId, idx) => {
      const dropGroupIndex = Math.floor(idx / safePerDay);
      const dropDate = new Date(baseDate);
      dropDate.setDate(dropDate.getDate() + dropGroupIndex * staggerIntervalWeeks * 7);
      nextEdits[chapId] = {
        date: formatDateInput(dropDate),
        time: staggerTime || '09:00',
        isPublished: true
      };
    });

    setOneOffEdits(nextEdits);
    if (setIsDirty) setIsDirty(true);
  };

  // Special 1-Click Spoon Preset: First 10 checked chapters drop on the first Wednesday, then 3 chapters every Wednesday after!
  const applySpoonCatchUpPreset = () => {
    if (selectedChapterIds.length === 0) {
      return alert('Check the chapters below that you want to include in the Spoon Catch-Up schedule.');
    }

    const baseDate = new Date(`${staggerStartDate}T12:00:00`);
    // Snap to next Wednesday (day 3)
    while (baseDate.getDay() !== 3) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const sortedSelected = [...selectedChapterIds].sort((a, b) => {
      const chapA = currentSeriesChapters.find(c => String(c.id) === a);
      const chapB = currentSeriesChapters.find(c => String(c.id) === b);
      return (chapA?.chapter_number || 0) - (chapB?.chapter_number || 0);
    });

    const nextEdits = { ...oneOffEdits };
    sortedSelected.forEach((chapId, idx) => {
      const dropDate = new Date(baseDate);
      if (idx < 10) {
        // First 10 chapters launch together on Day 1 (First Arc Binge Pack)
        nextEdits[chapId] = {
          date: formatDateInput(dropDate),
          time: staggerTime || '09:00',
          isPublished: true
        };
      } else {
        // Remaining chapters drop 3 per Wednesday
        const weekOffset = Math.floor((idx - 10) / 3) + 1;
        dropDate.setDate(dropDate.getDate() + weekOffset * 7);
        nextEdits[chapId] = {
          date: formatDateInput(dropDate),
          time: staggerTime || '09:00',
          isPublished: true
        };
      }
    });

    setStaggerDay('WEDNESDAY');
    setChaptersPerDropDay(3);
    setStaggerIntervalWeeks(1);
    setOneOffEdits(nextEdits);
    if (setIsDirty) setIsDirty(true);
  };

  const handleSaveSeriesCadence = async () => {
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

        if (autoQueueNotifs && edit.isPublished && publishIso && new Date(publishIso).getTime() > Date.now() && matchedSeries) {
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
      if (setIsDirty) setIsDirty(false);
      await fetchAllChapters();
      alert(`SUCCESS! Updated release schedule for ${matchedSeries?.title || selectedSeriesSlug}.`);
    } catch (err: any) {
      alert('Failed to save series schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearScheduledDate = async (chapterId: string) => {
    if (!window.confirm('Unschedule this chapter and hide it back in the vault?')) return;
    await supabase.from('chapters').update({ is_published: false, publish_at: null }).eq('id', chapterId);
    await supabase.from('app_notifications').delete().eq('source_key', `chapter_${chapterId}`);
    window.dispatchEvent(new Event('seriesUpdated'));
    fetchAllChapters();
  };

  // Renders the slot cards for any given day (Monday, Wednesday, Saturday, or Wildcard)
  const renderDayCard = (dayRow: MatrixDayRow, isWildcard: boolean) => {
    const isSaturday = dayRow.dayType === 'SATURDAY';
    const isWednesday = dayRow.dayType === 'WEDNESDAY';
    const isOddWeek = dayRow.weekNumber % 2 === 1;

    const getSlotLabel = (slotIdx: number): string => {
      if (isWildcard) return `Event Slot #${slotIdx + 1}`;
      if (isSaturday) {
        if (slotIdx === 0) return `Slot 1 • Flagship (${isOddWeek ? 'Apple Black' : 'Clock Striker'})`;
        if (slotIdx === 1) return 'Slot 2 • Hammer';
        if (slotIdx === 2) return 'Slot 3 • Maximo';
        if (slotIdx === 3) return 'Slot 4 • Gun+Bone';
        return `Saturday Slot #${slotIdx + 1}`;
      }
      if (isWednesday) {
        if (slotIdx === 0) return `Slot 1 • Bi-Weekly (${isOddWeek ? 'Oblivion Rouge' : 'Junkwoods'})`;
        if (slotIdx === 1) return 'Slot 2 • Spoon (Drop #1)';
        if (slotIdx === 2) return 'Slot 3 • Spoon (Drop #2)';
        if (slotIdx === 3) return 'Slot 4 • Spoon (Drop #3)';
        return `Wednesday Slot #${slotIdx + 1}`;
      }
      // Monday
      if (slotIdx === 0) return 'Slot 1 • Redskin';
      if (slotIdx === 1) return 'Slot 2 • Zephyr';
      if (slotIdx === 2) return 'Slot 3 • Fan-X-Boy / Henshin!';
      return `Monday Slot #${slotIdx + 1}`;
    };

    return (
      <div
        key={dayRow.id}
        className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
          isWildcard
            ? 'bg-purple-950/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
            : isSaturday
            ? 'bg-zinc-950 border-[#fe9a00]/40'
            : isWednesday
            ? 'bg-zinc-950 border-emerald-500/40'
            : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div>
          {/* Day Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${
                  isWildcard
                    ? 'bg-purple-500 text-white'
                    : isSaturday
                    ? 'bg-[#fe9a00] text-black'
                    : isWednesday
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {isWildcard
                  ? `★ WILDCARD: ${dayRow.wildcardTitle}`
                  : isSaturday
                  ? '⚡ SATURDAY MORNING BLOCK'
                  : isWednesday
                  ? '🥄 WEDNESDAY ORIGINALS + OSW'
                  : '📅 MONDAY MOMENTUM BLOCK'}
              </span>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">{dayRow.label}</h4>
              <span className="text-[10px] font-mono text-zinc-400">
                @ {dayRow.timeStr || '09:00'} EST (PLUS: 12h Early)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddSlotToDay(dayRow.id, isWildcard)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Slot
              </button>

              {isWildcard && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => persistRowsToDatabase([dayRow], dayRow.wildcardTitle || dayRow.label, dayRow.id)}
                    className="px-3 py-1 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {savingTargetId === dayRow.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntireWildcardEvent(dayRow.id)}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 transition-colors cursor-pointer"
                    title="Delete Wildcard Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {dayRow.slots.map((slot, slotIdx) => {
              const seriesChaps = slot.seriesSlug ? chaptersBySeries[slot.seriesSlug] || [] : [];
              const hasSelection = Boolean(slot.seriesSlug || slot.chapterId);

              return (
                <div
                  key={`${dayRow.id}_slot_${slotIdx}`}
                  className={`rounded-xl p-3 border transition-all space-y-2.5 ${
                    slot.persistedInDb
                      ? 'bg-emerald-950/15 border-emerald-700/50'
                      : hasSelection
                      ? 'bg-zinc-900 border-[#fe9a00]/50'
                      : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 truncate">
                        {getSlotLabel(slotIdx)}
                      </span>
                      {slot.persistedInDb && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          Saved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasSelection && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOrClearSlot(dayRow.id, slotIdx, isWildcard)}
                          className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/50 cursor-pointer"
                          title="Remove series from this slot"
                        >
                          Remove
                        </button>
                      )}
                      {dayRow.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSlotBox(dayRow.id, slotIdx, isWildcard)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded cursor-pointer"
                          title="Delete this slot box"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Series Selector */}
                  <select
                    value={slot.seriesSlug}
                    onChange={e => handleSeriesSelect(dayRow.id, slotIdx, e.target.value, isWildcard)}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                  >
                    <option value="">-- Select Series --</option>
                    {seriesList.map((s: any) => {
                      const unreleasedCount = (chaptersBySeries[s.slug] || []).filter(isChapterUnreleased).length;
                      return (
                        <option key={s.slug} value={s.slug}>
                          {s.title} ({unreleasedCount} queued)
                        </option>
                      );
                    })}
                  </select>

                  {/* Chapter Selector */}
                  {slot.seriesSlug && (
                    <select
                      value={slot.chapterId}
                      onChange={e => handleChapterSelect(dayRow.id, slotIdx, e.target.value, isWildcard)}
                      className="w-full bg-black border border-[#fe9a00]/50 rounded-lg px-2.5 py-2 text-[11px] text-[#fe9a00] font-black focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Chapter --</option>
                      {seriesChaps.map((c: any) => {
                        const unreleased = isChapterUnreleased(c);
                        return (
                          <option key={c.id} value={String(c.id)}>
                            Ch. {c.chapter_number}: {c.title || `Chapter ${c.chapter_number}`}{' '}
                            {unreleased ? '• (Unreleased)' : '• (Live)'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-6xl animate-fade-in space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Master Release Scheduler (Mon • Wed • Sat)
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Rolling 8-Week Window (Never piles up past Week 8) + Non-Disruptive Wildcard Holiday Drops
            </p>
          </div>
        </div>

        <div className="flex bg-black p-1 rounded-xl border border-zinc-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('matrix')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'matrix' ? 'bg-[#fe9a00] text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Rolling 8-Week Planner
          </button>
          <button
            type="button"
            onClick={() => setMode('cadence')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'cadence' ? 'bg-[#fe9a00] text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Series Stagger & Custom Date
          </button>
        </div>
      </div>

      {/* Backlog Overview Bar */}
      <div className="bg-black border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Vault Backlog Counter (Click any series to open its full chapter list)
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
            <input
              type="checkbox"
              checked={autoQueueNotifs}
              onChange={e => setAutoQueueNotifs(e.target.checked)}
              className="accent-[#fe9a00] w-3.5 h-3.5"
            />
            <Bell className="w-3 h-3" /> Auto-Queue Push Notifications on Release
          </label>
        </div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar pr-1">
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
                  setMode('cadence');
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                  unreleased.length > 0
                    ? 'bg-zinc-900 border-[#fe9a00]/40 text-white hover:border-[#fe9a00]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{s.title}:</span>
                <span className="text-emerald-400">{liveCount} Live</span>
                <span>•</span>
                <span className={unreleased.length > 0 ? 'text-[#fe9a00]' : 'text-zinc-600'}>
                  {unreleased.length} Queued/Hidden
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#fe9a00]" /> Loading Chapter Vault...
        </div>
      ) : mode === 'matrix' ? (
        <div className="space-y-6">
          {/* Top Controls: Day Filter + Wildcard Event Creator + Expand/Collapse */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-black/80 p-4 rounded-xl border border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-1">Show:</span>
              {(['ALL', 'SATURDAY', 'WEDNESDAY', 'MONDAY'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDayFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                    dayFilter === f
                      ? 'bg-[#fe9a00] text-black'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {f === 'ALL'
                    ? 'All (Mon / Wed / Sat)'
                    : f === 'SATURDAY'
                    ? 'Saturdays Only'
                    : f === 'WEDNESDAY'
                    ? 'Wednesdays Only'
                    : 'Mondays Only'}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowNewWildcardForm(!showNewWildcardForm)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer ml-1"
              >
                <Star className="w-3 h-3 fill-white" /> + Add Wildcard / Binge Pack Event
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllWeeksExpanded(true)}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-zinc-700">|</span>
              <button
                type="button"
                onClick={() => setAllWeeksExpanded(false)}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
              >
                Collapse All
              </button>
              <span className="text-zinc-700">|</span>
              <button
                type="button"
                onClick={fetchAllChapters}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reload
              </button>
            </div>
          </div>

          {/* WILDCARD / HOLIDAY EVENT CREATOR DRAWER */}
          {showNewWildcardForm && (
            <form
              onSubmit={handleCreateWildcardWeek}
              className="bg-purple-950/25 border-2 border-purple-500/60 rounded-2xl p-5 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#fe9a00] fill-[#fe9a00]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">
                    Create Wildcard / Monthly Spoon Binge Pack / Holiday Release
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewWildcardForm(false)}
                  className="text-[10px] font-black uppercase text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                    Event / Holiday Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spoon Monthly 6-Pack / Zarqa Debut"
                    value={newWildcardTitle}
                    onChange={e => setNewWildcardTitle(e.target.value)}
                    required
                    className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                    Release Date (Any Day of Week)
                  </label>
                  <input
                    type="date"
                    value={newWildcardDate}
                    onChange={e => setNewWildcardDate(e.target.value)}
                    required
                    className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-purple-200 mb-1">
                    Release Time (EST)
                  </label>
                  <input
                    type="time"
                    value={newWildcardTime}
                    onChange={e => setNewWildcardTime(e.target.value)}
                    required
                    className="w-full bg-black border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-[#fe9a00] text-black font-black uppercase tracking-widest text-xs rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
              >
                + Add Wildcard Event Block to Board
              </button>
            </form>
          )}

          {/* ACTIVE WILDCARD / HOLIDAY EVENTS SECTION */}
          {wildcardRows.length > 0 && (
            <div className="space-y-3 bg-purple-950/10 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-purple-300 flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#fe9a00] fill-[#fe9a00]" />
                  Wildcard & Special Binge Events ({wildcardRows.length}) — Independent from 8-Week Cycle
                </span>
              </div>
              <div className="space-y-3">
                {wildcardRows.map(wRow => renderDayCard(wRow, true))}
              </div>
            </div>
          )}

          {/* COLLAPSIBLE ROLLING 8-WEEK ACCORDIONS (WEEK 1 TO WEEK 8) */}
          <div className="space-y-3">
            {groupedWeeks.map(({ weekNumber, days, assignedCount, dateRangeLabel }) => {
              const isExpanded = Boolean(expandedWeeks[weekNumber]);
              const weekSaveKey = `week_${weekNumber}`;

              return (
                <div
                  key={weekNumber}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-black border-[#fe9a00]/60 shadow-[0_0_25px_rgba(254,154,0,0.08)]'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Week Accordion Header Bar */}
                  <div
                    onClick={() => toggleWeekAccordion(weekNumber)}
                    className="w-full px-5 py-4 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/70 hover:bg-zinc-900 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-[#fe9a00] text-black text-xs font-black uppercase italic tracking-widest px-3 py-1 rounded-lg shadow">
                        WEEK {weekNumber} {weekNumber === 1 ? '• THIS WEEK' : ''}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                        {dateRangeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                          assignedCount > 0
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {assignedCount} {assignedCount === 1 ? 'Drop' : 'Drops'} Queued
                      </span>

                      {/* Individual Week Save Button right in the header */}
                      <button
                        type="button"
                        disabled={saving || assignedCount === 0}
                        onClick={e => {
                          e.stopPropagation();
                          persistRowsToDatabase(days, `Week ${weekNumber} (${dateRangeLabel})`, weekSaveKey);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                        title={`Save only Week ${weekNumber}`}
                      >
                        {savingTargetId === weekSaveKey ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save Week {weekNumber}
                      </button>

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#fe9a00]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Week Content */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-4 border-t border-zinc-800/80 animate-fade-in">
                      {days.map(dayRow => renderDayCard(dayRow, false))}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          disabled={saving || assignedCount === 0}
                          onClick={() =>
                            persistRowsToDatabase(days, `Week ${weekNumber} (${dateRangeLabel})`, weekSaveKey)
                          }
                          className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {savingTargetId === weekSaveKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Save Week {weekNumber} Only
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MASTER BATCH SAVE BUTTON (SAVES ALL 8 WEEKS + WILDCARD EVENTS AT ONCE) */}
          <button
            type="button"
            onClick={() =>
              persistRowsToDatabase(
                [...matrixRows, ...wildcardRows],
                'All 8 Weeks & Wildcard Events (Batch)',
                'batch_all'
              )
            }
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savingTargetId === 'batch_all' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {savingTargetId === 'batch_all'
              ? 'Saving Entire Release Schedule...'
              : 'Save All Weeks & Wildcard Drops (Batch Save)'}
          </button>
        </div>
      ) : (
        /* =========================================================
           MODE 2: SINGLE-SERIES CADENCE STAGGER & CUSTOM DATE OVERRIDE
           ========================================================= */
        <div className="space-y-6">
          <div className="bg-black border border-zinc-800 rounded-xl p-5 space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-2">
                1. Select Series to Schedule or Override
              </label>
              <select
                value={selectedSeriesSlug}
                onChange={e => setSelectedSeriesSlug(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
              >
                <option value="">-- Choose a Series --</option>
                {seriesList.map((s: any) => {
                  const total = (chaptersBySeries[s.slug] || []).length;
                  const queued = (chaptersBySeries[s.slug] || []).filter(isChapterUnreleased).length;
                  return (
                    <option key={s.slug} value={s.slug}>
                      {s.title} ({total} total chapters • {queued} hidden/upcoming)
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedSeriesSlug && (
              <div className="bg-zinc-900/70 border border-[#fe9a00]/30 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> 1-Click Auto-Stagger Selected Chapters
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={applySpoonCatchUpPreset}
                      className="px-3 py-1 rounded-lg bg-emerald-600/30 border border-emerald-400/50 text-emerald-200 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600/50 transition-colors cursor-pointer"
                    >
                      🥄 Spoon Preset (10-Ch Launch + 3/Wed)
                    </button>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {selectedChapterIds.length} chapter(s) checked below
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      Release Day
                    </label>
                    <select
                      value={staggerDay}
                      onChange={e => setStaggerDay(e.target.value as 'SATURDAY' | 'WEDNESDAY' | 'MONDAY')}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold cursor-pointer"
                    >
                      <option value="SATURDAY">Every Saturday</option>
                      <option value="WEDNESDAY">Every Wednesday</option>
                      <option value="MONDAY">Every Monday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      Chapters Per Drop
                    </label>
                    <select
                      value={chaptersPerDropDay}
                      onChange={e => setChaptersPerDropDay(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold cursor-pointer"
                    >
                      <option value={1}>1 Chapter / Drop</option>
                      <option value={2}>2 Chapters / Drop</option>
                      <option value={3}>3 Chapters / Drop (Spoon)</option>
                      <option value={6}>6 Chapters (Binge Pack)</option>
                      <option value={10}>10 Chapters (Arc Launch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      Cadence Spacing
                    </label>
                    <select
                      value={staggerIntervalWeeks}
                      onChange={e => setStaggerIntervalWeeks(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold cursor-pointer"
                    >
                      <option value={1}>Weekly (Every 1 Week)</option>
                      <option value={2}>Bi-Weekly (Every 2 Weeks)</option>
                      <option value={3}>Every 3 Weeks</option>
                      <option value={4}>Every 4 Weeks (Monthly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      First Drop Date
                    </label>
                    <input
                      type="date"
                      value={staggerStartDate}
                      onChange={e => setStaggerStartDate(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      Release Time (EST)
                    </label>
                    <input
                      type="time"
                      value={staggerTime}
                      onChange={e => setStaggerTime(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyAutoStaggerToSelection}
                  className="w-full py-3 bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-colors cursor-pointer"
                >
                  Apply Auto-Stagger Dates to Checked Chapters Below
                </button>
              </div>
            )}

            {selectedSeriesSlug && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
                  <span>Chapters & Custom Date Overrides</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedChapterIds(currentSeriesChapters.map(c => String(c.id)))}
                      className="hover:text-white cursor-pointer"
                    >
                      Check All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedChapterIds([])}
                      className="hover:text-white cursor-pointer"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                {currentSeriesChapters.length === 0 ? (
                  <p className="text-zinc-500 text-xs font-bold italic py-6 text-center">
                    No chapters uploaded for this series yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {currentSeriesChapters.map((ch: any) => {
                      const cId = String(ch.id);
                      const edit = oneOffEdits[cId] || {
                        date: formatDateInput(new Date()),
                        time: '09:00',
                        isPublished: Boolean(ch.is_published)
                      };
                      const isChecked = selectedChapterIds.includes(cId);
                      const isFuture =
                        edit.isPublished &&
                        edit.date &&
                        new Date(`${edit.date}T${edit.time || '09:00'}`).getTime() > Date.now();

                      return (
                        <div
                          key={cId}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            !edit.isPublished
                              ? 'bg-red-950/15 border-red-900/40'
                              : isFuture
                              ? 'bg-zinc-900 border-[#fe9a00]/50'
                              : 'bg-zinc-950 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setSelectedChapterIds(prev => [...prev, cId]);
                                else setSelectedChapterIds(prev => prev.filter(id => id !== cId));
                              }}
                              className="w-4 h-4 accent-[#fe9a00] cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white uppercase">
                                  Ch. {ch.chapter_number}: {ch.title || `Chapter ${ch.chapter_number}`}
                                </span>
                                {!edit.isPublished ? (
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-900/40 text-red-300">
                                    Hidden in Vault
                                  </span>
                                ) : isFuture ? (
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40">
                                    Scheduled Drop
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400">
                                    Live Now
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={edit.date}
                              onChange={e =>
                                setOneOffEdits(prev => ({
                                  ...prev,
                                  [cId]: { ...edit, date: e.target.value }
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
                                  [cId]: { ...edit, time: e.target.value }
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
                                  : 'bg-red-900/30 border border-red-800 text-red-300'
                              }`}
                            >
                              {edit.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              {edit.isPublished ? 'Published' : 'Hidden'}
                            </button>
                            {ch.publish_at && (
                              <button
                                type="button"
                                onClick={() => handleClearScheduledDate(cId)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                                title="Unschedule & Hide"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveSeriesCadence}
                  disabled={saving}
                  className="w-full mt-4 py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  {saving ? 'Saving Series Schedule...' : 'Save Series Release Dates'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};