import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, ExternalLink } from 'lucide-react';

export const Shop = ({ onBack }: any) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProducts = async () => {
      try {
        const res = await fetch('https://shopsaturdayam.com/products.json?limit=24');
        if (!res.ok) throw new Error('Failed to fetch store feed');
        
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error("Error fetching shop products:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative pb-24 font-sans">
      
      {/* GLOBAL BACKDROP */}
      <div className="fixed inset-0 z-[0] pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
      </div>

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <button onClick={onBack} className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] drop-shadow-md flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#fe9a00]" />
            AM Shop
          </h1>
        </div>

        <a 
          href="https://shopsaturdayam.com/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] text-white hover:text-[#fe9a00] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors bg-zinc-900 border border-zinc-700 px-5 py-3 rounded-full hover:border-[#fe9a00] shadow-lg mb-1 w-full sm:w-auto"
        >
          View Full Store <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* PRODUCT GRID */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 bg-zinc-900/40 backdrop-blur-sm rounded-3xl border border-zinc-800">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#fe9a00] rounded-full animate-spin" />
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Inventory...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => {
              const imageUrl = product.images?.[0]?.src || 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg';
              const price = product.variants?.[0]?.price || '0.00';
              const category = product.product_type || 'Merch';

              return (
                <a 
                  key={product.id} 
                  href={`https://shopsaturdayam.com/products/${product.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-[#fe9a00] transition-all shadow-lg flex flex-col"
                >
                  <div className="aspect-square bg-white relative p-4 flex items-center justify-center overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 drop-shadow-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                      <span className="bg-[#fe9a00] text-black font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
                        Buy Now <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 bg-zinc-950">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{category}</p>
                    <h3 className="text-sm font-bold text-white mb-4 leading-snug line-clamp-2 group-hover:text-[#fe9a00] transition-colors">{product.title}</h3>
                    <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-3">
                      <span className="text-lg font-black italic text-[#fe9a00]">${price}</span>
                    </div>
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