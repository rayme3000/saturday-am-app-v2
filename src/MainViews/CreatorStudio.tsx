import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import {
  ArrowLeft, DollarSign, Sparkles, Flame, BookOpen, KeyRound, Copy, Check,
  ExternalLink, Heart, RefreshCw, Award, Eye, QrCode, Download, X
} from 'lucide-react';
import { resolveCreatorStripeAccountId, normalizeCreatorKey } from './CreatorsPage';

interface CreatorStudioProps {
  currentUser: any;
  onBack: () => void;
  onNavigate: (data: any) => void;
}

const STAFF_CREATOR_EMAILS = [
  'demetrene.billups@gmail.com',
  'saturdayam.writer@gmail.com'
];

// Built-in Saturday AM catalog mapping so every creator always syncs with their series & one-shots
const CREATOR_SERIES_CATALOG_MAP: Record<string, string[]> = {
  'raymond brown': ['bully eater'],
  'rayme3000': ['bully eater'],
  'odunze oguguo': ['apple black'],
  'whyt manga': ['apple black'],
  'odunze oguguo (whyt manga)': ['apple black'],
  'frederick l. jones': ['clock striker', 'fan-x-boy', 'saturday wars', 'massively multiplayer world of ghosts', 'mmwog', 'yellow stringer'],
  'issaka galadima': ['clock striker'],
  'mike saharat srimuang': ['clock striker'],
  'frank simmonds': ['fan-x-boy'],
  'kristina andabak': ['grimmheim'],
  'erick pedrucci': ['gun+bone', 'gun', 'hammer'],
  'fred tornager': ['gunhild'],
  'jeyodin': ['hammer'],
  'bon idle': ['henshin'],
  'stefano romano': ['maximo'],
  'pap souleye fall': ['oblivion rouge'],
  'huzayfa umar': ['orisha'],
  'zayf': ['orisha'],
  'huzayfa umar (zayf)': ['orisha'],
  'yvan soudy': ['redskin'],
  'staark': ['redskin'],
  'yvan soudy (staark)': ['redskin'],
  'eddy frye': ['saturday wars'],
  'morganne walker': ['soul beat'],
  'oscar fong': ['massively multiplayer world of ghosts', 'mmwog'],
  'tony dawkins': ['titan king'],
  'jr de bard': ['underground'],
  'goeffrey jean-louis': ['yellow stringer'],
  'angélica rosales': ['yellow stringer'],
  'angelica rosales': ['yellow stringer'],
  'austin harvey-younis': ['zarqa'],
  'vee': ['zarqa'],
  'staniel russell': ['zephyr'],
  'kiba fabio augusto': ['apple black'],
  'stephanie williams': ['apple black']
};

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ currentUser, onBack, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [uniqueCreatorNames, setUniqueCreatorNames] = useState<string[]>([]);
  const [selectedCreatorName, setSelectedCreatorName] = useState<string>('');
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [tips, setTips] = useState<any[]>([]);
  const [referredAnnualCount, setReferredAnnualCount] = useState<number>(0);
  const [bingoPin, setBingoPin] = useState<string>('');
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [chapterStatsMap, setChapterStatsMap] = useState<Record<string, { hypes: number; reacts: number }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingPin, setGeneratingPin] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const isAdmin = Boolean(currentUser?.is_admin);
  const userEmail = String(currentUser?.email || '').trim().toLowerCase();
  const rawRole = String(currentUser?.role || (isAdmin ? 'staff' : 'creator')).toLowerCase();

  const effectiveRole = useMemo(() => {
    if (STAFF_CREATOR_EMAILS.includes(userEmail) || rawRole === 'staff') return 'staff';
    if (rawRole === 'influencer') return 'influencer';
    return 'creator';
  }, [userEmail, rawRole]);

  const commissionPerSale = effectiveRole === 'influencer' ? 2 : 5;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    const initCreators = async () => {
      const { data: creatorsData } = await supabase
        .from('series_creators')
        .select('*')
        .order('name', { ascending: true });

      const rows = creatorsData || [];

      const dedupedMap = new Map<string, string>();
      rows.forEach((r: any) => {
        const raw = String(r.name || r.creator_name || '').trim().replace(/\s+/g, ' ');
        if (!raw) return;
        const key = normalizeCreatorKey(raw);
        const displayName = key === 'erick pedrucci' ? 'Erick Pedrucci' : raw;
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, displayName);
        }
      });

      const uniqueNames = Array.from(dedupedMap.values()).sort((a, b) => a.localeCompare(b));
      setUniqueCreatorNames(uniqueNames);

      const linked = String(currentUser?.linked_creator_name || '').trim();
      if (linked) {
        const normLinked = normalizeCreatorKey(linked);
        setSelectedCreatorName(dedupedMap.get(normLinked) || linked);
        return;
      }

      const uEmail = String(currentUser?.email || '').trim().toLowerCase();
      const userName = String(currentUser?.username || '').trim().toLowerCase();
      const fullName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim().toLowerCase();

      if (userName === 'rayme3000' || fullName.includes('raymond brown')) {
        setSelectedCreatorName(dedupedMap.get('raymond brown') || 'Raymond Brown');
        return;
      }

      const matchedRow = rows.find((c: any) => {
        const cName = String(c.name || c.creator_name || '').trim().toLowerCase();
        const cEmail = String(c.email || '').trim().toLowerCase();
        if (uEmail && cEmail && cEmail === uEmail) return true;
        if (fullName && cName && (cName.includes(fullName) || fullName.includes(cName))) return true;
        if (userName && cName && (cName.includes(userName) || userName.includes(cName))) return true;
        return false;
      });

      if (matchedRow) {
        const key = normalizeCreatorKey(matchedRow.name || matchedRow.creator_name);
        setSelectedCreatorName(dedupedMap.get(key) || String(matchedRow.name || matchedRow.creator_name).trim());
      } else if (currentUser?.username) {
        setSelectedCreatorName(currentUser.username);
      } else if (uniqueNames.length > 0) {
        setSelectedCreatorName(uniqueNames[0]);
      }
    };

    initCreators();
  }, [currentUser]);

  const referralSlug = useMemo(() => {
    const base = selectedCreatorName || currentUser?.username || 'creator';
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }, [selectedCreatorName, currentUser?.username]);

  const referralCode = useMemo(() => {
    const clean = (selectedCreatorName || currentUser?.username || 'AM')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    return `VIP-${clean}`;
  }, [selectedCreatorName, currentUser?.username]);

  const vipReferralLink = `https://www.mangahype.com/?ref=${encodeURIComponent(referralCode)}&vip=${referralSlug}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=16&color=000000&bgcolor=fe9a00&data=${encodeURIComponent(vipReferralLink)}`;

  const handleDownloadQrCode = async () => {
    try {
      const response = await fetch(qrCodeImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `SaturdayAM_${referralCode}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrCodeImageUrl, '_blank');
    }
  };

  const fetchCreatorStudioData = useCallback(async (targetName: string) => {
    if (!targetName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cleanName = targetName.trim();
      const normKey = normalizeCreatorKey(cleanName);

      const parenMatch = cleanName.match(/^(.+?)\s*\((.+?)\)$/);
      const nameParts = parenMatch
        ? [normKey, parenMatch[1].trim().toLowerCase(), parenMatch[2].trim().toLowerCase()]
        : [normKey];

      const { data: allCreatorRows } = await supabase
        .from('series_creators')
        .select('*');

      const cRows = (allCreatorRows || []).filter((r: any) => {
        const rKey = normalizeCreatorKey(r.name || r.creator_name);
        return nameParts.some(part => part && (rKey === part || rKey.includes(part) || part.includes(rKey)));
      });

      const dbStripe = cRows.find((r: any) => r.stripe_account_id)?.stripe_account_id || '';
      const resolvedStripeId = resolveCreatorStripeAccountId(cleanName, dbStripe);

      setCreatorProfile({
        ...(cRows[0] || { name: cleanName }),
        name: cleanName,
        stripe_account_id: resolvedStripeId
      });

      const { data: allTipsData } = await supabase
        .from('creator_tips')
        .select('*')
        .order('created_at', { ascending: false });

      const myTips = (allTipsData || []).filter((t: any) => {
        const tCreator = normalizeCreatorKey(t.creator_name);
        return nameParts.some(part => part && tCreator && (tCreator === part || tCreator.includes(part) || part.includes(tCreator)));
      });
      setTips(myTips);

      const cleanCodeBase = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      const vipCode = `VIP-${cleanCodeBase}`;
      const { data: refSubs } = await supabase
        .from('profiles')
        .select('id, referred_by_code')
        .eq('is_premium', true)
        .not('referred_by_code', 'is', null);

      const matchedRefCount = (refSubs || []).filter((r: any) => {
        const codeUsed = String(r.referred_by_code || '').trim().toUpperCase();
        return codeUsed === vipCode || codeUsed === cleanCodeBase;
      }).length;
      setReferredAnnualCount(matchedRefCount);

      const { data: pinData } = await supabase
        .from('bingo_codes')
        .select('*')
        .ilike('creator_name', `%${parenMatch ? parenMatch[1].trim() : cleanName}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestPinRow = Array.isArray(pinData) && pinData.length > 0 ? pinData[0] : null;
      setBingoPin(latestPinRow?.code || latestPinRow?.pin || '');

      const { data: allSeries } = await supabase
        .from('series')
        .select('*');

      const linkedSeriesSlugs = new Set<string>();
      cRows.forEach((row: any) => {
        if (row.series_slug) linkedSeriesSlugs.add(String(row.series_slug).trim().toLowerCase());
      });

      const catalogKeywords: string[] = [];
      nameParts.forEach(part => {
        if (CREATOR_SERIES_CATALOG_MAP[part]) {
          catalogKeywords.push(...CREATOR_SERIES_CATALOG_MAP[part]);
        }
      });

      const mySeries = (allSeries || []).filter((s: any) => {
        const sSlug = String(s.slug || '').trim().toLowerCase();
        const sTitle = String(s.title || '').trim().toLowerCase();
        const sCreator = String(s.creator_name || s.author || '').trim().toLowerCase();

        if (sSlug && linkedSeriesSlugs.has(sSlug)) return true;

        if (sCreator && nameParts.some(part => part.length > 2 && sCreator.includes(part))) {
          return true;
        }

        if (catalogKeywords.some(kw => sTitle.includes(kw) || sSlug.includes(kw.replace(/\s+/g, '-')))) {
          return true;
        }

        return false;
      });

      setSeriesList(mySeries);

      if (mySeries.length > 0) {
        const mySlugs = mySeries.map((s: any) => s.slug).filter(Boolean);

        const { data: chData } = await supabase
          .from('chapters')
          .select('*')
          .in('series_slug', mySlugs)
          .eq('is_published', true)
          .order('chapter_number', { ascending: true });

        setChaptersList(chData || []);

        const statsAccumulator: Record<string, { hypes: number; reacts: number }> = {};
        await Promise.all(
          mySlugs.map(async (slug: string) => {
            try {
              const { data: rpcStats } = await supabase.rpc('get_series_chapter_stats', { p_series_slug: slug });
              if (Array.isArray(rpcStats)) {
                rpcStats.forEach((st: any) => {
                  statsAccumulator[String(st.chapter_id)] = {
                    hypes: Number(st.total_hypes || 0),
                    reacts: Number(st.total_reacts || 0)
                  };
                });
              }
            } catch {
              // Ignore RPC errors on individual series
            }
          })
        );
        setChapterStatsMap(statsAccumulator);
      } else {
        setChaptersList([]);
        setChapterStatsMap({});
      }
    } catch (err) {
      console.error('Error loading Creator Studio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCreatorName) {
      fetchCreatorStudioData(selectedCreatorName);
    } else {
      setLoading(false);
    }
  }, [selectedCreatorName, fetchCreatorStudioData]);

  const handleGeneratePin = async () => {
    if (!selectedCreatorName) return;
    setGeneratingPin(true);
    try {
      const newPin = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('bingo_codes').insert([{
        code: newPin,
        creator_name: selectedCreatorName.trim(),
        event_name: 'Creator Studio PIN',
        max_uses: 999999,
        expires_at: expiresAt
      }]);

      if (error) throw error;
      setBingoPin(newPin);
    } catch (err: any) {
      alert('Could not generate PIN: ' + err.message);
    } finally {
      setGeneratingPin(false);
    }
  };

  const totalTipDollars = useMemo(() => {
    return tips.reduce((acc, row) => {
      const amt = Number(
        row.amount_dollars ?? (row.amount_cents ? row.amount_cents / 100 : row.amount || 0)
      );
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [tips]);

  const getChapterHypes = useCallback((ch: any) => {
    const rpcHypes = chapterStatsMap[String(ch.id)]?.hypes || 0;
    return Number(ch.hype_count || ch.total_hypes || 0) + rpcHypes;
  }, [chapterStatsMap]);

  const getSeriesTotalHypes = useCallback((series: any) => {
    const sChapters = chaptersList.filter((c: any) => c.series_slug === series.slug);
    const subHypes = sChapters.reduce((sum, ch) => sum + getChapterHypes(ch), 0);
    return Number(series.hype_count || series.total_hypes || 0) + subHypes;
  }, [chaptersList, getChapterHypes]);

  const totalSeriesHypes = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + getSeriesTotalHypes(s), 0);
  }, [seriesList, getSeriesTotalHypes]);

  return (
    <div className="min-h-screen bg-black/90 text-white pb-36 pt-6 px-4 sm:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Top Navigation & Role Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800 pr-14 sm:pr-16">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-[#fe9a00] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">
                Creator <span className="text-[#fe9a00]">Studio</span>
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                effectiveRole === 'staff'
                  ? 'bg-[#fe9a00]/20 text-[#fe9a00] border-[#fe9a00]/50'
                  : effectiveRole === 'influencer'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {effectiveRole === 'staff'
                  ? 'Staff / Creator ($5 Annual Ref + 3d Trial)'
                  : effectiveRole === 'influencer'
                  ? 'Influencer Partner ($2 Annual Ref + 3d Trial)'
                  : 'Official Creator ($5 Annual Ref + 3d Trial)'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-bold mt-1">
              Real-time series stats, 100% pass-through fan tips, autograph PINs, QR codes & annual trial referral links
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && uniqueCreatorNames.length > 0 && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-[#fe9a00]/50 rounded-xl px-3 py-2" title="Admin Peek Mode: View any creator's studio">
              <Eye className="w-4 h-4 text-[#fe9a00] shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] hidden sm:inline">
                Admin Peek:
              </span>
              <select
                value={selectedCreatorName}
                onChange={(e) => setSelectedCreatorName(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {uniqueCreatorNames.map((cName) => (
                  <option key={cName} value={cName} className="bg-zinc-950 text-white">
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchCreatorStudioData(selectedCreatorName)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-colors cursor-pointer"
            title="Refresh Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Direct Fan Tips (100%)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">${totalTipDollars.toFixed(2)}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-bold text-zinc-500">{tips.length} Fan Tip{tips.length === 1 ? '' : 's'}</span>
              {creatorProfile?.stripe_account_id ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Stripe Linked
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  AM Default Escrow
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-[#fe9a00]/40 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(254,154,0,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">Annual Sub Referral</span>
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#fe9a00]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">
              ${commissionPerSale}.00 <span className="text-xs font-bold text-zinc-400 not-italic">/ Annual Sub</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">
              {referredAnnualCount > 0
                ? `${referredAnnualCount} Referred Subs ($${(referredAnnualCount * commissionPerSale).toFixed(2)} Earned)`
                : 'Unlocks 3-Day Free Trial on Annual ($20/yr)'}
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Series Hypes</span>
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-[#fe9a00]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">{totalSeriesHypes.toLocaleString()}</div>
            <span className="text-[10px] font-bold text-zinc-500 mt-2 block">
              Across {seriesList.length} linked series ({chaptersList.length} chapters)
            </span>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Autograph Event PIN</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-mono font-black tracking-widest text-[#fe9a00]">
                {bingoPin || '-----'}
              </span>
              <button
                onClick={handleGeneratePin}
                disabled={generatingPin}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-[#fe9a00] hover:text-black text-zinc-300 border border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {generatingPin ? '...' : bingoPin ? 'New PIN' : 'Create PIN'}
              </button>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 mt-2 block">
              Share with fans at cons to unlock your signature
            </span>
          </div>
        </div>
      </div>

      {/* VIP Referral Link, Code & QR Code Sharing Hub */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-[#fe9a00]/50 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5 w-full">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
              <Sparkles className="w-3.5 h-3.5" /> Annual Referral Code, QR Code & 3-Day Free Trial Bundle
            </div>
            <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-white">
              Earn ${commissionPerSale} Per Annual Subscriber + Give Fans a 3-Day Free Trial
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-bold leading-relaxed">
              Every fan who scans your QR code or uses your link/code on the Annual Plan ($20/yr, <span className="line-through text-zinc-500">$35.99/yr</span> normal price) gets a <span className="text-white">3-Day Free Trial</span> (card required), unlocks your exclusive Hype Card Skin & Bingo Book signature, and earns you <span className="text-[#fe9a00]">${commissionPerSale}.00 commission</span>!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full pt-3 border-t border-zinc-800/80">
            {/* Scannable QR Code Thumbnail + Expand Button */}
            <div
              onClick={() => setShowQrModal(true)}
              className="bg-black border border-[#fe9a00]/60 hover:border-[#fe9a00] rounded-xl p-2.5 flex items-center gap-3 cursor-pointer group transition-all shadow-[0_0_20px_rgba(254,154,0,0.12)] sm:shrink-0"
              title="Click to enlarge or download QR Code"
            >
              <img
                src={qrCodeImageUrl}
                alt={`QR Code for ${referralCode}`}
                className="w-12 h-12 rounded-lg border border-[#fe9a00]/40 shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="pr-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1">
                  <QrCode className="w-3 h-3" /> Trial QR Code
                </span>
                <span className="text-[11px] font-black uppercase text-white block mt-0.5 group-hover:text-[#fe9a00] transition-colors">
                  View / Download
                </span>
              </div>
            </div>

            {/* Referral Code Box */}
            <div className="bg-black border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 sm:shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Annual Referral Code</span>
                <span className="text-sm font-mono font-black text-white">{referralCode}</span>
              </div>
              <button
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="p-2 bg-zinc-900 hover:bg-[#fe9a00] hover:text-black text-zinc-300 rounded-lg transition-colors cursor-pointer"
                title="Copy Referral Code"
              >
                {copiedKey === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Referral Link Box (Expands to fill remaining width on desktop) */}
            <div className="bg-black border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 sm:flex-1 min-w-0">
              <div className="min-w-0 flex-1 truncate">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Direct 3-Day Trial Link</span>
                <span className="text-xs font-mono font-bold text-[#fe9a00] truncate block">{vipReferralLink}</span>
              </div>
              <button
                onClick={() => copyToClipboard(vipReferralLink, 'link')}
                className="px-4 py-2.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: My Series & Chapter Stats + Fan Mail Wall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#fe9a00]" />
                <h3 className="text-base font-black italic uppercase tracking-wider text-white">
                  My Series & Chapter Stats
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {seriesList.length} Linked Series
              </span>
            </div>

            {seriesList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                No series linked to "{selectedCreatorName}" yet.
              </div>
            ) : (
              <div className="space-y-4">
                {seriesList.map((series: any) => {
                  const sChapters = chaptersList.filter((c: any) => c.series_slug === series.slug);
                  const displaySeriesHypes = getSeriesTotalHypes(series);

                  return (
                    <div key={series.id || series.slug} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-3">
                          {(series.cover_url || series.character_url) && (
                            <img
                              src={series.cover_url || series.character_url}
                              alt={series.title}
                              className="w-12 h-16 object-cover rounded-lg border border-zinc-700 shrink-0"
                            />
                          )}
                          <div>
                            <h4 className="text-sm font-black italic uppercase text-white">{series.title}</h4>
                            <p className="text-[10px] font-bold text-zinc-400">
                              {sChapters.length} Published Chapter{sChapters.length === 1 ? '' : 's'} • {series.genre || 'Manga'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-black border border-zinc-800 px-3 py-1.5 rounded-lg text-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Total Hypes</span>
                            <span className="text-xs font-black text-[#fe9a00] flex items-center justify-center gap-1">
                              <Flame className="w-3 h-3" /> {displaySeriesHypes.toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => onNavigate(series)}
                            className="p-2 bg-zinc-800 hover:bg-[#fe9a00] hover:text-black text-zinc-300 rounded-lg transition-colors cursor-pointer"
                            title="Open Series Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {sChapters.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sChapters.map((ch: any) => {
                            const chHypes = getChapterHypes(ch);
                            const chReacts = (ch.react_count || 0) + (chapterStatsMap[String(ch.id)]?.reacts || 0);
                            return (
                              <div
                                key={ch.id}
                                className="bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-zinc-200 truncate">
                                  Ch. {ch.chapter_number}: {ch.title || `Chapter ${ch.chapter_number}`}
                                </span>
                                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                  <span className="text-[10px] font-black text-[#fe9a00] flex items-center gap-1" title="Chapter Hypes">
                                    <Flame className="w-3 h-3" /> {chHypes}
                                  </span>
                                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1" title="Chapter Likes">
                                    <Heart className="w-3 h-3 fill-red-500 text-red-500" /> {chReacts}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fan Mail & Direct Tips Wall */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#fe9a00]" />
              <h3 className="text-base font-black italic uppercase tracking-wider text-white">
                Fan Mail & Tips
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
              {tips.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
            {tips.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                When fans send you a tip or fan mail on your series page, their messages and support amounts will appear right here!
              </div>
            ) : (
              tips.map((t: any, idx: number) => {
                const amount = Number(
                  t.amount_dollars ?? (t.amount_cents ? t.amount_cents / 100 : t.amount || 0)
                );
                const fanDisplayName = t.donor_name || t.fan_username || t.sender_name || 'Saturday AM Fan';
                const fanMessageText = t.fan_message || t.message || '';

                return (
                  <div key={t.id || idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        {fanDisplayName}
                      </span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        +${amount.toFixed(2)}
                      </span>
                    </div>
                    {fanMessageText && (
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-black/50 p-2.5 rounded-lg border border-zinc-800/80">
                        "{fanMessageText}"
                      </p>
                    )}
                    <span className="text-[9px] font-mono text-zinc-500 block">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Convention & Stream QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-2">
              <QrCode className="w-4 h-4" /> Official Partner QR Code
            </div>
            <h3 className="text-xl font-black italic uppercase text-white mb-1">
              {selectedCreatorName || currentUser?.username || 'Saturday AM Partner'}
            </h3>
            <p className="text-[11px] font-bold text-zinc-400 mb-5">
              Scan to unlock a <span className="text-[#fe9a00]">3-Day Free Trial</span> on the Saturday AM+ Annual Plan!
            </p>

            <div className="bg-[#fe9a00] p-3 rounded-2xl shadow-[0_0_30px_rgba(254,154,0,0.4)] mb-5">
              <img
                src={qrCodeImageUrl}
                alt={`QR Code for ${referralCode}`}
                className="w-56 h-56 rounded-xl object-contain"
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 mb-5 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                Referral Code
              </span>
              <span className="text-lg font-mono font-black text-[#fe9a00] tracking-widest">
                {referralCode}
              </span>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleDownloadQrCode}
                className="flex-1 py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>
              <button
                onClick={() => copyToClipboard(vipReferralLink, 'qr-link')}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'qr-link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'qr-link' ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};