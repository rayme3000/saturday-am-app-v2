import { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { ArrowUp, X, Lock, Share, Menu } from 'lucide-react'; 
import { supabase } from './supabase';
import { Dropzone, ThumbnailCropperModal } from './Components/UploadTools';

// --- IMPORT OUR COMPONENTS ---
import { FloatingPillNav } from './Components/FloatingPillNav';
import { HamburgerMenu } from './Components/HamburgerMenu';

// 1. Keep core UI and Modals loaded instantly
import LoginModal from './Auth/LoginModal.tsx';
import { AdminLogin } from './Auth/AdminLogin';
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

// 3. Lazy Load the views that use Default Exports
const SettingsPage = lazy(() => import('./MainViews/Settings.tsx'));
const BingoBook = lazy(() => import('./VirtualProfile/BingoBook'));
const Favorites = lazy(() => import('./MainViews/MyFaves.tsx'));
const Browse = lazy(() => import('./MainViews/Browse.tsx'));
const Leaderboard = lazy(() => import('./MainViews/Leaderboard.tsx'));

// --- Cloudflare Base URL ---
const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

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
      className="fixed right-6 z-50 p-3 bg-[#fe9a00] text-black rounded-full shadow-[0_0_15px_rgba(254,154,0,0.4)] hover:bg-white hover:scale-110 transition-all duration-300 group pb-[max(0.75rem,env(safe-area-inset-bottom))] bottom-[calc(6rem+env(safe-area-inset-bottom))]" 
      aria-label="Back to top"
    >
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};

