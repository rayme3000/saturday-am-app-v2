import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { ArrowUp, X, Lock, Share, Menu, Download, Info, CheckCircle2, AlertTriangle } from 'lucide-react'; 
import { supabase } from './supabase';
import { Dropzone, ThumbnailCropperModal } from './Components/UploadTools';

// --- IMPORT OUR COMPONENTS ---
import { FloatingPillNav } from './Components/FloatingPillNav';
import { HamburgerMenu } from './Components/HamburgerMenu';
import { ShareModal } from './Components/ShareModal';
import { SplashIntro } from './Components/SplashIntro'; 
import { GlobalHypeTracker } from './Components/GlobalHypeTracker';
import { HypeEconomyProvider } from './HypeEconomyContext';
import { useIntegrations } from "./Components/useIntegrations";

// 1. Keep core UI and Modals loaded instantly
import LoginModal from './Auth/LoginModal.tsx';
import AdminLogin from './Auth/AdminLogin';
import { GlobalFlexCard } from './Components/GlobalFlexCard';

// 2. Lazy Load the views that use Named Exports
const HomePage = lazy(() => import('./MainViews/HomePage').then(mod => ({ default: mod.HomePage })));
const SeriesDetailPage = lazy(() => import('./MainViews/SeriesDetailPage').then(mod => ({ default: mod.SeriesDetailPage })));
const AdminDashboard = lazy(() => import('./AmCommandCenter/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })));
const UserProfile = lazy(() => import('./VirtualProfile/UserProfile').then(mod => ({ default: mod.UserProfile })));
const SubscriptionPage = lazy(() => import('./MainViews/Subscription.tsx').then(mod => ({ default: mod.Subscription })));
const AMNewsPage = lazy(() => import('./MainViews/AMNewsPage').then(mod => ({ default: mod.AMNewsPage })));
const Shop = lazy(() => import('./MainViews/Shop').then(mod => ({ default: mod.Shop }))); 
const LegalPages = lazy(() => import('./MainViews/LegalPages').then(mod => ({ default: mod.LegalPages }))); 
const CharacterRoster = lazy(() => import('./MainViews/CharacterRoster').then(mod => ({ default: mod.CharacterRoster })));
const CreatorsPage = lazy(() => import('./MainViews/CreatorsPage').then(mod => ({ default: mod.CreatorsPage })));
const CreatorStudio = lazy(() => import('./MainViews/CreatorStudio').then(mod => ({ default: mod.CreatorStudio })));

// 3. Lazy Load the views that use Default Exports
const SettingsPage = lazy(() => import('./MainViews/Settings.tsx'));
const BingoBook = lazy(() => import('./VirtualProfile/BingoBook'));
const Favorites = lazy(() => import('./MainViews/MyFaves.tsx'));
const Browse = lazy(() => import('./MainViews/Browse.tsx'));
const Leaderboard = lazy(() => import('./MainViews/Leaderboard.tsx'));

// --- GLOBAL ERROR BOUNDARY ---
class AppErrorBoundary extends React.Component<any, any> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-[#fe9a00] font-black text-3xl italic uppercase tracking-tighter mb-4">System Glitch</h2>
          <p className="text-zinc-400 font-bold mb-8 max-w-md">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button onClick={() => window.location.reload()} className="bg-[#fe9a00] text-black px-8 py-3 rounded-full font-black uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">Reboot Interface</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) { setIsVisible(true); } 
      else { setIsVisible(false); }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!isVisible) return null;

  return (
    <button 
      onClick={scrollToTop} 
      className="fixed right-6 z-50 p-3 bg-[#fe9a00] text-black rounded-full shadow-[0_0_15px_rgba(254,154,0,0.4)] hover:bg-white hover:scale-110 transition-all duration-300 group pb-[max(0.75rem,env(safe-area-inset-bottom))] bottom-[calc(6rem+env(safe-area-inset-bottom))] cursor-pointer" 
      aria-label="Back to top"
    >
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};

export default function App() {
  useIntegrations();

  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('currentView') || 'home';
  });

  const [selectedSeries, setSelectedSeries] = useState(() => {
    const saved = sessionStorage.getItem('selectedSeries');
    return saved ? JSON.parse(saved) : null;
  });

  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('am_has_seen_intro');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFlexCardOpen, setIsFlexCardOpen] = useState(false);
  const [upsellConfig, setUpsellConfig] = useState<{ title: string; message: string; target?: 'signup' | 'sub'; buttonText?: string } | null>(null);
  const [showGlobalShareModal, setShowGlobalShareModal] = useState(false);

  // Creator Stripe Connect OAuth Confirmation Banner State
  const [stripeConnectNotice, setStripeConnectNotice] = useState<{
    status: 'success' | 'error';
    accountId?: string;
    message?: string;
  } | null>(null);

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<'visitor' | 'free' | 'premium'>('visitor');
  const [authResolved, setAuthResolved] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).deferredPrompt || null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    return (
      localStorage.getItem('am_pwa_installed') === 'true' ||
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as any).standalone)) ||
      document.referrer.includes('android-app://')
    );
  });
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false); 
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [desktopShowHelp, setDesktopShowHelp] = useState(false);

  const isPopState = useRef(false);
  const isFetchingProfile = useRef(false);

  // Safe wrapper so child components can never trigger an upsell modal for a Premium user
  const handleTriggerUpsell = useCallback((config: any) => {
    if (userTier === 'premium' || currentUser?.is_premium) {
      setUpsellConfig(null);
      return;
    }
    setUpsellConfig(config);
  }, [userTier, currentUser?.is_premium]);

  // Immediately close any open upsell modal if the user is or becomes Premium
  useEffect(() => {
    if (userTier === 'premium' || currentUser?.is_premium) {
      setUpsellConfig(null);
    }
  }, [userTier, currentUser?.is_premium]);

  // --- AUTO-CAPTURE SHOPIFY MAGIC LINK PROMO CODE, STRIPE CONNECT OAUTH & HARD-REFRESH (?v=) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicPromo = params.get('promo') || params.get('code');
    const stripeConnected = params.get('stripe_connected');
    const stripeConnectError = params.get('stripe_connect_error');

    if (stripeConnected === 'success') {
      const acctId = params.get('acct') || '';
      setStripeConnectNotice({
        status: 'success',
        accountId: acctId
      });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (stripeConnectError) {
      setStripeConnectNotice({
        status: 'error',
        message: stripeConnectError
      });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (magicPromo) {
      const cleanCode = magicPromo.trim().toUpperCase();
      localStorage.setItem('auto_fill_premium_code', cleanCode);
      window.history.replaceState({}, '', window.location.pathname);

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentView('sub');
        } else {
          setShowLogin(true);
        }
      });
    } else if (params.has('v')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    window.history.replaceState({ view: currentView, series: selectedSeries }, '');

    const handlePopState = (e: PopStateEvent) => {
      isPopState.current = true; 
      
      if (e.state && e.state.view) {
        setSelectedSeries(e.state.series || null);
        setCurrentView(e.state.view);
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isPopState.current) {
      isPopState.current = false; 
    } else {
      window.history.pushState({ view: currentView, series: selectedSeries }, '');
    }
  }, [currentView, selectedSeries]);

  useEffect(() => {
    sessionStorage.setItem('currentView', currentView);
    if (selectedSeries) {
      sessionStorage.setItem('selectedSeries', JSON.stringify(selectedSeries));
    } else {
      sessionStorage.removeItem('selectedSeries');
    }
  }, [currentView, selectedSeries]);

  // --- AUTOMATIC PAGE VISIT UPSELL TRACKER (FOR VISITORS & FREE USERS ONLY) ---
  useEffect(() => {
    if (!authResolved) return;

    if (userTier === 'premium' || currentUser?.is_premium) {
      setUpsellConfig(null);
      return;
    }

    if (['sub', 'admin', 'settings', 'legal', 'creator-studio'].includes(currentView) || showLogin) return;

    const rawVisits = sessionStorage.getItem('am_nav_counter') || '0';
    const nextVisits = parseInt(rawVisits, 10) + 1;
    sessionStorage.setItem('am_nav_counter', nextVisits.toString());

    if (userTier === 'visitor' && nextVisits % 3 === 0) {
      setUpsellConfig({
        title: 'Start Reading Free',
        message: 'Create a free Saturday AM account to read standard chapters, save your reading history, drop reactions, and earn fandom points!',
        target: 'signup',
        buttonText: 'Create Free Account'
      });
      return;
    }

    if (userTier === 'free' && nextVisits % 5 === 0) {
      setUpsellConfig({
        title: 'Enjoying Saturday AM?',
        message: 'Upgrade to Saturday AM+ for $1.99/mo to get 3 weekly Super Hypes, custom card skins, animated frames, and unlimited reading!',
        target: 'sub',
        buttonText: 'Upgrade to Pro'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, authResolved]);

  const handleIntroComplete = () => {
    localStorage.setItem('am_has_seen_intro', 'true');
    setShowIntro(false);
  };

  useEffect(() => {
    const fetchUserProfile = async (sessionUser: any) => {
      if (!sessionUser?.id || isFetchingProfile.current) return;
      isFetchingProfile.current = true;

      try {
        const fallbackName = sessionUser.user_metadata?.username || 'Reader';
        const fallbackPremium = Boolean(sessionUser.user_metadata?.is_premium);

        setCurrentUser((prev: any) => prev || {
          id: sessionUser.id,
          username: fallbackName,
          avatar_url: '',
          frame_id: 'none',
          total_hypes: 0,
          super_hypes_left: fallbackPremium ? 3 : 1,
          is_premium: fallbackPremium
        });

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle();
        
        if (data) {
          setCurrentUser(data);
          const isPro = Boolean(data.is_premium);
          setUserTier(isPro ? 'premium' : 'free');
          if (isPro) setUpsellConfig(null);
        } else {
          setUserTier(fallbackPremium ? 'premium' : 'free');
          if (fallbackPremium) setUpsellConfig(null);
          await supabase.from('profiles').upsert([
            {
              id: sessionUser.id,
              username: fallbackName,
              is_premium: fallbackPremium,
              super_hypes_left: fallbackPremium ? 3 : 1
            }
          ], { onConflict: 'id' });
          setCurrentUser({
            id: sessionUser.id,
            username: fallbackName,
            avatar_url: '',
            frame_id: 'none',
            total_hypes: 0,
            super_hypes_left: fallbackPremium ? 3 : 1,
            is_premium: fallbackPremium
          }); 
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      } finally {
        isFetchingProfile.current = false;
        setAuthResolved(true);
      }
    };

    const checkSessionAndFetch = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          setCurrentUser(null);
          setUserTier('visitor');
          setAuthResolved(true);
        }
      });
    };

    checkSessionAndFetch();

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setCurrentUser((prev: any) => ({
          ...prev,
          frame_id: e.detail.avatar_frame_id,
          avatar_frame_id: e.detail.avatar_frame_id, 
          avatar_url: e.detail.avatar_url
        }));
      } else {
        setTimeout(() => {
          checkSessionAndFetch();
        }, 50);
      }
    };
    
    const handleInstantLogout = () => {
      setCurrentUser(null);
      setUserTier('visitor');
      setAuthResolved(true);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('instantLogout', handleInstantLogout);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserTier('visitor');
        setAuthResolved(true);
      } else if (session?.user) {
        const user = session.user;
        setShowLogin(false);
        setTimeout(() => {
          fetchUserProfile(user);
        }, 0);
      } else if (event === 'INITIAL_SESSION' && !session) {
        setCurrentUser(null);
        setUserTier('visitor');
        setAuthResolved(true);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('instantLogout', handleInstantLogout);
    };
  }, []);

  // --- NATIVE 1-CLICK PWA INSTALL CONTROLLER ---
  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      ('standalone' in navigator && Boolean((navigator as any).standalone)) ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      localStorage.setItem('am_pwa_installed', 'true');
      setIsAppInstalled(true);
      setShowInstallPrompt(false);
      setShowIosPrompt(false);
      return; 
    }

    // Also check Chromium's getInstalledRelatedApps API if supported
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (Array.isArray(apps) && apps.length > 0) {
          localStorage.setItem('am_pwa_installed', 'true');
          setIsAppInstalled(true);
          setShowInstallPrompt(false);
        }
      }).catch(() => {});
    }

    const checkCooldown = (key: string) => {
      const val = localStorage.getItem(key);
      if (!val) return false;
      if (val === 'true') {
        localStorage.removeItem(key);
        return false;
      }
      const time = Number(val);
      if (isNaN(time)) return false;
      return Date.now() - time < 24 * 60 * 60 * 1000;
    };

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOSDevice(isIOS);

    if (isIOS) {
      if (!checkCooldown('am_ios_prompt_dismissed') && localStorage.getItem('am_pwa_installed') !== 'true') {
        const timer = setTimeout(() => setShowIosPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // If index.html already caught beforeinstallprompt before React mounted, use it immediately!
    if ((window as any).deferredPrompt) {
      // If Chrome fired beforeinstallprompt, the app is NOT currently installed
      localStorage.removeItem('am_pwa_installed');
      setIsAppInstalled(false);
      setDeferredPrompt((window as any).deferredPrompt);
      if (!checkCooldown('am_install_prompt_dismissed')) {
        setShowInstallPrompt(true);
      }
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault?.();
      // Chrome only fires beforeinstallprompt when the PWA is not installed
      localStorage.removeItem('am_pwa_installed');
      setIsAppInstalled(false);
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
      if (!checkCooldown('am_install_prompt_dismissed')) {
        setShowInstallPrompt(true);
      }
    };

    const handlePwaReady = () => {
      if ((window as any).deferredPrompt) {
        localStorage.removeItem('am_pwa_installed');
        setIsAppInstalled(false);
        setDeferredPrompt((window as any).deferredPrompt);
        if (!checkCooldown('am_install_prompt_dismissed')) {
          setShowInstallPrompt(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-install-ready', handlePwaReady);

    return () => { 
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-install-ready', handlePwaReady);
    };
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      localStorage.setItem('am_pwa_installed', 'true');
      setIsAppInstalled(true);
      setShowInstallPrompt(false);
      setShowIosPrompt(false);
      setDesktopShowHelp(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        handleAppInstalled();
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      setShowIosPrompt(true); 
      setShowInstallPrompt(false);
      return;
    } 
    
    // Always check both React state and window.deferredPrompt so it never misses the native prompt
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('am_pwa_installed', 'true');
          setIsAppInstalled(true);
          setShowInstallPrompt(false);
          setDesktopShowHelp(false);
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      setDesktopShowHelp(prev => !prev);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setDesktopShowHelp(false);
    localStorage.setItem('am_install_prompt_dismissed', Date.now().toString());
  };

  const dismissIosPrompt = () => {
    setShowIosPrompt(false);
    localStorage.setItem('am_ios_prompt_dismissed', Date.now().toString());
  };

  const handleNavigate = useCallback((data: any) => {
    if (data.action === 'login' || data.action === 'signup') {
      setShowLogin(true);
      return;
    }
    if (data.action && data.action !== 'series') {
      setCurrentView(data.action);
      return;
    }
    setSelectedSeries(data);
    setCurrentView('series');
  }, []);

  return (
    <HypeEconomyProvider>
      {showIntro && <SplashIntro onComplete={handleIntroComplete} />}

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Unbounded:wght@700;800;900&display=swap');
          @keyframes fade-out { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
          .animate-fade-out { animation: fade-out 3s forwards; }
          
          @keyframes hype-pulse-glow {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(254,154,0,0.6)); transform: scale(1); }
            50% { filter: drop-shadow(0 0 35px rgba(254,154,0,1)); transform: scale(1.06); }
          }
          .animate-hype-glow { animation: hype-pulse-glow 2s ease-in-out infinite; }

          html, body { font-family: 'Plus Jakarta Sans', sans-serif; overscroll-behavior-y: none; -webkit-overflow-scrolling: touch; background-color: #000000; }
          h1, h2, h3, h4, h5, h6, .font-black { font-family: 'Unbounded', sans-serif !important; font-style: italic !important; letter-spacing: -0.03em !important; }
          .tracking-widest { letter-spacing: 0.15em !important; font-style: normal !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-weight: 800; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .card-perspective { perspective: 1000px; }
          .card-flipper { transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
          .card-flipper.is-flipped { transform: rotateY(180deg); }
          .card-face { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
          .card-back { transform: rotateY(180deg); }
          #main-app-container > div { background-color: transparent !important; }
          .z-\\[-1\\].bg-black.fixed.inset-0 { display: none !important; }
        `}
      </style>

      {/* SVG Color Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <filter id="hype-flame-color" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.004  0      0      0.996  0
              0      0.396  0      0.604  0
              0      0      1      0      0
              0      0      0      1      0"
          />
        </filter>
      </svg>

      <div className="fixed inset-0 z-0 bg-black pointer-events-none">
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20narrow.png" alt="Manga Collage" className="w-full h-full object-cover md:hidden opacity-100" />
        <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20Backdrop%20wide.png" alt="Manga Collage" className="hidden md:block w-full h-full object-cover opacity-100" />
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      <ShareModal isOpen={showGlobalShareModal} onClose={() => setShowGlobalShareModal(false)} currentUser={currentUser} series={null} />

      {/* CREATOR STRIPE CONNECT CONFIRMATION MODAL */}
      {stripeConnectNotice && (
        <div className="fixed inset-0 z-[7500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setStripeConnectNotice(null)}>
          <div className="bg-zinc-950 border-2 border-[#fe9a00] p-8 rounded-3xl w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(254,154,0,0.25)] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setStripeConnectNotice(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            {stripeConnectNotice.status === 'success' ? (
              <>
                <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
                  Stripe Connected!
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm font-bold leading-relaxed mb-4">
                  Your creator payout account is now linked to Saturday AM Manga Hype! You are ready to receive <span className="text-[#fe9a00]">100% Creator Tips & Fan Mail</span> directly from fans.
                </p>
                {stripeConnectNotice.accountId && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 mb-6 text-[11px] font-mono text-[#fe9a00]">
                    Connected ID: {stripeConnectNotice.accountId}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
                  Connection Incomplete
                </h2>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
                  {stripeConnectNotice.message || 'We could not finish linking your Stripe account. Please try the onboarding link again or contact Saturday AM support.'}
                </p>
              </>
            )}
            <button
              onClick={() => setStripeConnectNotice(null)}
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
            >
              Continue to Saturday AM
            </button>
          </div>
        </div>
      )}

      {showPasswordReset && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl relative">
            <button onClick={() => setShowPasswordReset(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            <h2 className="text-2xl font-black italic uppercase text-[#fe9a00] mb-2">New Password</h2>
            <p className="text-xs text-zinc-400 font-bold mb-6">Enter your new password below.</p>
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded-lg mb-4 focus:border-[#fe9a00] outline-none font-bold" />
            <button onClick={async () => { const { error } = await supabase.auth.updateUser({ password: newPassword }); if (!error) { alert("Password updated successfully!"); setShowPasswordReset(false); setNewPassword(''); } else { alert(error.message); } }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer">Save Password</button>
          </div>
        </div>
      )}

      {upsellConfig && !showLogin && userTier !== 'premium' && !currentUser?.is_premium && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setUpsellConfig(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]"><Lock className="w-8 h-8 text-[#fe9a00]" /></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{upsellConfig.title}</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            <button 
              onClick={() => { 
                const isSignup = upsellConfig.target === 'signup' || userTier === 'visitor';
                setUpsellConfig(null); 
                if (isSignup) {
                  setShowLogin(true);
                } else {
                  handleNavigate({ action: 'sub' }); 
                }
              }} 
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)] cursor-pointer"
            >
              {upsellConfig.buttonText || (userTier === 'visitor' ? 'Create Free Account' : 'Upgrade to Pro')}
            </button>
          </div>
        </div>
      )}

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onOpenFlexCard={() => setIsFlexCardOpen(true)}
        userTier={userTier}
        onUpsell={handleTriggerUpsell}
        currentUser={currentUser}
        canInstall={!isAppInstalled && (Boolean(deferredPrompt) || isIOSDevice)}
        onInstall={handleInstallClick}
        onLoginClick={() => setShowLogin(true)}
        onShareClick={() => setShowGlobalShareModal(true)}
      />

      {isFlexCardOpen && <GlobalFlexCard isOpen={isFlexCardOpen} onClose={() => setIsFlexCardOpen(false)} onNavigate={handleNavigate} />}

      <AppErrorBoundary>
        <Suspense fallback={
          <div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center gap-4 pb-20">
            <div className="relative flex items-center justify-center animate-hype-glow">
              <img 
                src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png" 
                alt="Saturday AM Loading" 
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                style={{ filter: 'url(#hype-flame-color)' }}
              />
            </div>
          </div>
        }>
          <div id="main-app-container" className="relative z-10 min-h-screen w-full bg-transparent">
            {currentView === 'home' && (<HomePage userTier={userTier} currentUser={currentUser} onNavigate={handleNavigate} onAdminAccess={() => setCurrentView('admin')} onLoginClick={() => setShowLogin(true)} onMenuToggle={() => setIsMenuOpen(true)} />)}
            {currentView === 'series' && (<SeriesDetailPage userTier={userTier} series={selectedSeries} onBack={() => { setCurrentView('home'); setSelectedSeries(null); }} onLoginClick={() => setShowLogin(true)} onNavigate={handleNavigate} onUpsell={handleTriggerUpsell} />)}
            {currentView === 'admin' && (isAdminAuthenticated ? <AdminDashboard onBack={() => setCurrentView('home')} Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} /> : <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />)}
            {currentView === 'profile' && (<UserProfile userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} onLoginClick={() => setShowLogin(true)} onUpsell={handleTriggerUpsell} />)}
            {currentView === 'sub' && (<SubscriptionPage userTier={userTier} onBack={() => setCurrentView('home')} onLoginClick={() => setShowLogin(true)} onNavigate={handleNavigate} />)}
            {currentView === 'leaderboard' && (<Leaderboard userTier={userTier} currentUser={currentUser} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
            {currentView === 'settings' && (<SettingsPage userTier={userTier} onNavigate={handleNavigate} onLoginClick={() => setShowLogin(true)} onBack={() => setCurrentView('home')} onSignOut={() => { setCurrentView('home'); }} />)}
            {currentView === 'news' && (<AMNewsPage onBack={() => setCurrentView('home')} />)}
            {currentView === 'bingobook' && (<BingoBook userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
            {currentView === 'faves' && (<Favorites userTier={userTier} setActiveTab={setCurrentView} onNavigate={handleNavigate} />)}
            {currentView === 'browse' && (<Browse userTier={userTier} onNavigate={handleNavigate} />)}
            {currentView === 'creators' && (<CreatorsPage userTier={userTier} currentUser={currentUser} onNavigate={handleNavigate} onLoginClick={() => setShowLogin(true)} />)}
            {currentView === 'creator-studio' && (<CreatorStudio currentUser={currentUser} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
            {currentView === 'shop' && (<Shop userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
            {currentView === 'legal' && (<LegalPages onBack={() => setCurrentView('home')} />)}
            {currentView === 'characters' && (<CharacterRoster currentUser={currentUser} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
          </div>
        </Suspense>
      </AppErrorBoundary>

      {!['settings', 'admin', 'sub'].includes(currentView) && (
        <FloatingPillNav 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          currentUser={currentUser} 
          userTier={userTier}
          onOpenFlexCard={() => setIsFlexCardOpen(true)}
          onUpsell={handleTriggerUpsell}
        />
      )}

      {!['admin', 'sub', 'settings', 'legal'].includes(currentView) && currentUser && userTier !== 'visitor' && (
        <GlobalHypeTracker currentUser={currentUser} /> 
      )}

      {!['home', 'settings', 'admin', 'sub', 'shop', 'legal'].includes(currentView) && (
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[150] p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:text-[#fe9a00] hover:border-[#fe9a00] shadow-lg transition-all group cursor-pointer"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* COMPACT FLOATING INSTALL TOAST (ONLY SHOWN WHEN NATIVE 1-CLICK INSTALL IS AVAILABLE & NOT INSTALLED) */}
      {showInstallPrompt && !isAppInstalled && !showIosPrompt && currentView !== 'admin' && (
        <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[6000] bg-zinc-950/95 border border-[#fe9a00]/70 p-2.5 sm:p-3 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex flex-col gap-2 animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black rounded-lg border border-zinc-700 p-0.5 flex items-center justify-center shrink-0">
                <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-black italic uppercase text-[11px] sm:text-xs tracking-wider leading-tight truncate">Saturday AM</span>
                <span className="text-[#fe9a00] text-[9px] font-bold tracking-tight mt-0.5 truncate">For the best experience, install the app</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={handleInstallClick} 
                className="bg-[#fe9a00] hover:bg-white text-black px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all shadow-[0_0_10px_rgba(254,154,0,0.3)] cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Install
              </button>
              <button 
                onClick={dismissInstallPrompt} 
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {desktopShowHelp && (
            <div className="bg-black/70 border border-zinc-800 p-2 rounded-lg text-[9px] text-zinc-400 font-bold leading-relaxed animate-fade-in flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#fe9a00] shrink-0 mt-0.5" />
              <span>
                Look for the <strong className="text-white">Install icon</strong> in your browser's address bar or click Chrome menu (<strong className="text-white">⋮</strong>) &gt; <strong className="text-white">Install Saturday AM</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* COMPACT IOS SAFARI PWA INSTALL BOTTOM SHEET (HIDDEN IN ADMIN VIEW & WHEN INSTALLED) */}
      {showIosPrompt && !isAppInstalled && currentView !== 'admin' && (
        <div className="fixed bottom-0 left-0 w-full z-[6000] bg-zinc-950 border-t border-zinc-800 p-4 sm:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-3 animate-fade-in-up pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-black rounded-lg border border-zinc-700 p-1 flex items-center justify-center shadow-inner shrink-0">
                <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black italic uppercase text-xs tracking-wider leading-tight">Install App</span>
                <span className="text-[#fe9a00] text-[9px] font-bold mt-0.5 leading-snug">For the best experience, install the app</span>
              </div>
            </div>
            <button onClick={dismissIosPrompt} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-[11px] text-zinc-300 font-bold flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#fe9a00] text-black flex items-center justify-center text-[9px] font-black shrink-0">1</span>Tap the <Share className="w-3.5 h-3.5 text-[#fe9a00] mx-0.5 shrink-0" /> icon in your Safari menu bar</p>
            <p className="text-[11px] text-zinc-300 font-bold flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#fe9a00] text-black flex items-center justify-center text-[9px] font-black shrink-0">2</span>Scroll down and select <strong className="text-white">"Add to Home Screen"</strong></p>
          </div>
        </div>
      )}

      <ScrollToTopButton />
    </HypeEconomyProvider>
  );
}