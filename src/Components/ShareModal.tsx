import React, { useState } from 'react';
import { X, Share2, Copy, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export const ShareModal = ({ isOpen, onClose, series, chapter, currentUser, targetImage }: any) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isAppShare = !series;

  // 1. Construct the base target URL (where the human goes)
  const refId = currentUser?.id ? `?ref=${currentUser.id}` : '';
  const baseTargetUrl = isAppShare 
    ? `https://saturday-am-app-v2.pages.dev/${refId}`
    : `https://saturday-am-app-v2.pages.dev/series/${series.slug}${refId}`;
  
  // 2. THE MAGIC TRICK: If sharing a panel, wrap it in our Edge Function Link!
  const finalShareUrl = targetImage 
    ? `https://saturday-am-app-v2.pages.dev/share?panel=${encodeURIComponent(targetImage)}&target=${encodeURIComponent(baseTargetUrl)}`
    : baseTargetUrl;

  const chapterText = chapter ? `Chapter ${chapter.chapter_number} of ` : '';
  const shareText = isAppShare
    ? `I'm reading the best diverse manga on the Saturday AM app! Join me here:`
    : `I'm reading ${chapterText}${series.title} on the Saturday AM app! Read it here:`;

  const encodedText = encodeURIComponent(`${shareText}\n\n${finalShareUrl}`);
  const bskyLink = `https://bsky.app/intent/compose?text=${encodedText}`;
  const threadsLink = `https://www.threads.net/intent/post?text=${encodedText}`;
  const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalShareUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${finalShareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewImage = targetImage || "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20load%20screen.jpg";

  return (
    <div className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-2xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        
        <div className="w-16 h-16 bg-[#fe9a00]/10 border border-[#fe9a00]/30 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(254,154,0,0.2)]">
          {targetImage ? <ImageIcon className="w-8 h-8 text-[#fe9a00]" /> : <Share2 className="w-8 h-8 text-[#fe9a00]" />}
        </div>
        
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
          {targetImage ? "Share Manga Panel" : "Spread the Hype"}
        </h2>
        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-6">
          {targetImage 
            ? "This panel is too epic to keep to yourself! Share it with your followers and earn massive Fandom Points." 
            : `Share this ${isAppShare ? 'app' : 'series'}! Earn Fandom Points when friends join using your link.`}
        </p>

        <div className="flex flex-col gap-3 w-full">
          
          <div className="relative w-full h-40 mb-2 rounded-xl overflow-hidden border border-zinc-800 bg-black">
            <img src={previewImage} className="w-full h-full object-contain opacity-80" alt="Link Preview" />
            <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black to-transparent pointer-events-none">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#fe9a00]">Link Preview</span>
            </div>
          </div>

          <a href={bskyLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-[#0560FF] text-white font-black uppercase tracking-widest py-3 rounded-xl hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 320 286" className="w-5 h-5 fill-current">
              <path d="M69.3642 19.1462C101.487 39.5444 142.146 80.9702 160 102.73C177.854 80.9702 218.513 39.5444 250.636 19.1462C278.435 1.50343 320 -11.9056 320 28.5283C320 48.7402 301.328 126.857 288.75 142.5C266.398 170.297 220.076 177.674 186.851 170.082C241.97 181.714 278.461 206.592 278.461 234.341C278.461 262.089 203.882 284.582 160 252.052C116.118 284.582 41.5388 262.089 41.5388 234.341C41.5388 206.592 78.0298 181.714 133.149 170.082C99.9239 177.674 53.6015 170.297 31.25 142.5C18.6723 126.857 0 48.7402 0 28.5283C0 -11.9056 41.5645 1.50343 69.3642 19.1462Z" />
            </svg>
            Bluesky (Text Link)
          </a>

          <a href={threadsLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-700 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-white hover:text-black transition-all group">
            <svg viewBox="0 0 192 192" className="w-5 h-5 fill-current text-white group-hover:text-black transition-colors">
              <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.838 116.888 137.71 107.133C137.767 106.666 137.817 106.205 137.861 105.752C138.363 105.536 138.873 105.327 139.367 105.148C146.423 102.582 153.251 100.864 158.462 100.279C160.031 100.101 161.423 99.9818 162.628 99.9079C162.83 104.708 162.775 110.155 162.152 116.313C161.264 125.042 159.043 133.155 155.611 140.354C151.042 149.948 144.174 157.986 135.405 163.955C125.795 170.496 114.475 173.918 101.996 173.918C101.272 173.918 100.548 173.91 99.8251 173.896C84.3414 173.57 71.0505 168.17 60.5284 158.423C50.2319 148.887 44.597 136.314 44.208 121.666C43.8227 107.151 48.7188 94.675 58.4871 85.086C68.0418 75.7077 81.0827 71.0664 96.9743 71.0664C97.1062 71.0664 97.2378 71.0671 97.3698 71.0681C108.319 71.1648 117.857 73.9142 125.59 79.1601C131.258 83.006 136.191 88.0838 140.234 94.2464C140.669 92.5186 141.096 90.7635 141.537 88.9883ZM98.8413 130.016C104.945 129.684 110.151 127.359 114.215 123.143C118.236 118.974 120.301 113.882 120.301 108.067C120.301 103.882 119.167 100.543 116.953 98.1481C114.858 95.882 111.895 94.6192 108.204 94.4173C108.077 94.411 107.949 94.4079 107.82 94.4079C102.946 94.4079 98.6644 96.126 95.2078 99.4795C91.6881 102.894 89.8519 107.411 89.8519 112.871C89.8519 118.243 91.6421 122.686 95.0569 126.046C95.0569 126.046 95.0583 126.047 95.0594 126.049C96.0828 127.054 97.2346 127.912 98.4907 128.583C98.6083 128.647 98.7247 128.706 98.8413 130.016Z" />
            </svg>
            Threads (Text Link)
          </a>

          <a href={fbLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-black uppercase tracking-widest py-3 rounded-xl hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook (Text Link)
          </a>
          
          <button onClick={handleCopy} className="w-full mt-2 bg-black border border-[#fe9a00] text-[#fe9a00] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-[#fe9a00] hover:text-black transition-all flex items-center justify-center gap-2">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
};