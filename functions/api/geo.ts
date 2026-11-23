export async function onRequestGet(context: any) {
  const cf = context?.request?.cf || {};
  const headers = context?.request?.headers;

  const country = String(
    cf.country || headers?.get?.('cf-ipcountry') || ''
  )
    .trim()
    .toUpperCase();

  const payload = {
    country: country && country !== 'XX' && country !== 'T1' ? country : '',
    continent: String(cf.continent || '').trim().toUpperCase(),
    region: String(cf.region || '').trim(),
    timezone: String(cf.timezone || '').trim()
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'private, max-age=3600'
    }
  });
}