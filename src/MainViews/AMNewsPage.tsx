import React, { useState, useEffect } from 'react';
import { ExternalLink, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

export const AMNewsPage = ({ onBack }: any) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ANTI-ABUSE FANDOM POINTS LOGIC ---
  useEffect(() => {
    const awardNewsPoints = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Visitors can read news, but don't get points

        // Check local storage to see if they already got points today
        const today = new Date().toDateString();
        const storageKey = `am_news_check_${user.id}`;
        const lastCheck = localStorage.getItem(storageKey);

        if (lastCheck === today) return; // Rate-limit: Once per day

        // Fetch their current checks count
        const { data: profile } = await supabase
          .from('profiles')
          .select('news_checks')
          .eq('id', user.id)
          .single();

        const currentChecks = profile?.news_checks || 0;

        // Give them a point and lock it for the day!
        await supabase
          .from('profiles')
          .update({ news_checks: currentChecks + 1 })
          .eq('id', user.id);

        localStorage.setItem(storageKey, today);
      } catch (err) {
        console.error("Silent error awarding news points:", err);
      }
    };

    awardNewsPoints();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPosts = async () => {
      try {
        const res = await fetch('https://www.saturday-am.com/wp-json/wp/v2/posts?per_page=12&_embed');
        if (!res.ok) throw new Error('Failed to fetch blog feed');
        
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error("Error fetching blog posts:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  return (
    <div className="relative min-h-screen bg-transparent text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto mt-4 sm:mt-10">
        
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 font-black uppercase tracking-widest text-[10px]">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-6 bg-black/40 backdrop-blur-sm p-4 rounded-t-2xl">
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-wider text-white drop-shadow-md flex items-center gap-4">
            <BookOpen className="w-8 h-8 text-[#fe9a00]" /> AM News
          </h2>
          <a 
            href="https://www.saturday-am.com/blog/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-[#fe9a00] hover:text-white font-black uppercase tracking-widest flex items-center gap-2 transition-colors bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-full"
          >
            Website <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 bg-black/40 backdrop-blur-sm rounded-b-2xl">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin" />
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Transmissions...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {posts.map(post => {
              const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg';
              
              return (
                <a 
                  key={post.id} 
                  href={post.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group border border-zinc-800 hover:border-[#fe9a00] transition-all shadow-lg bg-zinc-900 flex flex-col"
                >
                  <img 
                    src={imageUrl} 
                    alt="Blog Thumbnail" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-5 z-10">
                    <h3 
                      className="text-white font-black uppercase text-sm md:text-base leading-tight line-clamp-3 drop-shadow-md group-hover:text-[#fe9a00] transition-colors" 
                      dangerouslySetInnerHTML={{ __html: post.title?.rendered }} 
                    />
                    <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-3 border-t border-zinc-800/50 pt-3">
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};