const ALLOWED = [
  'api.stlouisfed.org',
  'www.bitstamp.net',
  'stablecoins.llama.fi'
];

const J = (obj, status) => new Response(JSON.stringify(obj), {
  status: status,
  headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
});

export async function onRequest(context) {
  const reqUrl = new URL(context.request.url);
  const target = reqUrl.searchParams.get('url');

  if (!target) return J({ error: 'url parametresi eksik' }, 400);

  let u;
  try {
    u = new URL(target);
  } catch (e) {
    return J({ error: 'gecersiz url' }, 400);
  }

  if (u.protocol !== 'https:' || ALLOWED.indexOf(u.hostname) === -1) {
    return J({ error: 'bu adrese izin yok: ' + u.hostname }, 403);
  }

  try {
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return J({ error: e.message || 'baglanti hatasi' }, 502);
  }
}
