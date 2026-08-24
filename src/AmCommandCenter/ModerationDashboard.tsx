import React, { useState, useEffect } from 'react';
import { Flag, Trash2, CheckCircle, AlertTriangle, RefreshCw, MessageSquare, Zap } from 'lucide-react';
import { supabase } from '../supabase';

export const ModerationDashboard = () => {
  const [activeTab, setActiveTab] = useState<'comments' | 'reacts'>('comments');
  
  const [reportedComments, setReportedComments] = useState<any[]>([]);
  const [reportedReacts, setReportedReacts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // --- 1. FETCH GENERAL COMMENTS ---
      const { data: reports, error: reportsError } = await supabase.from('comment_reports').select('*');

      if (!reportsError && reports && reports.length > 0) {
        const reportCounts: Record<string, number> = {};
        reports.forEach((report: any) => {
          reportCounts[report.comment_id] = (reportCounts[report.comment_id] || 0) + 1;
        });

        const commentIds = Object.keys(reportCounts);
        const { data: comments } = await supabase.from('series_comments').select('*').in('id', commentIds);

        const combinedData = (comments || []).map((comment: any) => ({
          ...comment,
          report_count: reportCounts[comment.id] || 0
        })).sort((a, b) => b.report_count - a.report_count);

        setReportedComments(combinedData);
      } else {
        setReportedComments([]);
      }

      // --- 2. FETCH QUICK REACTS ---
      const { data: reacts, error: reactsError } = await supabase
        .from('page_reacts')
        .select('*')
        .gt('flags', 0)
        .order('flags', { ascending: false });

      if (!reactsError && reacts) {
        setReportedReacts(reacts);
      } else {
        setReportedReacts([]);
      }

    } catch (error) {
      console.error("Error fetching reported content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- GENERAL COMMENT MODERATION ---
  const handleDismissComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to dismiss all reports for this comment? It will remain visible to the public.")) return;
    setIsProcessing(commentId);
    try {
      const { error } = await supabase.from('comment_reports').delete().eq('comment_id', commentId);
      if (error) throw error;
      
      setReportedComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      console.error("Failed to dismiss reports:", error);
      alert("Error dismissing reports: " + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to permanently DELETE this comment? This cannot be undone.")) return;
    setIsProcessing(commentId);
    try {
      const { error } = await supabase.from('series_comments').delete().eq('id', commentId);
      if (error) throw error;
      
      setReportedComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      console.error("Failed to delete comment:", error);
      alert("Error deleting comment: " + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  // --- QUICK REACT MODERATION ---
  const handleDismissReact = async (reactId: any) => {
    if (!window.confirm("Dismiss all reports for this Quick React? It will remain visible.")) return;
    setIsProcessing(`react_${reactId}`);
    try {
      // Reset the flags counter to 0 so it disappears from the queue
      const { error } = await supabase.from('page_reacts').update({ flags: 0 }).eq('id', reactId);
      if (error) throw error;
      
      setReportedReacts(prev => prev.filter(r => String(r.id) !== String(reactId)));
    } catch (error: any) {
      console.error("Failed to dismiss react:", error);
      alert("Error dismissing react: " + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteReact = async (reactId: any) => {
    if (!window.confirm("Permanently DELETE this Quick React?")) return;
    setIsProcessing(`react_${reactId}`);
    try {
      const { error } = await supabase.from('page_reacts').delete().eq('id', reactId);
      if (error) throw error;
      
      setReportedReacts(prev => prev.filter(r => String(r.id) !== String(reactId)));
    } catch (error: any) {
      console.error("Failed to delete react:", error);
      alert("Error deleting react: " + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-[#fe9a00] animate-spin" />
        <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Loading Reports...</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-white w-full max-w-5xl mx-auto mt-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-widest text-white">Moderation Queue</h2>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">Review flagged community content</p>
          </div>
        </div>
        <button 
          onClick={fetchReports} 
          className="flex items-center gap-2 px-4 py-2 bg-black border border-zinc-700 rounded text-[10px] font-black uppercase tracking-widest hover:border-[#fe9a00] hover:text-[#fe9a00] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex bg-black p-1 rounded-lg mb-8 border border-zinc-800 max-w-sm">
        <button 
          onClick={() => setActiveTab('comments')} 
          className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'comments' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          <MessageSquare className="w-3 h-3" /> Discussion ({reportedComments.length})
        </button>
        <button 
          onClick={() => setActiveTab('reacts')} 
          className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'reacts' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          <Zap className="w-3 h-3" /> Quick Reacts ({reportedReacts.length})
        </button>
      </div>

      <div className="flex flex-col gap-4">
        
        {/* --- RENDER GENERAL COMMENTS --- */}
        {activeTab === 'comments' && reportedComments.map((comment) => (
          <div key={comment.id} className="bg-black border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex-1 min-w-0 pl-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                  <Flag className="w-3 h-3" /> {comment.report_count} {comment.report_count === 1 ? 'Report' : 'Reports'}
                </span>
                <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
                <span className="text-[#fe9a00] text-[10px] font-black uppercase tracking-widest truncate">
                  Series: {comment.series_slug}
                </span>
              </div>
              
              <p className="text-white text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 break-words whitespace-pre-wrap mb-3">
                "{comment.text}"
              </p>
              
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-500">Posted by:</span>
                <span className="text-white">{comment.user_name}</span>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={() => handleDismissComment(comment.id)}
                disabled={isProcessing === comment.id}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Dismiss
              </button>
              
              <button 
                onClick={() => handleDeleteComment(comment.id)}
                disabled={isProcessing === comment.id}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-900/20 border border-red-900/50 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
            
            {isProcessing === comment.id && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                <RefreshCw className="w-6 h-6 text-[#fe9a00] animate-spin" />
              </div>
            )}
          </div>
        ))}

        {/* --- RENDER QUICK REACTS --- */}
        {activeTab === 'reacts' && reportedReacts.map((react) => (
          <div key={react.id} className="bg-black border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex-1 min-w-0 pl-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                  <Flag className="w-3 h-3" /> {react.flags} {react.flags === 1 ? 'Report' : 'Reports'}
                </span>
                <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">
                  {new Date(react.created_at).toLocaleDateString()}
                </span>
                <span className="text-[#fe9a00] text-[10px] font-black uppercase tracking-widest truncate">
                  Page: {react.page_index + 1}
                </span>
              </div>
              
              <p className="text-white text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 break-words whitespace-pre-wrap mb-3">
                "{react.text}"
              </p>
              
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-500">Dropped by:</span>
                <span className="text-white">{react.user_name}</span>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={() => handleDismissReact(react.id)}
                disabled={isProcessing === `react_${react.id}`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Dismiss
              </button>
              
              <button 
                onClick={() => handleDeleteReact(react.id)}
                disabled={isProcessing === `react_${react.id}`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-900/20 border border-red-900/50 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
            
            {isProcessing === `react_${react.id}` && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                <RefreshCw className="w-6 h-6 text-[#fe9a00] animate-spin" />
              </div>
            )}
          </div>
        ))}

        {/* --- EMPTY QUEUE STATE --- */}
        {((activeTab === 'comments' && reportedComments.length === 0) || (activeTab === 'reacts' && reportedReacts.length === 0)) && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-black/20">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">All clear!</p>
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px] mt-1">No reported {activeTab} at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};