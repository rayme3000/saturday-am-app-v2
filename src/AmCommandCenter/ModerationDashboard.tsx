import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Trash2,
  UserX,
  UserCheck,
  RefreshCw,
  Clock,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabase';

export const ModerationDashboard: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<'pending_review' | 'approved' | 'rejected'>(
    'pending_review'
  );
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchModerationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('comments')
        .select('*')
        .eq('status', filterStatus)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)));
      const profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url, is_muted, muted_until')
          .in('id', userIds);

        (profs || []).forEach((p: any) => profileMap.set(String(p.id), p));
      }

      setQueue(
        (rows || []).map((r: any) => ({
          ...r,
          author: profileMap.get(String(r.user_id)) || {
            id: r.user_id,
            username: 'Unknown User'
          }
        }))
      );
    } catch (err) {
      console.error('Error loading moderation queue:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchModerationQueue();
  }, [fetchModerationQueue]);

  // 1-Click Approve Comment
  const handleApprove = async (commentId: string) => {
    setProcessingId(commentId);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', commentId);
      if (error) throw error;
      setQueue(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 1-Click Reject (Soft Hide) or Permanently Delete
  const handleRejectOrDelete = async (commentId: string, hardDelete = false) => {
    setProcessingId(commentId);
    try {
      if (hardDelete) {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comments')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', commentId);
        if (error) throw error;
      }
      setQueue(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      alert('Failed to remove comment: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 1-Click Ban/Mute User from Commenting (+ Reject Pending Comment)
  const handleToggleMuteUser = async (comment: any) => {
    const targetUserId = comment.user_id;
    const currentlyMuted = Boolean(comment.author?.is_muted);
    const username = comment.author?.username || 'this user';

    if (
      !currentlyMuted &&
      !window.confirm(
        `Mute "${username}" from posting comments across all series AND reject this comment?`
      )
    ) {
      return;
    }

    setProcessingId(comment.id);
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          is_muted: !currentlyMuted,
          muted_until: !currentlyMuted
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : null
        })
        .eq('id', targetUserId);

      if (profErr) throw profErr;

      if (!currentlyMuted && comment.status !== 'rejected') {
        await supabase
          .from('comments')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', comment.id);
        setQueue(prev => prev.filter(c => c.id !== comment.id));
      } else {
        await fetchModerationQueue();
      }
    } catch (err: any) {
      alert('Failed to update user mute status: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Community Comment Moderation Queue
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Review held edge-case comments, approve constructive posts, or mute repeat offenders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { id: 'pending_review', label: 'Held for Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                  : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchModerationQueue}
            className="p-2 rounded-xl bg-black border border-zinc-800 text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-14 text-center text-xs font-black uppercase tracking-widest text-zinc-500">
          Loading moderation queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-black border border-zinc-800 rounded-2xl py-14 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-white">
            All Clear! No comments in "{filterStatus.replace('_', ' ')}".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => {
            const isBusy = processingId === item.id;
            const reasons: string[] = Array.isArray(item.flagged_reasons)
              ? item.flagged_reasons
              : [];

            return (
              <div
                key={item.id}
                className="bg-black border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-white">
                      {item.author?.username || 'Reader'}
                    </span>
                    {item.author?.email && (
                      <span className="text-[10px] font-bold text-zinc-500">
                        ({item.author.email})
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[#fe9a00] text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" /> Series: {item.series_slug}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.author?.is_muted && (
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[8px] font-black uppercase tracking-widest">
                        USER MUTED
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-200 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 leading-relaxed break-words">
                    {item.content}
                  </p>

                  {reasons.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1-Click Moderator Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleApprove(item.id)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}

                  {item.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRejectOrDelete(item.id, false)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-amber-500 text-zinc-200 hover:text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleMuteUser(item)}
                    className={`px-3.5 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 border cursor-pointer disabled:opacity-40 ${
                      item.author?.is_muted
                        ? 'bg-zinc-900 border-zinc-700 text-emerald-400 hover:bg-emerald-950'
                        : 'bg-red-950/50 border-red-800/60 text-red-400 hover:bg-red-600 hover:text-white'
                    }`}
                  >
                    {item.author?.is_muted ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Unmute User
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" /> Mute User
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRejectOrDelete(item.id, true)}
                    className="p-2 rounded-lg bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer disabled:opacity-40"
                    title="Permanently Delete Comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};