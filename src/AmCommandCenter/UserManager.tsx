import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Search, Users, ChevronLeft, ChevronRight, Crown, Loader2, Calendar, Clock, Mail } from 'lucide-react';

export const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_user_directory', {
        p_search: search.trim(),
        p_limit: pageSize,
        p_offset: page * pageSize
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setUsers(data);
        setTotalCount(Number(data[0].total_count));
      } else {
        setUsers([]);
        setTotalCount(0);
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

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, username, name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full bg-black border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Tier</th>
              <th className="py-3 px-3">Signed Up</th>
              <th className="py-3 px-3">Last Active</th>
              <th className="py-3 px-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#fe9a00] mx-auto mb-2" />
                  Loading Accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 font-bold italic">
                  No accounts found matching your query.
                </td>
              </tr>
            ) : (
              users.map((u) => (
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
                    {u.is_premium ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#fe9a00] bg-[#fe9a00]/10 border border-[#fe9a00]/30 px-2 py-0.5 rounded-full">
                        <Crown className="w-2.5 h-2.5" /> Pro
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        Standard
                      </span>
                    )}
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
                  <td className="py-3 px-3 text-right font-black text-[#fe9a00]">
                    {u.total_hypes}
                  </td>
                </tr>
              ))
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
              className="p-2 rounded-lg bg-black border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 rounded-lg bg-black border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};