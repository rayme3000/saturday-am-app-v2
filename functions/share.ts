export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);

  const panelImg = url.searchParams.get('panel');
  const seriesTitle = url.searchParams.get('title') || 'Saturday AM - Manga Hype';
  const seriesCreator = url.searchParams.get('creator') || 'Saturday AM';
  const seriesDesc =
    url.searchParams.get('desc') ||
    `Read ${seriesTitle} by ${seriesCreator} on Saturday AM Manga Hype — the home of diverse shonen manga!`;
  const targetUrl = url.searchParams.get('target') || 'https://www.mangahype.com/';
  const ogImage =
    panelImg ||
    url.searchParams.get('img') ||
    'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/homepage-graphic-assets/AM%20App%20load%20screen.jpg';

  const safeTitle = seriesTitle.replace(/"/g, '&quot;');
  const safeDesc = seriesDesc.replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle} | Saturday AM Manga Hype</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${targetUrl}" />
  <meta property="og:site_name" content="Saturday AM - Manga Hype" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${targetUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${ogImage}" />
</head>
<body style="background: #000000; color: #fe9a00; font-family: sans-serif; text-align: center; padding-top: 20vh;">
  <h2>Opening ${safeTitle} on Saturday AM...</h2>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}