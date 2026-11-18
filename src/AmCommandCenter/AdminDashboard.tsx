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
import { StoreManager } from './StoreManager';
import { CreatorPayoutTracker } from './CreatorPayoutTracker';
import { resolveCreatorStripeAccountId } from '../MainViews/CreatorsPage';
import {
  DEFAULT_LEADERBOARD_PRIZES_CONFIG,
  SAT_AM_SHOP_LOGO_URL,
  GOLD_HYPE_ICON_URL,
  STORE_DISCOUNT_PRESETS,
  normalizeFivePrizeTiers,
  normalizeGrandPrizeItems,
  type ShopLogoCorner,
  type ContestBannerEdge,
  type GrandPrizeStackItem,
  type LeaderboardPrizesConfig,
  type LeaderboardPrizeTierConfig,
  type PastWinnerRecord,
  type PastWinnersMonthEntry
} from '../MainViews/Leaderboard';
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
  Upload,
  Crown,
  Plus,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Package,
  Crop,
  Monitor,
  Smartphone,
  CheckCircle2,
  X
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

const CREATOR_ALIAS_GROUPS: string[][] = [
  ['odunze oguguo', 'whyt manga', 'whyt', 'odunze oguguo (whyt manga)'],
  ['jeyodin', 'jey odin'],
  ['raymond brown', 'rayme3000'],
  ['frank simmonds', 'effessart'],
  ['stefano romano', 'dropkickanimation'],
  ['erick pedrucci', 'eric pedrucci', 'erick perducci', 'eric perducci'],
  ['huzayfa umar', 'zayf', 'huzayfa umar (zayf)'],
  ['yvan soudy', 'staark', 'yvan soudy (staark)'],
  ['frederick l. jones', 'frederick jones', 'fred jones'],
  ['oscar fong', 'oscar ed fong'],
  ['jr de bard', 'j.r. de bard', 'jr debard']
];

const matchCreatorNames = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = String(nameA).trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanB = String(nameB).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  for (const group of CREATOR_ALIAS_GROUPS) {
    const aIn = group.some(a => cleanA === a || cleanA.includes(a) || a.includes(cleanA));
    const bIn = group.some(b => cleanB === b || cleanB.includes(b) || b.includes(cleanB));
    if (aIn && bIn) return true;
  }
  return false;
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
      alert('Failed to save Stripe Connect ID: ' + err.message);
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
        const { error: rpcErr } = await supabase.rpc('refill_weekly_active_hypes', {
          p_free_allowance: settings.free_allowance,
          p_premium_allowance: settings.premium_allowance,
          p_free_saturation_cap: 5,
          p_premium_saturation_cap: 10
        });
        if (rpcErr) throw rpcErr;
        alert(
          `SUCCESS! Weekly rollover refill applied (+${settings.free_allowance} Free up to 5 cap / +${settings.premium_allowance} PLUS up to 10 cap).`
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
          .select('id, hypes_remaining, vaulted_hypes')
          .ilike('username', airdrop.username.trim())
          .maybeSingle();
        if (fetchErr || !user) throw new Error('User not found!');

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ vaulted_hypes: (user.vaulted_hypes || 0) + airdrop.amount })
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

