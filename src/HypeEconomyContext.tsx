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

export const HypeEconomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hypesRemaining, setHypesRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const syncEconomy = useCallback(async (currentUserId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('hypes_remaining, last_hype_refill, is_premium')
        .eq('id', currentUserId)
        .single();

      if (error) throw error;
      if (!profile) return;

      setIsPremium(profile.is_premium || false);

      // Centralized Strict UTC Math
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const daysSinceSaturday = (dayOfWeek + 1) % 7;
      const lastSaturday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceSaturday));

      const lastRefill = new Date(profile.last_hype_refill || 0);

      // Auto-Refill Logic
      if (lastRefill < lastSaturday) {
        const newHypes = profile.is_premium ? 7 : 1;
        const { error: updateError } = await supabase.from('profiles').update({
          hypes_remaining: newHypes,
          last_hype_refill: now.toISOString()
        }).eq('id', currentUserId);
        
        if (updateError) throw updateError;
        setHypesRemaining(newHypes);
      } else {
        setHypesRemaining(profile.hypes_remaining || 0);
      }
    } catch (err) {
      console.error("Failed to sync economy:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEconomy = useCallback(async () => {
    setIsLoading(true);
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
  }, [syncEconomy]);

  useEffect(() => {
    refreshEconomy();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshEconomy();
    });
    return () => authListener.subscription.unsubscribe();
  }, [refreshEconomy]);

  // Standard Hype Logic (Chapters, Characters, Creators, Series)
  const spendHype = async (targetType: 'chapter' | 'character' | 'creator' | 'series', targetId: string | number, seriesSlug?: string): Promise<boolean> => {
    if (!userId || hypesRemaining <= 0) return false;

    // Optimistic UI update
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
      const { data: profile, error: profileFetchError } = await supabase.from('profiles').select('total_hypes, fandom_score, hypes_remaining').eq('id', userId).single();
      if (profileFetchError) throw profileFetchError;
      
      // 3. Update profile stats and deduct the hype
      if (profile) {
        const { error: updateError } = await supabase.from('profiles').update({ 
          total_hypes: (profile.total_hypes || 0) + 1,
          fandom_score: (profile.fandom_score || 0) + 5,
          hypes_remaining: Math.max(0, (profile.hypes_remaining || 0) - 1)
        }).eq('id', userId);
        if (updateError) throw updateError;
      }

      // 4. Update series leaderboard stats if applicable
      if (seriesSlug) {
        const { data: seriesData, error: seriesFetchError } = await supabase.from('series').select('weekly_hype, total_hype').eq('slug', seriesSlug).maybeSingle();
        if (!seriesFetchError && seriesData) {
          const { error: seriesUpdateError } = await supabase.from('series').update({ 
            weekly_hype: (seriesData.weekly_hype || 0) + 5, 
            total_hype: (seriesData.total_hype || 0) + 5 
          }).eq('slug', seriesSlug);
          if (seriesUpdateError) console.error("Non-fatal error updating series leaderboard:", seriesUpdateError);
        }
      }

      // Trigger a global UI sync event to ensure the bottom tracker catches the update instantly
      window.dispatchEvent(new Event('profileUpdated'));
      return true;

    } catch (e) {
      console.error("Database rejection on spendHype:", e);
      // Revert optimistic update on failure so the UI doesn't lie
      setHypesRemaining(prev => prev + 1);
      return false;
    }
  };

  // Super Hype Logic
  const spendSuperHype = async (seriesSlug: string): Promise<boolean> => {
    if (!userId || hypesRemaining <= 0) return false;

    // Optimistic UI update
    setHypesRemaining(prev => Math.max(0, prev - 1));

    try {
      const { error: insertError } = await supabase.from('super_hypes').insert([{ 
        user_id: userId, 
        series_slug: seriesSlug 
      }]);
      if (insertError) throw insertError;

      const { data: profile, error: profileFetchError } = await supabase.from('profiles').select('super_hypes, hypes_remaining').eq('id', userId).single();
      if (profileFetchError) throw profileFetchError;
      
      if (profile) {
        const { error: updateError } = await supabase.from('profiles').update({ 
          super_hypes: (profile.super_hypes || 0) + 1,
          hypes_remaining: Math.max(0, (profile.hypes_remaining || 0) - 1)
        }).eq('id', userId);
        if (updateError) throw updateError;
      }

      window.dispatchEvent(new Event('profileUpdated'));
      return true;

    } catch (e) {
      console.error("Database rejection on spendSuperHype:", e);
      // Revert optimistic update on failure
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