export default function App() {
  // --- PERSISTENT STATE INITIALIZATION ---
  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('currentView') || 'home';
  });

  const [selectedSeries, setSelectedSeries] = useState(() => {
    const saved = sessionStorage.getItem('selectedSeries');
    return saved ? JSON.parse(saved) : null;
  });

  // Only show splash screen if there is no saved session (first visit)
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('currentView');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // System Overlays
  const [showLogin, setShowLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFlexCardOpen, setIsFlexCardOpen] = useState(false);
  const [upsellConfig, setUpsellConfig] = useState<{ title: string, message: string } | null>(null);

  // --- PASSWORD RESET STATE ---
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // --- GLOBAL USER STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<'visitor' | 'free' | 'premium'>('visitor');

  // --- PWA INSTALL PROMPT STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false); 
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // --- HISTORY & NAVIGATION REF ---
  const isPopState = useRef(false);

  // --- HARDWARE BACK BUTTON INTERCEPTOR ---
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

  // --- SESSION STORAGE SYNC ---
  useEffect(() => {
    sessionStorage.setItem('currentView', currentView);
    
    if (selectedSeries) {
      sessionStorage.setItem('selectedSeries', JSON.stringify(selectedSeries));
    } else {
      sessionStorage.removeItem('selectedSeries');
    }
  }, [currentView, selectedSeries]);

  useEffect(() => { 
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 3000); 
      return () => clearTimeout(timer); 
    }
  }, [showSplash]);

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    const fetchUserProfile = async (sessionUser: any) => {
      const fallbackName = sessionUser.user_metadata?.username || 'Reader';
      
      const { data } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
      
      if (data) {
        setCurrentUser(data);
        setUserTier(data.is_premium ? 'premium' : 'free');
      } else {
        setUserTier('free');
        await supabase.from('profiles').insert([
          { id: sessionUser.id, username: fallbackName, is_premium: false }
        ]);
        setCurrentUser({ username: fallbackName, avatar_url: '', frame_id: 'none' });
      }
    };

    const checkSessionAndFetch = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser((prev: any) => prev || { username: session.user.user_metadata?.username || 'Reader', avatar_url: '', frame_id: 'none' });
          fetchUserProfile(session.user);
        } else {
          setCurrentUser(null);
          setUserTier('visitor');
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
        checkSessionAndFetch();
      }
    };
    
    const handleInstantLogout = () => {
      setCurrentUser(null);
      setUserTier('visitor');
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
      } else if (session?.user) {
        setCurrentUser((prev: any) => prev || { username: session.user.user_metadata?.username || 'Reader', avatar_url: '', frame_id: 'none' });
        fetchUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setUserTier('visitor');
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('instantLogout', handleInstantLogout);
    };
  }, []);

  // --- DEVICE DETECTION & PWA INSTALL LISTENER ---
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
    if (isStandalone) return; 

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOSDevice(isIOS);

    if (isIOS) {
      const hasDismissed = localStorage.getItem('am_ios_prompt_dismissed');
      if (!hasDismissed) {
        const timer = setTimeout(() => setShowIosPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        
        const hasDismissed = localStorage.getItem('am_install_prompt_dismissed');
        if (!hasDismissed) {
          setShowInstallPrompt(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      if ((window as any).deferredPrompt) {
        handleBeforeInstallPrompt((window as any).deferredPrompt);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setShowIosPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      setShowIosPrompt(true); 
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('am_install_prompt_dismissed', 'true');
  };

  const dismissIosPrompt = () => {
    setShowIosPrompt(false);
    localStorage.setItem('am_ios_prompt_dismissed', 'true');
  };

  const handleNavigate = useCallback((data: any) => {
    if (data.action) {
      setCurrentView(data.action);
      return;
    }
    // Default fallback to Series
    setSelectedSeries(data);
    setCurrentView('series');
  }, []);

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-[1000] bg-white flex items-center justify-center animate-fade-out h-[100dvh]">
          <img 
            src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} 
            className="w-64" 
            alt="Logo" 
          />
        </div>
      )}
      
      {/* GLOBAL STYLES & iOS TWEAKS */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Unbounded:wght@700;800;900&display=swap');
          
          @keyframes fade-out {
            0% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
          .animate-fade-out {
            animation: fade-out 3s forwards;
          }
          
          html, body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            overscroll-behavior-y: none;
            -webkit-overflow-scrolling: touch;
          }

          h1, h2, h3, h4, h5, h6, .font-black { font-family: 'Unbounded', sans-serif !important; font-style: italic !important; letter-spacing: -0.03em !important; }
          .tracking-widest { letter-spacing: 0.15em !important; font-style: normal !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-weight: 800; }
          
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          .card-perspective { perspective: 1000px; }
          .card-flipper { transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
          .card-flipper.is-flipped { transform: rotateY(180deg); }
          .card-face { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
          .card-back { transform: rotateY(180deg); }
        `}
      </style>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => { setShowLogin(false); }} />
      )}

      {showPasswordReset && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl relative">
            <button 
              onClick={() => setShowPasswordReset(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-black italic uppercase text-[#fe9a00] mb-2">New Password</h2>
            <p className="text-xs text-zinc-400 font-bold mb-6">Enter your new password below.</p>
            
            <input 
              type="password" 
              placeholder="New Password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded-lg mb-4 focus:border-[#fe9a00] outline-none font-bold"
            />
            
            <button 
              onClick={async () => {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (!error) {
                  alert("Password updated successfully!");
                  setShowPasswordReset(false);
                  setNewPassword('');
                } else {
                  alert(error.message);
                }
              }}
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]"
            >
              Save Password
            </button>
          </div>
        </div>
      )}

      {upsellConfig && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setUpsellConfig(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(254,154,0,0.2)]"><Lock className="w-8 h-8 text-[#fe9a00]" /></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{upsellConfig.title}</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">{upsellConfig.message}</p>
            <button onClick={() => { setUpsellConfig(null); handleNavigate({ action: 'sub' }); }} className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]">Upgrade to Pro</button>
          </div>
        </div>
      )}

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onOpenFlexCard={() => setIsFlexCardOpen(true)}
        userTier={userTier}
        onUpsell={setUpsellConfig}
        currentUser={currentUser}
        canInstall={!!deferredPrompt || isIOSDevice}
        onInstall={handleInstallClick}
        onLoginClick={() => setShowLogin(true)}
      />

      {isFlexCardOpen && (
        <GlobalFlexCard isOpen={isFlexCardOpen} onClose={() => setIsFlexCardOpen(false)} />
      )}

      <Suspense fallback={
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 pb-20">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Interface...</span>
        </div>
      }>
        {currentView === 'home' && (
          <HomePage userTier={userTier} currentUser={currentUser} onNavigate={handleNavigate} onAdminAccess={() => setCurrentView('admin')} onLoginClick={() => setShowLogin(true)} onMenuToggle={() => setIsMenuOpen(true)} />
        )}
        {currentView === 'series' && (
          <SeriesDetailPage 
            userTier={userTier} 
            series={selectedSeries} 
            onBack={() => { setCurrentView('home'); setSelectedSeries(null); }} 
            onLoginClick={() => setShowLogin(true)} 
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'admin' && (
          isAdminAuthenticated ? <AdminDashboard onBack={() => setCurrentView('home')} Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} /> : <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />
        )}
        {currentView === 'profile' && (
          <UserProfile userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} onLoginClick={() => setShowLogin(true)} />
        )}
        {currentView === 'sub' && (
          <SubscriptionPage userTier={userTier} onBack={() => setCurrentView('home')} onLoginClick={() => setShowLogin(true)} onNavigate={handleNavigate} />
        )}
        {currentView === 'leaderboard' && (
          <Leaderboard userTier={userTier} currentUser={currentUser} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />
        )}
        {currentView === 'settings' && (
          <SettingsPage userTier={userTier} onNavigate={handleNavigate} onLoginClick={() => setShowLogin(true)} onBack={() => setCurrentView('home')} onSignOut={() => { setCurrentView('home'); }} />
        )}
        {currentView === 'news' && (
          <AMNewsPage onBack={() => setCurrentView('home')} />
        )}
        {currentView === 'bingobook' && (<BingoBook userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
        {currentView === 'faves' && (<Favorites userTier={userTier} setActiveTab={setCurrentView} onNavigate={handleNavigate} />)}
        {currentView === 'browse' && (<Browse userTier={userTier} onNavigate={handleNavigate} />)}
        {currentView === 'shop' && (<Shop userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}
        {currentView === 'legal' && (<LegalPages onBack={() => setCurrentView('home')} />)}
      </Suspense>

      {/* --- GLOBAL FLOATING PILL NAV --- */}
      {!['settings', 'admin', 'sub'].includes(currentView) && (
        <FloatingPillNav currentView={currentView} onNavigate={handleNavigate} currentUser={currentUser} />
      )}

      {/* --- GLOBAL FLOATING HAMBURGER FOR SUB-PAGES --- */}
      {!['home', 'settings', 'admin', 'sub', 'shop', 'legal'].includes(currentView) && (
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[150] p-3 bg-black/60 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:text-[#fe9a00] hover:border-[#fe9a00] shadow-lg transition-all group"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* --- STANDARD PWA INSTALL BANNER (Android/Chrome) --- */}
      {showInstallPrompt && !showIosPrompt && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[6000] bg-zinc-900 border border-[#fe9a00] p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg border border-zinc-700 p-1 flex items-center justify-center">
              <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black italic uppercase text-sm tracking-widest leading-tight">Saturday AM</span>
              <span className="text-[#fe9a00] text-[9px] font-bold uppercase tracking-widest mt-0.5">For the best experience, install the app</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={dismissInstallPrompt} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleInstallClick} className="bg-[#fe9a00] text-black px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]">
              Install
            </button>
          </div>
        </div>
      )}

      {/* --- CUSTOM iOS INSTALL BANNER --- */}
      {showIosPrompt && (
        <div className="fixed bottom-0 left-0 w-full z-[6000] bg-zinc-950 border-t border-zinc-800 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-fade-in-up pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black rounded-xl border border-zinc-700 p-1.5 flex items-center justify-center shadow-inner">
                <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/logos/saturdayam%20LOGO%20cleaned%20ToBeVectored%20foot.png" className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black italic uppercase text-sm tracking-widest leading-tight">Install App</span>
                <span className="text-[#fe9a00] text-[10px] font-bold mt-0.5 leading-snug">For the best reading experience, install the app.</span>
              </div>
            </div>
            <button onClick={dismissIosPrompt} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-xs text-zinc-300 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#fe9a00] text-black flex items-center justify-center text-[10px] font-black">1</span>
              Tap the <Share className="w-4 h-4 text-[#fe9a00] mx-1" /> icon in your Safari menu bar
            </p>
            <p className="text-xs text-zinc-300 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#fe9a00] text-black flex items-center justify-center text-[10px] font-black">2</span>
              Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>
            </p>
          </div>
        </div>
      )}

      <ScrollToTopButton />
    </>
  );
}