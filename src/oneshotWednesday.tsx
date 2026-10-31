// src/oneshotWednesday.ts

export const PLUS_EARLY_ACCESS_MS = 12 * 60 * 60 * 1000; // 12 Hours in milliseconds
export const ONESHOT_DEBUT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // 48 Hours (2 Days) in milliseconds

export const isCompletedRunSeries = (series: any, seriesList?: any[]): boolean => {
  if (!series) return false;

  const matchedFromList = seriesList?.find(
    (s: any) => s.slug && series.slug && String(s.slug).toLowerCase() === String(series.slug).toLowerCase()
  );

  const effectiveHomeSection = String(
    series.home_section ?? matchedFromList?.home_section ?? ''
  )
    .trim()
    .toLowerCase();

  const titleLower = String(series.title ?? matchedFromList?.title ?? '').toLowerCase();
  const slugLower = String(series.slug ?? matchedFromList?.slug ?? '').toLowerCase();

  return (
    Boolean(series.is_completed_run) ||
    effectiveHomeSection === 'completed runs' ||
    effectiveHomeSection === 'completed run' ||
    titleLower.includes('oneshot') ||
    titleLower.includes('one-shot') ||
    slugLower.includes('oneshot') ||
    slugLower.includes('one-shot')
  );
};

// Helper: Finds the valid 48-hour debut start timestamp (checks publish_at, updated_at, and created_at)
export const getOneShotDebutStartMs = (series: any, seriesList?: any[]): number | null => {
  if (!series || !isCompletedRunSeries(series, seriesList)) return null;

  const matchedFromList = seriesList?.find(
    (s: any) => s.slug && series.slug && String(s.slug).toLowerCase() === String(series.slug).toLowerCase()
  );

  const now = Date.now();
  const candidates = [
    series.publish_at,
    matchedFromList?.publish_at,
    series.created_at,
    matchedFromList?.created_at,
    series.updated_at,
    matchedFromList?.updated_at
  ].filter(Boolean);

  for (const iso of candidates) {
    const ms = new Date(iso).getTime();
    if (!isNaN(ms)) {
      const elapsed = now - ms;
      // If timestamp is in the past within 48 hours, it's an active 48-hour debut!
      if (elapsed >= -60000 && elapsed < ONESHOT_DEBUT_WINDOW_MS) {
        return ms;
      }
    }
  }

  return null;
};

// Checks if a Completed Run / One-Shot is currently inside its 48-hour (2-Day) "One-Shot Wednesday Debut" free window
export const isInOneShotDebutWindow = (series: any, seriesList?: any[]): boolean => {
  return getOneShotDebutStartMs(series, seriesList) !== null;
};

// Returns live countdown string ("47h 12m 05s") for either an active 48h Debut Window OR Wednesday 11:59:59 PM EST
export const getOneShotFreeCountdown = (series?: any, seriesList?: any[]): string => {
  const debutStartMs = series ? getOneShotDebutStartMs(series, seriesList) : null;
  if (debutStartMs !== null) {
    const debutEndMs = debutStartMs + ONESHOT_DEBUT_WINDOW_MS;
    const diffMs = Math.max(0, debutEndMs - Date.now());

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  }

  return getWednesdayCountdownEST();
};

// Checks if it is currently Wednesday in US Eastern Time (America/New_York)
export const isCurrentlyWednesdayEST = (): boolean => {
  try {
    const estString = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estDate = new Date(estString);
    return estDate.getDay() === 3; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wednesday
  } catch {
    return new Date().getDay() === 3;
  }
};

