import React, { useState } from 'react';
import { X, ShieldAlert, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLogin?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AdminLogin({ onLogin, onBack, onClose, onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExit = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  const handleSuccess = () => {
    if (onLogin) onLogin();
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (cleanUsername === 'satamadmin' && password === 'S@turday2013!') {
      handleSuccess();
    } else {
      setErrorMessage('Invalid Administrator Username or Password.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[7000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in font-sans"
      onClick={handleExit}
    >
      <div 
        className="w-full max-w-sm bg-zinc-950 border-2 border-red-900/60 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Restricted Warning Strip */}
        <div className="bg-red-950/60 border-b border-red-900/50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
              Restricted Area // Staff Only
            </span>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5"
            aria-label="Exit Admin Login"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fe9a00]/10 border border-[#fe9a00]/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
              <Lock className="w-6 h-6 text-[#fe9a00]" />
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">
              AM Command Center
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
              Internal System Console
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoComplete="username"
                required
                className="w-full bg-black border border-zinc-800 text-white text-xs font-mono px-3.5 py-3 rounded-lg focus:border-[#fe9a00] outline-none placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="current-password"
                  required
                  className="w-full bg-black border border-zinc-800 text-white text-xs font-mono px-3.5 py-3 pr-10 rounded-lg focus:border-[#fe9a00] outline-none placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-950/50 border border-red-800/80 rounded-lg text-red-400 text-[11px] font-bold text-center">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-lg transition-all shadow-[0_0_20px_rgba(254,154,0,0.25)] mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              Authorize Access
            </button>
          </form>

          <button
            type="button"
            onClick={handleExit}
            className="w-full mt-6 pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 hover:text-white font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit to Public App
          </button>
        </div>
      </div>
    </div>
  );
}