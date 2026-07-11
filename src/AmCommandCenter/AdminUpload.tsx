import React, { useState } from 'react';
import { supabase } from '../supabase'; // Adjust path if needed

export const AdminUpload = () => {
  // 1. Set up the "memory" for our form inputs
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // 2. Track when the app is actively uploading
  const [isUploading, setIsUploading] = useState(false);

  // Helper function to upload images directly to your R2 Vault
  const uploadImageToVault = async (file: File, folder: string) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('saturday-am-vault')
      .upload(filePath, file);

    if (error) throw error;

    // Get the public URL to save to the database
    const { data } = supabase.storage
      .from('saturday-am-vault')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  };

  // 3. The Main Engine: What happens when you click "Upload to Vault"
  const handleSubmit = async () => {
    // Basic validation
    if (!title || !creator || !synopsis) {
      alert("Please fill out the Title, Creator, and Synopsis!");
      return;
    }

    setIsUploading(true);

    try {
      // Step A: Upload the images (if provided)
      let coverUrl = null;
      let logoUrl = null;
      
      if (coverFile) coverUrl = await uploadImageToVault(coverFile, 'series-covers');
      if (logoFile) logoUrl = await uploadImageToVault(logoFile, 'series-logos');

      // Step B: Automatically generate a URL-friendly slug (e.g., "Apple Black" -> "apple-black")
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Step C: Save everything to the database
      const { error } = await supabase
        .from('series')
        .insert([{
          title: title,
          slug: slug,
          creator_name: creator,
          synopsis: synopsis,
          cover_url: coverUrl,
          logo_url: logoUrl
        }]);

      if (error) throw error;

      // Success! Clear the form back to empty
      alert("Series successfully uploaded to the Vault!");
      setTitle('');
      setCreator('');
      setSynopsis('');
      setCoverFile(null);
      setLogoFile(null);

    } catch (err: any) {
      console.error("Error uploading series:", err.message);
      alert("Something went wrong during upload. Check the console.");
    } finally {
      setIsUploading(false);
    }
  };

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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#fe9a00]" 
                placeholder="e.g. Bully Eater" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Author / Creator</label>
              <input 
                type="text" 
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#fe9a00]" 
                placeholder="e.g. Raymond Brown" 
              />
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">Synopsis</label>
            <textarea 
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
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
                onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-[#fe9a00] hover:file:bg-zinc-700 cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">Transparent Logo</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-[#fe9a00] hover:file:bg-zinc-700 cursor-pointer" 
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={isUploading}
            className={`w-full text-black font-black text-lg py-4 rounded uppercase tracking-widest transition-colors mt-8 ${
              isUploading ? 'bg-zinc-600 cursor-not-allowed' : 'bg-[#fe9a00] hover:bg-orange-500'
            }`}
          >
            {isUploading ? 'Uploading Data...' : 'Upload to Vault'}
          </button>
        </form>
      </div>
    </div>
  );
};