import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export const FREE_ROLLOVER_CAP = 5;
export const PREMIUM_ROLLOVER_CAP = 10;

interface HypeEconomyContextType {
  hypesRemaining: number; // Active Weekly Hypes (Orange - Capped at 5 Free / 10 PLUS)
  vaultedHypes: number;   // Purchased / Bundle Hypes (Metallic Gold - Uncapped & Never Expire)
  totalAvailableHypes: number; // hypesRemaining + vaultedHypes
  rolloverCap: number;    // 5 for Free, 10 for PLUS
  isLoading: boolean;
  isPremium: boolean;
  spendHype: (
    targetType: 'chapter' | 'character' | 'creator' | 'series',
    targetId: string | number,
    seriesSlug?: string
  ) => Promise<boolean>;
  spendSuperHype: (seriesSlug: string) => Promise<boolean>;
  refreshEconomy: () => Promise<void>;
}

const HypeEconomyContext = createContext<HypeEconomyContextType | undefined>(undefined);

// Helper: Get most recent Saturday at 00:00:00 UTC
const getLastSaturdayUTC = (): Date => {
  const now = new Date();
  const lastSat = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const daysSinceSaturday = (now.getUTCDay() + 1) % 7;
  lastSat.setUTCDate(lastSat.getUTCDate() - daysSinceSaturday);
  return lastSat;
};

