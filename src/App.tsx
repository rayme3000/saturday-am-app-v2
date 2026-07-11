import { useState, useEffect, useRef, useCallback, Suspense, lazy, memo } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Check, Image as ImageIcon, Trash2, Star, Calendar, Menu, Home, Heart, Plus, Search, ShoppingBag, User, BookOpen, Play, ArrowLeft, Bookmark, X, MoveHorizontal, MoveVertical, RotateCcw, MessageCircle, MessageCircleOff, ChevronLeft, ChevronRight, Award, Crop, Flame, ArrowUp, SkipBack, SkipForward, Settings, Shield, CreditCard, Maximize2, Save, Scissors, RefreshCw } from 'lucide-react';
import { supabase } from './supabase';
import { useSeriesData } from './userSeriesData';

// 1. Keep core UI and Modals loaded instantly
import LoginModal from './Auth/LoginModal.tsx';
import { AdminLogin } from './Auth/AdminLogin';
import { GlobalFlexCard } from './VirtualProfile/UserProfile';

// 2. Lazy Load the views that use Named Exports
const HomePage = lazy(() => import('./MainViews/HomePage').then(mod => ({ default: mod.HomePage })));
const SeriesDetailPage = lazy(() => import('./MainViews/SeriesDetailPage').then(mod => ({ default: mod.SeriesDetailPage })));
const MagazineDetailPage = lazy(() => import('./MainViews/MagazineDetailPage').then(mod => ({ default: mod.MagazineDetailPage })));
const AdminDashboard = lazy(() => import('./AmCommandCenter/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })));
const UserProfile = lazy(() => import('./VirtualProfile/UserProfile').then(mod => ({ default: mod.UserProfile })));

// 3. Lazy Load the views that use Default Exports
const SettingsPage = lazy(() => import('./MainViews/Settings.tsx'));
const BingoBook = lazy(() => import('./VirtualProfile/BingoBook'));
const Favorites = lazy(() => import('./MainViews/MyFaves.tsx'));
const Browse = lazy(() => import('./MainViews/Browse.tsx'));
// --- Cloudflare Base URL ---
const CLOUDFLARE_BASE_URL = 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev';

const FooterNav = memo(({ onNavigate }: any) => {
  const navItems = [
    { name: 'Home', icon: Home, action: () => onNavigate({ action: 'home' }), prefetch: () => import('./MainViews/HomePage').then(mod => mod.HomePage) },
    { name: 'My Faves', icon: Heart, action: () => onNavigate({ action: 'faves' }), prefetch: () => import('./MainViews/MyFaves.tsx') },
    { name: 'Browse', icon: Search, action: () => onNavigate({ action: 'browse' }), prefetch: () => import('./MainViews/Browse.tsx') },
    { name: 'AM Shop', icon: ShoppingBag, action: null, prefetch: null },
    { name: 'Profile', icon: User, action: () => onNavigate({ action: 'profile' }), prefetch: () => import('./VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#323232] border-t border-zinc-700 p-2 flex justify-around items-center z-40">
      {navItems.map((item) => (
        <button 
          key={item.name} 
          onClick={item.action} 
          onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
          onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
          className="flex flex-col items-center gap-0.5 group"
        >
          <item.icon className="w-5 h-5 text-[#fe9a00] group-hover:text-white transition-colors" />
          <span className="text-[9px] font-black text-[#fe9a00] tracking-tight group-hover:text-white transition-colors">
            {item.name}
          </span>
        </button>
      ))}
    </nav>
  );
});

const SeriesCommentsSection = ({ seriesSlug }: { seriesSlug: string }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const COMMENTS_PER_PAGE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ id: user.id, name: profile?.username || 'Reader', avatar: profile?.avatar_url || '' });
      }
    });
  }, []);

  // Fetch comments with range limits
  const fetchComments = async (pageIndex: number, isInitialLoad = false) => {
    if (!seriesSlug) return;
    if (!isInitialLoad) setIsLoadingMore(true);

    const from = pageIndex * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data } = await supabase.from('series_comments')
      .select('*')
      .eq('series_slug', seriesSlug)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      if (isInitialLoad) {
        setComments(data);
      } else {
        setComments(prev => [...prev, ...data]);
      }
      // If we got fewer comments than the limit, there are no more left in the database
      setHasMore(data.length === COMMENTS_PER_PAGE);
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (seriesSlug) {
      setPage(0);
      setHasMore(true);
      fetchComments(0, true);
    }
  }, [seriesSlug]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage);
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !currentUser || !seriesSlug) return;
    setIsSubmitting(true);
    const newComment = { series_slug: seriesSlug, user_id: currentUser.id, user_name: currentUser.name, avatar_url: currentUser.avatar, text: commentText.trim() };
    const { data, error } = await supabase.from('series_comments').insert([newComment]).select().single();
    if (!error && data) { 
      setComments([data, ...comments]); 
      setCommentText(''); 
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-900 mt-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Community <span className="text-[#fe9a00]">Discussion</span></h3>
      </div>
      <div className="flex gap-4 mb-10">
        {currentUser?.avatar ? (
       <img src={currentUser.avatar} loading="lazy" className="w-10 h-10 rounded-full border border-zinc-700 object-cover bg-zinc-900 flex-shrink-0" alt="Avatar" />
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
      
      <div className="flex flex-col gap-6 mb-8">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group animate-fade-in">
            {comment.avatar_url && !comment.avatar_url.includes('pravatar') ? (
           <img src={comment.avatar_url} loading="lazy" className="w-10 h-10 rounded-full border border-zinc-800 object-cover bg-zinc-900 flex-shrink-0" alt={comment.user_name} />
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

      {hasMore && comments.length > 0 && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={handleLoadMore} 
            disabled={isLoadingMore}
            className="border border-zinc-700 text-zinc-400 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMore ? (
               <><div className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" /> Loading...</>
            ) : (
               'Load More Comments'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const compressImage = async (file: any, maxDimension = 1200) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > height && width > maxDimension) { height *= maxDimension / width; width = maxDimension; } 
        else if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob: any) => { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp', lastModified: Date.now() })); }, 'image/webp', 0.85);
      };
    };
  });
};

