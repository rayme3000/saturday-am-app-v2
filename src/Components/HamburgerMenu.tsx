import { memo, useState, useEffect } from 'react';
import { X, CreditCard, ShieldAlert, ExternalLink, Download, User, LogOut, Crown, HelpCircle, Share2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';

const KNOWN_CREATOR_EMAILS = new Set([
  'rayme3000@gmail.com',
  'publisher@saturday-am.com',
  'fsimmonds4@gmail.com',
  'dropkickanimation@gmail.com',
  'saturday.editorial@gmail.com',
  'odunze.oguguo@yahoo.com',
  'oscar.edfong@gmail.com',
  'erickpedrucciandre@yahoo.com',
  'jeyodin@gmail.com',
  'demetrene.billups@gmail.com',
  'saturdayam.writer@gmail.com'
]);

const KNOWN_CREATOR_USERNAMES = new Set([
  'rayme3000',
  'effessart',
  'jeyodin',
  'whytmanga',
  'whyt manga',
  'dropkickanimation'
]);

export const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard, userTier, currentUser, canInstall, onInstall, onLoginClick, onShareClick }: any) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Dispatch event to completely hide underlying pulsing elements (solves blur lag and overlaps)
  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('appOverlayActive', { detail: false }));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const cleanEmail = String(currentUser?.email || '').trim().toLowerCase();
  const cleanUsername = String(currentUser?.username || '').trim().toLowerCase();
  const cleanRole = String(currentUser?.role || '').trim().toLowerCase();

  const hasCreatorStudioAccess = Boolean(
    currentUser?.is_admin ||
    Boolean(currentUser?.linked_creator_name) ||
    ['creator', 'core_creator', 'staff', 'influencer'].includes(cleanRole) ||
    KNOWN_CREATOR_EMAILS.has(cleanEmail) ||
    KNOWN_CREATOR_USERNAMES.has(cleanUsername)
  );

  const menuItems = [
    { name: 'AM Shop', action: 'shop', prefetch: () => import('../MainViews/Shop').then(mod => mod.Shop) },
    { name: 'Browse Library', action: 'browse', prefetch: () => import('../MainViews/Browse.tsx') },
    { name: 'Creators Roster', action: 'creators', prefetch: () => import('../MainViews/CreatorsPage').then(mod => ({ default: mod.CreatorsPage })) },
    { name: 'Profile', action: 'profile', prefetch: () => import('../VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Bookshelf', action: 'faves', prefetch: () => import('../MainViews/MyFaves.tsx') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    // --- Hidden behind "See More" ---
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('../VirtualProfile/BingoBook') },
    { name: 'AM News', action: 'news', prefetch: () => import('../MainViews/AMNewsPage').then(mod => mod.AMNewsPage) },
    { name: 'Leaderboards', action: 'leaderboard', prefetch: () => import('../MainViews/Leaderboard.tsx') },
    { name: 'Characters', action: 'characters', prefetch: null },
    { name: 'Settings', action: 'settings', prefetch: () => import('../MainViews/Settings.tsx') },
    { name: 'Legal & Privacy', action: 'legal', prefetch: () => import('../MainViews/LegalPages').then(mod => mod.LegalPages) }
  ];

  const visibleItems = showMore ? menuItems : menuItems.slice(0, 6);

  return (
    <div className="fixed inset-0 z-[200] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900 shrink-0">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00] cursor-pointer"><X className="w-8 h-8" /></button>
      </div>
      
      <div className="flex-1 flex flex-col justify-start px-8 sm:px-12 pt-8 pb-8 overflow-y-auto no-scrollbar">
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
          {!currentUser ? (
            <button onClick={() => { onClose(); if (onLoginClick) onLoginClick(); }} className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] cursor-pointer">
              <User className="w-6 h-6" /> Log In / Sign Up
            </button>
          ) : (
            <>
              <button onClick={handleLogout} className="flex items-center gap-4 bg-zinc-900 text-white border border-zinc-700 px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all shadow-lg cursor-pointer">
                <LogOut className="w-6 h-6" /> Log Out
              </button>
              {userTier === 'free' && (
                <button onClick={() => { onClose(); onNavigate({ action: 'sub' }); }} className="flex items-center gap-4 bg-gradient-to-r from-[#fe9a00] to-yellow-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:from-white hover:to-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] cursor-pointer">
                  <Crown className="w-6 h-6" /> Upgrade to Pro
                </button>
              )}
            </>
          )}

          <button onClick={() => { onClose(); if (onShareClick) onShareClick(); }} className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-700 rounded-2xl hover:bg-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg group cursor-pointer" title="Share App">
            <Share2 className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
          </button>

          <button onClick={() => setShowHelpModal(true)} className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-700 rounded-2xl hover:bg-[#fe9a00] hover:border-[#fe9a00] transition-all shadow-lg group cursor-pointer" title="Feature Guide">
            <HelpCircle className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
          </button>
        </div>

        {canInstall && (
          <button onClick={() => { onClose(); onInstall(); }} className="flex items-center gap-4 bg-white text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:scale-105 transition-all mb-8 shadow-[0_0_20px_rgba(255,255,255,0.2)] w-max cursor-pointer">
            <Download className="w-6 h-6" /> Install App
          </button>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-8">
          {userTier === 'premium' && (
            <button 
              onClick={() => { 
                onClose(); 
                onOpenFlexCard(); 
              }} 
              className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max cursor-pointer"
            >
              <CreditCard className="w-6 h-6" /> Flex Hype Card
            </button>
          )}

          {hasCreatorStudioAccess && (
            <button
              onClick={() => {
                onClose();
                onNavigate({ action: 'creator-studio' });
              }}
              onMouseEnter={() => import('../MainViews/CreatorStudio').then(mod => mod.CreatorStudio)}
              className="flex items-center gap-3 bg-zinc-900 border-2 border-[#fe9a00] text-[#fe9a00] px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black hover:scale-105 transition-all shadow-[0_0_25px_rgba(254,154,0,0.25)] w-max cursor-pointer"
            >
              <Sparkles className="w-6 h-6" /> Creator Studio
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5 flex-1">
          {visibleItems.map((item) => (
            <button key={item.action} onClick={() => { onNavigate({ action: item.action }); onClose(); }} onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined} className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors py-1 cursor-pointer">
              {item.name}
            </button>
          ))}

          <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-2 text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-zinc-500 hover:text-white text-left transition-colors py-1 mt-2 cursor-pointer">
            {showMore ? <><ChevronUp className="w-6 h-6" /> Show Less</> : <><ChevronDown className="w-6 h-6" /> See More</>}
          </button>
        </div>
      </div>

      <div className="p-6 sm:px-12 border-t border-zinc-900 shrink-0 bg-black">
        <a href="https://www.saturday-am.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-zinc-500 hover:text-white text-left transition-colors cursor-pointer">
          Official Website <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
        </a>
        {currentUser?.is_admin && (
          <button onClick={() => { onNavigate({ action: 'admin' }); onClose(); }} className="flex items-center gap-4 text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-red-600 hover:text-red-400 text-left transition-colors mt-6 cursor-pointer">
            Command Center <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {showHelpModal && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={() => setShowHelpModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900 rounded-t-2xl">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-[#fe9a00]">Feature Guide</h2>
              <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto no-scrollbar space-y-4 bg-black rounded-b-2xl text-xs text-zinc-400">
              <p>Explore titles in the Vault, collect creator signatures in your Bingo Book, and support creators with hypes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});