export const HypeEconomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hypesRemaining, setHypesRemaining] = useState<number>(0);
  const [vaultedHypes, setVaultedHypes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const syncEconomy = useCallback(async (currentUserId: string) => {
    try {
      const [{ data: profile, error }, { data: settings }] = await Promise.all([
        supabase
          .from('profiles')
          .select('super_hypes_left, hypes_remaining, vaulted_hypes, is_premium, last_hype_reset')
          .eq('id', currentUserId)
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select(
            'free_hype_allowance, premium_hype_allowance, free_tier_hypes, premium_tier_hypes, hype_refill_period'
          )
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (error) throw error;
      if (!profile) return;

      const premiumStatus = Boolean(profile.is_premium);
      setIsPremium(premiumStatus);

      const freeAllowance = Number(
        settings?.free_hype_allowance ?? settings?.free_tier_hypes ?? 1
      );
      const proAllowance = Number(
        settings?.premium_hype_allowance ?? settings?.premium_tier_hypes ?? 3
      );
      const refillPeriod = settings?.hype_refill_period || 'weekly';
      const tierAllowance = premiumStatus ? proAllowance : freeAllowance;
      const tierRolloverCap = premiumStatus ? PREMIUM_ROLLOVER_CAP : FREE_ROLLOVER_CAP;

      // Canonical Active & Vaulted balances
      const rawActive =
        profile.hypes_remaining !== null && profile.hypes_remaining !== undefined
          ? Number(profile.hypes_remaining)
          : profile.super_hypes_left !== null && profile.super_hypes_left !== undefined
          ? Number(profile.super_hypes_left)
          : tierAllowance;
      const currentActive = Math.max(0, rawActive);
      const currentVaulted = Math.max(0, Number(profile.vaulted_hypes || 0));

      setVaultedHypes(currentVaulted);

      const lastSaturday = getLastSaturdayUTC();
      const lastResetDate = profile.last_hype_reset ? new Date(profile.last_hype_reset) : null;

      let needsRefill = false;
      if (refillPeriod === 'weekly') {
        if (!lastResetDate || lastResetDate < lastSaturday) {
          needsRefill = true;
        }
      } else if (refillPeriod === 'monthly') {
        const now = new Date();
        const firstOfMonth = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
        );
        if (!lastResetDate || lastResetDate < firstOfMonth) {
          needsRefill = true;
        }
      }

      if (needsRefill) {
        const nowIso = new Date().toISOString();
        // Rollover unspent Active Hypes up to the tier cap (5 Free / 10 PLUS).
        // If a user already has more than the cap from an older airdrop, never reduce their balance.
        const rolledOverActive =
          currentActive >= tierRolloverCap
            ? currentActive
            : Math.min(tierRolloverCap, currentActive + tierAllowance);

        await supabase
          .from('profiles')
          .update({
            hypes_remaining: rolledOverActive,
            super_hypes_left: rolledOverActive,
            last_hype_reset: nowIso
          })
          .eq('id', currentUserId);

        setHypesRemaining(rolledOverActive);
      } else {
        // Keep super_hypes_left and hypes_remaining strictly identical
        if (profile.super_hypes_left !== currentActive) {
          await supabase
            .from('profiles')
            .update({
              hypes_remaining: currentActive,
              super_hypes_left: currentActive
            })
            .eq('id', currentUserId);
        }
        setHypesRemaining(currentActive);
      }
    } catch (err) {
      console.error('Failed to sync economy:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEconomy = useCallback(async () => {
    try {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();
      if (error) console.error('Session error:', error);

      if (session?.user) {
        setUserId(session.user.id);
        await syncEconomy(session.user.id);
      } else {
        setUserId(null);
        setHypesRemaining(0);
        setVaultedHypes(0);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error refreshing economy:', err);
      setIsLoading(false);
    }
  }, [syncEconomy]);

  useEffect(() => {
    refreshEconomy();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);
        setTimeout(() => {
          syncEconomy(uid);
        }, 0);
      } else {
        setUserId(null);
        setHypesRemaining(0);
        setVaultedHypes(0);
        setIsLoading(false);
      }
    });

    const handleProfileUpdated = () => {
      if (userId) {
        syncEconomy(userId);
      } else {
        refreshEconomy();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdated);
    };
  }, [refreshEconomy, syncEconomy, userId]);

  // Standard Hype Logic (Chapters, Characters, Creators, Series)
  // Priority 1: Spend Active Weekly Hypes (Orange). Priority 2: Spend Vaulted Gold Hypes.
  const spendHype = async (
    targetType: 'chapter' | 'character' | 'creator' | 'series',
    targetId: string | number,
    seriesSlug?: string
  ): Promise<boolean> => {
    if (!userId || hypesRemaining + vaultedHypes <= 0) return false;

    const spendingActive = hypesRemaining > 0;
    if (spendingActive) {
      setHypesRemaining(prev => Math.max(0, prev - 1));
    } else {
      setVaultedHypes(prev => Math.max(0, prev - 1));
    }

    try {
      // 1. Insert the Hype Record
      const { error: insertError } = await supabase.from('hypes').insert([
        {
          user_id: userId,
          target_type: targetType,
          target_id: String(targetId)
        }
      ]);
      if (insertError) throw insertError;

      // 2. Fetch ground-truth profile balances
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('total_hypes, fandom_score, super_hypes_left, hypes_remaining, vaulted_hypes, is_premium')
        .eq('id', userId)
        .single();
      if (profileFetchError) throw profileFetchError;

      if (profile) {
        const dbActive = Math.max(
          0,
          Number(profile.hypes_remaining ?? profile.super_hypes_left ?? 0)
        );
        const dbVaulted = Math.max(0, Number(profile.vaulted_hypes || 0));

        let nextActive = dbActive;
        let nextVaulted = dbVaulted;

        if (dbActive > 0) {
          nextActive = dbActive - 1;
        } else if (dbVaulted > 0) {
          nextVaulted = dbVaulted - 1;
        } else {
          throw new Error('Insufficient Hype balance in database.');
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_hypes: Number(profile.total_hypes || 0) + 1,
            fandom_score: Number(profile.fandom_score || 0) + 5,
            hypes_remaining: nextActive,
            super_hypes_left: nextActive,
            vaulted_hypes: nextVaulted
          })
          .eq('id', userId);
        if (updateError) throw updateError;

        setHypesRemaining(nextActive);
        setVaultedHypes(nextVaulted);
      }

      // 3. Update series leaderboard stats (+5)
      const resolvedSeriesSlug =
        seriesSlug || (targetType === 'series' ? String(targetId) : undefined);
      if (resolvedSeriesSlug) {
        const { data: seriesData, error: seriesFetchError } = await supabase
          .from('series')
          .select('weekly_hype, total_hype')
          .eq('slug', resolvedSeriesSlug)
          .maybeSingle();

        if (!seriesFetchError && seriesData) {
          await supabase
            .from('series')
            .update({
              weekly_hype: Number(seriesData.weekly_hype || 0) + 5,
              total_hype: Number(seriesData.total_hype || 0) + 5
            })
            .eq('slug', resolvedSeriesSlug);
        }
      }

      window.dispatchEvent(new Event('profileUpdated'));
      return true;
    } catch (e) {
      console.error('Database rejection on spendHype:', e);
      if (spendingActive) {
        setHypesRemaining(prev => prev + 1);
      } else {
        setVaultedHypes(prev => prev + 1);
      }
      return false;
    }
  };

  // Super Hype Logic (Main Series Hype Button)
  // Priority 1: Spend Active Weekly Hypes (Orange). Priority 2: Spend Vaulted Gold Hypes.
  const spendSuperHype = async (seriesSlug: string): Promise<boolean> => {
    if (!userId || hypesRemaining + vaultedHypes <= 0) return false;

    const spendingActive = hypesRemaining > 0;
    if (spendingActive) {
      setHypesRemaining(prev => Math.max(0, prev - 1));
    } else {
      setVaultedHypes(prev => Math.max(0, prev - 1));
    }

    try {
      // 1. Insert into super_hypes (for Monthly Big 3) AND hypes (for Weekly Series Polls)
      const { error: insertError } = await supabase.from('super_hypes').insert([
        {
          user_id: userId,
          series_slug: seriesSlug
        }
      ]);
      if (insertError) throw insertError;

      await supabase.from('hypes').insert([
        {
          user_id: userId,
          target_type: 'series',
          target_id: String(seriesSlug)
        }
      ]);

      // 2. Fetch ground-truth profile balances
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select(
          'super_hypes, total_hypes, fandom_score, super_hypes_left, hypes_remaining, vaulted_hypes, is_premium'
        )
        .eq('id', userId)
        .single();
      if (profileFetchError) throw profileFetchError;

      if (profile) {
        const dbActive = Math.max(
          0,
          Number(profile.hypes_remaining ?? profile.super_hypes_left ?? 0)
        );
        const dbVaulted = Math.max(0, Number(profile.vaulted_hypes || 0));

        let nextActive = dbActive;
        let nextVaulted = dbVaulted;

        if (dbActive > 0) {
          nextActive = dbActive - 1;
        } else if (dbVaulted > 0) {
          nextVaulted = dbVaulted - 1;
        } else {
          throw new Error('Insufficient Hype balance in database.');
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            super_hypes: Number(profile.super_hypes || 0) + 1,
            total_hypes: Number(profile.total_hypes || 0) + 1,
            fandom_score: Number(profile.fandom_score || 0) + 10,
            hypes_remaining: nextActive,
            super_hypes_left: nextActive,
            vaulted_hypes: nextVaulted
          })
          .eq('id', userId);
        if (updateError) throw updateError;

        setHypesRemaining(nextActive);
        setVaultedHypes(nextVaulted);
      }

      // 3. Update series weekly_hype and total_hype (+10)
      const { data: seriesData } = await supabase
        .from('series')
        .select('weekly_hype, total_hype')
        .eq('slug', seriesSlug)
        .maybeSingle();

      if (seriesData) {
        await supabase
          .from('series')
          .update({
            weekly_hype: Number(seriesData.weekly_hype || 0) + 10,
            total_hype: Number(seriesData.total_hype || 0) + 10
          })
          .eq('slug', seriesSlug);
      }

      window.dispatchEvent(new Event('profileUpdated'));
      return true;
    } catch (e) {
      console.error('Database rejection on spendSuperHype:', e);
      if (spendingActive) {
        setHypesRemaining(prev => prev + 1);
      } else {
        setVaultedHypes(prev => prev + 1);
      }
      return false;
    }
  };

  const totalAvailableHypes = hypesRemaining + vaultedHypes;
  const rolloverCap = isPremium ? PREMIUM_ROLLOVER_CAP : FREE_ROLLOVER_CAP;

  return (
    <HypeEconomyContext.Provider
      value={{
        hypesRemaining,
        vaultedHypes,
        totalAvailableHypes,
        rolloverCap,
        isLoading,
        isPremium,
        spendHype,
        spendSuperHype,
        refreshEconomy
      }}
    >
      {children}
    </HypeEconomyContext.Provider>
  );
};

export const useHypeEconomy = () => {
  const context = useContext(HypeEconomyContext);
  if (context === undefined) {
    throw new Error('useHypeEconomy must be used within a HypeEconomyProvider');
  }
  return context;
};