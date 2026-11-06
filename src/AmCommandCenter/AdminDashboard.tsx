import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HomeEditor } from './HomeEditor';
import { SeriesEditor } from './SeriesEditor';
import { ChapterUploader } from './ChapterUploader';
import { ReleaseScheduler } from './ReleaseScheduler';
import { HouseAdBuilder } from './HouseAdBuilder';
import { AvatarMaker } from './AvatarMaker';
import { StickerMaker } from './StickerMaker';
import { CardSkinMaker } from './CardSkinMaker';
import { FrameMaker } from './FrameMaker';
import { ModerationDashboard } from './ModerationDashboard';
import { UserManager } from './UserManager';
import { CreatorPayoutTracker } from './CreatorPayoutTracker';
import { resolveCreatorStripeAccountId } from '../MainViews/CreatorsPage';
import { supabase } from '../supabase';
import {
  Bell,
  Send,
  BookOpen,
  Star,
  Sparkles,
  Newspaper,
  Key,
  Trash2,
  Mic,
  PenTool,
  XCircle,
  CreditCard,
  Flame,
  Gift,
  Settings2,
  Users,
  ShieldAlert,
  Download,
  Loader2,
  Eye,
  EyeOff,
  Search,
  Link2,
  Copy,
  Check,
  DollarSign,
  UserX,
  UserCheck,
  Lock,
  Layers,
  Upload
} from 'lucide-react';
import { useSeriesData } from '../userSeriesData';

const CREATOR_SERIES_FALLBACK_MAP: Record<string, string[]> = {
  'raymond brown': ['bully-eater', 'bully-eater-annual-one-shot'],
  'odunze oguguo': ['apple-black', 'apple-black-annual-one-shot', 'apple-black-origins'],
  'odunze oguguo (whyt manga)': ['apple-black', 'apple-black-annual-one-shot', 'apple-black-origins'],
  'whyt manga': ['apple-black', 'apple-black-annual-one-shot', 'apple-black-origins'],
  'kiba fabio augusto': ['apple-black-annual-one-shot'],
  'stephanie williams': ['apple-black-origins'],
  'frederick l. jones': [
    'clock-striker',
    'clock-striker-annual-one-shot',
    'fan-x-boy',
    'saturday-wars',
    'mmwog',
    'yellow-stringer'
  ],
  'issaka galadima': ['clock-striker'],
  'mike saharat srimuang': ['clock-striker-annual-one-shot'],
  'frank simmonds': ['fan-x-boy'],
  'kristina andabak': ['grimmheim'],
  'erick pedrucci': ['gun-bone', 'hammer-annual-one-shot'],
  'fred tornager': ['gunhild'],
  'jeyodin': ['hammer', 'hammer-annual-one-shot'],
  'bon idle': ['henshin'],
  'stefano romano': ['maximo', 'maximo-world-warrior'],
  'pap souleye fall': ['oblivion-rouge'],
  'huzayfa umar': ['orisha'],
  'huzayfa umar (zayf)': ['orisha'],
  'yvan soudy': ['redskin'],
  'yvan soudy (staark)': ['redskin'],
  'eddy frye': ['saturday-wars'],
  'morganne walker': ['soul-beat'],
  'oscar fong': ['mmwog'],
  'tony dawkins': ['titan-king'],
  'jr de bard': ['underground'],
  'goeffrey jean-louis': ['yellow-stringer'],
  'angélica rosales': ['yellow-stringer-annual-one-shot'],
  'angelica rosales': ['yellow-stringer-annual-one-shot'],
  'austin harvey-younis': ['zarqa'],
  'staniel russell': ['zephyr']
};

