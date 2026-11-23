const SITE_ORIGIN = 'https://www.mangahype.com';
const FALLBACK_SUPABASE_URL = 'https://zcadkovymrnjpjaxvnao.supabase.co';

const escapeXml = (unsafe: string): string =>
  String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toIsoDate = (raw?: string | null): string => {
  if (!raw) return new Date().toISOString().split('T')[0];
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};

export async function onRequest(context: any) {
  const supabaseUrl =
    context?.env?.VITE_SUPABASE_URL ||
    context?.env?.SUPABASE_URL ||
    FALLBACK_SUPABASE_URL;
  const supabaseKey =
    context?.env?.VITE_SUPABASE_ANON_KEY || context?.env?.SUPABASE_ANON_KEY || '';

  const today = new Date().toISOString().split('T')[0];

  const coreRoutes = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/browse', changefreq: 'daily', priority: '0.9' },
    { path: '/creators', changefreq: 'weekly', priority: '0.9' },
    { path: '/characters', changefreq: 'weekly', priority: '0.8' },
    { path: '/leaderboard', changefreq: 'daily', priority: '0.8' },
    { path: '/news', changefreq: 'daily', priority: '0.8' },
    { path: '/shop', changefreq: 'weekly', priority: '0.8' },
    { path: '/sub', changefreq: 'weekly', priority: '0.8' }
  ];

  let seriesRows: any[] = [];
  let creatorRows: any[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      };

      const [seriesRes, creatorsRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/series?select=slug,is_hidden,publish_at,updated_at,created_at&order=display_order.asc`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/series_creators?select=name,is_visible,created_at`,
          { headers }
        )
      ]);

      if (seriesRes.ok) {
        const parsed = await seriesRes.json();
        if (Array.isArray(parsed)) seriesRows = parsed;
      }
      if (creatorsRes.ok) {
        const parsed = await creatorsRes.json();
        if (Array.isArray(parsed)) creatorRows = parsed;
      }
    } catch {
      // Fallback to core routes if upstream fetch times out
    }
  }

  const nowMs = Date.now();
  const urlsXml: string[] = [];

  // 1. Core Hub Pages
  for (const r of coreRoutes) {
    urlsXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}${r.path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`);
  }

  // 2. All Published Manga Series & One-Shots (Clean /series/<slug> URLs)
  const seenSlugs = new Set<string>();
  for (const s of seriesRows) {
    if (!s?.slug || s.is_hidden === true) continue;
    if (s.publish_at && new Date(s.publish_at).getTime() > nowMs) continue;

    const cleanSlug = String(s.slug).trim().toLowerCase();
    if (!cleanSlug || seenSlugs.has(cleanSlug)) continue;
    seenSlugs.add(cleanSlug);

    const lastMod = toIsoDate(s.updated_at || s.publish_at || s.created_at);
    urlsXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/series/${encodeURIComponent(cleanSlug)}`)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>`);
  }

  // 3. Official Creator Profile Deep Links
  const seenCreators = new Set<string>();
  for (const cr of creatorRows) {
    if (!cr?.name || cr.is_visible === false) continue;
    const cleanName = String(cr.name).trim();
    const key = cleanName.toLowerCase();
    if (!cleanName || seenCreators.has(key)) continue;
    seenCreators.add(key);

    const lastMod = toIsoDate(cr.created_at);
    urlsXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/creators?creator=${encodeURIComponent(cleanName)}`)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}