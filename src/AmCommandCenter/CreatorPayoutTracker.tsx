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
  Save,
  Code2,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Percent
} from 'lucide-react';
import { buildCreatorReferralCode, getCreatorReferralCodeVariants } from '../MainViews/CreatorStudio';
import { MAX_CREATOR_POOL_PERCENT } from '../referralAttribution';

type PayoutSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'creator_asc'
  | 'creator_desc'
  | 'donor_asc'
  | 'donor_desc';

export const DEV_RECIPIENT_EMAIL = 'rayme3000@gmail.com';
export const DEV_CUT_DECIMAL = 0.075; // Locked 7.5% across all non-tip revenues

export const CreatorPayoutTracker = () => {
  const [ledgerTab, setLedgerTab] = useState<'tips' | 'store'>('tips');
  const [tips, setTips] = useState<any[]>([]);
  const [storeLedger, setStoreLedger] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [referredProfiles, setReferredProfiles] = useState<any[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<any[]>([]);
  const [activeProCount, setActiveProCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [stripeAuditData, setStripeAuditData] = useState<any | null>(null);
  const [isAuditingStripe, setIsAuditingStripe] = useState(false);
  const [isExecutingCatchup, setIsExecutingCatchup] = useState(false);

  const [pricingMode, setPricingMode] = useState<'promo' | 'normal'>('promo');
  const activeMonthlyPrice = pricingMode === 'promo' ? 1.99 : 2.99;
  const activeAnnualPrice = pricingMode === 'promo' ? 20.0 : 35.0;

  const devCutPerMonthlySub = Number((activeMonthlyPrice * DEV_CUT_DECIMAL).toFixed(2));
  const devCutPerAnnualSub = Number((activeAnnualPrice * DEV_CUT_DECIMAL).toFixed(2));
  const annualStripeFee = Number((activeAnnualPrice * 0.029 + 0.3).toFixed(2));
  const maxReferralPoolDollars = Number(
    ((activeAnnualPrice * MAX_CREATOR_POOL_PERCENT) / 100).toFixed(2)
  );

  // Configurable Referral Bounty Pool (Default: Flat $5 Creator / $2 Influencer • Max 42.5% Pool • Creator Pays Stripe Fee)
  const [refConfig, setRefConfig] = useState({
    mode: 'flat' as 'flat' | 'percent',
    creator_flat_dollars: 5.0,
    influencer_flat_dollars: 2.0,
    creator_percent: 25.0,
    influencer_percent: 10.0,
    partner_overrides: {} as Record<string, any>
  });
  const [savingRefConfig, setSavingRefConfig] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<PayoutSortOption>('date_desc');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newFanMessage, setNewFanMessage] = useState('');
  const [newStatus, setNewStatus] = useState('paid');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const [showEmailDirectory, setShowEmailDirectory] = useState(false);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  const [savingCreatorEmail, setSavingCreatorEmail] = useState<string | null>(null);

  const handleSaveReferralPoolConfig = async () => {
    setSavingRefConfig(true);
    try {
      const clampedCreatorFlat = Math.min(8.5, Math.max(0, Number(refConfig.creator_flat_dollars || 0)));
      const clampedInfFlat = Math.min(8.5, Math.max(0, Number(refConfig.influencer_flat_dollars || 0)));
      const clampedCreatorPct = Math.min(
        MAX_CREATOR_POOL_PERCENT,
        Math.max(0, Number(refConfig.creator_percent || 0))
      );
      const clampedInfPct = Math.min(
        MAX_CREATOR_POOL_PERCENT,
        Math.max(0, Number(refConfig.influencer_percent || 0))
      );

      const cleanCfg = {
        ...refConfig,
        creator_flat_dollars: clampedCreatorFlat,
        influencer_flat_dollars: clampedInfFlat,
        creator_percent: clampedCreatorPct,
        influencer_percent: clampedInfPct
      };
      setRefConfig(cleanCfg);

      const { error } = await supabase
        .from('app_settings')
        .update({ referral_bounty_config: cleanCfg })
        .eq('id', 1);

      if (error) throw error;
      alert('Saved Referral Bounty Pool rules! Live Stripe checkouts & webhooks are now synced.');
    } catch (err: any) {
      alert('Error saving referral pool config (ensure Step 1 SQL migration ran): ' + err.message);
    } finally {
      setSavingRefConfig(false);
    }
  };

  const handleRunStripeDevAudit = async () => {
    setIsAuditingStripe(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const fallbackUserId = authData?.user?.id || 'admin_audit';

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { type: 'audit_dev_splits', userId: fallbackUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeAuditData(data);
    } catch (err: any) {
      alert(
        'Failed to audit Stripe dev splits: ' +
          (err.message || 'Make sure create-checkout-session is deployed.')
      );
    } finally {
      setIsAuditingStripe(false);
    }
  };

  const handleExecuteStripeCatchup = async () => {
    if (!stripeAuditData) return;
    const owedStr = stripeAuditData.owedCatchupDollars || '0.00';
    const unpatched = Number(stripeAuditData.unpatchedSubsCount || 0);

    if (
      !window.confirm(
        `Execute Stripe Catch-Up Transfer ($${owedStr} to acct_1US3pv2d62PnIfST) and patch ${unpatched} active subscription(s) to auto-split 7.5% on future renewals?`
      )
    ) {
      return;
    }

    setIsExecutingCatchup(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const fallbackUserId = authData?.user?.id || 'admin_audit';

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { type: 'execute_dev_catchup', userId: fallbackUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeAuditData(data);

      if (data?.transferErrorMsg) {
        alert(
          `Patched ${data.patchedSubsCount || 0} subscription(s). Transfer note: ${data.transferErrorMsg}`
        );
      } else {
        alert(
          `SUCCESS! Transferred $${
            data?.executedTransfer ? (data.executedTransfer.amount / 100).toFixed(2) : '0.00'
          } to your Stripe Connect account and patched ${data?.patchedSubsCount || 0} active subscription(s)!`
        );
      }
    } catch (err: any) {
      alert('Error executing catch-up: ' + err.message);
    } finally {
      setIsExecutingCatchup(false);
    }
  };

  const fetchPayoutData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: tipsData, error: tipsErr },
        storeLedgerRes,
        { data: creatorsData },
        { data: profilesData },
        { data: appSettingsData }
      ] = await Promise.all([
        supabase
          .from('creator_tips')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('store_payout_ledger')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('series_creators')
          .select('name, role, avatar_url, email')
          .order('name', { ascending: true }),
        supabase
          .from('profiles')
          .select(
            'id, username, email, role, linked_creator_name, referral_code, referred_by_code, referred_plan, referral_commission_paid_at, is_premium, created_at'
          ),
        supabase
          .from('app_settings')
          .select('referral_bounty_config')
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (appSettingsData?.referral_bounty_config) {
        setRefConfig(prev => ({ ...prev, ...appSettingsData.referral_bounty_config }));
      }

      if (tipsErr) {
        console.error('Error fetching creator_tips:', tipsErr.message);
      } else {
        setTips(tipsData || []);
      }

      if (storeLedgerRes?.data) {
        setStoreLedger(storeLedgerRes.data);
      }

      if (profilesData) {
        const proUsers = profilesData.filter((p: any) => p.is_premium);
        setActiveProCount(proUsers.length);
        setReferredProfiles(proUsers.filter((p: any) => p.referred_by_code));
        setPartnerProfiles(
          profilesData.filter(
            (p: any) =>
              ['creator', 'staff', 'influencer', 'core_creator'].includes(
                String(p.role || '').toLowerCase()
              ) || Boolean(p.linked_creator_name)
          )
        );
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

  // Computed Gross & Net-After-Stripe-Fee Referral Bounties
  const activeCreatorGrossRef = useMemo(() => {
    const raw =
      refConfig.mode === 'percent'
        ? (activeAnnualPrice * Number(refConfig.creator_percent || 25)) / 100
        : Number(refConfig.creator_flat_dollars ?? 5.0);
    return Number(Math.min(maxReferralPoolDollars, Math.max(0, raw)).toFixed(2));
  }, [refConfig, activeAnnualPrice, maxReferralPoolDollars]);

  const activeCreatorNetRef = useMemo(
    () => Number(Math.max(0, activeCreatorGrossRef - annualStripeFee).toFixed(2)),
    [activeCreatorGrossRef, annualStripeFee]
  );

  const activeInfluencerGrossRef = useMemo(() => {
    const raw =
      refConfig.mode === 'percent'
        ? (activeAnnualPrice * Number(refConfig.influencer_percent || 10)) / 100
        : Number(refConfig.influencer_flat_dollars ?? 2.0);
    return Number(Math.min(maxReferralPoolDollars, Math.max(0, raw)).toFixed(2));
  }, [refConfig, activeAnnualPrice, maxReferralPoolDollars]);

  const activeInfluencerNetRef = useMemo(
    () => Number(Math.max(0, activeInfluencerGrossRef - annualStripeFee).toFixed(2)),
    [activeInfluencerGrossRef, annualStripeFee]
  );

  const storeEconomicsSummary = useMemo(() => {
    let grossTotal = 0;
    let stripeFeesTotal = 0;
    let creatorBountiesTotal = 0;
    let devAllocationTotal = 0;
    let netSatAmTotal = 0;

    const creatorBundleBountyMap = new Map<
      string,
      { name: string; totalBounty: number; salesCount: number }
    >();

    storeLedger.forEach((row: any) => {
      const gross = Number(row.gross_amount_dollars || 0);
      const fee = Number(row.stripe_fee_dollars || 0);
      const bounty = Number(row.creator_bounty_dollars || 0);
      const dev = Number(row.dev_allocation_dollars || 0);
      const net = Number(row.net_saturday_am_dollars || 0);

      grossTotal += gross;
      stripeFeesTotal += fee;
      creatorBountiesTotal += bounty;
      devAllocationTotal += dev;
      netSatAmTotal += net;

      const detailedSplits: any[] = Array.isArray(row.creator_splits)
        ? row.creator_splits
        : [];

      if (detailedSplits.length > 0) {
        detailedSplits.forEach((sp: any) => {
          const clean = String(sp.creator_name || sp.name || '').trim();
          const amt = Number(sp.amount_dollars ?? sp.dollars ?? 0);
          if (!clean || amt <= 0) return;
          const existing = creatorBundleBountyMap.get(clean) || {
            name: clean,
            totalBounty: 0,
            salesCount: 0
          };
          existing.totalBounty += amt;
          existing.salesCount += 1;
          creatorBundleBountyMap.set(clean, existing);
        });
      } else {
        const cNames: string[] = Array.isArray(row.creator_names)
          ? row.creator_names.filter(Boolean)
          : [];
        if (bounty > 0 && cNames.length > 0) {
          const splitBounty = Number((bounty / cNames.length).toFixed(2));
          cNames.forEach(cName => {
            const clean = cName.trim();
            const existing = creatorBundleBountyMap.get(clean) || {
              name: clean,
              totalBounty: 0,
              salesCount: 0
            };
            existing.totalBounty += splitBounty;
            existing.salesCount += 1;
            creatorBundleBountyMap.set(clean, existing);
          });
        }
      }
    });

    return {
      grossTotal,
      stripeFeesTotal,
      creatorBountiesTotal,
      devAllocationTotal,
      netSatAmTotal,
      creatorBundleBounties: Array.from(creatorBundleBountyMap.values()).sort(
        (a, b) => b.totalBounty - a.totalBounty
      )
    };
  }, [storeLedger]);

  const referralCommissionSummary = useMemo(() => {
    const partnerByCode = new Map<
      string,
      { partnerName: string; role: string; canonicalCode: string }
    >();

    creators.forEach(c => {
      const canonicalCode = buildCreatorReferralCode(c.name);
      const variants = getCreatorReferralCodeVariants(c.name);
      variants.forEach(v => {
        partnerByCode.set(v.toUpperCase(), {
          partnerName: c.name,
          role: 'creator',
          canonicalCode
        });
      });
    });

    partnerProfiles.forEach(p => {
      const displayName = p.linked_creator_name || p.username || 'Partner';
      const rawRole = String(p.role || 'creator').toLowerCase();
      const role = rawRole === 'core_creator' ? 'creator' : rawRole;
      const canonicalCode =
        String(p.referral_code || '').trim().toUpperCase() ||
        buildCreatorReferralCode(displayName);

      const variants = [
        canonicalCode,
        ...getCreatorReferralCodeVariants(displayName),
        ...getCreatorReferralCodeVariants(p.username)
      ];
      variants.forEach(v => {
        if (v) {
          partnerByCode.set(v.toUpperCase(), {
            partnerName: displayName,
            role,
            canonicalCode
          });
        }
      });
    });

    const summaryMap = new Map<
      string,
      {
        code: string;
        partnerName: string;
        role: string;
        grossRate: number;
        netRate: number;
        referralsCount: number;
        totalNetCommission: number;
      }
    >();

    referredProfiles.forEach(sub => {
      const rawCode = String(sub.referred_by_code || '').trim().toUpperCase();
      if (!rawCode) return;
      const matchedPartner = partnerByCode.get(rawCode) || partnerByCode.get(`VIP-${rawCode}`);
      const role = matchedPartner?.role || 'creator';
      const grossRate = role === 'influencer' ? activeInfluencerGrossRef : activeCreatorGrossRef;
      const netRate = role === 'influencer' ? activeInfluencerNetRef : activeCreatorNetRef;
      const partnerName = matchedPartner?.partnerName || rawCode;
      const groupKey = matchedPartner?.canonicalCode || rawCode;

      const existing = summaryMap.get(groupKey) || {
        code: groupKey,
        partnerName,
        role,
        grossRate,
        netRate,
        referralsCount: 0,
        totalNetCommission: 0
      };
      existing.referralsCount += 1;
      existing.totalNetCommission += netRate;
      summaryMap.set(groupKey, existing);
    });

    return Array.from(summaryMap.values()).sort(
      (a, b) => b.totalNetCommission - a.totalNetCommission
    );
  }, [
    referredProfiles,
    partnerProfiles,
    creators,
    activeCreatorGrossRef,
    activeCreatorNetRef,
    activeInfluencerGrossRef,
    activeInfluencerNetRef
  ]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYm);

    [...tips, ...storeLedger].forEach(t => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (!isNaN(d.getTime())) {
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(ym);
        }
      }
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [tips, storeLedger]);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const lifetimeStats = useMemo(() => {
    const totalLifetimeDollars = tips.reduce((sum, t) => sum + Number(t.amount_dollars || 0), 0);
    const totalTransactions = tips.length;

    const byCreator = new Map<string, { name: string; total: number; count: number }>();
    tips.forEach(t => {
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

  const filteredAndSortedTips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = tips.filter(t => {
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
          return String(a.donor_name || a.donor_email || '').localeCompare(
            String(b.donor_name || b.donor_email || '')
          );
        case 'donor_desc':
          return String(b.donor_name || b.donor_email || '').localeCompare(
            String(a.donor_name || a.donor_email || '')
          );
        default:
          return timeB - timeA;
      }
    });
  }, [tips, selectedMonth, selectedCreator, searchQuery, sortBy]);

  const filteredStoreLedger = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeLedger.filter((row: any) => {
      if (selectedMonth !== 'all' && row.created_at) {
        const d = new Date(row.created_at);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== selectedMonth) return false;
      }
      if (selectedCreator !== 'all') {
        const cNames: string[] = Array.isArray(row.creator_names) ? row.creator_names : [];
        const hasMatch = cNames.some(
          n => String(n || '').toLowerCase() === selectedCreator.toLowerCase()
        );
        if (!hasMatch) return false;
      }
      if (!q) return true;
      const cJoined = Array.isArray(row.creator_names) ? row.creator_names.join(' ') : '';
      return (
        String(row.product_title || '').toLowerCase().includes(q) ||
        String(row.user_email || '').toLowerCase().includes(q) ||
        cJoined.toLowerCase().includes(q)
      );
    });
  }, [storeLedger, selectedMonth, selectedCreator, searchQuery]);

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
      setTips(prev => prev.map(t => (t.id === tip.id ? { ...t, payout_status: nextStatus } : t)));
    }
  };

  const handleToggleStoreLedgerStatus = async (row: any) => {
    const nextStatus = row.status === 'paid' || row.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('store_payout_ledger')
      .update({ status: nextStatus })
      .eq('id', row.id);
    if (!error) {
      setStoreLedger(prev =>
        prev.map(r => (r.id === row.id ? { ...r, status: nextStatus } : r))
      );
    }
  };

  const handleDeleteTip = async (id: string) => {
    if (!window.confirm('Remove this transaction from the payout ledger?')) return;
    const { error } = await supabase.from('creator_tips').delete().eq('id', id);
    if (!error) {
      setTips(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleDeleteStoreLedgerRow = async (id: string) => {
    if (!window.confirm('Remove this store sale entry from the ledger?')) return;
    const { error } = await supabase.from('store_payout_ledger').delete().eq('id', id);
    if (!error) {
      setStoreLedger(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleExportCSV = () => {
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    if (ledgerTab === 'store') {
      const headers = [
        'Date',
        'Product Title',
        'Product Type',
        'Buyer Email',
        'Gross (USD)',
        'Stripe Fee (USD)',
        'Creator Pool Total (USD)',
        'Creator Splits Breakdown',
        'Dev Allocation 7.5% (USD)',
        'Saturday AM Net Retained (USD)',
        'Status'
      ];
      const rows = filteredStoreLedger.map(r => {
        const splitsDesc = Array.isArray(r.creator_splits) && r.creator_splits.length > 0
          ? r.creator_splits
              .map((s: any) => `${s.creator_name}: $${Number(s.amount_dollars ?? s.dollars ?? 0).toFixed(2)}`)
              .join(' | ')
          : Array.isArray(r.creator_names)
          ? r.creator_names.join(' & ')
          : '';
        return [
          escapeCsv(r.created_at ? new Date(r.created_at).toLocaleString() : ''),
          escapeCsv(r.product_title),
          escapeCsv(r.product_type),
          escapeCsv(r.user_email || ''),
          escapeCsv(Number(r.gross_amount_dollars || 0).toFixed(2)),
          escapeCsv(Number(r.stripe_fee_dollars || 0).toFixed(2)),
          escapeCsv(Number(r.creator_bounty_dollars || 0).toFixed(2)),
          escapeCsv(splitsDesc),
          escapeCsv(Number(r.dev_allocation_dollars || 0).toFixed(2)),
          escapeCsv(Number(r.net_saturday_am_dollars || 0).toFixed(2)),
          escapeCsv(r.status || 'completed')
        ].join(',');
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute(
        'download',
        `SaturdayAM_Store_Bundle_Ledger_${selectedMonth === 'all' ? 'AllTime' : selectedMonth}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Date',
      'Creator Name',
      'Creator Email',
      'Net Tip Amount (USD)',
      'Payout Status',
      'Donor Name',
      'Donor Email',
      'Fan Mail Message',
      'Transaction ID'
    ];

    const rows = filteredAndSortedTips.map(t =>
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
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Creator Payouts, Multi-Creator Splits &amp; Dev Ledger
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Net Fan Tips • 1-Time 365d Referral Bounties (Creator Pays Stripe Fee) • Multi-Creator Store Pool • Locked 7.5% Dev Cut
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunStripeDevAudit}
            disabled={isAuditingStripe}
            className="px-3 py-2 rounded-lg bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isAuditingStripe ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-black" />
            )}
            {isAuditingStripe ? 'Auditing Stripe...' : 'Audit Stripe Dev Splits'}
          </button>

          <button
            type="button"
            onClick={() => setShowEmailDirectory(prev => !prev)}
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
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-3 py-2 rounded-lg bg-black border border-zinc-700 text-zinc-300 hover:text-black hover:bg-[#fe9a00] hover:border-[#fe9a00] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Log Payout / Tip
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg bg-black border border-zinc-700 text-zinc-300 hover:text-black hover:bg-[#fe9a00] hover:border-[#fe9a00] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            type="button"
            onClick={fetchPayoutData}
            className="p-2 bg-black border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* STRIPE LIVE DEV SPLIT AUDIT PANEL */}
      {stripeAuditData && (
        <div className="bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border-2 border-[#fe9a00] rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] block">
                Live Stripe Connect Audit ({stripeAuditData.devAccountId})
              </span>
              <h3 className="text-sm font-black uppercase italic text-white">
                Developer Allocation Reconciliation (7.5% Locked) &amp; Catch-Up Transfer
              </h3>
            </div>

            <button
              type="button"
              onClick={handleExecuteStripeCatchup}
              disabled={
                isExecutingCatchup ||
                (Number(stripeAuditData.owedCatchupCents || 0) <= 0 &&
                  Number(stripeAuditData.unpatchedSubsCount || 0) <= 0)
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            >
              {isExecutingCatchup ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transferring &amp; Syncing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sync Subs ({stripeAuditData.unpatchedSubsCount}) &amp; Transfer Owed Cut (${stripeAuditData.owedCatchupDollars})
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                Total Expected Dev Cut (7.5%)
              </span>
              <span className="text-lg font-black text-white mt-1 block">
                ${stripeAuditData.expectedDevDollars}
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                Already Transferred
              </span>
              <span className="text-lg font-black text-emerald-400 mt-1 block">
                ${stripeAuditData.alreadyTransferredDollars}
              </span>
            </div>

            <div className="bg-zinc-900 border border-[#fe9a00]/50 rounded-xl p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] block">
                Missed / Owed Catch-Up
              </span>
              <span className="text-lg font-black text-[#fe9a00] mt-1 block">
                ${stripeAuditData.owedCatchupDollars}
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                Platform Stripe Balance
              </span>
              <span className="text-sm font-black text-white mt-1 block">
                Avail: ${stripeAuditData.availablePlatformBalanceDollars} • Pend: ${stripeAuditData.pendingPlatformBalanceDollars}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP STORE & MULTI-CREATOR BUNDLE ECONOMICS */}
      <div className="bg-black border border-[#fe9a00]/50 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#fe9a00]" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                In-App Store &amp; Multi-Creator Bundle Economics ({storeLedger.length} Sales)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Sat AM Floor: ≥50% (Covers Stripe Fee) • Locked 7.5% Dev Cut • Up to 42.5% Multi-Creator Pool
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLedgerTab(ledgerTab === 'store' ? 'tips' : 'store')}
            className="px-3 py-1.5 rounded-lg bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/40 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer self-start sm:self-auto"
          >
            {ledgerTab === 'store' ? 'Switch to Fan Tips Table' : `View Store Sales Table (${storeLedger.length})`}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Gross Store &amp; Bundle Sales
            </div>
            <div className="text-lg font-black text-white mt-1">
              {formatCurrency(storeEconomicsSummary.grossTotal)}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              Stripe Fees (Company Paid): {formatCurrency(storeEconomicsSummary.stripeFeesTotal)}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              Creator Store Pool Paid
            </div>
            <div className="text-lg font-black text-emerald-400 mt-1">
              {formatCurrency(storeEconomicsSummary.creatorBountiesTotal)}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              Max 42.5% Pool Across Creators
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
              Store Dev Cut (7.5% Locked)
            </div>
            <div className="text-lg font-black text-[#fe9a00] mt-1">
              {formatCurrency(storeEconomicsSummary.devAllocationTotal)}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              Recipient: {DEV_RECIPIENT_EMAIL}
            </div>
          </div>

          <div className="bg-zinc-950 border border-emerald-500/40 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Sat AM Net Retained
            </div>
            <div className="text-lg font-black text-white mt-1">
              {formatCurrency(storeEconomicsSummary.netSatAmTotal)}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">
              Net Cash After Splits &amp; Stripe
            </div>
          </div>
        </div>

        {storeEconomicsSummary.creatorBundleBounties.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Creator Store &amp; Bundle Earnings Breakdown
            </div>
            <div className="flex flex-wrap gap-2">
              {storeEconomicsSummary.creatorBundleBounties.map(cb => (
                <div
                  key={cb.name}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold flex items-center gap-2"
                >
                  <span className="text-white font-black uppercase">{cb.name}</span>
                  <span className="text-emerald-400 font-black">
                    {formatCurrency(cb.totalBounty)} ({cb.salesCount} Sale{cb.salesCount > 1 ? 's' : ''})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          CONFIGURABLE 1-TIME REFERRAL BOUNTY POOL (CREATOR PAYS STRIPE FEE)
      ===================================================================== */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-[#fe9a00]" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Annual Referral Bounty Pool (365d Last-Click • 1-Time Yr 1 Only • Creator Covers Stripe Fee)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Sat AM Floor: ≥50% • Dev Cut: 7.5% Recurring • Max Creator Referral Pool: 42.5% (${maxReferralPoolDollars.toFixed(2)} on ${activeAnnualPrice.toFixed(0)}/yr)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setPricingMode('promo')}
                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                  pricingMode === 'promo' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
                }`}
              >
                $1.99 / $20
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('normal')}
                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                  pricingMode === 'normal' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
                }`}
              >
                $2.99 / $35
              </button>
            </div>
          </div>
        </div>

        {/* LIVE REFERRAL POOL MODE & RATE ADJUSTER */}
        <div className="bg-zinc-950 border border-[#fe9a00]/40 rounded-xl p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                Referral Bounty Mode
              </label>
              <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRefConfig(prev => ({ ...prev, mode: 'flat' }))}
                  className={`px-3 py-1.5 rounded text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer ${
                    refConfig.mode === 'flat' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
                  }`}
                >
                  <DollarSign className="w-3 h-3" /> Flat ($)
                </button>
                <button
                  type="button"
                  onClick={() => setRefConfig(prev => ({ ...prev, mode: 'percent' }))}
                  className={`px-3 py-1.5 rounded text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer ${
                    refConfig.mode === 'percent' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
                  }`}
                >
                  <Percent className="w-3 h-3" /> Percent (%)
                </button>
              </div>
            </div>

            {refConfig.mode === 'flat' ? (
              <>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                    Creator / Staff Gross $ (Std $5)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min={0}
                    max={maxReferralPoolDollars}
                    value={refConfig.creator_flat_dollars}
                    onChange={e =>
                      setRefConfig(prev => ({
                        ...prev,
                        creator_flat_dollars: Math.min(maxReferralPoolDollars, Math.max(0, Number(e.target.value)))
                      }))
                    }
                    className="w-28 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-black text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1">
                    Influencer Gross $ (Std $2)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min={0}
                    max={maxReferralPoolDollars}
                    value={refConfig.influencer_flat_dollars}
                    onChange={e =>
                      setRefConfig(prev => ({
                        ...prev,
                        influencer_flat_dollars: Math.min(maxReferralPoolDollars, Math.max(0, Number(e.target.value)))
                      }))
                    }
                    className="w-28 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-black text-purple-400"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                    Creator / Staff % (Max 42.5%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={MAX_CREATOR_POOL_PERCENT}
                    value={refConfig.creator_percent}
                    onChange={e =>
                      setRefConfig(prev => ({
                        ...prev,
                        creator_percent: Math.min(MAX_CREATOR_POOL_PERCENT, Math.max(0, Number(e.target.value)))
                      }))
                    }
                    className="w-28 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-black text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1">
                    Influencer % (Max 42.5%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={MAX_CREATOR_POOL_PERCENT}
                    value={refConfig.influencer_percent}
                    onChange={e =>
                      setRefConfig(prev => ({
                        ...prev,
                        influencer_percent: Math.min(MAX_CREATOR_POOL_PERCENT, Math.max(0, Number(e.target.value)))
                      }))
                    }
                    className="w-28 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-black text-purple-400"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={savingRefConfig}
            onClick={handleSaveReferralPoolConfig}
            className="px-4 py-2.5 rounded-xl bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {savingRefConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Live Referral Pool
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Monthly Sub (${activeMonthlyPrice.toFixed(2)}/mo)
            </div>
            <div className="text-lg font-black text-[#fe9a00] mt-1">
              ${devCutPerMonthlySub.toFixed(2)} <span className="text-[10px] text-zinc-400 font-bold">/ mo (7.5%)</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              Recurring Dev Cut
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Annual Sub (${activeAnnualPrice.toFixed(2)}/yr)
            </div>
            <div className="text-lg font-black text-[#fe9a00] mt-1">
              ${devCutPerAnnualSub.toFixed(2)} <span className="text-[10px] text-zinc-400 font-bold">/ yr (7.5%)</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              Active Pro Est: ${(activeProCount * devCutPerAnnualSub).toFixed(2)}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              Creator / Staff Ref (Yr 1 Only)
            </div>
            <div className="text-lg font-black text-white mt-1">
              ${activeCreatorNetRef.toFixed(2)}{' '}
              <span className="text-[10px] text-emerald-400 font-bold">Net Sent</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              ${activeCreatorGrossRef.toFixed(2)} Gross − ${annualStripeFee.toFixed(2)} Stripe Fee
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-purple-400">
              Influencer Ref (Yr 1 Only)
            </div>
            <div className="text-lg font-black text-white mt-1">
              ${activeInfluencerNetRef.toFixed(2)}{' '}
              <span className="text-[10px] text-purple-400 font-bold">Net Sent</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1">
              ${activeInfluencerGrossRef.toFixed(2)} Gross − ${annualStripeFee.toFixed(2)} Stripe Fee
            </div>
          </div>
        </div>

        {referralCommissionSummary.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Referred Annual Subscribers &amp; Net Creator Payouts (After Stripe Fee)
            </div>
            <div className="flex flex-wrap gap-2">
              {referralCommissionSummary.map(item => (
                <div
                  key={item.code}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold flex items-center gap-2"
                >
                  <span className="text-white font-black uppercase">{item.partnerName}</span>
                  <span className="text-zinc-500 font-mono">({item.code})</span>
                  <span className="text-emerald-400 font-black">
                    ${item.totalNetCommission.toFixed(2)} Net ({item.referralsCount} × ${item.netRate.toFixed(2)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIFETIME TIPS KPI BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-black via-zinc-950 to-[#fe9a00]/15 border-2 border-[#fe9a00] rounded-2xl p-5 shadow-[0_0_30px_rgba(254,154,0,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Lifetime Net Tips to Creators
            </span>
            <span className="bg-[#fe9a00]/20 text-[#fe9a00] text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
              0% Platform Cut
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1">
            {formatCurrency(lifetimeStats.totalLifetimeDollars)}
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Across {lifetimeStats.totalTransactions.toLocaleString()} Total Fan Tips
          </p>
        </div>

        <div className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#fe9a00]" />
              {selectedMonth === 'all' ? 'Filtered Tips Volume' : formatMonthLabel(selectedMonth)}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#fe9a00] tracking-tight my-1">
            {formatCurrency(filteredPeriodTotal)}
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {filteredAndSortedTips.length} Fan Tips in Selected View
          </p>
        </div>

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

      {showEmailDirectory && (
        <div className="bg-black border border-[#fe9a00]/40 rounded-xl p-5 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-2">
                <Users className="w-4 h-4" /> Creator Fan Mail &amp; Tip Alert Emails
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {creators.map(c => (
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
                    onChange={e =>
                      setCreatorEmails(prev => ({ ...prev, [c.name]: e.target.value }))
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
                onChange={e => setNewCreatorName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:border-[#fe9a00] outline-none"
              />
              <datalist id="creator-payout-list">
                {creators.map(c => (
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
                onChange={e => setNewAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs font-bold text-[#fe9a00] focus:border-[#fe9a00] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                Payout Status
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
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
                placeholder="e.g. MangaFan99"
                value={newDonorName}
                onChange={e => setNewDonorName(e.target.value)}
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
                onChange={e => setNewDonorEmail(e.target.value)}
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
              placeholder="e.g. Keep up the amazing artwork!"
              value={newFanMessage}
              onChange={e => setNewFanMessage(e.target.value)}
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

      {lifetimeStats.creatorBreakdown.length > 0 && (
        <div className="bg-black border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#fe9a00]" /> Lifetime Tip Totals by Creator (Click to Filter)
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
            {lifetimeStats.creatorBreakdown.map(c => (
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

      {/* TABLE SWITCHER + SEARCH + FILTERS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-black p-4 rounded-xl border border-zinc-800">
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setLedgerTab('tips')}
            className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest cursor-pointer ${
              ledgerTab === 'tips' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Fan Tips ({tips.length})
          </button>
          <button
            type="button"
            onClick={() => setLedgerTab('store')}
            className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest cursor-pointer ${
              ledgerTab === 'store' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Store &amp; Bundles ({storeLedger.length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              ledgerTab === 'store'
                ? 'Search bundle title, buyer email, or creator...'
                : 'Search donor name, email, creator, or fan mail message...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="all">All Months (Lifetime)</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          {ledgerTab === 'tips' && (
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as PayoutSortOption)}
                className="bg-zinc-900 border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
              >
                <option value="date_desc">Sort: Newest Activity First</option>
                <option value="date_asc">Sort: Oldest Activity First</option>
                <option value="amount_desc">Sort: Highest Amount ($ → $)</option>
                <option value="amount_asc">Sort: Lowest Amount ($ → $)</option>
                <option value="creator_asc">Sort: Creator Name (A → Z)</option>
                <option value="creator_desc">Sort: Creator Name (Z → A)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* LEDGER TABLES */}
      {ledgerTab === 'store' ? (
        <div className="overflow-x-auto no-scrollbar bg-black border border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Product / Bundle</th>
                <th className="py-3.5 px-4">Buyer</th>
                <th className="py-3.5 px-4 text-right">Gross</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">Creator Splits</th>
                <th className="py-3.5 px-4 text-right text-[#fe9a00]">Dev (7.5%)</th>
                <th className="py-3.5 px-4 text-right text-white">Sat AM Net</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredStoreLedger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold italic">
                    No store or bundle transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredStoreLedger.map((r: any) => {
                  const isCompleted = r.status === 'completed' || r.status === 'paid';
                  const rowSplits: any[] = Array.isArray(r.creator_splits)
                    ? r.creator_splits
                    : [];
                  const cNames: string[] = Array.isArray(r.creator_names)
                    ? r.creator_names.filter(Boolean)
                    : [];
                  return (
                    <tr key={r.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-white uppercase tracking-wider">
                          {r.product_title}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold">
                          {r.product_type}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-bold">
                        {r.user_email || 'Registered Fan'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatCurrency(Number(r.gross_amount_dollars || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-emerald-400">
                          {formatCurrency(Number(r.creator_bounty_dollars || 0))}
                        </div>
                        {rowSplits.length > 0 ? (
                          <div className="text-[9px] text-zinc-400 font-bold space-y-0.5 mt-0.5">
                            {rowSplits.map((sp: any, idx: number) => (
                              <div key={idx}>
                                {sp.creator_name || sp.name}: $
                                {Number(sp.amount_dollars ?? sp.dollars ?? 0).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          cNames.length > 0 && (
                            <div className="text-[9px] text-zinc-400 font-bold">
                              {cNames.join(' & ')}
                            </div>
                          )
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#fe9a00]">
                        {formatCurrency(Number(r.dev_allocation_dollars || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-white">
                        {formatCurrency(Number(r.net_saturday_am_dollars || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStoreLedgerStatus(r)}
                          className="cursor-pointer"
                        >
                          {isCompleted ? (
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
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteStoreLedgerRow(r.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-500 rounded-lg cursor-pointer"
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
      ) : (
        <div className="overflow-x-auto no-scrollbar bg-black border border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                <th className="py-3.5 px-4">Date &amp; Time</th>
                <th className="py-3.5 px-4">Creator Recipient</th>
                <th className="py-3.5 px-4">Donor / Supporter Info</th>
                <th className="py-3.5 px-4">Fan Mail Message</th>
                <th className="py-3.5 px-4 text-center">Payout Status</th>
                <th className="py-3.5 px-4 text-right text-[#fe9a00]">Net Tip Amount</th>
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
                filteredAndSortedTips.map(t => {
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
                            &ldquo;{t.fan_message}&rdquo;
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic text-[11px]">No fan mail message</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePayoutStatus(t)}
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
      )}
    </div>
  );
};