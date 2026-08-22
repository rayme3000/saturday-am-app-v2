import { memo, useState } from 'react';
import { X, CreditCard, ShieldAlert, ExternalLink, Download, User, LogOut, Crown, HelpCircle, MoveHorizontal, MoveVertical, Trophy, Zap, Flame, Share2 } from 'lucide-react';
import { supabase } from '../supabase';

export const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard, userTier, onUpsell, currentUser, canInstall, onInstall, onLoginClick, onShareClick }: any) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const menuItems = [
    { name: 'AM Shop', action: 'shop', prefetch: () => import('../MainViews/Shop').then(mod => mod.Shop) },
    { name: 'Browse Library', action: 'browse', prefetch: () => import('../MainViews/Browse.tsx') },
    { name: 'Profile', action: 'profile', prefetch: () => import('../VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Favorites', action: 'faves', prefetch: () => import('../MainViews/MyFaves.tsx') },
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('../VirtualProfile/BingoBook') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    { name: 'AM News', action: 'news', prefetch: () => import('../MainViews/AMNewsPage').then(mod => mod.AMNewsPage) },
    { name: 'Leaderboards', action: 'leaderboard', prefetch: () => import('../MainViews/Leaderboard.tsx') },
    { name: 'Legal & Privacy', action: 'legal', prefetch: () => import('../MainViews/LegalPages').then(mod => mod.LegalPages) },
    { name: 'Settings', action: 'settings', prefetch: () => import('../MainViews/Settings.tsx') }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      
      <div className="flex-1 flex flex-col justify-start px-8 sm:px-12 gap-5 sm:gap-6 overflow-y-auto pt-8 pb-32 no-scrollbar">
        
        {/* --- DYNAMIC CONTROLS & ICONS --- */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2">
          {!currentUser ? (
            <button 
              onClick={() => { 
                onClose(); 
                if (onLoginClick) onLoginClick(); 
              }}
              className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)]"
            >
              <User className="w-6 h-6" /> Log In / Sign Up
            </button>
          ) : (
            <>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 bg-zinc-900 text-white border border-zinc-700 px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all shadow-lg"
              >
                <LogOut className="w-6 h-6" /> Log Out
              </button>

              {userTier === 'free' && (
                <button 
                  onClick={() => { 
                    onClose(); 
                    onNavigate({ action: 'sub' }); 
                  }}
                  className="flex items-center gap-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:from-white hover:to-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)]"
                >
                  <Crown className="w-6 h-6" /> Upgrade to Pro
                </button>
              )}
            </>
          )}

          {/* NEW SHARE ICON HERE */}
          <button 
            onClick={() => {
              onClose();
              if (onShareClick) onShareClick();
            }} 
            className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-700 rounded-2xl hover:bg-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg group"
            title="Share App"
          >
            <Share2 className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
          </button>

          {/* HELP ICON */}
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-700 rounded-2xl hover:bg-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg group"
            title="Feature Guide"
          >
            <HelpCircle className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
          </button>
        </div>

        {/* --- PWA INSTALL BUTTON --- */}
        {canInstall && (
          <button 
            onClick={() => { 
              onClose(); 
              onInstall(); 
            }}
            className="flex items-center gap-4 bg-white text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:scale-105 transition-all mb-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] w-max"
          >
            <Download className="w-6 h-6" /> Install App
          </button>
        )}

        {/* --- AM CREW CARD --- */}
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
          className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all mb-4 sm:mb-8 shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
        >
          <CreditCard className="w-6 h-6" /> Flex AM Crew Card
        </button>

        {menuItems.map((item) => (
          <button 
            key={item.action} 
            onClick={() => { onNavigate({ action: item.action }); onClose(); }}
            onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
            onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
            className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors py-1"
          >
            {item.name}
          </button>
        ))}

        {/* --- EXTERNAL WEBSITE LINK --- */}
        <a 
          href="https://www.saturday-am.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-4 text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-zinc-500 hover:text-white text-left transition-colors py-1 mt-2"
        >
          Official Website <ExternalLink className="w-6 h-6 sm:w-8 sm:h-8" />
        </a>

        {/* --- ADMIN SECURE BUTTON --- */}
        {currentUser?.is_admin && (
          <div className="mt-8 pt-8 border-t border-zinc-900">
            <button 
              onClick={() => { onNavigate({ action: 'admin' }); onClose(); }}
              className="flex items-center gap-4 text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-red-600 hover:text-red-400 text-left transition-colors py-1"
            >
              Command Center <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        )}
      </div>

      {/* --- EMBEDDED FEATURE GUIDE MODAL --- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => setShowHelpModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900 rounded-t-2xl">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Feature Guide</h2>
              <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto no-scrollbar space-y-8 bg-black rounded-b-2xl">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Series Chapters</h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  Binge read chapters by individual series directly from our vault. 
                </p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Profile Loadout</h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  No boring profiles allowed! Choose your avatar, frame color, favorite series, and more to reflect your AM fandom. More art and options will constantly be updated. <span className="text-[#fe9a00]">(Free account required)</span>
                </p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-3">Choose Your Reading Style</h3>
                <div className="flex flex-col gap-3 pl-3">
                  <div className="flex items-center gap-4 text-zinc-400 text-xs font-bold">
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-md"><MoveHorizontal className="w-4 h-4 text-[#fe9a00]" /></div>
                    Classic horizontal scroll
                  </div>
                  <div className="flex items-center gap-4 text-zinc-400 text-xs font-bold">
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-md"><MoveVertical className="w-4 h-4 text-[#fe9a00]" /></div>
                    Vertical scroll
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-[#fe9a00] font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#fe9a00]" /> Leaderboard & Rankings
                </h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-[#fe9a00] pl-3">
                  Compete globally to become an S-Class Superfan! The leaderboard tracks real-time community activity and highlights the top fans on the platform.
                </p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#fe9a00]" /> How to Rank Up
                </h3>
                <div className="pl-3 space-y-2 text-zinc-400 text-xs font-bold leading-relaxed">
                  <p>Your ranking score is calculated based on how you interact with the app. Activities are weighted to reward high engagement:</p>
                  <ul className="list-disc list-inside text-[#fe9a00] ml-2 space-y-1">
                    <li><span className="text-zinc-300">Reading chapters and dropping Quick Reacts build your foundation.</span></li>
                    <li><span className="text-zinc-300">Dropping Super Hypes carries significantly more weight!</span></li>
                    <li><span className="text-purple-400">Pro subscribers get a permanent ranking multiplier.</span></li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-yellow-500 font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" /> The Big 3 & Chapter of the Week
                </h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-yellow-500 pl-3">
                  These are two separate battlegrounds! <strong className="text-white">Chapter of the Week</strong> crowns the single <em className="text-white">chapter</em> that earns the most hype points in a 7-day period. Meanwhile, <strong className="text-[#fe9a00]">The Big 3</strong> tracks the top 3 <em className="text-[#fe9a00]">series</em> that dominate the entire month. Want your favorite to take the spotlight? Rally fellow fans to drop <span className="text-[#fe9a00]">Super Hypes</span> and boost their scores!
                </p>
              </div>
              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  AM Bingo Book <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed border-l-2 border-purple-500 pl-3">
                  Track down Saturday AM creators at live shows and conventions to collect their exclusive digital autographs in your virtual Bingo Book!
                </p>
              </div>
              <div>
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                  Quick Reacts <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <div className="flex gap-4 items-start pl-3">
                  <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded shadow-md flex-shrink-0 mt-0.5">
                    <img src="https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Quick%20React%20icon.png" alt="Quick React" className="w-5 h-5 object-contain" />
                  </div>
                  <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                    Drop real-time, 30-character hype messages directly onto your favorite manga pages for everyone to see.
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                  Super Hypes <span className="text-[8px] bg-purple-900/30 border border-purple-900 px-2 py-0.5 rounded text-purple-400">Subscriber Only</span>
                </h3>
                <div className="flex gap-4 items-start pl-3">
                  <div className="bg-gradient-to-br from-yellow-500 to-[#fe9a00] p-1.5 rounded shadow-[0_0_10px_rgba(254,154,0,0.3)] flex-shrink-0 mt-0.5">
                    <Flame className="w-5 h-5 text-black" />
                  </div>
                  <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                    When a normal hype is not enough. Let the world know which series is not just good, but GOATED! Subscribers only get 5 of these a month, so use carefully.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});