// --- STANDALONE ACCESS CODE & BATCH PREFIX GENERATOR ---
const PromoCodeManager = () => {
  const [batchCodes, setBatchCodes] = useState<any[]>([]);
  const [brandedCodes, setBrandedCodes] = useState<any[]>([]);

  const [batchPrefix, setBatchPrefix] = useState<string>('SATAM');
  const [batchSize, setBatchSize] = useState<number | ''>('');
  const [batchExpireDays, setBatchExpireDays] = useState<number>(365);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  const [codePrefix, setCodePrefix] = useState<string>('SATAM');
  const [customCode, setCustomCode] = useState<string>('');
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireDays, setExpireDays] = useState<number>(365);
  const [bonusHypes, setBonusHypes] = useState<number>(0);
  const [codeNote, setCodeNote] = useState<string>('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'batch' | 'branded'>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [pendingSold, setPendingSold] = useState<Record<string, boolean>>({});
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const makeRandomChunk = (len = 4) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  };

  const buildPrefixedRandomCode = useCallback((rawPrefix: string) => {
    const cleanPre = String(rawPrefix || 'SATAM')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, '')
      .replace(/-+$/g, '');
    const prefixPart = cleanPre || 'SATAM';
    return `${prefixPart}-${makeRandomChunk(4)}-${makeRandomChunk(4)}`;
  }, []);

  const fetchAllAnnualCodes = useCallback(async () => {
    const [{ data: pData }, { data: cData }] = await Promise.all([
      supabase.rpc('fetch_premium_ledger'),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    ]);
    if (pData) setBatchCodes(pData);
    if (cData) {
      setBrandedCodes(cData.filter((r: any) => !isCreatorInviteRow(r)));
    }
  }, []);

  useEffect(() => {
    fetchAllAnnualCodes();
    setCustomCode(buildPrefixedRandomCode('SATAM'));
  }, [fetchAllAnnualCodes, buildPrefixedRandomCode]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadCSV = (codes: { generated_code: string }[], prefixLabel = 'Premium_Codes') => {
    const csvContent =
      'data:text/csv;charset=utf-8,Access Code,Magic Redemption Link\n' +
      codes
        .map(
          c =>
            `${c.generated_code},https://www.mangahype.com/?promo=${encodeURIComponent(
              c.generated_code
            )}`
        )
        .join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `${prefixLabel}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchGenerate = async () => {
    const count = Number(batchSize);
    if (!count || count <= 0) return;
    setBatchLoading(true);
    setBatchMessage('');

    const cleanPre = batchPrefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, '')
      .replace(/-+$/g, '');

    try {
      if (cleanPre) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Math.max(1, Number(batchExpireDays || 365)));

        const generatedSet = new Set<string>();
        while (generatedSet.size < count) {
          generatedSet.add(`${cleanPre}-${makeRandomChunk(4)}-${makeRandomChunk(4)}`);
        }

        const rowsToInsert = Array.from(generatedSet).map(codeStr => ({
          code: codeStr,
          tier: 'premium',
          max_uses: 1,
          times_used: 0,
          expires_at: expiresAt.toISOString(),
          bundle_config: {
            include_1yr_sub: true,
            bundle_title: `1-Year Access Code (${cleanPre})`
          }
        }));

        const { error } = await supabase.from('promo_codes').insert(rowsToInsert);
        if (error) throw error;

        downloadCSV(
          rowsToInsert.map(r => ({ generated_code: r.code })),
          `${cleanPre}_Batch_${count}`
        );
        setBatchMessage(
          `Successfully generated ${rowsToInsert.length} "${cleanPre}-..." codes! CSV downloaded.`
        );
        setBatchSize('');
        await fetchAllAnnualCodes();
      } else {
        const { data, error } = await supabase.rpc('generate_premium_codes', {
          batch_size: count
        });
        if (error) throw error;
        if (data && data.length > 0) {
          downloadCSV(data);
          setBatchMessage(`Successfully generated ${data.length} codes! CSV downloaded.`);
          setBatchSize('');
          await fetchAllAnnualCodes();
        }
      }
    } catch (err: any) {
      setBatchMessage(`Error: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleGeneratePrefixedSingleCode = () => {
    setCustomCode(buildPrefixedRandomCode(codePrefix));
  };

  const handleCreateStandaloneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customCode.trim().toUpperCase().replace(/\s+/g, '-');
    if (!clean) return alert('Please enter or generate a code.');

    setIsCreatingCustom(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, Number(expireDays || 365)));

    const payload: Record<string, any> = {
      code: clean,
      tier: 'premium',
      max_uses: Math.max(1, Number(maxUses) || 1),
      times_used: 0,
      expires_at: expiresAt.toISOString(),
      bundle_config: {
        include_1yr_sub: true,
        bundle_title: codeNote.trim() || 'Standalone 1-Year PLUS Code',
        bonus_hypes: Math.max(0, Number(bonusHypes || 0))
      }
    };

    let { error } = await supabase.from('promo_codes').insert([payload]);

    if (error && String(error.message || '').includes('bundle_config')) {
      delete payload.bundle_config;
      const retry = await supabase.from('promo_codes').insert([payload]);
      error = retry.error;
    }

    setIsCreatingCustom(false);
    if (error) {
      alert('Error creating standalone code: ' + error.message);
    } else {
      alert(
        `SUCCESS! Standalone Access Code "${clean}" created (${maxUses} use${
          maxUses > 1 ? 's' : ''
        }, valid ${expireDays} days)!`
      );
      setCustomCode(buildPrefixedRandomCode(codePrefix));
      setCodeNote('');
      fetchAllAnnualCodes();
    }
  };

  const handleDeleteBranded = async (id: string, codeName: string) => {
    if (!window.confirm(`Permanently delete access code "${codeName}"?`)) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Standalone 1-Year Free Access Codes
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Generate Single or Multi-Use Standalone PLUS Codes with Custom Prefixes (e.g. SATAM-XXXX-XXXX) • All Existing Codes Active
            </p>
          </div>
        </div>
      </div>

      {/* 1. STANDALONE CODE GENERATOR WITH CUSTOM PREFIX */}
      <form
        onSubmit={handleCreateStandaloneCode}
        className="bg-black border-2 border-[#fe9a00]/60 p-6 rounded-2xl space-y-5 shadow-[0_0_30px_rgba(254,154,0,0.1)]"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-black text-[#fe9a00] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Create Standalone Access Code (With Custom Prefix)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              1. Code Prefix
            </label>
            <input
              type="text"
              value={codePrefix}
              onChange={e => {
                const nextPre = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                setCodePrefix(nextPre);
                setCustomCode(buildPrefixedRandomCode(nextPre));
              }}
              placeholder="e.g. SATAM"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-3.5 py-3 font-black tracking-widest text-xs focus:outline-none focus:border-[#fe9a00]"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              2. Full Generated Code (Editable) *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                required
                placeholder="SATAM-XXXX-XXXX"
                className="flex-1 bg-zinc-900 border border-[#fe9a00] rounded-xl text-[#fe9a00] px-4 py-3 font-mono font-black tracking-widest text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGeneratePrefixedSingleCode}
                className="bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer shrink-0"
              >
                ↻ Reroll
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Uses Allowed *
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={maxUses}
              onChange={e => setMaxUses(Number(e.target.value))}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-3.5 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">
              Valid (Days) *
            </label>
            <input
              type="number"
              min="1"
              max="3650"
              value={expireDays}
              onChange={e => setExpireDays(Number(e.target.value))}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-3.5 py-3 font-bold text-sm focus:outline-none focus:border-[#fe9a00]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
          <div className="md:col-span-2">
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1">
              Optional Note / Label (For Your Ledger)
            </label>
            <input
              type="text"
              value={codeNote}
              onChange={e => setCodeNote(e.target.value)}
              placeholder="e.g. VIP Giveaway, Contest Runner-Up, Staff Comp..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-white px-3.5 py-2.5 font-bold text-xs focus:outline-none focus:border-[#fe9a00]"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-1">
              Optional Bonus Hypes
            </label>
            <select
              value={bonusHypes}
              onChange={e => setBonusHypes(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-[#fe9a00] px-3.5 py-2.5 font-black text-xs cursor-pointer focus:outline-none focus:border-[#fe9a00]"
            >
              <option value={0}>0 Extra Hypes (Standard 1-Yr PLUS)</option>
              <option value={3}>+3 Bonus Hypes</option>
              <option value={5}>+5 Bonus Hypes</option>
              <option value={10}>+10 Bonus Hypes</option>
              <option value={25}>+25 Bonus Hypes</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-1">
            Quick Presets:
          </span>
          {[
            { label: '1-Time Code (1 Use • 1 Yr)', uses: 1, days: 365 },
            { label: 'Top 5 Winners (5 Uses • 30 Days)', uses: 5, days: 30 },
            { label: 'Flash Drop (10 Uses • 7 Days)', uses: 10, days: 7 },
            { label: 'Event Code (100 Uses • 1 Yr)', uses: 100, days: 365 }
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

        <button
          type="submit"
          disabled={isCreatingCustom || !customCode.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.35)] disabled:opacity-40"
        >
          {isCreatingCustom
            ? 'Generating Code...'
            : `+ Create Standalone Code "${customCode || '...'}" (${maxUses} Use${
                maxUses > 1 ? 's' : ''
              })`}
        </button>
      </form>

      {/* 2. BULK CSV GENERATOR WITH CUSTOM PREFIX */}
      <div className="bg-black border border-zinc-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Download className="w-4 h-4 text-[#fe9a00]" /> Batch Generate Single-Use Codes to CSV (With Optional Prefix)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              Batch Prefix
            </label>
            <input
              type="text"
              placeholder="e.g. SATAM"
              value={batchPrefix}
              onChange={e =>
                setBatchPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
              }
              className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-[#fe9a00] text-xs font-black tracking-widest"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              Quantity of 1-Use Codes *
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              placeholder="e.g. 50"
              value={batchSize}
              onChange={e => setBatchSize(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              Valid For (Days)
            </label>
            <input
              type="number"
              min="1"
              max="3650"
              value={batchExpireDays}
              onChange={e => setBatchExpireDays(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white text-xs font-bold"
            />
          </div>

          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={batchLoading || !batchSize}
            className="px-5 py-3 bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black rounded-xl font-black uppercase tracking-widest text-xs cursor-pointer disabled:opacity-40"
          >
            {batchLoading ? 'Generating...' : 'Generate & Export CSV'}
          </button>
        </div>

        {batchMessage && <p className="text-xs font-bold text-emerald-400">{batchMessage}</p>}
      </div>

      {/* 3. EXISTING CODES LEDGER */}
      <div className="bg-black p-6 rounded-xl border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, note, or bundle..."
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
              Custom &amp; Prefixed ({brandedCodes.length})
            </button>
            <button
              type="button"
              onClick={() => setLedgerFilter('batch')}
              className={`px-3 py-1.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                ledgerFilter === 'batch' ? 'bg-[#fe9a00] text-black' : 'text-zinc-400'
              }`}
            >
              Legacy Batch ({batchCodes.length})
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
              const skinNames: string[] = Array.isArray(bCfg.card_skin_names)
                ? bCfg.card_skin_names
                : bCfg.card_skin_name
                ? [bCfg.card_skin_name]
                : [];
              const sigNames: string[] = Array.isArray(bCfg.creator_autographs)
                ? bCfg.creator_autographs
                : bCfg.creator_autograph || c.creator_name
                ? [bCfg.creator_autograph || c.creator_name]
                : [];

              const rewardTags = [
                bCfg.include_1yr_sub !== false ? '1-Yr PLUS' : null,
                skinNames.length > 0 ? `Skins: ${skinNames.join(', ')}` : null,
                Array.isArray(bCfg.avatar_urls) && bCfg.avatar_urls.length > 0
                  ? `${bCfg.avatar_urls.length} Avatars`
                  : null,
                sigNames.length > 0 ? `Sigs: ${sigNames.join(', ')}` : null,
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
                        {bCfg.bundle_title || 'Standalone 1-Yr Code'}
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
                        Unlocks: {rewardTags.join(' • ')}
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

// --- ROTATING VISUAL UPSELL POPUP MANAGER ---
const UPSELL_COPY_PRESETS = [
  {
    label: '#1 Cliffhanger / Vault',
    audience: 'plus_upsell' as const,
    badge: 'UNLOCK THE FULL VAULT',
    title: "DON'T STOP AT THE CLIFFHANGER!",
    message:
      'Unlock every single chapter, Completed Run, and exclusive One-Shot in the Saturday AM Vault for less than a soda — just $1.99/mo!',
    cta: 'Unlock Every Chapter ($1.99)'
  },
  {
    label: '#2 12h Early Access',
    audience: 'plus_upsell' as const,
    badge: '12-HOUR VIP EARLY ACCESS',
    title: 'READ NEW DROPS FIRST!',
    message:
      'Why wait? PLUS members unlock weekly chapter drops 12 hours before everyone else — with 100% ad-free reading across all your devices.',
    cta: 'Get VIP Early Access ($1.99)'
  },
  {
    label: '#3 Loadout & Hype Card',
    audience: 'plus_upsell' as const,
    badge: 'ULTIMATE FAN LOADOUT',
    title: 'SUPERCHARGE YOUR PROFILE!',
    message:
      'Stand out in the comments and leaderboards with animated border frames, exclusive Hype Card skins, and 3x Weekly Super Hypes!',
    cta: 'Upgrade My Loadout ($1.99)'
  },
  {
    label: '#4 Support Creators',
    audience: 'plus_upsell' as const,
    badge: 'BACK DIVERSE CREATORS',
    title: 'FUEL THE MANGA REVOLUTION!',
    message:
      'Your $1.99/mo membership directly supports independent global manga creators while unlocking unlimited, ad-free binging across the entire app.',
    cta: 'Join Saturday AM+ ($1.99)'
  },
  {
    label: '#5 Zero Ads / Speed',
    audience: 'plus_upsell' as const,
    badge: '100% AD-FREE BINGING',
    title: 'ZERO ADS. ZERO LIMITS.',
    message:
      'Skip the daily unlock timers forever! Binge Apple Black, Clock Striker, Bully Eater, and 30+ hit series back-to-back without interruptions.',
    cta: 'Go Ad-Free for $1.99/mo'
  },
  {
    label: '#6 Visitor Free Chapters',
    audience: 'visitor_signup' as const,
    badge: 'FREE READER PASS',
    title: 'UNLOCK FREE CHAPTERS NOW!',
    message:
      'Create your free Saturday AM account in 10 seconds to unlock Chapters 1–3, save series to your bookshelf, and claim your Virtual Hype Card!',
    cta: 'Create Free Account'
  },
  {
    label: '#7 Visitor Hype Card',
    audience: 'visitor_signup' as const,
    badge: 'JOIN THE SQUAD',
    title: 'CLAIM YOUR HYPE CARD!',
    message:
      'Sign up free to equip character avatars, drop weekly Hypes on your favorite series, and join the community discussion!',
    cta: 'Sign Up Free'
  }
];

const UpsellPopupManager = ({ Dropzone, setIsDirty }: any) => {
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [badgeText, setBadgeText] = useState('UNLOCK THE FULL VAULT');
  const [title, setTitle] = useState("DON'T STOP AT THE CLIFFHANGER!");
  const [message, setMessage] = useState(
    'Unlock every single chapter, Completed Run, and exclusive One-Shot in the Saturday AM Vault for less than a soda — just $1.99/mo!'
  );
  const [ctaText, setCtaText] = useState('Unlock Every Chapter ($1.99)');
  const [imageUrl, setImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'plus_upsell' | 'visitor_signup' | 'both'>('plus_upsell');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showFullModalPreview, setShowFullModalPreview] = useState(false);

  const fetchPopups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('upsell_popups')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPopups(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPopups();
  }, [fetchPopups]);

  const applyPreset = (preset: (typeof UPSELL_COPY_PRESETS)[number]) => {
    setTargetAudience(preset.audience);
    setBadgeText(preset.badge);
    setTitle(preset.title);
    setMessage(preset.message);
    setCtaText(preset.cta);
  };

  const handleEditPopup = (item: any) => {
    setEditingId(item.id);
    setTargetAudience(item.target_audience || 'plus_upsell');
    setBadgeText(item.badge_text || 'SATURDAY AM+ PLUS');
    setTitle(item.title || '');
    setMessage(item.message || '');
    setCtaText(item.cta_text || 'Upgrade to PLUS ($1.99/mo)');
    setImageUrl(item.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setImageUrl('');
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return alert('Please upload a 16:9 banner image (1200x675 recommended)!');
    if (!title.trim() || !message.trim()) return alert('Please enter a Headline and Message!');

    setIsSaving(true);
    setSaveSuccessMsg(null);

    const payload = {
      badge_text: badgeText.trim() || 'SATURDAY AM+ PLUS',
      title: title.trim(),
      message: message.trim(),
      cta_text: ctaText.trim() || 'Upgrade to PLUS ($1.99/mo)',
      image_url: imageUrl,
      target_audience: targetAudience,
      is_active: true
    };

    const { error } = editingId
      ? await supabase.from('upsell_popups').update(payload).eq('id', editingId)
      : await supabase.from('upsell_popups').insert([payload]);

    setIsSaving(false);

    if (error) {
      alert('Error saving upsell popup: ' + error.message);
    } else {
      if (setIsDirty) setIsDirty(false);
      setSaveSuccessMsg(
        editingId
          ? `Saved changes to "${title}"!`
          : `Saved "${title}" & added to live popup rotation!`
      );
      setTimeout(() => setSaveSuccessMsg(null), 5000);
      setEditingId(null);
      setImageUrl('');
      fetchPopups();
    }
  };

  const handleToggleActive = async (item: any) => {
    await supabase
      .from('upsell_popups')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (setIsDirty) setIsDirty(false);
    fetchPopups();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this upsell popup card from rotation?')) return;
    await supabase.from('upsell_popups').delete().eq('id', id);
    if (setIsDirty) setIsDirty(false);
    fetchPopups();
  };

  const renderExactUserPopupPreview = (isModalOverlay = false) => (
    <div
      className="bg-zinc-950 border-2 border-[#fe9a00]/80 rounded-3xl w-full max-w-md mx-auto flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative w-full aspect-[16/9] bg-zinc-900 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Popup Preview'}
            className="w-full h-full object-cover object-top scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#fe9a00]/25 via-zinc-900 to-black flex flex-col items-center justify-center p-4">
            <Sparkles className="w-10 h-10 text-[#fe9a00] mb-2 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Upload 1200x675 Art on Left to Preview
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-black/20 pointer-events-none" />

        <div className="absolute top-3.5 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#fe9a00]/60 text-[#fe9a00] text-[9px] font-black uppercase tracking-widest shadow-lg">
            <Sparkles className="w-3 h-3 fill-[#fe9a00]" />
            {badgeText || 'SATURDAY AM+ PLUS'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isModalOverlay) setShowFullModalPreview(false);
          }}
          className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-black/75 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 transition-colors cursor-pointer"
          title="Close button preview"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 sm:px-8 pb-7 pt-2 w-full flex flex-col items-center -mt-4 relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-3 drop-shadow-md">
          {title || 'YOUR HEADLINE HERE'}
        </h2>

        <p className="text-zinc-300 text-xs sm:text-sm font-bold leading-relaxed mb-5 max-w-sm">
          {message || 'Your upsell message will appear right here in real time as you type.'}
        </p>

        <div className="w-full mb-4 flex flex-col items-center justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            + Have a Promo or Gift Code?
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isModalOverlay) setShowFullModalPreview(false);
          }}
          className="w-full font-black uppercase tracking-widest text-xs sm:text-sm py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(254,154,0,0.4)] bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black cursor-pointer flex items-center justify-center gap-2"
        >
          <Flame className="w-4 h-4 fill-black" />
          <span>{ctaText || 'Upgrade to PLUS ($1.99/mo)'}</span>
        </button>

        <span className="mt-3.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          Maybe Later
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-5xl animate-fade-in space-y-8">
      {showFullModalPreview && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowFullModalPreview(false)}
        >
          {renderExactUserPopupPreview(true)}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Rotating Visual Upsell Popups
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Upload 1200x675 (16:9) Artwork &amp; Custom PLUS Upsell Messages — Randomized Automatically for Visitors &amp; Free Readers
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFullModalPreview(true)}
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Eye className="w-3.5 h-3.5" /> Pop Out Full-Screen Test
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-200 text-xs font-black uppercase tracking-wider animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
          ⚡ 1-Click High-Converting Copy Presets (Click any of the 7 to Auto-Fill):
        </span>
        <div className="flex flex-wrap gap-2">
          {UPSELL_COPY_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-[#fe9a00] text-zinc-200 hover:text-black border border-zinc-700 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSavePopup} className="bg-black border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-xs font-bold text-white cursor-pointer focus:outline-none focus:border-[#fe9a00]"
              >
                <option value="plus_upsell">Free Accounts -&gt; Upgrade to PLUS ($1.99)</option>
                <option value="visitor_signup">Visitors -&gt; Create Free Account</option>
                <option value="both">Both Visitors &amp; Free Accounts</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Top Pill Badge
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={e => setBadgeText(e.target.value.toUpperCase())}
                placeholder="e.g. UNLOCK THE FULL VAULT"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-black text-[#fe9a00] focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Popup Headline *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. DON'T STOP AT THE CLIFFHANGER!"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Upsell Body Copy *
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Unlock every chapter in the vault, read new drops 12 hours early, and claim 3 weekly Super Hypes!"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white resize-none focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Button Text
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="e.g. Unlock Every Chapter ($1.99)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#fe9a00] mb-1.5">
                Upload 16:9 Popup Artwork (Recommended: 1200 x 675 px) *
              </label>
              <Dropzone
                label={imageUrl ? '✓ Art Uploaded (Click to Replace)' : '+ Upload 1200x675 Popup Art'}
                height="p-5"
                folderPath="upsell-popups"
                onUploadComplete={(url: string) => setImageUrl(url)}
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Real-Time 1:1 User Popup Preview
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                Exact Live Render
              </span>
            </div>

            {renderExactUserPopupPreview(false)}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-widest text-xs cursor-pointer"
            >
              Cancel Edit
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || !imageUrl || !title.trim()}
            className="flex-1 w-full py-4 bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.4)] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isSaving
                ? 'Saving Popup...'
                : editingId
                ? `Save Changes to "${title}"`
                : 'Save & Add Popup to Live Rotation'}
            </span>
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Saved Popups in Active Rotation Pool ({popups.length} Custom Cards + Built-In Copy Pool)
        </h3>

        {loading ? (
          <p className="text-xs text-zinc-500 font-bold py-6 text-center">Loading popups...</p>
        ) : popups.length === 0 ? (
          <p className="text-xs text-zinc-500 font-bold py-8 text-center bg-black rounded-xl border border-zinc-800">
            No custom popup art saved yet — upload a 1200x675 image above and click &ldquo;Save &amp; Add Popup to Live Rotation&rdquo;!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {popups.map(p => (
              <div
                key={p.id}
                className={`bg-black border rounded-2xl overflow-hidden flex flex-col justify-between ${
                  p.is_active ? 'border-zinc-800' : 'border-zinc-900 opacity-50'
                }`}
              >
                <div>
                  <div className="aspect-[16/9] w-full bg-zinc-900 relative">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover object-top" />
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 border border-[#fe9a00]/50 text-[#fe9a00] text-[8px] font-black uppercase tracking-widest">
                      {p.badge_text}
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="text-sm font-black italic uppercase text-white">{p.title}</h4>
                    <p className="text-xs text-zinc-400 font-bold line-clamp-2">{p.message}</p>
                    <p className="text-[10px] text-[#fe9a00] font-black uppercase pt-1">
                      CTA: {p.cta_text}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                        p.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {p.is_active ? 'Active in Rotation' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditPopup(p)}
                      className="px-3 py-1 rounded bg-zinc-800 hover:bg-[#fe9a00] text-zinc-300 hover:text-black text-[9px] font-black uppercase cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-zinc-500 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
// ============================================================================
// --- UNIFIED HERO BANNER, LEADERBOARD PRIZE POOL & 1:1 SOCIAL STUDIO ---
// ============================================================================
const UPCOMING_SCHEDULE_MONTHS = [
  { key: 'default', label: 'Default / Evergreen Template (Fallback)' },
  { key: '2026-11', label: 'November 2026 Contest' },
  { key: '2026-12', label: 'December 2026 Contest' },
  { key: '2027-01', label: 'January 2027 Contest' },
  { key: '2027-02', label: 'February 2027 Contest' },
  { key: '2027-03', label: 'March 2027 Contest' },
  { key: '2027-04', label: 'April 2027 Contest' }
];

interface StudioAssetOption {
  id: string;
  label: string;
  type: 'card_skin' | 'avatar' | 'series_art';
  image_url: string;
}

interface StudioSignature {
  creator_name: string;
  signature_url: string;
}

const loadCorsImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const WinnerFulfillmentAndSocialStudio = ({
  config,
  setConfig,
  activeSlice,
  leaderboardHeroUrl
}: {
  config: LeaderboardPrizesConfig;
  setConfig: React.Dispatch<React.SetStateAction<LeaderboardPrizesConfig>>;
  activeSlice: any;
  leaderboardHeroUrl?: string;
}) => {
  const [liveTop5, setLiveTop5] = useState<PastWinnerRecord[]>([]);
  const [loadingTop5, setLoadingTop5] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [selectedSocialMonthKey, setSelectedSocialMonthKey] = useState<string>('live');

  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      startIso: startOfMonth.toISOString()
    };
  }, []);

  const fetchLiveTop5Standings = useCallback(async () => {
    setLoadingTop5(true);
    try {
      const { startIso } = currentMonthInfo;
      const [
        { data: profiles },
        { data: reads },
        { data: hypes },
        { data: comments },
        { data: reacts },
        { data: sLikes },
        { data: cLikes },
        { data: tips }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_frame_id, fandom_score, role, is_admin, email, linked_creator_name'),
        supabase.from('completed_reads').select('user_id, chapter_id, created_at').gte('created_at', startIso),
        supabase.from('hypes').select('user_id, target_type, created_at').neq('target_type', 'comment').gte('created_at', startIso),
        supabase.from('series_comments').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('page_reacts').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('series_likes').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('chapter_likes').select('user_id, created_at').gte('created_at', startIso),
        supabase.from('creator_tips').select('user_id, amount_dollars, created_at').gte('created_at', startIso)
      ]);

      const excludedRoles = new Set(['creator', 'core_creator', 'staff', 'influencer', 'admin', 'moderator']);
      const validFanMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        const uname = String(p.username || '').trim();
        const role = String(p.role || 'reader').toLowerCase();
        if (
          !uname ||
          p.is_admin ||
          p.linked_creator_name ||
          excludedRoles.has(role) ||
          uname.toLowerCase().includes('test') ||
          String(p.email || '').toLowerCase().includes('test')
        ) {
          return;
        }
        validFanMap.set(String(p.id), p);
      });

      const scores = new Map<string, number>();
      const loginDays = new Map<string, Set<string>>();

      const addPts = (uid: any, pts: number, dt?: any) => {
        const id = String(uid || '');
        if (!validFanMap.has(id)) return;
        scores.set(id, (scores.get(id) || 0) + pts);
        if (dt) {
          const dayKey = String(dt).slice(0, 10);
          if (!loginDays.has(id)) loginDays.set(id, new Set());
          loginDays.get(id)!.add(dayKey);
        }
      };

      (tips || []).forEach((t: any) => addPts(t.user_id, Math.max(10, Number(t.amount_dollars || 5) * 2), t.created_at));
      const seenReads = new Set<string>();
      (reads || []).forEach((r: any) => {
        const k = `${r.user_id}_${r.chapter_id}`;
        if (!seenReads.has(k)) {
          seenReads.add(k);
          addPts(r.user_id, 10, r.created_at);
        }
      });
      (hypes || []).forEach((h: any) => addPts(h.user_id, 10, h.created_at));
      (comments || []).forEach((c: any) => addPts(c.user_id, 3, c.created_at));
      (reacts || []).forEach((pr: any) => addPts(pr.user_id, 2, pr.created_at));
      (sLikes || []).forEach((l: any) => addPts(l.user_id, 1, l.created_at));
      (cLikes || []).forEach((l: any) => addPts(l.user_id, 1, l.created_at));

      loginDays.forEach((dSet, uid) => {
        scores.set(uid, (scores.get(uid) || 0) + dSet.size * 5);
      });

      const candidates: any[] = [];
      validFanMap.forEach((p, id) => {
        const s = scores.get(id) || 0;
        if (s > 0 || Number(p.fandom_score || 0) > 0) {
          candidates.push({
            user_id: id,
            username: p.username,
            avatar_url: p.avatar_url || '',
            frame_id: p.avatar_frame_id || 'none',
            score: s,
            lifetime: Number(p.fandom_score || 0)
          });
        }
      });

      candidates.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.lifetime - a.lifetime));

      const top5: PastWinnerRecord[] = candidates.slice(0, 5).map((c, idx) => {
        const place = (idx + 1) as 1 | 2 | 3 | 4 | 5;
        const matchedTier = (activeSlice.tiers || []).find((t: any) => t.place === place);
        return {
          rank: place,
          user_id: c.user_id,
          username: c.username,
          avatar_url: c.avatar_url,
          frame_id: c.frame_id,
          score: c.score,
          prizeTitle: matchedTier?.title || `Rank #${place} Prize`
        };
      });

      setLiveTop5(top5);
    } finally {
      setLoadingTop5(false);
    }
  }, [currentMonthInfo, activeSlice.tiers]);

  useEffect(() => {
    fetchLiveTop5Standings();
  }, [fetchLiveTop5Standings]);

  const handleFinalizeAndAutoDropWinners = async () => {
    if (liveTop5.length === 0) return alert('No Top 5 standings found to finalize yet.');
    if (
      !window.confirm(
        `Finalize ${currentMonthInfo.monthLabel} Top 5 Winners?\n\nThis will:\n1. Instantly unlock each winner's linked digital rewards (Store Bundles, Card Skins, Avatars, Signatures & Bonus Gold Hypes) in their profile.\n2. Trigger their Gold Dot Congrats Notification on the Home Page.\n3. Add ${currentMonthInfo.monthLabel} to the "See Past Winners" Hall of Fame & 1:1 Social Graphic!`
      )
    )
      return;

    setIsAwarding(true);
    try {
      const { data: allStoreProds } = await supabase.from('in_app_store_products').select('*');
      const storeProdById = new Map<string, any>();
      (allStoreProds || []).forEach((sp: any) => storeProdById.set(`store_${sp.id}`, sp));

      for (const winner of liveTop5) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, unlocked_skins, unlocked_avatars, unlocked_autographs, vaulted_hypes, is_premium')
          .eq('id', winner.user_id)
          .maybeSingle();

        if (!prof) continue;

        const unlockedSkins = new Set<string>(Array.isArray(prof.unlocked_skins) ? prof.unlocked_skins : []);
        const unlockedAvatars = new Set<string>(Array.isArray(prof.unlocked_avatars) ? prof.unlocked_avatars : []);
        const unlockedAutos = new Set<string>(Array.isArray(prof.unlocked_autographs) ? prof.unlocked_autographs : []);
        let bonusHypesToAdd = 0;

        const applyLinkedOptionKey = (
          optKey?: string,
          imgUrl?: string,
          rankPlace: number = 1
        ) => {
          if (!optKey) return;
          if (optKey.startsWith('skin_')) {
            if (rankPlace <= 2) {
              unlockedSkins.add(optKey.replace('skin_', ''));
            }
          } else if (optKey.startsWith('avatar_') && imgUrl) {
            unlockedAvatars.add(imgUrl);
          } else if (optKey.startsWith('store_')) {
            const prod = storeProdById.get(optKey);
            if (prod) {
              const skinIds: string[] = Array.isArray(prod.card_skin_ids)
                ? prod.card_skin_ids.filter(Boolean)
                : [];
              const avUrls: string[] = Array.isArray(prod.avatar_urls)
                ? prod.avatar_urls.filter(Boolean)
                : [];

              // Rank #1: All skins (2x) + 5x Avatars
              // Rank #2: 1x Hype Card Skin + 5x Avatars
              // Rank #3: 0 Skins + 5x Avatars
              // Ranks #4 & #5: 0 Skins + 1x Avatar
              const maxSkins = rankPlace === 1 ? skinIds.length : rankPlace === 2 ? 1 : 0;
              const maxAvatars = rankPlace <= 3 ? 5 : 1;

              skinIds.slice(0, maxSkins).forEach((id: string) => {
                unlockedSkins.add(String(id));
              });
              avUrls.slice(0, maxAvatars).forEach((u: string) => {
                unlockedAvatars.add(String(u));
              });

              if (rankPlace === 1) {
                (Array.isArray(prod.autograph_creators) ? prod.autograph_creators : []).forEach(
                  (a: string) => {
                    if (a) unlockedAutos.add(String(a));
                  }
                );
              }
            }
          }
        };

        const tierCfg = (activeSlice.tiers || []).find((t: any) => t.place === winner.rank);
        const tierGoldBonus = Number(
          tierCfg?.goldHypesBonus ??
            (winner.rank === 1 ? 5 : winner.rank === 2 ? 3 : winner.rank === 3 ? 2 : 1)
        );
        bonusHypesToAdd += tierGoldBonus;

        if (winner.rank === 1) {
          (activeSlice.grandPrizeItems || []).forEach((gp: any) =>
            applyLinkedOptionKey(gp.linkedStoreProductId, gp.imageUrl, 1)
          );
        } else if (tierCfg) {
          applyLinkedOptionKey(tierCfg.linkedStoreProductId, tierCfg.imageUrl, winner.rank);
          if ((tierCfg as any).secondaryStoreProductId) {
            applyLinkedOptionKey((tierCfg as any).secondaryStoreProductId, tierCfg.imageUrl, winner.rank);
          }
        }

        await supabase
          .from('profiles')
          .update({
            unlocked_skins: Array.from(unlockedSkins),
            unlocked_avatars: Array.from(unlockedAvatars),
            unlocked_autographs: Array.from(unlockedAutos),
            vaulted_hypes: Number(prof.vaulted_hypes || 0) + bonusHypesToAdd
          })
          .eq('id', winner.user_id);

        await supabase.from('app_notifications').insert([
          {
            title: `🏆 Congrats! #${winner.rank} Super Fan Winner!`,
            message: `You finished #${winner.rank} in the ${currentMonthInfo.monthLabel} Monthly Fandom Prize Pool! Your digital rewards (${winner.prizeTitle}) and +${tierGoldBonus} Gold Hypes are now unlocked in your Profile!`,
            thumbnail_url:
              winner.avatar_url ||
              'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png',
            link_target: 'profile',
            source_key: `winner_${currentMonthInfo.monthKey}_${winner.user_id}`
          }
        ]);
      }

      const newHistoryEntry: PastWinnersMonthEntry = {
        monthKey: currentMonthInfo.monthKey,
        monthLabel: currentMonthInfo.monthLabel,
        seasonTitle: activeSlice.seasonTitle,
        heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
        finalizedAt: new Date().toISOString(),
        winners: liveTop5
      };

      const existingHistory = Array.isArray(config.pastWinnersHistory)
        ? config.pastWinnersHistory.filter((h: PastWinnersMonthEntry) => h.monthKey !== currentMonthInfo.monthKey)
        : [];
      const updatedHistory = [newHistoryEntry, ...existingHistory].slice(0, 6);

      const nextConfig: LeaderboardPrizesConfig = {
        ...config,
        pastWinnersHistory: updatedHistory
      };

      setConfig(nextConfig);
      localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(nextConfig));
      await supabase.from('app_settings').upsert({
        id: 1,
        leaderboard_prizes_config: nextConfig
      });

      setSelectedSocialMonthKey(currentMonthInfo.monthKey);
      alert(
        `SUCCESS! Finalized ${currentMonthInfo.monthLabel} Top 5 Super Fans, auto-dropped their digital bundle items & Gold Hypes, and activated their Home Page Gold Dot notifications!`
      );
    } catch (err: any) {
      alert('Error finalizing winners: ' + err.message);
    } finally {
      setIsAwarding(false);
    }
  };

  const pastHistory: PastWinnersMonthEntry[] = Array.isArray(config.pastWinnersHistory)
    ? config.pastWinnersHistory
    : [];
  const activeSocialEntry =
    selectedSocialMonthKey === 'live'
      ? {
          monthKey: currentMonthInfo.monthKey,
          monthLabel: currentMonthInfo.monthLabel,
          seasonTitle: activeSlice.seasonTitle,
          heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
          winners: liveTop5
        }
      : pastHistory.find((h: PastWinnersMonthEntry) => h.monthKey === selectedSocialMonthKey) || {
          monthKey: currentMonthInfo.monthKey,
          monthLabel: currentMonthInfo.monthLabel,
          seasonTitle: activeSlice.seasonTitle,
          heroBannerUrl: leaderboardHeroUrl || activeSlice.heroBannerUrl,
          winners: liveTop5
        };

  const socialWinners: PastWinnerRecord[] = activeSocialEntry.winners || [];
  const firstPlace = socialWinners[0];
  const runnersUp = socialWinners.slice(1, 5);

  return (
    <div className="bg-black border-2 border-[#fe9a00]/60 rounded-2xl p-6 space-y-6 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
            🏆 Automated Winner Fulfillment &amp; Social Studio
          </span>
          <h3 className="text-lg font-black italic uppercase text-white">
            4. Finalize Monthly Winners &amp; 1:1 Social Media Graphic
          </h3>
          <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
            Instantly drops linked digital rewards &amp; Gold Hypes into winners&apos; profiles, lights up their Home Page Gold Dot, updates &ldquo;See Past Winners&rdquo;, and builds your 1:1 Social Graphic!
          </p>
        </div>

        <button
          type="button"
          disabled={isAwarding || loadingTop5 || liveTop5.length === 0}
          onClick={handleFinalizeAndAutoDropWinners}
          className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(254,154,0,0.5)] cursor-pointer shrink-0 disabled:opacity-40"
        >
          {isAwarding
            ? 'Finalizing & Dropping Prizes...'
            : `🏆 Finalize ${currentMonthInfo.monthLabel} & Auto-Drop Prizes`}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            1:1 Social Graphic Month:
          </span>
          <select
            value={selectedSocialMonthKey}
            onChange={e => setSelectedSocialMonthKey(e.target.value)}
            className="bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-black text-white cursor-pointer"
          >
            <option value="live">
              Live Current Standings ({currentMonthInfo.monthLabel})
            </option>
            {pastHistory.map((h: PastWinnersMonthEntry) => (
              <option key={h.monthKey} value={h.monthKey}>
                Finalized: {h.monthLabel} ({h.seasonTitle})
              </option>
            ))}
          </select>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          📸 Exact 1:1 Square Frame Below — Ready to Screenshot for Instagram, X &amp; Discord!
        </span>
      </div>

      <div className="flex justify-center py-2 overflow-x-auto">
        <div className="relative w-[520px] h-[520px] aspect-square rounded-none overflow-hidden bg-zinc-950 border-2 border-[#fe9a00] shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col justify-between p-6 select-none shrink-0">
          <img
            src={
              activeSocialEntry.heroBannerUrl ||
              leaderboardHeroUrl ||
              activeSlice.heroBannerUrl ||
              DEFAULT_LEADERBOARD_PRIZES_CONFIG.heroBannerUrl
            }
            alt="Winners Backdrop"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-65 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/45 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest inline-block mb-1 shadow">
                {activeSocialEntry.monthLabel} • Monthly Fandom Prize Pool
              </span>
              <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-lg">
                TOP 5 SUPER FANS
              </h4>
            </div>
            <img
              src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png"
              alt="Saturday AM"
              className="h-9 object-contain drop-shadow-lg"
            />
          </div>

          {firstPlace ? (
            <div className="relative z-10 my-auto py-3">
              <div className="bg-gradient-to-r from-amber-950/85 via-black/90 to-black/90 border-2 border-[#fe9a00] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_0_35px_rgba(254,154,0,0.35)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        firstPlace.avatar_url ||
                        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png'
                      }
                      alt={firstPlace.username}
                      className="w-16 h-16 rounded-full object-cover border-[3px] border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                    />
                    <span className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-yellow-400 text-black font-black italic text-xs flex items-center justify-center border-2 border-black shadow">
                      #1
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1">
                      <Crown className="w-3 h-3 fill-yellow-400" /> #1 SUPER FAN GRAND PRIZE CHAMPION
                    </span>
                    <h5 className="text-xl font-black italic uppercase text-white truncate leading-tight mt-0.5">
                      {firstPlace.username}
                    </h5>
                    <span className="text-[9px] font-bold text-zinc-300 block truncate mt-0.5">
                      {firstPlace.prizeTitle}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3 border-l border-white/15">
                  <span className="text-lg font-black italic text-[#fe9a00] block leading-none">
                    {(firstPlace.score || 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                    Monthly Pts
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {runnersUp.map((w: PastWinnerRecord) => (
                  <div
                    key={w.rank}
                    className="bg-black/80 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-black italic text-[#fe9a00] w-5 shrink-0">
                        #{w.rank}
                      </span>
                      <img
                        src={
                          w.avatar_url ||
                          'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png'
                        }
                        alt={w.username}
                        className="w-9 h-9 rounded-full object-cover border border-[#fe9a00] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase text-white block truncate">
                          {w.username}
                        </span>
                        <span className="text-[8px] font-bold text-zinc-400 block truncate">
                          {(w.score || 0).toLocaleString()} Monthly Pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative z-10 my-auto text-center py-12">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {loadingTop5 ? 'Calculating Live Top 5...' : 'No Monthly Standings Yet'}
              </p>
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between pt-2.5 border-t border-white/15 text-[9px] font-black uppercase tracking-widest text-zinc-300">
            <span>Read &amp; Compete on the Saturday AM App</span>
            <span className="text-[#fe9a00]">MANGAHYPE.COM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaderboardPrizeManager = ({ Dropzone, setIsDirty }: any) => {
  const {
    seriesList: contextSeriesList = [],
    cardSkins: contextSkins = [],
    vaultAvatars: contextAvatars = []
  } = useSeriesData();

  // --- 1. UNIVERSAL HERO BANNER SLIDES STATE ---
  const [slides, setSlides] = useState<any[]>([]);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [dbSkins, setDbSkins] = useState<any[]>([]);
  const [dbAvatars, setDbAvatars] = useState<any[]>([]);
  const [creatorSignatures, setCreatorSignatures] = useState<any[]>([]);
  const [isSavingSlides, setIsSavingSlides] = useState<boolean>(false);

  // Studio Composer State
  const [activeStudioSlideId, setActiveStudioSlideId] = useState<any | null>(null);
  const [studioSourceMode, setStudioSourceMode] = useState<'store' | 'series' | 'custom'>('store');
  const [studioProductId, setStudioProductId] = useState<string>('');
  const [studioSeriesSlug, setStudioSeriesSlug] = useState<string>('');
  const [studioBgUrl, setStudioBgUrl] = useState<string>('');
  const [activeCropDevice, setActiveCropDevice] = useState<'pc' | 'mobile'>('pc');

  const [pcZoom, setPcZoom] = useState<number>(112);
  const [pcPanX, setPcPanX] = useState<number>(50);
  const [pcPanY, setPcPanY] = useState<number>(30);
  const [pcVignette, setPcVignette] = useState<number>(40);

  const [mobileZoom, setMobileZoom] = useState<number>(118);
  const [mobilePanX, setMobilePanX] = useState<number>(50);
  const [mobilePanY, setMobilePanY] = useState<number>(25);
  const [mobileVignette, setMobileVignette] = useState<number>(45);

  const [studioBadge, setStudioBadge] = useState<string>('#1 SUPER FAN PRIZE POOL');
  const [studioHeadline, setStudioHeadline] = useState<string>('TOP 5 SUPER FAN DROP');
  const [, setStudioSubheadline] = useState<string>('');
  const [studioPriceLabel, setStudioPriceLabel] = useState<string>('$50 OFF SHOP');
  const [, setStudioOrigPriceLabel] = useState<string>('');
  const [studioCtaLabel, setStudioCtaLabel] = useState<string>('SEE ALL PRIZES');
  const [studioAvatars, setStudioAvatars] = useState<string[]>([]);
  const [, setStudioSigs] = useState<StudioSignature[]>([]);
  const [studioBonusHypes, setStudioBonusHypes] = useState<number>(5);
  const [, setStudioIncludePass] = useState<boolean>(false);
  const [, setStudioCardCount] = useState<number>(0);
  const [studioEdgePosition, setStudioEdgePosition] = useState<ContestBannerEdge>('bottom');
  const [studioHeaderPosition, setStudioHeaderPosition] = useState<'top' | 'bottom'>('top');
  const [isGeneratingBanners, setIsGeneratingBanners] = useState<boolean>(false);

  // --- 2. LEADERBOARD PRIZE POOL STATE ---
  const [config, setConfig] = useState<LeaderboardPrizesConfig>(() => {
    try {
      const cached = localStorage.getItem('am_leaderboard_prizes_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.tiers)) {
          return {
            ...DEFAULT_LEADERBOARD_PRIZES_CONFIG,
            ...parsed,
            grandPrizeItems: normalizeGrandPrizeItems(parsed.grandPrizeItems),
            tiers: normalizeFivePrizeTiers(parsed.tiers),
            scheduledMonths: parsed.scheduledMonths || {},
            pastWinnersHistory: Array.isArray(parsed.pastWinnersHistory)
              ? parsed.pastWinnersHistory
              : []
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_LEADERBOARD_PRIZES_CONFIG;
  });

  const [storeCatalogOptions, setStoreCatalogOptions] = useState<
    {
      optionKey: string;
      group: 'store_bundle' | 'card_skin' | 'avatar';
      label: string;
      tag: string;
      title: string;
      description: string;
      imageUrl: string;
    }[]
  >([]);

  const [selectedScheduleKey, setSelectedScheduleKey] = useState<string>('default');
  const [customMonthInput, setCustomMonthInput] = useState<string>('');
  const [previewAllPrizesModal, setPreviewAllPrizesModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchPrizeStoreCatalog = useCallback(async () => {
    const [
      { data: slideData },
      { data: freshSeriesData },
      { data: settingsData },
      { data: storeProds },
      { data: themedBundles },
      { data: cardSkinsRes },
      { data: vaultSkinsRes },
      { data: avatarsRes },
      { data: sigsData }
    ] = await Promise.all([
      supabase.from('hero_slides').select('*').order('id', { ascending: true }),
      supabase.from('series').select('*').order('title', { ascending: true }),
      supabase.from('app_settings').select('leaderboard_prizes_config').eq('id', 1).maybeSingle(),
      supabase.from('in_app_store_products').select('*').order('created_at', { ascending: false }),
      supabase.from('themed_annual_bundles').select('*').order('created_at', { ascending: false }),
      supabase.from('card_skins').select('*').order('created_at', { ascending: false }),
      supabase.from('vault_card_skins').select('*').order('created_at', { ascending: false }),
      supabase.from('vault_avatars').select('*').order('created_at', { ascending: false }),
      supabase.from('creator_signatures').select('creator_name, signature_url')
    ]);

    const effectiveSeries =
      freshSeriesData && freshSeriesData.length > 0 ? freshSeriesData : contextSeriesList;
    setAllSeries(effectiveSeries);
    if (effectiveSeries.length > 0 && !studioSeriesSlug) {
      setStudioSeriesSlug(effectiveSeries[0].slug);
    }

    if (storeProds && storeProds.length > 0) {
      setStoreProducts(storeProds);
      if (!studioProductId) setStudioProductId(String(storeProds[0].id));
    }
    setDbSkins([...(cardSkinsRes || []), ...(vaultSkinsRes || [])]);
    if (avatarsRes) setDbAvatars(avatarsRes);
    if (sigsData) setCreatorSignatures(sigsData);

    if (slideData && slideData.length > 0) {
      setSlides(
        slideData.map((s: any) => {
          const rawType = String(s.link_type || 'series');
          const [placementPart, actualType] = rawType.includes('::')
            ? rawType.split('::')
            : ['home', rawType];
          return {
            id: s.id,
            placement: placementPart || 'home',
            desktop_url: s.desktop_url || '',
            mobile_url: s.mobile_url || '',
            linkType: actualType || 'series',
            linkTarget: s.link_target || ''
          };
        })
      );
    } else {
      setSlides([
        {
          id: Date.now(),
          placement: 'home',
          linkType: 'series',
          linkTarget: '',
          desktop_url: '',
          mobile_url: ''
        }
      ]);
    }

    if (settingsData?.leaderboard_prizes_config) {
      const raw = settingsData.leaderboard_prizes_config;
      setConfig({
        ...DEFAULT_LEADERBOARD_PRIZES_CONFIG,
        ...raw,
        grandPrizeItems: normalizeGrandPrizeItems(raw.grandPrizeItems),
        tiers: normalizeFivePrizeTiers(raw.tiers),
        scheduledMonths: raw.scheduledMonths || {},
        pastWinnersHistory: Array.isArray(raw.pastWinnersHistory)
          ? raw.pastWinnersHistory
          : []
      });
    }

    const skinMap = new Map<string, any>();
    [...(cardSkinsRes || []), ...(vaultSkinsRes || []), ...(contextSkins || [])].forEach(
      (sk: any) => {
        if (sk && sk.id && sk.image_url) {
          skinMap.set(String(sk.id), sk);
        }
      }
    );
    const allSkins = Array.from(skinMap.values());

    const avatarMap = new Map<string, any>();
    [...(avatarsRes || []), ...(contextAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) {
        avatarMap.set(String(av.image_url), av);
      }
    });
    const allAvatars = Array.from(avatarMap.values());

    const builtOptions: {
      optionKey: string;
      group: 'store_bundle' | 'card_skin' | 'avatar';
      label: string;
      tag: string;
      title: string;
      description: string;
      imageUrl: string;
    }[] = [];

    const seenTitles = new Set<string>();

    (storeProds || []).forEach((prod: any) => {
      const skinIds: string[] = Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : [];
      const firstSkin = allSkins.find(s => String(s.id) === String(skinIds[0]));
      const avUrls: string[] = Array.isArray(prod.avatar_urls) ? prod.avatar_urls : [];
      const resolvedImg =
        firstSkin?.image_url ||
        prod.card_skin_url ||
        prod.background_avatar_url ||
        avUrls[0] ||
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';

      const isContest =
        !prod.is_active && String(prod.promo_badge || '').toUpperCase().includes('CONTEST');
      const typeTag =
        prod.product_type === 'bundle'
          ? 'BUNDLE'
          : prod.product_type === 'avatar_pack'
          ? 'AVATAR PACK'
          : 'CARD SKIN';

      seenTitles.add(String(prod.title || '').trim().toLowerCase());

      builtOptions.push({
        optionKey: `store_${prod.id}`,
        group: 'store_bundle',
        label: `${isContest ? '🏆 [Contest-Only]' : '🛒 [Store]'} ${prod.title} (${typeTag})`,
        tag: typeTag,
        title: prod.title || 'Store Bundle',
        description:
          prod.description ||
          `Includes ${skinIds.length > 0 ? `${skinIds.length} Card Skin(s), ` : ''}${
            avUrls.length > 0 ? `${avUrls.length} Avatar(s) ` : ''
          }from the Saturday AM Vault.`,
        imageUrl: resolvedImg
      });
    });

    (themedBundles || []).forEach((tb: any) => {
      const lowerTitle = String(tb.title || '').trim().toLowerCase();
      if (!lowerTitle || seenTitles.has(lowerTitle)) return;
      seenTitles.add(lowerTitle);

      const avUrls: string[] = Array.isArray(tb.avatar_urls) ? tb.avatar_urls : [];
      const resolvedImg =
        tb.card_skin_url ||
        avUrls[0] ||
        'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png';

      builtOptions.push({
        optionKey: `themed_${tb.id}`,
        group: 'store_bundle',
        label: `${tb.is_active ? '🛒 [Bundle]' : '🏆 [Contest Bundle]'} ${tb.title}`,
        tag: 'BUNDLE',
        title: tb.title,
        description: tb.subtitle || 'Collector Hype Card & Avatar Bundle.',
        imageUrl: resolvedImg
      });
    });

    allSkins.forEach((sk: any) => {
      builtOptions.push({
        optionKey: `skin_${sk.id}`,
        group: 'card_skin',
        label: `🃏 [Card Skin] ${sk.name}${sk.creator_name ? ` by ${sk.creator_name}` : ''}`,
        tag: 'CARD SKIN',
        title: `${sk.name} Hype Card Skin`,
        description: `Exclusive "${sk.name}" collector Hype Card Skin for your profile.`,
        imageUrl: sk.image_url
      });
    });

    allAvatars.forEach((av: any, idx: number) => {
      builtOptions.push({
        optionKey: `avatar_${av.id || idx}`,
        group: 'avatar',
        label: `👤 [Avatar] ${av.name || 'Character Avatar'}${
          av.series_title ? ` (${av.series_title})` : ''
        }`,
        tag: 'AVATAR',
        title: `${av.name || 'Exclusive'} Character Avatar`,
        description: `Exclusive "${av.name || 'Character'}" profile avatar unlock.`,
        imageUrl: av.image_url
      });
    });

    setStoreCatalogOptions(builtOptions);
  }, [contextSeriesList, contextSkins, contextAvatars, studioProductId, studioSeriesSlug]);

  useEffect(() => {
    fetchPrizeStoreCatalog();
    window.addEventListener('vaultUpdated', fetchPrizeStoreCatalog);
    return () => window.removeEventListener('vaultUpdated', fetchPrizeStoreCatalog);
  }, [fetchPrizeStoreCatalog]);

  const allMasterSkins = useMemo(() => {
    const map = new Map<string, any>();
    [...(contextSkins || []), ...(dbSkins || [])].forEach((sk: any) => {
      if (sk && sk.id && sk.image_url) map.set(String(sk.id), sk);
    });
    return Array.from(map.values());
  }, [contextSkins, dbSkins]);

  const allMasterAvatars = useMemo(() => {
    const map = new Map<string, any>();
    [...(contextAvatars || []), ...(dbAvatars || [])].forEach((av: any) => {
      if (av && av.image_url) map.set(String(av.image_url), av);
    });
    return Array.from(map.values());
  }, [contextAvatars, dbAvatars]);

  const buildProductAssets = useCallback(
    (prod: any): StudioAssetOption[] => {
      if (!prod) return [];
      const list: StudioAssetOption[] = [];
      const seen = new Set<string>();

      const rawSkinIds: string[] = [
        ...(Array.isArray(prod.card_skin_ids) ? prod.card_skin_ids : []),
        prod.card_skin_id,
        prod.card_skin_2_id
      ]
        .filter(Boolean)
        .map(String);

      rawSkinIds.forEach((id, idx) => {
        const sk = allMasterSkins.find(s => String(s.id) === String(id));
        if (sk?.image_url && !seen.has(sk.image_url)) {
          seen.add(sk.image_url);
          list.push({
            id: `skin_${sk.id}`,
            label: sk.name || `Hype Card #${idx + 1}`,
            type: 'card_skin',
            image_url: sk.image_url
          });
        }
      });

      const avUrls: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      avUrls.forEach((url, idx) => {
        if (seen.has(url)) return;
        seen.add(url);
        const matchedAv = allMasterAvatars.find(a => a.image_url === url);
        const cleanName = matchedAv?.name
          ? matchedAv.name.replace(/mmwog/i, '').trim()
          : `Avatar #${idx + 1}`;
        list.push({
          id: `av_${idx}_${url.slice(-8)}`,
          label: cleanName,
          type: 'avatar',
          image_url: url
        });
      });

      return list;
    },
    [allMasterSkins, allMasterAvatars]
  );

  const selectedStudioProduct = useMemo(() => {
    return (
      storeProducts.find(p => String(p.id) === String(studioProductId)) ||
      storeProducts[0] ||
      null
    );
  }, [storeProducts, studioProductId]);

  const selectedStudioSeries = useMemo(() => {
    return (
      allSeries.find(s => String(s.slug) === String(studioSeriesSlug)) ||
      allSeries[0] ||
      null
    );
  }, [allSeries, studioSeriesSlug]);

  const studioProductAssets = useMemo(() => {
    return buildProductAssets(selectedStudioProduct);
  }, [selectedStudioProduct, buildProductAssets]);

  const studioCardAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'card_skin'),
    [studioProductAssets]
  );

  const studioAvatarAssets = useMemo(
    () => studioProductAssets.filter(a => a.type === 'avatar'),
    [studioProductAssets]
  );

  const loadProductIntoBannerStudio = useCallback(
    (prod: any) => {
      if (!prod) return;
      const assets = buildProductAssets(prod);
      const cards = assets.filter(a => a.type === 'card_skin');
      const avatars: string[] = Array.isArray(prod.avatar_urls)
        ? prod.avatar_urls.filter(Boolean)
        : [];
      const autographs: string[] = Array.isArray(prod.autograph_creators)
        ? prod.autograph_creators.filter(Boolean)
        : [];

      const matchedSigs: StudioSignature[] = autographs
        .map(cName => {
          const found = creatorSignatures.find(
            s => s.signature_url && matchCreatorNames(cName, s.creator_name)
          );
          return found ? { creator_name: cName, signature_url: found.signature_url } : null;
        })
        .filter(Boolean) as StudioSignature[];

      const price = Number(prod.listed_price_dollars || 0);
      const normalPrice = Number(prod.normal_price_dollars || 0);
      const isContestBundle = !prod.is_active && String(prod.promo_badge || '').toUpperCase().includes('CONTEST');
      const priceLabel = isContestBundle ? '$50 OFF SHOP' : price === 0 ? 'FREE' : `$${price}`;
      const origLabel = normalPrice > price && normalPrice > 0 ? `$${normalPrice}` : '';

      const bonusHypes = Number(prod.bonus_vaulted_hypes || (isContestBundle ? 5 : 0));
      const includePass = Boolean(prod.include_1yr_sub);

      const subParts: string[] = [];
      if (includePass) subParts.push('1-Yr VIP Pass');
      if (bonusHypes > 0) subParts.push(`+${bonusHypes} Gold Hypes`);
      if (cards.length > 0) subParts.push(`${cards.length} Hype Card Skins`);
      if (avatars.length > 0) subParts.push(`${avatars.length} Exclusive Avatars`);

      setStudioBgUrl(cards[0]?.image_url || assets[0]?.image_url || avatars[0] || '');
      setPcZoom(100);
      setPcPanX(50);
      setPcPanY(50);
      setPcVignette(35);

      setMobileZoom(118);
      setMobilePanX(50);
      setMobilePanY(25);
      setMobileVignette(45);

      setStudioBadge(prod.promo_badge || (isContestBundle ? '#1 SUPER FAN PRIZE POOL' : 'SPECIAL STORE DROP'));
      setStudioHeadline(String(prod.title || 'SPECIAL EDITION DROP').toUpperCase());
      setStudioSubheadline(
        subParts.join(' • ') || prod.description || 'Limited-Time Digital Loadout Drop'
      );
      setStudioPriceLabel(priceLabel);
      setStudioOrigPriceLabel(origLabel);
      setStudioCtaLabel(isContestBundle ? 'SEE ALL PRIZES' : price === 0 ? 'CLAIM FREE' : `UNLOCK (${priceLabel})`);
      setStudioAvatars(avatars);
      setStudioSigs(matchedSigs);
      setStudioBonusHypes(bonusHypes);
      setStudioIncludePass(includePass);
      setStudioCardCount(cards.length);
    },
    [buildProductAssets, creatorSignatures]
  );

  const loadSeriesIntoBannerStudio = useCallback((seriesObj: any) => {
    if (!seriesObj) return;
    setStudioBgUrl(seriesObj.cover_url || seriesObj.character_url || '');
    setPcZoom(108);
    setPcPanX(50);
    setPcPanY(25);
    setPcVignette(45);
    setMobileZoom(110);
    setMobilePanX(50);
    setMobilePanY(20);
    setMobileVignette(45);
    setStudioBadge('FEATURED MANGA SERIES');
    setStudioHeadline(String(seriesObj.title || 'FEATURED SERIES').toUpperCase());
    setStudioSubheadline(
      seriesObj.creator_name
        ? `By ${seriesObj.creator_name} • Read Now on Saturday AM`
        : 'Read the Latest Chapters Now on Saturday AM'
    );
    setStudioPriceLabel('');
    setStudioOrigPriceLabel('');
    setStudioCtaLabel('START READING');
    setStudioAvatars([]);
    setStudioSigs([]);
    setStudioBonusHypes(0);
    setStudioIncludePass(false);
    setStudioCardCount(0);
  }, []);

  const openStudioForSlide = (slideId: any) => {
    if (activeStudioSlideId === slideId) {
      setActiveStudioSlideId(null);
      return;
    }
    setActiveStudioSlideId(slideId);
    const defaultProd =
      storeProducts.find(p => String(p.id) === String(studioProductId)) || storeProducts[0];
    if (defaultProd) {
      setStudioSourceMode('store');
      setStudioProductId(String(defaultProd.id));
      loadProductIntoBannerStudio(defaultProd);
    } else if (allSeries[0]) {
      setStudioSourceMode('series');
      setStudioSeriesSlug(allSeries[0].slug);
      loadSeriesIntoBannerStudio(allSeries[0]);
    }
  };

  const renderBannerCanvasToBlob = async (
    mode: 'desktop' | 'mobile',
    slideId?: any
  ): Promise<Blob | null> => {
    const targetId = slideId ?? activeStudioSlideId;
    const activeSlideObj = slides.find((s: any) => String(s.id) === String(targetId));
    const isHypeCardRatio =
      activeSlideObj?.placement === 'leaderboard' ||
      String(studioBadge || '').toUpperCase().includes('CONTEST') ||
      String(studioBadge || '').toUpperCase().includes('SUPER FAN') ||
      String(studioBadge || '').toUpperCase().includes('PRIZE') ||
      String(studioCtaLabel || '').toUpperCase().includes('PRIZE');

    // When in Contest / Hype Card mode, Mobile & PC use the exact same 1580x1000 (1.58:1) dimensions and crop
    const effectiveMode = isHypeCardRatio ? 'desktop' : mode;
    const W = isHypeCardRatio ? 1580 : effectiveMode === 'desktop' ? 1800 : 900;
    const H = isHypeCardRatio ? 1000 : effectiveMode === 'desktop' ? 600 : 1350;

    const activeZoom = effectiveMode === 'desktop' ? pcZoom : mobileZoom;
    const activePanX = effectiveMode === 'desktop' ? pcPanX : mobilePanX;
    const activePanY = effectiveMode === 'desktop' ? pcPanY : mobilePanY;
    const activeVig = effectiveMode === 'desktop' ? pcVignette : mobileVignette;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    const bgImg = await loadCorsImage(studioBgUrl);
    if (bgImg) {
      const imgRatio = bgImg.width / Math.max(1, bgImg.height);
      const canvasRatio = W / H;
      let baseW = W;
      let baseH = H;
      if (imgRatio > canvasRatio) {
        baseH = H;
        baseW = H * imgRatio;
      } else {
        baseW = W;
        baseH = W / imgRatio;
      }
      const zoomFactor = Math.max(1, activeZoom / 100);
      const drawW = baseW * zoomFactor;
      const drawH = baseH * zoomFactor;

      const offsetX = (W - drawW) * (activePanX / 100);
      const offsetY = (H - drawH) * (activePanY / 100);
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    }

    const vigAlpha = Math.min(0.92, Math.max(0.2, activeVig / 100));
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.26);
    topGrad.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.85})`);
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.26);

    const botGrad = ctx.createLinearGradient(0, H * 0.68, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, `rgba(0,0,0,${vigAlpha})`);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);

    const cardThumbUrls = studioCardAssets.slice(0, 2).map(c => c.image_url);
    const physicalMerchUrl =
      activeSlice?.grandPrizeItems?.[0]?.imageUrl ||
      config?.grandPrizeItems?.[0]?.imageUrl ||
      '';

    const [loadedAvatars, loadedCards, physicalMerchImg, shopLogoImg, hypeFlameImg] =
      await Promise.all([
        Promise.all(studioAvatars.slice(0, 5).map(u => loadCorsImage(u))),
        Promise.all(cardThumbUrls.map(u => loadCorsImage(u))),
        loadCorsImage(physicalMerchUrl),
        loadCorsImage(SAT_AM_SHOP_LOGO_URL),
        loadCorsImage(GOLD_HYPE_ICON_URL)
      ]);
    const validAvatars = loadedAvatars.filter(Boolean) as HTMLImageElement[];
    const validCards = loadedCards.filter(Boolean) as HTMLImageElement[];

    const barMargin = effectiveMode === 'desktop' ? 28 : 24;
    const isHorizontalItems = studioEdgePosition === 'bottom' || studioEdgePosition === 'top';
    const itemsStripH = effectiveMode === 'desktop' ? 170 : 130;
    const headerRowH = effectiveMode === 'desktop' ? 58 : 66;

    let headerRowY = studioHeaderPosition === 'top' ? barMargin : H - barMargin - headerRowH;

    if (isHorizontalItems && studioHeaderPosition === studioEdgePosition) {
      if (studioEdgePosition === 'bottom') {
        headerRowY = H - barMargin - itemsStripH - headerRowH - 18;
      } else {
        headerRowY = barMargin;
      }
    }

    // --- ROW A: HEADLINE + SEE ALL PRIZES BUTTON ROW ---
    if (studioHeadline || studioCtaLabel) {
      const hCenterY = headerRowY + headerRowH / 2;
      let leftX = barMargin;
      let rightX = W - barMargin;

      if (!isHorizontalItems && studioEdgePosition === 'left') {
        leftX += (effectiveMode === 'desktop' ? 310 : 250) + 20;
      } else if (!isHorizontalItems && studioEdgePosition === 'right') {
        rightX -= (effectiveMode === 'desktop' ? 310 : 250) + 20;
      }

      if (studioCtaLabel) {
        ctx.font = `900 ${effectiveMode === 'desktop' ? 16 : 18}px sans-serif`;
        const ctaTxt = studioCtaLabel.toUpperCase();
        const ctaW = ctx.measureText(ctaTxt).width + 44;
        const ctaH = effectiveMode === 'desktop' ? 50 : 56;
        const ctaX = rightX - ctaW;

        ctx.fillStyle = '#fe9a00';
        drawRoundedRect(ctx, ctaX, hCenterY - ctaH / 2, ctaW, ctaH, ctaH / 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ctaTxt, ctaX + ctaW / 2, hCenterY + 1);
        ctx.textAlign = 'left';
        rightX = ctaX - 20;
      }

      if (studioHeadline) {
        const maxHeadW = Math.max(240, rightX - leftX);
        let headFont = effectiveMode === 'desktop' ? 40 : 34;
        ctx.font = `900 italic ${headFont}px sans-serif`;
        while (ctx.measureText(studioHeadline.toUpperCase()).width > maxHeadW && headFont > 20) {
          headFont -= 2;
          ctx.font = `900 italic ${headFont}px sans-serif`;
        }
        const textW = Math.min(maxHeadW, ctx.measureText(studioHeadline.toUpperCase()).width);
        const pillW = textW + 36;
        const pillH = effectiveMode === 'desktop' ? 52 : 56;

        ctx.fillStyle = 'rgba(9,9,11,0.82)';
        drawRoundedRect(ctx, leftX, hCenterY - pillH / 2, pillW, pillH, 16);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(254,154,0,0.5)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(studioHeadline.toUpperCase(), leftX + 18, hCenterY + 2);
      }
    }

    // Helper to tint the black Hype Flame PNG into a bright Gold icon
    const drawGoldTintedFlame = (x: number, y: number, w: number, h: number) => {
      if (!hypeFlameImg) return;
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.ceil(w));
      off.height = Math.max(1, Math.ceil(h));
      const octx = off.getContext('2d');
      if (!octx) return;
      octx.drawImage(hypeFlameImg, 0, 0, off.width, off.height);
      octx.globalCompositeOperation = 'source-in';
      const grad = octx.createLinearGradient(0, 0, 0, off.height);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#facc15');
      grad.addColorStop(1, '#fe9a00');
      octx.fillStyle = grad;
      octx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(off, x, y, w, h);
    };

    const cleanShopValue =
      String(studioPriceLabel || '$50')
        .toUpperCase()
        .replace(/\b(OFF|SHOP|STORE|CODE|COUPON)\b/g, '')
        .trim() || String(studioPriceLabel || '$50').toUpperCase();

    // --- ROW B: FLOATING PRIZE ASSETS (2X HYPE CARDS -> 5X AVATARS -> PHYSICAL MERCH BOX -> STACKED $50 SHOP + +5 HYPES) ---
    if (isHorizontalItems) {
      const cardH = effectiveMode === 'desktop' ? 162 : 122;
      const cardW = Math.round(cardH * 1.58);
      const cardGap = effectiveMode === 'desktop' ? 16 : 12;

      const rowBottomY =
        studioEdgePosition === 'top'
          ? (studioHeaderPosition === 'top' ? headerRowY + headerRowH + 16 : barMargin) + cardH
          : H - barMargin;
      const cardTopY = rowBottomY - cardH;
      const baselineBottomY = rowBottomY - 4;

      // 1. Left: 2 Large Floating Hype Card Thumbnails
      let curX = barMargin;
      validCards.forEach(cImg => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 6;
        drawRoundedRect(ctx, curX, cardTopY, cardW, cardH, 18);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(cImg, curX, cardTopY, cardW, cardH);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, curX, cardTopY, cardW, cardH, 18);
        ctx.stroke();
        ctx.restore();

        curX += cardW + cardGap;
      });

      // 2. Far Right: Stacked [$50 SHOP] Pill on Top & [+5 HYPES] Pill on Bottom
      const stackPillW = effectiveMode === 'desktop' ? 210 : 164;
      const stackPillH = effectiveMode === 'desktop' ? 66 : 52;
      const stackGap = effectiveMode === 'desktop' ? 10 : 8;
      const totalStackH = stackPillH * 2 + stackGap;

      let rightEdgeX = W - barMargin;
      const stackX = rightEdgeX - stackPillW;
      const topPillY = baselineBottomY - totalStackH;
      const botPillY = baselineBottomY - stackPillH;

      // Top Pill: [Shop Logo + $50]
      if (studioPriceLabel) {
        const topCenterY = topPillY + stackPillH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(10,10,12,0.95)';
        drawRoundedRect(ctx, stackX, topPillY, stackPillW, stackPillH, 20);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, stackX, topPillY, stackPillW, stackPillH, 20);
        ctx.stroke();

        const logoW = shopLogoImg ? (effectiveMode === 'desktop' ? 76 : 58) : 0;
        const logoH = shopLogoImg ? (effectiveMode === 'desktop' ? 44 : 34) : 0;
        if (shopLogoImg) {
          ctx.drawImage(
            shopLogoImg,
            stackX + 16,
            topCenterY - logoH / 2,
            logoW,
            logoH
          );
        }

        ctx.font = `900 italic ${effectiveMode === 'desktop' ? 32 : 24}px sans-serif`;
        ctx.fillStyle = '#fe9a00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          cleanShopValue,
          stackX + logoW + (stackPillW - logoW) / 2,
          topCenterY + 2
        );
        ctx.textAlign = 'left';
      }

      // Bottom Pill: [+5 HYPES]
      if (studioBonusHypes > 0) {
        const botCenterY = botPillY + stackPillH / 2;
        const hTxt = `+${studioBonusHypes} HYPES`;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(56,29,6,0.95)';
        drawRoundedRect(ctx, stackX, botPillY, stackPillW, stackPillH, stackPillH / 2);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        drawRoundedRect(ctx, stackX, botPillY, stackPillW, stackPillH, stackPillH / 2);
        ctx.stroke();

        const flameW = hypeFlameImg ? (effectiveMode === 'desktop' ? 28 : 22) : 0;
        const flameH = hypeFlameImg ? (effectiveMode === 'desktop' ? 32 : 26) : 0;
        if (hypeFlameImg) {
          drawGoldTintedFlame(
            stackX + 20,
            botCenterY - flameH / 2,
            flameW,
            flameH
          );
        }

        ctx.font = `900 ${effectiveMode === 'desktop' ? 22 : 18}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          hTxt,
          stackX + flameW + 10 + (stackPillW - flameW - 10) / 2,
          botCenterY + 2
        );
        ctx.textAlign = 'left';
      }

      rightEdgeX = stackX - (effectiveMode === 'desktop' ? 18 : 12);

      // 3. Physical Item Square Box (Left of the Stacked Pills, matching their height)
      if (physicalMerchImg) {
        const merchBoxSize = totalStackH;
        const merchX = rightEdgeX - merchBoxSize;
        const merchY = baselineBottomY - merchBoxSize;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 5;
        drawRoundedRect(ctx, merchX, merchY, merchBoxSize, merchBoxSize, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(physicalMerchImg, merchX, merchY, merchBoxSize, merchBoxSize);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, merchX, merchY, merchBoxSize, merchBoxSize, 16);
        ctx.stroke();
        ctx.restore();

        rightEdgeX = merchX - (effectiveMode === 'desktop' ? 20 : 14);
      }

      // 4. Center: 5 Large Overlapping Character Avatars (Between Cards and Physical Item Box)
      if (validAvatars.length > 0) {
        const avSize = effectiveMode === 'desktop' ? 114 : 86;
        const avStep = effectiveMode === 'desktop' ? 76 : 58;
        const totalAvW = avSize + (validAvatars.length - 1) * avStep;

        const availCenterStart = curX + 4;
        const availCenterEnd = rightEdgeX - 4;
        const centeredStartX = Math.max(
          availCenterStart,
          availCenterStart + (availCenterEnd - availCenterStart - totalAvW) / 2
        );
        const avCenterY = baselineBottomY - avSize / 2;

        validAvatars.forEach((avImg, idx) => {
          const cx = centeredStartX + idx * avStep + avSize / 2;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.88)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = '#09090b';
          ctx.fill();
          ctx.clip();
          ctx.drawImage(avImg, cx - avSize / 2, avCenterY - avSize / 2, avSize, avSize);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, avCenterY, avSize / 2, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#fe9a00';
          ctx.stroke();
        });
      }
    } else {
      // Vertical Left or Right Floating Stack
      const railW = effectiveMode === 'desktop' ? 340 : 280;
      const railX = studioEdgePosition === 'left' ? barMargin : W - barMargin - railW;
      const centerX = railX + railW / 2;
      let curY = H * 0.18;
      ctx.textAlign = 'center';

      if (validCards.length > 0) {
        const cardH = 92;
        const cardW = Math.round(cardH * 1.58);
        const gap = 12;
        const totalCardsW = validCards.length * cardW + (validCards.length - 1) * gap;
        let startCardX = centerX - totalCardsW / 2;

        validCards.forEach(cImg => {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 18;
          drawRoundedRect(ctx, startCardX, curY, cardW, cardH, 12);
          ctx.clip();
          ctx.drawImage(cImg, startCardX, curY, cardW, cardH);
          ctx.restore();

          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fe9a00';
          drawRoundedRect(ctx, startCardX, curY, cardW, cardH, 12);
          ctx.stroke();
          startCardX += cardW + gap;
        });
        curY += cardH + 20;
      }

      if (validAvatars.length > 0) {
        const avSize = 74;
        const avStep = 54;
        const totalW = avSize + (validAvatars.length - 1) * avStep;
        const startX = centerX - totalW / 2;
        const avY = curY + avSize / 2;
        validAvatars.forEach((avImg, idx) => {
          const cx = startX + idx * avStep + avSize / 2;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(cx, avY, avSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avImg, cx - avSize / 2, avY - avSize / 2, avSize, avSize);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(cx, avY, avSize / 2, 0, Math.PI * 2);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#fe9a00';
          ctx.stroke();
        });
        curY += avSize + 20;
      }

      if (physicalMerchImg) {
        const mSize = 110;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        drawRoundedRect(ctx, centerX - mSize / 2, curY, mSize, mSize, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(physicalMerchImg, centerX - mSize / 2, curY, mSize, mSize);
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        drawRoundedRect(ctx, centerX - mSize / 2, curY, mSize, mSize, 14);
        ctx.stroke();
        curY += mSize + 18;
      }

      if (studioPriceLabel) {
        const badgeW = railW - 36;
        const badgeH = 58;
        ctx.fillStyle = 'rgba(10,10,12,0.95)';
        drawRoundedRect(ctx, centerX - badgeW / 2, curY, badgeW, badgeH, 20);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fe9a00';
        ctx.stroke();
        ctx.font = '900 italic 28px sans-serif';
        ctx.fillStyle = '#fe9a00';
        ctx.fillText(cleanShopValue, centerX + 34, curY + badgeH / 2 + 2);
        if (shopLogoImg) {
          ctx.drawImage(shopLogoImg, centerX - badgeW / 2 + 22, curY + 10, 68, 38);
        }
        curY += badgeH + 12;
      }

      if (studioBonusHypes > 0) {
        const hW = railW - 36;
        const hH = 56;
        ctx.fillStyle = 'rgba(56,29,6,0.95)';
        drawRoundedRect(ctx, centerX - hW / 2, curY, hW, hH, 28);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        ctx.stroke();
        ctx.font = '900 20px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`+${studioBonusHypes} HYPES`, centerX + 14, curY + hH / 2 + 2);
        if (hypeFlameImg) {
          drawGoldTintedFlame(centerX - hW / 2 + 22, curY + 12, 26, 30);
        }
      }
      ctx.textAlign = 'left';
    }

    return new Promise(resolve => {
      canvas.toBlob(
        blob => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(blob);
        },
        'image/webp',
        0.88
      );
    });
  };
  const persistSlidesToDatabase = async (slidesToSave: any[]) => {
    const { error: slideDelErr } = await supabase
      .from('hero_slides')
      .delete()
      .not('id', 'is', null);
    if (slideDelErr) throw slideDelErr;

    const validSlides = slidesToSave
      .filter((s: any) => s.desktop_url || s.mobile_url)
      .map((slide: any) => {
        const p = slide.placement || 'home';
        const baseType = slide.linkType || 'series';
        return {
          desktop_url: slide.desktop_url,
          mobile_url: slide.mobile_url,
          link_type: p === 'home' ? baseType : `${p}::${baseType}`,
          link_target: slide.linkTarget || ''
        };
      });

    if (validSlides.length > 0) {
      const { error: slideInsErr } = await supabase.from('hero_slides').insert(validSlides);
      if (slideInsErr) throw slideInsErr;
    }
  };

  const handleGenerateAndApplyBanners = async (slideId: any, silent = false) => {
    if (!studioBgUrl) {
      if (!silent) alert('Please select or upload background artwork first!');
      return;
    }

    setIsGeneratingBanners(true);
    try {
      const [desktopBlob, mobileBlob] = await Promise.all([
        renderBannerCanvasToBlob('desktop', slideId),
        renderBannerCanvasToBlob('mobile', slideId)
      ]);

      if (!desktopBlob || !mobileBlob) {
        throw new Error('Could not generate banner images.');
      }

      const ts = Date.now();
      const desktopPath = `hero-banners/store_hero_pc_${ts}.webp`;
      const mobilePath = `hero-banners/store_hero_mobile_${ts}.webp`;

      const [upDesktop, upMobile] = await Promise.all([
        supabase.storage
          .from('assets')
          .upload(desktopPath, desktopBlob, {
            upsert: true,
            contentType: 'image/webp',
            cacheControl: '31536000'
          }),
        supabase.storage
          .from('assets')
          .upload(mobilePath, mobileBlob, {
            upsert: true,
            contentType: 'image/webp',
            cacheControl: '31536000'
          })
      ]);

      let desktopFinalUrl = '';
      let mobileFinalUrl = '';

      if (!upDesktop.error) {
        desktopFinalUrl =
          supabase.storage.from('assets').getPublicUrl(desktopPath).data?.publicUrl || '';
      }
      if (!upMobile.error) {
        mobileFinalUrl =
          supabase.storage.from('assets').getPublicUrl(mobilePath).data?.publicUrl || '';
      }

      if (!desktopFinalUrl) desktopFinalUrl = URL.createObjectURL(desktopBlob);
      if (!mobileFinalUrl) mobileFinalUrl = URL.createObjectURL(mobileBlob);

      const currentSlideObj = slides.find((s: any) => s.id === slideId);
      const isContestLook =
        currentSlideObj?.placement === 'leaderboard' ||
        String(studioBadge || '').toUpperCase().includes('CONTEST') ||
        String(studioBadge || '').toUpperCase().includes('SUPER FAN') ||
        String(studioCtaLabel || '').toUpperCase().includes('PRIZE');

      const resolvedPlacement = isContestLook
        ? 'leaderboard'
        : currentSlideObj?.placement || 'home';

      const nextLinkType =
        studioSourceMode === 'series' && resolvedPlacement !== 'leaderboard'
          ? 'series'
          : 'external';
      const nextLinkTarget =
        resolvedPlacement === 'leaderboard'
          ? '/?view=leaderboard'
          : studioSourceMode === 'series' && selectedStudioSeries
          ? selectedStudioSeries.slug
          : selectedStudioProduct
          ? `/?view=shop&item=${encodeURIComponent(
              selectedStudioProduct.slug || selectedStudioProduct.id
            )}`
          : `/?view=shop`;

      const now = new Date();
      const liveCurrentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const isFutureScheduledLeaderboard =
        resolvedPlacement === 'leaderboard' &&
        selectedScheduleKey !== 'default' &&
        selectedScheduleKey !== liveCurrentMonthKey;

      // Only overwrite live hero_slides if editing the current live month or Default template
      if (!isFutureScheduledLeaderboard) {
        const updatedSlides = slides.map((s: any) =>
          s.id === slideId
            ? {
                ...s,
                placement: resolvedPlacement,
                desktop_url: desktopFinalUrl,
                mobile_url: mobileFinalUrl,
                linkType: nextLinkType,
                linkTarget: nextLinkTarget
              }
            : s
        );

        setSlides(updatedSlides);
        await persistSlidesToDatabase(updatedSlides);
      }

      if (resolvedPlacement === 'leaderboard') {
        const generatedHeroUrl = desktopFinalUrl || mobileFinalUrl || config.heroBannerUrl;
        let nextConfig: LeaderboardPrizesConfig;

        if (selectedScheduleKey !== 'default') {
          const prevMonthSlice = config.scheduledMonths?.[selectedScheduleKey] || {
            contestTheme: activeSlice.contestTheme,
            seasonTitle: activeSlice.seasonTitle,
            seasonSubtitle: activeSlice.seasonSubtitle,
            heroBannerUrl: generatedHeroUrl,
            grandPrizeItems: activeSlice.grandPrizeItems,
            tiers: activeSlice.tiers
          };
          nextConfig = {
            ...config,
            scheduledMonths: {
              ...(config.scheduledMonths || {}),
              [selectedScheduleKey]: {
                ...prevMonthSlice,
                heroBannerUrl: generatedHeroUrl
              }
            }
          };
        } else {
          nextConfig = {
            ...config,
            heroBannerUrl: generatedHeroUrl
          };
        }

        setConfig(nextConfig);
        localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(nextConfig));
        await supabase.from('app_settings').upsert({
          id: 1,
          leaderboard_prizes_config: nextConfig
        });
      }

      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      if (setIsDirty) setIsDirty(false);
      setActiveStudioSlideId(null);

      if (!silent) {
        alert(
          resolvedPlacement === 'leaderboard'
            ? 'SUCCESS! PC & Mobile Contest Banners generated and published live to the Leaderboard Top Fans tab!'
            : 'SUCCESS! PC & Mobile Hero Banners generated and saved live!'
        );
      }
    } catch (err: any) {
      if (!silent) {
        alert('Failed to generate hero banners: ' + (err.message || 'Please try again.'));
      }
    } finally {
      setIsGeneratingBanners(false);
    }
  };

  const addSlide = () => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    setSlides(prev => [
      ...prev,
      {
        id: newId,
        placement: 'leaderboard',
        linkType: 'external',
        linkTarget: '/?view=leaderboard',
        desktop_url: '',
        mobile_url: ''
      }
    ]);
    openStudioForSlide(newId);
    if (setIsDirty) setIsDirty(true);

    setTimeout(() => {
      const el = document.getElementById(`hero-slide-card-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  const removeSlide = (idToRemove: any) => {
    if (!window.confirm('Delete this hero slide?')) return;
    setSlides(prev => prev.filter((slide: any) => slide.id !== idToRemove));
    if (setIsDirty) setIsDirty(true);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      return next;
    });
    if (setIsDirty) setIsDirty(true);
  };

  const updateSlide = (id: any, field: string, value: any) => {
    setSlides(prev =>
      prev.map((slide: any) => (slide.id === id ? { ...slide, [field]: value } : slide))
    );
    if (setIsDirty) setIsDirty(true);
  };

  const handleSaveHeroSlides = async () => {
    setIsSavingSlides(true);
    try {
      await persistSlidesToDatabase(slides);
      window.dispatchEvent(new Event('seriesUpdated'));
      window.dispatchEvent(new Event('vaultUpdated'));
      await fetchPrizeStoreCatalog();
      if (setIsDirty) setIsDirty(false);
      alert('SUCCESS! All Hero Banners saved across the app!');
    } catch (err: any) {
      alert('Failed to save Hero Banners: ' + err.message);
    } finally {
      setIsSavingSlides(false);
    }
  };

  // LIVE PREVIEW: Large Visual Prizes Bar (No Orange Text Pill + Gold Hype Icon + Unified 1.58:1 Hype Card Ratio)
  const renderLiveBannerPreview = (mode: 'desktop' | 'mobile') => {
    const activeSlideObj = slides.find((s: any) => String(s.id) === String(activeStudioSlideId));
    const isHypeCardMode = activeSlideObj?.placement === 'leaderboard';
    const effectiveMode = isHypeCardMode ? 'desktop' : mode;

    const zoom = (effectiveMode === 'desktop' ? pcZoom : mobileZoom) / 100;
    const panX = effectiveMode === 'desktop' ? pcPanX : mobilePanX;
    const panY = effectiveMode === 'desktop' ? pcPanY : mobilePanY;
    const isHorizontal = studioEdgePosition === 'bottom' || studioEdgePosition === 'top';

    const HeaderRow = (
      <div className="relative z-10 w-full flex items-center justify-between gap-2 pointer-events-none">
        {studioHeadline ? (
          <div className="px-3.5 py-1.5 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-[#fe9a00]/60 shadow-lg max-w-[68%]">
            <span
              className={`font-black italic uppercase tracking-tight text-white block truncate ${
                effectiveMode === 'desktop' ? 'text-sm sm:text-base' : 'text-xs'
              }`}
            >
              {studioHeadline}
            </span>
          </div>
        ) : (
          <div />
        )}

        {studioCtaLabel && (
          <span
            className={`px-3.5 py-1.5 rounded-full bg-[#fe9a00] text-black font-black uppercase tracking-wider shadow-[0_0_15px_rgba(254,154,0,0.5)] shrink-0 ${
              effectiveMode === 'desktop' ? 'text-[9px] sm:text-[10px]' : 'text-[8px]'
            }`}
          >
            {studioCtaLabel}
          </span>
        )}
      </div>
    );

    const cleanPreviewShopVal =
      String(studioPriceLabel || '$50')
        .toUpperCase()
        .replace(/\b(OFF|SHOP|STORE|CODE|COUPON)\b/g, '')
        .trim() || String(studioPriceLabel || '$50').toUpperCase();

    const previewPhysicalMerchUrl =
      activeSlice?.grandPrizeItems?.[0]?.imageUrl ||
      config?.grandPrizeItems?.[0]?.imageUrl ||
      '';

    const ItemsBar = (
      <div
        className={`relative z-10 pointer-events-none ${
          isHorizontal
            ? 'w-full flex items-end justify-between gap-2 pt-2'
            : 'w-[48%] flex flex-col items-center text-center gap-2.5 my-auto'
        }`}
      >
        {/* 1. Left: 2 Large Floating Hype Card Thumbnails */}
        <div className="flex items-end gap-1.5 sm:gap-2 shrink-0">
          {studioCardAssets.slice(0, 2).map(card => (
            <div
              key={card.id}
              className="h-12 sm:h-[68px] aspect-[1.58] rounded-xl overflow-hidden border-2 border-[#fe9a00] bg-black shadow-[0_8px_24px_rgba(0,0,0,0.9)] shrink-0"
            >
              <img
                src={card.image_url}
                alt={card.label}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* 2. Center: 5 Large Overlapping Character Avatars */}
        {studioAvatars.length > 0 && (
          <div className="flex items-center -space-x-2.5 sm:-space-x-3 shrink-0 pb-0.5">
            {studioAvatars.slice(0, 5).map((u, idx) => (
              <img
                key={idx}
                src={u}
                alt=""
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-950 shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
              />
            ))}
          </div>
        )}

        {/* 3. Right Group: Physical Item Box + Stacked [$50 Shop / +5 Hypes] Pills */}
        <div className="flex items-end gap-1.5 sm:gap-2 shrink-0">
          {previewPhysicalMerchUrl && (
            <div className="w-14 h-14 sm:w-[66px] sm:h-[66px] rounded-xl overflow-hidden border-2 border-[#fe9a00] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.9)] shrink-0">
              <img
                src={previewPhysicalMerchUrl}
                alt="Physical Item"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0">
            {studioPriceLabel && (
              <span className="h-6 sm:h-[30px] px-2.5 sm:px-3 rounded-xl bg-zinc-950/95 border-2 border-[#fe9a00] text-[#fe9a00] text-xs sm:text-sm font-black italic uppercase flex items-center justify-between gap-1.5 shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
                <img
                  src={SAT_AM_SHOP_LOGO_URL}
                  alt="Sat AM Shop"
                  className="h-3.5 sm:h-4 w-auto object-contain"
                />
                <span>{cleanPreviewShopVal}</span>
              </span>
            )}

            {studioBonusHypes > 0 && (
              <span className="h-6 sm:h-[30px] px-2.5 sm:px-3 rounded-full bg-[#381d06]/95 border-2 border-yellow-400 text-white text-[9px] sm:text-[10px] font-black uppercase flex items-center justify-center gap-1 shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
                <span
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline-block shrink-0 bg-gradient-to-b from-yellow-200 via-yellow-400 to-[#fe9a00]"
                  style={{
                    WebkitMaskImage: `url('${GOLD_HYPE_ICON_URL}')`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: `url('${GOLD_HYPE_ICON_URL}')`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                +{studioBonusHypes} HYPES
              </span>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div
        onClick={() => setActiveCropDevice(isHypeCardMode || mode === 'desktop' ? 'pc' : 'mobile')}
        className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all bg-zinc-950 select-none shadow-2xl flex flex-col justify-between cursor-pointer ${
          isHypeCardMode
            ? 'aspect-[1.58] p-3.5 sm:p-4'
            : mode === 'desktop'
            ? 'aspect-[3/1] p-2.5 sm:p-3.5'
            : 'aspect-[2/3] max-w-[240px] mx-auto p-2.5'
        } ${
          isHypeCardMode ||
          (mode === 'desktop' && activeCropDevice === 'pc') ||
          (mode === 'mobile' && activeCropDevice === 'mobile')
            ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/40'
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
      >
        {studioBgUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={studioBgUrl}
              alt="Hero Preview"
              className="w-full h-full object-cover transition-transform duration-150"
              style={{
                objectPosition: `${panX}% ${panY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${panX}% ${panY}%`
              }}
            />
          </div>
        )}

        {/* TOP ZONE */}
        <div className="relative z-10 flex flex-col gap-1.5 w-full">
          {studioHeaderPosition === 'top' && HeaderRow}
          {studioEdgePosition === 'top' && ItemsBar}
        </div>

        {/* MIDDLE ZONE (Used when Items Bar is docked Left or Right) */}
        {!isHorizontal && (
          <div
            className={`relative z-10 w-full flex my-auto ${
              studioEdgePosition === 'left' ? 'justify-start' : 'justify-end'
            }`}
          >
            {ItemsBar}
          </div>
        )}

        {/* BOTTOM ZONE */}
        <div className="relative z-10 flex flex-col gap-1.5 w-full mt-auto">
          {studioHeaderPosition === 'bottom' && HeaderRow}
          {studioEdgePosition === 'bottom' && ItemsBar}
        </div>
      </div>
    );
  };

  const activeSlice = useMemo(() => {
    const existingMonth =
      selectedScheduleKey !== 'default'
        ? config.scheduledMonths?.[selectedScheduleKey]
        : null;
    const src = existingMonth || config;

    return {
      contestTheme: src.contestTheme ?? config.contestTheme ?? 'Monthly Fandom Prize Pool',
      seasonTitle: src.seasonTitle || config.seasonTitle,
      seasonSubtitle: src.seasonSubtitle || config.seasonSubtitle,
      heroBannerUrl:
        src.heroBannerUrl ||
        config.heroBannerUrl ||
        DEFAULT_LEADERBOARD_PRIZES_CONFIG.heroBannerUrl,
      grandPrizeItems: normalizeGrandPrizeItems(src.grandPrizeItems || config.grandPrizeItems),
      tiers: normalizeFivePrizeTiers(src.tiers || config.tiers)
    };
  }, [config, selectedScheduleKey]);

  const updateSliceField = (field: string, value: any) => {
    setConfig((prev: LeaderboardPrizesConfig) => {
      if (selectedScheduleKey === 'default') {
        return { ...prev, [field]: value };
      }
      const prevMonth = prev.scheduledMonths?.[selectedScheduleKey] || {
        contestTheme: prev.contestTheme,
        seasonTitle: prev.seasonTitle,
        seasonSubtitle: prev.seasonSubtitle,
        heroBannerUrl: prev.heroBannerUrl,
        grandPrizeItems: normalizeGrandPrizeItems(prev.grandPrizeItems),
        tiers: normalizeFivePrizeTiers(prev.tiers)
      };
      return {
        ...prev,
        scheduledMonths: {
          ...(prev.scheduledMonths || {}),
          [selectedScheduleKey]: {
            ...prevMonth,
            [field]: value
          }
        }
      };
    });
    if (setIsDirty) setIsDirty(true);
  };

  const updateGrandPrizeItem = (
    index: number,
    field: keyof GrandPrizeStackItem,
    value: any
  ) => {
    const nextItems = activeSlice.grandPrizeItems.map((item: GrandPrizeStackItem, idx: number) =>
      idx === index ? { ...item, [field]: value } : item
    );
    updateSliceField('grandPrizeItems', nextItems);
  };

  const handleSelectStoreItemForGrandPrize = (index: number, optionKey: string) => {
    if (!optionKey) {
      updateGrandPrizeItem(index, 'linkedStoreProductId', '');
      return;
    }
    const found = storeCatalogOptions.find(o => o.optionKey === optionKey);
    if (!found) return;

    const nextItems = activeSlice.grandPrizeItems.map((item: GrandPrizeStackItem, idx: number) =>
      idx === index
        ? {
            ...item,
            linkedStoreProductId: found.optionKey,
            tag: found.tag || item.tag,
            title: found.title || item.title,
            description: found.description || item.description,
            imageUrl: found.imageUrl || item.imageUrl
          }
        : item
    );
    updateSliceField('grandPrizeItems', nextItems);
  };

  const handleAddGrandPrizeItem = () => {
    const nextItems: GrandPrizeStackItem[] = [
      ...activeSlice.grandPrizeItems,
      {
        id: `gp-${Date.now()}`,
        tag: 'BONUS',
        title: 'New Grand Prize Item',
        description: '',
        imageUrl:
          'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png',
        linkedStoreProductId: '',
        showShopLogo: false,
        shopLogoCorner: 'top-right'
      }
    ];
    updateSliceField('grandPrizeItems', nextItems);
  };

  const handleRemoveGrandPrizeItem = (index: number) => {
    if (activeSlice.grandPrizeItems.length <= 1) return;
    const nextItems = activeSlice.grandPrizeItems.filter(
      (_: GrandPrizeStackItem, idx: number) => idx !== index
    );
    updateSliceField('grandPrizeItems', nextItems);
  };

  const updateTier = (place: 1 | 2 | 3 | 4 | 5, field: string, value: any) => {
    const updatedTiers: LeaderboardPrizeTierConfig[] = activeSlice.tiers.map(
      (t: LeaderboardPrizeTierConfig) => (t.place === place ? { ...t, [field]: value } : t)
    );
    updateSliceField('tiers', updatedTiers);
  };

  const handleSelectStoreItemForRunnerUpTier = (
    place: 1 | 2 | 3 | 4 | 5,
    optionKey: string
  ) => {
    if (!optionKey) {
      updateTier(place, 'linkedStoreProductId', '');
      return;
    }
    const found = storeCatalogOptions.find(o => o.optionKey === optionKey);
    if (!found) return;

    const updatedTiers: LeaderboardPrizeTierConfig[] = activeSlice.tiers.map(
      (t: any) => {
        if (t.place !== place) return t;
        const secondaryFound = t.secondaryStoreProductId
          ? storeCatalogOptions.find(o => o.optionKey === t.secondaryStoreProductId)
          : null;
        const combinedTitle = secondaryFound
          ? `${found.title} + ${secondaryFound.title}`
          : found.title || t.title;

        return {
          ...t,
          linkedStoreProductId: found.optionKey,
          title: combinedTitle,
          description: found.description || t.description,
          imageUrl: found.imageUrl || t.imageUrl
        };
      }
    );
    updateSliceField('tiers', updatedTiers);
  };

  const handleSelectSecondaryStoreItemForTier = (
    place: 1 | 2 | 3 | 4 | 5,
    optionKey: string
  ) => {
    if (!optionKey) {
      updateTier(place, 'secondaryStoreProductId', '');
      return;
    }
    const found = storeCatalogOptions.find(o => o.optionKey === optionKey);
    if (!found) return;

    const updatedTiers: LeaderboardPrizeTierConfig[] = activeSlice.tiers.map(
      (t: any) => {
        if (t.place !== place) return t;
        const primaryFound = t.linkedStoreProductId
          ? storeCatalogOptions.find(o => o.optionKey === t.linkedStoreProductId)
          : null;
        const combinedTitle = primaryFound
          ? `${primaryFound.title} + ${found.title}`
          : `${t.title} + ${found.title}`;

        const nextPerks = Array.isArray(t.perks) ? [...t.perks] : [];
        if (!nextPerks.some((p: string) => p.toLowerCase().includes('avatar'))) {
          nextPerks.unshift('5x Avatars');
        }
        if (
          primaryFound &&
          !nextPerks.some((p: string) => p.toLowerCase().includes('skin') || p.toLowerCase().includes('card'))
        ) {
          nextPerks.unshift('1x Hype Card Skin');
        }

        return {
          ...t,
          secondaryStoreProductId: found.optionKey,
          title: combinedTitle,
          perks: nextPerks
        };
      }
    );
    updateSliceField('tiers', updatedTiers);
  };

  const handleClearScheduledMonth = (monthKey: string) => {
    if (
      !window.confirm(
        `Remove custom schedule for ${monthKey} and revert it to the Default Template?`
      )
    )
      return;
    setConfig((prev: LeaderboardPrizesConfig) => {
      const nextMap = { ...(prev.scheduledMonths || {}) };
      delete nextMap[monthKey];
      return { ...prev, scheduledMonths: nextMap };
    });
    if (setIsDirty) setIsDirty(true);
  };

  const handleSavePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    if (activeStudioSlideId && studioBgUrl) {
      await handleGenerateAndApplyBanners(activeStudioSlideId, true);
    } else {
      await persistSlidesToDatabase(slides);
    }

    try {
      localStorage.setItem('am_leaderboard_prizes_config', JSON.stringify(config));
    } catch {
      // ignore
    }

    const { error } = await supabase.from('app_settings').upsert({
      id: 1,
      leaderboard_prizes_config: config
    });

    setIsSaving(false);

    if (error) {
      setSaveMessage('Saved to local staging preview!');
    } else {
      setSaveMessage(
        selectedScheduleKey === 'default'
          ? 'Contest Prizes saved live!'
          : `Scheduled Contest Prizes for ${selectedScheduleKey} saved!`
      );
    }
    if (setIsDirty) setIsDirty(false);
    setTimeout(() => setSaveMessage(null), 5000);
  };

  const scheduledMonthKeys = Object.keys(config.scheduledMonths || {}).sort();
  const tier1 = activeSlice.tiers.find((t: LeaderboardPrizeTierConfig) => t.place === 1);
  const tiers2And3 = activeSlice.tiers.filter(
    (t: LeaderboardPrizeTierConfig) => t.place === 2 || t.place === 3
  );
  const tiers4And5 = activeSlice.tiers.filter(
    (t: LeaderboardPrizeTierConfig) => t.place === 4 || t.place === 5
  );

  const storeBundleOpts = storeCatalogOptions.filter(o => o.group === 'store_bundle');
  const cardSkinOpts = storeCatalogOptions.filter(o => o.group === 'card_skin');
  const avatarOpts = storeCatalogOptions.filter(o => o.group === 'avatar');

  const activeLeaderboardHeroUrl = useMemo(() => {
    const lbSlide = slides.find((s: any) => s.placement === 'leaderboard');
    return lbSlide?.desktop_url || lbSlide?.mobile_url || activeSlice.heroBannerUrl;
  }, [slides, activeSlice.heroBannerUrl]);

  const renderShopDiscountBadge = (label?: string) => {
    if (!label || !label.trim()) return null;
    return (
      <div className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-[#fe9a00] shadow-[0_0_12px_rgba(254,154,0,0.3)] shrink-0">
        <img
          src={SAT_AM_SHOP_LOGO_URL}
          alt="Sat AM Shop"
          className="h-4 w-auto object-contain shrink-0"
        />
        <span className="text-[9px] font-black uppercase tracking-wider text-[#fe9a00] whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  };

  const renderGoldHypesBadge = (count?: number) => {
    const num = Number(count || 0);
    if (num <= 0) return null;
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/90 border border-yellow-400 text-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.3)] shrink-0">
        <img
          src={GOLD_HYPE_ICON_URL}
          alt="Gold Hypes"
          className="w-3.5 h-3.5 object-contain shrink-0"
        />
        <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
          +{num} Gold Hype{num > 1 ? 's' : ''}
        </span>
      </div>
    );
  };

  const renderShopCodeQuickPresets = (place: 1 | 2 | 3 | 4 | 5) => (
    <div className="flex flex-wrap items-center gap-1 pt-1">
      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mr-1">
        Quick % / $ Codes:
      </span>
      {STORE_DISCOUNT_PRESETS.map(preset => (
        <button
          key={preset}
          type="button"
          onClick={() => updateTier(place, 'storeDiscountLabel', preset)}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-[#fe9a00] text-zinc-300 hover:text-black border border-zinc-700 text-[8px] font-black uppercase transition-colors cursor-pointer"
        >
          {preset.replace(' SHOP CODE', '')}
        </button>
      ))}
    </div>
  );

  const renderStoreItemDropdown = (
    selectedValue: string | undefined,
    onSelect: (optionKey: string) => void
  ) => (
    <div className="bg-black border border-[#fe9a00]/50 rounded-lg p-2 space-y-1">
      <label className="block text-[8px] font-black uppercase tracking-widest text-[#fe9a00]">
        ⚡ Choose Existing Store / Vault Item (Auto-Fills Image &amp; Title)
      </label>
      <select
        value={selectedValue || ''}
        onChange={e => onSelect(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-white cursor-pointer focus:outline-none focus:border-[#fe9a00]"
      >
        <option value="">-- Custom / Manual Upload --</option>
        {storeBundleOpts.length > 0 && (
          <optgroup label={`In-App Store & Contest Bundles (${storeBundleOpts.length})`}>
            {storeBundleOpts.map(opt => (
              <option key={opt.optionKey} value={opt.optionKey}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        )}
        {cardSkinOpts.length > 0 && (
          <optgroup label={`Vault Hype Card Skins (${cardSkinOpts.length})`}>
            {cardSkinOpts.map(opt => (
              <option key={opt.optionKey} value={opt.optionKey}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        )}
        {avatarOpts.length > 0 && (
          <optgroup label={`Vault Character Avatars (${avatarOpts.length})`}>
            {avatarOpts.map(opt => (
              <option key={opt.optionKey} value={opt.optionKey}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg max-w-6xl animate-fade-in space-y-8">
      {previewAllPrizesModal && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewAllPrizesModal(false)}
        >
          <div
            className="bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_60px_rgba(254,154,0,0.3)] relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAllPrizesModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black italic uppercase text-[#fe9a00] mb-4">
              All Prizes Popup Preview (Ranks #1 – #5)
            </h3>

            <div className="bg-gradient-to-b from-amber-950/35 via-black to-black border-2 border-[#fe9a00] rounded-2xl p-4 mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 fill-black" /> #1 Super Fan Grand Prize Gets All:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {renderShopDiscountBadge(tier1?.storeDiscountLabel)}
                  {renderGoldHypesBadge(tier1?.goldHypesBonus ?? 5)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {activeSlice.grandPrizeItems.map((item: GrandPrizeStackItem, idx: number) => {
                  const isPureLogo = item.imageUrl === SAT_AM_SHOP_LOGO_URL;
                  const cornerClass =
                    item.shopLogoCorner === 'top-left'
                      ? 'top-2 left-2'
                      : item.shopLogoCorner === 'bottom-left'
                      ? 'bottom-2 left-2'
                      : item.shopLogoCorner === 'bottom-right'
                      ? 'bottom-2 right-2'
                      : 'top-2 right-2';

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="relative w-full aspect-[7/5] bg-black overflow-hidden flex items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={`w-full h-full ${
                            isPureLogo
                              ? 'object-contain p-4 bg-gradient-to-br from-zinc-900 via-black to-amber-950/40'
                              : 'object-cover'
                          }`}
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase shadow z-10">
                          {item.tag}
                        </span>
                        {item.showShopLogo && !isPureLogo && (
                          <div
                            className={`absolute ${cornerClass} z-20 bg-black/85 backdrop-blur-md border border-[#fe9a00] rounded-lg px-1.5 py-1 shadow-lg pointer-events-none`}
                          >
                            <img
                              src={SAT_AM_SHOP_LOGO_URL}
                              alt="Sat AM Shop"
                              className="h-4 w-auto object-contain"
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-black uppercase text-white leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Array.isArray(tier1?.perks) && tier1.perks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-zinc-800/80">
                  {tier1.perks.map((perk, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-700 text-[9px] font-black uppercase tracking-wider text-zinc-200"
                    >
                      ✓ {perk}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {tiers2And3.map((tier: LeaderboardPrizeTierConfig) => (
                <div
                  key={tier.place}
                  className="rounded-2xl p-4 border border-zinc-700 bg-black flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase">
                        {tier.rankLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {renderShopDiscountBadge(tier.storeDiscountLabel)}
                        {renderGoldHypesBadge(tier.goldHypesBonus)}
                      </div>
                    </div>
                    <div className="w-full aspect-[7/5] rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-3">
                      <img
                        src={tier.imageUrl}
                        alt={tier.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-sm font-black italic uppercase text-white mb-1.5">
                      {tier.title}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {(tier.perks || []).map((perk, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] font-black uppercase text-zinc-300"
                        >
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tiers4And5.map((tier: LeaderboardPrizeTierConfig) => (
                <div
                  key={tier.place}
                  className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-[9px] font-black uppercase text-[#fe9a00]">
                      {tier.rankLabel}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {renderShopDiscountBadge(tier.storeDiscountLabel)}
                      {renderGoldHypesBadge(tier.goldHypesBonus)}
                    </div>
                  </div>
                  <h5 className="text-sm font-black italic uppercase text-white mb-1.5">
                    {tier.title}
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {(tier.perks || []).map((perk, pIdx) => (
                      <span
                        key={pIdx}
                        className="px-2 py-0.5 rounded bg-black/60 border border-zinc-800 text-[8px] font-black uppercase text-zinc-300"
                      >
                        ✓ {perk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#fe9a00]" />
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">
              Unified Hero Banner &amp; Contest Studio
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Build PC (3:1) &amp; Mobile (2:3) Hero Banners from Store Items, Series, or Scratch • Assign to Any Page • Manage #1–#5 Super Fan Prizes &amp; 1:1 Social Graphic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPrizeStoreCatalog}
            className="px-3 py-2 rounded-xl bg-black hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-black uppercase tracking-widest cursor-pointer"
          >
            ↻ Sync Catalog ({storeCatalogOptions.length})
          </button>

          <button
            type="button"
            onClick={() => setPreviewAllPrizesModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" /> Test Prizes Popup (#1–#5)
          </button>
        </div>
      </div>

      {/* =====================================================================
          PART 1: UNIVERSAL HERO BANNER MAKER (FOR ANY PAGE IN THE APP)
      ===================================================================== */}
      <div className="bg-black border-2 border-[#fe9a00]/60 p-5 sm:p-6 rounded-2xl space-y-5 shadow-[0_0_30px_rgba(254,154,0,0.1)]">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-[#fe9a00]" />
            <div>
              <h3 className="font-black uppercase italic tracking-widest text-[#fe9a00] text-sm">
                1. Universal Hero Banner Maker ({slides.length} Active Slides)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Target Home Page, Leaderboard, Store, Creators, or Characters • Leaderboard Contest Banners automatically attach to your selected Contest Month ({selectedScheduleKey === 'default' ? 'Live / Default' : selectedScheduleKey})!
              </p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900 border border-[#fe9a00]/60 rounded-xl px-3 py-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00]">
                🗓️ Active Contest Month:
              </span>
              <select
                value={selectedScheduleKey}
                onChange={e => setSelectedScheduleKey(e.target.value)}
                className="bg-black border border-zinc-700 rounded-lg px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
              >
                {UPCOMING_SCHEDULE_MONTHS.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                    {config.scheduledMonths?.[m.key]?.heroBannerUrl ? ' 🖼️ (Banner Scheduled)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSlide}
              className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-[#fe9a00] text-white hover:text-black border border-zinc-700 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Banner Slide
            </button>

            <button
              type="button"
              onClick={handleSaveHeroSlides}
              disabled={isSavingSlides}
              className="text-[10px] font-black uppercase tracking-widest bg-[#fe9a00] hover:bg-white text-black px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(254,154,0,0.35)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSavingSlides ? 'Saving Banners...' : 'Save All Hero Banners'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {slides.map((slide: any, index: number) => {
            const isStudioOpen = activeStudioSlideId === slide.id;

            return (
              <div
                key={slide.id}
                id={`hero-slide-card-${slide.id}`}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl relative group space-y-4 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest bg-[#fe9a00]/10 border border-[#fe9a00]/30 px-2.5 py-1 rounded">
                      Slide #{index + 1}
                    </span>

                    <select
                      value={slide.placement || 'home'}
                      onChange={e => updateSlide(slide.id, 'placement', e.target.value)}
                      className="bg-zinc-900 border border-[#fe9a00]/60 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-[#fe9a00]"
                    >
                      <option value="home">🏠 Target: Home Page Carousel</option>
                      <option value="leaderboard">🏆 Target: Leaderboard Hero</option>
                      <option value="store">🛒 Target: In-App Store Hero</option>
                      <option value="creators">🎨 Target: Creators Page Hero</option>
                      <option value="characters">⚔️ Target: Characters Page Hero</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => openStudioForSlide(slide.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isStudioOpen
                          ? 'bg-[#fe9a00] text-black border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.35)]'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-[#fe9a00] border-[#fe9a00]/50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isStudioOpen
                        ? 'Close Banner Composer'
                        : '✨ Open Visual Banner Composer (PC & Mobile)'}
                    </button>

                    {isStudioOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSlide(slide.id, 'placement', 'leaderboard');
                          setStudioBadge('#1 SUPER FAN PRIZE POOL');
                          setStudioHeadline('TOP 5 SUPER FAN DROP');
                          setStudioSubheadline(
                            'Physical Shop Merch • 2x Hype Cards + 5x Avatars • $50 Shop Code • +5 Gold Hypes'
                          );
                          setStudioPriceLabel('$50');
                          setStudioBonusHypes(5);
                          setStudioCtaLabel('SEE ALL PRIZES');
                          setStudioEdgePosition('bottom');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        🏆 Load #1 Super Fan Contest Strip
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Slide Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlide(slide.id)}
                        className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 ml-1 cursor-pointer"
                        title="Delete Slide"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* VISUAL BANNER COMPOSER (STORE BUNDLE, MANGA SERIES, OR CUSTOM SCRATCH) */}
                {isStudioOpen && (
                  <div className="bg-gradient-to-b from-black via-zinc-900/90 to-black border-2 border-[#fe9a00] rounded-2xl p-5 space-y-5 shadow-[0_0_40px_rgba(254,154,0,0.2)] animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Choose Banner Source (Auto-Fills Art, 5x Avatars, Copy &amp; Destination)
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('store');
                              if (selectedStudioProduct) loadProductIntoBannerStudio(selectedStudioProduct);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'store'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            🛒 From Store Item / Contest Bundle
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('series');
                              if (selectedStudioSeries) loadSeriesIntoBannerStudio(selectedStudioSeries);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'series'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            📚 From Manga Series
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStudioSourceMode('custom');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              studioSourceMode === 'custom'
                                ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            🎨 Custom Upload / From Scratch
                          </button>
                        </div>
                      </div>

                      <div className="min-w-[260px]">
                        {studioSourceMode === 'store' && (
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Select Store Item / Bundle (Loads 5x Avatars &amp; Cards):
                            </label>
                            <select
                              value={studioProductId}
                              onChange={e => {
                                const nextId = e.target.value;
                                setStudioProductId(nextId);
                                const found = storeProducts.find(p => String(p.id) === String(nextId));
                                if (found) loadProductIntoBannerStudio(found);
                              }}
                              className="w-full bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                            >
                              {storeProducts.map(prod => (
                                <option key={prod.id} value={prod.id}>
                                  {prod.title} (${prod.listed_price_dollars ?? 0})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {studioSourceMode === 'series' && (
                          <div>
                            <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                              Select Manga Series:
                            </label>
                            <select
                              value={studioSeriesSlug}
                              onChange={e => {
                                const nextSlug = e.target.value;
                                setStudioSeriesSlug(nextSlug);
                                const found = allSeries.find(s => String(s.slug) === String(nextSlug));
                                if (found) loadSeriesIntoBannerStudio(found);
                              }}
                              className="w-full bg-zinc-900 border border-[#fe9a00] rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                            >
                              {allSeries.map((s: any) => (
                                <option key={s.slug} value={s.slug}>
                                  {s.title} {s.creator_name ? `(${s.creator_name})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {studioSourceMode === 'custom' && (
                          <Dropzone
                            label="Upload Custom Edge-to-Edge Hero Art"
                            height="p-2.5"
                            folderPath="hero-banners"
                            onUploadComplete={(url: string) => setStudioBgUrl(url)}
                          />
                        )}
                      </div>
                    </div>

                    {/* VISUAL ART PICKER FOR STORE ITEMS OR SERIES */}
                    {studioSourceMode === 'store' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Click Any Included Hype Card ({studioCardAssets.length}) or Upload Custom Photo as Edge-to-Edge Hero BG:
                          </span>
                          <div className="w-64">
                            <Dropzone
                              label="+ Or Upload Custom BG Photo"
                              height="p-1.5"
                              folderPath="hero-banners"
                              onUploadComplete={(url: string) => setStudioBgUrl(url)}
                            />
                          </div>
                        </div>

                        {studioCardAssets.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {studioCardAssets.map(card => {
                              const active = studioBgUrl === card.image_url;
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => setStudioBgUrl(card.image_url)}
                                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                    active
                                      ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50 shadow-[0_0_20px_rgba(254,154,0,0.4)]'
                                      : 'border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  <div className="w-full aspect-[1.58] bg-zinc-900 overflow-hidden relative">
                                    <img
                                      src={card.image_url}
                                      alt={card.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    {active && (
                                      <span className="absolute top-1.5 right-1.5 bg-emerald-400 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                        ✓ Active BG
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-white truncate w-full px-2 py-1 text-left bg-zinc-950">
                                    {card.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {studioAvatarAssets.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                              <Layers className="w-3 h-3 text-purple-400" /> Included Character Avatars ({studioAvatarAssets.length}) — Automatically Displayed in Edge Strip (Click Any to Use as BG):
                            </span>
                            <div className="grid grid-cols-5 gap-2">
                              {studioAvatarAssets.map(av => {
                                const active = studioBgUrl === av.image_url;
                                return (
                                  <button
                                    key={av.id}
                                    type="button"
                                    onClick={() => setStudioBgUrl(av.image_url)}
                                    className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-black ${
                                      active
                                        ? 'border-[#fe9a00] ring-2 ring-[#fe9a00]/50'
                                        : 'border-zinc-800 hover:border-zinc-600'
                                    }`}
                                  >
                                    <div className="w-full aspect-square bg-zinc-900 overflow-hidden relative">
                                      <img
                                        src={av.image_url}
                                        alt={av.label}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      {active && (
                                        <span className="absolute top-1 right-1 bg-emerald-400 text-black text-[7px] font-black uppercase px-1 rounded">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-zinc-300 truncate w-full px-1 py-1 text-center bg-zinc-950">
                                      {av.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {studioSourceMode === 'series' && selectedStudioSeries && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {[
                          { label: 'Series Cover Art', url: selectedStudioSeries.cover_url },
                          { label: 'Character / Secondary Art', url: selectedStudioSeries.character_url },
                          { label: 'Sticker Art', url: selectedStudioSeries.sticker_url }
                        ]
                          .filter(item => Boolean(item.url))
                          .map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setStudioBgUrl(item.url)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase cursor-pointer ${
                                studioBgUrl === item.url
                                  ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                              }`}
                            >
                              <img src={item.url} alt="" className="w-6 h-6 rounded object-cover" />
                              <span>{item.label}</span>
                            </button>
                          ))}

                        <div className="flex-1 min-w-[200px]">
                          <Dropzone
                            label="Or Upload Custom Background Art for Series"
                            height="p-2"
                            folderPath="hero-banners"
                            onUploadComplete={(url: string) => setStudioBgUrl(url)}
                          />
                        </div>
                      </div>
                    )}

                    {/* CROP SLIDERS + 4-EDGE SELECTOR + LIVE PC & MOBILE PREVIEWS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2 border-t border-zinc-800">
                      <div className="lg:col-span-5 bg-black/70 border border-zinc-800 rounded-xl p-4 space-y-4">
                        {slide.placement === 'leaderboard' ? (
                          <div className="bg-zinc-950 p-2 rounded-xl border border-[#fe9a00]/50 text-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center justify-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5" />
                              <Smartphone className="w-3.5 h-3.5" />
                              Unified PC &amp; Mobile Crop (1.58:1 Hype Card Ratio)
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setActiveCropDevice('pc')}
                              className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeCropDevice === 'pc'
                                  ? 'bg-[#fe9a00] text-black shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" /> PC Crop (3:1)
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveCropDevice('mobile')}
                              className={`py-2 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeCropDevice === 'mobile'
                                  ? 'bg-[#fe9a00] text-black shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Smartphone className="w-3.5 h-3.5" /> Mobile Crop (2:3)
                            </button>
                          </div>
                        )}

                        {activeCropDevice === 'pc' ? (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> PC / Desktop (3:1) Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPcZoom(112);
                                  setPcPanX(50);
                                  setPcPanY(30);
                                  setPcVignette(40);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset PC Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Zoom</span>
                                  <span className="text-[#fe9a00]">{pcZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={pcZoom}
                                  onChange={e => setPcZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Edge Shade</span>
                                  <span className="text-[#fe9a00]">{pcVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={pcVignette}
                                  onChange={e => setPcVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan X</span>
                                  <span className="text-[#fe9a00]">{pcPanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanX}
                                  onChange={e => setPcPanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>PC Pan Y</span>
                                  <span className="text-[#fe9a00]">{pcPanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={pcPanY}
                                  onChange={e => setPcPanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Crop className="w-3.5 h-3.5" /> Mobile (2:3) Sliders
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileZoom(118);
                                  setMobilePanX(50);
                                  setMobilePanY(25);
                                  setMobileVignette(45);
                                }}
                                className="text-[8px] font-black uppercase text-zinc-400 hover:text-[#fe9a00] cursor-pointer"
                              >
                                Reset Mobile Crop
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Zoom</span>
                                  <span className="text-[#fe9a00]">{mobileZoom}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={250}
                                  value={mobileZoom}
                                  onChange={e => setMobileZoom(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Edge Shade</span>
                                  <span className="text-[#fe9a00]">{mobileVignette}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={90}
                                  value={mobileVignette}
                                  onChange={e => setMobileVignette(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan X</span>
                                  <span className="text-[#fe9a00]">{mobilePanX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanX}
                                  onChange={e => setMobilePanX(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400 mb-1">
                                  <span>Mobile Pan Y</span>
                                  <span className="text-[#fe9a00]">{mobilePanY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={mobilePanY}
                                  onChange={e => setMobilePanY(Number(e.target.value))}
                                  className="w-full accent-[#fe9a00]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                1. Headline + &ldquo;See All Prizes&rdquo; Row
                              </label>
                              <div className="grid grid-cols-2 gap-1">
                                {(
                                  [
                                    { id: 'top', label: '⬆ Top Row' },
                                    { id: 'bottom', label: '⬇ Bottom Row' }
                                  ] as const
                                ).map(pos => (
                                  <button
                                    key={pos.id}
                                    type="button"
                                    onClick={() => setStudioHeaderPosition(pos.id)}
                                    className={`py-1.5 rounded-lg text-[8px] font-black uppercase border cursor-pointer ${
                                      studioHeaderPosition === pos.id
                                        ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                    }`}
                                  >
                                    {pos.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                2. Reward Items Bar Edge
                              </label>
                              <div className="grid grid-cols-4 gap-1">
                                {(
                                  [
                                    { id: 'bottom', label: '⬇ Bot' },
                                    { id: 'top', label: '⬆ Top' },
                                    { id: 'left', label: '⬅ Left' },
                                    { id: 'right', label: '➡ Right' }
                                  ] as const
                                ).map(ed => (
                                  <button
                                    key={ed.id}
                                    type="button"
                                    onClick={() => setStudioEdgePosition(ed.id)}
                                    className={`py-1.5 rounded-lg text-[8px] font-black uppercase border cursor-pointer ${
                                      studioEdgePosition === ed.id
                                        ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                    }`}
                                  >
                                    {ed.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Top / Edge Pill Badge
                              </label>
                              <input
                                type="text"
                                value={studioBadge}
                                onChange={e => setStudioBadge(e.target.value)}
                                placeholder="#1 SUPER FAN DROP"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Headline
                              </label>
                              <input
                                type="text"
                                value={studioHeadline}
                                onChange={e => setStudioHeadline(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                                Shop Badge ($50 Off)
                              </label>
                              <input
                                type="text"
                                value={studioPriceLabel}
                                onChange={e => setStudioPriceLabel(e.target.value)}
                                placeholder="$50 OFF SHOP"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-[#fe9a00]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-yellow-400 mb-1">
                                Gold Hypes (+5)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={studioBonusHypes}
                                onChange={e => setStudioBonusHypes(Number(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-yellow-300"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Button Label
                              </label>
                              <input
                                type="text"
                                value={studioCtaLabel}
                                onChange={e => setStudioCtaLabel(e.target.value)}
                                placeholder="SEE ALL PRIZES"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-[#fe9a00]"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingBanners}
                          onClick={() => handleGenerateAndApplyBanners(slide.id)}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] via-amber-400 to-[#fe9a00] hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(254,154,0,0.4)] cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingBanners ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Generating PC &amp; Mobile Banners...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-black" /> Generate &amp; Apply PC + Mobile Banners
                            </>
                          )}
                        </button>
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5" />
                              {slide.placement === 'leaderboard'
                                ? `Unified PC & Mobile Contest Banner Preview (1.58:1 Hype Card Ratio • Edge: ${studioEdgePosition.toUpperCase()})`
                                : `Live PC / Desktop Hero Preview (3:1 Widescreen • Edge: ${studioEdgePosition.toUpperCase()})`}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400">
                              Zoom: {pcZoom}% • X: {pcPanX}% • Y: {pcPanY}%
                            </span>
                          </div>
                          {renderLiveBannerPreview('desktop')}
                        </div>

                        {slide.placement !== 'leaderboard' && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5" /> Live Mobile Hero Preview (2:3 Vertical • Edge: {studioEdgePosition.toUpperCase()})
                              </span>
                              <span className="text-[9px] font-bold uppercase text-zinc-400">
                                Zoom: {mobileZoom}% • X: {mobilePanX}% • Y: {mobilePanY}%
                              </span>
                            </div>
                            {renderLiveBannerPreview('mobile')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      {slide.placement === 'leaderboard'
                        ? 'PC Contest Banner (Hype Card 1.58:1 Ratio)'
                        : 'Desktop Banner (Wide 3:1)'}
                    </span>
                    {slide.desktop_url && (
                      <img
                        src={slide.desktop_url}
                        loading="lazy"
                        alt="Desktop Preview"
                        className={`w-full ${
                          slide.placement === 'leaderboard' ? 'aspect-[1.58]' : 'aspect-[3/1]'
                        } object-cover rounded-lg mb-2 border border-zinc-700`}
                      />
                    )}
                    <Dropzone
                      label={slide.desktop_url ? 'Replace Desktop' : '+ Upload Desktop Banner'}
                      height="p-3"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => {
                        updateSlide(slide.id, 'desktop_url', url);
                        if (slide.placement === 'leaderboard') {
                          updateSlide(slide.id, 'mobile_url', url);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      {slide.placement === 'leaderboard'
                        ? 'Mobile Contest Banner (Same 1.58:1 Hype Card Ratio)'
                        : 'Mobile Banner (Vertical 2:3)'}
                    </span>
                    {slide.mobile_url && (
                      <img
                        src={slide.mobile_url}
                        loading="lazy"
                        alt="Mobile Preview"
                        className={`${
                          slide.placement === 'leaderboard'
                            ? 'w-full aspect-[1.58]'
                            : 'w-28 aspect-[2/3] mx-auto'
                        } object-cover rounded-lg mb-2 border border-zinc-700`}
                      />
                    )}
                    <Dropzone
                      label={slide.mobile_url ? 'Replace Mobile' : '+ Upload Mobile Banner'}
                      height="p-3"
                      folderPath="hero-banners"
                      onUploadComplete={(url: any) => updateSlide(slide.id, 'mobile_url', url)}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 mt-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Click Destination Link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={slide.linkType}
                      onChange={e => updateSlide(slide.id, 'linkType', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs sm:w-1/3 focus:border-[#fe9a00]"
                    >
                      <option value="series">Specific Series</option>
                      <option value="external">Store Drop / Web URL</option>
                    </select>
                    {slide.linkType === 'external' ? (
                      <input
                        type="text"
                        placeholder="https://... or /?view=shop"
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      />
                    ) : (
                      <select
                        value={slide.linkTarget}
                        onChange={e => updateSlide(slide.id, 'linkTarget', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs focus:border-[#fe9a00]"
                      >
                        <option value="">-- Select Series --</option>
                        {allSeries.map((s: any) => (
                          <option key={s.slug} value={s.slug}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          PART 2: LEADERBOARD MONTHLY PRIZE POOL (RANKS #1 – #5)
      ===================================================================== */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00] block">
              🗓️ Contest Month Prize Pool Scheduler
            </span>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              Select a month to pre-load its #1 Super Fan Grand Prize Package and #2–#5 Runner-Up rewards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedScheduleKey}
              onChange={e => setSelectedScheduleKey(e.target.value)}
              className="bg-zinc-900 border border-[#fe9a00] rounded-xl px-3.5 py-2.5 text-xs font-black text-white cursor-pointer"
            >
              {UPCOMING_SCHEDULE_MONTHS.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label}
                  {config.scheduledMonths?.[m.key] ? ' ✓ (Scheduled)' : ''}
                </option>
              ))}
              {scheduledMonthKeys
                .filter(k => !UPCOMING_SCHEDULE_MONTHS.some(m => m.key === k))
                .map(k => (
                  <option key={k} value={k}>
                    {k} Contest ✓ (Scheduled)
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-1">
              <input
                type="month"
                value={customMonthInput}
                onChange={e => setCustomMonthInput(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (customMonthInput) setSelectedScheduleKey(customMonthInput);
                }}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-[#fe9a00] text-zinc-200 hover:text-black text-[9px] font-black uppercase tracking-widest cursor-pointer"
              >
                Jump to Month
              </button>
            </div>
          </div>
        </div>

        {/* SAFE-MODE ISOLATION BANNER + BLANK SLATE RESET FOR SELECTED MONTH */}
        {selectedScheduleKey !== 'default' && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] font-bold text-emerald-200">
              🛡️ <strong className="uppercase text-emerald-400">Safe Mode ({selectedScheduleKey}):</strong>{' '}
              {config.scheduledMonths?.[selectedScheduleKey]
                ? `You are editing the saved schedule for ${selectedScheduleKey}. Your Default / November contest is locked and untouched.`
                : `${selectedScheduleKey} is not scheduled yet (currently showing Default/Nov items as a starting copy). Clicking below or editing any field creates a separate ${selectedScheduleKey} schedule without touching November!`}
            </div>

            <button
              type="button"
              onClick={() => {
                setConfig((prev: LeaderboardPrizesConfig) => ({
                  ...prev,
                  scheduledMonths: {
                    ...(prev.scheduledMonths || {}),
                    [selectedScheduleKey]: {
                      contestTheme: 'Monthly Fandom Prize Pool',
                      seasonTitle: `${selectedScheduleKey} Super Fan Drop`,
                      seasonSubtitle: prev.seasonSubtitle,
                      heroBannerUrl: '',
                      grandPrizeItems: normalizeGrandPrizeItems(
                        DEFAULT_LEADERBOARD_PRIZES_CONFIG.grandPrizeItems
                      ),
                      tiers: normalizeFivePrizeTiers(
                        DEFAULT_LEADERBOARD_PRIZES_CONFIG.tiers
                      )
                    }
                  }
                }));
                if (setIsDirty) setIsDirty(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-white text-black font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer shrink-0"
            >
              🧹 Start Fresh Blank Slate for {selectedScheduleKey}
            </button>
          </div>
        )}

        {scheduledMonthKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              Scheduled Months:
            </span>
            {scheduledMonthKeys.map(mKey => (
              <div
                key={mKey}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase ${
                  selectedScheduleKey === mKey
                    ? 'bg-[#fe9a00] text-black border-[#fe9a00]'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedScheduleKey(mKey)}
                  className="cursor-pointer"
                >
                  {mKey}
                </button>
                <button
                  type="button"
                  onClick={() => handleClearScheduledMonth(mKey)}
                  className="hover:text-red-500 cursor-pointer ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {saveMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500 rounded-xl p-3.5 text-emerald-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <form onSubmit={handleSavePrizes} className="space-y-6">
        {/* #1 SUPER FAN GRAND PRIZE PACKAGE */}
        <div className="bg-black border-2 border-[#fe9a00]/60 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase italic tracking-widest text-[#fe9a00] flex items-center gap-2">
                <Crown className="w-4 h-4 fill-[#fe9a00]" /> 2. #1 Super Fan Grand Prize Package
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                Includes: Physical Item from Sat AM Shop (with toggleable Shop Logo in any corner) • Hype Card Bundle (2x Skins + 5x Avatars) • $50 Off Shop Coupon • +5 Gold Hypes
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddGrandPrizeItem}
              className="px-3.5 py-2 rounded-xl bg-[#fe9a00] hover:bg-white text-black text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              + Add Extra Grand Prize Card
            </button>
          </div>

          {tier1 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#fe9a00] mb-1">
                    #1 Shop Coupon Code ($50 Off)
                  </label>
                  <input
                    type="text"
                    value={tier1.storeDiscountLabel}
                    onChange={e => updateTier(1, 'storeDiscountLabel', e.target.value)}
                    placeholder="$50 OFF SHOP CODE"
                    className="w-full bg-zinc-900 border border-[#fe9a00]/60 rounded-lg px-3 py-2 text-xs font-black text-[#fe9a00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-yellow-400 mb-1">
                    #1 Gold Hypes Bonus (Default: +5)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tier1.goldHypesBonus ?? 5}
                    onChange={e => updateTier(1, 'goldHypesBonus', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-yellow-400/50 rounded-lg px-3 py-2 text-xs font-black text-yellow-300"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {renderShopDiscountBadge(tier1.storeDiscountLabel)}
                  {renderGoldHypesBadge(tier1.goldHypesBonus ?? 5)}
                </div>
              </div>

              {renderShopCodeQuickPresets(1)}

              {/* #1 SUPER FAN PERK CHECKLIST WITH "+ ADD EXTRA PERK" BUTTON */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    #1 Super Fan Included Perks List:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextPerks = [...(tier1.perks || []), 'Bonus Mystery Item'];
                      updateTier(1, 'perks', nextPerks);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/50 text-[9px] font-black uppercase cursor-pointer"
                  >
                    + Add Extra Perk to #1
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(tier1.perks || []).map((perk, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1"
                    >
                      <input
                        type="text"
                        value={perk}
                        onChange={e => {
                          const next = [...(tier1.perks || [])];
                          next[pIdx] = e.target.value;
                          updateTier(1, 'perks', next);
                        }}
                        className="bg-transparent text-[10px] font-bold text-white focus:outline-none w-44"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (tier1.perks || []).filter((_, i) => i !== pIdx);
                          updateTier(1, 'perks', next);
                        }}
                        className="text-zinc-500 hover:text-red-400 text-xs font-black cursor-pointer px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3 VISUAL CARDS FOR #1 SUPER FAN (PHYSICAL SHOP ITEM, HYPE BUNDLE, $50 COUPON) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeSlice.grandPrizeItems.map((item: GrandPrizeStackItem, idx: number) => {
              const isPureLogo = item.imageUrl === SAT_AM_SHOP_LOGO_URL;
              const cornerClass =
                item.shopLogoCorner === 'top-left'
                  ? 'top-2 left-2'
                  : item.shopLogoCorner === 'bottom-left'
                  ? 'bottom-8 left-2'
                  : item.shopLogoCorner === 'bottom-right'
                  ? 'bottom-8 right-2'
                  : 'top-2 right-2';

              return (
                <div
                  key={item.id || idx}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fe9a00]">
                      #1 Card #{idx + 1} {idx === 0 ? '(Physical Shop Item)' : idx === 1 ? '(2x Cards + 5x Avatars)' : '($50 Off + 5 Gold)'}
                    </span>
                    {activeSlice.grandPrizeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGrandPrizeItem(idx)}
                        className="text-zinc-500 hover:text-red-500 text-[10px] font-black uppercase cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {renderStoreItemDropdown(item.linkedStoreProductId, optionKey =>
                    handleSelectStoreItemForGrandPrize(idx, optionKey)
                  )}

                  {/* SHOP LOGO OVERLAY TOGGLE & 4-CORNER POSITIONER */}
                  <div className="bg-black border border-zinc-800 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.showShopLogo)}
                        onChange={e =>
                          updateGrandPrizeItem(idx, 'showShopLogo', e.target.checked)
                        }
                        className="accent-[#fe9a00]"
                      />
                      <img src={SAT_AM_SHOP_LOGO_URL} alt="" className="h-3.5 w-auto object-contain" />
                      <span>Show Shop Logo</span>
                    </label>

                    {item.showShopLogo && (
                      <select
                        value={item.shopLogoCorner || 'top-right'}
                        onChange={e =>
                          updateGrandPrizeItem(
                            idx,
                            'shopLogoCorner',
                            e.target.value as ShopLogoCorner
                          )
                        }
                        className="bg-zinc-900 border border-[#fe9a00]/60 rounded px-2 py-0.5 text-[8px] font-black uppercase text-[#fe9a00] cursor-pointer"
                      >
                        <option value="top-left">↖ Top-Left Corner</option>
                        <option value="top-right">↗ Top-Right Corner</option>
                        <option value="bottom-left">↙ Bottom-Left Corner</option>
                        <option value="bottom-right">↘ Bottom-Right Corner</option>
                      </select>
                    )}
                  </div>

                  <div className="relative w-full max-w-[210px] mx-auto aspect-[7/5] rounded-xl overflow-hidden bg-black border border-zinc-700 flex items-center justify-center">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className={`w-full h-full ${
                        isPureLogo
                          ? 'object-contain p-4 bg-gradient-to-br from-zinc-900 via-black to-amber-950/40'
                          : 'object-cover'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#fe9a00] text-black text-[8px] font-black uppercase shadow z-10">
                      {item.tag}
                    </span>

                    {item.showShopLogo && !isPureLogo && (
                      <div
                        className={`absolute ${cornerClass} z-20 bg-black/85 backdrop-blur-md border border-[#fe9a00] rounded-lg px-1.5 py-1 shadow-lg pointer-events-none`}
                      >
                        <img
                          src={SAT_AM_SHOP_LOGO_URL}
                          alt="Sat AM Shop"
                          className="h-4 w-auto object-contain"
                        />
                      </div>
                    )}

                    <span className="absolute bottom-2 left-2.5 right-2.5 text-[10px] font-black uppercase text-white line-clamp-2 leading-tight">
                      {item.title}
                    </span>
                  </div>

                  <Dropzone
                    label={`Upload 7:5 Photo for Card #${idx + 1}`}
                    height="p-2"
                    folderPath="leaderboard-prizes"
                    onUploadComplete={(url: string) =>
                      updateGrandPrizeItem(idx, 'imageUrl', url)
                    }
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-zinc-400 mb-1">
                        Corner Tag
                      </label>
                      <input
                        type="text"
                        value={item.tag}
                        onChange={e => updateGrandPrizeItem(idx, 'tag', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[10px] font-black text-[#fe9a00]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[8px] font-black uppercase text-zinc-400 mb-1">
                        Item Label
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={e => updateGrandPrizeItem(idx, 'title', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-[10px] font-bold text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* #2, #3, #4 & #5 SUPER FAN TIERS (WITH + ADD EXTRA PERK BUTTONS) */}
        <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase italic tracking-widest text-[#fe9a00]">
                3. Runner-Up Super Fan Tiers (#2, #3, #4 &amp; #5)
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">
                #2: 1x Hype Card Skin, 5x Avatars, $25 Shop Coupon, +3 Hypes • #3: 5x Avatars, $10 Shop Coupon, +2 Hypes • #4 &amp; #5: 1x Avatar, $5 Shop Coupon, +1 Hype
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const updatedTiers: LeaderboardPrizeTierConfig[] = activeSlice.tiers.map(
                  (t: LeaderboardPrizeTierConfig) => {
                    if (t.place === 2) {
                      return {
                        ...t,
                        rankLabel: '#2 SUPER FAN',
                        title: '1x Hype Card Skin + 5x Avatars + $25 Off Shop Coupon + 3 Hypes',
                        description:
                          'Unlocks 1x Hype Card Skin, 5x Avatars, a $25 Off Saturday AM Shop Coupon Code, and +3 Hypes.',
                        storeDiscountLabel: '$25 OFF SHOP CODE',
                        goldHypesBonus: 3,
                        perks: [
                          '1x Hype Card Skin',
                          '5x Avatars',
                          '$25 Off Saturday AM Shop Coupon Code',
                          '+3 Hypes'
                        ]
                      };
                    }
                    if (t.place === 3) {
                      return {
                        ...t,
                        rankLabel: '#3 SUPER FAN',
                        title: '5x Avatars + $10 Off Shop Coupon + 2 Hypes',
                        description:
                          'Unlocks 5x Avatars, a $10 Off Saturday AM Shop Coupon Code, and +2 Hypes.',
                        storeDiscountLabel: '$10 OFF SHOP CODE',
                        goldHypesBonus: 2,
                        perks: [
                          '5x Avatars',
                          '$10 Off Saturday AM Shop Coupon Code',
                          '+2 Hypes'
                        ]
                      };
                    }
                    if (t.place === 4 || t.place === 5) {
                      return {
                        ...t,
                        rankLabel: `#${t.place} SUPER FAN`,
                        title: '1x Avatar + $5 Off Shop Coupon + 1 Hype',
                        description:
                          'Unlocks 1x Avatar, a $5 Off Saturday AM Shop Coupon Code, and +1 Hype.',
                        storeDiscountLabel: '$5 OFF SHOP CODE',
                        goldHypesBonus: 1,
                        perks: [
                          '1x Avatar',
                          '$5 Off Saturday AM Shop Coupon Code',
                          '+1 Hype'
                        ]
                      };
                    }
                    return t;
                  }
                );
                updateSliceField('tiers', updatedTiers);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#fe9a00]/15 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/60 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0"
            >
              ⚡ Apply Updated Runner-Up Tiers (#2–#5)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...tiers2And3, ...tiers4And5].map((tier: LeaderboardPrizeTierConfig) => {
              const hasImage = tier.place === 2 || tier.place === 3;
              return (
                <div
                  key={tier.place}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                    <span className="text-xs font-black uppercase italic text-[#fe9a00]">
                      #{tier.place} Super Fan ({hasImage ? 'With Image' : 'Compact Card'})
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {renderShopDiscountBadge(tier.storeDiscountLabel)}
                      {renderGoldHypesBadge(tier.goldHypesBonus)}
                    </div>
                  </div>

                  {renderStoreItemDropdown(tier.linkedStoreProductId, optionKey =>
                    handleSelectStoreItemForRunnerUpTier(tier.place, optionKey)
                  )}

                  {tier.place === 2 && (
                    <div className="bg-black border border-purple-500/50 rounded-lg p-2 space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-purple-400">
                        ➕ #2 Second Digital Item (Select 5x Avatar Pack / Bundle to Include Both!)
                      </label>
                      <select
                        value={(tier as any).secondaryStoreProductId || ''}
                        onChange={e =>
                          handleSelectSecondaryStoreItemForTier(tier.place, e.target.value)
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-white cursor-pointer focus:outline-none focus:border-purple-400"
                      >
                        <option value="">-- Optional: Select 5x Avatar Pack or 2nd Item --</option>
                        {storeBundleOpts.length > 0 && (
                          <optgroup label={`In-App Store & Contest Bundles (${storeBundleOpts.length})`}>
                            {storeBundleOpts.map(opt => (
                              <option key={opt.optionKey} value={opt.optionKey}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {avatarOpts.length > 0 && (
                          <optgroup label={`Vault Character Avatars (${avatarOpts.length})`}>
                            {avatarOpts.map(opt => (
                              <option key={opt.optionKey} value={opt.optionKey}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {cardSkinOpts.length > 0 && (
                          <optgroup label={`Vault Hype Card Skins (${cardSkinOpts.length})`}>
                            {cardSkinOpts.map(opt => (
                              <option key={opt.optionKey} value={opt.optionKey}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}

                  {hasImage && (
                    <div className="flex items-center gap-3">
                      <div className="w-24 aspect-[7/5] rounded-xl bg-black border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={tier.imageUrl}
                          alt={tier.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <Dropzone
                          label={`Upload Custom #${tier.place} Image`}
                          height="p-2"
                          folderPath="leaderboard-prizes"
                          onUploadComplete={(url: string) =>
                            updateTier(tier.place, 'imageUrl', url)
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="block text-[8px] font-black uppercase text-zinc-400 mb-1">
                        Prize Headline
                      </label>
                      <input
                        type="text"
                        value={tier.title}
                        onChange={e => updateTier(tier.place, 'title', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-bold text-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[8px] font-black uppercase text-[#fe9a00] mb-1">
                        Sat AM Shop Coupon Code
                      </label>
                      <input
                        type="text"
                        value={tier.storeDiscountLabel}
                        onChange={e =>
                          updateTier(tier.place, 'storeDiscountLabel', e.target.value)
                        }
                        className="w-full bg-zinc-900 border border-[#fe9a00]/60 rounded px-2.5 py-1.5 text-xs font-black text-[#fe9a00]"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-yellow-400 mb-1">
                        Gold Hypes
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={tier.goldHypesBonus ?? (tier.place === 2 ? 3 : tier.place === 3 ? 2 : 1)}
                        onChange={e =>
                          updateTier(tier.place, 'goldHypesBonus', Number(e.target.value))
                        }
                        className="w-full bg-zinc-900 border border-yellow-400/50 rounded px-2.5 py-1.5 text-xs font-black text-yellow-300"
                      />
                    </div>
                  </div>

                  {renderShopCodeQuickPresets(tier.place)}

                  {/* PERKS LIST + "+ ADD EXTRA PERK" BUTTON */}
                  <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                        Included Perks:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(tier.perks || []), 'Bonus Reward'];
                          updateTier(tier.place, 'perks', next);
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-[#fe9a00] text-[#fe9a00] hover:text-black border border-[#fe9a00]/40 text-[8px] font-black uppercase cursor-pointer"
                      >
                        + Add Extra Perk
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(tier.perks || []).map((perk, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5"
                        >
                          <input
                            type="text"
                            value={perk}
                            onChange={e => {
                              const next = [...(tier.perks || [])];
                              next[pIdx] = e.target.value;
                              updateTier(tier.place, 'perks', next);
                            }}
                            className="bg-transparent text-[9px] font-bold text-white focus:outline-none w-36"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (tier.perks || []).filter((_, i) => i !== pIdx);
                              updateTier(tier.place, 'perks', next);
                            }}
                            className="text-zinc-500 hover:text-red-400 text-[10px] font-black cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(254,154,0,0.35)]"
        >
          {isSaving
            ? 'Saving Super Fan Contest Prizes...'
            : selectedScheduleKey === 'default'
            ? 'Save Default Super Fan Contest Prizes'
            : `Save Scheduled Super Fan Prizes for ${selectedScheduleKey}`}
        </button>
      </form>

      {/* PART 4: WINNER AUTO-FULFILLMENT & 1:1 SOCIAL MEDIA GRAPHIC STUDIO */}
      <WinnerFulfillmentAndSocialStudio
        config={config}
        setConfig={setConfig}
        activeSlice={activeSlice}
        leaderboardHeroUrl={activeLeaderboardHeroUrl}
      />
    </div>
  );
};

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
    'store' | 'prizes' | 'accesskeys' | 'adstudio' | 'upsells' | 'hype' | 'notifications'
  >('store');
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
    { id: 'home', label: 'Home Sections' },
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
                  <Key className="w-3.5 h-3.5" /> 1-Year Standalone Codes
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
                  onClick={() => setMarketingSubTab('store')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'store'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> In-App Store Manager
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('prizes')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'prizes'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-emerald-400 hover:text-white border border-emerald-500/40'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" /> Banner &amp; Contest Studio
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingSubTab('accesskeys')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'accesskeys'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> 1-Year Standalone Codes
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
                  onClick={() => setMarketingSubTab('upsells')}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                    marketingSubTab === 'upsells'
                      ? 'bg-[#fe9a00] text-black shadow-[0_0_15px_rgba(254,154,0,0.3)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Upsell Popups
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

              {marketingSubTab === 'store' && <StoreManager setIsDirty={setIsDirty} />}
              {marketingSubTab === 'prizes' && (
                <LeaderboardPrizeManager Dropzone={Dropzone} setIsDirty={setIsDirty} />
              )}
              {marketingSubTab === 'accesskeys' && <PromoCodeManager />}
              {marketingSubTab === 'adstudio' && (
                <HouseAdBuilder Dropzone={Dropzone} setIsDirty={setIsDirty} />
              )}
              {marketingSubTab === 'upsells' && <UpsellPopupManager Dropzone={Dropzone} />}
              {marketingSubTab === 'hype' && <HypeManager setIsDirty={setIsDirty} />}
              {marketingSubTab === 'notifications' && <NotificationCenter />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};