const uploadToSupabase = async (file: any, folderPath: any) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  try {
    const { error } = await supabase.storage.from('saturday-am-vault').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('saturday-am-vault').getPublicUrl(filePath);
    return publicUrl;
  } catch (error: any) { alert('Error uploading file: ' + error.message); return null; }
};

const Dropzone = ({ label, subtext, height = "p-6", multiple = false, folderPath = "misc", maxDim = 1200, onUploadComplete }: any) => {
  const fileInputRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files: any) => {
    setIsUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const optimizedFile = await compressImage(files[i], maxDim);
      const url = await uploadToSupabase(optimizedFile, folderPath);
      if (url) urls.push(url);
    }
    setIsUploading(false);
    if (onUploadComplete && urls.length > 0) { multiple ? onUploadComplete(urls) : onUploadComplete(urls[0]); }
  };

  return (
    <div 
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { 
        e.preventDefault(); 
        setIsDragging(false); 
        if (e.dataTransfer.files.length) {
          // Take a static snapshot of dropped files
          const filesArray = Array.from(e.dataTransfer.files);
          processFiles(filesArray); 
        } 
      }}
      className={`w-full bg-black border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${height} ${isDragging ? 'border-[#fe9a00] bg-[#fe9a00]/10' : 'border-zinc-700 hover:border-[#fe9a00]'} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        multiple={multiple} 
        onChange={(e: any) => { 
          if (e.target.files.length) {
            // Take a static snapshot of clicked files before clearing the input
            const filesArray = Array.from(e.target.files);
            processFiles(filesArray);
            e.target.value = null; 
          }
        }} 
      />
      {isUploading ? (
        <span className="font-bold text-[#fe9a00] text-xs animate-pulse">OPTIMIZING & UPLOADING...</span>
      ) : (
        <>
          <span className="font-bold text-zinc-400 text-xs transition-colors hover:text-[#fe9a00]">{label}</span>
          {subtext && <span className="text-zinc-600 text-[10px] mt-1 text-center group-hover:text-[#fe9a00]/70">{subtext}</span>}
        </>
      )}
    </div>
  );
};

// --- CROPPER ENGINE ---
const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
  const image = new Image();
  image.crossOrigin = "anonymous"; 
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx?.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], "thumb.webp", { type: "image/webp" }));
    }, 'image/webp', 0.85);
  });
};

const ThumbnailCropperModal = ({ imageUrl, onCropComplete, onCancel }: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedFile: any = await getCroppedImg(imageUrl, croppedAreaPixels);
      const publicUrl = await uploadToSupabase(croppedFile, 'chapter-thumbnails');
      if (publicUrl) onCropComplete(publicUrl);
    } catch(e) {
      alert("Cropping failed. Please try again.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg mb-4 flex justify-between items-center">
         <h3 className="text-white font-black text-lg tracking-widest uppercase">Crop Thumbnail</h3>
         <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
      </div>
      
      <div className="relative w-full max-w-lg aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden">
         <Cropper
           image={imageUrl}
           crop={crop}
           zoom={zoom}
           aspect={1}
           onCropChange={setCrop}
           onCropComplete={(area, areaPixels) => setCroppedAreaPixels(areaPixels)}
           onZoomChange={setZoom}
         />
      </div>

      <div className="w-full max-w-lg mt-6 space-y-6">
         <input 
           type="range" 
           min={1} max={3} step={0.1} 
           value={zoom} 
           onChange={(e) => setZoom(Number(e.target.value))} 
           className="w-full accent-[#fe9a00]" 
         />
         <button onClick={handleSave} disabled={isProcessing} className="w-full py-4 bg-[#fe9a00] text-black font-black tracking-widest rounded hover:bg-white transition-colors">
           {isProcessing ? 'PROCESSING & UPLOADING...' : 'SAVE CROPPED THUMBNAIL'}
         </button>
      </div>
    </div>
  );
};

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) { setIsVisible(true); } 
      else { setIsVisible(false); }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!isVisible) return null;

  return (
    <button onClick={scrollToTop} className="fixed bottom-20 right-6 z-50 p-3 bg-[#fe9a00] text-black rounded-full shadow-[0_0_15px_rgba(254,154,0,0.4)] hover:bg-white hover:scale-110 transition-all duration-300 group" aria-label="Back to top">
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};
const AccountSettings = ({ onBack }: any) => {
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto mt-4 sm:mt-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <button onClick={onBack} className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:text-[#fe9a00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider">Account Settings</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Billing & Security</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Billing Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-[#fe9a00] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Subscription & Billing
            </h3>
            <div className="bg-black border border-purple-900/50 p-4 rounded-lg mb-4 flex justify-between items-center">
               <div>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Current Plan</p>
                 <p className="text-lg font-black text-purple-400 italic uppercase">Saturday AM+ Premium</p>
               </div>
               <span className="bg-purple-900/40 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded">Active</span>
            </div>
            <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors w-full sm:w-auto">
              Manage Subscription
            </button>
          </div>

          {/* Security Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-zinc-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Login & Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" value="reader@example.com" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                <input type="password" value="********" readOnly className="w-full bg-black border border-zinc-800 rounded p-3 text-zinc-300 focus:outline-none" />
              </div>
              <div className="flex gap-4 pt-2">
                 <button className="bg-zinc-800 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors flex-1 sm:flex-none">
                   Change Password
                 </button>
                 <button className="bg-red-900/20 text-red-500 border border-red-900/50 px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-900/40 transition-colors flex-1 sm:flex-none">
                   Log Out
                 </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- NEW: HAMBURGER MENU WITH FLEX BUTTON ---
const HamburgerMenu = memo(({ isOpen, onClose, onNavigate, onOpenFlexCard }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { name: 'Browse Library', action: 'browse', prefetch: () => import('./MainViews/Browse.tsx') },
    { name: 'Edit Profile', action: 'profile', prefetch: () => import('./VirtualProfile/UserProfile').then(mod => mod.UserProfile) },
    { name: 'My Favorites', action: 'faves', prefetch: () => import('./MainViews/MyFaves.tsx') },
    { name: 'Bingo Book', action: 'bingobook', prefetch: () => import('./VirtualProfile/BingoBook') },
    { name: 'Subscription', action: 'sub', prefetch: null },
    { name: 'Settings', action: 'settings', prefetch: () => import('./MainViews/Settings.tsx') }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <span className="text-[#fe9a00] font-black uppercase tracking-widest text-xs">Menu</span>
        <button onClick={onClose} className="p-2 text-white hover:text-[#fe9a00]"><X className="w-8 h-8" /></button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-12 gap-6">
        
        {/* NEW: Dedicated Card Flex Button inside the menu */}
        <button 
          onClick={() => { onClose(); onOpenFlexCard(); }}
          className="flex items-center gap-4 bg-[#fe9a00] text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all mb-8 shadow-[0_0_20px_rgba(254,154,0,0.4)] w-max"
        >
          <CreditCard className="w-6 h-6" /> Flex AM Crew Card
        </button>

        {menuItems.map((item) => (
          <button 
            key={item.action} 
            onClick={() => { onNavigate({ action: item.action }); onClose(); }}
            onMouseEnter={item.prefetch ? () => item.prefetch!() : undefined}
            onTouchStart={item.prefetch ? () => item.prefetch!() : undefined}
            className="text-4xl font-black uppercase italic tracking-tighter text-white hover:text-[#fe9a00] text-left transition-colors"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedMagazine, setSelectedMagazine] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // System Overlays
  const [showLogin, setShowLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFlexCardOpen, setIsFlexCardOpen] = useState(false);

  useEffect(() => { 
    const timer = setTimeout(() => setShowSplash(false), 3000); 
    return () => clearTimeout(timer); 
  }, []);
  // Cached with useCallback so it doesn't break our memoized components
  const handleNavigate = useCallback((data: any) => {
    if (data.action === 'home') { setCurrentView('home'); return; }
    if (data.action === 'faves') { setCurrentView('faves'); return; }
    if (data.action === 'browse') { setCurrentView('browse'); return; }
    if (data.action === 'profile') { setCurrentView('profile'); return; }
    if (data.action === 'account') { setCurrentView('account'); return; }
    if (data.action === 'settings') { setCurrentView('settings'); return; }
    if (data.action === 'bingobook') { setCurrentView('bingobook'); return; }    
    if (data.publish_date) {
      setSelectedMagazine(data);
      setCurrentView('magazine');
    } else {
      setSelectedSeries(data);
      setCurrentView('series');
    }
  }, []); // The empty array tells React to cache this forever

  return (
    <>
      {/* THIS IS THE SPLASH SCREEN BLOCK */}
      {showSplash && (
  <div className="fixed inset-0 z-[1000] bg-white flex items-center justify-center animate-fade-out">
    <img 
      src={`${CLOUDFLARE_BASE_URL}/homepage-graphic-assets/logos/SATURDAY%20AM%20Logo.png`} 
      className="w-64" 
      alt="Logo" 
    />
  </div>
)}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Unbounded:wght@700;800;900&display=swap');
          @keyframes fade-out {
      0% { opacity: 1; }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }
    .animate-fade-out {
      animation: fade-out 3s forwards;
    }
          body { font-family: 'Plus Jakarta Sans', sans-serif; }
          h1, h2, h3, h4, h5, h6, .font-black { font-family: 'Unbounded', sans-serif !important; font-style: italic !important; letter-spacing: -0.03em !important; }
          .tracking-widest { letter-spacing: 0.15em !important; font-style: normal !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-weight: 800; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* NEW: Bulletproof 3D Flip Animation */
          .card-perspective { perspective: 1000px; }
          .card-flipper { transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
          .card-flipper.is-flipped { transform: rotateY(180deg); }
          .card-face { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
          .card-back { transform: rotateY(180deg); }
        `}
      </style>

      {/* 1. Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            window.location.reload();
          }}
        />
      )}

      {/* 2. Global Hamburger Menu */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onOpenFlexCard={() => setIsFlexCardOpen(true)}
      />

      {/* 3. Global Flex Card Overlay */}
      <GlobalFlexCard
        isOpen={isFlexCardOpen}
        onClose={() => setIsFlexCardOpen(false)}
      />

      {/* 4. Main Views (Code Split via Suspense) */}
      <Suspense fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 pb-20">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin"></div>
          <span className="text-[#fe9a00] font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Interface...</span>
        </div>
      }>
        {currentView === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onAdminAccess={() => setCurrentView('admin')}
            onLoginClick={() => setShowLogin(true)}
            onMenuToggle={() => setIsMenuOpen(true)}
          />
        )}

        {currentView === 'series' && (<SeriesDetailPage series={selectedSeries} onBack={() => { setCurrentView('home'); setSelectedSeries(null); }} />)}

        {currentView === 'magazine' && (<MagazineDetailPage magazine={selectedMagazine} onBack={() => { setCurrentView('home'); setSelectedMagazine(null); }} onMagazineSelect={(newMag: any) => { setSelectedMagazine(newMag); }} />)}

        {currentView === 'admin' && (isAdminAuthenticated ? <AdminDashboard onBack={() => setCurrentView('home')} Dropzone={Dropzone} ThumbnailCropperModal={ThumbnailCropperModal} /> : <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} onBack={() => setCurrentView('home')} />)}

        {currentView === 'profile' && (<UserProfile onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />)}

        {currentView === 'settings' && (
          <SettingsPage 
            onBack={() => setCurrentView('home')} 
            onSignOut={() => { setCurrentView('home'); }} 
          />
        )}
        
        {currentView === 'bingobook' && (<BingoBook onBack={() => setCurrentView('home')} />)}

        {currentView === 'faves' && (<Favorites setActiveTab={setCurrentView} />)}

        {currentView === 'browse' && (<Browse onNavigate={handleNavigate} />)}
      </Suspense>

      {/* 5. Global Footer */}
      {['home', 'faves', 'browse', 'profile'].includes(currentView) && (
        <FooterNav onNavigate={handleNavigate} />
      )}

      <ScrollToTopButton />
    </>
  );
}