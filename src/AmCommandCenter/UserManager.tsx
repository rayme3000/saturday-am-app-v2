import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { Search, Users, ChevronLeft, ChevronRight, Crown, Loader2, Calendar, Clock, Mail, Flame, BookOpen, MessageSquare, Trash2, RefreshCw, MapPin, Phone, Globe, Cake, Download, ArrowUpDown } from 'lucide-react';

type UserSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'email_asc'
  | 'email_desc'
  | 'points_desc';

export const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<UserSortOption>('date_desc');
  const [tierFilter, setTierFilter] = useState<'all' | 'pro' | 'standard'>('all');
  const [page, setPage] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const pageSize = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch full directory via RPC so we can sort globally across all pages by Date, Name, or Email
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_user_directory', {
        p_search: '',
        p_limit: 5000,
        p_offset: 0
      });

      // Also fetch latest Shopify promo_codes so if a user was upgraded via Shopify, we know their latest purchase date
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('buyer_email, created_at, order_number')
        .not('buyer_email', 'is', null)
        .order('created_at', { ascending: false });

      const latestPurchaseByEmail = new Map<string, { purchased_at: string; order_number: string }>();
      (promoData || []).forEach((row: any) => {
        const em = String(row.buyer_email || '').trim().toLowerCase();
        if (em && !latestPurchaseByEmail.has(em)) {
          latestPurchaseByEmail.set(em, {
            purchased_at: row.created_at,
            order_number: row.order_number || ''
          });
        }
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .limit(5000);

        const profileMap = new Map<string, any>();
        (profilesData || []).forEach((p: any) => profileMap.set(p.id, p));

        const merged = rpcData.map((u: any) => {
          const p = profileMap.get(u.id) || {};
          const isPro = p.is_premium ?? u.is_premium ?? false;
          const cleanEmail = String(u.email || p.email || '').trim();
          const shopifyPurchase = latestPurchaseByEmail.get(cleanEmail.toLowerCase());
          const effectiveDate =
            shopifyPurchase?.purchased_at ||
            p.updated_at ||
            u.created_at ||
            p.created_at ||
            p.tos_accepted_at ||
            null;

          return {
            ...u,
            username: p.username || u.username || 'Unnamed Reader',
            first_name: p.first_name ?? u.first_name ?? '',
            last_name: p.last_name ?? u.last_name ?? '',
            email: cleanEmail || 'No email on file',
            street_address: p.street_address || '',
            country: p.country || p.county || '',
            date_of_birth: p.date_of_birth || '',
            phone_number: p.phone_number || '',
            is_premium: isPro,
            created_at: u.created_at || p.created_at || p.tos_accepted_at || null,
            last_sign_in_at: u.last_sign_in_at || p.updated_at || p.last_hype_reset || null,
            purchased_at: shopifyPurchase?.purchased_at || null,
            order_number: shopifyPurchase?.order_number || '',
            sort_timestamp: effectiveDate ? new Date(effectiveDate).getTime() : 0,
            fandom_score: Number(p.fandom_score ?? u.fandom_score ?? 0),
            total_hypes: Number(p.total_hypes ?? u.total_hypes ?? 0),
            chapters_read: Number(p.chapters_read ?? u.chapters_read ?? 0),
            quick_reacts: Number(p.quick_reacts ?? u.quick_reacts ?? 0),
            hypes_left: Number(p.super_hypes_left ?? p.hypes_remaining ?? (isPro ? 3 : 1))
          };
        });

        setUsers(merged);
      } else {
        // Fallback: Query public.profiles directly
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('profiles')
          .select('*')
          .limit(5000);

        if (fallbackErr) throw fallbackErr;

        const formatted = (fallbackData || []).map((p: any) => {
          const isPro = Boolean(p.is_premium);
          const cleanEmail = String(p.email || '').trim();
          const shopifyPurchase = latestPurchaseByEmail.get(cleanEmail.toLowerCase());
          const effectiveDate =
            shopifyPurchase?.purchased_at ||
            p.updated_at ||
            p.created_at ||
            p.tos_accepted_at ||
            null;

          return {
            id: p.id,
            username: p.username || 'Unnamed Reader',
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            email: cleanEmail || '—',
            street_address: p.street_address || '',
            country: p.country || p.county || '',
            date_of_birth: p.date_of_birth || '',
            phone_number: p.phone_number || '',
            is_premium: isPro,
            created_at: p.created_at || p.tos_accepted_at || null,
            last_sign_in_at: p.updated_at || p.last_hype_reset || null,
            purchased_at: shopifyPurchase?.purchased_at || null,
            order_number: shopifyPurchase?.order_number || '',
            sort_timestamp: effectiveDate ? new Date(effectiveDate).getTime() : 0,
            fandom_score: Number(p.fandom_score || 0),
            total_hypes: Number(p.total_hypes || 0),
            chapters_read: Number(p.chapters_read || 0),
            quick_reacts: Number(p.quick_reacts || 0),
            hypes_left: Number(p.super_hypes_left ?? p.hypes_remaining ?? (isPro ? 3 : 1))
          };
        });

        setUsers(formatted);
      }
    } catch (err: any) {
      console.error("Failed to load user directory:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter and sort globally across all users
  const filteredAndSortedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = users.filter((u) => {
      if (tierFilter === 'pro' && !u.is_premium) return false;
      if (tierFilter === 'standard' && u.is_premium) return false;

      if (!q) return true;
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      return (
        String(u.username || '').toLowerCase().includes(q) ||
        fullName.includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.street_address || '').toLowerCase().includes(q) ||
        String(u.phone_number || '').toLowerCase().includes(q) ||
        String(u.country || '').toLowerCase().includes(q) ||
        String(u.order_number || '').toLowerCase().includes(q)
      );
    });

    const getSortName = (u: any) => {
      const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      const uname = u.username && u.username !== 'Unnamed Reader' ? u.username : '';
      return (full || uname || u.email || 'zzzz').toLowerCase();
    };

    const getSortEmail = (u: any) => {
      const em = String(u.email || '').trim().toLowerCase();
      return em && em !== 'no email on file' && em !== '—' ? em : 'zzzz';
    };

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': {
          const diff = (b.sort_timestamp || 0) - (a.sort_timestamp || 0);
          if (diff !== 0) return diff;
          return getSortName(a).localeCompare(getSortName(b));
        }
        case 'date_asc': {
          const diff = (a.sort_timestamp || 0) - (b.sort_timestamp || 0);
          if (diff !== 0) return diff;
          return getSortName(a).localeCompare(getSortName(b));
        }
        case 'name_asc':
          return getSortName(a).localeCompare(getSortName(b));
        case 'name_desc':
          return getSortName(b).localeCompare(getSortName(a));
        case 'email_asc':
          return getSortEmail(a).localeCompare(getSortEmail(b));
        case 'email_desc':
          return getSortEmail(b).localeCompare(getSortEmail(a));
        case 'points_desc':
          return (b.fandom_score || 0) - (a.fandom_score || 0);
        default:
          return 0;
      }
    });
  }, [users, search, sortBy, tierFilter]);

  const totalCount = filteredAndSortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = page * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, page]);

  const handleExportCSV = () => {
    const headers = [
      "Username",
      "Email",
      "Tier",
      "First Name",
      "Last Name",
      "Street Address",
      "Country",
      "Date of Birth",
      "Phone Number",
      "Signed Up Date",
      "Shopify Order",
      "Fandom Points"
    ];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredAndSortedUsers.map(u => [
      escapeCsv(u.username),
      escapeCsv(u.email),
      escapeCsv(u.is_premium ? 'Pro' : 'Standard'),
      escapeCsv(u.first_name),
      escapeCsv(u.last_name),
      escapeCsv(u.street_address),
      escapeCsv(u.country),
      escapeCsv(u.date_of_birth),
      escapeCsv(u.phone_number),
      escapeCsv(u.created_at ? new Date(u.created_at).toLocaleDateString() : ''),
      escapeCsv(u.order_number || ''),
      escapeCsv(u.fandom_score || 0)
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SaturdayAM_Users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    } catch (err: any) {
      alert("Failed to delete user profile: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

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
      <div className="flex flex-col gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#fe9a00]" />
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">User Directory</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                Showing {totalCount} of {users.length} Total Accounts • Pro: {users.filter(u => u.is_premium).length}
              </p>
            </div>
          </div>

          {/* Tier Quick-Filter Pills */}
          <div className="flex bg-black p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setTierFilter('all'); setPage(0); }}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${tierFilter === 'all' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => { setTierFilter('pro'); setPage(0); }}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${tierFilter === 'pro' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Pro Only ({users.filter(u => u.is_premium).length})
            </button>
            <button
              type="button"
              onClick={() => { setTierFilter('standard'); setPage(0); }}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${tierFilter === 'standard' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Standard ({users.filter(u => !u.is_premium).length})
            </button>
          </div>
        </div>

        {/* Search, Sort Dropdown, CSV & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, username, address, phone, order #..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-black border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as UserSortOption); setPage(0); }}
                className="w-full sm:w-auto bg-black border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                title="Sort Users"
              >
                <option value="date_desc">Sort: Newest Purchase / Signup First</option>
                <option value="date_asc">Sort: Oldest Purchase / Signup First</option>
                <option value="name_asc">Sort: Name (A → Z)</option>
                <option value="name_desc">Sort: Name (Z → A)</option>
                <option value="email_asc">Sort: Email (A → Z)</option>
                <option value="email_desc">Sort: Email (Z → A)</option>
                <option value="points_desc">Sort: Fandom Points (High → Low)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-black border border-zinc-700 rounded-lg text-zinc-300 hover:text-black hover:bg-[#fe9a00] hover:border-[#fe9a00] transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
              title="Export Users to CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              className="p-2 bg-black border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer shrink-0"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[960px]">
          <thead>
            <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <th className="py-3 px-3">User & Full Name</th>
              <th className="py-3 px-3">Contact, Address & DOB</th>
              <th className="py-3 px-3">Tier (Click to Toggle)</th>
              <th className="py-3 px-3">Purchase / Signup Date</th>
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
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold italic">
                  No accounts found matching your query.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => {
                const isBusy = updatingId === u.id;
                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();

                return (
                  <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {u.username || 'Unnamed Reader'}
                          </span>
                          {u.order_number && (
                            <span className="bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                              {u.order_number}
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-300 text-[11px] font-bold">
                          {fullName || <span className="text-zinc-600 italic">No Name Set</span>}
                        </span>
                        <span className="text-zinc-400 text-[10px] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0 text-[#fe9a00]" /> {u.email}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-col gap-1 text-[10px] text-zinc-300 max-w-[240px]">
                        {u.street_address ? (
                          <span className="flex items-start gap-1 text-zinc-200 font-medium leading-snug">
                            <MapPin className="w-3 h-3 text-[#fe9a00] shrink-0 mt-0.5" />
                            <span>{u.street_address}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic text-[10px]">No street address</span>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400">
                          {u.country && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-blue-400 shrink-0" /> {u.country}
                            </span>
                          )}
                          {u.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" /> {u.phone_number}
                            </span>
                          )}
                          {u.date_of_birth && (
                            <span className="flex items-center gap-1">
                              <Cake className="w-3 h-3 text-purple-400 shrink-0" /> DOB: {u.date_of_birth}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top">
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

                    <td className="py-3 px-3 text-zinc-400 font-mono text-[10px] align-top">
                      <div className="flex flex-col gap-1">
                        {u.purchased_at && (
                          <div className="flex items-center gap-1 text-[#fe9a00] font-bold" title="Latest Shopify Purchase">
                            <Crown className="w-3 h-3 shrink-0" />
                            Paid: {formatDateTime(u.purchased_at)}
                          </div>
                        )}
                        <div className="flex items-center gap-1" title="Signed Up">
                          <Calendar className="w-3 h-3 text-zinc-600 shrink-0" />
                          Joined: {formatDateTime(u.created_at)}
                        </div>
                        <div className="flex items-center gap-1 text-zinc-500" title="Last Active">
                          <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                          Active: {formatDateTime(u.last_sign_in_at)}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top">
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

                    <td className="py-3 px-3 text-right font-black text-base text-[#fe9a00] align-top">
                      {(u.fandom_score || 0).toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-right align-top">
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