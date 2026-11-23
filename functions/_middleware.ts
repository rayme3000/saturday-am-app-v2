const SITE_ORIGIN = 'https://www.mangahype.com';
const FALLBACK_SUPABASE_URL = 'https://zcadkovymrnjpjaxvnao.supabase.co';
const DEFAULT_OG_IMAGE =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20load%20screen.jpg';

const STATIC_ASSET_REGEX =
  /\.(?:js|mjs|css|map|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|mov|txt|xml|webmanifest)$/i;

const VIEW_SEO_MAP: Record<string, { title: string; desc: string; path: string }> = {
  browse: {
    title: 'Browse Diverse Manga Series & One-Shots | Saturday AM',
    desc: 'Browse the complete Saturday AM manga vault. Read shonen action, fantasy, sci-fi, and exclusive One-Shot Wednesdays online.',
    path: '/browse'
  },
  creators: {
    title: 'Manga Creators Roster | Saturday AM Manga Hype',
    desc: 'Meet the global manga creators behind Apple Black, Clock Striker, Bully Eater, Hammer, Orisha, Oblivion Rouge, and more on Saturday AM.',
    path: '/creators'
  },
  characters: {
    title: 'Manga Character Roster & Combat Files | Saturday AM',
    desc: 'Explore official character bios, stats, and combat files from Saturday AM flagship manga series.',
    path: '/characters'
  },
  leaderboard: {
    title: 'Global Manga Hype Leaderboards | Saturday AM',
    desc: 'See the top-ranked manga series, chapters, characters, creators, and Super Fans on the Saturday AM Hype Leaderboards.',
    path: '/leaderboard'
  },
  news: {
    title: 'Saturday AM News & Manga Announcements | Manga Hype',
    desc: 'Stay updated with the latest Saturday AM manga releases, creator interviews, convention appearances, and anime/game news.',
    path: '/news'
  },
  shop: {
    title: 'AM Shop - Official Manga Volumes, Card Skins & Bundles | Saturday AM',
    desc: 'Shop official Saturday AM collector bundles, Hype Card skins, graphic novels, and apparel while supporting independent manga creators.',
    path: '/shop'
  },
  sub: {
    title: 'Saturday AM+ PLUS Membership - Read Manga Without Limits',
    desc: 'Upgrade to Saturday AM+ PLUS for $1.99/mo or $20/yr to unlock the entire manga vault, 12-hour early access, and Super Hypes.',
    path: '/sub'
  },
  bingobook: {
    title: 'Creator Bingo Book & Digital Autographs | Saturday AM',
    desc: 'Collect authentic creator autographs and unlock exclusive profile rewards in the Saturday AM Bingo Book.',
    path: '/bingobook'
  },
  legal: {
    title: 'Terms of Service & Privacy Policy | Saturday AM Manga Hype',
    desc: 'Read the official Terms of Service and Privacy Policy for Saturday AM Manga Hype.',
    path: '/legal'
  }
};

const escapeHtml = (raw: string): string =>
  String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const normalizeVipCode = (name: string): string =>
  `VIP-${String(name || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()}`;

function injectSeoIntoHtml(
  html: string,
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogUrl?: string;
    ogImage: string;
    ogType?: string;
    jsonLd?: Record<string, any> | null;
    noscriptHtml?: string;
  }
): string {
  const safeTitle = escapeHtml(seo.title);
  const safeDesc = escapeHtml(seo.description.slice(0, 220));
  const safeCanonical = escapeHtml(seo.canonicalUrl);
  const safeOgUrl = escapeHtml(seo.ogUrl || seo.canonicalUrl);
  const safeImage = escapeHtml(seo.ogImage || DEFAULT_OG_IMAGE);
  const safeType = escapeHtml(seo.ogType || 'website');

  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = out.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${safeImage}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${safeOgUrl}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${safeType}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:title" content="${safeTitle}" />\n    <meta name="twitter:description" content="${safeDesc}" />\n    <meta name="twitter:image" content="${safeImage}" />`
  );

  if (seo.jsonLd) {
    const safeJson = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c');
    out = out.replace(
      '</head>',
      `    <script id="edge-seo-jsonld" type="application/ld+json">${safeJson}</script>\n  </head>`
    );
  }

  if (seo.noscriptHtml) {
    out = out.replace('</body>', `    <noscript>${seo.noscriptHtml}</noscript>\n  </body>`);
  }

  return out;
}

