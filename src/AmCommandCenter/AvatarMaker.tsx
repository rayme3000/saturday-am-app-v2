import { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { supabase } from '../supabase';

export const AvatarMaker = ({ Dropzone, ThumbnailCropperModal }: any) => {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: ''
  });

  const fetchAvatars = async () => {
    const { data } = await supabase
      .from('avatars')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAvatars(data);
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleSaveAvatar = async () => {
    if (!formData.name.trim() || !formData.imageUrl) {
      return alert('Avatar Name and Image are required.');
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        tier: 'Basic',
        image_url: formData.imageUrl,
        is_active: true
      };

      if (editingId) {
        const { error } = await supabase
          .from('avatars')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        alert('Avatar updated in Vault!');
      } else {
        const { error } = await supabase.from('avatars').insert([payload]);
        if (error) throw error;
        alert('Avatar added to Vault!');
      }

      setFormData({ name: '', imageUrl: '' });
      setEditingId(null);
      fetchAvatars();
      window.dispatchEvent(new Event('vaultUpdated'));
    } catch (e: any) {
      alert('Error saving avatar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (avatar: any) => {
    setEditingId(avatar.id);
    setFormData({
      name: avatar.name || '',
      imageUrl: avatar.image_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', imageUrl: '' });
  };

  const deleteAvatar = async (id: string) => {
    if (!window.confirm('Permanently delete this avatar from the Vault?')) return;
    await supabase.from('avatars').delete().eq('id', id);
    if (editingId === id) cancelEdit();
    fetchAvatars();
    window.dispatchEvent(new Event('vaultUpdated'));
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {cropSourceImage && (
        <ThumbnailCropperModal
          imageUrl={cropSourceImage}
          uploadFolder="user-avatars"
          onCropComplete={(newUrl: any) => {
            setFormData(prev => ({ ...prev, imageUrl: newUrl }));
            setCropSourceImage(null);
          }}
          onCancel={() => setCropSourceImage(null)}
        />
      )}

      {/* UPLOAD & ADD TO VAULT SECTION */}
      <div
        className={`bg-zinc-900 border p-6 rounded-xl shadow-md transition-colors ${
          editingId ? 'border-[#fe9a00]' : 'border-zinc-800'
        }`}
      >
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs">
              {editingId ? `Editing Avatar: ${formData.name}` : 'Create New Avatar'}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
              Saves directly to your Avatar Vault • Bundle or sell avatars in the In-App Store Manager
            </p>
          </div>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors bg-red-900/20 px-3 py-1.5 rounded cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 flex flex-col items-center gap-3">
            {formData.imageUrl ? (
              <>
                <div className="relative group/avatar w-full aspect-square max-w-[180px] mx-auto">
                  <img
                    src={formData.imageUrl}
                    className="w-full h-full object-cover rounded-full border-4 border-[#fe9a00]"
                    alt="Avatar Preview"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-black/80 text-zinc-300 hover:text-red-400 border border-zinc-700 cursor-pointer"
                    title="Clear Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full max-w-[180px]">
                  <Dropzone
                    label="Replace Image"
                    height="p-2.5 rounded-full"
                    folderPath="temp"
                    onUploadComplete={(url: any) => setCropSourceImage(url)}
                  />
                </div>
              </>
            ) : (
              <div className="w-full aspect-square max-w-[180px] mx-auto">
                <Dropzone
                  label={editingId ? '+ Replace Image' : '+ Upload & Crop'}
                  height="h-full min-h-[180px] rounded-full"
                  folderPath="temp"
                  onUploadComplete={(url: any) => setCropSourceImage(url)}
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col justify-center space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Avatar Name
              </label>
              <input
                type="text"
                placeholder="e.g., Anil MMWOG or Dia MMWOG"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-xl p-3.5 text-white font-bold focus:outline-none focus:border-[#fe9a00]"
              />
            </div>

            <button
              onClick={handleSaveAvatar}
              disabled={isSaving || !formData.name.trim() || !formData.imageUrl}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                isSaving || !formData.name.trim() || !formData.imageUrl
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#fe9a00] text-black hover:bg-white shadow-[0_0_15px_rgba(254,154,0,0.3)]'
              }`}
            >
              {isSaving ? 'SAVING...' : editingId ? 'UPDATE IN VAULT' : 'ADD TO VAULT'}
            </button>
          </div>
        </div>
      </div>

      {/* VAULT GALLERY */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-[#fe9a00] uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-4">
          Avatar Vault ({avatars.length})
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {avatars.map(avatar => (
            <div
              key={avatar.id}
              className={`bg-black border border-zinc-800 hover:border-[#fe9a00] rounded-xl p-3.5 flex flex-col items-center text-center relative group transition-all ${
                editingId === avatar.id
                  ? 'ring-2 ring-[#fe9a00] ring-offset-2 ring-offset-black'
                  : ''
              }`}
            >
              <button
                onClick={() => deleteAvatar(avatar.id)}
                className="absolute top-1.5 right-1.5 p-1 bg-black/80 text-zinc-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                title="Delete Avatar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleEditClick(avatar)}
                className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/80 text-zinc-300 hover:text-[#fe9a00] text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-zinc-700 hover:border-[#fe9a00] flex items-center gap-1 cursor-pointer"
                title="Edit Avatar"
              >
                <Edit3 className="w-2.5 h-2.5" /> Edit
              </button>

              <img
                src={avatar.image_url}
                alt={avatar.name}
                className="w-16 h-16 rounded-full object-cover mb-2.5 border-2 border-zinc-700 group-hover:border-[#fe9a00] transition-colors"
              />

              <h4 className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                {avatar.name}
              </h4>
            </div>
          ))}
          {avatars.length === 0 && (
            <p className="col-span-full text-center text-zinc-600 text-xs py-8 uppercase tracking-widest font-bold">
              Vault is empty.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};