import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Heart } from 'lucide-react';

export const LikeButton = ({ targetType, targetId, userId, initialCount = 0, bonusCount = 0, variant = 'default', onRequireAuth, onToggle }: any) => {
  const [isLiked, setIsLiked] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isProcessing = useRef(false);
  const isMounted = useRef(true);

  const getTableName = () => {
    if (targetType === 'series') return 'series_likes';
    if (targetType === 'character') return 'character_likes';
    if (targetType === 'creator') return 'creator_likes';
    return 'chapter_likes';
  };

  const getTargetColumn = () => {
    if (targetType === 'series') return 'series_slug';
    if (targetType === 'chapter') return 'chapter_id';
    if (targetType === 'character') return 'character_id';
    return 'creator_id';
  };

  useEffect(() => {
    isMounted.current = true;
    if (userId && targetId) {
      checkIfLiked();
    } else {
      setLocalCount(initialCount);
    }
    return () => { isMounted.current = false; };
  }, [userId, targetId, initialCount]);

  const checkIfLiked = async () => {
    if (!targetId || !userId) return;
    const targetString = String(targetId);
    const tableName = getTableName();
    const targetColumn = getTargetColumn();
    
    const { data } = await supabase.from(tableName).select('id').eq('user_id', userId).eq(targetColumn, targetString).limit(1).maybeSingle();
    
    if (isMounted.current && !isProcessing.current) {
      setIsLiked(!!data);
    }

    const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true }).eq(targetColumn, targetString);

    if (isMounted.current && !isProcessing.current) {
      if (count !== null && count > 0) {
        setLocalCount(count);
      } else if (initialCount > 0 && count === 0) {
        setLocalCount(initialCount); 
      }
    }
  };

  const executeLike = async (e: any) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      else alert("Please log in or create a Free Account to like this!");
      return;
    }
    
    if (isProcessing.current) return;
    isProcessing.current = true;
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const targetString = String(targetId);
    const tableName = getTableName();
    const targetColumn = getTargetColumn();

    const newLikedState = !isLiked;
    setIsLiked(newLikedState); 
    setLocalCount((prev: number) => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    
    if (onToggle) onToggle(newLikedState);

    try {
      if (newLikedState) {
        await supabase.from(tableName).insert([{ user_id: userId, [targetColumn]: targetString }]);
      } else {
        await supabase.from(tableName).delete().match({ user_id: userId, [targetColumn]: targetString });
      }
      
      supabase.from('profiles').select('fandom_score').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data && newLikedState) {
          supabase.from('profiles').update({ fandom_score: (data.fandom_score || 0) + 1 }).eq('id', userId).then();
        }
      });
    } catch (error) {
      console.error("Error saving like to database:", error);
    }

    setTimeout(() => { if (isMounted.current) isProcessing.current = false; }, 500);
  };

  const displayCount = localCount + (bonusCount || 0);
  const formattedCount = displayCount >= 1000 ? (displayCount / 1000).toFixed(1) + 'K' : displayCount.toString();

  if (variant === 'icon' || variant === 'chapter-action-icon') {
    return (
      <button onClick={executeLike} className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isLiked ? 'bg-red-500/20 border-red-500/30' : 'bg-black/40 backdrop-blur-md hover:bg-black/60 border-white/5'} border shadow-xl flex items-center justify-center cursor-pointer`} title="Like">
        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-zinc-500 hover:text-red-400'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
        {variant === 'icon' && displayCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-md z-10">{formattedCount}</span>}
      </button>
    );
  }

  if (variant === 'mini') {
    return (
      <button onClick={executeLike} className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full transition-all border ${isLiked ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-zinc-900/80 border-zinc-800 hover:border-red-500/50'}`} title="Like">
        <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-zinc-500 hover:text-red-500'} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
      </button>
    );
  }

  return (
    <button onClick={executeLike} className={`flex items-center justify-center transition-all duration-300 gap-2 w-14 rounded-xl border cursor-pointer ${isLiked ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
      <Heart className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'fill-red-500' : ''} ${isAnimating ? 'scale-[1.5] -translate-y-1 rotate-6' : 'scale-100'}`} />
    </button>
  );
};