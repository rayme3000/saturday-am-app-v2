export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 1. Grab the image and where the user should actually go
  const panelImg = url.searchParams.get('panel');
  const targetUrl = url.searchParams.get('target') || 'https://saturday-am-app-v2.pages.dev';

  // 2. If we have a panel image, serve the meta tags and a JS redirect!
  // No more User-Agent guessing games. Every visitor gets the tags.
  if (panelImg) {
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
      <body style="background: black; color: #fe9a00; font-family: sans-serif; text-align: center; padding-top: 20vh;">
        <h2>Loading Saturday AM...</h2>
        <!-- Real humans will execute this and redirect instantly -->
        <script>window.location.href="${targetUrl}";</script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  // 3. Fallback redirect if no panel image is provided
  return Response.redirect(targetUrl, 302);
}