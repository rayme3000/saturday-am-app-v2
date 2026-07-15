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
    const { data } = await supabase
      .from('hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();
    
    if (data) setIsHyped(true);
    setIsLoading(false);
  };

  const handleHype = async () => {
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    if (isHyped) {
      await supabase
        .from('hypes')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId);
      
      setIsHyped(false);
      setLocalCount((prev: number) => Math.max(0, prev - 1));
    } else {
      await supabase
        .from('hypes')
        .insert([{ user_id: userId, target_type: targetType, target_id: targetId }]);
      
      setIsHyped(true);
      setLocalCount((prev: number) => prev + 1);
    }
    setIsLoading(false);
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