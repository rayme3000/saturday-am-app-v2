import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Flame } from 'lucide-react';

export const HypeButton = ({ targetType, targetId, userId, initialCount = 0, variant = 'default', onRequireAuth }: any) => {
  const [isHyped, setIsHyped] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Use refs to prevent delayed database fetches from overwriting your clicks!
  const isProcessing = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (userId && targetId) {
      checkIfHyped();
    } else {
      setLocalCount(initialCount);
    }
    return () => { isMounted.current = false; };
  }, [userId, targetId]);

  const checkIfHyped = async () => {
    if (!targetId || !userId) return;
    
    // Ensure the ID is formatted as a string so Supabase doesn't reject it
    const targetString = String(targetId);
    
    const { data } = await supabase
      .from('hypes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetString)
      .maybeSingle();
    
    // ONLY update visually if the user hasn't actively clicked the button
    if (isMounted.current && !isProcessing.current) {
      if (data) setIsHyped(true);
      else setIsHyped(false);
    }

    const { count } = await supabase
      .from('hypes')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetString);

    if (isMounted.current && !isProcessing.current) {
      if (count !== null && count > 0) {
        setLocalCount(count);
      } else if (initialCount > 0 && count === 0) {
        setLocalCount(initialCount); 
      }
    }
  };

  const handleHype = async (e: any) => {
    // 1. Prevent the click from triggering the Manga Reader UI
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      else alert("Please log in or create a Free Account to drop hypes!");
      return;
    }

    // 2. Prevent spam-clicking from breaking the database
    if (isProcessing.current) return;
    isProcessing.current = true;

    // 3. Trigger the satisfying pop animation!
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const previousIsHyped = isHyped;
    const targetString = String(targetId);

    // 4. Optimistic UI Update - Lock it in instantly!
    setIsHyped(!previousIsHyped);
    setLocalCount((prev: number) => previousIsHyped ? Math.max(0, prev - 1) : prev + 1);

    try {
      if (previousIsHyped) {
        // Remove hype
        await supabase
          .from('hypes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetString);
      } else {
        // Add hype
        await supabase
          .from('hypes')
          .insert([{ user_id: userId, target_type: targetType, target_id: targetString }]);
      }

      // Fire-and-forget the profile stat update so it doesn't slow down the button
      supabase.from('profiles').select('total_hypes').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data) {
          const newTotal = previousIsHyped ? Math.max(0, data.total_hypes - 1) : data.total_hypes + 1;
          supabase.from('profiles').update({ total_hypes: newTotal }).eq('id', userId).then();
        }
      });

    } catch (error) {
      console.error("Error saving hype to database:", error);
      // We purposefully DO NOT revert the UI here so it stays satisfyingly selected for the user.
    }

    // Release the lock after 500ms
    setTimeout(() => {
      if (isMounted.current) isProcessing.current = false;
    }, 500);
  };

  const formattedHype = localCount >= 1000 ? (localCount / 1000).toFixed(1) + 'K' : localCount.toString();

  // --- ICON-ONLY VARIANT (Used inside the Manga Reader) ---
  if (variant === 'icon') {
    return (
      <button 
        onClick={handleHype}
        className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isHyped ? 'bg-[#fe9a00]/20' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'} border border-white/5 shadow-xl group flex items-center justify-center cursor-pointer`}
        title="Hype this Page"
      >
        <Flame 
          className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'text-white/70 group-hover:text-white'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} 
        />
        {/* Number Badge */}
        {localCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#fe9a00] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">
            {formattedHype}
          </span>
        )}
      </button>
    );
  }

  // --- DEFAULT VARIANT (Used on Series Pages) ---
  return (
    <button 
      onClick={handleHype}
      className={`flex items-center justify-center transition-all duration-300 group gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest border cursor-pointer ${isHyped ? 'border-[#fe9a00] bg-zinc-900 shadow-[0_0_15px_rgba(254,154,0,0.2)]' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-[#fe9a00]'}`}
    >
      <Flame 
        className={`w-5 h-5 transition-all duration-300 ${isHyped ? 'fill-[#fe9a00] text-[#fe9a00]' : 'group-hover:fill-[#fe9a00] text-zinc-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6 filter drop-shadow-[0_0_12px_rgba(254,154,0,1)]' : 'scale-100'}`} 
      />
      <span>{formattedHype} HYPE</span>
    </button>
  );
};