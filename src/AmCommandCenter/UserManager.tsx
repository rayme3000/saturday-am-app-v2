import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Search, Users, ChevronLeft, ChevronRight, Crown, Loader2, Calendar, Clock, Mail, Flame, BookOpen, MessageSquare, Trash2, RefreshCw } from 'lucide-react';

export const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const pageSize = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const cleanSearch = search.trim();

      // 1. Try the admin RPC first (which joins auth.users for email & last_sign_in_at)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_user_directory', {
        p_search: cleanSearch,
        p_limit: pageSize,
        p_offset: page * pageSize
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        const userIds = rpcData.map((u: any) => u.id);

        // Enrich with live profile stats so fandom_score, chapters_read, quick_reacts, and wallet are 100% accurate
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, email, is_premium, fandom_score, total_hypes, super_hypes, super_hypes_left, hypes_remaining, chapters_read, quick_reacts')
          .in('id', userIds);

        const profileMap = new Map<string, any>();
        (profilesData || []).forEach((p: any) => profileMap.set(p.id, p));

        const merged = rpcData.map((u: any) => {
          const p = profileMap.get(u.id) || {};
          const isPro = p.is_premium ?? u.is_premium ?? false;
          return {
            ...u,
            username: p.username || u.username || 'Unnamed Reader',
            first_name: p.first_name ?? u.first_name,
            last_name: p.last_name ?? u.last_name,
            email: u.email || p.email || 'No email on file',
            is_premium: isPro,
            fandom_score: Number(p.fandom_score ?? u.fandom_score ?? 0),
            total_hypes: Number(p.total_hypes ?? u.total_hypes ?? 0),
            chapters_read: Number(p.chapters_read ?? u.chapters_read ?? 0),
            quick_reacts: Number(p.quick_reacts ?? u.quick_reacts ?? 0),
            hypes_left: Number(p.super_hypes_left ?? p.hypes_remaining ?? (isPro ? 3 : 1))
          };
        });

        setUsers(merged);
        setTotalCount(Number(rpcData[0].total_count || merged.length));
      } else {
        // 2. Fallback: Query public.profiles directly if RPC is unavailable or returns empty
        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('fandom_score', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (cleanSearch) {
          query = query.or(`username.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,first_name.ilike.%${cleanSearch}%,last_name.ilike.%${cleanSearch}%`);
        }

        const { data: fallbackData, count, error: fallbackErr } = await query;
        if (fallbackErr) throw fallbackErr;

        const formatted = (fallbackData || []).map((p: any) => {
          const isPro = Boolean(p.is_premium);
          return {
            id: p.id,
            username: p.username || 'Unnamed Reader',
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            email: p.email || '—',
            is_premium: isPro,
            created_at: p.created_at || p.tos_accepted_at || null,
            last_sign_in_at: p.updated_at || p.last_hype_reset || null,
            fandom_score: Number(p.fandom_score || 0),
            total_hypes: Number(p.total_hypes || 0),
            chapters_read: Number(p.chapters_read || 0),
            quick_reacts: Number(p.quick_reacts || 0),
            hypes_left: Number(p.super_hypes_left ?? p.hypes_remaining ?? (isPro ? 3 : 1))
          };
        });

        setUsers(formatted);
        setTotalCount(count || 0);
      }
    } catch (err: any) {
      console.error("Failed to load user directory:", err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleTogglePremium = async (user: any) => {
    const nextPro = !user.is_premium;
    const nextAllowance = nextPro ? 3 : 1;
    if (!window.confirm(`Switch ${user.username} (${user.email}) to ${nextPro ? 'PRO (Saturday AM+)' : 'Standard (Free)'}?`)) return;

    setUpdatingId(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: nextPro,
          super_hypes_left: nextAllowance,
          hypes_remaining: nextAllowance
        })
        .eq('id', user.id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_premium: nextPro, hypes_left: nextAllowance } : u));
    } catch (err: any) {
      alert("Failed to update user tier: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Are you sure you want to remove "${user.username}" (${user.email}) and wipe their profile & leaderboard stats?`)) return;

    setUpdatingId(user.id);
    try {
      await Promise.all([
        supabase.from('hypes').delete().eq('user_id', user.id),
        supabase.from('super_hypes').delete().eq('user_id', user.id),
        supabase.from('page_reacts').delete().eq('user_id', user.id),
        supabase.from('completed_reads').delete().eq('user_id', user.id),
        supabase.from('reading_history').delete().eq('user_id', user.id),
        supabase.from('series_comments').delete().eq('user_id', user.id),
        supabase.from('series_likes').delete().eq('user_id', user.id),
        supabase.from('chapter_likes').delete().eq('user_id', user.id),
        supabase.from('character_likes').delete().eq('user_id', user.id),
        supabase.from('creator_likes').delete().eq('user_id', user.id)
      ]);

      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== user.id));
      setTotalCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert("Failed to delete user profile: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDateTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-5xl animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">User Directory</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Total Accounts: {totalCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search email, username, name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-black border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
            />
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 bg-black border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Tier (Click to Toggle)</th>
              <th className="py-3 px-3">Signed Up</th>
              <th className="py-3 px-3">Last Active</th>
              <th className="py-3 px-3 text-center">Activity Breakdown</th>
              <th className="py-3 px-3 text-right text-[#fe9a00]">Fandom Points</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#fe9a00] mx-auto mb-2" />
                  Loading Accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold italic">
                  No accounts found matching your query.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isBusy = updatingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">
                          {u.username || 'Unnamed Reader'}
                        </span>
                        <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </span>
                        {(u.first_name || u.last_name) && (
                          <span className="text-zinc-400 text-[10px]">
                            {u.first_name} {u.last_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTogglePremium(u)}
                        title="Click to switch between Standard and Pro"
                        className="cursor-pointer disabled:opacity-50"
                      >
                        {u.is_premium ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#fe9a00] bg-[#fe9a00]/10 border border-[#fe9a00]/30 hover:bg-[#fe9a00]/20 px-2.5 py-1 rounded-full transition-colors">
                            <Crown className="w-2.5 h-2.5" /> Pro ({u.hypes_left} left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-full transition-colors">
                            Standard ({u.hypes_left} left)
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-mono text-[10px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        {formatDateTime(u.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-mono text-[10px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {formatDateTime(u.last_sign_in_at)}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1" title="Total Hypes Dropped">
                          <Flame className="w-3 h-3 text-[#fe9a00]" /> {u.total_hypes || 0}
                        </span>
                        <span className="flex items-center gap-1" title="Completed Chapter Reads">
                          <BookOpen className="w-3 h-3 text-blue-400" /> {u.chapters_read || 0}
                        </span>
                        <span className="flex items-center gap-1" title="Smart Comments / Quick Reacts">
                          <MessageSquare className="w-3 h-3 text-emerald-400" /> {u.quick_reacts || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-base text-[#fe9a00]">
                      {(u.fandom_score || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="Delete User Profile & Stats"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-2 rounded-lg bg-black border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 rounded-lg bg-black border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};