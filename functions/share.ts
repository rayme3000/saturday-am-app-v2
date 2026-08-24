export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 1. Grab the image and where the user should actually go
  const panelImg = url.searchParams.get('panel');
  const targetUrl = url.searchParams.get('target') || 'https://saturday-am-app-v2.pages.dev';

  // 2. Check if the visitor is a social media bot
  const userAgent = request.headers.get('User-Agent') || '';
  const isBot = /bot|facebook|twitter|slack|discord|whatsapp|telegram|linkedin|vkShare|skype|preview/i.test(userAgent);

  // 3. If it's a bot AND we have a panel image, show them the fake "front door"
  if (isBot && panelImg) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="Saturday AM - Epic Manga Panel" />
        <meta property="og:description" content="I'm reading the best diverse manga on the Saturday AM app! Check out this panel:" />
        <meta property="og:image" content="${panelImg}" />
        <meta property="og:image:width" content="1080" />
        <meta property="og:image:height" content="1080" />
        <meta property="og:url" content="${request.url}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="${panelImg}" />
      </head>
      <body>
        <!-- Just in case a human slips through, instantly redirect them -->
        <script>window.location.href="${targetUrl}";</script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  // 4. If it's a real human, redirect them instantly to the actual manga app
  return Response.redirect(targetUrl, 302);
}