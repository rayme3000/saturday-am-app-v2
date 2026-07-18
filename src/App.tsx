import { useState, useEffect, useRef, useCallback, Suspense, lazy, memo } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Check, Image as ImageIcon, Trash2, Star, Calendar, Menu, Home, Heart, Plus, Search, ShoppingBag, User, BookOpen, Play, ArrowLeft, Bookmark, X, MoveHorizontal, MoveVertical, RotateCcw, MessageCircle, MessageCircleOff, ChevronLeft, ChevronRight, Award, Crop, Flame, ArrowUp, SkipBack, SkipForward, Settings, Shield, CreditCard, Maximize2, Save, Scissors, RefreshCw, Lock } from 'lucide-react';
import { supabase } from './supabase';
import { useSeriesData } from './userSeriesData';
import { AccountSettings } from './MainViews/AccountSettings';
import { SeriesCommentsSection } from './Components/SeriesCommentsSection';
import { Dropzone, ThumbnailCropperModal } from './Components/UploadTools';

// 1. Keep core UI and Modals loaded instantly
import LoginModal from './Auth/LoginModal.tsx';
import { AdminLogin } from './Auth/AdminLogin';
import { GlobalFlexCard } from './VirtualProfile/UserProfile';

// 2. Lazy Load the views that use Named Exports
const HomePage = lazy(() => import('./MainViews/HomePage').then(mod => ({ default: mod.HomePage })));
const SeriesDetailPage = lazy(() => import('./MainViews/SeriesDetailPage').then(mod => ({ default: mod.SeriesDetailPage })));
const MagazineDetailPage = lazy(() => import('./MainViews/MagazineDetailPage').then(mod => ({ default: mod.MagazineDetailPage })));
const AdminDashboard = lazy(() => import('./AmCommandCenter/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })));
const UserProfile = lazy(() => import('./VirtualProfile/UserProfile').then(mod => ({ default: mod.UserProfile })));
const SubscriptionPage = lazy(() => import('./MainViews/Subscription.tsx').then(mod => ({ default: mod.Subscription })));


// 3. Lazy Load the views that use Default Exports
const SettingsPage = lazy(() => import('./MainViews/Settings.tsx'));
const BingoBook = lazy(() => import('./VirtualProfile/BingoBook'));
const Favorites = lazy(() => import('./MainViews/MyFaves.tsx'));
const Browse = lazy(() => import('./MainViews/Browse.tsx'));

// --- Cloudflare Base URL ---
const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const FooterNav = memo(({ onNavigate }: any) => {
  const navItems = [
    { name: 'Home', icon: Home, action: () => onNavigate({ action: 'home' }), prefetch: () => import('./MainViews/HomePage').then(mod => mod.HomePage) },
    { name: 'My Faves', icon: Heart, action: () => onNavigate({ action: 'faves' }), prefetch: () => import('./MainViews/MyFaves.tsx') },
    { name: 'Browse', icon: Search, action: () => onNavigate({ action: 'browse' }), prefetch: () => import('./MainViews/Browse.tsx') },
    { name: 'AM Shop', icon: ShoppingBag, action: null, prefetch: null },
    { name: 'Profile', icon: User, action: () => onNavigate({ action: 'profile' }), prefetch: () => import('./VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#323232] border-t border-zinc-700 p-2 flex justify-around items-center z-40">
      {navItems.map((item) => (
        <button 
          key={item.name} 
          onClick={item.action} 
          onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
          onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
          className="flex flex-col items-center gap-0.5 group"
        >
          <item.icon className="w-5 h-5 text-[#fe9a00] group-hover:text-white transition-colors" />
          <span className="text-[9px] font-black text-[#fe9a00] tracking-tight group-hover:text-white transition-colors">
            {item.name}
          </span>
        </button>
      ))}
    </nav>
  );
});

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
    <button onClick={scrollToTop} className="fixed bottom-20 right-6 z-50 p-3 bg-[#fe9a00] text-black rounded-full shadow-[0_0_15px_rgba(254,154,0,0.4)] hover:bg-white hover:scale-110 transition-all duration-300 group" aria-label="Back to top">
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};

// --- HAMBURGER MENU WITH FLEX BUTTON ---
const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard, userTier, onUpsell }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { name: 'Browse Library', action: 'browse', prefetch: () => import('./MainViews/Browse.tsx') },
    { name: 'Edit Profile', action: 'profile', prefetch: () => import('./VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Favorites', action: 'faves', prefetch: () => import('./MainViews/MyFaves.tsx') },
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('./VirtualProfile/BingoBook') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    { name: 'Settings', action: 'settings', prefetch: () => import('./MainViews/Settings.tsx') }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-12 gap-6">
        
       {/* Dedicated Card Flex Button inside the menu */}
        <button 
          onClick={() => { 
            onClose(); 
            if (userTier !== 'premium') {
              onUpsell({
                title: 'Premium Feature',
                message: 'The Virtual AM Crew Card is exclusively for Pro members! Upgrade to customize your skin and flex your stats at live events.'
              });
            } else {
              onOpenFlexCard(); 
            }
          }}
          className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all mb-8 shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
        >
          <CreditCard className="w-6 h-6" /> Flex AM Crew Card
        </button>

        {menuItems.map((item) => (
          <button 
            key={item.action} 
            onClick={() => { onNavigate({ action: item.action }); onClose(); }}
            onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
            onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
            className="text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
});

export default function App() {
  // --- PERSISTENT STATE INITIALIZATION ---
  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('currentView') || 'home';
  });

  const [selectedSeries, setSelectedSeries] = useState(() => {
    const saved = sessionStorage.getItem('selectedSeries');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedMagazine, setSelectedMagazine] = useState(() => {
    const saved = sessionStorage.getItem('selectedMagazine');
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

  // --- NEW: GLOBAL USER STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<'visitor' | 'free' | 'premium'>('visitor');

  // --- SESSION STORAGE SYNC ---
  // Every time these change, back them up to browser memory instantly
  useEffect(() => {
    sessionStorage.setItem('currentView', currentView);
    
    if (selectedSeries) {
      sessionStorage.setItem('selectedSeries', JSON.stringify(selectedSeries));
    } else {
      sessionStorage.removeItem('selectedSeries');
    }

    if (selectedMagazine) {
      sessionStorage.setItem('selectedMagazine', JSON.stringify(selectedMagazine));
    } else {
      sessionStorage.removeItem('selectedMagazine');
    }
  }, [currentView, selectedSeries, selectedMagazine]);

  useEffect(() => { 
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 3000); 
      return () => clearTimeout(timer); 
    }
  }, [showSplash]);

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setCurrentUser(data);
        setUserTier(data.subscription_tier === 'premium' ? 'premium' : 'free');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserTier('visitor');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUserTier('visitor');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = useCallback((data: any) => {
    if (data.action === 'home') { setCurrentView('home'); return; }
    if (data.action === 'faves') { setCurrentView('faves'); return; }
    if (data.action === 'browse') { setCurrentView('browse'); return; }
    if (data.action === 'profile') { setCurrentView('profile'); return; }
    if (data.action === 'account') { setCurrentView('account'); return; }
    if (data.action === 'settings') { setCurrentView('settings'); return; }
    if (data.action === 'bingobook') { setCurrentView('bingobook'); return; }
    if (data.action === 'sub') { setCurrentView('sub'); return; }    
    if (data.publish_date) {
      setSelectedMagazine(data);
      setCurrentView('magazine');
    } else {
      setSelectedSeries(data);
      setCurrentView('series');
    }
  }, []); 

  return (
    <>
      {/* THIS IS THE SPLASH SCREEN BLOCK */}
      {showSplash && (
        <div className="fixed inset-0 z-[1000] bg-white flex items-center justify-center animate-fade-out">
          <img 
            src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} 
            className="w-64" 
            alt="Logo" 
          />
        </div>
      )}
      
      {/* GLOBAL STYLES */}
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
          
          body { font-family: 'Plus Jakarta Sans', sans-serif; }
          h1, h2, h3, h4, h5, h6, .font-black { font-family: 'Unbounded', sans-serif !important; font-style: italic !important; letter-spacing: -0.03em !important; }
          .tracking-widest { letter-spacing: 0.15em !important; font-style: normal !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-weight: 800; }
          
          /* HIDES THE UGLY GREY SCROLLBARS */
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* Bulletproof 3D Flip Animation */
          .card-perspective { perspective: 1000px; }
          .card-flipper { transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
          .card-flipper.is-flipped { transform: rotateY(180deg); }
          .card-face { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
          .card-back { transform: rotateY(180deg); }
        `}
      </style>

      {/* 1. Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
          }}
        />
      )}

      {/* 1.5 Global Upsell Modal */}
      {upsellConfig && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setUpsellConfig(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpsellConfig(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
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
                handleNavigate({ action: 'sub' });
              }} 
              className="w-full bg-[#fe9a00] text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* 2. Global Hamburger Menu */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onOpenFlexCard={() => setIsFlexCardOpen(true)}
        userTier={userTier}
        onUpsell={setUpsellConfig}
      />

      {/* 3. Global Flex Card Overlay */}
      <GlobalFlexCard
        isOpen={isFlexCardOpen}
        onClose={() => setIsFlexCardOpen(false)}
      />

      {/* 4. Main Views */}
      <Suspense fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 pb-20">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Interface...</span>
        </div>
      }>
        {currentView === 'home' && (
          <HomePage
            userTier={userTier}
            onNavigate={handleNavigate}
            onAdminAccess={() => setCurrentView('admin')}
            onLoginClick={() => setShowLogin(true)}
            onMenuToggle={() => setIsMenuOpen(true)}
          />
        )}

        {currentView === 'series' && (
          <SeriesDetailPage 
            userTier={userTier} 
            series={selectedSeries} 
            onBack={() => { setCurrentView('home'); setSelectedSeries(null); }} 
            onLoginClick={() => setShowLogin(true)} 
          />
        )}

        {currentView === 'magazine' && (
          <MagazineDetailPage 
            userTier={userTier} 
            magazine={selectedMagazine} 
            onBack={() => { setCurrentView('home'); setSelectedMagazine(null); }} 
            onMagazineSelect={(newMag: any) => { setSelectedMagazine(newMag); }} 
          />
        )}

        {currentView === 'admin' && (
          isAdminAuthenticated ? 
            <AdminDashboard onBack={() => setCurrentView('home')} Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} /> : 
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'profile' && (
          <UserProfile userTier={userTier} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />
        )}

        {currentView === 'sub' && (
          <SubscriptionPage 
            userTier={userTier} 
            onBack={() => setCurrentView('home')} 
            onLoginClick={() => setShowLogin(true)}
          />
        )}
        
        {currentView === 'settings' && (
          <SettingsPage 
            userTier={userTier}
            onNavigate={handleNavigate}
            onLoginClick={() => setShowLogin(true)}
            onBack={() => setCurrentView('home')} 
            onSignOut={() => { setCurrentView('home'); }} 
          />
        )}
        
        {currentView === 'bingobook' && (<BingoBook userTier={userTier} onBack={() => setCurrentView('home')} />)}

        {currentView === 'faves' && (<Favorites userTier={userTier} setActiveTab={setCurrentView} />)}

        {currentView === 'browse' && (<Browse userTier={userTier} onNavigate={handleNavigate} />)}
      </Suspense>

      {/* 5. Global Footer */}
      {['home', 'faves', 'browse', 'profile'].includes(currentView) && (
        <FooterNav onNavigate={handleNavigate} />
      )}

      <ScrollToTopButton />
    </>
  );
}