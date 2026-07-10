import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

export const AvatarMaker = ({ Dropzone, ThumbnailCropperModal }: any) => {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    tier: 'Basic',
    imageUrl: '',
    isActive: true
  });

  const fetchAvatars = async () => {
    const { data } = await supabase.from('avatars').select('*').order('created_at', { ascending: false });
    if (data) setAvatars(data);
  };

  useEffect(() => { fetchAvatars(); }, []);

  const handleSaveAvatar = async () => {
    if (!formData.name || !formData.imageUrl) return alert("Name and Image are required.");
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('avatars').update({
          name: formData.name,
          tier: formData.tier,
          image_url: formData.imageUrl,
          is_active: formData.isActive
        }).eq('id', editingId);
        if (error) throw error;
        alert("Avatar updated!");
      } else {
        const { error } = await supabase.from('avatars').insert([{
          name: formData.name,
          tier: formData.tier,
          image_url: formData.imageUrl,
          is_active: formData.isActive
        }]);
        if (error) throw error;
        alert("Avatar added to vault!");
      }
      
      setFormData({ name: '', tier: 'Basic', imageUrl: '', isActive: true });
      setEditingId(null);
      fetchAvatars();
    } catch (e: any) { alert("Error saving avatar: " + e.message); }
    finally { setIsSaving(false); }
  };

  const handleEditClick = (avatar: any) => {
    setEditingId(avatar.id);
    setFormData({
      name: avatar.name,
      tier: avatar.tier,
      imageUrl: avatar.image_url,
      isActive: avatar.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', tier: 'Basic', imageUrl: '', isActive: true });
  };

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('avatars').update({ is_active: !currentStatus }).eq('id', id);
    fetchAvatars();
  };

  const deleteAvatar = async (id: string) => {
    if (!window.confirm("Permanently delete this avatar?")) return;
    await supabase.from('avatars').delete().eq('id', id);
    if (editingId === id) cancelEdit(); 
    fetchAvatars();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {cropSourceImage && (
        <ThumbnailCropperModal 
          imageUrl={cropSourceImage} 
          uploadFolder="user-avatars"
          onCropComplete={(newUrl: any) => {
            setFormData({...formData, imageUrl: newUrl});
            setCropSourceImage(null);
          }} 
          onCancel={() => setCropSourceImage(null)} 
        />
      )}

      {/* UPLOAD & CREATE/EDIT SECTION */}
      <div className={`bg-zinc-900 border p-6 rounded-xl shadow-md transition-colors ${editingId ? 'border-[#fe9a00]' : 'border-zinc-800'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
            {editingId ? `Editing Avatar: ${formData.name}` : 'Create New Avatar'}
          </h3>
          {editingId && (
             <button onClick={cancelEdit} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors bg-red-900/20 px-3 py-1 rounded">
               Cancel Edit
             </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {formData.imageUrl ? (
              <div className="relative group/avatar w-full aspect-square max-w-[200px] mx-auto">
                <img src={formData.imageUrl} className="w-full h-full object-cover rounded-full border-4 border-zinc-700" alt="Avatar Preview" />
              </div>
            ) : (
              <div className="w-full aspect-square max-w-[200px] mx-auto">
                <Dropzone label={editingId ? "+ Replace Image" : "+ Upload & Crop"} height="h-full min-h-[200px] rounded-full" folderPath="temp" onUploadComplete={(url: any) => setCropSourceImage(url)} />
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Avatar Name</label>
              <input type="text" placeholder="e.g., Isao Base Form" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-bold focus:border-[#fe9a00]" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Rarity Tier</label>
                <select value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
                  <option value="Basic">Basic (Free)</option>
                  <option value="Premium">Premium</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Ultra Rare">Ultra Rare</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Initial Status</label>
                <select value={formData.isActive ? 'active' : 'hidden'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-[#fe9a00]">
                  <option value="active">Active (Available to Users)</option>
                  <option value="hidden">Hidden (Vaulted)</option>
                </select>
              </div>
            </div>

            <button onClick={handleSaveAvatar} disabled={isSaving || !formData.name || !formData.imageUrl} className={`w-full py-4 mt-4 font-black uppercase tracking-widest rounded transition-all ${isSaving || !formData.name || !formData.imageUrl ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : editingId ? 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]' : 'bg-[#fe9a00] text-black hover:bg-white'}`}>
              {isSaving ? 'SAVING...' : editingId ? 'UPDATE AVATAR' : 'ADD TO VAULT'}
            </button>
          </div>
        </div>
      </div>

      {/* VAULT GALLERY */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">Avatar Vault ({avatars.length})</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {avatars.map(avatar => (
            <div key={avatar.id} className={`bg-black border rounded-lg p-3 flex flex-col items-center text-center relative group transition-colors ${avatar.is_active ? 'border-zinc-700 hover:border-[#fe9a00]' : 'border-red-900/50 opacity-60'} ${editingId === avatar.id ? 'ring-2 ring-[#fe9a00] ring-offset-2 ring-offset-black' : ''}`}>
              <button onClick={() => deleteAvatar(avatar.id)} className="absolute top-1 right-1 p-1 bg-black/80 text-zinc-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete Avatar"><X className="w-3 h-3" /></button>
              <button onClick={() => handleEditClick(avatar)} className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-zinc-400 hover:text-[#fe9a00] text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-zinc-800 hover:border-[#fe9a00]" title="Edit Avatar">Edit</button>
              
              <img src={avatar.image_url} alt={avatar.name} className={`w-16 h-16 rounded-full object-cover mb-3 border-2 ${avatar.tier === 'Ultra Rare' ? 'border-yellow-400' : avatar.tier === 'Premium' ? 'border-purple-500' : avatar.tier === 'Seasonal' ? 'border-green-500' : 'border-zinc-500'}`} />
              
              <h4 className="text-[10px] font-bold text-white leading-tight mb-1 line-clamp-2">{avatar.name}</h4>
              <p className={`text-[8px] font-black uppercase tracking-widest mb-3 ${avatar.tier === 'Ultra Rare' ? 'text-yellow-400' : avatar.tier === 'Premium' ? 'text-purple-500' : avatar.tier === 'Seasonal' ? 'text-green-500' : 'text-zinc-500'}`}>{avatar.tier}</p>
              
              <button onClick={() => toggleActiveStatus(avatar.id, avatar.is_active)} className={`w-full py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-colors ${avatar.is_active ? 'bg-zinc-800 text-zinc-300 hover:bg-red-900/50 hover:text-red-500' : 'bg-red-900/20 text-red-500 hover:bg-green-900/30 hover:text-green-500'}`}>
                {avatar.is_active ? 'Vault' : 'Unvault'}
              </button>
            </div>
          ))}
          {avatars.length === 0 && <p className="col-span-full text-center text-zinc-600 text-xs py-8 uppercase tracking-widest font-bold">Vault is empty.</p>}
        </div>
      </div>
    </div>
  );
};