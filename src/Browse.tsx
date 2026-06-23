import { useState, useMemo, useEffect } from 'react';
import { useSeriesData } from './userSeriesData';
import { supabase } from './supabase';
import { Search, Library, BookOpen } from 'lucide-react';

const Browse = ({ onNavigate }: any) => {
  const { seriesList = [] } = useSeriesData();
  const [magazines, setMagazines] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('series'); 
  
  const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

  // --- NEW: Fetch Magazines Directly from Supabase ---
  useEffect(() => {
    const fetchMagazines = async () => {
      const { data } = await supabase
        .from('magazines')
        .select('*')
        .order('publish_date', { ascending: false }); // Sort newest first automatically
      
      if (data) setMagazines(data);
    };
    fetchMagazines();
  }, []);

  // Sort Series A-Z
  const sortedSeries = useMemo(() => {
    const filtered = seriesList.filter((s: any) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [seriesList, searchQuery]);

  // Filter Magazines by Search (sorting is handled by the initial Supabase fetch!)
  const sortedMagazines = useMemo(() => {
    return magazines.filter((m: any) =>
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [magazines, searchQuery]);

  // Determine what we are currently displaying based on the active tab
  const activeData = activeTab === 'series' ? sortedSeries : sortedMagazines;

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative px-4 pt-6">
      
      {/* Fixed Header & Search */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md pb-2 pt-2 mb-4">
        <div className="flex justify-between items-end mb-4">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            The Vault
          </h1>
          <div className="flex items-center gap-2 text-zinc-500">
            {activeTab === 'series' ? <Library className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {activeData.length} {activeTab === 'series' ? 'Series' : 'Issues'}
            </span>
          </div>
        </div>

        <div className="relative w-full mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'series' ? 'series' : 'issues'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#fe9a00] transition-colors shadow-inner"
          />
        </div>

        {/* Top Tabs */}
        <div className="flex gap-6 border-b border-zinc-800 px-1">
          <button 
            onClick={() => { setActiveTab('series'); setSearchQuery(''); }}
            className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'series' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Series
            {activeTab === 'series' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe9a00]" />}
          </button>
          <button 
            onClick={() => { setActiveTab('magazines'); setSearchQuery(''); }}
            className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'magazines' ? 'text-[#fe9a00]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Issues
            {activeTab === 'magazines' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe9a00]" />}
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {activeData.length === 0 ? (
        <div className="text-center text-zinc-500 py-16 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-800 rounded-xl mt-8">
          No {activeTab} found matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
          {activeData.map((item: any) => (
            <div 
              key={item.id} 
              className="flex-shrink-0 cursor-pointer group/card"
              onClick={() => onNavigate(item)}
            >
              {activeTab === 'series' ? (
                // --- SERIES CARD LAYOUT ---
                <div className="relative overflow-hidden rounded-lg aspect-[2/3] bg-zinc-900 border border-zinc-800 shadow-lg group-hover/card:border-[#fe9a00]/50 transition-colors duration-300 mb-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black z-0" />
                  <img 
                    src={item.character_url || item.cover_url} 
                    alt={`${item.title} Character`} 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none h-[120%] object-contain object-bottom transform transition-transform duration-500 ease-out group-hover/card:scale-[1.15] z-10 translate-y-4"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/90 to-transparent z-20" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-3">
                    <img 
                      src={item.logo_url || (item.title === 'Apple Black' ? `${CLOUDFLARE_BASE_URL}/series-logos/apple-black-logo.png` : '')} 
                      alt={`${item.title} Logo`} 
                      className="w-full max-h-24 object-contain transform transition-transform duration-300 group-hover/card:-translate-y-1" 
                    />
                  </div>
                </div>
              ) : (
                // --- MAGAZINE CARD LAYOUT ---
                <div className="relative overflow-hidden rounded-lg aspect-[3/4] bg-zinc-900 border border-zinc-800 shadow-lg group-hover/card:border-[#fe9a00]/50 transition-colors duration-300 mb-2">
                  <img 
                    src={item.cover_url} 
                    alt={item.title} 
                    className="w-full h-full object-cover transform transition-transform duration-500 ease-out group-hover/card:scale-105"
                  />
                </div>
              )}
              
              {/* Title & Creator / Date Info */}
              <div className="px-1 text-left">
                <h3 className="text-white font-bold text-xs truncate tracking-wide group-hover/card:text-[#fe9a00] transition-colors">
                  {item.title}
                </h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                  {activeTab === 'series' 
                    ? (item.creator_name || 'Saturday AM') 
                    : (item.publish_date ? new Date(item.publish_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Magazine Issue')
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;