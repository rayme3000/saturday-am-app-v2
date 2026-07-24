import { memo } from 'react';
import { X, CreditCard } from 'lucide-react';

export const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard, userTier, onUpsell }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { name: 'Browse Library', action: 'browse', prefetch: () => import('../MainViews/Browse.tsx') },
    { name: 'Edit Profile', action: 'profile', prefetch: () => import('../VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Favorites', action: 'faves', prefetch: () => import('../MainViews/MyFaves.tsx') },
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('../VirtualProfile/BingoBook') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    { name: 'Settings', action: 'settings', prefetch: () => import('../MainViews/Settings.tsx') }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      
      <div className="flex-1 flex flex-col justify-start px-8 sm:px-12 gap-5 sm:gap-6 overflow-y-auto pt-8 pb-32 no-scrollbar">
        
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
      </div>
    </div>
  );
});