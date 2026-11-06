import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Target, Lock, X, Sparkles, KeyRound, User, BookOpen, CheckCircle2 } from 'lucide-react';
import { useSeriesData } from '../userSeriesData';
import { supabase } from '../supabase';
import { FeatureTutorialModal, TutorialHelpButton } from '../Components/FeatureTutorialModal';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const bingoTutorialSlide = [
  {
    id: 'bingo-1',
    title: 'The Bingo Book',
    description: 'Hunt down Saturday AM creators at live conventions or virtual events to collect their exclusive digital signatures.',
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Images/S1%20bingo%20book%20page.png'
  },
  {
    id: 'bingo-2',
    title: 'Unlock Autographs',
    description: "Unlock an autograph using a creator's secret 5-digit PIN. Each collected signature earns you a +25 pt boost to your Fandom Score!",
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Images/S2%20autographs.png'
  },
  {
    id: 'bingo-3',
    title: 'Premium Display',
    description: "Once unlocked, the creator's signature will be permanently displayed in glowing gold foil on all of their series pages.",
    mediaUrl: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/Tutorial%20Images/S3%20seriespage.png'
  }
];

export const CREATOR_SIGNATURE_ALIAS_GROUPS: string[][] = [
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
  ['jr de bard', 'j.r. de bard', 'jr debard'],
  ['morganne walker'],
  ['tony dawkins'],
  ['pap souleye fall'],
  ['issaka galadima'],
  ['austin harvey-younis', 'austin harvey younis']
];

export const getCreatorMatchTokens = (rawName?: string): string[] => {
  if (!rawName) return [];
  const clean = String(rawName).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return [];

  const tokens = new Set<string>([clean]);

  const parenMatch = clean.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    tokens.add(parenMatch[1].trim());
    tokens.add(parenMatch[2].trim());
  }

  for (const group of CREATOR_SIGNATURE_ALIAS_GROUPS) {
    if (group.some(alias => tokens.has(alias) || clean.includes(alias) || alias.includes(clean))) {
      group.forEach(alias => tokens.add(alias));
    }
  }

  return Array.from(tokens).filter(Boolean);
};

export const doCreatorNamesMatch = (nameA?: string, nameB?: string): boolean => {
  const tokensA = getCreatorMatchTokens(nameA);
  const tokensB = getCreatorMatchTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  return tokensA.some(a =>
    tokensB.some(b => a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))))
  );
};