const normalizeNameForMatch = (val: string): string =>
  String(val || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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

export const isCreatorInviteRow = (row: any): boolean => {
  if (!row) return false;
  const code = String(row.code || '').toUpperCase();
  const orderNum = String(row.order_number || '');
  const tier = String(row.tier || '');
  return (
    code.startsWith('SAM-CR-') ||
    orderNum.startsWith('CREATOR_INVITE:') ||
    tier.startsWith('creator_invite:')
  );
};

export const parseCreatorInviteMeta = (row: any): { creatorName: string; role: string } => {
  const orderNum = String(row?.order_number || '');
  if (orderNum.startsWith('CREATOR_INVITE:')) {
    const parts = orderNum.split(':');
    return {
      creatorName: parts[1] || row?.buyer_name || 'Creator',
      role: parts[2] || 'creator'
    };
  }
  const tier = String(row?.tier || '');
  if (tier.startsWith('creator_invite:')) {
    const parts = tier.split(':');
    return {
      creatorName: parts[1] || row?.buyer_name || 'Creator',
      role: parts[2] || 'creator'
    };
  }
  return {
    creatorName: row?.buyer_name || 'Creator',
    role: 'creator'
  };
};

const CreatorManagerHub = () => {
  const [subTab, setSubTab] = useState<'directory' | 'onboarding' | 'payouts'>('directory');
  const [creators, setCreators] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [creatorUsers, setCreatorUsers] = useState<any[]>([]);
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  const [editingStripeCreator, setEditingStripeCreator] = useState<string | null>(null);
  const [stripeInputVal, setStripeInputVal] = useState('');
  const [showRawStripeInput, setShowRawStripeInput] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);

  const [inviteCreatorName, setInviteCreatorName] = useState('');
  const [inviteRole, setInviteRole] = useState<'creator' | 'core_creator' | 'staff'>('creator');
  const [inviteExpireDays] = useState(14);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchCreatorManagerData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: creatorRows },
        { data: seriesRows },
        { data: profileRows },
        { data: adminDirRows },
        { data: promoRows }
      ] = await Promise.all([
        supabase.from('series_creators').select('*').order('name', { ascending: true }),
        supabase.from('series').select('*'),
        supabase
          .from('profiles')
          .select('id, username, first_name, last_name, email, avatar_url, role, linked_creator_name, is_premium, creator_terms_accepted_at')
          .limit(10000),
        supabase.rpc('get_admin_user_directory', { p_search: '', p_limit: 5000, p_offset: 0 }),
        supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
      ]);

      const profileMap = new Map<string, any>();
      (profileRows || []).forEach((p: any) => {
        if (p.id) {
          profileMap.set(String(p.id), {
            ...p,
            email: String(p.email || '').trim()
          });
        }
      });

      if (Array.isArray(adminDirRows)) {
        adminDirRows.forEach((u: any) => {
          if (!u.id) return;
          const uid = String(u.id);
          const existing = profileMap.get(uid);
          if (existing) {
            profileMap.set(uid, {
              ...existing,
              email: existing.email || String(u.email || '').trim(),
              username: existing.username || u.username || ''
            });
          } else {
            profileMap.set(uid, {
              id: uid,
              username: u.username || String(u.email || '').split('@')[0] || 'User',
              email: String(u.email || '').trim(),
              role: u.role || 'reader',
              linked_creator_name: u.linked_creator_name || null,
              is_premium: Boolean(u.is_premium)
            });
          }
        });
      }

      const mergedProfiles = Array.from(profileMap.values());
      setAllProfiles(mergedProfiles);

      const invites = (promoRows || []).filter(isCreatorInviteRow);
      setInviteLinks(invites);

      const seriesBySlug = new Map<string, any>();
      const seriesStripeBySlug = new Map<string, string>();
      (seriesRows || []).forEach((s: any) => {
        if (s.slug) {
          seriesBySlug.set(String(s.slug).toLowerCase(), s);
          if (s.creator_stripe_account_id) {
            seriesStripeBySlug.set(s.slug, s.creator_stripe_account_id);
          }
        }
      });

      const getSeriesListForCreatorName = (cName: string, explicitSlugs: string[]) => {
        const normC = normalizeNameForMatch(cName);
        const parenMatch = cName.toLowerCase().match(/^(.+?)\s*\((.+?)\)$/);
        const nameParts = parenMatch
          ? [normC, normalizeNameForMatch(parenMatch[1]), normalizeNameForMatch(parenMatch[2])]
          : [normC];

        const slugSet = new Set<string>(explicitSlugs.map(s => String(s).toLowerCase()));
        (CREATOR_SERIES_FALLBACK_MAP[cName.toLowerCase()] || []).forEach(s =>
          slugSet.add(s.toLowerCase())
        );

        (seriesRows || []).forEach((s: any) => {
          const authorRaw = String(s.creator_name || '').toLowerCase();
          const authorSegments = authorRaw
            .split(/[,&/•|]+|\band\b/i)
            .map(seg => normalizeNameForMatch(seg))
            .filter(Boolean);
          if (nameParts.some(p => p && authorSegments.includes(p)) && s.slug) {
            slugSet.add(String(s.slug).toLowerCase());
          }
        });

        const resolvedSeriesObjs: any[] = [];
        slugSet.forEach(sl => {
          const found = seriesBySlug.get(sl);
          if (found) resolvedSeriesObjs.push(found);
          else resolvedSeriesObjs.push({ slug: sl, title: sl.replace(/-/g, ' ') });
        });
        return resolvedSeriesObjs;
      };

      const unique = new Map<string, any>();
      (creatorRows || []).forEach((row: any) => {
        if (!row.name) return;
        const key = row.name.trim();
        const normKey = key.toLowerCase();
        const dbStripe =
          row.stripe_account_id || seriesStripeBySlug.get(row.series_slug) || '';
        const effectiveStripeId = resolveCreatorStripeAccountId(key, dbStripe);

        const rowStudioEnabled =
          row.studio_enabled !== undefined
            ? Boolean(row.studio_enabled)
            : String(row.role || '').toLowerCase() !== 'revoked_creator';

        if (!unique.has(normKey)) {
          unique.set(normKey, {
            name: key,
            role: row.role || 'Creator',
            avatar_url: row.avatar_url,
            email: row.email || '',
            is_visible: row.is_visible !== false,
            studio_enabled: rowStudioEnabled,
            series_slugs: row.series_slug ? [row.series_slug] : [],
            has_direct_payout: Boolean(effectiveStripeId && effectiveStripeId.startsWith('acct_')),
            db_stripe_id: dbStripe || ''
          });
        } else {
          const existing = unique.get(normKey)!;
          if (row.is_visible === false) existing.is_visible = false;
          if (row.studio_enabled === false || String(row.role || '').toLowerCase() === 'revoked_creator') {
            existing.studio_enabled = false;
          }
          if (row.series_slug && !existing.series_slugs.includes(row.series_slug)) {
            existing.series_slugs.push(row.series_slug);
          }
          if (effectiveStripeId && effectiveStripeId.startsWith('acct_')) {
            existing.has_direct_payout = true;
          }
          if (dbStripe && !existing.db_stripe_id) {
            existing.db_stripe_id = dbStripe;
          }
          if (!existing.avatar_url && row.avatar_url) {
            existing.avatar_url = row.avatar_url;
          }
        }
      });

      const finalCreatorList = Array.from(unique.values())
        .map(c => {
          const matchedSeries = getSeriesListForCreatorName(c.name, c.series_slugs);
          return {
            ...c,
            series_list: matchedSeries,
            series_titles: matchedSeries.map((s: any) => s.title || s.slug).join(', ')
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setCreators(finalCreatorList);
      setCreatorUsers(
        mergedProfiles.filter(
          (p: any) =>
            (p.role && p.role !== 'reader' && p.role !== 'revoked_creator') ||
            Boolean(String(p.linked_creator_name || '').trim())
        )
      );
    } catch (err) {
      console.error('Error loading Creator Manager:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreatorManagerData();
  }, [fetchCreatorManagerData]);

  const findLinkedProfilesForCreator = useCallback(
    (creator: any) => {
      const cNameLower = String(creator.name || '').trim().toLowerCase();
      const cNorm = normalizeNameForMatch(creator.name);
      const parenMatch = cNameLower.match(/^(.+?)\s*\((.+?)\)$/);
      const nameVariants = parenMatch
        ? [cNorm, normalizeNameForMatch(parenMatch[1]), normalizeNameForMatch(parenMatch[2])]
        : [cNorm];

      return allProfiles.filter(p => {
        const pLinked = normalizeNameForMatch(p.linked_creator_name || '');
        const pUser = normalizeNameForMatch(p.username || '');
        return (
          (pLinked && nameVariants.includes(pLinked)) ||
          (pUser && nameVariants.includes(pUser))
        );
      });
    },
    [allProfiles]
  );

  const handleToggleVisibility = async (creator: any) => {
    const nextState = !creator.is_visible;
    setUpdatingName(creator.name);
    try {
      const { error } = await supabase
        .from('series_creators')
        .update({ is_visible: nextState })
        .ilike('name', creator.name.trim());
      if (error) throw error;
      setCreators(prev =>
        prev.map(c => (c.name === creator.name ? { ...c, is_visible: nextState } : c))
      );
    } catch (err: any) {
      alert('Failed to update visibility: ' + err.message);
    } finally {
      setUpdatingName(null);
    }
  };

  const handleToggleSeriesStudioAccess = async (
    creator: any,
    grantAccess: boolean,
    alsoTogglePlus: boolean
  ) => {
    const cleanCreator = creator.name.trim();
    const seriesLabel = creator.series_titles || 'Linked Series';

    if (!grantAccess) {
      const msg = alsoTogglePlus
        ? `Revoke Creator Studio access AND remove PLUS for ${cleanCreator} (${seriesLabel})?`
        : `Revoke Creator Studio access for ${cleanCreator} (${seriesLabel})?`;
      if (!window.confirm(msg)) return;
    }

    setUpdatingName(cleanCreator);
    try {
      const scPatch: Record<string, any> = {
        studio_enabled: grantAccess,
        role: grantAccess ? 'Creator' : 'revoked_creator'
      };

      const { error: scErr } = await supabase
        .from('series_creators')
        .update(scPatch)
        .ilike('name', cleanCreator);

      if (scErr) {
        await supabase
          .from('series_creators')
          .update({ role: grantAccess ? 'Creator' : 'revoked_creator' })
          .ilike('name', cleanCreator);
      }

      const linkedProfiles = findLinkedProfilesForCreator(creator);
      for (const acc of linkedProfiles) {
        const profilePatch: Record<string, any> = {
          role: grantAccess ? 'creator' : 'revoked_creator',
          linked_creator_name: cleanCreator
        };
        if (grantAccess && alsoTogglePlus) {
          profilePatch.is_premium = true;
          profilePatch.hypes_remaining = 3;
          profilePatch.super_hypes_left = 3;
        } else if (!grantAccess && alsoTogglePlus) {
          profilePatch.is_premium = false;
          profilePatch.hypes_remaining = 1;
          profilePatch.super_hypes_left = 1;
        }
        await supabase.from('profiles').update(profilePatch).eq('id', acc.id);
      }

      await fetchCreatorManagerData();
    } catch (err: any) {
      alert('Failed to update Studio access: ' + err.message);
    } finally {
      setUpdatingName(null);
    }
  };

  const handleSaveStripeAccount = async (creator: any, customIdToSave: string) => {
    const cleanId = customIdToSave.trim();
    if (cleanId && !cleanId.startsWith('acct_')) {
      return alert('Stripe Connect Account IDs must start with "acct_" (e.g. acct_1US3pv2d62PnIfST).');
    }

    const dbValue = cleanId ? cleanId : 'SATURDAY_AM';

    setSavingStripe(true);
    try {
      const { error: scErr } = await supabase
        .from('series_creators')
        .update({ stripe_account_id: dbValue })
        .ilike('name', creator.name.trim());

      if (scErr) throw scErr;

      if (Array.isArray(creator.series_slugs) && creator.series_slugs.length > 0) {
        await supabase
          .from('series')
          .update({ creator_stripe_account_id: dbValue })
          .in('slug', creator.series_slugs);
      }

      setEditingStripeCreator(null);
      setStripeInputVal('');
      setShowRawStripeInput(false);
      await fetchCreatorManagerData();
      alert(
        cleanId
          ? `Updated! ${creator.name} is now set to Payments: Direct.`
          : `Reverted! ${creator.name} is now set to Payments: Saturday AM.`
      );
    } catch (err: any) {
      alert(
        'Failed to save Stripe Connect ID: ' + err.message
      );
    } finally {
      setSavingStripe(false);
    }
  };

  const handleRevokeStudioAccess = async (profileUser: any, alsoRemovePlus: boolean) => {
    const displayLabel =
      profileUser.linked_creator_name || profileUser.username || profileUser.email;
    const msg = alsoRemovePlus
      ? `Revoke Creator Studio access AND remove complimentary PLUS status for "${displayLabel}"?`
      : `Revoke Creator Studio access for "${displayLabel}"?`;

    if (!window.confirm(msg)) return;

    setUpdatingName(profileUser.id);
    try {
      const patch: Record<string, any> = {
        role: 'revoked_creator'
      };
      if (alsoRemovePlus) {
        patch.is_premium = false;
        patch.super_hypes_left = 1;
        patch.hypes_remaining = 1;
      }

      await supabase.from('profiles').update(patch).eq('id', profileUser.id);
      if (profileUser.linked_creator_name) {
        await supabase
          .from('series_creators')
          .update({ role: 'revoked_creator' })
          .ilike('name', profileUser.linked_creator_name.trim());
      }

      await fetchCreatorManagerData();
    } catch (err: any) {
      alert('Failed to revoke access: ' + err.message);
    } finally {
      setUpdatingName(null);
    }
  };

  const handleCreateOnboardingInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCreator = inviteCreatorName.trim();
    if (!cleanCreator) return alert('Please select or type the creator name.');

    setCreatingInvite(true);
    try {
      const randA = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randB = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `SAM-CR-${randA}-${randB}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(inviteExpireDays || 14));

      const fullPayload = {
        code,
        tier: 'premium',
        max_uses: 1,
        times_used: 0,
        expires_at: expiresAt.toISOString(),
        order_number: `CREATOR_INVITE:${cleanCreator}:${inviteRole}`,
        buyer_name: cleanCreator
      };

      const { error } = await supabase.from('promo_codes').insert([fullPayload]);

      if (error) {
        const { error: fallbackErr } = await supabase.from('promo_codes').insert([
          {
            code,
            tier: 'premium',
            max_uses: 1,
            times_used: 0,
            expires_at: expiresAt.toISOString()
          }
        ]);
        if (fallbackErr) throw fallbackErr;
      }

      setInviteCreatorName('');
      await fetchCreatorManagerData();
    } catch (err: any) {
      alert('Error generating creator invite: ' + err.message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!window.confirm('Revoke and delete this Creator Onboarding invite link?')) return;
    await supabase.from('promo_codes').delete().eq('id', id);
    fetchCreatorManagerData();
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(key);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredCreators = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return creators;
    return creators.filter(c => {
      if (c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)) return true;
      if (c.series_titles && String(c.series_titles).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [creators, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('directory')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'directory'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Directory, Routing & Access ({creators.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('onboarding')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'onboarding'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Creator Onboarding Invites ({inviteLinks.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('payouts')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'payouts'
                ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Payouts, Referrals & Dev Ledger
          </button>
        </div>
      </div>

      {subTab === 'directory' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-[#fe9a00]" />
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
                    Creator Directory & Donation Routing
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    Tied directly to each creator's Series • 1-Click Grant or Revoke Creator Studio Access (No Email Needed)
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  name="creator_directory_search_filter"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder="Search creator or series..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#fe9a00]"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <Loader2 className="w-6 h-6 animate-spin text-[#fe9a00] mr-2" /> Loading Creators...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[650px] overflow-y-auto custom-scrollbar pr-1">
                {filteredCreators.map(c => {
                  const isUpdating = updatingName === c.name;
                  const isEditingThisStripe = editingStripeCreator === c.name;
                  const linkedAccounts = findLinkedProfilesForCreator(c);
                  const hasActiveLinkedUser = linkedAccounts.some(
                    acc => acc.role && acc.role !== 'reader' && acc.role !== 'revoked_creator'
                  );
                  const isStudioActive = Boolean(c.studio_enabled || hasActiveLinkedUser);

                  return (
                    <div
                      key={c.name}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                        c.is_visible ? 'bg-black border-zinc-800' : 'bg-red-950/20 border-red-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-[#fe9a00]/60 overflow-hidden shrink-0 flex items-center justify-center"
                            style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
                          >
                            <img
                              src={
                                c.avatar_url ||
                                'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg'
                              }
                              alt={c.name}
                              className="w-full h-full object-cover block"
                              style={{ width: 48, height: 48, maxWidth: 48, maxHeight: 48 }}
                              onError={e => {
                                e.currentTarget.src =
                                  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/creator-avatar.jpg';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs uppercase tracking-wider text-white truncate">
                              Creator: {c.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                  c.has_direct_payout
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                                    : 'bg-[#fe9a00]/15 border-[#fe9a00]/40 text-[#fe9a00]'
                                }`}
                              >
                                Payments: {c.has_direct_payout ? 'Direct' : 'Saturday AM'}
                              </span>
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">
                                {c.role === 'revoked_creator' ? 'Creator (Revoked)' : c.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingThisStripe) {
                                setEditingStripeCreator(null);
                                setStripeInputVal('');
                              } else {
                                setEditingStripeCreator(c.name);
                                setStripeInputVal('');
                                setShowRawStripeInput(false);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                            title="Assign or update Stripe Connect Account ID without exposing it"
                          >
                            <Lock className="w-3 h-3 inline mr-1" />
                            {c.has_direct_payout ? 'Routing' : '+ Direct ID'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(c)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all cursor-pointer ${
                              c.is_visible
                                ? 'bg-green-950/40 border border-green-800 text-green-400 hover:bg-green-900/60'
                                : 'bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50'
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : c.is_visible ? (
                              <>
                                <Eye className="w-3 h-3" /> Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" /> Hidden
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isEditingThisStripe && (
                        <div className="bg-zinc-950 border border-[#fe9a00]/40 rounded-xl p-3 space-y-2.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                              Set Stripe Connect ID (Masked for Security)
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowRawStripeInput(!showRawStripeInput)}
                              className="text-[9px] font-bold text-zinc-400 hover:text-white uppercase cursor-pointer"
                            >
                              {showRawStripeInput ? 'Hide Input' : 'Show Input'}
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              name={`stripe_connect_acct_${c.name.replace(/\s+/g, '_')}`}
                              autoComplete="off"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              placeholder="Paste acct_... Stripe Connect ID"
                              value={stripeInputVal}
                              onChange={e => setStripeInputVal(e.target.value)}
                              style={
                                showRawStripeInput
                                  ? undefined
                                  : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                              }
                              className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#fe9a00]"
                            />
                            <button
                              type="button"
                              disabled={savingStripe || !stripeInputVal.trim()}
                              onClick={() => handleSaveStripeAccount(c, stripeInputVal)}
                              className="px-3 py-1.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-lg cursor-pointer disabled:opacity-40"
                            >
                              {savingStripe ? '...' : 'Set Direct'}
                            </button>
                          </div>

                          {c.has_direct_payout && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                disabled={savingStripe}
                                onClick={() => handleSaveStripeAccount(c, '')}
                                className="text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 cursor-pointer"
                              >
                                Revert Routing to Saturday AM
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/70 px-2.5 py-1.5 rounded-lg text-[10px]">
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-zinc-300 font-bold">
                              Series:{' '}
                              <strong className="text-[#fe9a00]">
                                {c.series_titles || 'Saturday AM Series'}
                              </strong>
                            </span>
                            {linkedAccounts[0] && (
                              <span className="text-zinc-400 font-bold ml-1.5">
                                • User: <strong className="text-white">{linkedAccounts[0].username}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isStudioActive ? (
                              <>
                                <span className="text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded uppercase font-black">
                                  Studio Active
                                </span>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleSeriesStudioAccess(c, false, false)}
                                  className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/60 text-[8px] font-black uppercase tracking-widest cursor-pointer"
                                  title="Revoke Creator Studio access for this series creator"
                                >
                                  Revoke Studio
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleSeriesStudioAccess(c, false, true)}
                                  className="px-2 py-1 rounded bg-red-900/40 hover:bg-red-500 text-red-300 hover:text-white text-[8px] font-black uppercase tracking-widest cursor-pointer"
                                  title="Revoke both Creator Studio AND PLUS access"
                                >
                                  Revoke Studio + PLUS
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-[8px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black">
                                  Studio Off
                                </span>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleSeriesStudioAccess(c, true, false)}
                                  className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/50 text-[8px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1"
                                  title="1-Click Grant Creator Studio Access tied to this series"
                                >
                                  <UserCheck className="w-3 h-3" /> Grant Studio
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleSeriesStudioAccess(c, true, true)}
                                  className="px-2 py-1 rounded bg-[#fe9a00] hover:bg-white text-black text-[8px] font-black uppercase tracking-widest cursor-pointer"
                                  title="1-Click Grant Creator Studio + PLUS Access tied to this series"
                                >
                                  Grant Studio + PLUS
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <UserX className="w-4 h-4 text-[#fe9a00]" /> Linked Creator Studio User Profiles ({creatorUsers.length})
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                  User accounts currently linked to a Creator Studio profile
                </p>
              </div>
            </div>

            {creatorUsers.length === 0 ? (
              <p className="text-xs text-zinc-500 font-bold italic py-6 text-center">
                No user profiles currently hold Creator Studio access.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creatorUsers.map(u => (
                  <div
                    key={u.id}
                    className="bg-black border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white truncate">
                          {u.linked_creator_name || u.username}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {u.role || 'creator'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-bold truncate mt-0.5">
                        {u.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRevokeStudioAccess(u, false)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        Revoke Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeStudioAccess(u, true)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-700 text-zinc-400 hover:text-white border border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        title="Also downgrade from PLUS to Standard Free"
                      >
                        + Remove PLUS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'onboarding' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <Link2 className="w-6 h-6 text-[#fe9a00]" />
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
                One-Time Creator Onboarding Links & Codes
              </h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                Send a single-use magic link to new creators — grants PLUS + Creator Studio access after they sign the mandatory Terms & Conditions
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateOnboardingInvite}
            className="bg-black border border-[#fe9a00]/40 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Creator Full Name (Links to their Series & Studio) *
              </label>
              <input
                type="text"
                list="onboarding-creators-datalist"
                required
                placeholder="Select or type creator name (e.g. Raymond Brown)..."
                value={inviteCreatorName}
                onChange={e => setInviteCreatorName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
              />
              <datalist id="onboarding-creators-datalist">
                {creators.map(c => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Studio Role Tier
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00] cursor-pointer"
              >
                <option value="creator">Creator ($5 Annual Ref)</option>
                <option value="core_creator">Core Creator ($10 Ref)</option>
                <option value="staff">Staff ($10 Ref)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={creatingInvite || !inviteCreatorName.trim()}
                className="w-full py-3.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer disabled:opacity-40"
              >
                {creatingInvite ? 'Generating...' : '+ Create 1-Use Invite'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Generated Creator Onboarding Invites ({inviteLinks.length})
            </h3>
            {inviteLinks.length === 0 ? (
              <p className="text-xs text-zinc-500 font-bold italic py-8 text-center bg-black rounded-xl border border-zinc-800">
                No creator invite links generated yet.
              </p>
            ) : (
              inviteLinks.map(inv => {
                const { creatorName: cName, role: cRole } = parseCreatorInviteMeta(inv);
                const isUsed = Number(inv.times_used || 0) >= Number(inv.max_uses || 1);
                const magicUrl = `${window.location.origin}/?creator_invite=${encodeURIComponent(
                  inv.code
                )}`;

                return (
                  <div
                    key={inv.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isUsed ? 'bg-zinc-950 border-zinc-800 opacity-75' : 'bg-black border-[#fe9a00]/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase text-white">
                          Creator: {cName}
                        </span>
                        <span className="text-[9px] font-mono font-black text-[#fe9a00] bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
                          {inv.code}
                        </span>
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                            isUsed
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                              : 'bg-[#fe9a00]/15 border-[#fe9a00]/40 text-[#fe9a00]'
                          }`}
                        >
                          {isUsed ? 'REDEEMED & TERMS SIGNED' : 'UNUSED (1-TIME LINK)'}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">
                          Role: {cRole}
                        </span>
                      </div>

                      {!isUsed ? (
                        <p className="text-[11px] font-mono text-zinc-400 truncate">{magicUrl}</p>
                      ) : (
                        <p className="text-[10px] text-emerald-400 font-bold">
                          Signed by: {inv.buyer_name || cName}{' '}
                          {inv.buyer_email ? `(${inv.buyer_email})` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isUsed && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyText(magicUrl, `link_${inv.id}`)}
                            className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedToken === `link_${inv.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied Link
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Magic Link
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyText(inv.code, `code_${inv.id}`)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedToken === `code_${inv.id}` ? 'Copied!' : 'Copy Code'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteInvite(inv.id)}
                        className="p-2 text-zinc-500 hover:text-red-500 rounded-lg cursor-pointer"
                        title="Delete Invite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {subTab === 'payouts' && <CreatorPayoutTracker />}
    </div>
  );
};

// --- HYPE ECONOMY MANAGER ---
const HypeManager = ({ setIsDirty }: any) => {
  const [settings, setSettings] = useState({
    free_allowance: 1,
    premium_allowance: 3,
    refill_period: 'weekly',
    shop_multiplier: 10
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
          shop_multiplier: data.shop_hype_multiplier ?? 10
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
    if (
      forceSyncNow &&
      !window.confirm(
        `This will instantly overwrite everyone's current hype balance to ${settings.free_allowance} (Standard) and ${settings.premium_allowance} (Pro). Proceed?`
      )
    )
      return;

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
      alert('Error saving Hype settings: ' + settingsError.message);
      setIsSaving(false);
      return;
    }

    if (forceSyncNow) {
      try {
        await supabase
          .from('profiles')
          .update({ hypes_remaining: settings.free_allowance })
          .eq('is_premium', false);
        await supabase
          .from('profiles')
          .update({ hypes_remaining: settings.premium_allowance })
          .eq('is_premium', true);
        alert(
          `SUCCESS! Rules saved and all user wallets synced to ${settings.free_allowance} (Free) / ${settings.premium_allowance} (Pro).`
        );
      } catch (err: any) {
        alert('Error syncing user balances: ' + err.message);
      }
    } else {
      alert('Hype Rules Updated! They will apply automatically on the next scheduled refill.');
    }

    setIsDirty(false);
    setIsSaving(false);
  };

  const handleAirdrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (airdrop.amount <= 0) return alert('Amount must be greater than zero.');
    if (
      !window.confirm(
        `Are you sure you want to blast ${airdrop.amount} Hypes to ${
          airdrop.target === 'all' ? 'EVERYONE' : airdrop.username
        }?`
      )
    )
      return;

    setIsBlasting(true);
    try {
      if (airdrop.target === 'all') {
        const { error } = await supabase.rpc('airdrop_hypes_global', {
          hype_amount: airdrop.amount
        });
        if (error) throw error;
      } else {
        const { data: user, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, hypes_remaining')
          .ilike('username', airdrop.username.trim())
          .maybeSingle();
        if (fetchErr || !user) throw new Error('User not found!');

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ hypes_remaining: (user.hypes_remaining || 0) + airdrop.amount })
          .eq('id', user.id);
        if (updateErr) throw updateErr;
      }
      alert('Hypes Airdropped Successfully!');
      setAirdrop({ amount: 0, target: 'specific', username: '' });
    } catch (err: any) {
      alert('Error dropping hypes: ' + err.message);
    }
    setIsBlasting(false);
  };

  const handleLeaderboardReset = async () => {
    if (leaderboardResetConfirm !== 'RESET LEADERBOARDS') return;
    if (
      !window.confirm(
        'WARNING: You are about to wipe all current weekly leaderboard progress. This cannot be undone. Are you absolutely sure?'
      )
    )
      return;

    setIsResettingLeaderboards(true);
    try {
      const { error } = await supabase.rpc('reset_leaderboards');
      if (error) throw error;
      alert('SUCCESS: All leaderboards have been wiped clean.');
      setLeaderboardResetConfirm('');
    } catch (err: any) {
      alert('Leaderboard Reset Failed: ' + err.message);
    }
    setIsResettingLeaderboards(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg animate-fade-in-up max-w-4xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Flame className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
          Hype Economy
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-black p-6 rounded-xl border border-zinc-800 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Settings2 className="w-4 h-4 text-[#fe9a00]" /> Allowance Rules
          </h3>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Standard Refill Amount (Weekly)
            </label>
            <input
              type="number"
              min="0"
              value={settings.free_allowance}
              onChange={e => handleChange('free_allowance', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Pro Refill Amount (Weekly)
            </label>
            <input
              type="number"
              min="0"
              value={settings.premium_allowance}
              onChange={e => handleChange('premium_allowance', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Refill Schedule
            </label>
            <select
              value={settings.refill_period}
              onChange={e => handleChange('refill_period', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm font-bold focus:border-[#fe9a00] outline-none cursor-pointer"
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
            Set the reward ratio for Shopify merch purchases.
          </p>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Bonus Hypes per $1 Spent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={settings.shop_multiplier}
                onChange={e => handleChange('shop_multiplier', Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] text-xl font-black focus:border-[#fe9a00] outline-none"
              />
              <span className="text-zinc-500 font-black uppercase tracking-widest text-xs">
                Hypes
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          onClick={() => handleSaveSettings(false)}
          disabled={isSaving}
          className="flex-1 bg-zinc-800 text-white hover:text-black border border-zinc-700 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#fe9a00] transition-colors cursor-pointer"
        >
          {isSaving ? 'UPDATING...' : 'Save Rules (Future)'}
        </button>
        <button
          onClick={() => handleSaveSettings(true)}
          disabled={isSaving}
          className="flex-1 bg-[#fe9a00] text-black border border-[#fe9a00] font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors cursor-pointer"
        >
          {isSaving ? 'UPDATING...' : 'Save & Sync All Instantly'}
        </button>
      </div>

      <form
        onSubmit={handleAirdrop}
        className="bg-black p-6 rounded-xl border border-[#fe9a00]/30 mb-8"
      >
        <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6">
          <Gift className="w-4 h-4" /> Live Event & Prize Airdrop
        </h3>
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Hype Amount
            </label>
            <input
              type="number"
              min="1"
              required
              value={airdrop.amount}
              onChange={e => setAirdrop(prev => ({ ...prev, amount: Number(e.target.value) }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] text-xl font-black focus:border-[#fe9a00] outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Target Audience
            </label>
            <select
              value={airdrop.target}
              onChange={e => setAirdrop(prev => ({ ...prev, target: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white text-sm font-bold focus:border-[#fe9a00] outline-none cursor-pointer"
            >
              <option value="specific">Specific User (Prize Winner)</option>
              <option value="all">Global (All Registered Users)</option>
            </select>
          </div>
          {airdrop.target === 'specific' && (
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Winner Username
              </label>
              <input
                type="text"
                required
                value={airdrop.username}
                onChange={e => setAirdrop(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter exact username..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white text-sm font-bold focus:border-[#fe9a00] outline-none"
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isBlasting}
          className="w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {isBlasting ? 'Blasting...' : 'Blast Hypes Now'}
        </button>
      </form>

      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h3 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-2 border-b border-red-900/50 pb-3 mb-3">
            <XCircle className="w-4 h-4" /> Reset Leaderboards
          </h3>
          <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest leading-relaxed">
            Wipes all aggregated hype tracking across Series, Creators, Chapters, and Characters for the current cycle.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto min-w-[250px]">
          <input
            type="text"
            placeholder="Type 'RESET LEADERBOARDS'"
            value={leaderboardResetConfirm}
            onChange={e => setLeaderboardResetConfirm(e.target.value)}
            className="w-full bg-black border border-red-900/50 rounded-lg p-4 text-red-500 text-[10px] font-black tracking-widest text-center"
          />
          <button
            onClick={handleLeaderboardReset}
            disabled={leaderboardResetConfirm !== 'RESET LEADERBOARDS' || isResettingLeaderboards}
            className="w-full py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 text-xs cursor-pointer"
          >
            {isResettingLeaderboards ? 'WIPING...' : 'WIPE LEADERBOARDS'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UPGRADED CUSTOMER ACCESS CODE & THEMED ANNUAL SUBSCRIPTION BUNDLE BUILDER ---
const PromoCodeManager = () => {
  const { seriesList = [], cardSkins = [], vaultAvatars = [] } = useSeriesData();
  const [batchCodes, setBatchCodes] = useState<any[]>([]);
  const [brandedCodes, setBrandedCodes] = useState<any[]>([]);
  const [themedBundles, setThemedBundles] = useState<any[]>([]);
  const [dbCreators, setDbCreators] = useState<string[]>([]);

  const [batchSize, setBatchSize] = useState<number | ''>('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  // Builder State
  const [publishToStorefront, setPublishToStorefront] = useState<boolean>(false);
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleSubtitle, setBundleSubtitle] = useState('');
  const [themeBadge, setThemeBadge] = useState('DIWALI SPECIAL BUNDLE');
  const [bundlePrice, setBundlePrice] = useState<number>(30);

  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState(100);
  const [expireDays, setExpireDays] = useState(30);
  const [include1YrSub, setInclude1YrSub] = useState<boolean>(true);
  const [selectedCardSkinId, setSelectedCardSkinId] = useState('');
  const [selectedAvatar1, setSelectedAvatar1] = useState('');
  const [selectedAvatar2, setSelectedAvatar2] = useState('');
  const [selectedAvatar3, setSelectedAvatar3] = useState('');
  const [bundleCreatorName, setBundleCreatorName] = useState('');
  const [bonusHypes, setBonusHypes] = useState<number>(0);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'batch' | 'branded'>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [pendingSold, setPendingSold] = useState<Record<string, boolean>>({});
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAllAnnualCodes = async () => {
    const [
      { data: pData },
      { data: cData },
      { data: creatorsData },
      { data: sigsData },
      { data: tBundles }
    ] = await Promise.all([
      supabase.rpc('fetch_premium_ledger'),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('series_creators').select('name'),
      supabase.from('creator_signatures').select('creator_name'),
      supabase.from('themed_annual_bundles').select('*').order('created_at', { ascending: false })
    ]);
    if (pData) setBatchCodes(pData);
    if (cData) {
      setBrandedCodes(cData.filter((r: any) => !isCreatorInviteRow(r)));
    }
    if (tBundles) {
      setThemedBundles(tBundles);
    }
    const names = [
      ...(creatorsData || []).map((r: any) => r.name),
      ...(sigsData || []).map((r: any) => r.creator_name)
    ].filter(Boolean);
    setDbCreators(names);
  };

  useEffect(() => {
    fetchAllAnnualCodes();
  }, []);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    dbCreators.forEach(name => {
      if (name && name.trim().length >= 2) uniqueMap.set(name.trim().toLowerCase(), name.trim());
    });
    seriesList.forEach((s: any) => {
      if (s.creator_name) uniqueMap.set(s.creator_name.trim().toLowerCase(), s.creator_name.trim());
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadCSV = (codes: { generated_code: string }[]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,Premium Code\n' +
      codes.map(c => c.generated_code).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Premium_Codes_${new Date().toISOString().split('T')[0]}.csv`);
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

  const generateBrandedSuggestion = () => {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = bundleTitle
      ? bundleTitle.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
      : bundleCreatorName
      ? bundleCreatorName.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
      : 'SATAM';
    setCustomCode(`${prefix}-BUNDLE-${suffix}`);
  };

  const selectedSkinObj = useMemo(
    () => (cardSkins || []).find((sk: any) => String(sk.id) === String(selectedCardSkinId)),
    [cardSkins, selectedCardSkinId]
  );

  const handleCreateCustomAnnual = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customCode.trim().toUpperCase().replace(/\s+/g, '-');
    if (!clean) return alert('Please enter or auto-fill an access code name.');
    if (publishToStorefront && !bundleTitle.trim()) {
      return alert('Please enter a Bundle Title (e.g. "MMWOG Diwali Annual Bundle") for the Subscription Page.');
    }

    setIsCreatingCustom(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expireDays || 365));

    const avatarUrls = [selectedAvatar1, selectedAvatar2, selectedAvatar3].filter(Boolean);
    const avatarNames = avatarUrls.map(url => {
      const found = (vaultAvatars || []).find((a: any) => a.image_url === url);
      return found?.name || 'Avatar';
    });

    const bundleConfigPayload = {
      include_1yr_sub: include1YrSub,
      bundle_title: bundleTitle.trim() || undefined,
      card_skin_id: selectedCardSkinId || undefined,
      card_skin_name: selectedSkinObj?.name || undefined,
      card_skin_url: selectedSkinObj?.image_url || undefined,
      avatar_urls: avatarUrls,
      avatar_names: avatarNames,
      creator_autograph: bundleCreatorName.trim() || undefined,
      bonus_hypes: Number(bonusHypes || 0)
    };

    const payload: Record<string, any> = {
      code: clean,
      tier: 'premium',
      max_uses: Number(maxUses) || 1,
      times_used: 0,
      expires_at: expiresAt.toISOString(),
      creator_name: bundleCreatorName.trim() || null,
      bundle_config: bundleConfigPayload
    };

    let { error } = await supabase.from('promo_codes').insert([payload]);

    if (error && String(error.message || '').includes('bundle_config')) {
      delete payload.bundle_config;
      const retry = await supabase.from('promo_codes').insert([payload]);
      error = retry.error;
    }

    if (!error && publishToStorefront) {
      const { error: tbErr } = await supabase.from('themed_annual_bundles').insert([
        {
          title: bundleTitle.trim(),
          subtitle:
            bundleSubtitle.trim() ||
            `Includes 1-Year Saturday AM+ PLUS, ${
              selectedSkinObj?.name ? `${selectedSkinObj.name} Card Skin, ` : ''
            }${avatarUrls.length > 0 ? `${avatarUrls.length} Character Avatars, ` : ''}${
              bundleCreatorName ? `and ${bundleCreatorName}'s Gold Signature Badge!` : 'and exclusive rewards!'
            }`,
          theme_badge: themeBadge.trim() || 'LIMITED EDITION BUNDLE',
          price_dollars: Number(bundlePrice || 30),
          card_skin_id: selectedCardSkinId || null,
          card_skin_name: selectedSkinObj?.name || null,
          card_skin_url: selectedSkinObj?.image_url || null,
          avatar_urls: avatarUrls,
          avatar_names: avatarNames,
          creator_autograph: bundleCreatorName.trim() || null,
          bonus_hypes: Number(bonusHypes || 0),
          promo_code: clean,
          is_active: true
        }
      ]);
      if (tbErr) {
        console.warn('Note: themed_annual_bundles insert error (run SQL migration):', tbErr.message);
      }
    }

    setIsCreatingCustom(false);
    if (error) {
      alert('Error creating custom bundle/code: ' + error.message);
    } else {
      alert(
        publishToStorefront
          ? `SUCCESS! Published "${bundleTitle}" ($${bundlePrice}/yr) to the Subscription Page AND created Access Code "${clean}"!`
          : `SUCCESS! Custom Bundle Code "${clean}" created (${maxUses} uses, valid ${expireDays} days)!`
      );
      setCustomCode('');
      setBundleTitle('');
      setBundleSubtitle('');
      fetchAllAnnualCodes();
    }
  };

  const handleToggleThemedBundleActive = async (bundle: any) => {
    await supabase
      .from('themed_annual_bundles')
      .update({ is_active: !bundle.is_active })
      .eq('id', bundle.id);
    fetchAllAnnualCodes();
  };

  const handleDeleteThemedBundle = async (id: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from the Subscription Page?`)) return;
    await supabase.from('themed_annual_bundles').delete().eq('id', id);
    fetchAllAnnualCodes();
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

  const filteredBrandedCodes = useMemo(() => {
    const q = ledgerSearch.trim().toUpperCase();
    const base = !q
      ? brandedCodes
      : brandedCodes.filter(
          c =>
            String(c.code || '').toUpperCase().includes(q) ||
            String(c.creator_name || '').toUpperCase().includes(q) ||
            String(c.bundle_config?.bundle_title || '').toUpperCase().includes(q) ||
            String(c.buyer_name || '').toUpperCase().includes(q)
        );
    return [...base];
  }, [brandedCodes, ledgerSearch]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-5xl animate-fade-in space-y-8">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Customer Access Code & Themed Annual Bundle Builder
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Build custom 1-Year Subscription Bundles with 1 Card Skin + 3 Avatars + 1 Signature + Bonus Hypes (Redeemable via Code or $30–$35 Storefront)
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CUSTOM BUNDLE & ACCESS CODE BUILDER FORM
      ===================================================================== */}
      <form
        onSubmit={handleCreateCustomAnnual}
        className="bg-black border-2 border-[#fe9a00]/60 p-6 rounded-2xl space-y-6 shadow-[0_0_30px_rgba(254,154,0,0.1)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Step 1: Code & Storefront Mode
          </h3>

          <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-[#fe9a00]/50 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white">
            <input
              type="checkbox"
              checked={publishToStorefront}
              onChange={e => setPublishToStorefront(e.target.checked)}
              className="accent-[#fe9a00] w-3.5 h-3.5"
            />
            <span>Also Feature on Subscription Page ($30–$35 Storefront Bundle)</span>
          </label>
        </div>

        {/* Optional Storefront Title / Badge / $30-$35 Price Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Bundle / Campaign Title {publishToStorefront ? '*' : '(Optional)'}
            </label>
            <input
              type="text"
              value={bundleTitle}
              onChange={e => setBundleTitle(e.target.value)}
              placeholder="e.g. MMWOG Diwali Bundle or Apple Black Pass"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-xs focus:outline-none focus:border-[#fe9a00]"
            />
          </div>

          {publishToStorefront && (
            <>
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                  Event / Theme Badge
                </label>
                <input
                  type="text"
                  value={themeBadge}
                  onChange={e => setThemeBadge(e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI SPECIAL BUNDLE"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-[#fe9a00] px-4 py-3 font-black tracking-widest text-xs focus:outline-none focus:border-[#fe9a00]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
                  Storefront Bundle Price ($30–$35)
                </label>
                <select
                  value={bundlePrice}
                  onChange={e => setBundlePrice(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-[#fe9a00] rounded-xl text-[#fe9a00] px-4 py-3 font-black text-sm cursor-pointer"
                >
                  <option value={30}>$30.00 / Year Bundle</option>
                  <option value={32}>$32.00 / Year Bundle</option>
                  <option value={35}>$35.00 / Year Bundle</option>
                  <option value={25}>$25.00 / Year Flash Sale</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Access Code, Max Uses, Duration & 1-Yr Sub Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Access Code Name *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                required
                placeholder="e.g. DIWALI-MMWOG-2026 or AB-VIP"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl text-[#fe9a00] px-4 py-3 font-black tracking-widest text-sm focus:outline-none focus:border-[#fe9a00]"
              />
              <button
                type="button"
                onClick={generateBrandedSuggestion}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Defined Uses (1 = 1-Time) *
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
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Valid For (Days) *
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-1">
              Quick Presets:
            </span>
            {[
              { label: '1-Time Code (1 Use)', uses: 1, days: 30 },
              { label: '3-Day Flash (5 Uses)', uses: 5, days: 3 },
              { label: 'Diwali Event (14 Days)', uses: 500, days: 14 },
              { label: '1 Year (365 Days)', uses: 100, days: 365 }
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMaxUses(preset.uses);
                  setExpireDays(preset.days);
                }}
                className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-800 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-emerald-400">
            <input
              type="checkbox"
              checked={include1YrSub}
              onChange={e => setInclude1YrSub(e.target.checked)}
              className="accent-emerald-500 w-3.5 h-3.5"
            />
            <span>Includes 1-Year Full App PLUS Subscription</span>
          </label>
        </div>

        {/* STEP 2: DATABASE REWARD DROPDOWNS (CARD SKIN, 3 AVATARS, SIGNATURE, HYPES) */}
        <div className="pt-4 border-t border-zinc-800 space-y-4">
          <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2">
            <Gift className="w-4 h-4" /> Step 2: Select Optional Database Items to Bundle
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Hype Card Skin Dropdown */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                1. Themed Hype Card Skin
              </label>
              <select
                value={selectedCardSkinId}
                onChange={e => setSelectedCardSkinId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-3 py-2.5 font-bold text-xs cursor-pointer focus:outline-none focus:border-[#fe9a00]"
              >
                <option value="">-- No Card Skin --</option>
                {(cardSkins || []).map((sk: any) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.name} {sk.series_name ? `(${sk.series_name})` : ''}
                  </option>
                ))}
              </select>
              {selectedSkinObj?.image_url && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={selectedSkinObj.image_url}
                    alt={selectedSkinObj.name}
                    className="w-10 h-14 object-cover rounded border border-[#fe9a00]"
                  />
                  <span className="text-[10px] font-bold text-emerald-400">
                    ✓ Auto-Equips {selectedSkinObj.name}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Creator / Event Signature Dropdown */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                2. Creator / Event Gold Signature
              </label>
              <select
                value={bundleCreatorName}
                onChange={e => setBundleCreatorName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-3 py-2.5 font-bold text-xs cursor-pointer focus:outline-none focus:border-[#fe9a00]"
              >
                <option value="">-- No Signature Badge --</option>
                {creatorOptions.map(cName => (
                  <option key={cName} value={cName}>
                    {cName}'s Gold Signature
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-zinc-500 font-bold">
                Unlocks in the user's Bingo Book & shines in gold foil on Series pages (+25 Fandom Pts).
              </p>
            </div>

            {/* 3. Bonus Hypes Selector */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                3. Extra Bonus Hypes
              </label>
              <select
                value={bonusHypes}
                onChange={e => setBonusHypes(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-[#fe9a00] px-3 py-2.5 font-black text-xs cursor-pointer focus:outline-none focus:border-[#fe9a00]"
              >
                <option value={0}>0 Extra Hypes (Standard 3 Weekly)</option>
                <option value={1}>+1 Bonus Hype</option>
                <option value={2}>+2 Bonus Hypes</option>
                <option value={3}>+3 Bonus Hypes</option>
                <option value={5}>+5 Bonus Hypes</option>
                <option value={10}>+10 Bonus Hypes</option>
              </select>
              <p className="text-[9px] text-zinc-500 font-bold">
                Stacks directly on top of the user's current Hype wallet balance!
              </p>
            </div>
          </div>

          {/* 4. Up to 3 Character Profile Avatars */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
              4. Up to 3 Themed Character Profile Avatars (Avatar #1 Auto-Equips on Profile)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Avatar Slot #1 (Primary)', val: selectedAvatar1, setVal: setSelectedAvatar1 },
                { label: 'Avatar Slot #2', val: selectedAvatar2, setVal: setSelectedAvatar2 },
                { label: 'Avatar Slot #3', val: selectedAvatar3, setVal: setSelectedAvatar3 }
              ].map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-black border border-zinc-800 rounded-lg p-2">
                  {slot.val ? (
                    <img
                      src={slot.val}
                      alt={slot.label}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#fe9a00] shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[9px] font-black text-zinc-500 shrink-0">
                      #{idx + 1}
                    </div>
                  )}
                  <select
                    value={slot.val}
                    onChange={e => slot.setVal(e.target.value)}
                    className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-2 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-[#fe9a00]"
                  >
                    <option value="">-- None --</option>
                    {(vaultAvatars || []).map((av: any) => (
                      <option key={av.id || av.image_url} value={av.image_url}>
                        {av.name || 'Character Avatar'} {av.series_title ? `(${av.series_title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreatingCustom || !customCode.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.35)] disabled:opacity-40"
        >
          {isCreatingCustom
            ? 'Saving Bundle & Code...'
            : publishToStorefront
            ? `+ Publish "${bundleTitle || 'Themed Bundle'}" ($${bundlePrice}/yr) & Create Code "${customCode || '...'}"`
            : `+ Create Custom Bundle Access Code "${customCode || '...'}" (${maxUses} Uses)`}
        </button>
      </form>

      {/* ACTIVE STOREFRONT THEMED ANNUAL BUNDLES ($30-$35) */}
      {themedBundles.length > 0 && (
        <div className="bg-black border border-[#fe9a00]/40 p-6 rounded-xl space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#fe9a00]">
            Live Storefront Themed Annual Bundles on Subscription Page ({themedBundles.length})
          </h3>
          <div className="space-y-2.5">
            {themedBundles.map(tb => (
              <div
                key={tb.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-white">{tb.title}</span>
                    <span className="text-xs font-black text-[#fe9a00]">${tb.price_dollars}/yr</span>
                    {tb.promo_code && (
                      <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-300">
                        Code: {tb.promo_code}
                      </span>
                    )}
                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        tb.is_active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {tb.is_active ? 'Visible on Sub Page' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold mt-1">
                    {[
                      tb.card_skin_name ? `Skin: ${tb.card_skin_name}` : null,
                      Array.isArray(tb.avatar_urls) && tb.avatar_urls.length > 0
                        ? `${tb.avatar_urls.length} Avatars`
                        : null,
                      tb.creator_autograph ? `Sig: ${tb.creator_autograph}` : null,
                      Number(tb.bonus_hypes) > 0 ? `+${tb.bonus_hypes} Hypes` : null
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleThemedBundleActive(tb)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest rounded-lg border border-zinc-700 cursor-pointer"
                  >
                    {tb.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteThemedBundle(tb.id, tb.title)}
                    className="p-2 text-zinc-500 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BATCH CSV GENERATOR */}
      <div className="bg-black border border-zinc-800 p-6 rounded-xl flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-[#fe9a00]" /> Batch Generate Single-Use Store Codes (CSV)
          </h3>
          <input
            type="number"
            min="1"
            max="1000"
            placeholder="Quantity of random 1-use codes (e.g. 50)"
            value={batchSize}
            onChange={e => setBatchSize(e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white text-xs font-bold"
          />
          {batchMessage && <p className="mt-2 text-xs font-bold text-emerald-400">{batchMessage}</p>}
        </div>
        <button
          type="button"
          onClick={handleBatchGenerate}
          disabled={batchLoading || !batchSize}
          className="px-6 py-3.5 bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black rounded-xl font-black uppercase tracking-widest text-xs cursor-pointer shrink-0"
        >
          {batchLoading ? 'Generating...' : 'Generate & Export CSV'}
        </button>
      </div>

      {/* ACTIVE CODES LEDGER */}
      <div className="bg-black p-6 rounded-xl border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, bundle title, creator..."
              value={ledgerSearch}
              onChange={e => setLedgerSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white pl-8 pr-3 py-2 rounded-lg text-xs font-bold"
            />
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setLedgerFilter('all')}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                ledgerFilter === 'all' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
              }`}
            >
              All ({batchCodes.length + brandedCodes.length})
            </button>
            <button
              type="button"
              onClick={() => setLedgerFilter('branded')}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                ledgerFilter === 'branded' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
              }`}
            >
              Custom & Bundles ({brandedCodes.length})
            </button>
            <button
              type="button"
              onClick={() => setLedgerFilter('batch')}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                ledgerFilter === 'batch' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
              }`}
            >
              Batch ({batchCodes.length})
            </button>
          </div>
          {Object.keys(pendingSold).length > 0 && (
            <button
              onClick={handleSaveLedger}
              disabled={isSavingLedger}
              className="bg-[#fe9a00] text-black text-[9px] font-black uppercase px-3 py-2 rounded-lg cursor-pointer"
            >
              Save Distributed Marks
            </button>
          )}
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {(ledgerFilter === 'all' || ledgerFilter === 'branded') &&
            filteredBrandedCodes.map(c => {
              const used = Number(c.times_used || 0);
              const max = Number(c.max_uses || 1);
              const isDepleted = used >= max;
              const isExpired = c.expires_at && new Date() > new Date(c.expires_at);
              const magicUrl = `https://www.mangahype.com/?promo=${encodeURIComponent(c.code)}`;
              const bCfg = c.bundle_config || {};
              const rewardTags = [
                bCfg.include_1yr_sub !== false ? '1-Yr PLUS' : null,
                bCfg.card_skin_name ? `Skin: ${bCfg.card_skin_name}` : null,
                Array.isArray(bCfg.avatar_urls) && bCfg.avatar_urls.length > 0
                  ? `${bCfg.avatar_urls.length} Avatars`
                  : null,
                bCfg.creator_autograph || c.creator_name
                  ? `Sig: ${bCfg.creator_autograph || c.creator_name}`
                  : null,
                Number(bCfg.bonus_hypes) > 0 ? `+${bCfg.bonus_hypes} Hypes` : null
              ].filter(Boolean);

              return (
                <div
                  key={`branded-${c.id}`}
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border p-4 rounded-xl gap-4 ${
                    isDepleted || isExpired
                      ? 'bg-zinc-950/60 border-zinc-800 opacity-65'
                      : 'bg-zinc-950 border-[#fe9a00]/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#fe9a00]/20 text-[#fe9a00] text-[8px] font-black uppercase px-2 py-0.5 rounded">
                        {bCfg.bundle_title || (c.creator_name ? 'Flash Bundle' : 'Custom Bundle Code')}
                      </span>
                      <h4 className="font-mono font-black tracking-widest text-sm text-white">
                        {c.code}
                      </h4>
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          isDepleted
                            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            : isExpired
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {isDepleted
                          ? `All Claimed (${used}/${max})`
                          : isExpired
                          ? 'Expired'
                          : `Active (${used}/${max} Used)`}
                      </span>
                    </div>

                    {rewardTags.length > 0 && (
                      <div className="text-[10px] text-[#fe9a00] font-bold">
                        Rewards: {rewardTags.join(' • ')}
                      </div>
                    )}

                    <div className="text-[9px] text-zinc-400 font-bold uppercase flex flex-wrap items-center gap-3">
                      <span>
                        Redemptions: <strong className="text-white">{used} / {max}</strong>
                      </span>
                      {c.expires_at && (
                        <span>
                          Expires:{' '}
                          <strong className="text-zinc-300">
                            {new Date(c.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isDepleted && !isExpired && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(magicUrl, `magic_${c.id}`)}
                          className="px-3 py-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center gap-1.5 cursor-pointer"
                          title="Copy 1-Click Magic Redemption Link"
                        >
                          {copiedId === `magic_${c.id}` ? (
                            <><Check className="w-3.5 h-3.5" /> Copied Link</>
                          ) : (
                            <><Link2 className="w-3.5 h-3.5" /> Copy Magic Link</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.code, `code_${c.id}`)}
                          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === `code_${c.id}` ? (
                            <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBranded(c.id, c.code)}
                      className="p-2 text-zinc-500 hover:text-red-500 cursor-pointer"
                      title="Delete Code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
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
    const { data: sigs } = await supabase
      .from('creator_signatures')
      .select('*')
      .order('creator_name', { ascending: true });
    if (sigs) setSignatures(sigs);

    const { data: codes } = await supabase
      .from('bingo_codes')
      .select('code, creator_name, expires_at');
    if (codes) {
      const pinMap: Record<string, string> = {};
      const now = new Date();
      codes.forEach(c => {
        if (new Date(c.expires_at) > now) pinMap[c.creator_name] = c.code;
      });
      setActivePins(pinMap);
    }
  };

  useEffect(() => {
    supabase
      .from('series_creators')
      .select('name')
      .then(({ data }) => {
        if (data) setDbCreators(data.map((c: any) => c.name));
      });
    fetchSignaturesAndPins();
  }, []);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    dbCreators.forEach(name => {
      if (name && name.trim().length >= 2) uniqueMap.set(name.trim().toLowerCase(), name.trim());
    });
    seriesList.forEach((s: any) => {
      if (s.creator_name) uniqueMap.set(s.creator_name.trim().toLowerCase(), s.creator_name.trim());
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName || !signatureUrl)
      return alert('Please select a creator and upload a signature image.');
    setIsSubmitting(true);
    const { error } = await supabase
      .from('creator_signatures')
      .upsert(
        { creator_name: creatorName.trim(), signature_url: signatureUrl },
        { onConflict: 'creator_name' }
      );
    setIsSubmitting(false);
    if (error) alert('Error saving signature: ' + error.message);
    else {
      alert('Signature Vault Updated!');
      setCreatorName('');
      setSignatureUrl('');
      fetchSignaturesAndPins();
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this signature?')) return;
    const { error } = await supabase.from('creator_signatures').delete().eq('id', id);
    if (!error) fetchSignaturesAndPins();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <PenTool className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
          Signature Vault
        </h2>
      </div>
      <form
        onSubmit={handleSave}
        className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">
              Select Creator
            </label>
            <select
              value={creatorName}
              onChange={e => {
                const val = e.target.value;
                setCreatorName(val);
                const found = signatures.find(s => s.creator_name === val);
                setSignatureUrl(found ? found.signature_url : '');
              }}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm mb-4 cursor-pointer"
            >
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {signatureUrl && (
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex justify-center items-center">
                <img src={signatureUrl} alt="Preview" className="max-h-32 object-contain" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">
              Upload Transparent PNG
            </label>
            <Dropzone
              label={signatureUrl ? 'Replace Signature' : '+ Upload PNG'}
              height="p-6"
              folderPath="creator-signatures"
              onUploadComplete={(url: string) => setSignatureUrl(url)}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !signatureUrl || !creatorName}
          className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl disabled:opacity-50 cursor-pointer"
        >
          <PenTool className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Save to Vault'}
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {signatures.map(sig => (
          <div
            key={sig.id}
            className="bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col group relative"
          >
            <div className="bg-zinc-900 relative aspect-[3/1] p-4 flex items-center justify-center border-b border-zinc-800">
              <img src={sig.signature_url} className="w-full h-full object-contain" alt="Signature" />
              {activePins[sig.creator_name] && (
                <div className="absolute top-2 left-2 bg-[#fe9a00] text-black text-[10px] font-black px-2 py-0.5 rounded z-10 uppercase">
                  PIN: {activePins[sig.creator_name]}
                </div>
              )}
              <button
                onClick={() => handleDelete(sig.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 text-center">
              <h4 className="font-black text-xs text-white uppercase tracking-widest truncate">
                {sig.creator_name}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BingoCodeManager = () => {
  const { seriesList = [] } = useSeriesData();
  const [codes, setCodes] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [duration, setDuration] = useState('24h');
  const [pinMaxUses, setPinMaxUses] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCreators, setDbCreators] = useState<string[]>([]);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('bingo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  useEffect(() => {
    supabase
      .from('series_creators')
      .select('name')
      .then(({ data }) => {
        if (data) setDbCreators(data.map((c: any) => c.name));
      });
    fetchCodes();
  }, []);

  const creatorOptions = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    dbCreators.forEach(name => {
      if (name && name.trim().length >= 2) uniqueMap.set(name.trim().toLowerCase(), name.trim());
    });
    seriesList.forEach((s: any) => {
      if (s.creator_name) uniqueMap.set(s.creator_name.trim().toLowerCase(), s.creator_name.trim());
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbCreators]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName) return alert('Please select a Creator.');
    setIsSubmitting(true);
    const pin = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date();
    if (duration === '30m') expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    else if (duration === '1h') expiresAt.setHours(expiresAt.getHours() + 1);
    else if (duration === '12h') expiresAt.setHours(expiresAt.getHours() + 12);
    else if (duration === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
    else if (duration === '72h') expiresAt.setHours(expiresAt.getHours() + 72);
    else if (duration === '7d') expiresAt.setDate(expiresAt.getDate() + 7);
    else if (duration === 'permanent') expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    const { error } = await supabase.from('bingo_codes').insert([
      {
        code: pin,
        creator_name: creatorName.trim(),
        event_name: pinMaxUses === 1 ? '1-Time Fan Gift PIN' : 'Standard Event Unlock',
        max_uses: Number(pinMaxUses) || 999999,
        times_used: 0,
        expires_at: expiresAt.toISOString()
      }
    ]);
    setIsSubmitting(false);
    if (error) alert('Error creating PIN: ' + error.message);
    else {
      alert(`PIN Generated: ${pin} (${pinMaxUses === 999999 ? 'Unlimited Uses' : `${pinMaxUses} Use(s)`})`);
      setCreatorName('');
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Revoke this PIN?')) return;
    const { error } = await supabase.from('bingo_codes').delete().eq('id', id);
    if (!error) fetchCodes();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Mic className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
          Bingo Autograph PINs (1-Time Gift & Live Event)
        </h2>
      </div>
      <form
        onSubmit={handleCreate}
        className="bg-black p-6 rounded-xl border border-zinc-800 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">
              Select Creator
            </label>
            <select
              value={creatorName}
              onChange={e => setCreatorName(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm cursor-pointer"
            >
              <option value="">-- Choose a Creator --</option>
              {creatorOptions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">
              PIN Usage Limit
            </label>
            <select
              value={pinMaxUses}
              onChange={e => setPinMaxUses(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm cursor-pointer"
            >
              <option value={1}>1-Time Fan Gift PIN (1 Use Only)</option>
              <option value={5}>Flash Giveaway (5 Uses)</option>
              <option value={10}>Flash Giveaway (10 Uses)</option>
              <option value={999999}>Live Event PIN (Unlimited Uses)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">
              Duration
            </label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm cursor-pointer"
            >
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="72h">72 Hours (3 Days)</option>
              <option value="7d">7 Days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer"
        >
          <Key className="w-4 h-4" />
          {isSubmitting ? 'Generating...' : 'Generate 5-Digit PIN'}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {codes.map(c => {
          const isExpired = c.expires_at && new Date() > new Date(c.expires_at);
          const used = Number(c.times_used || 0);
          const max = Number(c.max_uses || 999999);
          const isDepleted = max < 999999 && used >= max;

          return (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black border border-zinc-800 p-4 rounded-xl gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-black tracking-[0.5em] text-white text-2xl">{c.code}</h4>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      isDepleted
                        ? 'text-zinc-400 border-zinc-700 bg-zinc-900'
                        : isExpired
                        ? 'text-red-500 border-red-900 bg-red-900/10'
                        : 'text-[#fe9a00] border-[#fe9a00]/50 bg-[#fe9a00]/10'
                    }`}
                  >
                    {isDepleted
                      ? `CLAIMED (${used}/${max})`
                      : isExpired
                      ? 'EXPIRED'
                      : max === 1
                      ? `1-TIME PIN (${used}/1)`
                      : max < 999999
                      ? `LIVE (${used}/${max} USED)`
                      : `LIVE EVENT (${used} USED)`}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Creator: <span className="text-[#fe9a00]">{c.creator_name}</span>
                </span>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-950/30 text-red-500 hover:bg-red-600 hover:text-white border border-red-900/50 rounded-lg text-[10px] font-black uppercase cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Revoke PIN
              </button>
            </div>
          );
        })}
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
    setNotifType(type);
    setSelectedSeriesSlug('');
    if (type === 'feature') {
      setTitle('App Feature Update');
      setMessage('');
      setThumbnailUrl(
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'
      );
      setLinkTarget('');
    } else if (type === 'news') {
      setTitle('Saturday AM News');
      setMessage('News from Saturday AM');
      setThumbnailUrl(
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png'
      );
      setLinkTarget('news');
    } else if (type === 'chapter') {
      setTitle('New Chapter Drop!');
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    } else {
      setTitle('');
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    }
  };

  const handleSeriesSelect = (slug: string) => {
    setSelectedSeriesSlug(slug);
    const series = seriesList.find((s: any) => s.slug === slug);
    if (series) {
      setMessage(`Chapter Drop: NEW ${series.title}!`);
      setThumbnailUrl(series.cover_url || '');
      setLinkTarget(series.slug);
    } else {
      setMessage('');
      setThumbnailUrl('');
      setLinkTarget('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert('Title and Message are required!');
    setIsSubmitting(true);
    const { error } = await supabase
      .from('app_notifications')
      .insert([
        { title, message, thumbnail_url: thumbnailUrl || null, link_target: linkTarget || null }
      ]);
    setIsSubmitting(false);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Notification Blasted Successfully!');
      handleTypeChange(notifType);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Bell className="w-6 h-6 text-[#fe9a00]" />
        <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
          Push Notification Blaster
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => handleTypeChange('chapter')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer ${
            notifType === 'chapter'
              ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]'
              : 'border-zinc-800 bg-black text-zinc-500'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase">Chapter</span>
        </button>
        <button
          onClick={() => handleTypeChange('feature')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer ${
            notifType === 'feature'
              ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]'
              : 'border-zinc-800 bg-black text-zinc-500'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase">Update</span>
        </button>
        <button
          onClick={() => handleTypeChange('news')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer ${
            notifType === 'news'
              ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]'
              : 'border-zinc-800 bg-black text-zinc-500'
          }`}
        >
          <Newspaper className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase">AM News</span>
        </button>
        <button
          onClick={() => handleTypeChange('custom')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer ${
            notifType === 'custom'
              ? 'border-[#fe9a00] bg-[#fe9a00]/10 text-[#fe9a00]'
              : 'border-zinc-800 bg-black text-zinc-500'
          }`}
        >
          <Star className="w-5 h-5 mb-2" />
          <span className="text-[9px] font-black uppercase">Custom</span>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {notifType === 'chapter' && (
          <div className="p-4 bg-black border border-zinc-800 rounded-xl mb-4">
            <label className="block text-[#fe9a00] font-bold uppercase text-[10px] mb-2">
              Select Series to Auto-Fill
            </label>
            <select
              value={selectedSeriesSlug}
              onChange={e => handleSeriesSelect(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white px-4 py-3 font-bold text-sm"
            >
              <option value="">-- Choose a Series --</option>
              {seriesList.map((series: any) => (
                <option key={series.id} value={series.slug}>
                  {series.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-zinc-500 font-bold uppercase text-[10px] mb-2">
            Notification Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={50}
            className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm"
          />
        </div>
        <div>
          <label className="block text-zinc-500 font-bold uppercase text-[10px] mb-2">
            Message Body
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={3}
            maxLength={150}
            className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-zinc-500 font-bold uppercase text-[10px] mb-2">
              Thumbnail URL
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={e => setThumbnailUrl(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm"
            />
          </div>
          <div>
            <label className="block text-zinc-500 font-bold uppercase text-[10px] mb-2">
              Link Target
            </label>
            <input
              type="text"
              value={linkTarget}
              onChange={e => setLinkTarget(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl text-white px-4 py-3 font-bold text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Broadcasting...' : 'Blast Notification'}
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN ADMIN DASHBOARD SHELL (8 CONSOLIDATED HUBS)
// ============================================================================
export const AdminDashboard = ({ onBack, Dropzone, ThumbnailCropperModal }: any) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [mangaSubTab, setMangaSubTab] = useState<'series' | 'chapters'>('series');
  const [loadoutSubTab, setLoadoutSubTab] = useState<
    'avatars' | 'frames' | 'stickers' | 'cardskins' | 'signatures' | 'bingocodes'
  >('avatars');
  const [usersSubTab, setUsersSubTab] = useState<'users' | 'moderation' | 'accesskeys'>('users');
  const [marketingSubTab, setMarketingSubTab] = useState<
    'accesskeys' | 'adstudio' | 'hype' | 'notifications'
  >('accesskeys');

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedWarning(isDirty);

  const handleMarkDirty = useCallback(() => {
    if (!isDirty) {
      setTimeout(() => setIsDirty(true), 10);
    }
  }, [isDirty]);

  const handleTabChange = (tabId: string) => {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes! Are you sure you want to leave this tab? Your progress will be lost.'
      )
    )
      return;
    setIsDirty(false);
    setActiveTab(tabId);
  };

  const handleExit = () => {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes! Are you sure you want to exit? Your progress will be lost.'
      )
    )
      return;
    setIsDirty(false);
    onBack();
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'home', label: 'Home Editor' },
    { id: 'manga', label: 'Manga Manager' },
    { id: 'scheduler', label: 'Release Scheduler', domId: 'release-scheduler-tab-trigger' },
    { id: 'creators', label: 'Creator Manager' },
    { id: 'loadout', label: 'Profile & Bingo Manager' },
    { id: 'users_mod', label: 'Users & Moderation' },
    { id: 'marketing', label: 'Marketing & Economy' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto mt-4 sm:mt-8">
        <div className="flex justify-between items-center mb-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">AM Command Center</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">
              Streamlined 8-Hub Administrator Suite
            </p>
          </div>
          <button
            onClick={handleExit}
            className="bg-black border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-6 py-3 rounded text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer"
          >
            Exit Vault
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-5 mb-6 border-b border-zinc-800 pb-px px-2 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={tab.domId}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 uppercase tracking-widest text-[10px] sm:text-xs font-black transition-colors border-b-2 px-2 sm:px-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'text-[#fe9a00] border-[#fe9a00]'
                  : 'text-zinc-500 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6" onInput={handleMarkDirty} onChange={handleMarkDirty}>
          {activeTab === 'analytics' && <AnalyticsDashboard />}

          {activeTab === 'home' && <HomeEditor Dropzone={Dropzone} setIsDirty={setIsDirty} />}

          {activeTab === 'manga' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMangaSubTab('series')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    mangaSubTab === 'series'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Series Page Editor & Characters
                </button>
                <button
                  type="button"
                  onClick={() => setMangaSubTab('chapters')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    mangaSubTab === 'chapters'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Chapter Uploader & Queue
                </button>
              </div>

              {mangaSubTab === 'series' ? (
                <SeriesEditor
                  Dropzone={Dropzone}
                  ThumbnailCropperModal={ThumbnailCropperModal}
                  setIsDirty={setIsDirty}
                />
              ) : (
                <ChapterUploader
                  Dropzone={Dropzone}
                  ThumbnailCropperModal={ThumbnailCropperModal}
                  setIsDirty={setIsDirty}
                />
              )}
            </div>
          )}

          {activeTab === 'scheduler' && <ReleaseScheduler setIsDirty={setIsDirty} />}

          {activeTab === 'creators' && <CreatorManagerHub />}

          {activeTab === 'loadout' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 px-2">
                    Profile Loadout:
                  </span>
                  {[
                    { id: 'avatars', label: 'Avatars' },
                    { id: 'frames', label: 'Border Frames' },
                    { id: 'stickers', label: 'Club Stickers' },
                    { id: 'cardskins', label: 'Card Skins' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLoadoutSubTab(item.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        loadoutSubTab === item.id
                          ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                          : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 px-2">
                    Bingo Book:
                  </span>
                  {[
                    { id: 'signatures', label: 'Signature Vault' },
                    { id: 'bingocodes', label: 'Bingo Event & 1-Time PINs' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLoadoutSubTab(item.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        loadoutSubTab === item.id
                          ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                          : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadoutSubTab === 'avatars' && (
                <AvatarMaker
                  Dropzone={Dropzone}
                  ThumbnailCropperModal={ThumbnailCropperModal}
                  setIsDirty={setIsDirty}
                />
              )}
              {loadoutSubTab === 'frames' && <FrameMaker />}
              {loadoutSubTab === 'stickers' && (
                <StickerMaker
                  Dropzone={Dropzone}
                  ThumbnailCropperModal={ThumbnailCropperModal}
                  setIsDirty={setIsDirty}
                />
              )}
              {loadoutSubTab === 'cardskins' && <CardSkinMaker />}
              {loadoutSubTab === 'signatures' && <MasterSignatureManager Dropzone={Dropzone} />}
              {loadoutSubTab === 'bingocodes' && <BingoCodeManager />}
            </div>
          )}

          {activeTab === 'users_mod' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setUsersSubTab('users')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    usersSubTab === 'users'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> User Directory
                </button>
                <button
                  type="button"
                  onClick={() => setUsersSubTab('moderation')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    usersSubTab === 'moderation'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Community Moderation
                </button>
                <button
                  type="button"
                  onClick={() => setUsersSubTab('accesskeys')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    usersSubTab === 'accesskeys'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> 1-Year Free Codes & Bundles
                </button>
              </div>

              {usersSubTab === 'users' && <UserManager />}
              {usersSubTab === 'moderation' && <ModerationDashboard />}
              {usersSubTab === 'accesskeys' && <PromoCodeManager />}
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('accesskeys')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'accesskeys'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> 1-Year Free Codes & Bundles
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('adstudio')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'adstudio'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Rewarded Ad Studio
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('hype')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'hype'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" /> Hype Economy
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('notifications')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'notifications'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" /> Push Alerts
                </button>
              </div>

              {marketingSubTab === 'accesskeys' && <PromoCodeManager />}
              {marketingSubTab === 'adstudio' && (
                <HouseAdBuilder Dropzone={Dropzone} setIsDirty={setIsDirty} />
              )}
              {marketingSubTab === 'hype' && <HypeManager setIsDirty={setIsDirty} />}
              {marketingSubTab === 'notifications' && <NotificationCenter />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};