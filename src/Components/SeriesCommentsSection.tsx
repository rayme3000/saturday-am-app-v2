import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Heart,
  CornerDownRight,
  Trash2,
  Info,
  X,
  Lock,
  Flag,
  Ban,
  PenTool,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  analyzeCommentText,
  buildHighlightedSegments,
  type SafeguardAnalysis
} from './commentSafeguard';

interface CommentRow {
  id: string;
  user_id: string;
  series_slug: string;
  chapter_id?: string | null;
  parent_id?: string | null;
  content: string;
  status: 'approved' | 'pending_review' | 'rejected';
  flagged_reasons: string[];
  likes_count: number;
  creator_liked_by?: string | null;
  creator_liked_avatar?: string | null;
  report_count?: number;
  reported_by?: string[];
  created_at: string;
  author_username?: string;
  author_avatar?: string;
  author_is_plus?: boolean;
  author_role?: string;
  author_linked_creator?: string | null;
  source_table?: 'comments' | 'series_comments';
}

interface SeriesCommentsSectionProps {
  seriesSlug: string;
  chapterId?: string | null;
  currentUser?: { id: string; tier?: string } | null;
  onRequireAuth?: () => void;
}

const REPORT_REASONS = [
  'Harassment or Bullying',
  'Creator Disrespect / Bashing',
  'Unmarked Major Spoiler',
  'Spam or Self-Promotion'
];