export const BingoBook = ({ onBack, userTier, onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [forceTutorial, setForceTutorial] = useState(false);

  const [dbCreatorRows, setDbCreatorRows] = useState<any[]>([]);
  const [masterSignatures, setMasterSignatures] = useState<Record<string, string>>({});
  const [unlockedCreators, setUnlockedCreators] = useState<string[]>([]);
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [viewingAutograph, setViewingAutograph] = useState<{ name: string; url: string; seriesObjs: any[] } | null>(null);

  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [upsellConfig, setUpsellConfig] = useState<{ title: string; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCreatorsAndMasterSigs = useCallback(async () => {
    try {
      const [{ data: creatorData }, { data: sigData }] = await Promise.all([
        supabase.from('series_creators').select('*').order('id', { ascending: true }),
        supabase.from('creator_signatures').select('creator_name, signature_url')
      ]);

      if (creatorData) setDbCreatorRows(creatorData);

      if (sigData) {
        const sigMap: Record<string, string> = {};
        sigData.forEach((row: any) => {
          if (row.creator_name && row.signature_url) {
            sigMap[row.creator_name.trim()] = row.signature_url;
          }
        });
        setMasterSignatures(sigMap);
      }
    } catch (err) {
      console.error('Failed to load Bingo Book catalog:', err);
    }
  }, []);

  useEffect(() => {
    fetchCreatorsAndMasterSigs();
  }, [fetchCreatorsAndMasterSigs]);

  const findSignatureUrlForCreator = useCallback(
    (creatorName: string, fallbackMap: Record<string, string> = {}): string => {
      const combined = { ...fallbackMap, ...masterSignatures };
      for (const [sigCreatorName, sigUrl] of Object.entries(combined)) {
        if (sigUrl && doCreatorNamesMatch(creatorName, sigCreatorName)) {
          return sigUrl;
        }
      }
      return '';
    },
    [masterSignatures]
  );

  const CREATOR_TARGETS = useMemo(() => {
    const uniqueCreatorsMap = new Map<
      string,
      { id: string; name: string; avatar: string; series: string[]; seriesObjs: any[] }
    >();

    const seriesBySlug = new Map<string, any>();
    seriesList.forEach((s: any) => {
      if (s.slug && !s.is_hidden) seriesBySlug.set(s.slug, s);
    });

    const addOrMergeCreator = (rawName: string, avatarUrl: string | null, matchedSeries: any | null) => {
      if (!rawName) return;
      const cleanName = rawName
        .replace(/^(written by|art by|created by|story by|illustrated by)[:\s]+/i, '')
        .trim()
        .replace(/\s+/g, ' ');
      if (cleanName.length < 2) return;

      let matchedKey: string | null = null;
      for (const [k, existing] of uniqueCreatorsMap.entries()) {
        if (doCreatorNamesMatch(cleanName, existing.name)) {
          matchedKey = k;
          break;
        }
      }

      const key = matchedKey || cleanName.toLowerCase();
      const sTitle = matchedSeries?.title || '';

      if (!uniqueCreatorsMap.has(key)) {
        uniqueCreatorsMap.set(key, {
          id: cleanName,
          name: cleanName,
          avatar:
            avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=18181b&color=fe9a00&bold=true`,
          series: sTitle ? [sTitle] : [],
          seriesObjs: matchedSeries ? [matchedSeries] : []
        });
      } else {
        const existing = uniqueCreatorsMap.get(key)!;
        if (cleanName.includes('(') && !existing.name.includes('(')) {
          existing.name = cleanName;
          existing.id = cleanName;
        }
        if (avatarUrl && existing.avatar.includes('ui-avatars')) {
          existing.avatar = avatarUrl;
        }
        if (sTitle && !existing.series.includes(sTitle)) {
          existing.series.push(sTitle);
        }
        if (matchedSeries && !existing.seriesObjs.some(so => so.slug === matchedSeries.slug)) {
          existing.seriesObjs.push(matchedSeries);
        }
      }
    };

    dbCreatorRows.forEach((row: any) => {
      if (row.is_visible === false || !row.name) return;
      const matchedSeries = seriesBySlug.get(row.series_slug) || null;
      addOrMergeCreator(row.name, row.avatar_url || matchedSeries?.creator_avatar || null, matchedSeries);
    });

    seriesList.forEach((series: any) => {
      if (series.is_hidden) return;
      const rawCreator = series.creator_name || series.creator || '';
      if (!rawCreator) return;
      const parts = String(rawCreator).split(/,|\s+&\s+|\s+and\s+|\s*\/\s*/i);
      parts.forEach(part => {
        addOrMergeCreator(part, series.creator_avatar || null, series);
      });
    });

    return Array.from(uniqueCreatorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [seriesList, dbCreatorRows]);

  const isTargetUnlocked = useCallback(
    (targetName: string): boolean => {
      return unlockedCreators.some(huntedName => doCreatorNamesMatch(targetName, huntedName));
    },
    [unlockedCreators]
  );

  const unlockedTargetsCount = useMemo(() => {
    return CREATOR_TARGETS.filter(t => isTargetUnlocked(t.name)).length;
  }, [CREATOR_TARGETS, isTargetUnlocked]);

  const progressPercentage =
    CREATOR_TARGETS.length > 0 ? Math.min(100, (unlockedTargetsCount / CREATOR_TARGETS.length) * 100) : 0;

  useEffect(() => {
    if (CREATOR_TARGETS.length > 0) {
      localStorage.setItem('am_bingo_total', CREATOR_TARGETS.length.toString());
    }
  }, [CREATOR_TARGETS]);

  useEffect(() => {
    if (userTier === 'visitor') return;

    const syncUserSignatures = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      let knownHunts: string[] = [];
      let knownSigs: Record<string, string> = {};
      try {
        knownHunts = JSON.parse(localStorage.getItem('am_bingo_hunts') || '[]');
        knownSigs = JSON.parse(localStorage.getItem('am_bingo_sigs') || '{}');
      } catch {
        knownHunts = [];
        knownSigs = {};
      }

      if (user) {
        const { data: logs, error } = await supabase
          .from('bingo_signatures_log')
          .select('creator_name')
          .eq('user_id', user.id);

        if (!error && Array.isArray(logs)) {
          const dbHunts = logs.map((log: any) => String(log.creator_name || '').trim()).filter(Boolean);

          const unsavedLocalHunts = knownHunts.filter(
            (localName: string) =>
              localName && !dbHunts.some((dbName: string) => doCreatorNamesMatch(localName, dbName))
          );

          if (unsavedLocalHunts.length > 0) {
            const backups = unsavedLocalHunts.map((name: string) => ({
              user_id: user.id,
              creator_name: name,
              event_name: 'Local Cache Auto-Sync',
              signature_type: 'Standard'
            }));
            await supabase.from('bingo_signatures_log').insert(backups);
          }

          knownHunts = Array.from(new Set([...knownHunts, ...dbHunts]));
        }
      }

      const { data: allSigsData } = await supabase
        .from('creator_signatures')
        .select('creator_name, signature_url');

      const allMasterMap: Record<string, string> = { ...masterSignatures };
      if (Array.isArray(allSigsData)) {
        allSigsData.forEach((row: any) => {
          if (row.creator_name && row.signature_url) {
            allMasterMap[row.creator_name.trim()] = row.signature_url;
          }
        });
      }

      const resolvedUserSigs: Record<string, string> = { ...knownSigs };

      knownHunts.forEach((huntedName: string) => {
        for (const [sigCreator, sigUrl] of Object.entries(allMasterMap)) {
          if (sigUrl && doCreatorNamesMatch(huntedName, sigCreator)) {
            resolvedUserSigs[huntedName] = sigUrl;
            resolvedUserSigs[sigCreator] = sigUrl;
          }
        }
      });

      CREATOR_TARGETS.forEach(target => {
        if (knownHunts.some(h => doCreatorNamesMatch(target.name, h))) {
          if (!knownHunts.includes(target.name)) {
            knownHunts.push(target.name);
          }
          for (const [sigCreator, sigUrl] of Object.entries(allMasterMap)) {
            if (sigUrl && doCreatorNamesMatch(target.name, sigCreator)) {
              resolvedUserSigs[target.name] = sigUrl;
              resolvedUserSigs[target.id] = sigUrl;
            }
          }
        }
      });

      setUnlockedCreators(knownHunts);
      setSignatures(resolvedUserSigs);
      localStorage.setItem('am_bingo_hunts', JSON.stringify(knownHunts));
      localStorage.setItem('am_bingo_sigs', JSON.stringify(resolvedUserSigs));
    };

    syncUserSignatures();
  }, [userTier, CREATOR_TARGETS, masterSignatures]);

  const claimSignature = async (creatorName: string, creatorId: string, codeCreatorName?: string) => {
    const { data: allSigs } = await supabase
      .from('creator_signatures')
      .select('creator_name, signature_url');

    let matchedSigUrl = '';
    let matchedSigCreatorName = creatorName;

    if (Array.isArray(allSigs)) {
      const found = allSigs.find(
        (row: any) =>
          row.signature_url &&
          (doCreatorNamesMatch(creatorName, row.creator_name) ||
            (codeCreatorName && doCreatorNamesMatch(codeCreatorName, row.creator_name)))
      );
      if (found) {
        matchedSigUrl = found.signature_url;
        matchedSigCreatorName = found.creator_name;
      }
    }

    if (!matchedSigUrl) {
      matchedSigUrl = findSignatureUrlForCreator(creatorName, signatures);
    }

    if (!matchedSigUrl) {
      setAlertConfig({
        title: 'No Signature Found',
        message: `${creatorName} hasn't uploaded their master signature/sketch to the vault yet!`
      });
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const alreadyHadCreator = isTargetUnlocked(creatorName);

    if (user && !alreadyHadCreator) {
      await supabase.from('bingo_signatures_log').insert([
        {
          user_id: user.id,
          creator_name: creatorName,
          event_name: 'Bingo Code Redemption',
          signature_type: 'Standard'
        }
      ]);

      const { data: prof } = await supabase
        .from('profiles')
        .select('fandom_score')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) {
        await supabase
          .from('profiles')
          .update({ fandom_score: (Number(prof.fandom_score) || 0) + 25 })
          .eq('id', user.id);
        window.dispatchEvent(new Event('profileUpdated'));
      }
    }

    const newSigs = {
      ...signatures,
      [creatorId]: matchedSigUrl,
      [creatorName]: matchedSigUrl,
      [matchedSigCreatorName]: matchedSigUrl
    };
    setSignatures(newSigs);
    localStorage.setItem('am_bingo_sigs', JSON.stringify(newSigs));

    const nextHunts = Array.from(
      new Set([...unlockedCreators, creatorId, creatorName, matchedSigCreatorName])
    );
    setUnlockedCreators(nextHunts);
    localStorage.setItem('am_bingo_hunts', JSON.stringify(nextHunts));
    window.dispatchEvent(new Event('bingoUpdated'));

    return true;
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pinInput.trim();
    if (!code || !selectedTarget) return;
    setIsProcessing(true);

    try {
      const { data: codesData, error } = await supabase
        .from('bingo_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error || !codesData) {
        setAlertConfig({
          title: 'Invalid PIN',
          message: 'This 5-digit PIN does not exist or was entered incorrectly.'
        });
        setIsProcessing(false);
        return;
      }

      if (!doCreatorNamesMatch(codesData.creator_name, selectedTarget.name)) {
        setAlertConfig({
          title: 'Creator Mismatch',
          message: `This PIN belongs to ${codesData.creator_name}, not ${selectedTarget.name}.`
        });
        setIsProcessing(false);
        return;
      }

      if (codesData.expires_at && new Date() > new Date(codesData.expires_at)) {
        setAlertConfig({ title: 'PIN Expired', message: 'This PIN has expired.' });
        setIsProcessing(false);
        return;
      }

      // Enforce single-use / max_uses limit on 1-Time Fan PINs!
      const timesUsed = Number(codesData.times_used || 0);
      const maxUses = Number(codesData.max_uses || 999999);
      if (maxUses > 0 && timesUsed >= maxUses) {
        setAlertConfig({
          title: 'PIN Already Claimed',
          message:
            maxUses === 1
              ? 'This 1-Time Fan Gift PIN has already been redeemed!'
              : 'This PIN has reached its maximum number of redemptions.'
        });
        setIsProcessing(false);
        return;
      }

      const success = await claimSignature(
        selectedTarget.name,
        selectedTarget.id,
        codesData.creator_name
      );
      if (success) {
        await supabase
          .from('bingo_codes')
          .update({ times_used: timesUsed + 1 })
          .eq('id', codesData.id);
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error(err);
      setAlertConfig({ title: 'Error', message: 'A network error occurred. Try again.' });
    }
    setPinInput('');
    setIsProcessing(false);
  };

  const closeTargetModal = () => {
    setSelectedTarget(null);
    setIsUnlocked(false);
    setPinInput('');
  };

  if (userTier === 'visitor') {
    return (
      <div className="min-h-screen bg-transparent text-white relative flex flex-col animate-fade-in">
        <div className="absolute top-6 left-6 z-40">
          <button
            onClick={onBack}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-[0_0_30px_rgba(254,154,0,0.2)]">
            <User className="w-10 h-10 text-[#fe9a00]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-widest text-white mb-4">
            Bingo <span className="text-red-600">Book</span>
          </h1>
          <p className="text-zinc-400 font-bold max-w-md mb-8 leading-relaxed bg-black/60 p-4 rounded-xl border border-zinc-800">
            The Bingo Book hunt requires a free profile so we can securely save your digital autographs to the cloud! Create an account today to start collecting.
          </p>
          <button
            onClick={() => onNavigate({ action: 'signup' })}
            className="bg-[#fe9a00] text-black px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] cursor-pointer"
          >
            Create Free Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-28 animate-fade-in relative">
      <FeatureTutorialModal
        tutorialId="bingo_book_page"
        slides={bingoTutorialSlide}
        forceOpen={forceTutorial}
        onClose={() => setForceTutorial(false)}
      />

      <style>{`
        @keyframes gold-pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(254,154,0,0.8)) drop-shadow(0 0 20px rgba(254,154,0,0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 15px rgba(254,154,0,1)) drop-shadow(0 0 35px rgba(254,154,0,0.8)); transform: scale(1.03); }
        }
        .animate-gold-pulse { animation: gold-pulse-glow 2.5s ease-in-out infinite; }
      `}</style>

      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center justify-between pr-16 sm:pr-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png`}
              alt="Saturday AM"
              className="h-8 md:h-10 object-contain drop-shadow-md"
            />
            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-widest text-white flex items-center gap-2">
              Bingo <span className="text-red-600">Book</span>
            </h1>
            <div className="ml-1 md:ml-3">
              <TutorialHelpButton onClick={() => setForceTutorial(true)} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 bg-gradient-to-r from-zinc-900/95 to-black/95 border-2 border-[#fe9a00]/60 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(254,154,0,0.25)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#fe9a00] shadow-[0_0_20px_rgba(254,154,0,0.8)]" />
          <h2 className="text-[#fe9a00] text-lg md:text-xl font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
            <Target className="w-6 h-6 md:w-7 md:h-7" /> The Mission
          </h2>
          <p className="text-white text-sm md:text-base font-bold leading-relaxed">
            Collect creator autographs via live event PINs or 1-Time Fan Gift PINs! Collected autographs shine in glowing gold foil on your Bingo Book cards and directly on each creator's Series Detail Page.
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              Autograph Hunt Progress
            </h2>
            <span className="text-xl font-black italic text-[#fe9a00]">
              {unlockedTargetsCount} / {CREATOR_TARGETS.length}
            </span>
          </div>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-[#fe9a00] to-red-600 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CREATOR_TARGETS.map(target => {
            const isCaught = isTargetUnlocked(target.name);
            const sigUrl = findSignatureUrlForCreator(target.name, signatures);

            return (
              <div
                key={target.id}
                onClick={() => {
                  if (!isCaught && userTier !== 'premium' && unlockedTargetsCount >= 1) {
                    setUpsellConfig({
                      title: 'PLUS Feature',
                      message:
                        'Free members can collect 1 digital autograph! Upgrade to Saturday AM+ PLUS to complete your Bingo Book and display glowing gold autographs on every series page.'
                    });
                    return;
                  }

                  setSelectedTarget(target);
                  setIsUnlocked(isCaught);
                }}
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  isCaught
                    ? 'border-[#fe9a00] shadow-[0_0_25px_rgba(254,154,0,0.25)] bg-zinc-950'
                    : 'border-zinc-800 hover:border-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] bg-zinc-950'
                }`}
              >
                <img
                  src={target.avatar}
                  alt={target.name}
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.src = `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`;
                  }}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    isCaught ? 'opacity-35' : 'opacity-100 group-hover:scale-105'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4 text-left z-10">
                  {!isCaught ? (
                    <p className="text-xs text-red-500 font-black uppercase tracking-[0.25em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Wanted
                    </p>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#fe9a00] mb-1">
                      <CheckCircle2 className="w-3 h-3" /> Collected
                    </span>
                  )}
                  <h3 className="font-black uppercase italic tracking-wider leading-tight text-white text-sm">
                    {target.name}
                  </h3>
                  {target.series?.length > 0 && (
                    <p className="text-[9px] font-bold uppercase mt-1 line-clamp-2 leading-tight text-zinc-300">
                      {target.series.join(' • ')}
                    </p>
                  )}
                </div>

                {isCaught && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 bg-black/45">
                    {sigUrl ? (
                      <div className="w-full h-24 flex items-center justify-center mb-3 px-2">
                        <div
                          className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500 animate-gold-pulse"
                          style={{
                            WebkitMaskImage: `url('${sigUrl}')`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskImage: `url('${sigUrl}')`,
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center'
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-black italic uppercase text-[#fe9a00] transform -rotate-12 mb-4 border-y-2 border-[#fe9a00] py-1 px-3 bg-black/70">
                        Collected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (sigUrl) {
                          setViewingAutograph({
                            name: target.name,
                            url: sigUrl,
                            seriesObjs: target.seriesObjs || []
                          });
                        } else {
                          setSelectedTarget(target);
                          setIsUnlocked(true);
                        }
                      }}
                      className="bg-[#fe9a00] text-black px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white transition-colors shadow-xl cursor-pointer"
                    >
                      View Autograph
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TARGET UNLOCK / PREVIEW MODAL */}
      {selectedTarget && (
        <div
          className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in p-4 pb-28"
          onClick={closeTargetModal}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 flex flex-col shadow-2xl relative transition-all overflow-y-auto max-h-[85vh] w-full max-w-md min-h-[400px] rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800 bg-zinc-900 z-50 shrink-0">
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${isUnlocked ? 'text-[#fe9a00]' : 'text-red-500'}`} />
                <span className="font-black uppercase tracking-widest text-sm">
                  {selectedTarget.name}
                </span>
              </div>
              <button
                onClick={closeTargetModal}
                className="text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[10px] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col w-full">
              {!isUnlocked ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-[#fe9a00] shadow-[0_0_30px_rgba(254,154,0,0.2)]">
                    <KeyRound className="w-8 h-8 text-[#fe9a00]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">
                      Unlock Signature
                    </h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest px-4">
                      Enter the 5-Digit Event or 1-Time Gift PIN provided by {selectedTarget.name}.
                    </p>
                  </div>
                  <form onSubmit={handlePinSubmit} className="flex flex-col gap-3 w-full max-w-xs mt-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="•••••"
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value)}
                      disabled={isProcessing}
                      className="w-full bg-black border border-zinc-700 rounded-lg text-center font-black tracking-[0.5em] text-[#fe9a00] text-lg px-4 py-3 focus:outline-none focus:border-[#fe9a00]"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-[#fe9a00] hover:bg-white text-black px-4 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)] cursor-pointer"
                    >
                      {isProcessing ? 'Verifying...' : 'Unlock Autograph (+25 PTS)'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="text-[#fe9a00] mb-3">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase text-white mb-1">
                    Autograph Unlocked!
                  </h3>
                  <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-5 px-4">
                    Displayed in glowing gold foil on {selectedTarget.name}'s series pages!
                  </p>

                  {(() => {
                    const sigUrl = findSignatureUrlForCreator(selectedTarget.name, signatures);
                    return sigUrl ? (
                      <div className="relative w-full aspect-[2/1] bg-black border border-[#fe9a00]/50 rounded-2xl p-4 flex items-center justify-center shadow-[0_0_40px_rgba(254,154,0,0.25)]">
                        <div
                          className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500 animate-gold-pulse"
                          style={{
                            WebkitMaskImage: `url('${sigUrl}')`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskImage: `url('${sigUrl}')`,
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full py-8 px-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs font-bold text-zinc-400">
                        Autograph badge recorded for {selectedTarget.name}!
                      </div>
                    );
                  })()}

                  {selectedTarget.seriesObjs?.length > 0 && (
                    <div className="w-full mt-5 space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                        View Signature on Series Page:
                      </span>
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedTarget.seriesObjs.map((sObj: any) => (
                          <button
                            key={sObj.slug}
                            type="button"
                            onClick={() => {
                              closeTargetModal();
                              onNavigate(sObj);
                            }}
                            className="px-4 py-2.5 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> {sObj.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={closeTargetModal}
                    className="mt-5 w-full bg-zinc-800 text-white font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-zinc-700 transition-colors text-xs cursor-pointer"
                  >
                    Return to Bingo Book
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN AUTOGRAPH VIEWER */}
      {viewingAutograph && (
        <div
          className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setViewingAutograph(null)}
        >
          <button
            onClick={() => setViewingAutograph(null)}
            className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:text-[#fe9a00] hover:bg-black transition-colors z-50 shadow-2xl cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-xl w-full flex flex-col items-center justify-center p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fe9a00] mb-2">
              Official Saturday AM Autograph
            </span>
            <h3 className="text-2xl sm:text-3xl font-black italic uppercase text-white mb-6">
              {viewingAutograph.name}
            </h3>
            <div className="w-full aspect-[2/1] bg-zinc-950 border-2 border-[#fe9a00] rounded-3xl p-6 flex items-center justify-center shadow-[0_0_50px_rgba(254,154,0,0.3)]">
              <div
                className="w-full h-full bg-gradient-to-tr from-yellow-300 via-[#fe9a00] to-yellow-500 animate-gold-pulse"
                style={{
                  WebkitMaskImage: `url('${viewingAutograph.url}')`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: `url('${viewingAutograph.url}')`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center'
                }}
              />
            </div>

            {viewingAutograph.seriesObjs?.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                {viewingAutograph.seriesObjs.map((sObj: any) => (
                  <button
                    key={sObj.slug}
                    type="button"
                    onClick={() => {
                      setViewingAutograph(null);
                      onNavigate(sObj);
                    }}
                    className="px-5 py-3 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> View on {sObj.title} Page
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GENERAL ALERTS */}
      {alertConfig && (
        <div
          className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setAlertConfig(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setAlertConfig(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#fe9a00] mb-2">
              {alertConfig.title}
            </h2>
            <p className="text-zinc-300 text-xs font-bold leading-relaxed mb-8">
              {alertConfig.message}
            </p>
            <button
              onClick={() => setAlertConfig(null)}
              className="w-full font-black uppercase tracking-widest py-3 rounded-lg transition-colors bg-[#fe9a00] text-black hover:bg-white cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* PREMIUM UPSELL MODAL */}
      {upsellConfig && (
        <div
          className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setUpsellConfig(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setUpsellConfig(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Lock className="w-8 h-8 text-[#fe9a00]" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              {upsellConfig.title}
            </h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
              {upsellConfig.message}
            </p>
            <button
              onClick={() => {
                setUpsellConfig(null);
                onNavigate({ action: 'sub' });
              }}
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
            >
              Upgrade to PLUS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoBook;