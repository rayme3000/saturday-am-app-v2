import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Flame, Gift, ShoppingBag, Search, CheckCircle, AlertTriangle, Settings } from 'lucide-react';

export const HypeManager = ({ setIsDirty }: any) => {
  const [settings, setSettings] = useState({
    free_tier_hypes: 5,
    premium_tier_hypes: 10,
    merch_purchase_hypes: 5,
    sub_purchase_hypes: 20
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Prize Distribution States
  const [searchQuery, setSearchQuery] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [prizeAmount, setPrizeAmount] = useState<number>(10);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardMessage, setAwardMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setSettings({
          free_tier_hypes: data.free_tier_hypes || 5,
          premium_tier_hypes: data.premium_tier_hypes || 10,
          merch_purchase_hypes: data.merch_purchase_hypes || 5,
          sub_purchase_hypes: data.sub_purchase_hypes || 20
        });
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    if (setIsDirty) setIsDirty(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('app_settings').upsert({ id: 1, ...settings });
    setIsSaving(false);
    if (error) alert("Error saving Hype settings: " + error.message);
    else { alert("Hype Economy Updated!"); if (setIsDirty) setIsDirty(false); }
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAwardMessage(null);
    setTargetUser(null);
    
    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, hypes_remaining, email')
      .or(`username.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setAwardMessage({ type: 'error', text: 'No user found with that username or email.' });
    } else {
      setTargetUser(data);
    }
  };

  const handleAwardHypes = async () => {
    if (!targetUser) return;
    setIsAwarding(true);
    setAwardMessage(null);

    const newTotal = (targetUser.hypes_remaining || 0) + prizeAmount;

    const { error } = await supabase
      .from('profiles')
      .update({ hypes_remaining: newTotal })
      .eq('id', targetUser.id);

    setIsAwarding(false);

    if (error) {
      setAwardMessage({ type: 'error', text: error.message });
    } else {
      setAwardMessage({ type: 'success', text: `Successfully awarded ${prizeAmount} Hypes to ${targetUser.username}!` });
      setTargetUser({ ...targetUser, hypes_remaining: newTotal });
      setSearchQuery('');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3 mb-8 border-b border-zinc-800 pb-4">
        <Flame className="w-8 h-8 text-[#fe9a00]" />
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-widest text-[#fe9a00]">Hype Economy Manager</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Control distribution, refills, and rewards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: GLOBAL SETTINGS */}
        <div className="space-y-6">
          <div className="bg-black p-6 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <Settings className="w-4 h-4 text-[#fe9a00]" /> Base Refill Configuration
            </h3>
            <p className="text-xs text-zinc-400 font-bold mb-4">Set the baseline amount of Hypes users receive when their balance resets.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Free Tier Refill</label>
                <input 
                  type="number" min="0" value={settings.free_tier_hypes} 
                  onChange={(e) => handleChange('free_tier_hypes', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-black focus:border-[#fe9a00] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pro Tier Refill</label>
                <input 
                  type="number" min="0" value={settings.premium_tier_hypes} 
                  onChange={(e) => handleChange('premium_tier_hypes', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] font-black focus:border-[#fe9a00] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-black p-6 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <ShoppingBag className="w-4 h-4 text-[#fe9a00]" /> Purchase Rewards
            </h3>
            <p className="text-xs text-zinc-400 font-bold mb-4">Define how many bonus Hypes are automatically awarded for transactions.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Merch Purchase</label>
                <input 
                  type="number" min="0" value={settings.merch_purchase_hypes} 
                  onChange={(e) => handleChange('merch_purchase_hypes', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-black focus:border-[#fe9a00] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">New Subscription</label>
                <input 
                  type="number" min="0" value={settings.sub_purchase_hypes} 
                  onChange={(e) => handleChange('sub_purchase_hypes', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[#fe9a00] font-black focus:border-[#fe9a00] outline-none"
                />
              </div>
            </div>
          </div>

          <button onClick={handleSaveSettings} disabled={isSaving} className="w-full bg-zinc-800 text-white hover:text-black border border-zinc-700 hover:border-[#fe9a00] font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#fe9a00] transition-colors shadow-lg">
            {isSaving ? 'Saving Config...' : 'Save Global Rules'}
          </button>
        </div>

        {/* RIGHT COLUMN: DIRECT AWARDS */}
        <div className="bg-black p-6 rounded-xl border border-zinc-800 flex flex-col">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
            <Gift className="w-4 h-4 text-[#fe9a00]" /> Instant Prize Distribution
          </h3>
          <p className="text-xs text-zinc-400 font-bold mb-6">Manually award bonus Hypes to specific users for event wins, giveaways, or support tickets.</p>
          
          <form onSubmit={handleSearchUser} className="mb-6">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Find User (Username or Email)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. MangaFan99" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-bold focus:border-[#fe9a00] outline-none"
              />
              <button type="submit" className="bg-zinc-800 text-white px-4 rounded-lg hover:bg-zinc-700 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          {awardMessage && (
            <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 border ${awardMessage.type === 'error' ? 'bg-red-900/10 border-red-900/50 text-red-500' : 'bg-emerald-900/10 border-emerald-900/50 text-emerald-400'}`}>
              {awardMessage.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              <p className="text-xs font-bold leading-relaxed">{awardMessage.text}</p>
            </div>
          )}

          {targetUser ? (
            <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-xl mt-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-lg font-black text-white">{targetUser.username}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">{targetUser.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Balance</p>
                  <p className="text-xl font-black text-[#fe9a00]">{targetUser.hypes_remaining || 0} <Flame className="inline w-4 h-4 -mt-1" /></p>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount to Award</label>
                  <input 
                    type="number" min="1" max="1000"
                    value={prizeAmount}
                    onChange={(e) => setPrizeAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-[#fe9a00] font-black focus:border-[#fe9a00] outline-none text-center text-xl tracking-widest"
                  />
                </div>
                <button 
                  onClick={handleAwardHypes}
                  disabled={isAwarding || prizeAmount < 1}
                  className="w-1/2 bg-[#fe9a00] text-black hover:bg-white font-black uppercase tracking-widest py-3 rounded-lg transition-colors disabled:opacity-50 h-[52px]"
                >
                  {isAwarding ? 'Sending...' : 'Award Prize'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center p-8 text-center mt-auto">
              <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Search for a user to issue a reward</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};