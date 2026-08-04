import React, { useState, useEffect } from 'react';
import { Lock, Flame, Flag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { DecoratedAvatar } from './DecoratedAvatar'; 

export const SeriesCommentsSection = ({ seriesSlug, onRequireAuth }: { seriesSlug: string, onRequireAuth: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- HYPES & REPORTS STATE ---
  const [commentHypes, setCommentHypes] = useState<Record<string, { count: number, hasHyped: boolean }>>({});
  const [reportedComments, setReportedComments] = useState<string[]>([]);
  
  // --- IN-APP TOAST NOTIFICATION ---
  const [toastConfig, setToastConfig] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const COMMENTS_PER_PAGE = 10;
  const MAX_CHARS = 140;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url, frame_id').eq('id', user.id).single();
        setCurrentUser({ 
          id: user.id, 
          name: profile?.username || 'Reader', 
          avatar: profile?.avatar_url || '', 
          frameId: profile?.frame_id || 'none' 
        });
      }
    });
  }, []);

  // Fetch comments (Top-level only, no replies)
  const fetchComments = async (pageIndex: number, isInitialLoad = false) => {
    if (!seriesSlug) return;
    if (!isInitialLoad) setIsLoadingMore(true);

    const from = pageIndex * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data } = await supabase.from('series_comments')
      .select('*')
      .eq('series_slug', seriesSlug)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))].filter(Boolean);
      let profileMap: any = {};
      
      if (userIds.length > 0) {
         const { data: profiles } = await supabase.from('profiles').select('id, frame_id').in('id', userIds);
         profiles?.forEach((p: any) => profileMap[p.id] = p.frame_id);
      }

      const enrichedData = data.map((c: any) => ({ ...c, frame_id: profileMap[c.user_id] || 'none' }));

      if (isInitialLoad) {
        setComments(enrichedData);
      } else {
        setComments(prev => [...prev, ...enrichedData]);
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

  // Fetch Hypes and Reports for the loaded comments
  useEffect(() => {
    const loadInteractions = async () => {
      if (comments.length === 0) return;
      const commentIds = comments.map(c => c.id);
      
      // 1. Fetch Hypes
      const { data: hypesData } = await supabase
        .from('hypes')
        .select('target_id, user_id')
        .eq('target_type', 'comment')
        .in('target_id', commentIds);

      const newHypes: Record<string, { count: number, hasHyped: boolean }> = {};
      
      commentIds.forEach(id => {
        const commentHypesList = hypesData?.filter((h: any) => h.target_id === id) || [];
        newHypes[id] = {
          count: commentHypesList.length,
          hasHyped: currentUser ? commentHypesList.some((h: any) => h.user_id === currentUser.id) : false
        };
      });
      
      setCommentHypes(newHypes);

      // 2. Fetch User's Reports to gray out the flag icon if already reported
      if (currentUser) {
        const { data: reportsData } = await supabase
          .from('comment_reports')
          .select('comment_id')
          .eq('reported_by', currentUser.id)
          .in('comment_id', commentIds);
          
        if (reportsData) {
          setReportedComments(reportsData.map((r: any) => r.comment_id));
        }
      }
    };
    
    loadInteractions();
  }, [comments, currentUser]);

  // Auto-dismiss the toast notification after 3 seconds
  useEffect(() => {
    if (toastConfig) {
      const timer = setTimeout(() => setToastConfig(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastConfig]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage);
  };

  const handleCommentSubmit = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    
    if (!commentText.trim() || commentText.length > MAX_CHARS) return;
    
    setIsSubmitting(true);
    const newComment = { 
      series_slug: seriesSlug, 
      user_id: currentUser.id, 
      user_name: currentUser.name, 
      avatar_url: currentUser.avatar, 
      text: commentText.trim(),
      parent_id: null
    };
    
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { 
      const newCommentWithFrame = { ...data, frame_id: currentUser.frameId };
      setComments([newCommentWithFrame, ...comments]); 
      setCommentText(''); 
      
      try {
        const { data: profile } = await supabase.from('profiles').select('quick_reacts').eq('id', currentUser.id).maybeSingle();
        const currentReacts = profile?.quick_reacts || 0;
        await supabase.from('profiles').update({ quick_reacts: currentReacts + 1 }).eq('id', currentUser.id);
      } catch (err) {
        console.error("Failed to update comment stats:", err);
      }
    }
    setIsSubmitting(false);
  };

  const handleHypeComment = async (commentId: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    const isHyped = commentHypes[commentId]?.hasHyped;
    const currentCount = commentHypes[commentId]?.count || 0;

    // Optimistic UI Update
    setCommentHypes(prev => ({
      ...prev,
      [commentId]: {
        count: isHyped ? Math.max(0, currentCount - 1) : currentCount + 1,
        hasHyped: !isHyped
      }
    }));

    if (isHyped) {
      await supabase.from('hypes').delete().match({ target_type: 'comment', target_id: commentId, user_id: currentUser.id });
    } else {
      await supabase.from('hypes').insert([{ target_type: 'comment', target_id: commentId, user_id: currentUser.id }]);
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (reportedComments.includes(commentId)) return;

    // Optimistic UI Update
    setReportedComments(prev => [...prev, commentId]);

    const { error } = await supabase.from('comment_reports').insert([{ comment_id: commentId, reported_by: currentUser.id }]);
    
    if (error) {
      console.error("Failed to report comment:", error);
      // Revert optimistic update on failure
      setReportedComments(prev => prev.filter(id => id !== commentId));
      setToastConfig({ message: 'Failed to send report. Please try again.', type: 'error' });
    } else {
      setToastConfig({ message: 'Report submitted successfully.', type: 'success' });
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      
      {/* IN-APP TOAST NOTIFICATION */}
      {toastConfig && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[6000] bg-black border border-zinc-700 text-white px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-fade-in pointer-events-none">
          {toastConfig.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest">{toastConfig.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
      </div>
      
      <div className="flex gap-4 mb-10">
        <DecoratedAvatar avatarUrl={currentUser?.avatar} frameId={currentUser?.frameId} size="w-10 h-10" iconSize="w-5 h-5" />
        
        <div className="flex-1 flex flex-col items-end gap-2">
          <div className="relative w-full">
            <textarea
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value.slice(0, MAX_CHARS))} 
              placeholder={`Drop your thoughts! (${MAX_CHARS} characters max)`}
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 pb-8 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-24"
            />
            <span className={`absolute bottom-3 right-3 text-[10px] font-black uppercase tracking-widest ${commentText.length >= MAX_CHARS ? 'text-red-500' : 'text-zinc-500'}`}>
              {commentText.length}/{MAX_CHARS}
            </span>
          </div>
          
          <button 
            onClick={handleCommentSubmit} 
            disabled={isSubmitting || !commentText.trim()}
            className="bg-zinc-800 text-white border border-zinc-700 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!currentUser && <Lock className="w-3 h-3" />}
            {isSubmitting ? 'Posting...' : (currentUser ? 'Post Comment' : 'Log In to Post')}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 mb-8">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group animate-fade-in">
            <DecoratedAvatar avatarUrl={comment.avatar_url} frameId={comment.frame_id} size="w-10 h-10" iconSize="w-5 h-5" />
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[10px]">{comment.user_name}</span>
                <span className="text-zinc-600 text-[8px] font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
              
              <div className="flex items-center gap-4 mt-2">
                <button 
                  onClick={() => handleHypeComment(comment.id)} 
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${commentHypes[comment.id]?.hasHyped ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Flame className={`w-3.5 h-3.5 ${commentHypes[comment.id]?.hasHyped ? 'fill-[#fe9a00]' : ''}`} />
                  {commentHypes[comment.id]?.count || 0}
                </button>
                
                <button 
                  onClick={() => handleReportComment(comment.id)} 
                  disabled={reportedComments.includes(comment.id)}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${reportedComments.includes(comment.id) ? 'text-red-500/50 cursor-not-allowed' : 'text-zinc-500 hover:text-red-500'}`}
                  title="Report Comment"
                >
                  <Flag className="w-3.5 h-3.5" />
                  {reportedComments.includes(comment.id) ? 'Reported' : 'Report'}
                </button>
              </div>

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