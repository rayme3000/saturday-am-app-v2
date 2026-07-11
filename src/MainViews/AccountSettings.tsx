import React from 'react';
import { ArrowLeft, Award, Shield } from 'lucide-react';

export const AccountSettings = ({ onBack }: any) => {
  return (

    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto mt-4 sm:mt-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <button onClick={onBack} className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:text-[#fe9a00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider">Account Settings</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Billing & Security</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Billing Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-[#fe9a00] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Subscription & Billing
            </h3>
            <div className="bg-black border border-purple-900/50 p-4 rounded-lg mb-4 flex justify-between items-center">
               <div>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Current Plan</p>
                 <p className="text-lg font-black text-purple-400 italic uppercase">Saturday AM+ Premium</p>
               </div>
               <span className="bg-purple-900/40 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded">Active</span>
            </div>
            <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors w-full sm:w-auto">
              Manage Subscription
            </button>
          </div>

          {/* Security Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-zinc-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Login & Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" value="reader@example.com" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                <input type="password" value="********" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div className="flex gap-4 pt-2">
                 <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors flex-1 sm:flex-none">
                   Change Password
                 </button>
                 <button className="bg-red-900/20 text-red-500 border border-red-900/50 px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-900/40 transition-colors flex-1 sm:flex-none">
                   Log Out
                 </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};