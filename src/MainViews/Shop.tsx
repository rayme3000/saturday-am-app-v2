import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, ExternalLink, PackageX } from 'lucide-react';
import { supabase, trackTelemetry } from '../supabase';

const HYPE_FLAME_URL = "https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png";
const DEFAULT_SHOPIFY_DOMAIN = "shopsaturdayam.com";

export const Shop = ({ onBack }: any) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState<string>(DEFAULT_SHOPIFY_DOMAIN);

  useEffect(() => {
    window.scrollTo(0, 0);
    trackTelemetry('shop_visit', {});

    const initShop = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('shopify_domain')
          .eq('id', 1)
          .maybeSingle();

        const rawDomain = data?.shopify_domain || DEFAULT_SHOPIFY_DOMAIN;
        const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        setShopDomain(cleanDomain);

        const res = await fetch(`https://${cleanDomain}/products.json?limit=24`);
        if (!res.ok) throw new Error('Failed to fetch store feed');

        const storeData = await res.json();
        setProducts(Array.isArray(storeData?.products) ? storeData.products : []);
      } catch (err) {
        console.error("Error fetching shop products:", err);
      } finally {
        setLoading(false);
      }
    };

    initShop();
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white relative pb-28 font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl px-4 sm:px-6 pt-6 pb-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shadow-xl">
        <div>
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#fe9a00] drop-shadow-md flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#fe9a00]" />
            AM Shop
          </h1>
        </div>

        {shopDomain && (
          <a
            href={`https://${shopDomain}?utm_source=saturday_am_app&utm_medium=in_app_shop`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-white hover:text-[#fe9a00] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors bg-zinc-900 border border-zinc-700 px-5 py-3 rounded-full hover:border-[#fe9a00] shadow-lg mb-1 w-full sm:w-auto"
          >
            View Full Store <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* PRODUCT GRID OR PLACEHOLDER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 sm:py-36 gap-5 bg-zinc-950/80 rounded-3xl border border-zinc-800">
            <div className="relative flex items-center justify-center animate-hype-glow">
              <img
                src={HYPE_FLAME_URL}
                alt="Saturday AM Loading"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                style={{ filter: 'url(#hype-flame-color)' }}
              />
            </div>
            <span className="text-zinc-500 font-black tracking-widest text-xs uppercase animate-pulse">
              Loading Inventory...
            </span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-6 bg-zinc-950/80 rounded-3xl border border-zinc-800 text-center px-4">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-zinc-800 shadow-[0_0_30px_rgba(254,154,0,0.1)]">
              <PackageX className="w-10 h-10 text-zinc-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
                Visit Official Store
              </h2>
              <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase max-w-sm mx-auto mb-6">
                Browse official Saturday AM graphic novels, apparel, and collectibles directly on our store!
              </p>
              <a
                href={`https://${shopDomain}?utm_source=saturday_am_app&utm_medium=in_app_shop`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#fe9a00] hover:bg-white text-black font-black uppercase tracking-widest text-xs px-8 py-4 rounded-full transition-colors shadow-[0_0_20px_rgba(254,154,0,0.3)]"
              >
                Open Saturday AM Shop <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => {
              const imageUrl =
                product.images?.[0]?.src ||
                'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/assets/placeholder-thumb.jpg';
              const price = product.variants?.[0]?.price || '0.00';
              const category = product.product_type || 'Merch';

              return (
                <a
                  key={product.id}
                  href={`https://${shopDomain}/products/${product.handle}?utm_source=saturday_am_app&utm_medium=in_app_shop`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-[#fe9a00] transition-all shadow-lg flex flex-col"
                >
                  <div className="aspect-square bg-white relative p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={product.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 drop-shadow-xl"
                    />
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-[#fe9a00] text-black font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
                        Buy Now <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 bg-zinc-950">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                      {category}
                    </p>
                    <h3 className="text-sm font-bold text-white mb-4 leading-snug line-clamp-2 group-hover:text-[#fe9a00] transition-colors">
                      {product.title}
                    </h3>
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

export default Shop;