const resolveDisplayUsername = (
  profile?: any,
  savedUserName?: string,
  fallbackUserId?: string
): string => {
  const isGeneric = (val?: string | null) => {
    const clean = String(val || '').trim().toLowerCase();
    return (
      !clean ||
      clean === 'reader' ||
      clean === 'user' ||
      clean === 'anonymous' ||
      clean === 'manga fan'
    );
  };

  if (profile?.linked_creator_name && !isGeneric(profile.linked_creator_name)) {
    return String(profile.linked_creator_name).trim();
  }
  if (profile?.username && !isGeneric(profile.username)) {
    return String(profile.username).trim();
  }
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  if (fullName && !isGeneric(fullName)) {
    return fullName;
  }
  if (savedUserName && !isGeneric(savedUserName)) {
    return String(savedUserName).trim();
  }
  if (profile?.email && String(profile.email).includes('@')) {
    return String(profile.email).split('@')[0];
  }
  const shortId = String(fallbackUserId || profile?.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase();
  return shortId ? `Reader_${shortId}` : 'Manga Fan';
};

const SafeguardedCommentInput: React.FC<{
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  isVisitor: boolean;
  isMuted: boolean;
  isCreatorOrStaff?: boolean;
  onRequireAuth?: () => void;
  onSubmit: (content: string, analysis: SafeguardAnalysis) => Promise<void>;
  onCancel?: () => void;
}> = ({
  placeholder = 'Share your thoughts on this series...',
  submitLabel = 'Post Comment',
  autoFocus = false,
  isVisitor,
  isMuted,
  isCreatorOrStaff = false,
  onRequireAuth,
  onSubmit,
  onCancel
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuidelineBanner, setShowGuidelineBanner] = useState(true);

  const analysis = useMemo(() => analyzeCommentText(text), [text]);
  const highlightedSegments = useMemo(
    () => buildHighlightedSegments(text, analysis.matches),
    [text, analysis.matches]
  );

  const blockingMatches = useMemo(
    () => analysis.matches.filter(m => m.severity === 'block'),
    [analysis.matches]
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVisitor) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isMuted) return;

    const immediateCheck = analyzeCommentText(text);
    if (!text.trim() || immediateCheck.isBlocked || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim(), immediateCheck);
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 border ${
        isCreatorOrStaff
          ? 'bg-gradient-to-br from-[#fe9a00]/10 via-zinc-950 to-zinc-950 border-[#fe9a00]/50'
          : 'bg-zinc-950/90 border-zinc-800'
      }`}
    >
      {showGuidelineBanner && (
        <div className="flex items-start justify-between gap-3 bg-[#fe9a00]/10 border border-[#fe9a00]/30 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 text-left">
            <Sparkles className="w-4 h-4 text-[#fe9a00] shrink-0" />
            <p className="text-[11px] sm:text-xs font-bold text-zinc-200 leading-snug">
              <span className="text-[#fe9a00] font-black uppercase tracking-wider mr-1.5">
                Creator-First Community:
              </span>
              Support our creators! Please keep feedback constructive, respectful, and encouraging.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuidelineBanner(false)}
            className="text-zinc-400 hover:text-white p-0.5 transition-colors cursor-pointer shrink-0"
            title="Dismiss reminder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isMuted ? (
        <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 flex items-center gap-3 text-red-300 text-xs font-bold">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Your commenting privileges are currently restricted due to a community guideline violation.
          </span>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={text}
              autoFocus={autoFocus}
              onFocus={() => {
                if (isVisitor && onRequireAuth) onRequireAuth();
              }}
              onChange={e => setText(e.target.value)}
              placeholder={
                isVisitor
                  ? 'Sign in or create a free account to join the discussion...'
                  : isCreatorOrStaff
                  ? 'Post an official Creator / Staff comment or reply...'
                  : placeholder
              }
              maxLength={1000}
              rows={3}
              className={`w-full bg-black border rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 font-medium resize-none focus:outline-none transition-colors ${
                analysis.isBlocked
                  ? 'border-red-500 focus:border-red-400 bg-red-950/15'
                  : analysis.shouldHoldForReview
                  ? 'border-amber-500 focus:border-amber-400 bg-amber-950/10'
                  : 'border-zinc-800 focus:border-[#fe9a00]'
              }`}
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] font-bold text-zinc-600">
              {text.length}/1000
            </span>
          </div>

          {analysis.matches.length > 0 && (
            <div
              className={`rounded-xl p-3.5 border transition-all animate-fade-in space-y-2 ${
                analysis.isBlocked
                  ? 'bg-red-950/35 border-red-500/70 text-red-200'
                  : 'bg-amber-950/30 border-amber-500/60 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {analysis.isBlocked ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-left flex-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    {analysis.isBlocked
                      ? 'Blocked Phrasing — Please Revise Before Posting'
                      : 'Heads Up — Constructive Community Check'}
                  </p>
                  <p className="text-xs font-bold leading-relaxed text-zinc-200">
                    {blockingMatches[0]?.reason || analysis.matches[0]?.reason}
                  </p>
                </div>
              </div>

              <div className="bg-black/80 border border-zinc-800 rounded-lg p-2.5 text-xs leading-relaxed font-medium text-zinc-300 break-words text-left">
                {highlightedSegments.map((seg, i) =>
                  seg.match ? (
                    <mark
                      key={i}
                      title={seg.match.reason}
                      className={`px-1.5 py-0.5 rounded font-black underline decoration-wavy ${
                        seg.match.severity === 'block'
                          ? 'bg-red-500/35 text-red-300 border border-red-500/60'
                          : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {analysis.isBlocked
                ? '🚫 Remove highlighted slurs/threats to enable posting'
                : analysis.shouldHoldForReview
                ? '⚠️ Flagged words detected — will be routed to moderator review'
                : isCreatorOrStaff
                ? '⚡ Posting with Official Creator / Staff Spotlight Flair'
                : 'Be kind • Critiques are welcome, personal attacks are not'}
            </span>

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={!text.trim() || analysis.isBlocked || isSubmitting}
                className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center gap-2 transition-all ${
                  !text.trim() || analysis.isBlocked || isSubmitting
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-[#fe9a00] hover:bg-white text-black shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : submitLabel}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export const SeriesCommentsSection: React.FC<SeriesCommentsSectionProps> = ({
  seriesSlug,
  chapterId = null,
  currentUser = null,
  onRequireAuth
}) => {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [blockModalTarget, setBlockModalTarget] = useState<CommentRow | null>(null);
  const [blockConfirmInput, setBlockConfirmInput] = useState('');
  const [isExecutingBlock, setIsExecutingBlock] = useState(false);

  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('am_liked_comments_v1') || '[]');
    } catch {
      return [];
    }
  });
  const [locallyReportedIds, setLocallyReportedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('am_reported_comments_v1') || '[]');
    } catch {
      return [];
    }
  });

  const [resolvedAuthUserId, setResolvedAuthUserId] = useState<string | null>(
    currentUser?.id || null
  );

  useEffect(() => {
    setResolvedAuthUserId(currentUser?.id || null);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setResolvedAuthUserId(user?.id || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setResolvedAuthUserId(session?.user?.id || null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!blockModalTarget) return;
    window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
    };
  }, [blockModalTarget]);

  const effectiveUserId = currentUser?.id || resolvedAuthUserId;
  const isVisitor = !effectiveUserId;

  const isCurrentUserCreatorOrStaff = useMemo(() => {
    if (!userProfile) return false;
    const role = String(userProfile.role || '').toLowerCase();
    return (
      ['admin', 'staff', 'moderator', 'creator', 'core_creator'].includes(role) ||
      Boolean(String(userProfile.linked_creator_name || '').trim())
    );
  }, [userProfile]);

  const isMuted = Boolean(
    userProfile?.is_muted &&
      (!userProfile?.muted_until || new Date(userProfile.muted_until) > new Date())
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // UNIFIED FETCH: Loads from BOTH `comments` (new table) AND `series_comments` (historical table) so zero comments are ever lost!
  const fetchComments = useCallback(async () => {
    if (!seriesSlug) return;
    setLoading(true);
    try {
      let newTableQuery = supabase
        .from('comments')
        .select('*')
        .eq('series_slug', seriesSlug)
        .order('created_at', { ascending: false })
        .limit(200);

      if (chapterId) {
        newTableQuery = newTableQuery.eq('chapter_id', chapterId);
      }

      const legacyTableQuery = !chapterId
        ? supabase
            .from('series_comments')
            .select('*')
            .eq('series_slug', seriesSlug)
            .order('created_at', { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [], error: null });

      const [newTableRes, legacyTableRes] = await Promise.all([
        newTableQuery,
        legacyTableQuery
      ]);

      const rawNewRows = Array.isArray(newTableRes.data) ? newTableRes.data : [];
      const rawLegacyRows = Array.isArray(legacyTableRes.data) ? legacyTableRes.data : [];

      // Normalize legacy `series_comments` rows into `CommentRow` shape
      const normalizedLegacyRows = rawLegacyRows
        .filter((lc: any) => {
          if (!lc || !lc.id) return false;
          // Show unflagged comments OR comments authored by the current user
          if (lc.is_flagged === true) {
            return Boolean(effectiveUserId && String(lc.user_id) === String(effectiveUserId));
          }
          return true;
        })
        .map((lc: any) => ({
          id: String(lc.id),
          user_id: lc.user_id,
          series_slug: lc.series_slug,
          chapter_id: null,
          parent_id: lc.parent_id ? String(lc.parent_id) : null,
          content: String(lc.text || lc.content || ''),
          status: 'approved' as const,
          flagged_reasons: [],
          likes_count: Number(lc.likes_count || 0),
          creator_liked_by: lc.creator_liked_by || null,
          creator_liked_avatar: lc.creator_liked_avatar || null,
          created_at: lc.created_at || new Date().toISOString(),
          saved_user_name: lc.user_name || '',
          saved_avatar_url: lc.avatar_url || '',
          source_table: 'series_comments' as const
        }));

      const normalizedNewRows = rawNewRows.map((nc: any) => ({
        ...nc,
        id: String(nc.id),
        parent_id: nc.parent_id ? String(nc.parent_id) : null,
        content: String(nc.content || nc.text || ''),
        source_table: 'comments' as const
      }));

      // Deduplicate in case a comment exists in both tables
      const seenSignatures = new Set<string>();
      const combinedRaw: any[] = [];

      [...normalizedNewRows, ...normalizedLegacyRows].forEach(row => {
        const dedupeKey = `${row.user_id}_${String(row.content).trim().slice(0, 60)}`;
        if (row.source_table === 'series_comments' && seenSignatures.has(dedupeKey)) {
          return;
        }
        seenSignatures.add(dedupeKey);
        combinedRaw.push(row);
      });

      const visibleRows = combinedRaw.filter((c: any) => {
        if (locallyReportedIds.includes(String(c.id))) return false;
        if (c.status === 'rejected') return false;
        if (c.status === 'pending_review') {
          return Boolean(effectiveUserId && String(c.user_id) === String(effectiveUserId));
        }
        return true;
      });

      // Also pull legacy comment hype counts from `hypes` table for `series_comments` rows
      const legacyIds = visibleRows
        .filter(r => r.source_table === 'series_comments')
        .map(r => String(r.id));

      const legacyHypeCountMap: Record<string, number> = {};
      if (legacyIds.length > 0) {
        const { data: hypesData } = await supabase
          .from('hypes')
          .select('target_id')
          .eq('target_type', 'comment')
          .in('target_id', legacyIds);

        (hypesData || []).forEach((h: any) => {
          const tid = String(h.target_id);
          legacyHypeCountMap[tid] = (legacyHypeCountMap[tid] || 0) + 1;
        });
      }

      const userIds = Array.from(
        new Set(visibleRows.map((c: any) => c.user_id).filter(Boolean))
      );
      if (effectiveUserId && !userIds.includes(effectiveUserId)) {
        userIds.push(effectiveUserId);
      }

      const profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select(
            'id, username, first_name, last_name, email, avatar_url, is_premium, role, linked_creator_name, is_muted, muted_until'
          )
          .in('id', userIds);

        (profs || []).forEach((p: any) => {
          profileMap.set(String(p.id), p);
        });
      }

      if (effectiveUserId && profileMap.has(effectiveUserId)) {
        setUserProfile(profileMap.get(effectiveUserId));
      } else if (effectiveUserId) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select(
            'id, username, first_name, last_name, email, avatar_url, is_premium, role, linked_creator_name, is_muted, muted_until'
          )
          .eq('id', effectiveUserId)
          .maybeSingle();
        if (myProf) setUserProfile(myProf);
      }

      const enriched: CommentRow[] = visibleRows
        .map((c: any) => {
          const p = profileMap.get(String(c.user_id));
          const fallbackLikes =
            c.source_table === 'series_comments'
              ? Math.max(Number(c.likes_count || 0), legacyHypeCountMap[String(c.id)] || 0)
              : Number(c.likes_count || 0);

          return {
            ...c,
            likes_count: fallbackLikes,
            author_username: resolveDisplayUsername(p, c.saved_user_name, c.user_id),
            author_avatar: p?.avatar_url || c.saved_avatar_url || '',
            author_is_plus: Boolean(p?.is_premium),
            author_role: p?.role || 'reader',
            author_linked_creator: p?.linked_creator_name || null
          };
        })
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setComments(enriched);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [seriesSlug, chapterId, effectiveUserId, locallyReportedIds]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCreateComment = async (
    content: string,
    analysis: SafeguardAnalysis,
    parentId: string | null = null
  ) => {
    if (!effectiveUserId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const initialStatus: 'approved' | 'pending_review' =
      !isCurrentUserCreatorOrStaff &&
      (analysis.shouldHoldForReview || analysis.flaggedReasons.length > 0)
        ? 'pending_review'
        : 'approved';

    const resolvedAuthorName = resolveDisplayUsername(userProfile, undefined, effectiveUserId);

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentRow = {
      id: tempId,
      user_id: effectiveUserId,
      series_slug: seriesSlug,
      chapter_id: chapterId || null,
      parent_id: parentId,
      content,
      status: initialStatus,
      flagged_reasons: analysis.flaggedReasons,
      likes_count: 0,
      created_at: new Date().toISOString(),
      author_username: resolvedAuthorName,
      author_avatar: userProfile?.avatar_url || '',
      author_is_plus: Boolean(userProfile?.is_premium || currentUser?.tier === 'premium'),
      author_role: userProfile?.role || 'reader',
      author_linked_creator: userProfile?.linked_creator_name || null,
      source_table: 'comments'
    };

    setComments(prev => [optimisticComment, ...prev]);
    if (parentId) setReplyingToId(null);

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert([
        {
          user_id: effectiveUserId,
          series_slug: seriesSlug,
          chapter_id: chapterId || null,
          parent_id: parentId,
          content,
          status: initialStatus,
          flagged_reasons: analysis.flaggedReasons
        }
      ])
      .select('*')
      .single();

    if (error) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      alert(error.message || 'Unable to post comment.');
      return;
    }

    // Also mirror to `series_comments` so Leaderboard monthly comment points (+3 pts) count it automatically!
    if (!chapterId && initialStatus === 'approved') {
      supabase
        .from('series_comments')
        .insert([
          {
            series_slug: seriesSlug,
            user_id: effectiveUserId,
            user_name: resolvedAuthorName,
            avatar_url: userProfile?.avatar_url || '',
            text: content,
            parent_id: null,
            is_flagged: false
          }
        ])
        .then(() => {});
    }

    // Increment Fandom Score (+3)
    supabase
      .from('profiles')
      .select('fandom_score, quick_reacts')
      .eq('id', effectiveUserId)
      .maybeSingle()
      .then(({ data: profData }) => {
        if (profData) {
          supabase
            .from('profiles')
            .update({
              fandom_score: (Number(profData.fandom_score) || 0) + 3,
              quick_reacts: (Number(profData.quick_reacts) || 0) + 1
            })
            .eq('id', effectiveUserId)
            .then(() => window.dispatchEvent(new Event('profileUpdated')));
        }
      });

    if (inserted) {
      setComments(prev =>
        prev.map(c =>
          c.id === tempId
            ? { ...optimisticComment, ...inserted, id: String(inserted.id) }
            : c
        )
      );
    }
  };

  const handleDeleteComment = async (comment: CommentRow) => {
    if (!window.confirm('Delete this comment?')) return;
    const prev = comments;
    setComments(curr => curr.filter(c => c.id !== comment.id && c.parent_id !== comment.id));

    if (comment.source_table === 'series_comments') {
      const { error } = await supabase
        .from('series_comments')
        .delete()
        .eq('id', comment.id);
      if (error) {
        setComments(prev);
        alert('Failed to delete comment: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id);
      if (error) {
        setComments(prev);
        alert('Failed to delete comment: ' + error.message);
      }
    }
  };

  const executeConfirmedBlockAndDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockModalTarget) return;
    if (blockConfirmInput.trim().toUpperCase() !== 'BLOCK') return;

    const comment = blockModalTarget;
    if (effectiveUserId && String(comment.user_id) === String(effectiveUserId)) {
      alert(
        'Safety check: You cannot block your own Creator/Staff account! Use the Trash icon to delete your own test comment.'
      );
      setBlockModalTarget(null);
      setBlockConfirmInput('');
      return;
    }

    setIsExecutingBlock(true);
    const prev = comments;
    setComments(curr =>
      curr.filter(
        c =>
          c.id !== comment.id &&
          c.parent_id !== comment.id &&
          c.user_id !== comment.user_id
      )
    );

    try {
      if (comment.source_table === 'series_comments') {
        await supabase
          .from('series_comments')
          .update({ is_flagged: true })
          .eq('id', comment.id);
        await supabase
          .from('profiles')
          .update({
            is_muted: true,
            muted_until: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', comment.user_id);
      } else {
        const { error } = await supabase.rpc('staff_creator_block_and_delete_comment', {
          p_comment_id: comment.id
        });

        if (error) {
          await supabase
            .from('profiles')
            .update({
              is_muted: true,
              muted_until: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', comment.user_id);

          await supabase
            .from('comments')
            .update({
              status: 'rejected',
              flagged_reasons: [...(comment.flagged_reasons || []), 'BLOCKED BY CREATOR/STAFF']
            })
            .eq('id', comment.id);
        }
      }

      setBlockModalTarget(null);
      setBlockConfirmInput('');
      showToast(
        `@${comment.author_username}'s comment was removed and their account is now restricted from commenting app-wide until reviewed by moderation.`
      );
    } catch (err: any) {
      setComments(prev);
      alert('Failed to block user: ' + err.message);
    } finally {
      setIsExecutingBlock(false);
    }
  };

  const handleReportComment = async (comment: CommentRow, reason: string) => {
    if (isVisitor) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setReportingCommentId(null);

    const updatedLocalReports = Array.from(new Set([...locallyReportedIds, comment.id]));
    setLocallyReportedIds(updatedLocalReports);
    localStorage.setItem('am_reported_comments_v1', JSON.stringify(updatedLocalReports));

    setComments(prev => prev.filter(c => c.id !== comment.id && c.parent_id !== comment.id));

    try {
      if (comment.source_table === 'series_comments') {
        await supabase
          .from('comment_reports')
          .insert([{ comment_id: comment.id, reported_by: effectiveUserId }]);
      } else {
        await supabase.rpc('report_community_comment', {
          p_comment_id: comment.id,
          p_reason: reason
        });
      }
    } catch (err) {
      console.warn('Report note:', err);
    }

    showToast('Thanks for keeping Saturday AM constructive! Comment flagged for moderator review.');
  };

  const handleToggleLike = async (comment: CommentRow) => {
    if (isVisitor) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const alreadyLiked = likedCommentIds.includes(comment.id);
    const delta = alreadyLiked ? -1 : 1;
    const nextLikes = Math.max(0, (comment.likes_count || 0) + delta);
    const updatedLikedIds = alreadyLiked
      ? likedCommentIds.filter(id => id !== comment.id)
      : [...likedCommentIds, comment.id];

    setLikedCommentIds(updatedLikedIds);
    localStorage.setItem('am_liked_comments_v1', JSON.stringify(updatedLikedIds));

    const creatorDisplayName =
      userProfile?.linked_creator_name || userProfile?.username || 'Creator';
    const creatorAvatar = userProfile?.avatar_url || '';

    setComments(prev =>
      prev.map(c =>
        c.id === comment.id
          ? {
              ...c,
              likes_count: nextLikes,
              creator_liked_by: isCurrentUserCreatorOrStaff
                ? delta > 0
                  ? creatorDisplayName
                  : null
                : c.creator_liked_by,
              creator_liked_avatar: isCurrentUserCreatorOrStaff
                ? delta > 0
                  ? creatorAvatar
                  : null
                : c.creator_liked_avatar
            }
          : c
      )
    );

    if (comment.source_table === 'series_comments') {
      if (delta > 0) {
        await supabase
          .from('hypes')
          .insert([
            {
              target_type: 'comment',
              target_id: String(comment.id),
              user_id: effectiveUserId
            }
          ]);
      } else {
        await supabase
          .from('hypes')
          .delete()
          .match({
            target_type: 'comment',
            target_id: String(comment.id),
            user_id: effectiveUserId
          });
      }
      return;
    }

    const { error } = await supabase.rpc('toggle_comment_like', {
      p_comment_id: comment.id,
      p_delta: delta,
      p_is_creator_or_staff: isCurrentUserCreatorOrStaff,
      p_creator_name: isCurrentUserCreatorOrStaff ? creatorDisplayName : null,
      p_creator_avatar: isCurrentUserCreatorOrStaff ? creatorAvatar : null
    });

    if (error) {
      await supabase.from('comments').update({ likes_count: nextLikes }).eq('id', comment.id);
    }
  };

  const topLevelComments = useMemo(
    () => comments.filter(c => !c.parent_id),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, CommentRow[]> = {};
    comments
      .filter(c => Boolean(c.parent_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(reply => {
        const pid = String(reply.parent_id);
        if (!map[pid]) map[pid] = [];
        map[pid].push(reply);
      });
    return map;
  }, [comments]);

  const formatRelativeTime = (iso: string) => {
    const diffSec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const isAuthorCreatorOrStaff = (item: CommentRow) => {
    const r = String(item.author_role || '').toLowerCase();
    return (
      ['admin', 'staff', 'moderator', 'creator', 'core_creator'].includes(r) ||
      Boolean(item.author_linked_creator)
    );
  };

  const renderCommentCard = (item: CommentRow, isReply = false) => {
    const isOwn = Boolean(effectiveUserId && String(effectiveUserId) === String(item.user_id));
    const authorIsCreatorOrStaff = isAuthorCreatorOrStaff(item);
    const authorIsCreator =
      Boolean(item.author_linked_creator) ||
      ['creator', 'core_creator'].includes(String(item.author_role || '').toLowerCase());
    const isLiked = likedCommentIds.includes(item.id);
    const replies = repliesByParent[item.id] || [];
    const hasCreatorReply = replies.some(r => isAuthorCreatorOrStaff(r));

    return (
      <div
        key={`${item.source_table || 'c'}-${item.id}`}
        className={`relative transition-all ${
          isReply
            ? authorIsCreatorOrStaff
              ? 'ml-5 sm:ml-10 mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#fe9a00]/15 via-zinc-950 to-zinc-950 border-l-4 border border-[#fe9a00]/60 shadow-[0_0_25px_rgba(254,154,0,0.12)]'
              : 'ml-6 sm:ml-10 mt-3 pl-4 border-l-2 border-zinc-800/80'
            : authorIsCreatorOrStaff
            ? 'bg-gradient-to-br from-[#fe9a00]/15 via-zinc-950 to-black border-2 border-[#fe9a00]/75 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(254,154,0,0.16)]'
            : item.creator_liked_by
            ? 'bg-zinc-950/90 border border-[#fe9a00]/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(254,154,0,0.08)]'
            : 'bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
                authorIsCreatorOrStaff
                  ? 'bg-black border-2 border-[#fe9a00] shadow-[0_0_12px_rgba(254,154,0,0.5)]'
                  : 'bg-zinc-800 border border-[#fe9a00]/50'
              }`}
            >
              {item.author_avatar ? (
                <img
                  src={item.author_avatar}
                  alt={item.author_username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-black uppercase text-[#fe9a00]">
                  {(item.author_username || 'M')[0]}
                </span>
              )}
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs sm:text-sm font-black truncate ${
                    authorIsCreatorOrStaff ? 'text-[#fe9a00]' : 'text-white'
                  }`}
                >
                  {item.author_username}
                </span>

                {authorIsCreatorOrStaff && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-300 via-[#fe9a00] to-amber-500 text-black text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_0_12px_rgba(254,154,0,0.45)]">
                    {authorIsCreator ? (
                      <>
                        <PenTool className="w-2.5 h-2.5 stroke-[2.5]" /> Official Creator
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5]" /> Official Staff
                      </>
                    )}
                  </span>
                )}

                {item.author_is_plus && !authorIsCreatorOrStaff && (
                  <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[8px] font-black uppercase tracking-widest">
                    PLUS
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-zinc-500 block">
                {formatRelativeTime(item.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isOwn && (
              <button
                type="button"
                onClick={() =>
                  setReportingCommentId(reportingCommentId === item.id ? null : item.id)
                }
                className="text-zinc-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Report / Flag Comment"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}

            {isCurrentUserCreatorOrStaff && (
              <button
                type="button"
                onClick={() => {
                  setBlockModalTarget(item);
                  setBlockConfirmInput('');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/70 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                title="Delete Comment & Block User App-Wide"
              >
                <Ban className="w-3 h-3" />
                <span>Block</span>
              </button>
            )}

            {(isOwn || isCurrentUserCreatorOrStaff) && (
              <button
                type="button"
                onClick={() => handleDeleteComment(item)}
                className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {reportingCommentId === item.id && (
          <div className="mt-3 p-3 rounded-xl bg-black border border-amber-500/50 space-y-2 animate-fade-in text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Flag className="w-3 h-3" /> Select a Reason to Report Comment
              </span>
              <button
                type="button"
                onClick={() => setReportingCommentId(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReportComment(item, reason)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-800 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}

        <p
          className={`mt-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words text-left ${
            authorIsCreatorOrStaff ? 'text-white font-semibold' : 'text-zinc-200'
          }`}
        >
          {item.content}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleToggleLike(item)}
              className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{item.likes_count || 0}</span>
            </button>

            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  if (isVisitor && onRequireAuth) {
                    onRequireAuth();
                    return;
                  }
                  setReplyingToId(replyingToId === item.id ? null : item.id);
                }}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#fe9a00] transition-colors cursor-pointer"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {item.creator_liked_by && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#fe9a00]/20 via-amber-500/15 to-[#fe9a00]/20 border border-[#fe9a00]/60 shadow-[0_0_12px_rgba(254,154,0,0.25)]">
                <div className="relative flex items-center">
                  {item.creator_liked_avatar ? (
                    <img
                      src={item.creator_liked_avatar}
                      alt={item.creator_liked_by}
                      className="w-4 h-4 rounded-full object-cover border border-[#fe9a00]"
                    />
                  ) : (
                    <Sparkles className="w-3 h-3 text-[#fe9a00]" />
                  )}
                  <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500 -ml-1.5 mt-2 drop-shadow" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#fe9a00]">
                  Liked by {item.creator_liked_by}
                </span>
              </div>
            )}

            {!isReply && hasCreatorReply && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-[#fe9a00]/50 text-[#fe9a00] text-[8px] font-black uppercase tracking-widest">
                <PenTool className="w-2.5 h-2.5" /> Creator Replied
              </div>
            )}
          </div>
        </div>

        {!isReply && replyingToId === item.id && (
          <div className="mt-4">
            <SafeguardedCommentInput
              placeholder={`Reply constructively to @${item.author_username}...`}
              submitLabel="Post Reply"
              autoFocus
              isVisitor={isVisitor}
              isMuted={isMuted}
              isCreatorOrStaff={isCurrentUserCreatorOrStaff}
              onRequireAuth={onRequireAuth}
              onCancel={() => setReplyingToId(null)}
              onSubmit={(replyContent, replyAnalysis) =>
                handleCreateComment(replyContent, replyAnalysis, item.id)
              }
            />
          </div>
        )}

        {replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {replies.map(r => renderCommentCard(r, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 space-y-6">
      {blockModalTarget && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (!isExecutingBlock) {
              setBlockModalTarget(null);
              setBlockConfirmInput('');
            }
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950 border-2 border-red-600 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.3)] relative text-center space-y-5"
          >
            <button
              type="button"
              onClick={() => {
                setBlockModalTarget(null);
                setBlockConfirmInput('');
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-red-950/60 border-2 border-red-500 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(220,38,38,0.4)]">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-300 text-[9px] font-black uppercase tracking-widest">
                Creator &amp; Staff Safeguard Action
              </span>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white">
                Block @{blockModalTarget.author_username}?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 font-bold leading-relaxed">
                Blocking this user will delete their comment and restrict{' '}
                <span className="text-red-400 font-black">all of their comments app-wide</span>{' '}
                until reviewed by moderation. Are you sure?
              </p>
            </div>

            <div className="bg-black border border-zinc-800 rounded-xl p-3 text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                Comment by @{blockModalTarget.author_username}:
              </span>
              <p className="text-xs text-zinc-300 italic line-clamp-3 break-words">
                &ldquo;{blockModalTarget.content}&rdquo;
              </p>
            </div>

            <form onSubmit={executeConfirmedBlockAndDelete} className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Type <span className="text-red-400 font-mono">BLOCK</span> below to confirm:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type BLOCK"
                  value={blockConfirmInput}
                  onChange={e => setBlockConfirmInput(e.target.value.toUpperCase())}
                  className="w-full bg-black border-2 border-red-900/60 focus:border-red-500 rounded-xl px-4 py-3 text-center font-mono font-black tracking-[0.25em] text-sm text-red-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isExecutingBlock}
                  onClick={() => {
                    setBlockModalTarget(null);
                    setBlockConfirmInput('');
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    blockConfirmInput.trim().toUpperCase() !== 'BLOCK' || isExecutingBlock
                  }
                  className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_25px_rgba(220,38,38,0.4)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isExecutingBlock ? 'Blocking...' : 'Confirm Block'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-[#fe9a00]" />
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-wider text-white">
            Community Discussion{' '}
            <span className="text-[#fe9a00] ml-1">({comments.length})</span>
          </h3>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-200 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SafeguardedCommentInput
        isVisitor={isVisitor}
        isMuted={isMuted}
        isCreatorOrStaff={isCurrentUserCreatorOrStaff}
        onRequireAuth={onRequireAuth}
        onSubmit={(content, analysis) => handleCreateComment(content, analysis, null)}
      />

      {loading ? (
        <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-zinc-500">
          Loading community comments...
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl py-12 px-4 text-center space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
            No comments yet — be the first to hype up the creator!
          </p>
          <p className="text-[11px] font-bold text-zinc-600">
            Share your favorite panel, character moment, or theory below.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map(c => renderCommentCard(c, false))}
        </div>
      )}
    </section>
  );
};