import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Trash2, User } from 'lucide-react';

// --- SHARED ANIMATION RENDERER ---
export const RenderFrameAnimations = ({ anim, color }: { anim: string, color: string }) => {
  if (!anim || anim === 'none') return null;
  return (
    <>
      {/* Base Animations */}
      {anim === 'orbit' && <div className="absolute rounded-full border-2 border-transparent pointer-events-none animate-[spin_3s_linear_infinite]" style={{ width: '130%', height: '130%', borderTopColor: color, borderRightColor: color }} />}
      {anim === 'pulse' && <div className="absolute rounded-full pointer-events-none animate-ping opacity-20" style={{ width: '100%', height: '100%', backgroundColor: color }} />}
      {anim === 'spin' && <div className="absolute rounded-full pointer-events-none animate-[spin_4s_linear_infinite]" style={{ width: '115%', height: '115%', border: `2px dashed ${color}` }} />}

      {/* Anime Animations */}
      {anim === 'aura-burst' && (
        <>
          <div className="absolute rounded-full border-[3px] opacity-60 animate-[ping_0.8s_ease-out_infinite]" style={{ width: '120%', height: '120%', borderColor: color }} />
          <div className="absolute rounded-full border-[6px] blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '130%', height: '130%', borderColor: color }} />
        </>
      )}
      {anim === 'evil-aura' && (
        <>
          <div className="absolute rounded-full border-[8px] blur-md animate-[spin_3s_linear_infinite_reverse] opacity-70" style={{ width: '140%', height: '140%', borderColor: color, borderTopColor: 'transparent' }} />
          <div className="absolute rounded-full border-[4px] blur-sm animate-[pulse_2s_ease-in-out_infinite] opacity-80" style={{ width: '120%', height: '120%', borderColor: '#000000', borderBottomColor: color }} />
        </>
      )}
      {anim === 'blade-slash' && (
        <div className="absolute rounded-full border-transparent animate-[spin_0.5s_cubic-bezier(0.1,0.8,0.1,1)_infinite]" style={{ width: '150%', height: '150%', borderTopColor: color, borderRightColor: '#ffffff', borderWidth: '2px 0 0 0' }} />
      )}
      {anim === 'chakra' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_1.5s_linear_infinite]" style={{ width: '120%', height: '120%', borderTopColor: color, borderBottomColor: color, borderWidth: '4px', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full border-transparent animate-[spin_1s_linear_infinite_reverse]" style={{ width: '135%', height: '135%', borderLeftColor: color, borderRightColor: color, borderWidth: '2px', borderStyle: 'dashed' }} />
        </>
      )}
      {anim === 'spirit-bomb' && (
        <div className="absolute rounded-full bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '150%', height: '150%', boxShadow: `0 0 20px 5px ${color}, inset 0 0 15px 5px ${color}`, filter: 'blur(4px)' }} />
      )}
      {anim === 'limit-breaker' && (
        <>
          <div className="absolute rounded-full border-transparent animate-[spin_0.5s_linear_infinite]" style={{ width: '140%', height: '140%', borderTopColor: color, borderBottomColor: color, borderStyle: 'dashed', borderWidth: '4px', filter: `drop-shadow(0 0 10px ${color})` }} />
          <div className="absolute rounded-full animate-[ping_1s_ease-out_infinite] opacity-40" style={{ width: '110%', height: '110%', backgroundColor: color }} />
        </>
      )}
      {anim === 'hollow' && (
        <div className="absolute rounded-full border-transparent animate-[spin_2s_linear_infinite_reverse]" style={{ width: '125%', height: '125%', borderTopColor: color, borderBottomColor: '#000000', borderWidth: '6px', borderStyle: 'dotted', filter: `drop-shadow(0 0 5px ${color})` }} />
      )}
    </>
  );
};

