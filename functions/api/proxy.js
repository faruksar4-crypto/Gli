const ALLOWED = [
  'api.stlouisfed.org',
  'api.kraken.com',
  'www.bitstamp.net',
  'stablecoins.llama.fi',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com'
];

const CORS = { 'Access-Control-Allow-Origin': '*' };

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/'
};

const J = (obj, status) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json', ...CORS }
});

async function upstream(urlStr, host) {
  const isYahoo = host.endsWith('.yahoo.com');
  const hosts = isYahoo
    ? [host, host === 'query1.finance.yahoo.com' ? 'query2.finance.yahoo.com' : 'query1.finance.yahoo.com']
    : [host];
  let res, err;
  for (const h of hosts) {
    const u = new URL(urlStr);
    u.hostname = h;
    try {
      res = await fetch(u.toString(), {
        headers: isYahoo ? YAHOO_HEADERS : { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
        cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '400-599': 0 } }
      });
      if (res.ok) return res;
    } catch (e) { err = e; }
  }
  if (res) return res;
  throw err;
}

async function handle(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
  }

  if (!url.pathname.startsWith('/api/proxy')) {
    return env && env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  }

  const target = url.searchParams.get('url');
  if (!target) return J({ error: 'url parametresi eksik' }, 400);

  let u;
  try { u = new URL(target); } catch (e) { return J({ error: 'gecersiz url' }, 400); }

  if (u.protocol !== 'https:' || !ALLOWED.includes(u.hostname)) {
    return J({ error: 'bu adrese izin yok: ' + u.hostname }, 403);
  }

  try {
    const r = await upstream(u.toString(), u.hostname);
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { 'content-type': r.headers.get('content-type') || 'application/json', ...CORS }
    });
  } catch (e) {
    return J({ error: e.message || 'baglanti hatasi' }, 502);
  }
}

export default { fetch: (request, env) => handle(request, env) };
export const onRequest = (context) => handle(context.request, context.env);