// Returns live countdown string ("14h 22m 05s") until Wednesday 11:59:59 PM EST
export const getWednesdayCountdownEST = (): string => {
  try {
    const estString = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estNow = new Date(estString);

    const endOfWednesday = new Date(estNow);
    endOfWednesday.setHours(23, 59, 59, 999);

    const diffMs = Math.max(0, endOfWednesday.getTime() - estNow.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    return `${h}h ${m}m ${s}s`;
  } catch {
    return '24h';
  }
};

// Deterministically picks 1 Completed Run per week so it cycles through every title 1 week at a time
export const getOneShotWednesdaySeries = (seriesList: any[]): any | null => {
  const completedRuns = (seriesList || [])
    .filter((s: any) => isCompletedRunSeries(s, seriesList) && !s.is_hidden)
    .sort((a: any, b: any) => {
      const orderDiff = (a.display_order || 99) - (b.display_order || 99);
      if (orderDiff !== 0) return orderDiff;
      return String(a.slug || '').localeCompare(String(b.slug || ''));
    });

  if (completedRuns.length === 0) return null;

  // Anchor epoch: Wednesday, Oct 28, 2026 @ 00:00:00 EDT
  const estNowStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estNow = new Date(estNowStr).getTime();
  const anchorTime = new Date('2026-10-28T00:00:00').getTime();

  const weeksSinceAnchor = Math.max(0, Math.floor((estNow - anchorTime) / (7 * 24 * 60 * 60 * 1000)));
  const activeIndex = weeksSinceAnchor % completedRuns.length;

  return completedRuns[activeIndex];
};

// Returns true if the series is unlocked for free today (either via 48h One-Shot Debut OR Wednesday OSW rotation)
export const isActiveOneShotWednesday = (series: any, seriesList: any[]): boolean => {
  if (!series || !isCompletedRunSeries(series, seriesList)) return false;

  // 1. Check if the series is inside its 48-hour "One-Shot Wednesday Debut" window (any day of the week)
  if (isInOneShotDebutWindow(series, seriesList)) {
    return true;
  }

  // 2. Otherwise check if today is Wednesday EST and this series is the weekly OSW spotlight
  if (!isCurrentlyWednesdayEST()) return false;
  const spotlight = getOneShotWednesdaySeries(seriesList);
  return Boolean(spotlight && spotlight.slug === series.slug);
};

// Returns true if the chapter is released for the current user tier (PLUS gets chapters 12 hours early!)
export const isChapterReleasedForUser = (
  publishAt?: string | null,
  isPlusUser: boolean = false
): boolean => {
  if (!publishAt) return true;
  const releaseTime = new Date(publishAt).getTime();
  const now = Date.now();
  if (isPlusUser) {
    return releaseTime - PLUS_EARLY_ACCESS_MS <= now;
  }
  return releaseTime <= now;
};

// Returns true if a chapter is currently inside its 12-hour PLUS Early Access window
export const isInPlusEarlyAccessWindow = (publishAt?: string | null): boolean => {
  if (!publishAt) return false;
  const releaseTime = new Date(publishAt).getTime();
  const now = Date.now();
  return now < releaseTime && now >= releaseTime - PLUS_EARLY_ACCESS_MS;
};

// Calculates how many days/hours remain until a series' next scheduled chapter drop
export const getNextScheduledChapterBadge = (
  nextPublishAtIso?: string | null,
  isPlusUser: boolean = false
): { badgeText: string; shortText: string; daysLeft: number; isSoon: boolean } | null => {
  if (!nextPublishAtIso) return null;
  const rawReleaseMs = new Date(nextPublishAtIso).getTime();
  if (isNaN(rawReleaseMs)) return null;

  // PLUS subscribers unlock the chapter 12 hours earlier than standard users
  const effectiveReleaseMs = isPlusUser ? rawReleaseMs - PLUS_EARLY_ACCESS_MS : rawReleaseMs;
  const diffMs = effectiveReleaseMs - Date.now();

  if (diffMs <= 0) return null;

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalHours < 24) {
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = totalHours > 0 ? `${totalHours}H ${mins}M` : `${Math.max(1, mins)}M`;
    return {
      badgeText: isPlusUser ? `⚡ PLUS DROP IN ${timeStr}` : `NEXT CH: IN ${timeStr}`,
      shortText: `Next Ch in ${timeStr}`,
      daysLeft: 0,
      isSoon: true
    };
  }

  if (totalDays === 1) {
    return {
      badgeText: isPlusUser ? '⚡ PLUS DROP TOMORROW' : 'NEXT CH: TOMORROW',
      shortText: 'Next Ch Tomorrow',
      daysLeft: 1,
      isSoon: true
    };
  }

  return {
    badgeText: `NEXT CH: ${totalDays} DAYS`,
    shortText: `Next Ch in ${totalDays} Days`,
    daysLeft: totalDays,
    isSoon: totalDays <= 3
  };
};