import { useEffect } from 'react';
import { supabase } from '../supabase';

export const useIntegrations = () => {
  useEffect(() => {
    const initTracking = async () => {
      // Fetch the tracking keys from your Supabase settings table
      const { data, error } = await supabase
        .from('app_settings')
        .select('google_analytics_id, meta_pixel_id, tiktok_pixel_id')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) return;

      // 1. Initialize Google Analytics (G-Tag)
      if (data.google_analytics_id && !document.getElementById('ga-script')) {
        const gaScript = document.createElement('script');
        gaScript.id = 'ga-script';
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${data.google_analytics_id}`;
        document.head.appendChild(gaScript);

        const gaInline = document.createElement('script');
        gaInline.id = 'ga-inline';
        gaInline.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${data.google_analytics_id}');
        `;
        document.head.appendChild(gaInline);
      }

      // 2. Initialize Meta (Facebook) Pixel
      if (data.meta_pixel_id && !document.getElementById('meta-pixel')) {
        const metaScript = document.createElement('script');
        metaScript.id = 'meta-pixel';
        metaScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${data.meta_pixel_id}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(metaScript);
      }

      // 3. Initialize TikTok Pixel
      if (data.tiktok_pixel_id && !document.getElementById('tiktok-pixel')) {
        const ttScript = document.createElement('script');
        ttScript.id = 'tiktok-pixel';
        ttScript.innerHTML = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${data.tiktok_pixel_id}');
            ttq.page();
          }(window, document, 'ttq');
        `;
        document.head.appendChild(ttScript);
      }
    };

    initTracking();
  }, []);
};