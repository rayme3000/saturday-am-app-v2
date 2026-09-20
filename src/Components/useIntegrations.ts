import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export const useIntegrations = () => {
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent it from running twice in React Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    const initTracking = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('google_analytics_id, meta_pixel_id, tiktok_pixel_id')
          .eq('id', 1)
          .maybeSingle();

        if (error || !data) return;

        // --- 1. GOOGLE ANALYTICS ---
        if (data.google_analytics_id) {
          const gaId = data.google_analytics_id.trim();
          
          // Inject external GA script
          const gaScript = document.createElement('script');
          gaScript.async = true;
          gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          document.head.appendChild(gaScript);

          // Inject inline configuration
          const gaInit = document.createElement('script');
          gaInit.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `;
          document.head.appendChild(gaInit);
        }

        // --- 2. META (FACEBOOK) PIXEL ---
        if (data.meta_pixel_id) {
          const fbId = data.meta_pixel_id.trim();
          
          const fbScript = document.createElement('script');
          fbScript.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbId}');
            fbq('track', 'PageView');
          `;
          document.head.appendChild(fbScript);
        }

        // --- 3. TIKTOK PIXEL ---
        if (data.tiktok_pixel_id) {
          const ttId = data.tiktok_pixel_id.trim();
          
          const ttScript = document.createElement('script');
          ttScript.innerHTML = `
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${ttId}');
              ttq.page();
            }(window, document, 'ttq');
          `;
          document.head.appendChild(ttScript);
        }

      } catch (err) {
        console.error("Error loading third-party integrations:", err);
      }
    };

    initTracking();
  }, []);
};