export const FrameMaker = () => {
  const [frames, setFrames] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', name: '', tier: 'Basic', borderColor: '#fe9a00', glowColor: 'transparent', animationStyle: 'none', isActive: true
  });

  const fetchFrames = async () => {
    const { data } = await supabase.from('avatar_frames').select('*').order('created_at', { ascending: false });
    if (data) setFrames(data);
  };

  useEffect(() => { fetchFrames(); }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) return alert("Frame needs a name!");
    setIsSaving(true);
    
    const payload = {
      name: formData.name, tier: formData.tier, border_color: formData.borderColor,
      glow_color: formData.glowColor, animation_style: formData.animationStyle, is_active: formData.isActive
    };

    try {
      if (formData.id) {
        const { error } = await supabase.from('avatar_frames').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('avatar_frames').insert([payload]);
        if (error) throw error;
      }
      setFormData({ id: '', name: '', tier: 'Basic', borderColor: '#fe9a00', glowColor: 'transparent', animationStyle: 'none', isActive: true });
      fetchFrames();
      alert("Frame saved successfully!");
    } catch (e: any) { alert("Database Error: " + e.message); }
    setIsSaving(false);
  };

  const deleteFrame = async (id: string) => {
    if (!window.confirm("Delete this frame permanently?")) return;
    await supabase.from('avatar_frames').delete().eq('id', id);
    fetchFrames();
  };

  const editFrame = (f: any) => {
    setFormData({ id: f.id, name: f.name, tier: f.tier, borderColor: f.border_color, glowColor: f.glow_color, animationStyle: f.animation_style, isActive: f.is_active });
  };

  // Filter frames into separate arrays for the two columns
  const premiumFrames = frames.filter(f => f.tier === 'Premium');
  const basicFrames = frames.filter(f => f.tier === 'Basic');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-zinc-900 border border-[#fe9a00] p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
            {formData.id ? 'Edit Frame' : 'Create New Frame'}
          </h3>
          {formData.id && (
             <button onClick={() => setFormData({ id: '', name: '', tier: 'Basic', borderColor: '#fe9a00', glowColor: 'transparent', animationStyle: 'none', isActive: true })} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest">Cancel Edit</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center justify-center border-r border-zinc-800 pr-4">
             <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8">Live Preview</span>
             <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
               <div className="rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 w-full h-full transition-all" 
                    style={{ border: `2px solid ${formData.borderColor}`, boxShadow: formData.glowColor !== 'transparent' ? `0 0 15px ${formData.glowColor}` : 'none' }}>
                  <User className="text-zinc-500 w-10 h-10" />
               </div>
               <RenderFrameAnimations anim={formData.animationStyle} color={formData.borderColor} />
             </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Frame Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00]" placeholder="e.g. Limit Breaker" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Tier Requirement</label>
                <select value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00]">
                  <option value="Basic">Basic (Free)</option><option value="Premium">Premium (Pro Only)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Border Color</label>
                <div className="flex gap-2">
                  <input type="color" value={formData.borderColor} onChange={e => setFormData({...formData, borderColor: e.target.value})} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <input type="text" value={formData.borderColor} onChange={e => setFormData({...formData, borderColor: e.target.value})} className="w-full bg-black border border-zinc-700 rounded px-2 text-white text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Glow Color</label>
                <div className="flex gap-2">
                  <input type="color" value={formData.glowColor === 'transparent' ? '#000000' : formData.glowColor} onChange={e => setFormData({...formData, glowColor: e.target.value})} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <button onClick={() => setFormData({...formData, glowColor: 'transparent'})} className="bg-zinc-800 text-zinc-400 px-2 rounded text-[9px] hover:text-white transition-colors">Clear</button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Animation Effect</label>
                <select value={formData.animationStyle} onChange={e => setFormData({...formData, animationStyle: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-xs focus:border-[#fe9a00]">
                  <option value="none">None</option>
                  <option value="orbit">Standard Orbit</option>
                  <option value="pulse">Standard Pulse</option>
                  <option value="spin">Standard Spin</option>
                  <option value="aura-burst">Super Energy Aura</option>
                  <option value="evil-aura">Dark/Evil Aura</option>
                  <option value="blade-slash">Blade Slash</option>
                  <option value="chakra">Chakra Swirl</option>
                  <option value="spirit-bomb">Spirit Bomb Glow</option>
                  <option value="limit-breaker">Limit Breaker</option>
                  <option value="hollow">Hollow Mask</option>
                </select>
              </div>
            </div>

            <button onClick={handleSave} disabled={isSaving || !formData.name} className="w-full py-4 mt-4 font-black uppercase tracking-widest rounded transition-all bg-[#fe9a00] text-black hover:bg-white disabled:opacity-50">
              {isSaving ? 'Saving...' : formData.id ? 'Update Frame' : 'Create Frame'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">Live Frames Database</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Premium Frames Column */}
          <div className="bg-black/50 border border-purple-900/30 rounded-xl p-4">
            <h4 className="text-purple-400 font-black uppercase tracking-widest text-[10px] mb-4 border-b border-zinc-800 pb-2 flex items-center justify-between">
              <span>Premium Tier</span>
              <span className="bg-purple-900/30 px-2 py-0.5 rounded-full">{premiumFrames.length} Frames</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {premiumFrames.map(f => (
                <div key={f.id} className="bg-black border border-zinc-800 rounded-lg p-4 flex flex-col items-center group relative overflow-hidden">
                  <button onClick={() => deleteFrame(f.id)} className="absolute top-1 right-1 p-1 bg-black/80 text-zinc-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 z-20"><Trash2 className="w-3 h-3" /></button>
                  <button onClick={() => editFrame(f)} className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-zinc-400 hover:text-[#fe9a00] text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 z-20 border border-zinc-800">Edit</button>
                  
                  <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0 mb-4 mt-2">
                    <div className="rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 w-full h-full" style={{ border: `2px solid ${f.border_color}`, boxShadow: f.glow_color !== 'transparent' ? `0 0 10px ${f.glow_color}` : 'none' }} />
                    <RenderFrameAnimations anim={f.animation_style} color={f.border_color} />
                  </div>

                  <span className="text-[10px] font-black text-white uppercase text-center leading-tight z-20">{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Basic Frames Column */}
          <div className="bg-black/50 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-4 border-b border-zinc-800 pb-2 flex items-center justify-between">
              <span>Basic Tier</span>
              <span className="bg-zinc-800 px-2 py-0.5 rounded-full">{basicFrames.length} Frames</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {basicFrames.map(f => (
                <div key={f.id} className="bg-black border border-zinc-800 rounded-lg p-4 flex flex-col items-center group relative overflow-hidden">
                  <button onClick={() => deleteFrame(f.id)} className="absolute top-1 right-1 p-1 bg-black/80 text-zinc-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 z-20"><Trash2 className="w-3 h-3" /></button>
                  <button onClick={() => editFrame(f)} className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-zinc-400 hover:text-[#fe9a00] text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 z-20 border border-zinc-800">Edit</button>
                  
                  <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0 mb-4 mt-2">
                    <div className="rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center z-10 w-full h-full" style={{ border: `2px solid ${f.border_color}`, boxShadow: f.glow_color !== 'transparent' ? `0 0 10px ${f.glow_color}` : 'none' }} />
                    <RenderFrameAnimations anim={f.animation_style} color={f.border_color} />
                  </div>

                  <span className="text-[10px] font-black text-white uppercase text-center leading-tight z-20">{f.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};