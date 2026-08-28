import React, { useState, useEffect } from 'react';
import { Lock, Flame, Flag, AlertCircle, CheckCircle2, MessageSquare, CornerDownRight } from 'lucide-react';
import { supabase } from '../supabase';
import { DecoratedAvatar } from './DecoratedAvatar'; 
import { cleanText } from '../profanityFilter';

export const SeriesCommentsSection = ({ seriesSlug, onRequireAuth }: { seriesSlug: string, onRequireAuth: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  
  // --- THREADED REPLIES STATE ---
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [commentHypes, setCommentHypes] = useState<Record<string, { count: number, hasHyped: boolean }>>({});
  const [reportedComments, setReportedComments] = useState<string[]>([]);
  const [toastConfig, setToastConfig] = useState<{ message: string, type: 'error' | 'success' | 'pending' } | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const COMMENTS_PER_PAGE = 10;
  const MAX_CHARS = 140;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url, frame_id, is_premium').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || '', frameId: profile?.frame_id || 'none' });
        setIsPremiumUser(profile?.is_premium || false);
      }
    });
  }, []);

  const fetchComments = async (pageIndex: number, isInitialLoad = false) => {
    if (!seriesSlug) return;
    if (!isInitialLoad) setIsLoadingMore(true);

    const from = pageIndex * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data } = await supabase.from('series_comments')
      .select('*')
      .eq('series_slug', seriesSlug)
      .is('parent_id', null)
      .eq('is_hidden', false) // Only fetch approved comments
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

      if (isInitialLoad) setComments(enrichedData);
      else setComments(prev => [...prev, ...enrichedData]);
      
      setHasMore(data.length === COMMENTS_PER_PAGE);
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (seriesSlug) { setPage(0); setHasMore(true); fetchComments(0, true); }
  }, [seriesSlug]);

  useEffect(() => {
    const loadInteractions = async () => {
      if (comments.length === 0) return;
      const commentIds = comments.map(c => c.id);
      
      const { data: hypesData } = await supabase.from('hypes').select('target_id, user_id').eq('target_type', 'comment').in('target_id', commentIds);
      const newHypes: Record<string, { count: number, hasHyped: boolean }> = {};
      
      commentIds.forEach(id => {
        const commentHypesList = hypesData?.filter((h: any) => h.target_id === id) || [];
        newHypes[id] = { count: commentHypesList.length, hasHyped: currentUser ? commentHypesList.some((h: any) => h.user_id === currentUser.id) : false };
      });
      setCommentHypes(newHypes);

      if (currentUser) {
        const { data: reportsData } = await supabase.from('comment_reports').select('comment_id').eq('reported_by', currentUser.id).in('comment_id', commentIds);
        if (reportsData) setReportedComments(reportsData.map((r: any) => r.comment_id));
      }
    };
    loadInteractions();
  }, [comments, currentUser]);

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

  const loadReplies = async (parentId: string) => {
    if (expandedReplies[parentId]) {
      setExpandedReplies(prev => ({...prev, [parentId]: false}));
      return;
    }
    const { data } = await supabase.from('series_comments').select('*').eq('parent_id', parentId).eq('is_hidden', false).order('created_at', { ascending: true });
    if (data) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))].filter(Boolean);
      let profileMap: any = {};
      if (userIds.length > 0) {
         const { data: profiles } = await supabase.from('profiles').select('id, frame_id').in('id', userIds);
         profiles?.forEach((p: any) => profileMap[p.id] = p.frame_id);
      }
      setReplies(prev => ({...prev, [parentId]: data.map((c: any) => ({ ...c, frame_id: profileMap[c.user_id] || 'none' })) }));
    }
    setExpandedReplies(prev => ({...prev, [parentId]: true}));
  };

  const handleCommentSubmit = async (parentId: string | null = null) => {
    if (!currentUser) { onRequireAuth(); return; }
    if (!commentText.trim() || commentText.length > MAX_CHARS) return;
    
    setIsSubmitting(true);
    const cleaned = cleanText(commentText.trim());
    
    // Auto-Moderation Flag: If the filter caught bad words, flag it for review
    const isToxic = cleaned !== commentText.trim(); 

    const newComment = { 
      series_slug: seriesSlug, 
      user_id: currentUser.id, 
      user_name: currentUser.name, 
      avatar_url: currentUser.avatar, 
      text: cleaned, 
      parent_id: parentId,
      is_hidden: isToxic // Holds it invisibly for admin review
    };
    
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { 
      if (isToxic) {
        setToastConfig({ message: 'Comment flagged for admin review.', type: 'pending' });
      } else {
        const newCommentWithFrame = { ...data, frame_id: currentUser.frameId };
        if (parentId) {
           setReplies(prev => ({...prev, [parentId]: [...(prev[parentId] || []), newCommentWithFrame]}));
           setExpandedReplies(prev => ({...prev, [parentId]: true}));
           setReplyingTo(null);
        } else {
           setComments([newCommentWithFrame, ...comments]); 
        }
      }
      setCommentText(''); 
    } else {
      setToastConfig({ message: 'Failed to post comment.', type: 'error' });
    }
    setIsSubmitting(false);
  };

  const handleHypeComment = async (commentId: string) => {
    if (!currentUser) { onRequireAuth(); return; }
    const isHyped = commentHypes[commentId]?.hasHyped;
    const currentCount = commentHypes[commentId]?.count || 0;

    setCommentHypes(prev => ({
      ...prev,
      [commentId]: { count: isHyped ? Math.max(0, currentCount - 1) : currentCount + 1, hasHyped: !isHyped }
    }));

    if (isHyped) await supabase.from('hypes').delete().match({ target_type: 'comment', target_id: commentId, user_id: currentUser.id });
    else await supabase.from('hypes').insert([{ target_type: 'comment', target_id: commentId, user_id: currentUser.id }]);
  };

  const handleReportComment = async (commentId: string) => {
    if (!currentUser) { onRequireAuth(); return; }
    if (reportedComments.includes(commentId)) return;
    setReportedComments(prev => [...prev, commentId]);

    const { error } = await supabase.from('comment_reports').insert([{ comment_id: commentId, reported_by: currentUser.id }]);
    if (error) {
      setReportedComments(prev => prev.filter(id => id !== commentId));
      setToastConfig({ message: 'Failed to send report.', type: 'error' });
    } else setToastConfig({ message: 'Report submitted.', type: 'success' });
  };

  // --- PREMIUM ONLY GATE ---
  if (!isPremiumUser && currentUser) {
    return (
      <div className="relative w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-8">Community <span className="text-[#fe9a00]">Discussion</span></h3>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe9a00]/10 rounded-bl-full blur-2xl pointer-events-none" />
          <Lock className="w-12 h-12 text-[#fe9a00] mb-6 drop-shadow-lg" />
          <h4 className="text-2xl font-black italic uppercase text-white mb-3">Pro Exclusive Lounge</h4>
          <p className="text-zinc-400 text-sm max-w-md mb-8 leading-relaxed font-bold">
            The community discussion is a highly curated, troll-free zone reserved for Saturday AM+ members. Upgrade to join the conversation and reply to fans!
          </p>
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { action: 'sub' } }))} className="bg-[#fe9a00] text-black px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] hover:scale-105">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      
      {toastConfig && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[6000] bg-black border border-zinc-700 text-white px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-fade-in pointer-events-none">
          {toastConfig.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> : 
           toastConfig.type === 'pending' ? <Shield className="w-4 h-4 text-[#fe9a00]" /> : 
           <CheckCircle2 className="w-4 h-4 text-green-500" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toastConfig.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
      </div>
      
      <div className="flex gap-4 mb-10 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
        <DecoratedAvatar avatarUrl={currentUser?.avatar} frameId={currentUser?.frameId} size="w-10 h-10" iconSize="w-5 h-5" />
        <div className="flex-1 flex flex-col items-end gap-2">
          <div className="relative w-full">
            <textarea
              value={replyingTo === null ? commentText : ''} 
              onChange={(e) => { if(replyingTo === null) setCommentText(e.target.value.slice(0, MAX_CHARS)); }} 
              placeholder={`Start a discussion... (${MAX_CHARS} characters max)`}
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 pb-8 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-24"
              onFocus={() => setReplyingTo(null)}
            />
            <span className={`absolute bottom-3 right-3 text-[10px] font-black uppercase tracking-widest ${replyingTo === null && commentText.length >= MAX_CHARS ? 'text-red-500' : 'text-zinc-500'}`}>
              {replyingTo === null ? commentText.length : 0}/{MAX_CHARS}
            </span>
          </div>
          <button 
            onClick={() => handleCommentSubmit(null)} 
            disabled={isSubmitting || !commentText.trim() || replyingTo !== null}
            className="bg-zinc-800 text-[#fe9a00] border border-[#fe9a00]/30 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:border-[#fe9a00] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && replyingTo === null ? 'Posting...' : 'Post Thread'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 mb-8">
        {comments.map((comment) => (
          <div key={comment.id} className="flex flex-col gap-3 group animate-fade-in border-b border-zinc-900/50 pb-6">
            <div className="flex gap-4">
              <DecoratedAvatar avatarUrl={comment.avatar_url} frameId={comment.frame_id} size="w-10 h-10" iconSize="w-5 h-5" />
              <div className="flex-1 flex flex-col">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[10px]">{comment.user_name}</span>
                  <span className="text-zinc-600 text-[8px] font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => handleHypeComment(comment.id)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${commentHypes[comment.id]?.hasHyped ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-white'}`}>
                    <Flame className={`w-3.5 h-3.5 ${commentHypes[comment.id]?.hasHyped ? 'fill-[#fe9a00]' : ''}`} />
                    {commentHypes[comment.id]?.count || 0}
                  </button>
                  <button onClick={() => setReplyingTo(comment.id)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" /> Reply
                  </button>
                  <button onClick={() => handleReportComment(comment.id)} disabled={reportedComments.includes(comment.id)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${reportedComments.includes(comment.id) ? 'text-red-500/50 cursor-not-allowed' : 'text-zinc-500 hover:text-red-500'}`} title="Report Comment">
                    <Flag className="w-3.5 h-3.5" /> {reportedComments.includes(comment.id) ? 'Reported' : 'Report'}
                  </button>
                </div>
              </div>
            </div>

            {/* --- REPLIES SECTION --- */}
            <div className="pl-14 flex flex-col gap-3">
               <button onClick={() => loadReplies(comment.id)} className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-[#fe9a00] transition-colors flex items-center gap-1 w-max">
                 <CornerDownRight className="w-3 h-3" /> {expandedReplies[comment.id] ? 'Hide Replies' : 'View Replies'}
               </button>

               {expandedReplies[comment.id] && replies[comment.id]?.map(reply => (
                 <div key={reply.id} className="flex gap-3 mt-2 animate-fade-in bg-zinc-900/20 p-3 rounded-lg border border-zinc-800/30">
                    <DecoratedAvatar avatarUrl={reply.avatar_url} frameId={reply.frame_id} size="w-8 h-8" iconSize="w-4 h-4" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[9px]">{reply.user_name}</span>
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-relaxed break-words">{reply.text}</p>
                    </div>
                 </div>
               ))}

               {replyingTo === comment.id && (
                 <div className="flex flex-col items-end gap-2 mt-2 animate-fade-in-up">
                   <textarea
                     value={commentText} 
                     onChange={(e) => setCommentText(e.target.value.slice(0, MAX_CHARS))} 
                     placeholder="Write a reply..."
                     className="w-full bg-zinc-900 border border-[#fe9a00]/30 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-16"
                   />
                   <div className="flex items-center gap-2">
                     <button onClick={() => { setReplyingTo(null); setCommentText(''); }} className="text-zinc-500 hover:text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5">Cancel</button>
                     <button 
                       onClick={() => handleCommentSubmit(comment.id)} 
                       disabled={isSubmitting || !commentText.trim()}
                       className="bg-[#fe9a00] text-black px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                     >
                       {isSubmitting ? '...' : 'Reply'}
                     </button>
                   </div>
                 </div>
               )}
            </div>

          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No comments yet. Be the first to start a thread!</p>
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