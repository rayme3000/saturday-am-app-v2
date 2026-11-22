// Shared Payout, Tip Gross-Up & 365-Day Last-Click Referral Attribution Engine

export const REFERRAL_CODE_KEY = 'am_referral_code';
export const REFERRAL_CLICKED_AT_KEY = 'am_referral_clicked_at';
export const REFERRAL_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // 1 Full Year (365 Days)

export const DEV_CUT_PERCENT = 7.5;
export const SAT_AM_MIN_PERCENT = 50.0;
export const MAX_CREATOR_POOL_PERCENT = 100 - SAT_AM_MIN_PERCENT - DEV_CUT_PERCENT; // 42.5%

export interface TipFeeBreakdown {
  baseTipDollars: number;
  coverFee: boolean;
  fanPaysDollars: number;
  processingFeeDollars: number;
  creatorNetDollars: number;
}

// Exact Stripe US Card Fee Math (2.9% + $0.30) matching create-checkout-session
export const calculateTipFeeBreakdown = (
  baseTipDollars: number,
  coverFee: boolean
): TipFeeBreakdown => {
  const baseCents = Math.round(Math.max(0, baseTipDollars) * 100);
  if (baseCents <= 0) {
    return {
      baseTipDollars: 0,
      coverFee,
      fanPaysDollars: 0,
      processingFeeDollars: 0,
      creatorNetDollars: 0
    };
  }

  if (coverFee) {
    const grossedUpCents = Math.ceil((baseCents + 30) / (1 - 0.029));
    const feeCents = grossedUpCents - baseCents;
    return {
      baseTipDollars: Number((baseCents / 100).toFixed(2)),
      coverFee: true,
      fanPaysDollars: Number((grossedUpCents / 100).toFixed(2)),
      processingFeeDollars: Number((feeCents / 100).toFixed(2)),
      creatorNetDollars: Number((baseCents / 100).toFixed(2))
    };
  }

  const deductedFeeCents = Math.round(baseCents * 0.029) + 30;
  const netCreatorCents = Math.max(0, baseCents - deductedFeeCents);
  return {
    baseTipDollars: Number((baseCents / 100).toFixed(2)),
    coverFee: false,
    fanPaysDollars: Number((baseCents / 100).toFixed(2)),
    processingFeeDollars: Number((deductedFeeCents / 100).toFixed(2)),
    creatorNetDollars: Number((netCreatorCents / 100).toFixed(2))
  };
};

// Records a fresh referral link/code click (Last-Click Overwrites Older Code & Resets 365-Day Timer)
export const recordReferralClick = (rawCode?: string | null): string => {
  const clean = String(rawCode || '').trim().toUpperCase();
  if (!clean || !clean.startsWith('VIP-')) return '';
  try {
    const nowIso = new Date().toISOString();
    localStorage.setItem(REFERRAL_CODE_KEY, clean);
    localStorage.setItem(REFERRAL_CLICKED_AT_KEY, nowIso);
  } catch {
    // Ignore storage errors
  }
  return clean;
};

// Reads active referral code if within the 365-day attribution window (checks localStorage + profile fallback)
export const getActiveReferralAttribution = (
  profile?: any
): { code: string; clickedAt: string } | null => {
  // Never apply a referral code if this user already triggered a paid Year-1 referral commission!
  if (profile?.referral_commission_paid_at) {
    return null;
  }

  const now = Date.now();

  try {
    const localCode = String(localStorage.getItem(REFERRAL_CODE_KEY) || '')
      .trim()
      .toUpperCase();
    const localClickedAt = localStorage.getItem(REFERRAL_CLICKED_AT_KEY) || '';

    if (localCode && localCode.startsWith('VIP-')) {
      if (localClickedAt) {
        const clickedMs = new Date(localClickedAt).getTime();
        if (!isNaN(clickedMs) && now - clickedMs > REFERRAL_WINDOW_MS) {
          localStorage.removeItem(REFERRAL_CODE_KEY);
          localStorage.removeItem(REFERRAL_CLICKED_AT_KEY);
        } else {
          return { code: localCode, clickedAt: localClickedAt };
        }
      } else {
        const stamped = new Date().toISOString();
        localStorage.setItem(REFERRAL_CLICKED_AT_KEY, stamped);
        return { code: localCode, clickedAt: stamped };
      }
    }
  } catch {
    // Ignore storage errors
  }

  // Cross-device / PWA fallback: check profile's saved `referred_by_code` & `referred_at`
  const dbCode = String(profile?.referred_by_code || '').trim().toUpperCase();
  if (dbCode && dbCode.startsWith('VIP-') && !profile?.is_premium) {
    const dbRefAt = profile?.referred_at || profile?.created_at || '';
    if (dbRefAt) {
      const refMs = new Date(dbRefAt).getTime();
      if (!isNaN(refMs) && now - refMs <= REFERRAL_WINDOW_MS) {
        return { code: dbCode, clickedAt: dbRefAt };
      }
    } else {
      return { code: dbCode, clickedAt: new Date().toISOString() };
    }
  }

  return null;
};

export const clearLocalReferralAttribution = () => {
  try {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem(REFERRAL_CLICKED_AT_KEY);
  } catch {
    // Ignore
  }
};