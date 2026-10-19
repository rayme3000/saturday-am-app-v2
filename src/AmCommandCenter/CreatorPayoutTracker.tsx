import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  Search,
  Download,
  RefreshCw,
  Mail,
  MessageSquare,
  User,
  Sparkles,
  ArrowUpDown,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Save
} from 'lucide-react';

type PayoutSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'creator_asc'
  | 'creator_desc'
  | 'donor_asc'
  | 'donor_desc';

export const CreatorPayoutTracker = () => {
  const [tips, setTips] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<PayoutSortOption>('date_desc');

  // Manual Entry Modal / Drawer (for testing or logging offline/convention/manual creator payouts)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newFanMessage, setNewFanMessage] = useState('');
  const [newStatus, setNewStatus] = useState('paid');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Creator Notification Email Manager
  const [showEmailDirectory, setShowEmailDirectory] = useState(false);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  const [savingCreatorEmail, setSavingCreatorEmail] = useState<string | null>(null);

  const fetchPayoutData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tipsData, error: tipsErr }, { data: creatorsData }] = await Promise.all([
        supabase
          .from('creator_tips')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('series_creators')
          .select('name, role, avatar_url, email')
          .order('name', { ascending: true })
      ]);

      if (tipsErr) {
        console.error('Error fetching creator_tips:', tipsErr.message);
      } else {
        setTips(tipsData || []);
      }

      if (creatorsData) {
        const uniqueCreators = new Map<string, any>();
        const emailMap: Record<string, string> = {};

        creatorsData.forEach((row: any) => {
          const nameKey = String(row.name || '').trim();
          if (!nameKey) return;
          if (!uniqueCreators.has(nameKey)) {
            uniqueCreators.set(nameKey, {
              name: nameKey,
              role: row.role || 'Creator',
              avatar_url: row.avatar_url || '',
              email: row.email || ''
            });
          } else if (row.email && !uniqueCreators.get(nameKey).email) {
            uniqueCreators.get(nameKey).email = row.email;
          }
          if (row.email) {
            emailMap[nameKey] = row.email;
          }
        });

        setCreators(Array.from(uniqueCreators.values()));
        setCreatorEmails(emailMap);
      }
    } catch (err: any) {
      console.error('Failed to load creator payout tracker:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayoutData();
  }, [fetchPayoutData]);

  // Build available YYYY-MM month options dynamically from transactions + current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYm);

    tips.forEach((t) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (!isNaN(d.getTime())) {
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(ym);
        }
      }
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [tips]);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  // Lifetime KPI Totals (All-Time)
  const lifetimeStats = useMemo(() => {
    const totalLifetimeDollars = tips.reduce((sum, t) => sum + Number(t.amount_dollars || 0), 0);
    const totalTransactions = tips.length;

    const byCreator = new Map<string, { name: string; total: number; count: number }>();
    tips.forEach((t) => {
      const cName = String(t.creator_name || 'Unknown Creator').trim();
      const existing = byCreator.get(cName) || { name: cName, total: 0, count: 0 };
      existing.total += Number(t.amount_dollars || 0);
      existing.count += 1;
      byCreator.set(cName, existing);
    });

    const creatorBreakdown = Array.from(byCreator.values()).sort((a, b) => b.total - a.total);
    const topCreator = creatorBreakdown[0] || null;

    return {
      totalLifetimeDollars,
      totalTransactions,
      creatorBreakdown,
      topCreator
    };
  }, [tips]);

  // Filtered & Sorted Transactions
  const filteredAndSortedTips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = tips.filter((t) => {
      if (selectedMonth !== 'all' && t.created_at) {
        const d = new Date(t.created_at);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== selectedMonth) return false;
      }

      if (selectedCreator !== 'all') {
        if (String(t.creator_name || '').toLowerCase() !== selectedCreator.toLowerCase()) {
          return false;
        }
      }

      if (!q) return true;
      return (
        String(t.creator_name || '').toLowerCase().includes(q) ||
        String(t.donor_name || '').toLowerCase().includes(q) ||
        String(t.donor_email || '').toLowerCase().includes(q) ||
        String(t.fan_message || '').toLowerCase().includes(q) ||
        String(t.stripe_session_id || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const amtA = Number(a.amount_dollars || 0);
      const amtB = Number(b.amount_dollars || 0);

      switch (sortBy) {
        case 'date_desc':
          return timeB - timeA;
        case 'date_asc':
          return timeA - timeB;
        case 'amount_desc':
          return amtB - amtA;
        case 'amount_asc':
          return amtA - amtB;
        case 'creator_asc':
          return String(a.creator_name || '').localeCompare(String(b.creator_name || ''));
        case 'creator_desc':
          return String(b.creator_name || '').localeCompare(String(a.creator_name || ''));
        case 'donor_asc':
          return String(a.donor_name || a.donor_email || '').localeCompare(String(b.donor_name || b.donor_email || ''));
        case 'donor_desc':
          return String(b.donor_name || b.donor_email || '').localeCompare(String(a.donor_name || a.donor_email || ''));
        default:
          return timeB - timeA;
      }
    });
  }, [tips, selectedMonth, selectedCreator, searchQuery, sortBy]);

  const filteredPeriodTotal = useMemo(() => {
    return filteredAndSortedTips.reduce((sum, t) => sum + Number(t.amount_dollars || 0), 0);
  }, [filteredAndSortedTips]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const handleSaveCreatorEmail = async (creatorName: string) => {
    const cleanEmail = String(creatorEmails[creatorName] || '').trim().toLowerCase();
    setSavingCreatorEmail(creatorName);
    try {
      const { error } = await supabase
        .from('series_creators')
        .update({ email: cleanEmail || null })
        .ilike('name', creatorName);

      if (error) throw error;
      alert(`Saved notification email for ${creatorName}!`);
    } catch (err: any) {
      alert('Error saving creator email: ' + err.message);
    } finally {
      setSavingCreatorEmail(null);
    }
  };

  const handleManualAddTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreatorName.trim() || !newAmount || Number(newAmount) <= 0) {
      return alert('Please select a creator and enter a valid dollar amount.');
    }

    setIsSubmittingManual(true);
    try {
      const matchedCreatorEmail = creatorEmails[newCreatorName.trim()] || null;
      const { error } = await supabase.from('creator_tips').insert([
        {
          creator_name: newCreatorName.trim(),
          creator_email: matchedCreatorEmail,
          donor_name: newDonorName.trim() || 'Saturday AM Supporter',
          donor_email: newDonorEmail.trim().toLowerCase() || null,
          amount_dollars: Number(newAmount),
          fan_message: newFanMessage.trim() || null,
          payout_status: newStatus,
          stripe_session_id: `manual_${Date.now()}`
        }
      ]);

      if (error) throw error;

      setNewCreatorName('');
      setNewDonorName('');
      setNewDonorEmail('');
      setNewAmount('');
      setNewFanMessage('');
      setShowAddForm(false);
      await fetchPayoutData();
    } catch (err: any) {
      alert('Failed to record transaction: ' + err.message);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleTogglePayoutStatus = async (tip: any) => {
    const nextStatus = tip.payout_status === 'paid' ? 'pending' : 'paid';
    const { error } = await supabase
      .from('creator_tips')
      .update({ payout_status: nextStatus })
      .eq('id', tip.id);

    if (!error) {
      setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, payout_status: nextStatus } : t)));
    }
  };

  const handleDeleteTip = async (id: string) => {
    if (!window.confirm('Remove this transaction from the payout ledger?')) return;
    const { error } = await supabase.from('creator_tips').delete().eq('id', id);
    if (!error) {
      setTips((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Creator Name',
      'Creator Email',
      'Amount (USD)',
      'Payout Status',
      'Donor Name',
      'Donor Email',
      'Fan Mail Message',
      'Transaction ID'
    ];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredAndSortedTips.map((t) =>
      [
        escapeCsv(t.created_at ? new Date(t.created_at).toLocaleString() : ''),
        escapeCsv(t.creator_name),
        escapeCsv(t.creator_email || creatorEmails[t.creator_name] || ''),
        escapeCsv(Number(t.amount_dollars || 0).toFixed(2)),
        escapeCsv(t.payout_status || 'paid'),
        escapeCsv(t.donor_name || 'Anonymous Fan'),
        escapeCsv(t.donor_email || ''),
        escapeCsv(t.fan_message || ''),
        escapeCsv(t.stripe_session_id || t.id)
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SaturdayAM_Creator_Payouts_${selectedMonth === 'all' ? 'AllTime' : selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-5xl animate-fade-in space-y-6">
      {/* Header & Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Creator Payouts & Fan Mail Ledger
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Track lifetime creator earnings, monthly payouts, donor details & fan mail
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmailDirectory((prev) => !prev)}
            className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer ${
              showEmailDirectory
                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                : 'bg-black text-zinc-300 border-zinc-700 hover:border-[#fe9a00] hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Creator Alert Emails
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-3 py-2 rounded-lg bg-black border border-zinc-700 text-zinc-300 hover:text-black hover:bg-[#fe9a00] hover:border-[#fe9a00] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Log Payout / Tip
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg bg-black border border-zinc-700 text-zinc-300 hover:text-black hover:bg-[#fe9a00] hover:border-[#fe9a00] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export filtered payouts to CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            type="button"
            onClick={fetchPayoutData}
            className="p-2 bg-black border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* LIFETIME MILESTONE & KPI BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Lifetime Total Paid to Creators */}
        <div className="bg-gradient-to-br from-black via-zinc-950 to-[#fe9a00]/15 border-2 border-[#fe9a00] rounded-2xl p-5 shadow-[0_0_30px_rgba(254,154,0,0.12)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Lifetime Paid to Creators
            </span>
            <span className="bg-[#fe9a00]/20 text-[#fe9a00] text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
              All-Time Milestone
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1">
            {formatCurrency(lifetimeStats.totalLifetimeDollars)}
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Across {lifetimeStats.totalTransactions.toLocaleString()} Total Fan Tips & Payouts
          </p>
        </div>

        {/* 2. Selected Period Total */}
        <div className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#fe9a00]" />
              {selectedMonth === 'all' ? 'Filtered View Volume' : formatMonthLabel(selectedMonth)}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#fe9a00] tracking-tight my-1">
            {formatCurrency(filteredPeriodTotal)}
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {filteredAndSortedTips.length} Transactions in Selected View
          </p>
        </div>

        {/* 3. Top Supported Creator */}
        <div className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#fe9a00]" /> Top Supported Creator
            </span>
          </div>
          {lifetimeStats.topCreator ? (
            <>
              <div className="text-xl font-black text-white uppercase tracking-wider truncate my-1">
                {lifetimeStats.topCreator.name}
              </div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                {formatCurrency(lifetimeStats.topCreator.total)} Earned ({lifetimeStats.topCreator.count} Tips)
              </p>
            </>
          ) : (
            <div className="text-sm font-bold text-zinc-600 italic my-2">No tips recorded yet</div>
          )}
        </div>
      </div>

      {/* OPTIONAL DRAWER 1: CREATOR NOTIFICATION EMAILS DIRECTORY */}
      {showEmailDirectory && (
        <div className="bg-black border border-[#fe9a00]/40 rounded-xl p-5 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
                <Users className="w-4 h-4" /> Creator Fan Mail & Tip Alert Emails
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                Assign an email address to any creator below. When a fan tips them on Stripe, Resend will automatically email the creator their tip amount and fan mail message!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {creators.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white uppercase tracking-wider truncate">
                    {c.name}
                  </div>
                  <input
                    type="email"
                    placeholder="creator@email.com"
                    value={creatorEmails[c.name] || ''}
                    onChange={(e) =>
                      setCreatorEmails((prev) => ({ ...prev, [c.name]: e.target.value }))
                    }
                    className="mt-1 w-full bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-[#fe9a00] font-bold focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveCreatorEmail(c.name)}
                  disabled={savingCreatorEmail === c.name}
                  className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                >
                  {savingCreatorEmail === c.name ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPTIONAL DRAWER 2: MANUAL PAYOUT / TIP ENTRY FORM */}
      {showAddForm && (
        <form
          onSubmit={handleManualAddTip}
          className="bg-black border border-[#fe9a00]/40 rounded-xl p-5 animate-fade-in space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Log Manual Creator Payout or Test Tip
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Creator Name *
              </label>
              <input
                type="text"
                list="creator-payout-list"
                required
                placeholder="e.g. Raymond Brown"
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
              />
              <datalist id="creator-payout-list">
                {creators.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Amount ($ USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.50"
                required
                placeholder="e.g. 10.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-[#fe9a00] focus:border-[#fe9a00] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Payout Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none cursor-pointer"
              >
                <option value="paid">Paid / Transferred</option>
                <option value="pending">Pending Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Donor / Fan Name
              </label>
              <input
                type="text"
                placeholder="e.g. MangaFan99 or Saturday AM Bonus"
                value={newDonorName}
                onChange={(e) => setNewDonorName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Donor Email
              </label>
              <input
                type="email"
                placeholder="fan@example.com"
                value={newDonorEmail}
                onChange={(e) => setNewDonorEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
              Fan Mail Comment / Payout Note
            </label>
            <input
              type="text"
              placeholder="e.g. Keep up the amazing artwork on Apple Black!"
              value={newFanMessage}
              onChange={(e) => setNewFanMessage(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingManual}
              className="px-5 py-2 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              {isSubmittingManual ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      )}

      {/* CREATOR EARNINGS LEADERBOARD PILLS */}
      {lifetimeStats.creatorBreakdown.length > 0 && (
        <div className="bg-black border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#fe9a00]" /> Lifetime Totals by Creator (Click to Filter)
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCreator('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors cursor-pointer ${
                selectedCreator === 'all'
                  ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              All Creators ({formatCurrency(lifetimeStats.totalLifetimeDollars)})
            </button>
            {lifetimeStats.creatorBreakdown.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCreator(c.name)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedCreator.toLowerCase() === c.name.toLowerCase()
                    ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-[#fe9a00]/50'
                }`}
              >
                <span>{c.name}:</span>
                <span className={selectedCreator.toLowerCase() === c.name.toLowerCase() ? 'text-black' : 'text-[#fe9a00]'}>
                  {formatCurrency(c.total)}
                </span>
                <span className="opacity-70">({c.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & SORT CONTROLS BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-black p-4 rounded-xl border border-zinc-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search donor name, email, creator, or fan mail message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
          />
        </div>

        {/* Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="all">All Months (Lifetime)</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PayoutSortOption)}
              className="bg-zinc-900 border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="date_desc">Sort: Newest Activity First</option>
              <option value="date_asc">Sort: Oldest Activity First</option>
              <option value="amount_desc">Sort: Highest Amount ($ → $)</option>
              <option value="amount_asc">Sort: Lowest Amount ($ → $)</option>
              <option value="creator_asc">Sort: Creator Name (A → Z)</option>
              <option value="creator_desc">Sort: Creator Name (Z → A)</option>
              <option value="donor_asc">Sort: Donor Name (A → Z)</option>
              <option value="donor_desc">Sort: Donor Name (Z → A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS & FAN MAIL TABLE */}
      <div className="overflow-x-auto no-scrollbar bg-black border border-zinc-800 rounded-xl">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Creator Recipient</th>
              <th className="py-3.5 px-4">Donor / Supporter Info</th>
              <th className="py-3.5 px-4">Fan Mail Message</th>
              <th className="py-3.5 px-4 text-center">Payout Status</th>
              <th className="py-3.5 px-4 text-right text-[#fe9a00]">Tip Amount</th>
              <th className="py-3.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#fe9a00] mx-auto mb-2" />
                  Loading Creator Payout Ledger...
                </td>
              </tr>
            ) : filteredAndSortedTips.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold italic">
                  No creator tips or payouts match this filter yet.
                </td>
              </tr>
            ) : (
              filteredAndSortedTips.map((t) => {
                const isPaid = (t.payout_status || 'paid') === 'paid';
                const cEmail = t.creator_email || creatorEmails[t.creator_name] || '';

                return (
                  <tr key={t.id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-3.5 px-4 align-top font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                      {t.created_at ? (
                        <div>
                          <div className="font-bold text-white">
                            {new Date(t.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(t.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="font-black text-white uppercase tracking-wider text-xs">
                        {t.creator_name}
                      </div>
                      {cEmail ? (
                        <div className="text-[10px] text-[#fe9a00] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" /> {cEmail}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600 italic mt-0.5">
                          No creator email assigned
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#fe9a00] shrink-0" />
                        <span>{t.donor_name || 'Saturday AM Fan'}</span>
                      </div>
                      {t.donor_email && (
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{t.donor_email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-xs">
                      {t.fan_message ? (
                        <div className="bg-zinc-900 border-l-2 border-[#fe9a00] px-3 py-2 rounded text-zinc-200 italic text-xs leading-relaxed">
                          <MessageSquare className="w-3 h-3 text-[#fe9a00] inline mr-1.5 -mt-0.5" />
                          "{t.fan_message}"
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic text-[11px]">No fan mail message</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePayoutStatus(t)}
                        title="Click to toggle Paid / Pending status"
                        className="cursor-pointer"
                      >
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right font-black text-base text-[#fe9a00] whitespace-nowrap">
                      {formatCurrency(Number(t.amount_dollars || 0))}
                    </td>

                    <td className="py-3.5 px-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTip(t.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete Transaction"
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
    </div>
  );
};