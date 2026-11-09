import { useState, useEffect } from 'react';
import { X, Zap, UserPlus, Sparkles, Crown, Layers, PenTool, Flame } from 'lucide-react';
import { supabase } from '../supabase';

export const PromoModal = ({ userTier, onClose, onAction }: any) => {
  const [showBetaInput, setShowBetaInput] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  const [featuredBundle, setFeaturedBundle] = useState<any | null>(null);
  const [alreadyOwnsBundle, setAlreadyOwnsBundle] = useState(false);

  const isVisitor = userTier === 'visitor';

  useEffect(() => {
    let isMounted = true;
    const loadActiveBundle = async () => {
      const { data: bundles } = await supabase
        .from('themed_annual_bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!isMounted || !bundles || bundles.length === 0) return;

      const now = Date.now();
      const validBundle = bundles.find((b: any) => {
        if (b.available_from && now < new Date(b.available_from).getTime()) return false;
        if (b.available_until && now > new Date(b.available_until).getTime()) return false;
        return true;
      });

      if (!validBundle) return;
      setFeaturedBundle(validBundle);

      // Check if logged-in user already unlocked this bundle's skin
      const { data: { user } } = await supabase.auth.getUser();
      if (user && validBundle.card_skin_url) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('card_skin, unlocked_skins')
          .eq('id', user.id)
          .maybeSingle();
        if (prof) {
          const owned: string[] = Array.isArray(prof.unlocked_skins)
            ? prof.unlocked_skins.map(String)
            : [];
          if (
            prof.card_skin === validBundle.card_skin_url ||
            owned.includes(String(validBundle.card_skin_id)) ||
            owned.includes(String(validBundle.card_skin_url))
          ) {
            setAlreadyOwnsBundle(true);
          }
        }
      }
    };

    loadActiveBundle();
    return () => {
      isMounted = false;
    };
  }, []);

  // If no featured bundle is live, hide for premium users as before
  if (!featuredBundle && userTier === 'premium') return null;
  if (featuredBundle && alreadyOwnsBundle) return null;

  // ============================================================================
  // VISUAL-FIRST DIWALI / SPECIAL EVENT BUNDLE POP-UP AD
  // ============================================================================
  if (featuredBundle) {
    const price = Number(featuredBundle.price_dollars || 24.99);
    const normalPrice = Number(featuredBundle.original_price_dollars || 35);
    const hasDiscount = normalPrice > price && normalPrice > 0;
    const discountPct = hasDiscount
      ? Math.round(((normalPrice - price) / normalPrice) * 100)
      : 0;
    const avatars: string[] = Array.isArray(featuredBundle.avatar_urls)
      ? featuredBundle.avatar_urls.filter(Boolean)
      : [];
    const cards = [
      featuredBundle.card_skin_url
        ? { url: featuredBundle.card_skin_url, name: featuredBundle.card_skin_name || 'Card #1' }
        : null,
      featuredBundle.card_skin_2_url
        ? { url: featuredBundle.card_skin_2_url, name: featuredBundle.card_skin_2_name || 'Card #2' }
        : null
    ].filter(Boolean) as { url: string; name: string }[];
    const autographs = [
      featuredBundle.creator_autograph,
      featuredBundle.creator_autograph_2
    ].filter(Boolean);
    const bonusHypes = Number(featuredBundle.bonus_hypes || 0);

    const handleGoToBundleInStore = () => {
      if (onClose) onClose();
      window.history.pushState({ view: 'shop' }, '', '/?view=shop');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'shop' } }));
    };

    return (
      <div
        className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-2 border-[#fe9a00] p-6 sm:p-7 rounded-3xl w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.3)] relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Ambient Top Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 bg-[#fe9a00]/25 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 relative z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fe9a00] text-black text-[9px] font-black uppercase tracking-widest shadow-md">
              <Sparkles className="w-3 h-3 fill-black" />
              {featuredBundle.theme_badge || 'LIMITED EDITION DROP'}
            </span>
            {discountPct > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest shadow-md">
                SAVE {discountPct}% OFF
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-tight mb-1 relative z-10">
            {featuredBundle.title}
          </h2>

          {/* VISUAL SHOWCASE: 2 HYPE CARDS */}
          {cards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 w-full my-3 relative z-10">
              {cards.map((c, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-[1.58] rounded-xl overflow-hidden border-2 border-[#fe9a00] shadow-[0_8px_20px_rgba(0,0,0,0.8)] ${
                    cards.length === 1 ? 'col-span-2 max-w-[240px] mx-auto w-full' : ''
                  }`}
                >
                  <img src={c.url} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white block truncate">
                      {c.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISUAL SHOWCASE: 5 AVATAR FACES */}
          {avatars.length > 0 && (
            <div className="flex flex-col items-center my-2 relative z-10">
              <div className="flex items-center justify-center -space-x-2.5 mb-1">
                {avatars.slice(0, 5).map((avUrl, idx) => (
                  <img
                    key={idx}
                    src={avUrl}
                    alt={`Avatar ${idx + 1}`}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#fe9a00] bg-zinc-900 shadow-lg"
                  />
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                Includes {avatars.length} Exclusive Character Avatars
              </span>
            </div>
          )}

          {/* VISUAL LOOT PILLS */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 my-3 relative z-10">
            <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#fe9a00]" /> 1-Yr Pass
            </span>
            {cards.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#fe9a00]" /> {cards.length} Hype Card{cards.length > 1 ? 's' : ''}
              </span>
            )}
            {autographs.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-zinc-800 text-[9px] font-black uppercase tracking-wider text-[#fe9a00] flex items-center gap-1">
                <PenTool className="w-3 h-3" /> {autographs.join(' & ')}
              </span>
            )}
            {bonusHypes > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-yellow-300/80 text-[9px] font-black uppercase tracking-wider text-yellow-200 flex items-center gap-1 shadow-[0_0_12px_rgba(253,224,71,0.3)]">
                <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" /> +{bonusHypes} Gold Hypes
              </span>
            )}
          </div>

          {/* PRICE + 1-CLICK CTA */}
          <div className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-3.5 mt-1 mb-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Special Bundle Price
              </span>
              <div className="flex items-baseline gap-2">
                {hasDiscount && (
                  <span className="text-sm font-black italic text-zinc-500 line-through">
                    ${normalPrice}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-black italic text-[#fe9a00]">
                  ${price}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToBundleInStore}
              className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#fe9a00] to-yellow-400 hover:from-white hover:to-white text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(254,154,0,0.45)] transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              Get Bundle (${price})
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FALLBACK STANDARD PROMO MODAL WHEN NO EVENT BUNDLE IS LIVE
  // ============================================================================
  return (
    <div className="fixed inset-0 z-[8000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`absolute top-0 inset-x-0 h-1 ${isVisitor ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-[#fe9a00] to-yellow-500'}`} />

        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${isVisitor ? 'bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-[#fe9a00]/20 shadow-[0_0_20px_rgba(254,154,0,0.3)]'}`}>
          {isVisitor ? <UserPlus className="w-8 h-8 text-blue-400" /> : <Zap className="w-8 h-8 text-[#fe9a00]" />}
        </div>

        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">
          {isVisitor ? 'Join the Squad' : 'Level Up'}
        </h2>

        <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-6">
          {isVisitor
            ? "What are you waiting for? Create a FREE account to unlock more!"
            : "Upgrade your access and permanently skip the ads."}
        </p>

        <div className="w-full mb-6 flex flex-col items-center min-h-[48px] justify-center">
          {!showBetaInput ? (
            <button onClick={() => setShowBetaInput(true)} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
              + Have a Promo or Beta Code?
            </button>
          ) : (
            <div className="w-full animate-fade-in relative">
              <input
                type="text"
                placeholder="ENTER CODE"
                value={betaCode}
                onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                maxLength={18}
                className={`w-full bg-black border border-zinc-800 text-white text-center font-black uppercase tracking-widest text-sm py-3 px-4 rounded-xl focus:outline-none transition-colors ${isVisitor ? 'focus:border-blue-500' : 'focus:border-[#fe9a00]'}`}
              />
            </div>
          )}
        </div>

        <button
          onClick={() => onAction(betaCode)}
          className={`w-full font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg hover:scale-105 ${
            isVisitor
              ? 'bg-blue-500 text-white hover:bg-white hover:text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              : 'bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black hover:from-white hover:to-white shadow-[0_0_20px_rgba(254,154,0,0.4)]'
          }`}
        >
          {isVisitor ? 'Create Free Account' : 'Upgrade to Pro'}
        </button>

        <button onClick={onClose} className="mt-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors">
          Continue Reading
        </button>
      </div>
    </div>
  );
};