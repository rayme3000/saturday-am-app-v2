const HYPE_FLAME_R2_URL =
  'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/Hype%20flame.png';

export async function onRequestGet() {
  try {
    const upstream = await fetch(HYPE_FLAME_R2_URL);
    if (!upstream.ok) {
      return new Response('Not found', { status: 404 });
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=604800',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return new Response('Error fetching flame asset', { status: 502 });
  }
}