import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import {
  ArrowLeft, DollarSign, Sparkles, Flame, BookOpen, KeyRound, Copy, Check,
  ExternalLink, MessageSquare, Heart, RefreshCw, ShieldCheck, Award, TrendingUp,
  Link2, Users, Eye
} from 'lucide-react';

interface CreatorStudioProps {
  currentUser: any;
  onBack: () => void;
  onNavigate: (data: any) => void;
}

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ currentUser, onBack, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [allCreators, setAllCreators] = useState<any[]>([]);
  const [selectedCreatorName, setSelectedCreatorName] = useState<string>('');
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [tips, setTips] = useState<any[]>([]);
  const [bingoPin, setBingoPin] = useState<string>('');
  const [signatureData, setSignatureData] = useState<any>(null);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingPin, setGeneratingPin] = useState(false);

  const userRole = String(currentUser?.role || (currentUser?.is_admin ? 'staff' : 'reader')).toLowerCase();
  const isStaffOrAdmin = Boolean(currentUser?.is_admin || userRole === 'staff');
  const isCoreTier = userRole === 'core_creator' || userRole === 'staff' || Boolean(currentUser?.is_admin);
  const commissionPerSale = isCoreTier ? 10 : 5;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load creator roster and determine which creator profile to inspect
  useEffect(() => {
    const initCreators = async () => {
      const { data: creatorsData } = await supabase
        .from('series_creators')
        .select('*')
        .order('name', { ascending: true });

      const list = creatorsData || [];
      setAllCreators(list);

      const linked = String(currentUser?.linked_creator_name || '').trim();
      if (linked) {
        setSelectedCreatorName(linked);
        return;
      }

      // Auto-match by email or username if linked_creator_name wasn't explicitly set yet
      const userEmail = String(currentUser?.email || '').trim().toLowerCase();
      const userName = String(currentUser?.username || '').trim().toLowerCase();

      const matched = list.find((c: any) =>
        (userEmail && String(c.email || '').trim().toLowerCase() === userEmail) ||
        (userName && String(c.name || '').trim().toLowerCase() === userName)
      );

      if (matched) {
        setSelectedCreatorName(matched.name);
      } else if (list.length > 0) {
        setSelectedCreatorName(list[0].name);
      }
    };

    initCreators();
  }, [currentUser]);

  const fetchCreatorStudioData = useCallback(async (targetName: string) => {
    if (!targetName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cleanName = targetName.trim();

      // 1. Creator Row from series_creators
      const { data: cRow } = await supabase
        .from('series_creators')
        .select('*')
        .ilike('name', cleanName)
        .maybeSingle();

      setCreatorProfile(cRow || { name: cleanName });

      // 2. Creator Tips & Fan Mail
      const { data: tipsData } = await supabase
        .from('creator_tips')
        .select('*')
        .ilike('creator_name', cleanName)
        .order('created_at', { ascending: false });

      setTips(tipsData || []);

      // 3. Active Bingo Book Autograph PIN
      const { data: pinData } = await supabase
        .from('bingo_codes')
        .select('*')
        .ilike('creator_name', cleanName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setBingoPin(pinData?.code || pinData?.pin || '');

      // 4. Creator Signature Vault Status
      const { data: sigData } = await supabase
        .from('creator_signatures')
        .select('*')
        .ilike('creator_name', cleanName)
        .maybeSingle();

      setSignatureData(sigData || null);

      // 5. Series & Chapters Telemetry
      const { data: allSeries } = await supabase
        .from('series')
        .select('*');

      const assignedSlugs: string[] = Array.isArray(cRow?.series_slugs) ? cRow.series_slugs : [];

      const mySeries = (allSeries || []).filter((s: any) => {
        const sSlug = String(s.slug || s.id || '').toLowerCase();
        const sAuthor = String(s.author || s.creator || '').toLowerCase();
        const targetLower = cleanName.toLowerCase();
        return (
          assignedSlugs.some(slug => String(slug).toLowerCase() === sSlug) ||
          sAuthor.includes(targetLower)
        );
      });

      setSeriesList(mySeries);

      if (mySeries.length > 0) {
        const seriesIds = mySeries.map((s: any) => s.id);
        const { data: chData } = await supabase
          .from('chapters')
          .select('*')
          .in('series_id', seriesIds)
          .order('chapter_number', { ascending: true });

        setChaptersList(chData || []);
      } else {
        setChaptersList([]);
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

  // Self-serve 5-digit Bingo Book PIN generator for conventions
  const handleGeneratePin = async () => {
    if (!selectedCreatorName) return;
    setGeneratingPin(true);
    try {
      const newPin = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('bingo_codes')
        .upsert(
          [{
            creator_name: selectedCreatorName,
            code: newPin,
            expires_at: expiresAt,
            is_active: true
          }],
          { onConflict: 'creator_name' }
        );

      if (error) {
        // Fallback insert if creator_name is not a unique constraint
        await supabase.from('bingo_codes').insert([{
          creator_name: selectedCreatorName,
          code: newPin,
          expires_at: expiresAt
        }]);
      }

      setBingoPin(newPin);
    } catch (err: any) {
      alert('Could not generate PIN: ' + err.message);
    } finally {
      setGeneratingPin(false);
    }
  };

  // Computed Metrics
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

  const vipReferralLink = `https://www.mangahype.com/?vip=${referralSlug}`;

  const totalTipDollars = useMemo(() => {
    return tips.reduce((acc, row) => {
      const amt = Number(row.amount_cents ? row.amount_cents / 100 : row.amount || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [tips]);

  const totalSeriesHypes = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + Number(s.total_hypes || s.hypes || 0), 0);
  }, [seriesList]);

  const totalChapterViews = useMemo(() => {
    return chaptersList.reduce((acc, c) => acc + Number(c.views || c.likes || c.total_hypes || 0), 0);
  }, [chaptersList]);

  return (
    <div className="min-h-screen bg-black/90 text-white pb-32 pt-6 px-4 sm:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Top Navigation & Role Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800">
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
                isCoreTier
                  ? 'bg-[#fe9a00]/20 text-[#fe9a00] border-[#fe9a00]/50'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {userRole === 'staff' || currentUser?.is_admin
                  ? 'Staff / Core Partner ($10/Sale)'
                  : userRole === 'core_creator'
                  ? 'Core Creator ($10/Sale)'
                  : 'Official Creator ($5/Sale)'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-bold mt-1">
              Real-time series telemetry, direct fan tips, autograph PINs & VIP affiliate links
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Staff / Admin Switcher to Preview Any Creator */}
          {(isStaffOrAdmin || allCreators.length > 1) && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Eye className="w-4 h-4 text-[#fe9a00] shrink-0" />
              <select
                value={selectedCreatorName}
                onChange={(e) => setSelectedCreatorName(e.target.value)}
                disabled={!isStaffOrAdmin && Boolean(currentUser?.linked_creator_name)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                title="Creator Profile"
              >
                {allCreators.map((c: any) => (
                  <option key={c.id || c.name} value={c.name} className="bg-zinc-950 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchCreatorStudioData(selectedCreatorName)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-[#fe9a00] hover:border-[#fe9a00] transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#fe9a00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total Fan Tips */}
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Direct Fan Tips</span>
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
                  Payout Pending Setup
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: VIP Affiliate Commission Rate */}
        <div className="bg-zinc-950/90 border border-[#fe9a00]/40 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(254,154,0,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">VIP Annual Rev-Share</span>
            <div className="w-8 h-8 rounded-lg bg-[#fe9a00]/10 border border-[#fe9a00]/30 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#fe9a00]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic text-white">
              ${commissionPerSale}.00 <span className="text-xs font-bold text-zinc-400 not-italic">/ $20 Sub</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">
              Fans auto-unlock your Card Skin + Bingo Signature!
            </p>
          </div>
        </div>

        {/* Card 3: Total Series Hypes */}
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

        {/* Card 4: Live Bingo Book Autograph PIN */}
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

      {/* VIP Referral Link & Code Sharing Hub */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-[#fe9a00]/50 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
              <Sparkles className="w-3.5 h-3.5" /> Creator VIP Annual Bundle Link
            </div>
            <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-white">
              Earn ${commissionPerSale} Per Annual Subscriber + Gift Your Exclusive Skin & Autograph
            </h2>
            <p className="text-xs text-zinc-400 font-bold leading-relaxed">
              Every fan who subscribes to the $20 Annual Plan using your link or referral code automatically receives your exclusive Digital Hype Card Skin and unlocks your Bingo Book signature.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* Referral Code Box */}
            <div className="bg-black border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Referral Code</span>
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

            {/* Referral Link Box */}
            <div className="bg-black border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="max-w-[210px] sm:max-w-[240px] truncate">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Direct VIP Link</span>
                <span className="text-xs font-mono font-bold text-[#fe9a00] truncate block">{vipReferralLink}</span>
              </div>
              <button
                onClick={() => copyToClipboard(vipReferralLink, 'link')}
                className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Series Telemetry + Fan Mail Wall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Series & Chapter Telemetry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#fe9a00]" />
                <h3 className="text-base font-black italic uppercase tracking-wider text-white">
                  My Series & Chapter Telemetry
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {seriesList.length} Active Series
              </span>
            </div>

            {seriesList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                No series linked to "{selectedCreatorName}" yet. An admin can link your creator name in the User Directory.
              </div>
            ) : (
              <div className="space-y-4">
                {seriesList.map((series: any) => {
                  const sChapters = chaptersList.filter((c: any) => c.series_id === series.id);
                  return (
                    <div key={series.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-3">
                          {series.cover_url && (
                            <img
                              src={series.cover_url}
                              alt={series.title}
                              className="w-12 h-16 object-cover rounded-lg border border-zinc-700 shrink-0"
                            />
                          )}
                          <div>
                            <h4 className="text-sm font-black italic uppercase text-white">{series.title}</h4>
                            <p className="text-[10px] font-bold text-zinc-400">
                              {sChapters.length} Published Chapter{sChapters.length === 1 ? '' : 's'} • Genre: {series.genre || 'Manga'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-black border border-zinc-800 px-3 py-1.5 rounded-lg text-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Total Hypes</span>
                            <span className="text-xs font-black text-[#fe9a00] flex items-center justify-center gap-1">
                              <Flame className="w-3 h-3" /> {Number(series.total_hypes || series.hypes || 0).toLocaleString()}
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
                          {sChapters.map((ch: any) => (
                            <div
                              key={ch.id}
                              className="bg-black/60 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-zinc-200 truncate">
                                Ch. {ch.chapter_number}: {ch.title || `Chapter ${ch.chapter_number}`}
                              </span>
                              <span className="text-[10px] font-black text-[#fe9a00] flex items-center gap-1 shrink-0 ml-2">
                                <Flame className="w-3 h-3" /> {Number(ch.total_hypes || ch.likes || 0)}
                              </span>
                            </div>
                          ))}
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
                const amount = Number(t.amount_cents ? t.amount_cents / 100 : t.amount || 0);
                return (
                  <div key={t.id || idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        {t.fan_username || t.sender_name || 'Saturday AM Fan'}
                      </span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        +${amount.toFixed(2)}
                      </span>
                    </div>
                    {t.message && (
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-black/50 p-2.5 rounded-lg border border-zinc-800/80">
                        "{t.message}"
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
    </div>
  );
};