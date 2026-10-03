import React, { useState } from 'react';

export const AdminLogin = ({ onLogin, onBack }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (username === 'admin' && password === 'saturday') {
      setError('');
      setIsLoading(true);
      // Small artificial delay to show the transition animation smoothly
      setTimeout(() => {
        onLogin();
      }, 800);
    } else {
      setError('ACCESS DENIED');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <style>{`
            @keyframes hype-pulse-glow {
              0%, 100% { filter: drop-shadow(0 0 15px rgba(254,154,0,0.5)); transform: scale(1); }
              50% { filter: drop-shadow(0 0 30px rgba(254,154,0,1)); transform: scale(1.05); }
            }
            .animate-hype-glow { animation: hype-pulse-glow 2s ease-in-out infinite; }
          `}</style>
          <div 
            className="w-20 h-20 md:w-24 md:h-24 bg-[#fe9a00] animate-hype-glow"
            style={{
              WebkitMaskImage: "url('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png')",
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskImage: "url('https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/AM%20Hype%20icon%20full.png')",
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-500 p-6 flex flex-col items-center justify-center font-mono">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-4">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase">System Access</h2>
          <button onClick={onBack} className="text-[10px] uppercase tracking-widest hover:text-white transition-colors">Abort</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-2">Identifier</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
              placeholder="///"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-2">Passcode</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-white text-sm focus:outline-none focus:border-[#fe9a00] transition-colors" 
              placeholder="///"
            />
          </div>
          
          <div className="h-4 flex items-center">
            {error && <p className="text-red-500 text-[10px] font-bold tracking-widest uppercase">{error}</p>}
          </div>
          
          <button type="submit" className="w-full mt-4 bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#fe9a00] hover:text-black transition-all">
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};