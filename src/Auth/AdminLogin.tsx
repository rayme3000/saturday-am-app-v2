import React, { useState } from 'react';

export const AdminLogin = ({ onLogin, onBack }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (username === 'admin' && password === 'saturday') {
      onLogin();
    } else {
      setError('ACCESS DENIED');
    }
  };

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