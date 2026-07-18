import React, { useState, useEffect } from 'react';
import { User, Lock } from 'lucide-react';
import { supabase } from '../supabase';

export const SeriesCommentsSection = ({ seriesSlug, onRequireAuth }: { seriesSlug: string, onRequireAuth: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const COMMENTS_PER_PAGE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || '' });
      }
    });
  }, []);

  // Fetch comments with range limits
  const fetchComments = async (pageIndex: number, isInitialLoad = false) => {
    if (!seriesSlug) return;
    if (!isInitialLoad) setIsLoadingMore(true);

    const from = pageIndex * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data } = await supabase.from('series_comments')
      .select('*')
      .eq('series_slug', seriesSlug)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      if (isInitialLoad) {
        setComments(data);
      } else {
        setComments(prev => [...prev, ...data]);
      }
      setHasMore(data.length === COMMENTS_PER_PAGE);
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (seriesSlug) {
      setPage(0);
      setHasMore(true);
      fetchComments(0, true);
    }
  }, [seriesSlug]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage);
  };

  const handleCommentSubmit = async () => {
    // If not logged in, trigger the upsell modal instead of posting!
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    const newComment = { 
      series_slug: seriesSlug, 
      user_id: currentUser.id, 
      user_name: currentUser.name, 
      avatar_url: currentUser.avatar, 
      text: commentText.trim() 
    };
    
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { 
      setComments([data, ...comments]); 
      setCommentText(''); 
      
      // --- NEW: INCREMENT QUICK REACTS / COMMENTS ON PROFILE ---
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('quick_reacts')
          .eq('id', currentUser.id)
          .maybeSingle();
          
        const currentReacts = profile?.quick_reacts || 0;
        
        await supabase
          .from('profiles')
          .update({ quick_reacts: currentReacts + 1 })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error("Failed to update comment stats:", err);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
      </div>
      
      <div className="flex gap-4 mb-10">
        <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center flex-shrink-0">
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} loading="lazy" className="w-full h-full rounded-full object-cover" alt="Avatar" />
          ) : (
            <User className="w-5 h-5 text-zinc-500" />
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-end gap-2">
          <textarea
            value={commentText} 
            onChange={(e) => setCommentText(e.target.value)} 
            placeholder="What do you think of this series?"
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-20"
          />
          
          <button 
            onClick={handleCommentSubmit} 
            disabled={isSubmitting}
            className="bg-zinc-800 text-white border border-zinc-700 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2"
          >
            {!currentUser && <Lock className="w-3 h-3" />}
            {isSubmitting ? 'Posting...' : (currentUser ? 'Post Comment' : 'Log In to Post')}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 mb-8">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group animate-fade-in">
            {comment.avatar_url && !comment.avatar_url.includes('pravatar') ? (
           <img src={comment.avatar_url} loading="lazy" className="w-10 h-10 rounded-full border border-zinc-800 object-cover bg-zinc-900 flex-shrink-0" alt={comment.user_name} />
         ) : (
           <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0">
             <User className="w-5 h-5 text-zinc-500" />
           </div>
         )}
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[10px]">{comment.user_name}</span>
                <span className="text-zinc-600 text-[8px] font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{comment.text}</p>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No comments yet. Be the first!</p>
          </div>
        )}
      </div>

      {hasMore && comments.length > 0 && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={handleLoadMore} 
            disabled={isLoadingMore}
            className="border border-zinc-700 text-zinc-400 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMore ? (
               <><div className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" /> Loading...</>
            ) : (
               'Load More Comments'
            )}
          </button>
        </div>
      )}
    </div>
  );
};