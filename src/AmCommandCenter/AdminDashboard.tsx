import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { FrameMaker } from './FrameMaker'; 
import { ModerationDashboard } from './ModerationDashboard';
import { UserManager } from './UserManager';
import { CreatorPayoutTracker } from './CreatorPayoutTracker';
import { supabase } from '../supabase';
import { Bell, Send, BookOpen, Star, Sparkles, Newspaper, Key, Trash2, Mic, PenTool, XCircle, Link as LinkIcon, LineChart, CreditCard, Flame, Gift, Settings2, Users, ShieldAlert, Download, Loader2, Eye, EyeOff, Search, Tag, ArrowUpDown, Mail, MapPin, Phone, Calendar } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const useUnsavedWarning = (hasUnsavedChanges: boolean) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
};

// --- GLOBAL CREATOR VISIBILITY MANAGER ---
const CreatorVisibilityManager = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('series_creators')
        .select('*')
        .order('name', { ascending: true });

      if (data) {
        const unique = new Map<string, any>();
        data.forEach((row: any) => {
          if (!row.name) return;
          const key = row.name.trim();
          if (!unique.has(key)) {
            unique.set(key, {
              name: key,
              role: row.role || 'Creator',
              avatar_url: row.avatar_url,
              is_visible: row.is_visible !== false,
              series_slugs: [row.series_slug]
            });
          } else {
            const existing = unique.get(key)!;
            if (row.is_visible === false) existing.is_visible = false;
            if (!existing.series_slugs.includes(row.series_slug)) {
              existing.series_slugs.push(row.series_slug);
            }
          }
        });
        setCreators(Array.from(unique.values()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleToggle = async (creator: any) => {
    const nextState = !creator.is_visible;
    setUpdatingName(creator.name);

    try {
      const { error } = await supabase
        .from('series_creators')
        .update({ is_visible: nextState })
        .ilike('name', creator.name.trim());

      if (error) throw error;
      setCreators(prev => prev.map(c => c.name === creator.name ? { ...c, is_visible: nextState } : c));
    } catch (err: any) {
      alert("Failed to update visibility: " + err.message);
    } finally {
      setUpdatingName(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return creators;
    return creators.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));
  }, [creators, search]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Creator Directory</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Toggle creator visibility across the app & Bingo Book</p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
          <Loader2 className="w-6 h-6 animate-spin text-[#fe9a00] mr-2" /> Loading Creators...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-500 text-sm font-bold italic py-8 text-center">No creators found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto custom-scrollbar pr-2">
          {filtered.map((c) => {
            const isUpdating = updatingName === c.name;

            return (
              <div 
                key={c.name}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  c.is_visible 
                    ? 'bg-black border-zinc-800' 
                    : 'bg-red-950/20 border-red-900/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
                    <img 
                      src={c.avatar_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'} 
                      alt={c.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-xs uppercase tracking-wider text-white truncate">{c.name}</h4>
                    <span className="text-[9px] text-[#fe9a00] font-bold uppercase tracking-widest block truncate">{c.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(c)}
                  disabled={isUpdating}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shrink-0 ${
                    c.is_visible
                      ? 'bg-green-950/40 border border-green-800 text-green-400 hover:bg-green-900/60'
                      : 'bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50'
                  }`}
                >
                  {isUpdating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : c.is_visible ? (
                    <><Eye className="w-3 h-3" /> Visible</>
                  ) : (
                    <><EyeOff className="w-3 h-3" /> Hidden</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- HYPE ECONOMY MANAGER ---
const HypeManager = ({ setIsDirty }: any) => {
  const [settings, setSettings] = useState({
    free_allowance: 1,
    premium_allowance: 3,
    refill_period: 'weekly',
    shop_multiplier: 10,
  });
  
  const [airdrop, setAirdrop] = useState({ amount: 0, target: 'specific', username: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isBlasting, setIsBlasting] = useState(false);

  const [leaderboardResetConfirm, setLeaderboardResetConfirm] = useState('');
  const [isResettingLeaderboards, setIsResettingLeaderboards] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setSettings({
          free_allowance: data.free_hype_allowance ?? data.free_tier_hypes ?? 1,
          premium_allowance: data.premium_hype_allowance ?? data.premium_tier_hypes ?? 3,
          refill_period: data.hype_refill_period || 'weekly',
          shop_multiplier: data.shop_hype_multiplier ?? 10,
        });
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSaveSettings = async (forceSyncNow: boolean) => {
    if (forceSyncNow && !window.confirm(`This will instantly overwrite everyone's current hype balance to ${settings.free_allowance} (Standard) and ${settings.premium_allowance} (Pro). Proceed?`)) return;

    setIsSaving(true);
    
    const { error: settingsError } = await supabase.from('app_settings').upsert({ 
      id: 1, 
      free_hype_allowance: settings.free_allowance,
      premium_hype_allowance: settings.premium_allowance,
      free_tier_hypes: settings.free_allowance,
      premium_tier_hypes: settings.premium_allowance,
      hype_refill_period: settings.refill_period,
      shop_hype_multiplier: settings.shop_multiplier
    });
    
    if (settingsError) {
      alert("Error saving Hype settings: " + settingsError.message);
      setIsSaving(false);
      return;
    }

    if (forceSyncNow) {
      try {
        await supabase.from('profiles').update({ hypes_remaining: settings.free_allowance }).eq('is_premium', false);
        await supabase.from('profiles').update({ hypes_remaining: settings.premium_allowance }).eq('is_premium', true);
        alert(`SUCCESS! Rules saved and all user wallets synced to ${settings.free_allowance} (Free) / ${settings.premium_allowance} (Pro).`);
      } catch (err: any) {
        alert("Error syncing user balances: " + err.message);
      }
    } else {
      alert("Hype Rules Updated! They will apply automatically on the next scheduled refill.");
    }
    
    setIsDirty(false);
    setIsSaving(false);
  };

  const handleAirdrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (airdrop.amount <= 0) return alert("Amount must be greater than zero.");
    if (!window.confirm(`Are you sure you want to blast ${airdrop.amount} Hypes to ${airdrop.target === 'all' ? 'EVERYONE' : airdrop.username}?`)) return;
    
    setIsBlasting(true);
    try {
      if (airdrop.target === 'all') {
        const { error } = await supabase.rpc('airdrop_hypes_global', { hype_amount: airdrop.amount });
        if (error) throw error;
      } else {
        const { data: user, error: fetchErr } = await supabase.from('profiles').select('id, hypes_remaining').ilike('username', airdrop.username.trim()).maybeSingle();
        if (fetchErr || !user) throw new Error("User not found!");
        
        const { error: updateErr } = await supabase.from('profiles').update({ hypes_remaining: (user.hypes_remaining || 0) + airdrop.amount }).eq('id', user.id);
        if (updateErr) throw updateErr;
      }
      alert("Hypes Airdropped Successfully!");
      setAirdrop({ amount: 0, target: 'specific', username: '' });
    } catch (err: any) {
      alert("Error dropping hypes: " + err.message);
    }
    setIsBlasting(false);
  };

  const handleLeaderboardReset = async () => {
    if (leaderboardResetConfirm !== 'RESET LEADERBOARDS') return;
    if (!window.confirm("WARNING: You are about to wipe all current weekly leaderboard progress. This cannot be undone. Are you absolutely sure?")) return;
    
    setIsResettingLeaderboards(true);
    try {
      const { error } = await supabase.rpc('reset_leaderboards');
      if (error) throw error;
      alert("SUCCESS: All leaderboards have been wiped clean.");
      setLeaderboardResetConfirm('');
    } catch (err: any) {
      alert("Leaderboard Reset Failed: " + err.message);
    }
    setIsResettingLeaderboards(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg animate-fade-in-up max-w-4xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Flame className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Hype Economy</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-black p-6 rounded-xl border border-zinc-800 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Settings2 className="w-4 h-4 text-[#fe9a00]" /> Allowance Rules
          </h3>
          
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Standard Refill Amount (Weekly)</label>
            <input 
              type="number" min="0" 
              value={settings.free_allowance} 
              onChange={(e) => handleChange('free_allowance', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Pro Refill Amount (Weekly)</label>
            <input 
              type="number" min="0" 
              value={settings.premium_allowance} 
              onChange={(e) => handleChange('premium_allowance', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Refill Schedule</label>
            <select 
              value={settings.refill_period} 
              onChange={(e) => handleChange('refill_period', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors cursor-pointer"
            >
              <option value="weekly">Every Saturday (Weekly)</option>
              <option value="monthly">1st of the Month (Monthly)</option>
              <option value="never">Manual Only (Events)</option>
            </select>
          </div>
        </div>

        <div className="bg-black p-6 rounded-xl border border-zinc-800 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
            <CreditCard className="w-4 h-4 text-[#fe9a00]" /> Commerce Multipliers
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
            Set the reward ratio for Shopify merch purchases. (Requires active Shopify Webhook).
          </p>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Bonus Hypes per $1 Spent</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" min="0" 
                value={settings.shop_multiplier} 
                onChange={(e) => handleChange('shop_multiplier', Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] text-xl font-black focus:border-[#fe9a00] outline-none transition-colors"
              />
              <span className="text-zinc-500 font-black uppercase tracking-widest text-xs">Hypes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button onClick={() => handleSaveSettings(false)} disabled={isSaving} className="flex-1 bg-zinc-800 text-white hover:text-black border border-zinc-700 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#fe9a00] transition-colors shadow-lg">
          {isSaving ? 'UPDATING...' : 'Save Rules (Future)'}
        </button>
        <button onClick={() => handleSaveSettings(true)} disabled={isSaving} className="flex-1 bg-[#fe9a00] text-black border border-[#fe9a00] font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">
          {isSaving ? 'UPDATING...' : 'Save & Sync All Instantly'}
        </button>
      </div>

      <form onSubmit={handleAirdrop} className="bg-black p-6 rounded-xl border border-[#fe9a00]/30 shadow-[0_0_30px_rgba(254,154,0,0.1)] mb-8">
        <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6">
          <Gift className="w-4 h-4" /> Live Event & Prize Airdrop
        </h3>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Hype Amount</label>
            <input 
              type="number" min="1" required
              value={airdrop.amount} 
              onChange={(e) => setAirdrop(prev => ({ ...prev, amount: Number(e.target.value) }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] text-xl font-black focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Target Audience</label>
            <select 
              value={airdrop.target} 
              onChange={(e) => setAirdrop(prev => ({ ...prev, target: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors cursor-pointer"
            >
              <option value="specific">Specific User (Prize Winner)</option>
              <option value="all">Global (All Registered Users)</option>
            </select>
          </div>

          {airdrop.target === 'specific' && (
            <div className="flex-1 animate-fade-in">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Winner Username</label>
              <input 
                type="text" required
                value={airdrop.username} 
                onChange={(e) => setAirdrop(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter exact username..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
              />
            </div>
          )}
        </div>

        <button type="submit" disabled={isBlasting} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#fe9a00] to-yellow-500 hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <Send className="w-5 h-5" />{isBlasting ? 'Blasting...' : 'Blast Hypes Now'}
        </button>
      </form>

      {/* Leaderboards Kill Switch */}
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 relative z-10">
          <h3 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-2 border-b border-red-900/50 pb-3 mb-3">
            <XCircle className="w-4 h-4" /> Reset Leaderboards
          </h3>
          <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest leading-relaxed">
            This wipes all aggregated hype tracking across Series, Creators, Chapters, and Characters for the current cycle.
          </p>
        </div>
        <div className="flex flex-col gap-3 relative z-10 w-full md:w-auto min-w-[250px]">
          <input 
            type="text" 
            placeholder="Type 'RESET LEADERBOARDS'"
            value={leaderboardResetConfirm}
            onChange={(e) => setLeaderboardResetConfirm(e.target.value)}
            className="w-full bg-black border border-red-900/50 rounded-lg p-4 text-red-500 text-[10px] font-black tracking-widest focus:border-red-500 outline-none text-center transition-colors placeholder:text-red-900/40"
          />
          <button 
            onClick={handleLeaderboardReset}
            disabled={leaderboardResetConfirm !== 'RESET LEADERBOARDS' || isResettingLeaderboards}
            className="w-full py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-lg hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 flex items-center justify-center text-xs"
          >
            {isResettingLeaderboards ? 'WIPING...' : 'WIPE LEADERBOARDS'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- THIRD-PARTY INTEGRATIONS EDITOR ---
const IntegrationsManager = ({ setIsDirty }: any) => {
  const [settings, setSettings] = useState({
    stripe_public_key: '',
    shopify_domain: '',
    admob_id: '',
    applixr_id: '',
    google_analytics_id: '',
    meta_pixel_id: '',
    tiktok_pixel_id: '',
    openai_api_key: '',
    resend_api_key: '',
    moderator_emails: '',
    moderator_email_mode: 'flagged_only'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setSettings({
          stripe_public_key: data.stripe_public_key || '',
          shopify_domain: data.shopify_domain || '',
          admob_id: data.admob_id || '',
          applixr_id: data.applixr_id || '',
          google_analytics_id: data.google_analytics_id || '',
          meta_pixel_id: data.meta_pixel_id || '',
          tiktok_pixel_id: data.tiktok_pixel_id || '',
          openai_api_key: data.openai_api_key || '',
          resend_api_key: data.resend_api_key || '',
          moderator_emails: data.moderator_emails ? data.moderator_emails.join(', ') : '',
          moderator_email_mode: data.moderator_email_mode || 'flagged_only'
        });
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const emailsArray = settings.moderator_emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const payloadToSave = { 
      id: 1, 
      ...settings,
      moderator_emails: emailsArray 
    };

    const { error } = await supabase.from('app_settings').upsert(payloadToSave);
    setIsSaving(false);
    if (error) alert("Error saving integrations: " + error.message);
    else { alert("Integrations Updated Successfully!"); setIsDirty(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg animate-fade-in-up max-w-4xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <LinkIcon className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Third-Party Integrations</h2>
      </div>

      <div className="bg-[#fe9a00]/10 p-6 rounded-xl border border-[#fe9a00]/30 mb-8 space-y-6">
        <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2 border-b border-[#fe9a00]/30 pb-3">
          <ShieldAlert className="w-4 h-4" /> AI Moderation & Email Alerts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Moderator Emails (Comma Separated)</label>
            <input 
              type="text" 
              placeholder="admin@saturdayam.com, mod2@saturdayam.com" 
              value={settings.moderator_emails} 
              onChange={(e) => handleChange('moderator_emails', e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Email Dispatch Mode</label>
            <select 
              value={settings.moderator_email_mode} 
              onChange={(e) => handleChange('moderator_email_mode', e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors cursor-pointer"
            >
              <option value="flagged_only">Flagged Comments Only (Recommended)</option>
              <option value="all">All Comments (Flagged & Clean)</option>
              <option value="clean_only">Non-Flagged Comments Only</option>
              <option value="off">Muted (Off)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">OpenAI API Key (Context Moderation)</label>
            <input 
              type="password" 
              placeholder="sk-..." 
              value={settings.openai_api_key} 
              onChange={(e) => handleChange('openai_api_key', e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Resend API Key (Email Alerts)</label>
            <input 
              type="password" 
              placeholder="re_..." 
              value={settings.resend_api_key} 
              onChange={(e) => handleChange('resend_api_key', e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
          <CreditCard className="w-4 h-4 text-[#fe9a00]" /> E-Commerce & Ads
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Stripe Publishable Key</label>
            <input 
              type="text" 
              placeholder="pk_live_..." 
              value={settings.stripe_public_key} 
              onChange={(e) => handleChange('stripe_public_key', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Shopify Store URL (Live Feed)</label>
            <input 
              type="text" 
              placeholder="shopsaturdayam.com" 
              value={settings.shopify_domain} 
              onChange={(e) => handleChange('shopify_domain', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">AdMob App ID</label>
            <input 
              type="text" 
              placeholder="ca-app-pub-..." 
              value={settings.admob_id} 
              onChange={(e) => handleChange('admob_id', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Applixr Tag ID</label>
            <input 
              type="text" 
              placeholder="Enter Applixr ID..." 
              value={settings.applixr_id} 
              onChange={(e) => handleChange('applixr_id', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
          <LineChart className="w-4 h-4 text-[#fe9a00]" /> Analytics & Pixels
        </h3>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Google Analytics (G-Tag / GAM ID)</label>
          <input 
            type="text" 
            placeholder="G-XXXXXXXXXX" 
            value={settings.google_analytics_id} 
            onChange={(e) => handleChange('google_analytics_id', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Meta (Facebook) Pixel ID</label>
          <input 
            type="text" 
            placeholder="Enter your Meta Pixel ID..." 
            value={settings.meta_pixel_id} 
            onChange={(e) => handleChange('meta_pixel_id', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">TikTok Pixel ID</label>
          <input 
            type="text" 
            placeholder="Enter your TikTok Pixel ID..." 
            value={settings.tiktok_pixel_id} 
            onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none transition-colors"
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">
        {isSaving ? 'UPDATING...' : 'Save Integrations'}
      </button>
    </div>
  );
};

type LedgerSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'email_asc'
  | 'email_desc'
  | 'code_asc'
  | 'code_desc';

// --- CONSOLIDATED 1-YEAR ANNUAL PRO CODE MANAGER (BATCH + CUSTOM BRANDED + SHOPIFY) ---
const PromoCodeManager = () => {
  const [batchCodes, setBatchCodes] = useState<any[]>([]);
  const [brandedCodes, setBrandedCodes] = useState<any[]>([]);

  // 1. Batch Generator State
  const [batchSize, setBatchSize] = useState<number | ''>('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  // 2. Custom-Branded Annual Code State
  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expireDays, setExpireDays] = useState(365);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // 3. Unified Ledger Filter, Sort & Distribution State (Default: Newest Purchase First)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'batch' | 'branded'>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState<LedgerSortOption>('date_desc');
  const [pendingSold, setPendingSold] = useState<Record<string, boolean>>({});
  const [isSavingLedger, setIsSavingLedger] = useState(false);

  const fetchAllAnnualCodes = async () => {
    // Keep all existing 1-Year Batch Codes intact
    const { data: pData } = await supabase.rpc('fetch_premium_ledger');
    if (pData) setBatchCodes(pData);

    // Fetch custom-branded & Shopify auto-minted codes (newest first by default)
    const { data: cData } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (cData) setBrandedCodes(cData);
  };

  useEffect(() => {
    fetchAllAnnualCodes();
  }, []);

  // --- BATCH CSV GENERATION ---
  const downloadCSV = (codes: { generated_code: string }[]) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Premium Code\n"
      + codes.map(c => c.generated_code).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Premium_Codes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchGenerate = async () => {
    if (!batchSize || batchSize <= 0) return;
    setBatchLoading(true);
    setBatchMessage('');

    const { data, error } = await supabase.rpc('generate_premium_codes', {
      batch_size: Number(batchSize)
    });

    if (error) {
      console.error(error);
      setBatchMessage(`Error: ${error.message}`);
      setBatchLoading(false);
      return;
    }

    if (data && data.length > 0) {
      downloadCSV(data);
      setBatchMessage(`Successfully generated ${data.length} codes! CSV downloaded.`);
      setBatchSize('');
      fetchAllAnnualCodes();
    }
    setBatchLoading(false);
  };

  // --- CUSTOM-BRANDED 1-YEAR CODE CREATION ---
  const generateBrandedSuggestion = () => {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCustomCode(`SATAM-PRO-${suffix}`);
  };

  const handleCreateCustomAnnual = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customCode.trim().toUpperCase().replace(/\s+/g, '-');
    if (!clean) return alert("Please enter a custom-branded code.");

    setIsCreatingCustom(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expireDays || 365));

    // Always force tier: 'premium' so custom-branded codes unlock 1-Year Annual Pro
    const { error } = await supabase.from('promo_codes').insert([{
      code: clean,
      tier: 'premium',
      max_uses: Number(maxUses) || 1,
      expires_at: expiresAt.toISOString()
    }]);

    setIsCreatingCustom(false);

    if (error) {
      alert("Error creating custom annual code: " + error.message);
    } else {
      alert(`Custom 1-Year Pro Code "${clean}" created!`);
      setCustomCode('');
      setMaxUses(1);
      setExpireDays(365);
      fetchAllAnnualCodes();
    }
  };

  const handleDeleteBranded = async (id: string, codeName: string) => {
    if (!window.confirm(`Permanently delete custom code "${codeName}"?`)) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (!error) fetchAllAnnualCodes();
  };

  const handleSaveLedger = async () => {
    const changes = Object.entries(pendingSold);
    if (changes.length === 0) return;

    setIsSavingLedger(true);
    for (const [code, is_sold] of changes) {
      await supabase.rpc('update_premium_code_sold', { p_code: code, p_is_sold: is_sold });
    }
    setPendingSold({});
    await fetchAllAnnualCodes();
    setIsSavingLedger(false);
  };

  const hasPendingChanges = Object.keys(pendingSold).length > 0;

  const filteredBatchCodes = useMemo(() => {
    const q = ledgerSearch.trim().toUpperCase();
    const base = !q
      ? batchCodes
      : batchCodes.filter(c => String(c.code || '').toUpperCase().includes(q));

    return [...base].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.redeemed_at ? new Date(a.redeemed_at).getTime() : 0);
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.redeemed_at ? new Date(b.redeemed_at).getTime() : 0);
      switch (ledgerSort) {
        case 'date_asc':
          return timeA - timeB;
        case 'code_asc':
          return String(a.code || '').localeCompare(String(b.code || ''));
        case 'code_desc':
          return String(b.code || '').localeCompare(String(a.code || ''));
        default:
          return timeB - timeA;
      }
    });
  }, [batchCodes, ledgerSearch, ledgerSort]);

  const filteredBrandedCodes = useMemo(() => {
    const q = ledgerSearch.trim().toUpperCase();
    const base = !q
      ? brandedCodes
      : brandedCodes.filter(c =>
          String(c.code || '').toUpperCase().includes(q) ||
          String(c.buyer_name || '').toUpperCase().includes(q) ||
          String(c.buyer_email || '').toUpperCase().includes(q) ||
          String(c.buyer_phone || '').toUpperCase().includes(q) ||
          String(c.buyer_address || '').toUpperCase().includes(q) ||
          String(c.order_number || '').toUpperCase().includes(q)
        );

    const getName = (c: any) => String(c.buyer_name || c.code || 'zzzz').trim().toLowerCase();
    const getEmail = (c: any) => String(c.buyer_email || c.code || 'zzzz').trim().toLowerCase();
    const getTime = (c: any) => (c.created_at ? new Date(c.created_at).getTime() : 0);

    return [...base].sort((a, b) => {
      switch (ledgerSort) {
        case 'date_desc':
          return getTime(b) - getTime(a);
        case 'date_asc':
          return getTime(a) - getTime(b);
        case 'name_asc':
          return getName(a).localeCompare(getName(b));
        case 'name_desc':
          return getName(b).localeCompare(getName(a));
        case 'email_asc':
          return getEmail(a).localeCompare(getEmail(b));
        case 'email_desc':
          return getEmail(b).localeCompare(getEmail(a));
        case 'code_asc':
          return String(a.code || '').localeCompare(String(b.code || ''));
        case 'code_desc':
          return String(b.code || '').localeCompare(String(a.code || ''));
        default:
          return getTime(b) - getTime(a);
      }
    });
  }, [brandedCodes, ledgerSearch, ledgerSort]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              1-Year Annual Pro Codes
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Generate store batch codes or custom-branded annual subscription keys
            </p>
          </div>
        </div>
      </div>

      {/* TOP GENERATORS GRID: CUSTOM BRANDED + BATCH CSV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* 1. CREATE CUSTOM-BRANDED 1-YEAR CODE */}
        <form onSubmit={handleCreateCustomAnnual} className="bg-black border border-[#fe9a00]/40 shadow-[0_0_30px_rgba(254,154,0,0.08)] p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <Tag className="w-4 h-4" /> Custom-Branded Annual Code
            </h3>
            <p className="text-zinc-400 text-xs font-bold mb-5 leading-relaxed">
              Create a memorable, custom-branded 1-Year Pro code for partners, conventions, or VIPs (e.g., <span className="text-white">APPLEBLACK-VIP</span> or <span className="text-white">NYCC-2026</span>).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                  Branded Code Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. SATAM-VIP-2026"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl text-[#fe9a00] px-4 py-3 font-black tracking-widest text-sm focus:outline-none focus:border-[#fe9a00]"
                  />
                  <button
                    type="button"
                    onClick={generateBrandedSuggestion}
                    className="bg-zinc-800 text-zinc-300 hover:text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Suggest
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={maxUses}
                    onChange={e => setMaxUses(Number(e.target.value))}
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                    Valid For (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={expireDays}
                    onChange={e => setExpireDays(Number(e.target.value))}
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreatingCustom || !customCode.trim()}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.25)] disabled:opacity-50 cursor-pointer"
          >
            {isCreatingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {isCreatingCustom ? 'Creating...' : 'Create Branded 1-Year Code'}
          </button>
        </form>

        {/* 2. BATCH GENERATE RANDOM STORE CODES */}
        <div className="bg-black border border-zinc-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <Download className="w-4 h-4 text-[#fe9a00]" /> Batch Generate Store Codes (CSV)
            </h3>
            <p className="text-zinc-400 text-xs font-bold mb-5 leading-relaxed">
              Generate single-use 12-character 1-Year Pro codes (<span className="text-zinc-300 font-mono">XXXX-XXXX-XXXX</span>) in bulk for Shopify fulfillment. Downloads a ready-to-import CSV automatically.
            </p>

            <div>
              <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                Number of Single-Use Codes to Generate
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="Quantity (e.g. 50)"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-900 border border-zinc-700 p-3.5 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-[#fe9a00] transition-colors"
              />
            </div>

            {batchMessage && (
              <p className={`mt-4 text-xs font-bold ${batchMessage.includes('Error') ? 'text-red-500' : 'text-emerald-400'}`}>
                {batchMessage}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={batchLoading || !batchSize}
            className="mt-6 w-full bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {batchLoading ? 'Generating Batch...' : 'Generate & Export CSV'}
          </button>
        </div>

      </div>

      {/* UNIFIED MASTER LEDGER */}
      <div className="bg-black p-6 rounded-xl border border-zinc-800">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#fe9a00]">
                  Master Annual Codes Ledger
                </h3>
                {hasPendingChanges && (
                  <button
                    onClick={handleSaveLedger}
                    disabled={isSavingLedger}
                    className="bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(254,154,0,0.4)] cursor-pointer"
                  >
                    {isSavingLedger ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Distributed Marks'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Shopify & Branded: <strong className="text-white">{brandedCodes.length}</strong></span>
                <span>Batch Codes: <strong className="text-white">{batchCodes.length}</strong></span>
                <span>Redeemed Batch: <strong className="text-emerald-400">{batchCodes.filter(c => c.is_used).length}</strong></span>
                <span>Distributed: <strong className="text-[#fe9a00]">{batchCodes.filter(c => c.is_sold).length}</strong></span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setLedgerFilter('all')}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${ledgerFilter === 'all' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                All ({batchCodes.length + brandedCodes.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('branded')}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${ledgerFilter === 'branded' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                Shopify & Branded ({brandedCodes.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('batch')}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${ledgerFilter === 'batch' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                Batch ({batchCodes.length})
              </button>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, purchaser name, email, order #, address..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white pl-8 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#fe9a00] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={ledgerSort}
                onChange={(e) => setLedgerSort(e.target.value as LedgerSortOption)}
                className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 text-white pl-8 pr-4 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00] cursor-pointer"
                title="Sort Access Keys & Purchases"
              >
                <option value="date_desc">Sort: Newest Purchase First (Default)</option>
                <option value="date_asc">Sort: Oldest Purchase First</option>
                <option value="name_asc">Sort: Purchaser Name (A → Z)</option>
                <option value="name_desc">Sort: Purchaser Name (Z → A)</option>
                <option value="email_asc">Sort: Email Address (A → Z)</option>
                <option value="email_desc">Sort: Email Address (Z → A)</option>
                <option value="code_asc">Sort: Code (A → Z)</option>
                <option value="code_desc">Sort: Code (Z → A)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
          {/* SHOPIFY & CUSTOM-BRANDED ANNUAL CODES */}
          {(ledgerFilter === 'all' || ledgerFilter === 'branded') && filteredBrandedCodes.map((c) => {
            const isExpired = c.expires_at && new Date() > new Date(c.expires_at);
            const isDepleted = c.max_uses && c.times_used >= c.max_uses;
            const isInactive = isExpired || isDepleted;
            const isShopifyOrder = Boolean(c.buyer_email || c.buyer_name || c.order_number);

            return (
              <div
                key={`branded-${c.id}`}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-950 border border-[#fe9a00]/40 p-4 rounded-xl gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="bg-[#fe9a00]/20 text-[#fe9a00] border border-[#fe9a00]/40 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                      {isShopifyOrder ? `Shopify Order ${c.order_number || ''}` : 'Custom Branded • 1-Year Pro'}
                    </span>
                    <h4 className={`font-black tracking-widest text-sm sm:text-base ${isInactive ? 'text-zinc-600 line-through' : 'text-white'}`}>
                      {c.code}
                    </h4>
                    {c.created_at && (
                      <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#fe9a00]" />
                        Purchased: {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* PURCHASER NAME, EMAIL, PHONE & ADDRESS DISPLAY */}
                  {isShopifyOrder && (
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {c.buyer_name && (
                          <span className="text-zinc-300 font-bold">
                            Purchaser: <strong className="text-white">{c.buyer_name}</strong>
                          </span>
                        )}
                        {c.buyer_email && (
                          <span className="text-[#fe9a00] font-bold flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.buyer_email}
                          </span>
                        )}
                        {c.buyer_phone && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3" /> {c.buyer_phone}
                          </span>
                        )}
                      </div>
                      {c.buyer_address && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#fe9a00] shrink-0" />
                          <span>{c.buyer_address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isInactive ? 'text-emerald-400 border-emerald-900 bg-emerald-900/10' : 'text-[#fe9a00] border-[#fe9a00]/40 bg-[#fe9a00]/10'}`}>
                      {isDepleted ? 'CLAIMED / AUTO-UPGRADED' : isExpired ? 'EXPIRED' : 'ACTIVE (UNCLAIMED)'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      Redeemed: <strong className="text-white">{c.times_used || 0} / {c.max_uses || 1}</strong>
                    </span>
                    {c.expires_at && (
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        Expires: {new Date(c.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBranded(c.id, c.code)}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors self-end sm:self-auto cursor-pointer"
                  title="Delete Branded Code"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* EXISTING & NEW 1-YEAR BATCH CODES */}
          {(ledgerFilter === 'all' || ledgerFilter === 'batch') && filteredBatchCodes.map((c) => {
            const statusColor = c.is_used
              ? 'text-zinc-500 border-zinc-800 bg-zinc-900/50'
              : 'text-emerald-500 border-emerald-900 bg-emerald-900/10';
            const isSold = pendingSold[c.code] !== undefined ? pendingSold[c.code] : (c.is_sold || false);

            return (
              <div
                key={`batch-${c.id}`}
                className={`flex flex-col border p-4 rounded-xl gap-2 transition-colors ${
                  isSold && !c.is_used ? 'bg-zinc-900/80 border-[#fe9a00]/30' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSold}
                      onChange={() => setPendingSold(prev => ({ ...prev, [c.code]: !isSold }))}
                      className="w-4 h-4 accent-[#fe9a00] rounded cursor-pointer shrink-0"
                      disabled={c.is_used}
                      title={c.is_used ? "Already redeemed by a user" : "Mark as sold/distributed"}
                    />
                    <h4 className={`font-black tracking-widest text-sm sm:text-base ${c.is_used ? 'text-zinc-600 line-through' : (isSold ? 'text-[#fe9a00]' : 'text-white')}`}>
                      {c.code}
                    </h4>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${statusColor}`}>
                    {c.is_used ? 'REDEEMED' : 'UNUSED'}
                  </span>
                </div>
                {c.is_used && c.redeemed_at && (
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest ml-7">
                    Redeemed: {new Date(c.redeemed_at).toLocaleDateString()}
                  </p>
                )}
                {!c.is_used && isSold && (
                  <p className="text-[9px] text-[#fe9a00]/80 font-bold uppercase tracking-widest ml-7">
                    Marked as Distributed
                  </p>
                )}
              </div>
            );
          })}

          {filteredBatchCodes.length === 0 && filteredBrandedCodes.length === 0 && (
            <p className="text-zinc-500 text-sm font-bold italic text-center py-12">
              No annual codes match your filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const MasterSignatureManager = ({ Dropzone }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [signatures, setSignatures] = useState<any[]>([]);
  const [activePins, setActivePins] = useState<Record<string, string>>({});
  const [creatorName, setCreatorName] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCreators, setDbCreators] = useState<string[]>([]);

  const fetchSignaturesAndPins = async () => {
    const { data: sigs } = await supabase.from('creator_signatures').select('*').order('creator_name', { ascending: true });
    if (sigs) setSignatures(sigs);

    const { data: codes } = await supabase.from('bingo_codes').select('code, creator_name, expires_at');
    if (codes) {
      const pinMap: Record<string, string> = {};
      const now = new Date();
      codes.forEach(c => {
        if (new Date(c.expires_at) > now) {
          pinMap[c.creator_name] = c.code;
        }
      });
      setActivePins(pinMap);
    }
  };

  useEffect(() => { 
    const fetchDbCreators = async () => {
      const { data } = await supabase.from('series_creators').select('name');
      if (data) setDbCreators(data.map((c: any) => c.name));
    };
    fetchDbCreators();
    fetchSignaturesAndPins(); 
  }, []);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map();
    
    dbCreators.forEach((name: string) => {
      if (name && name.trim().length >= 2) {
        uniqueMap.set(name.trim().toLowerCase(), name.trim());
      }
    });

    const processName = (nameInput: any) => {
      if (!nameInput) return;
      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];
      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        if (typeof nameObj === 'object' && nameObj !== null) {
          if (nameObj.is_visible === false) return; 
          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
        }
        if (typeof nameStr !== 'string') return;
        nameStr = nameStr.replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '');
        const splitNames = nameStr.split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);
        splitNames.forEach(rawName => {
          const cName = rawName.trim();
          if (cName.length >= 2) {
            const mapKey = cName.toLowerCase();
            if (!uniqueMap.has(mapKey)) uniqueMap.set(mapKey, cName);
          }
        });
      });
    };

    seriesList.forEach((series: any) => {
      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) processName(series.creators);
      else {
        processName(series.creator_name || series.creator);
        processName(series.writer_name || series.writer || series.author_name);
        processName(series.artist_name || series.artist || series.illustrator);
        processName(series.co_creator_name || series.co_creator);
      }
    });
    return Array.from(uniqueMap.values()).sort((a: any, b: any) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setCreatorName(selectedName);
    
    const existingSig = signatures.find(s => s.creator_name === selectedName);
    if (existingSig) {
      setSignatureUrl(existingSig.signature_url);
    } else {
      setSignatureUrl('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName || !signatureUrl) return alert("Please select a creator and upload a signature image.");
    setIsSubmitting(true);
    const { error } = await supabase.from('creator_signatures').upsert({ creator_name: creatorName.trim(), signature_url: signatureUrl }, { onConflict: 'creator_name' });
    setIsSubmitting(false);

    if (error) alert("Error saving signature: " + error.message);
    else { alert('Signature Vault Updated!'); setCreatorName(''); setSignatureUrl(''); fetchSignaturesAndPins(); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this signature? Fans will no longer be able to claim it.")) return;
    const { error } = await supabase.from('creator_signatures').delete().eq('id', id);
    if (!error) fetchSignaturesAndPins();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <PenTool className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Signature Vault</h2>
      </div>
      <form onSubmit={handleSave} className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4">
        <p className="text-xs text-zinc-400 font-bold mb-4">Upload pre-drawn transparent PNG signatures or sketches.</p>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Select Creator</label>
            <select value={creatorName} onChange={handleCreatorChange} required className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] mb-4 cursor-pointer">
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map((name: string) => <option key={name} value={name}>{name}</option>)}
            </select>
            {signatureUrl && (
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex justify-center items-center">
                <img src={signatureUrl} alt="Preview" className="max-h-32 object-contain" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Upload Transparent PNG</label>
            <Dropzone label={signatureUrl ? "Replace Signature" : "+ Upload PNG"} height="p-6" folderPath="creator-signatures" onUploadComplete={(url: string) => setSignatureUrl(url)} />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting || !signatureUrl || !creatorName} className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <PenTool className="w-4 h-4" />{isSubmitting ? 'Saving...' : 'Save to Vault'}
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {signatures.length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold italic col-span-full">No signatures in the vault yet.</p>
        ) : (
          signatures.map((sig) => (
            <div key={sig.id} className="bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col group relative">
              <div className="bg-zinc-900 relative aspect-[3/1] p-4 flex items-center justify-center border-b border-zinc-800">
                <img src={sig.signature_url} className="w-full h-full object-contain" alt="Signature" />
                
                {activePins[sig.creator_name] && (
                  <div className="absolute top-2 left-2 bg-[#fe9a00] text-black text-[10px] font-black tracking-widest px-2 py-0.5 rounded shadow-lg z-10 uppercase">
                    PIN: {activePins[sig.creator_name]}
                  </div>
                )}

                <button onClick={() => handleDelete(sig.id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-lg z-20" title="Delete Signature"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="p-3 text-center"><h4 className="font-black text-xs text-white uppercase tracking-widest truncate">{sig.creator_name}</h4></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const BingoCodeManager = () => {
  const { seriesList = [] } = useSeriesData();
  const [codes, setCodes] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [duration, setDuration] = useState('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCreators, setDbCreators] = useState<string[]>([]);

  const fetchCodes = async () => {
    const { data } = await supabase.from('bingo_codes').select('*').order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  useEffect(() => { 
    const fetchDbCreators = async () => {
      const { data } = await supabase.from('series_creators').select('name');
      if (data) setDbCreators(data.map((c: any) => c.name));
    };
    fetchDbCreators();
    fetchCodes(); 
  }, []);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map();

    dbCreators.forEach((name: string) => {
      if (name && name.trim().length >= 2) {
        uniqueMap.set(name.trim().toLowerCase(), name.trim());
      }
    });

    const processName = (nameInput: any) => {
      if (!nameInput) return;
      const namesArray = Array.isArray(nameInput) ? nameInput.flat(Infinity) : [nameInput];
      namesArray.forEach((nameObj: any) => {
        let nameStr = nameObj;
        if (typeof nameObj === 'object' && nameObj !== null) {
          if (nameObj.is_visible === false) return; 
          nameStr = nameObj.name || nameObj.fullName || nameObj.value || nameObj.text || Object.values(nameObj)[0];
        }
        if (typeof nameStr !== 'string') return;
        nameStr = nameStr.replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '');
        const splitNames = nameStr.split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);
        splitNames.forEach(rawName => {
          const cName = rawName.trim();
          if (cName.length >= 2) {
            const mapKey = cName.toLowerCase();
            if (!uniqueMap.has(mapKey)) uniqueMap.set(mapKey, cName);
          }
        });
      });
    };

    seriesList.forEach((series: any) => {
      if (series.creators && Array.isArray(series.creators) && series.creators.length > 0) processName(series.creators);
      else {
        processName(series.creator_name || series.creator);
        processName(series.writer_name || series.writer || series.author_name);
        processName(series.artist_name || series.artist || series.illustrator);
        processName(series.co_creator_name || series.co_creator);
      }
    });
    return Array.from(uniqueMap.values()).sort((a: any, b: any) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName) return alert("Please select a Creator.");
    setIsSubmitting(true);
    
    const pin = Math.floor(10000 + Math.random() * 90000).toString(); 
    
    let expiresAt = new Date();
    if (duration === '30m') expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    else if (duration === '1h') expiresAt.setHours(expiresAt.getHours() + 1);
    else if (duration === '12h') expiresAt.setHours(expiresAt.getHours() + 12);
    else if (duration === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
    else if (duration === '72h') expiresAt.setHours(expiresAt.getHours() + 72);
    else if (duration === 'permanent') expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    
    const { error } = await supabase.from('bingo_codes').insert([{
      code: pin,
      creator_name: creatorName.trim(),
      event_name: 'Standard Unlock', 
      max_uses: 999999, 
      expires_at: expiresAt.toISOString()
    }]);
    
    setIsSubmitting(false);
    if (error) alert("Error creating PIN: " + error.message);
    else { alert(`Code Generated: ${pin}`); setCreatorName(''); fetchCodes(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this PIN? No one will be able to claim it anymore.")) return;
    const { error } = await supabase.from('bingo_codes').delete().eq('id', id);
    if (!error) fetchCodes();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Mic className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Bingo Codes</h2>
      </div>

      <form onSubmit={handleCreate} className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Select Creator</label>
            <select 
              value={creatorName} 
              onChange={e => setCreatorName(e.target.value)} 
              required 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map((name: string) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Duration</label>
            <select 
              value={duration} 
              onChange={e => setDuration(e.target.value)} 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00] cursor-pointer"
            >
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="72h">72 Hours</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50">
          <Key className="w-4 h-4" />{isSubmitting ? 'Generating...' : 'Generate 5-Digit PIN'}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 sticky top-0 bg-zinc-900 py-2">Active PINs</h3>
        {codes.length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold italic">No active PINs found.</p>
        ) : (
          codes.map((c) => {
            const isExpired = new Date() > new Date(c.expires_at);
            const statusColor = isExpired ? 'text-red-500 border-red-900 bg-red-900/10' : 'text-[#fe9a00] border-[#fe9a00]/50 bg-[#fe9a00]/10';

            return (
              <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black border border-zinc-800 p-4 rounded-xl gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black tracking-[0.5em] text-white text-2xl">{c.code}</h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${statusColor}`}>
                      {isExpired ? 'EXPIRED' : 'LIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Creator: <span className="text-[#fe9a00]">{c.creator_name}</span></span>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2 font-mono">Expires: {new Date(c.expires_at).getFullYear() > 2090 ? 'Never (Permanent)' : new Date(c.expires_at).toLocaleString()}</p>
                </div>
                
                <button 
                  onClick={() => handleDelete(c.id)} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-950/30 text-red-500 hover:text-white hover:bg-red-600 border border-red-900/50 hover:border-red-600 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest mt-4 sm:mt-0 shadow-sm"
                >
                  <XCircle className="w-4 h-4" /> Revoke PIN
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

const NotificationCenter = () => {
  const { seriesList = [] } = useSeriesData();
  const [notifType, setNotifType] = useState<'chapter' | 'feature' | 'news' | 'custom'>('chapter');
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState('');
  const [title, setTitle] = useState('New Chapter Drop!');
  const [message, setMessage] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: 'chapter' | 'feature' | 'news' | 'custom') => {
    setNotifType(type); setSelectedSeriesSlug('');
    if (type === 'feature') { setTitle('App Feature Update'); setMessage(''); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget(''); } 
    else if (type === 'news') { setTitle('Saturday AM News'); setMessage('News from Saturday AM'); setThumbnailUrl('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'); setLinkTarget('news'); } 
    else if (type === 'chapter') { setTitle('New Chapter Drop!'); setMessage(''); setThumbnailUrl(''); setLinkTarget(''); } 
    else { setTitle(''); setMessage(''); setThumbnailUrl(''); setLinkTarget(''); }
  };

  const handleSeriesSelect = (slug: string) => {
    setSelectedSeriesSlug(slug);
    const series = seriesList.find((s: any) => s.slug === slug);
    if (series) { setMessage(`Chapter Drop: NEW ${series.title}!`); setThumbnailUrl(series.cover_url || ''); setLinkTarget(series.slug); } 
    else { setMessage(''); setThumbnailUrl(''); setLinkTarget(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Title and Message are required!");
    setIsSubmitting(true);
    const { error } = await supabase.from('app_notifications').insert([{ title, message, thumbnail_url: thumbnailUrl || null, link_target: linkTarget || null }]);
    setIsSubmitting(false);
    if (error) alert("Error: " + error.message);
    else { alert("Notification Blasted Successfully!"); handleTypeChange(notifType); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Bell className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Push Notification Blaster</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button onClick={() => handleTypeChange('chapter')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'chapter' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><BookOpen className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Chapter</span></button>
        <button onClick={() => handleTypeChange('feature')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'feature' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Sparkles className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Update</span></button>
        <button onClick={() => handleTypeChange('news')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'news' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Newspaper className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">AM News</span></button>
        <button onClick={() => handleTypeChange('custom')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${notifType === 'custom' ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}><Star className="w-5 h-5 mb-2" /><span className="text-[9px] font-black uppercase tracking-widest text-center">Custom</span></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {notifType === 'chapter' && (
          <div className="p-4 bg-black border border-zinc-800 rounded-xl mb-4">
            <label className="block text-[#fe9a00] font-bold uppercase tracking-widest text-[10px] mb-2">Select Series to Auto-Fill</label>
            <select value={selectedSeriesSlug} onChange={(e) => handleSeriesSelect(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]">
              <option value="">-- Choose a Series --</option>
              {seriesList.map((series: any) => <option key={series.id} value={series.slug}>{series.title}</option>)}
            </select>
          </div>
        )}
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Notification Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={50} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. New Chapter Drop!" /></div>
        <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Message Body</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} maxLength={150} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="Brief description of the update..." /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Thumbnail URL</label><input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="https://..." /></div>
          <div><label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Link Target</label><input type="text" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]" placeholder="e.g. apple-black" /></div>
        </div>
        {thumbnailUrl && (
          <div className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl"><img src={thumbnailUrl} alt="Thumbnail Preview" className="w-12 h-12 object-cover rounded border border-zinc-700" /><span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Thumbnail Preview</span></div>
        )}
        <button type="submit" disabled={isSubmitting} className="mt-6 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />{isSubmitting ? 'Broadcasting...' : 'Blast Notification'}
        </button>
      </form>
    </div>
  );
};

export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedWarning(isDirty);

  const handleMarkDirty = useCallback(() => {
    if (!isDirty) {
      setTimeout(() => setIsDirty(true), 10);
    }
  }, [isDirty]);

  const handleTabChange = (tabId: string) => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to leave this tab? Your progress will be lost.")) return;
    setIsDirty(false); setActiveTab(tabId);
  };

  const handleExit = () => {
    if (isDirty && !window.confirm("You have unsaved changes! Are you sure you want to exit? Your progress will be lost.")) return;
    setIsDirty(false); onBack();
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics' }, 
    { id: 'home', label: 'Home Editor' },
    { id: 'series', label: 'Series Page Editor' }, 
    { id: 'creators', label: 'Creator Directory' },
    { id: 'payouts', label: 'Creator Payouts' },
    { id: 'users', label: 'User Directory' },
    { id: 'chapter', label: 'Chapter Upload' },
    { id: 'hype', label: 'Hype Economy' }, 
    { id: 'avatars', label: 'Avatar Maker' }, 
    { id: 'frames', label: 'Frame Maker' }, 
    { id: 'stickers', label: 'Sticker Maker' }, 
    { id: 'cardskins', label: 'Card Skin Studio' },
    { id: 'accesskeys', label: 'Access Keys' }, 
    { id: 'signatures', label: 'Signature Vault' },
    { id: 'bingocodes', label: 'Bingo Codes' },
    { id: 'integrations', label: 'Third-Party Integrations' },
    { id: 'moderation', label: 'Moderation' }, 
    { id: 'notifications', label: 'Push Alerts' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Logged in as Administrator</p>
          </div>
          <button onClick={handleExit} className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors">
            Exit Vault
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-6 mb-8 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 ${activeTab === tab.id ? 'text-[#fe9a00] border-[#fe9a00]' : 'text-zinc-500 border-transparent hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6" onInput={handleMarkDirty} onChange={handleMarkDirty}>
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} setIsDirty={setIsDirty} />}
          {activeTab === 'series' && <SeriesEditor Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'creators' && <CreatorVisibilityManager />}
          {activeTab === 'payouts' && <CreatorPayoutTracker />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'chapter' && <ChapterUploader Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'hype' && <HypeManager setIsDirty={setIsDirty} />}
          {activeTab === 'avatars' && <AvatarMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'frames' && <FrameMaker setIsDirty={setIsDirty} />} 
          {activeTab === 'stickers' && <StickerMaker Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} setIsDirty={setIsDirty} />}
          {activeTab === 'cardskins' && <CardSkinMaker setIsDirty={setIsDirty} />}
          {activeTab === 'accesskeys' && <PromoCodeManager />} 
          {activeTab === 'signatures' && <MasterSignatureManager Dropzone={Dropzone} />}
          {activeTab === 'bingocodes' && <BingoCodeManager />} 
          {activeTab === 'integrations' && <IntegrationsManager setIsDirty={setIsDirty} />}
          {activeTab === 'moderation' && <ModerationDashboard />}
          {activeTab === 'notifications' && <NotificationCenter />}
        </div>
      </div>
    </div>
  );
};