// --- COMPREHENSIVE COUNTRY CODE LIST ---
export const COUNTRY_CODES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }, { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' }, { code: 'FR', name: 'France' }, 
  { code: 'DE', name: 'Germany' }, { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' }, { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' }, { code: 'MY', name: 'Malaysia' }, { code: 'SG', name: 'Singapore' }, { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' }, { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'EG', name: 'Egypt' }, { code: 'KE', name: 'Kenya' }, { code: 'GH', name: 'Ghana' },
  { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' }, { code: 'PL', name: 'Poland' }, { code: 'SE', name: 'Sweden' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' }, { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
  { code: 'NO', name: 'Norway' }, { code: 'FI', name: 'Finland' }, { code: 'DK', name: 'Denmark' },
  { code: 'IE', name: 'Ireland' }, { code: 'PT', name: 'Portugal' }, { code: 'GR', name: 'Greece' }, { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'IL', name: 'Israel' }, { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Peru' }, { code: 'VE', name: 'Venezuela' },
  { code: 'JM', name: 'Jamaica' }, { code: 'PR', name: 'Puerto Rico' }, { code: 'BS', name: 'Bahamas' }, { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' }
].sort((a, b) => a.name.localeCompare(b.name));

export const BASIC_FRAMES = [
  { id: 'none', name: 'Original', style: 'border-2 border-zinc-800' },
  { id: 'white', name: 'Pure White', style: 'border-2 border-white' },
  { id: 'slate', name: 'Solid Slate', style: 'border-2 border-slate-500' },
  { id: 'gray', name: 'Solid Gray', style: 'border-2 border-gray-400' },
  { id: 'red', name: 'Solid Red', style: 'border-2 border-red-600' },
  { id: 'orange', name: 'Solid Orange', style: 'border-2 border-orange-500' },
  { id: 'amber', name: 'Solid Amber', style: 'border-2 border-amber-500' },
  { id: 'yellow', name: 'Solid Yellow', style: 'border-2 border-yellow-500' },
  { id: 'lime', name: 'Solid Lime', style: 'border-2 border-lime-500' },
  { id: 'green', name: 'Solid Green', style: 'border-2 border-green-500' },
  { id: 'emerald', name: 'Solid Emerald', style: 'border-2 border-emerald-500' },
  { id: 'teal', name: 'Solid Teal', style: 'border-2 border-teal-500' },
  { id: 'cyan', name: 'Solid Cyan', style: 'border-2 border-cyan-500' },
  { id: 'sky', name: 'Solid Sky', style: 'border-2 border-sky-500' },
  { id: 'blue', name: 'Solid Blue', style: 'border-2 border-blue-500' },
  { id: 'indigo', name: 'Solid Indigo', style: 'border-2 border-indigo-500' },
  { id: 'violet', name: 'Solid Violet', style: 'border-2 border-violet-500' },
  { id: 'purple', name: 'Solid Purple', style: 'border-2 border-purple-500' },
  { id: 'fuchsia', name: 'Solid Fuchsia', style: 'border-2 border-fuchsia-500' },
  { id: 'pink', name: 'Solid Pink', style: 'border-2 border-pink-500' },
  { id: 'rose', name: 'Solid Rose', style: 'border-2 border-rose-500' },
  { id: 'crimson', name: 'Crimson', style: 'border-2 border-red-900' },
  { id: 'navy', name: 'Navy Blue', style: 'border-2 border-blue-900' },
  { id: 'neon', name: 'Neon Green', style: 'border-2 border-[#39ff14]' },
];

export const PREMIUM_FRAMES = [
  // --- EXISTING SATURDAY AM THEMES ---
  { id: 'gold', name: 'Ultra Gold', style: 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]', orbit: 'border-t-yellow-400 border-r-yellow-400 animate-[spin_3s_linear_infinite]' },
  { id: 'appleblack', name: 'Apple Black', style: 'border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]', orbit: 'border-t-red-500 border-l-red-500 animate-[spin_2.5s_linear_infinite]' },
  { id: 'clockstriker', name: 'Clock Striker', style: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]', orbit: 'border-b-cyan-400 border-r-cyan-400 animate-[spin_3s_linear_infinite_reverse]' },

  // --- ELEMENTAL EFFECTS ---
  { id: 'blazingfire', name: 'Blazing Fire', style: 'border-2 border-orange-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]', orbit: 'border-t-[6px] border-r-[2px] border-b-[8px] border-red-500 animate-[spin_0.3s_cubic-bezier(0.4,0,0.2,1)_infinite] scale-110 opacity-90' },
  { id: 'lightningstrike', name: 'Lightning Strike', style: 'border-2 border-cyan-200 shadow-[0_0_30px_rgba(165,243,252,1)]', orbit: 'border-y-[4px] border-dashed border-cyan-300 animate-[spin_0.1s_linear_infinite_reverse] scale-125' },
  { id: 'waterstream', name: 'Water Stream', style: 'border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.7)]', orbit: 'border-[6px] border-blue-400 border-l-transparent border-t-transparent animate-[spin_1.5s_ease-in-out_infinite] scale-110 opacity-70' },

  // --- HEROIC / SHONEN VIBES ---
  { id: 'auraburst', name: 'Aura Burst', style: 'border-2 border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.8)]', orbit: 'border-4 border-dashed border-yellow-400 animate-[spin_1s_linear_infinite]' },
  { id: 'smashhero', name: 'Smash Hero', style: 'border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]', orbit: 'border-y-4 border-green-500 animate-[spin_0.5s_ease-in-out_infinite]' },
  { id: 'chakraswirl', name: 'Chakra Swirl', style: 'border-2 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.6)]', orbit: 'border-2 border-blue-400 border-t-transparent border-b-transparent animate-[spin_1.5s_linear_infinite] scale-110' },
  { id: 'thunderbreath', name: 'Thunder Breathing', style: 'border-2 border-yellow-200 shadow-[0_0_20px_rgba(254,240,138,0.8)]', orbit: 'border-t-4 border-r-4 border-yellow-300 animate-[spin_0.3s_linear_infinite]' },
  { id: 'beastmode', name: 'Beast Mode', style: 'border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]', orbit: 'border-4 border-double border-orange-500 animate-[spin_1.5s_ease-in-out_infinite]' },
  { id: 'spiritbomb', name: 'Spirit Bomb', style: 'border-2 border-cyan-300 shadow-[0_0_25px_rgba(103,232,249,0.9)]', orbit: 'bg-cyan-300/30 animate-pulse scale-110' },
  { id: 'starpower', name: 'Star Power', style: 'border-2 border-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.8)]', orbit: 'border-x-4 border-pink-400 animate-[spin_2s_cubic-bezier(0,0,0.2,1)_infinite]' },
  { id: 'cosmiccore', name: 'Cosmic Core', style: 'border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]', orbit: 'border-[5px] border-dotted border-indigo-400 animate-[spin_3s_linear_infinite]' },
  { id: 'over9000', name: 'Over 9000!', style: 'border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,1)]', orbit: 'border-4 border-red-500 border-l-yellow-400 border-r-yellow-400 animate-[spin_0.2s_linear_infinite]' },

  // --- EVIL / VILLAIN VIBES ---
  { id: 'hollowmask', name: 'Hollow Mask', style: 'border-2 border-zinc-950 shadow-[0_0_20px_rgba(220,38,38,0.8)]', orbit: 'border-y-4 border-red-600 animate-[spin_0.8s_linear_infinite_reverse] scale-110' },
  { id: 'darkmatter', name: 'Dark Matter', style: 'border-2 border-purple-700 shadow-[0_0_20px_rgba(126,34,206,0.9)]', orbit: 'border-4 border-dashed border-purple-900 animate-[spin_2s_linear_infinite_reverse]' },
  { id: 'bloodoath', name: 'Blood Oath', style: 'border-2 border-red-800 shadow-[0_0_15px_rgba(153,27,27,0.8)]', orbit: 'border-[6px] border-double border-red-600 animate-pulse' },

  // --- WEIRD / OFF-THE-WALL ---
  { id: 'glitch', name: 'Glitch Protocol', style: 'border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)]', orbit: 'border-x-4 border-fuchsia-500 animate-[spin_0.2s_linear_infinite_reverse] opacity-80' },
  { id: 'rift', name: 'Dimensional Rift', style: 'border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)]', orbit: 'bg-gradient-to-tr from-purple-500 via-transparent to-cyan-500 animate-[spin_1s_linear_infinite] opacity-60' },
  { id: 'ufo', name: 'Abduction', style: 'border-2 border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.8)]', orbit: 'border-t-4 border-lime-500 animate-bounce scale-125 opacity-70' },

  // --- BURST & PARTICLE EFFECTS ---
  { id: 'limitbreaker', name: 'Limit Breaker', style: 'border-2 border-cyan-300 shadow-[0_0_30px_rgba(34,211,238,1)]', orbit: 'border-[4px] border-dashed border-cyan-400 animate-[ping_0.8s_cubic-bezier(0,0,0.2,1)_infinite]' },
  { id: 'solarflare', name: 'Solar Flare', style: 'border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,1)]', orbit: 'border-[6px] border-dotted border-orange-500/80 animate-[ping_0.6s_ease-out_infinite]' },
  { id: 'particlecannon', name: 'Particle Cannon', style: 'border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,1)]', orbit: 'border-[12px] border-dotted border-fuchsia-400 animate-[spin_0.8s_linear_infinite] scale-[1.3] opacity-60' },
  { id: 'stardust', name: 'Star Dust', style: 'border-2 border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]', orbit: 'border-[8px] border-dotted border-yellow-200 animate-[ping_1.2s_linear_infinite] scale-125 opacity-70' },
  { id: 'voidburst', name: 'Void Burst', style: 'border-2 border-white shadow-[0_0_30px_rgba(255,255,255,1)]', orbit: 'bg-white/50 animate-[ping_0.4s_ease-in_infinite]' },
];

export const getFrameStyle = (id: string) => [...BASIC_FRAMES, ...PREMIUM_FRAMES].find(f => f.id === id)?.style || 'border-2 border-zinc-800';
export const getOrbitStyle = (id: string) => PREMIUM_FRAMES.find(f => f.id === id)?.orbit || '';