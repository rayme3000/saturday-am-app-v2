import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, X, Flag, User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { cleanText } from '../profanityFilter';
import { APP_ICONS } from '../appIcons';

// --- 1. THE LOGIC HOOK ---
export const useQuickReacts = (chapterId: string, currentPage: number, currentUser: any) => {
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [reportedReacts, setReportedReacts] = useState<number[]>([]);
  const [showAllReacts, setShowAllReacts] = useState(false);
  const [isReactInputOpen, setIsReactInputOpen] = useState(false);
  const [reactText, setReactText] = useState('');
  const [activeCommentIndex, setActiveCommentIndex] = useState(0);
  
  // Toast Notification State
  const [toastConfig, setToastConfig] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  // Fetch initial reacts
  useEffect(() => {
    if (!chapterId) return;
    const fetchReacts = async () => {
      const { data } = await supabase.from('page_reacts').select('*').eq('chapter_id', chapterId).order('created_at', { ascending: true });
      if (data) setLocalComments(data.map((r: any) => ({ id: r.id, pageIndex: r.page_index, user: r.user_name, avatar: r.avatar_url, text: r.text })));
    };
    fetchReacts();
  }, [chapterId]);

  // Cycle visible comments on the current page
  const visibleComments = useMemo(() => localComments.filter(c => c.pageIndex === currentPage), [localComments, currentPage]);
  useEffect(() => {
    if (visibleComments.length <= 1) return;
    const interval = setInterval(() => { setActiveCommentIndex((prev) => (prev + 1) % visibleComments.length); }, 3500);
    return () => clearInterval(interval);
  }, [visibleComments.length, currentPage]);
  useEffect(() => { setActiveCommentIndex(visibleComments.length > 0 ? visibleComments.length - 1 : 0); }, [currentPage, localComments.length]);

  // Auto-dismiss the toast notification after 3 seconds
  useEffect(() => {
    if (toastConfig) {
      const timer = setTimeout(() => setToastConfig(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastConfig]);

  const submitReact = async () => {
    if (!reactText.trim() || !currentUser || !chapterId) return;
    const safeText = cleanText(reactText.trim());
    const newReactPayload = { chapter_id: chapterId, page_index: currentPage, user_id: currentUser.id, user_name: currentUser.name, avatar_url: currentUser.avatar, text: safeText };
    const tempId = Date.now();
    setLocalComments(prev => [...prev, { id: tempId, pageIndex: currentPage, user: currentUser.name, avatar: currentUser.avatar, text: safeText }]);
    setReactText('');
    setIsReactInputOpen(false);

    try {
      const { data } = await supabase.from('page_reacts').insert([newReactPayload]).select().single();
      if (data) setLocalComments(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c));
      const { data: profile } = await supabase.from('profiles').select('quick_reacts').eq('id', currentUser.id).single();
      if (profile) {
        await supabase.from('profiles').update({ quick_reacts: (profile.quick_reacts || 0) + 1 }).eq('id', currentUser.id);
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (err) { console.error(err); }
  };

  const reportReact = async (reactId: any) => {
    if (!currentUser) { 
      alert("Please log in to report content."); 
      return; 
    }
    
    // Explicitly cast to Number to match the BIGINT database column
    const numId = Number(reactId);
    if (reportedReacts.includes(numId)) return;
    
    // Instantly update UI to feel snappy
    setReportedReacts(prev => [...prev, numId]);

    try {
      // Connect to the final RPC function
      const { error } = await supabase.rpc('submit_quick_react_report', { target_react_id: numId });
      
      if (error) {
        console.error("Supabase RPC Error:", error);
        throw error;
      }
      
      setToastConfig({ message: 'Report submitted successfully.', type: 'success' });
    } catch (err: any) {
      console.error("Failed to report react:", err);
      // Revert the button if the server call fails
      setReportedReacts(prev => prev.filter(id => id !== numId));
      
      // Print the exact database error so we can read it on the screen!
      setToastConfig({ 
        message: `Failed: ${err.message || 'Check SQL snippet.'}`, 
        type: 'error' 
      });
    }
  };

  return { localComments, reportedReacts, showAllReacts, setShowAllReacts, isReactInputOpen, setIsReactInputOpen, reactText, setReactText, submitReact, reportReact, activeCommentIndex, visibleComments, toastConfig };
};

// --- 2. IN-APP TOAST COMPONENT ---
export const QuickReactToast = ({ toastConfig }: any) => {
  if (!toastConfig) return null;
  return (
    <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[6000] bg-black border border-zinc-700 text-white px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-fade-in pointer-events-none">
      {toastConfig.type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-500" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest">{toastConfig.message}</span>
    </div>
  );
};

// --- 3. TIMELINE COMPONENT (Avatars & Active Comments) ---
export const QuickReactTimeline = ({ mode, localComments, maxPage, currentPage, activeCommentIndex, onOpenDrawer }: any) => {
  const timelineComments = useMemo(() => localComments.slice(-25), [localComments]);
  const visibleComments = useMemo(() => localComments.filter((c: any) => c.pageIndex === currentPage), [localComments, currentPage]);
  const activeComment = visibleComments[activeCommentIndex];

  return (
    <>
      {timelineComments.map((comment: any) => (
        <div 
          key={comment.id}
          onClick={(e) => { e.stopPropagation(); onOpenDrawer(); }}
          className="absolute pointer-events-auto cursor-pointer transition-transform hover:scale-125 drop-shadow-md z-[100]"
          style={mode === 'vertical' 
            ? { top: `${(comment.pageIndex / maxPage) * 100}%`, left: '50%', transform: 'translate(-50%, -50%)', zIndex: comment.pageIndex === currentPage ? 100 : 5 } 
            : { left: `${(comment.pageIndex / maxPage) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', zIndex: comment.pageIndex === currentPage ? 100 : 5 }
          }
        >
          {comment.avatar && !comment.avatar.includes('pravatar') ? (
            <img src={comment.avatar} className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`} alt="" />
          ) : (
            <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-zinc-800/90 flex items-center justify-center shadow-lg transition-all ${comment.pageIndex === currentPage ? 'border-2 border-[#fe9a00] scale-125 opacity-100' : 'opacity-50 grayscale-[50%]'}`}>
              <User className="w-2 h-2 sm:w-3 sm:h-3 text-zinc-400" />
            </div>
          )}
        </div>
      ))}

      {activeComment && (
        <div 
          key={`active_${activeComment.id}`} 
          onClick={(e) => { e.stopPropagation(); onOpenDrawer(); }}
          className={`absolute pointer-events-auto cursor-pointer z-[110] ${mode === 'vertical' ? 'left-full ml-3 sm:ml-4' : 'bottom-full mb-3 sm:mb-4'}`}
          style={mode === 'vertical' ? { top: `${(currentPage / maxPage) * 100}%`, transform: 'translateY(-50%)' } : { left: `${(currentPage / maxPage) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className={`animate-slide-${mode === 'vertical' ? 'right' : 'up'}-fade flex ${mode === 'vertical' ? 'items-center' : 'flex-col items-center'}`}>
            {mode === 'vertical' && <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-black/70 -mr-[1px]" />}
            <div className="bg-black/70 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-2xl max-w-[180px] sm:max-w-[250px] border border-white/5 flex flex-col items-start hover:border-[#fe9a00]/50 transition-colors">
              <span className="text-[#fe9a00] font-semibold uppercase text-[8px] mb-0.5 w-full truncate">
                {activeComment.user.length > 15 ? `${activeComment.user.slice(0, 15)}...` : activeComment.user}
              </span>
              <span className="text-[10px] sm:text-[11px] leading-tight break-words text-left whitespace-normal">
                {activeComment.text}
              </span>
            </div>
            {mode === 'horizontal' && <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-black/70 -mt-[1px]" />}
          </div>
        </div>
      )}
    </>
  );
};

// --- 4. DRAWER MODAL ---
export const QuickReactDrawer = ({ showAllReacts, setShowAllReacts, localComments, setCurrentPage, handleReportReact, reportedReacts }: any) => {
  if (!showAllReacts) return null;
  return (
    <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 animate-fade-in pointer-events-auto" onClick={() => setShowAllReacts(false)}>
      <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-md h-[70vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-black/50">
          <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#fe9a00]" /> All Quick Reacts
          </h3>
          <button onClick={() => setShowAllReacts(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-12">
          {localComments.length === 0 ? (
             <div className="flex flex-col items-center justify-center mt-20 text-center">
               <MessageSquare className="w-10 h-10 text-zinc-700 mb-3" />
               <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">No reacts on this chapter yet.</p>
             </div>
          ) : (
             localComments.map((react: any) => (
               <div key={react.id} className="bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex gap-3 transition-colors">
                  <img src={react.avatar || 'https://i.pravatar.cc/150'} alt="avatar" className="w-10 h-10 rounded-full object-cover shadow-md" />
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[#fe9a00] text-[10px] font-black uppercase tracking-widest truncate pr-2">{react.user}</span>
                       <button 
                         onClick={() => { setCurrentPage(react.pageIndex); setShowAllReacts(false); }}
                         className="text-zinc-400 hover:text-white text-[9px] font-black tracking-widest uppercase whitespace-nowrap bg-zinc-800 px-2 py-1 rounded transition-colors"
                         title="Jump to Page"
                       >
                         Pg {react.pageIndex + 1}
                       </button>
                     </div>
                     <p className="text-zinc-300 text-xs break-words leading-relaxed">{react.text}</p>
                     <div className="flex justify-end mt-3">
                       <button 
                         onClick={() => handleReportReact(react.id)} 
                         disabled={reportedReacts.includes(Number(react.id))} 
                         className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${reportedReacts.includes(Number(react.id)) ? 'text-red-500/50' : 'text-zinc-500 hover:text-red-500'}`}
                       >
                         <Flag className="w-3 h-3" /> {reportedReacts.includes(Number(react.id)) ? 'Reported' : 'Report'}
                       </button>
                     </div>
                  </div>
               </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- 5. TOGGLE BUTTON ---
export const QuickReactToggleButton = ({ isReactInputOpen, setIsReactInputOpen }: any) => (
  <button onClick={() => setIsReactInputOpen(!isReactInputOpen)} className={`p-2.5 sm:p-3 flex items-center justify-center rounded-full transition-colors shadow-xl border border-white/5 ${isReactInputOpen ? 'bg-zinc-800' : 'bg-black/40 backdrop-blur-md hover:bg-black/60'}`} title="Add React">
    <img src={APP_ICONS.QUICK_REACT} alt="Quick React" className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-md" />
  </button>
);

// --- 6. VIEW ALL BUTTON ---
export const QuickReactViewAllButton = ({ setShowAllReacts }: any) => (
  <button onClick={() => setShowAllReacts(true)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/5 shadow-lg rounded-full transition-colors text-white/70 hover:text-white hover:bg-black/60" title="View All Reacts">
    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
  </button>
);

// --- 7. INPUT OVERLAY ---
export const QuickReactInputOverlay = ({ isReactInputOpen, setIsReactInputOpen, reactText, setReactText, submitReact, isPremium, onNavigate }: any) => {
  if (!isReactInputOpen) return null;
  return (
    <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl animate-fade-in pointer-events-auto">
      {isPremium ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-2 pt-1 pb-1 sm:pb-2 border-b border-white/10">
            <span className="text-[9px] sm:text-[10px] font-black text-[#fe9a00] uppercase tracking-widest">Quick React</span>
            <button onClick={() => setIsReactInputOpen(false)} className="text-white/50 hover:text-white"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              maxLength={30}
              value={reactText}
              onChange={(e) => setReactText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitReact(); }}
              placeholder="Drop a react..."
              className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-xs px-3 py-2 sm:py-2.5 rounded-xl flex-1 focus:outline-none focus:border-[#fe9a00]"
            />
            <button onClick={submitReact} disabled={!reactText.trim()} className="bg-[#fe9a00] text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50">
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-3 py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#fe9a00]" />
            <div className="flex flex-col">
              <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[9px] sm:text-xs">Subscriber Exclusive</span>
              <span className="text-white/70 text-[8px] sm:text-[9px] font-bold tracking-widest">Join to drop hype directly on the page!</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full mt-1">
            <button onClick={() => setIsReactInputOpen(false)} className="flex-1 bg-white/10 text-white px-3 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase hover:bg-white/20 transition-colors">Cancel</button>
            <button 
              onClick={() => { setIsReactInputOpen(false); if (onNavigate) onNavigate({ action: 'sub' }); }} 
              className="flex-[2] bg-[#fe9a00] text-black px-3 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_15px_rgba(254,154,0,0.3)]"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};