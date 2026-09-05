import React, { useState } from 'react';
import { Flame } from 'lucide-react';

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
        <div className="relative w-12 h-12 flex justify-center">
          <Flame className="w-12 h-12 text-zinc-800 absolute bottom-0" strokeWidth={1.5} />
          <div className="absolute bottom-0 overflow-hidden w-12 flex justify-center animate-flame-fill">
            <Flame className="w-12 h-12 text-[#fe9a00] fill-[#fe9a00] absolute bottom-0" strokeWidth={1.5} />
          </div>
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