export async function onRequest(context: any) {
  const { request, next, env } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Immediately pass through all static files, service workers, sitemaps, and dedicated endpoints
  if (
    STATIC_ASSET_REGEX.test(pathname) ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/api/') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/ads.txt' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest'
  ) {
    return next();
  }

  // Detect target route (supports both clean paths like /series/hammer and legacy ?series=hammer)
  const seriesPathMatch = pathname.match(/^\/series\/([^/?#]+)/i);
  const cleanPathViewMatch = pathname.match(/^\/([a-z0-9-]+)\/?$/i);

  const seriesSlug = (
    url.searchParams.get('series') ||
    url.searchParams.get('slug') ||
    (seriesPathMatch ? decodeURIComponent(seriesPathMatch[1]) : '')
  )
    .trim()
    .toLowerCase();

  const creatorQuery = (url.searchParams.get('creator') || '').trim();
  const refParam = (
    url.searchParams.get('ref') ||
    url.searchParams.get('referral') ||
    url.searchParams.get('vip') ||
    ''
  )
    .trim()
    .toUpperCase();

  const rawView = (
    url.searchParams.get('view') ||
    (cleanPathViewMatch ? cleanPathViewMatch[1] : '')
  )
    .trim()
    .toLowerCase();

  // If plain homepage visit with no series, creator, view, or VIP referral param, serve fast untouched HTML
  if (
    (!seriesSlug || seriesSlug === 'app') &&
    !creatorQuery &&
    !VIEW_SEO_MAP[rawView] &&
    !refParam.startsWith('VIP-')
  ) {
    return next();
  }

  // Fetch the underlying SPA index.html response from Cloudflare Pages
  let baseResponse = await next();
  if (baseResponse.status === 404 && !STATIC_ASSET_REGEX.test(pathname)) {
    baseResponse = await env.ASSETS.fetch(new URL('/', request.url));
  }

  const contentType = baseResponse.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return baseResponse;
  }

  const supabaseUrl = env?.VITE_SUPABASE_URL || env?.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || env?.SUPABASE_ANON_KEY || '';
  const canQuerySupabase = Boolean(supabaseUrl && supabaseKey);
  const headers = canQuerySupabase
    ? {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      }
    : null;

  try {
    const html = await baseResponse.text();

    // 1. INDIVIDUAL MANGA SERIES DEEP LINK (/series/<slug> or /?series=<slug>)
    if (seriesSlug && seriesSlug !== 'app') {
      let seriesRow: any = null;
      if (headers) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/series?slug=ilike.${encodeURIComponent(
            seriesSlug
          )}&select=slug,title,creator_name,genre,synopsis,cover_url,character_url,is_hidden&limit=1`,
          { headers }
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0] && !rows[0].is_hidden) {
            seriesRow = rows[0];
          }
        }
      }

      const resolvedSlug = seriesRow?.slug || seriesSlug;
      const sTitle =
        seriesRow?.title ||
        resolvedSlug
          .split('-')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      const sCreator = seriesRow?.creator_name || 'Saturday AM';
      const sGenre = seriesRow?.genre || 'Diverse Shonen Manga';
      const sSynopsis =
        seriesRow?.synopsis ||
        `Read ${sTitle} manga by ${sCreator} online on Saturday AM Manga Hype. Explore chapters, characters, and creator updates.`;
      const sImage = seriesRow?.cover_url || seriesRow?.character_url || DEFAULT_OG_IMAGE;
      const canonicalUrl = `${SITE_ORIGIN}/series/${encodeURIComponent(resolvedSlug)}`;

      const fullTitle = `${sTitle} Manga by ${sCreator} | Read Online on Saturday AM`;
      const rewritten = injectSeoIntoHtml(html, {
        title: fullTitle,
        description: sSynopsis,
        canonicalUrl,
        ogUrl: canonicalUrl,
        ogImage: sImage,
        ogType: 'book',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ComicSeries',
          name: sTitle,
          url: canonicalUrl,
          image: sImage,
          genre: sGenre,
          description: sSynopsis,
          publisher: { '@type': 'Organization', name: 'Saturday AM' },
          author: { '@type': 'Person', name: sCreator }
        },
        noscriptHtml: `<main><h1>${escapeHtml(sTitle)} Manga by ${escapeHtml(
          sCreator
        )}</h1><p>${escapeHtml(sSynopsis)}</p><p><a href="${SITE_ORIGIN}/browse">Browse All Saturday AM Manga Series</a></p></main>`
      });

      const outHeaders = new Headers(baseResponse.headers);
      outHeaders.set('Content-Type', 'text/html; charset=UTF-8');
      return new Response(rewritten, { status: 200, headers: outHeaders });
    }

    // 2. CREATOR PROFILE DEEP LINK (/creators?creator=<Name> or /?creator=<Name>)
    if (creatorQuery) {
      let creatorBio = `Explore manga series, character art, and updates by ${creatorQuery} on Saturday AM Manga Hype.`;
      let creatorImg = DEFAULT_OG_IMAGE;

      if (headers) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/series_creators?name=ilike.${encodeURIComponent(
            creatorQuery
          )}&select=name,bio,avatar_url,series_slug&limit=1`,
          { headers }
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) {
            if (rows[0].bio) creatorBio = rows[0].bio;
            if (rows[0].avatar_url) creatorImg = rows[0].avatar_url;
          }
        }
      }

      const canonicalUrl = `${SITE_ORIGIN}/creators?creator=${encodeURIComponent(creatorQuery)}`;
      const rewritten = injectSeoIntoHtml(html, {
        title: `${creatorQuery} - Manga Creator Profile | Saturday AM`,
        description: creatorBio,
        canonicalUrl,
        ogImage: creatorImg,
        ogType: 'profile',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: creatorQuery,
          description: creatorBio,
          image: creatorImg,
          url: canonicalUrl,
          affiliation: { '@type': 'Organization', name: 'Saturday AM' }
        },
        noscriptHtml: `<main><h1>${escapeHtml(creatorQuery)} — Saturday AM Creator</h1><p>${escapeHtml(
          creatorBio
        )}</p></main>`
      });

      const outHeaders = new Headers(baseResponse.headers);
      outHeaders.set('Content-Type', 'text/html; charset=UTF-8');
      return new Response(rewritten, { status: 200, headers: outHeaders });
    }

    // 3. CREATOR VIP REFERRAL SHARE LINK (/?ref=VIP-...) -> Rich Social Card + Clean Root Canonical
    if (refParam.startsWith('VIP-') && !VIEW_SEO_MAP[rawView]) {
      let matchedCreatorName = refParam.replace(/^VIP-/, '');
      let matchedImage = DEFAULT_OG_IMAGE;

      if (headers) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/series_creators?select=name,avatar_url,series_slug`,
          { headers }
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            const found = rows.find(
              (r: any) =>
                normalizeVipCode(r.name) === refParam ||
                `VIP-${String(r.name || '')
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase()}` === refParam
            );
            if (found?.name) {
              matchedCreatorName = found.name;
              if (found.avatar_url) matchedImage = found.avatar_url;
            }
          }
        }
      }

      const rewritten = injectSeoIntoHtml(html, {
        title: `Claim Your 3-Day Free PLUS Trial from ${matchedCreatorName} | Saturday AM`,
        description: `${matchedCreatorName} invited you to Saturday AM Manga Hype! Unlock 3 days of unlimited, ad-free manga reading across 30+ hit diverse series.`,
        canonicalUrl: `${SITE_ORIGIN}/`,
        ogUrl: url.toString(),
        ogImage: matchedImage
      });

      const outHeaders = new Headers(baseResponse.headers);
      outHeaders.set('Content-Type', 'text/html; charset=UTF-8');
      return new Response(rewritten, { status: 200, headers: outHeaders });
    }

    // 4. CORE HUB ROUTES (/browse, /creators, /characters, /leaderboard, /news, /shop, /sub)
    const hubMeta = VIEW_SEO_MAP[rawView];
    if (hubMeta) {
      const canonicalUrl = `${SITE_ORIGIN}${hubMeta.path}`;
      const rewritten = injectSeoIntoHtml(html, {
        title: hubMeta.title,
        description: hubMeta.desc,
        canonicalUrl,
        ogImage: DEFAULT_OG_IMAGE,
        noscriptHtml: `<main><h1>${escapeHtml(hubMeta.title)}</h1><p>${escapeHtml(
          hubMeta.desc
        )}</p></main>`
      });

      const outHeaders = new Headers(baseResponse.headers);
      outHeaders.set('Content-Type', 'text/html; charset=UTF-8');
      return new Response(rewritten, { status: 200, headers: outHeaders });
    }

    return new Response(html, {
      status: baseResponse.status,
      headers: baseResponse.headers
    });
  } catch {
    return baseResponse;
  }
}