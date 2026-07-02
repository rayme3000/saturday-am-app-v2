import { useState } from 'react';
import { ArrowLeft, Lock, CreditCard, Bell, Smartphone, Shield, ChevronRight, LogOut, AlertTriangle, ExternalLink } from 'lucide-react';

const Settings = ({ onBack, onSignOut }: any) => {
  // Dummy toggle states to make the UI feel alive before wiring
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-fade-in relative z-[200]">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900 p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-lg">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-widest text-[#fe9a00]">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        
        {/* === SECURITY SECTION === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Account Security
          </h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg group-hover:text-[#fe9a00] transition-colors"><Lock className="w-4 h-4" /></div>
                <span className="font-bold text-sm tracking-wide">Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </button>
            <button className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg group-hover:text-[#fe9a00] transition-colors"><Shield className="w-4 h-4" /></div>
                <span className="font-bold text-sm tracking-wide">Two-Factor Authentication</span>
              </div>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded uppercase tracking-widest">Enabled</span>
            </button>
          </div>
        </section>

        {/* === BILLING & SUBSCRIPTION === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            <CreditCard className="w-3 h-3" /> Billing & Plan
          </h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden p-5">
            
            {/* Current Plan Card */}
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-zinc-800/50">
              <div>
                <p className="font-black text-xl italic uppercase tracking-widest mb-1 text-white">AM Crew <span className="text-[#fe9a00]">Pro</span></p>
                <p className="text-xs text-zinc-400 font-bold tracking-wider">$19.99 / month</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-[#fe9a00] text-black px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(254,154,0,0.3)]">Active</span>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-zinc-800 mb-6">
              <div className="bg-zinc-900 p-2 rounded shrink-0">
                <CreditCard className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black tracking-widest">•••• •••• •••• 4242</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Expires 12/28</p>
              </div>
              <button className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest hover:text-white transition-colors bg-zinc-900 px-3 py-1.5 rounded">Edit</button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-3 h-3" /> View Billing History
              </button>
              <button className="w-full py-4 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 group">
                <AlertTriangle className="w-3 h-3 group-hover:animate-pulse" /> Cancel Subscription
              </button>
            </div>
          </div>
        </section>

        {/* === NOTIFICATIONS === */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-2 flex items-center gap-2">
            <Bell className="w-3 h-3" /> Notifications
          </h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            
            {/* Push Toggle */}
            <div className="w-full flex items-center justify-between p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg"><Smartphone className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <p className="font-bold text-sm tracking-wide">Push Notifications</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">New chapters & hype alerts</p>
                </div>
              </div>
              <button 
                onClick={() => setPushEnabled(!pushEnabled)} 
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${pushEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Email Toggle */}
            <div className="w-full flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black rounded-lg"><Bell className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <p className="font-bold text-sm tracking-wide">Email Updates</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Newsletters & exclusive offers</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailEnabled(!emailEnabled)} 
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${emailEnabled ? 'bg-[#fe9a00]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${emailEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>
        </section>

        {/* === APP INFO & LOGOUT === */}
        <section className="pt-6 space-y-4">
          <div className="flex justify-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <button className="hover:text-white transition-colors">Terms of Service</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">Privacy Policy</button>
          </div>
          
          <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-3 p-5 border border-zinc-800 bg-black rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-black uppercase tracking-widest text-xs mt-8"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          <p className="text-center text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">App Version 2.0.4</p>
        </section>

      </div>
    </div>
  );
};

export default Settings;