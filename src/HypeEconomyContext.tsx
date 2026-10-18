import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

interface HypeEconomyContextType {
  hypesRemaining: number;
  isLoading: boolean;
  isPremium: boolean;
  spendHype: (targetType: 'chapter' | 'character' | 'creator' | 'series', targetId: string | number, seriesSlug?: string) => Promise<boolean>;
  spendSuperHype: (seriesSlug: string) => Promise<boolean>;
  refreshEconomy: () => Promise<void>;
}

const HypeEconomyContext = createContext<HypeEconomyContextType | undefined>(undefined);

// Helper: Get most recent Saturday at 00:00:00 UTC
const getLastSaturdayUTC = (): Date => {
  const now = new Date();
  const lastSat = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const daysSinceSaturday = (now.getUTCDay() + 1) % 7;
  lastSat.setUTCDate(lastSat.getUTCDate() - daysSinceSaturday);
  return lastSat;
};

export const HypeEconomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hypesRemaining, setHypesRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const syncEconomy = useCallback(async (currentUserId: string) => {
    try {
      const [{ data: profile, error }, { data: settings }] = await Promise.all([
        supabase
          .from('profiles')
          .select('super_hypes_left, hypes_remaining, is_premium, last_hype_reset')
          .eq('id', currentUserId)
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select('free_hype_allowance, premium_hype_allowance, free_tier_hypes, premium_tier_hypes, hype_refill_period')
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (error) throw error;
      if (!profile) return;

      const premiumStatus = Boolean(profile.is_premium);
      setIsPremium(premiumStatus);

      const freeAllowance = settings?.free_hype_allowance ?? settings?.free_tier_hypes ?? 1;
      const proAllowance = settings?.premium_hype_allowance ?? settings?.premium_tier_hypes ?? 3;
      const refillPeriod = settings?.hype_refill_period || 'weekly';
      const tierAllowance = premiumStatus ? proAllowance : freeAllowance;

      const lastSaturday = getLastSaturdayUTC();
      const lastResetDate = profile.last_hype_reset ? new Date(profile.last_hype_reset) : null;

      let needsRefill = false;
      if (refillPeriod === 'weekly') {
        if (!lastResetDate || lastResetDate < lastSaturday) {
          needsRefill = true;
        }
      } else if (refillPeriod === 'monthly') {
        const now = new Date();
        const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        if (!lastResetDate || lastResetDate < firstOfMonth) {
          needsRefill = true;
        }
      }

      if (needsRefill) {
        const nowIso = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({
            super_hypes_left: tierAllowance,
            hypes_remaining: tierAllowance,
            last_hype_reset: nowIso
          })
          .eq('id', currentUserId);

        setHypesRemaining(tierAllowance);
      } else {
        const currentBalance = profile.super_hypes_left ?? profile.hypes_remaining ?? tierAllowance;
        // Keep both columns synced if one was updated by an Admin Airdrop
        if (profile.super_hypes_left !== profile.hypes_remaining && profile.hypes_remaining !== null && profile.hypes_remaining !== undefined) {
          const syncedVal = Math.max(profile.super_hypes_left ?? 0, profile.hypes_remaining ?? 0);
          await supabase
            .from('profiles')
            .update({ super_hypes_left: syncedVal, hypes_remaining: syncedVal })
            .eq('id', currentUserId);
          setHypesRemaining(syncedVal);
        } else {
          setHypesRemaining(currentBalance);
        }
      }
    } catch (err) {
      console.error("Failed to sync economy:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEconomy = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error("Session error:", error);

      if (session?.user) {
        setUserId(session.user.id);
        await syncEconomy(session.user.id);
      } else {
        setUserId(null);
        setHypesRemaining(0);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error refreshing economy:", err);
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
  const spendHype = async (targetType: 'chapter' | 'character' | 'creator' | 'series', targetId: string | number, seriesSlug?: string): Promise<boolean> => {
    if (!userId || hypesRemaining <= 0) return false;

    setHypesRemaining(prev => Math.max(0, prev - 1));

    try {
      // 1. Insert the Hype Record
      const { error: insertError } = await supabase.from('hypes').insert([{ 
        user_id: userId, 
        target_type: targetType, 
        target_id: String(targetId)
      }]);
      if (insertError) throw insertError;

      // 2. Fetch current profile stats
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('total_hypes, fandom_score, super_hypes_left, hypes_remaining, is_premium')
        .eq('id', userId)
        .single();
      if (profileFetchError) throw profileFetchError;
      
      // 3. Update profile stats (+5 Fandom Score, +1 Total Hypes) and deduct 1 Hype from both wallet columns
      if (profile) {
        const currentBalance = profile.super_hypes_left ?? profile.hypes_remaining ?? (profile.is_premium ? 3 : 1);
        const nextBalance = Math.max(0, currentBalance - 1);

        const { error: updateError } = await supabase.from('profiles').update({ 
          total_hypes: (profile.total_hypes || 0) + 1,
          fandom_score: (profile.fandom_score || 0) + 5,
          super_hypes_left: nextBalance,
          hypes_remaining: nextBalance
        }).eq('id', userId);
        if (updateError) throw updateError;
      }

      // 4. Update series leaderboard stats if applicable
      const resolvedSeriesSlug = seriesSlug || (targetType === 'series' ? String(targetId) : undefined);
      if (resolvedSeriesSlug) {
        const { data: seriesData, error: seriesFetchError } = await supabase
          .from('series')
          .select('weekly_hype, total_hype')
          .eq('slug', resolvedSeriesSlug)
          .maybeSingle();

        if (!seriesFetchError && seriesData) {
          const { error: seriesUpdateError } = await supabase.from('series').update({ 
            weekly_hype: (seriesData.weekly_hype || 0) + 5, 
            total_hype: (seriesData.total_hype || 0) + 5 
          }).eq('slug', resolvedSeriesSlug);
          if (seriesUpdateError) console.error("Non-fatal error updating series leaderboard:", seriesUpdateError);
        }
      }

      window.dispatchEvent(new Event('profileUpdated'));
      return true;

    } catch (e) {
      console.error("Database rejection on spendHype:", e);
      setHypesRemaining(prev => prev + 1);
      return false;
    }
  };

  // Super Hype Logic (Main Series Hype Button)
  const spendSuperHype = async (seriesSlug: string): Promise<boolean> => {
    if (!userId || hypesRemaining <= 0) return false;

    setHypesRemaining(prev => Math.max(0, prev - 1));

    try {
      // 1. Insert into super_hypes (for Monthly Big 3) AND hypes (for Weekly Series Polls)
      const { error: insertError } = await supabase.from('super_hypes').insert([{ 
        user_id: userId, 
        series_slug: seriesSlug 
      }]);
      if (insertError) throw insertError;

      await supabase.from('hypes').insert([{
        user_id: userId,
        target_type: 'series',
        target_id: String(seriesSlug)
      }]);

      // 2. Fetch current profile stats
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('super_hypes, total_hypes, fandom_score, super_hypes_left, hypes_remaining, is_premium')
        .eq('id', userId)
        .single();
      if (profileFetchError) throw profileFetchError;
      
      // 3. Update profile stats (+10 Fandom Score for Super Hype, +1 super_hypes, +1 total_hypes)
      if (profile) {
        const currentBalance = profile.super_hypes_left ?? profile.hypes_remaining ?? (profile.is_premium ? 3 : 1);
        const nextBalance = Math.max(0, currentBalance - 1);

        const { error: updateError } = await supabase.from('profiles').update({ 
          super_hypes: (profile.super_hypes || 0) + 1,
          total_hypes: (profile.total_hypes || 0) + 1,
          fandom_score: (profile.fandom_score || 0) + 10,
          super_hypes_left: nextBalance,
          hypes_remaining: nextBalance
        }).eq('id', userId);
        if (updateError) throw updateError;
      }

      // 4. Update series weekly_hype and total_hype
      const { data: seriesData } = await supabase
        .from('series')
        .select('weekly_hype, total_hype')
        .eq('slug', seriesSlug)
        .maybeSingle();

      if (seriesData) {
        await supabase.from('series').update({
          weekly_hype: (seriesData.weekly_hype || 0) + 10,
          total_hype: (seriesData.total_hype || 0) + 10
        }).eq('slug', seriesSlug);
      }

      window.dispatchEvent(new Event('profileUpdated'));
      return true;

    } catch (e) {
      console.error("Database rejection on spendSuperHype:", e);
      setHypesRemaining(prev => prev + 1);
      return false;
    }
  };

  return (
    <HypeEconomyContext.Provider value={{ hypesRemaining, isLoading, isPremium, spendHype, spendSuperHype, refreshEconomy }}>
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