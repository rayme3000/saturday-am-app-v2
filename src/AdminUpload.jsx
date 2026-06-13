import React from 'react';

export const AdminUpload = () => {
  return (
    <div className="min-h-screen bg-black p-8 flex justify-center items-start pt-16">
      <div className="w-full max-w-3xl bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-2xl">
        <h2 className="text-3xl font-black text-[#fe9a00] mb-2 tracking-wide uppercase">Command Center</h2>
        <p className="text-zinc-400 mb-8">Upload a new series to the Saturday AM Vault.</p>

        <form className="space-y-6">
          {/* Title & Author Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Series Title</label>
              <input 
                type="text" 
                className="w-full bg-zinc-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#fe9a00]" 
                placeholder="e.g. Bully Eater" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Author / Creator</label>
              <input 
                type="text" 
                className="w-full bg-zinc-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#fe9a00]" 
                placeholder="e.g. Raymond Brown" 
              />
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">Synopsis</label>
            <textarea 
              className="w-full bg-zinc-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#fe9a00] h-32" 
              placeholder="What is this series about?"
            />
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/50 p-6 rounded border border-zinc-800">
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Cover Art (Vertical)</label>
              <input 
                type="file" 
                accept="image/*" 
                className="w-full text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-[#fe9a00] hover:file:bg-zinc-700 cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Transparent Logo</label>
              <input 
                type="file" 
                accept="image/*" 
                className="w-full text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-[#fe9a00] hover:file:bg-zinc-700 cursor-pointer" 
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="button" 
            className="w-full bg-[#fe9a00] text-black font-black text-lg py-4 rounded uppercase tracking-widest hover:bg-orange-500 transition-colors mt-8"
          >
            Upload to Vault
          </button>
        </form>
      </div>
    </div>
  );
};