import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Flame, Bookmark, Play, ArrowUp, User, MessageCircle, Heart } from 'lucide-react';
import { supabase } from '../supabase';
import { MangaReader } from './MangaReader';

const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const SeriesCommentsSection = ({ seriesSlug }: { seriesSlug: string }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || '' });
      }
    });

    if (seriesSlug) {
      supabase.from('series_comments')
        .select('*')
        .eq('series_slug', seriesSlug)
        .order('created_at', { ascending: false }) 
        .then(({ data }) => { if (data) setComments(data); });
    }
  }, [seriesSlug]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !currentUser || !seriesSlug) return;
    setIsSubmitting(true);
    const newComment = { series_slug: seriesSlug, user_id: currentUser.id, user_name: currentUser.name, avatar_url: currentUser.avatar, text: commentText.trim() };
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { setComments([data, ...comments]); setCommentText(''); }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{comments.length} Comments</span>
      </div>
      <div className="flex gap-4 mb-10">
        {currentUser?.avatar ? (
       <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-zinc-700 object-cover bg-zinc-900 flex-shrink-0" alt="Avatar" />
     ) : (
       <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center flex-shrink-0">
         <User className="w-5 h-5 text-zinc-500" />
       </div>
     )}
        <div className="flex-1 flex flex-col items-end gap-2">
          <textarea
            value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!currentUser}
            placeholder={currentUser ? "What do you think of this series?" : "Please log in to join the discussion."}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#fe9a00] transition-colors resize-none h-20 disabled:opacity-50"
          />
          <button onClick={handleCommentSubmit} disabled={!commentText.trim() || !currentUser || isSubmitting} className="bg-zinc-800 text-white border border-zinc-700 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group animate-fade-in">
            {comment.avatar_url && !comment.avatar_url.includes('pravatar') ? (
           <img src={comment.avatar_url} className="w-10 h-10 rounded-full border border-zinc-800 object-cover bg-zinc-900 flex-shrink-0" alt={comment.user_name} />
         ) : (
           <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0">
             <User className="w-5 h-5 text-zinc-500" />
           </div>
         )}
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#fe9a00] font-black tracking-widest uppercase text-[10px]">{comment.user_name}</span>
                <span className="text-zinc-600 text-[8px] font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{comment.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No comments yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SeriesDetailPage = ({ series, onBack }: any) => {
  const [localSeries, setLocalSeries] = useState(series);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activePages, setActivePages] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [creators, setCreators] = useState([]);
  const [showAwards, setShowAwards] = useState(false);
  const awardTimeoutRef = useRef<any>(null);

  // FAVES STATE & FETCH LOGIC
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && localSeries) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
        
        if (data?.favorites && data.favorites.includes(localSeries.slug)) {
          setIsFavorited(true);
        }
      }
    };
    checkFavoriteStatus();
  }, [localSeries]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!series) return;
    const fetchDetails = async () => {
      try {
        const targetSlug = typeof series === 'string' ? series : series?.slug;
        if (!targetSlug) return;
        const { data: freshSeries } = await supabase.from('series').select('*').eq('slug', targetSlug).single();
        if (freshSeries) setLocalSeries(freshSeries);
        const { data: chapterData } = await supabase.from('chapters').select('*').eq('series_slug', targetSlug).eq('is_published', true).order('chapter_number', { ascending: true });
        if (chapterData) setChapters(chapterData as any);
        const { data: creatorData } = await supabase.from('series_creators').select('*').eq('series_slug', targetSlug).order('id', { ascending: true });
        if (creatorData && creatorData.length > 0) { setCreators(creatorData as any); } 
        else if (freshSeries) { setCreators([{ role: 'Creator', name: freshSeries.creator_name || 'Saturday AM', flag_code: freshSeries.flag_code || '', avatar_url: freshSeries.creator_avatar || '', bio: freshSeries.creator_bio || '', twitter_url: freshSeries.creator_twitter || '', instagram_url: freshSeries.creator_instagram || '', support_url: freshSeries.creator_support_link || '' }] as any); }
      } catch (err) { console.error("Failed to load series details:", err); }
    };
    fetchDetails();
  }, [series]);

  const totalHype = chapters.reduce((sum: number, ch: any) => sum + (ch.hype_count || 0), 0) + (localSeries?.hype_count || 0);
  const formattedHype = totalHype >= 1000 ? (totalHype / 1000).toFixed(1) + 'K' : totalHype.toString();

  const handleReadChapter = async (chapter: any) => {
    const { data } = await supabase.from('pages').select('image_url').eq('chapter_id', chapter.id).order('page_order', { ascending: true });
    if (data && data.length > 0) { setActivePages(data.map(p => p.image_url) as any); setActiveChapterId(chapter.id); setIsReaderOpen(true); } 
    else { alert("No pages found for this chapter yet!"); }
  };

  const triggerAwards = () => {
    setShowAwards(true);
    if (awardTimeoutRef.current) clearTimeout(awardTimeoutRef.current);
    awardTimeoutRef.current = setTimeout(() => { setShowAwards(false); }, 3000);
  };

  // TOGGLE FAVORITE FUNCTION
  const handleToggleFavorite = async () => {
    if (!currentUserId) {
      alert("Please log in to add series to your faves!");
      return;
    }

    const newFavoriteStatus = !isFavorited;
    setIsFavorited(newFavoriteStatus);

    try {
      const { data } = await supabase.from('profiles').select('favorites').eq('id', currentUserId).single();
      let currentFaves = data?.favorites || [];

      if (newFavoriteStatus) {
        if (!currentFaves.includes(localSeries.slug)) currentFaves.push(localSeries.slug);
      } else {
        currentFaves = currentFaves.filter((slug: string) => slug !== localSeries.slug);
      }

      const { error } = await supabase.from('profiles').update({ favorites: currentFaves }).eq('id', currentUserId);
      if (error) throw error;
      
    } catch (err) {
      console.error("Failed to update favorites:", err);
      setIsFavorited(!newFavoriteStatus);
    }
  };

  if (!localSeries) return null;

  const safeSynopsis = localSeries.synopsis || '';

  return (
    <div className="relative min-h-screen bg-black text-white">
      
      {isReaderOpen && (() => {
        const activeChapterData = chapters.find(c => c.id === activeChapterId);
        const currentIndex = chapters.findIndex(c => c.id === activeChapterId);
        const hasNext = currentIndex > -1 && currentIndex < chapters.length - 1;
        const hasPrev = currentIndex > 0;

        return (
          <MangaReader 
            pages={activePages} 
            chapterId={activeChapterId}
            title={activeChapterData ? `Chapter ${activeChapterData.chapter_number} - ${activeChapterData.title || ''}` : ''}
            subtitle={localSeries.title}
            onClose={() => { setIsReaderOpen(false); setActiveChapterId(null); }} 
            onHome={() => { setIsReaderOpen(false); setActiveChapterId(null); onBack(); }}
            onNext={() => { if (hasNext) handleReadChapter(chapters[currentIndex + 1]); }}
            onPrev={() => { if (hasPrev) handleReadChapter(chapters[currentIndex - 1]); }}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onHypeUpdate={(chId: any, newTotal: any) => { setChapters(chapters.map(ch => ch.id === chId ? { ...ch, hype_count: newTotal } : ch)); }}
          />
        );
      })()}

      <div className="sticky top-0 left-0 w-full h-[50vh] sm:h-[60vh] z-0 overflow-hidden bg-black">
        <img src={localSeries.cover_url} className="w-full h-full object-cover opacity-60" alt="Hero Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"><ArrowLeft className="w-6 h-6" /></button>
      </div>

      <div className="relative z-10 bg-black min-h-screen w-full [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
        <div className="px-6 pt-8 flex flex-col items-center w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            {localSeries.logo_url && <img src={localSeries.logo_url} alt="Logo" className="w-full max-w-[280px] sm:max-w-[350px] h-auto object-contain drop-shadow-2xl" />}
            {localSeries.has_awards && localSeries.awards && (
              <div className="relative flex items-center cursor-pointer" onMouseEnter={() => setShowAwards(true)} onMouseLeave={() => setShowAwards(false)} onClick={triggerAwards}>
                <img src={`${CLOUDFLARE_BASE_URL}/series-page-graphics/award-icon.png`} alt="Award" className={`w-10 h-10 object-contain transition-all duration-200 drop-shadow-lg ${showAwards ? 'opacity-80 scale-110' : 'opacity-100'}`} />
                <div className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 w-max min-w-[120px] bg-zinc-800 border border-zinc-700 p-3 rounded shadow-2xl transition-all duration-300 pointer-events-none z-50 ${showAwards ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
                  {String(localSeries.awards || '').split(',').map((award, i) => (<p key={i} className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest whitespace-nowrap mb-1 last:mb-0">{award.trim()}</p>))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 mt-2">
            {creators.map((c: any, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">{c.role || 'Creator'}:</span><p className="text-[#fe9a00] font-bold text-sm">{c.name || 'Unknown'}</p>
                {c.flag_code && <img src={`https://flagcdn.com/${String(c.flag_code).toLowerCase()}.svg`} alt="Flag" className="w-5 h-3.5 rounded-[2px] shadow-sm opacity-90" />}
              </div>
            ))}
          </div>

          <div className="mt-6 px-2 text-center max-w-2xl">
            <p className={`text-sm text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{safeSynopsis}</p>
            {safeSynopsis.length > 150 && (<button onClick={() => setIsExpanded(!isExpanded)} className="text-[#fe9a00] font-black tracking-widest text-[10px] mt-2 uppercase hover:text-white transition-colors">{isExpanded ? '- READ LESS' : '+ READ MORE'}</button>)}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8 w-full">
            <button className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/80 px-6 py-3 rounded-full text-[#fe9a00] font-black uppercase tracking-widest hover:bg-zinc-800 hover:border-[#fe9a00] transition-all group">
              <Flame className="w-5 h-5 group-hover:fill-[#fe9a00] transition-colors" /><span>{formattedHype} HYPE</span> 
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all ${
                isFavorited 
                  ? 'bg-zinc-800 text-[#fe9a00] border border-[#fe9a00] hover:bg-zinc-900' 
                  : 'bg-[#fe9a00] text-black hover:bg-white hover:shadow-[0_0_20px_rgba(254,154,0,0.4)]'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isFavorited ? 'fill-[#fe9a00]' : ''}`} />
              <span>{isFavorited ? 'FAVORITED' : 'ADD TO FAVES'}</span>
            </button>
          </div>
        </div>

        <div className="mt-12 w-full border-b border-zinc-800 flex justify-center">
          <div className="w-full max-w-3xl flex justify-center gap-12 px-6">
            <button onClick={() => setActiveTab('chapters')} className={`pb-4 font-black uppercase tracking-widest text-xs transition-colors relative ${activeTab === 'chapters' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>CHAPTERS{activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fe9a00] rounded-t-sm" />}</button>
          </div>
        </div>

        <div className="mt-8 px-4 sm:px-6 pb-12 w-full max-w-3xl mx-auto">
          {chapters.map((ch: any, index: number) => {
            const mockProgress = ch.progress || (index === 0 ? 100 : index === 1 ? 50 : 0);
            const realReacts = ch.react_count || 0;

            return (
            <div key={ch.id} onClick={() => handleReadChapter(ch)} className="flex items-center gap-4 sm:gap-6 mb-4 hover:bg-zinc-900/80 p-3 sm:p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 group">
              <div className="relative overflow-hidden rounded-lg min-w-[96px] sm:min-w-[128px]">
                <img src={ch.thumbnail_url || `${CLOUDFLARE_BASE_URL}/assets/placeholder-thumb.jpg`} className="w-24 h-24 sm:w-32 sm:h-32 object-cover bg-zinc-800 transition-transform duration-500 group-hover:scale-110" alt="Thumbnail" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[10px] text-[#fe9a00] font-black tracking-widest uppercase">CHAPTER {ch.chapter_number}</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <Flame className="w-3 h-3 text-[#fe9a00] fill-[#fe9a00]/20" />
                       <span className="text-[9px] text-zinc-300 font-bold">{ch.hype_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full">
                       <MessageCircle className="w-3 h-3 text-cyan-400" />
                       <span className="text-[9px] text-zinc-300 font-bold">{realReacts}</span>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-bold text-base sm:text-lg text-white line-clamp-2 mb-2">{ch.title || `Chapter ${ch.chapter_number}`}</h3>
                
                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                   <div className="flex items-center gap-2">
                     <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#fe9a00] rounded-full transition-all duration-500" 
                         style={{ width: `${mockProgress}%` }} 
                       />
                     </div>
                     <span className="text-[10px] font-black text-zinc-500">{mockProgress}%</span>
                   </div>
                   {mockProgress === 100 && (
                     <span className="text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Complete!</span>
                   )}
                </div>

              </div>
              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-[#fe9a00] transition-colors ml-auto flex-shrink-0"><Play className="w-4 h-4 text-white group-hover:text-black transition-colors ml-1" /></div>
            </div>
          )})}
          {chapters.length === 0 && <div className="text-center py-16 text-zinc-500 font-bold tracking-widest text-xs uppercase">No chapters uploaded yet.</div>}
        </div>

        <SeriesCommentsSection seriesSlug={localSeries?.slug} />
        
        <div className="pb-24 px-6 w-full max-w-3xl mx-auto">
          <div className="border-t border-zinc-800 pt-12 flex flex-col items-center gap-16">
            {creators.map((c: any, index) => {
              const safeName = c.name || 'Creator'; const firstName = safeName.split(' ')[0];
              return (
                <div key={index} className="flex flex-col items-center text-center w-full max-w-lg bg-zinc-900/30 p-8 rounded-2xl border border-zinc-800/50">
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-700 overflow-hidden border-2 border-[#fe9a00] shadow-[0_0_15px_rgba(254,154,0,0.3)]"><img src={c.avatar_url || `${CLOUDFLARE_BASE_URL}/assets/creator-avatar.jpg`} alt={safeName} className="w-full h-full object-cover" /></div>
                    <div><h4 className="font-black text-xl sm:text-2xl tracking-tight">{firstName}</h4><p className="text-[10px] text-[#fe9a00] uppercase font-black tracking-widest mt-1">{c.role || 'Creator'}</p></div>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8">{c.bio || '...'}</p>
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {c.twitter_url && <a href={c.twitter_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Twitter</a>}
                    {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#fe9a00] transition-colors text-[10px] font-black tracking-widest uppercase bg-black px-5 py-2.5 rounded-full border border-zinc-700 hover:border-[#fe9a00]">Instagram</a>}
                  </div>
                  {c.support_url && (<button onClick={() => window.open(c.support_url, '_blank')} className="flex items-center justify-center gap-2 w-full sm:w-auto border-2 border-[#fe9a00] text-[#fe9a00] px-8 py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-[#fe9a00] hover:text-black transition-colors"><Heart className="w-4 h-4" /> Support {firstName}</button>)}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-24 border-t border-zinc-800/50 pt-12">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-full group-hover:bg-[#fe9a00] group-hover:border-[#fe9a00] transition-colors shadow-lg">
                <ArrowUp className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
              </div>
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-white transition-colors">
                Back to Top
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};