import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, userId, initialCount = 0, variant = 'default', onRequireAuth }: any) => {
  const [isHyped, setIsHyped] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId && targetId) {
      checkIfHyped();
    }
  }, [userId, targetId]);

  const checkIfHyped = async () => {
    setIsLoading(true);
    
    // 1. Check if THIS user has already hyped it
    const { data } = await supabase
      .from('hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    
    if (data) setIsHyped(true);

    // 2. Fetch the LIVE total count from the database
    const { count } = await supabase
      .from('hypes')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (count !== null && count > 0) {
      setLocalCount(count);
    } else if (initialCount > 0 && count === 0) {
      setLocalCount(initialCount); // Fallback to initial count
    }

    setIsLoading(false);
  };

  const handleHype = async () => {
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    // --- OPTIMISTIC UI UPDATE ---
    // Change the UI instantly before talking to the database
    const previousIsHyped = isHyped;
    const previousCount = localCount;

    setIsHyped(!previousIsHyped);
    setLocalCount((prev: number) => previousIsHyped ? Math.max(0, prev - 1) : prev + 1);

    try {
      // Fetch their current Hype total from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_hypes')
        .eq('id', userId)
        .maybeSingle(); 
      
      const currentTotalHypes = profile?.total_hypes || 0;

      if (previousIsHyped) {
        // Remove hype record from the item
        const { error: err1 } = await supabase
          .from('hypes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId);
        if (err1) throw err1;
        
        // Subtract 1 from their profile stats
        await supabase
          .from('profiles')
          .update({ total_hypes: Math.max(0, currentTotalHypes - 1) })
          .eq('id', userId);
        
      } else {
        // Add hype record to the item
        const { error: err2 } = await supabase
          .from('hypes')
          .insert([{ user_id: userId, target_type: targetType, target_id: targetId }]);
        if (err2) throw err2;
        
        // Add +1 to their profile stats!
        await supabase
          .from('profiles')
          .update({ total_hypes: currentTotalHypes + 1 })
          .eq('id', userId);
      }
    } catch (error) {
      console.error("Error updating hype:", error);
      // If the database fails, revert the visual change
      setIsHyped(previousIsHyped);
      setLocalCount(previousCount);
    }
  };

  const formattedHype = localCount >= 1000 ? (localCount / 1000).toFixed(1) + 'K' : localCount.toString();

  return (
    <button 
      onClick={handleHype}
      disabled={isLoading}
      className={`flex items-center justify-center transition-all group ${
        variant === 'icon' 
          ? 'p-2 rounded-full hover:bg-black text-[#fe9a00]' 
          : `gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border ${isHyped ? 'border-[#fe9a00] bg-zinc-900 shadow-[0_0_15px_rgba(254,154,0,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-[#fe9a00]'}`
      }`}
    >
      <Flame className={`w-5 h-5 transition-colors ${isHyped ? 'fill-[#fe9a00]' : 'group-hover:fill-[#fe9a00]'}`} />
      {variant !== 'icon' && <span>{formattedHype} HYPE</span>}
    </button>
  );
};