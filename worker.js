const ALLOWED = [
  'api.stlouisfed.org',
  'www.bitstamp.net',
  'stablecoins.llama.fi',
  'stats.bis.org',
  'api.db.nomics.world',
  'api.kraken.com',
  'api.exchange.coinbase.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com'
];

const CORS = {
  'content-type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const J = (obj, status) => new Response(JSON.stringify(obj), {
  status: status,
  headers: CORS
});

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/'
};

async function upstream(u) {
  const isYahoo = u.hostname.endsWith('.finance.yahoo.com');
  const hosts = isYahoo
    ? [u.hostname, u.hostname === 'query1.finance.yahoo.com' ? 'query2.finance.yahoo.com' : 'query1.finance.yahoo.com']
    : [u.hostname];

  let res, err;
  for (const h of hosts) {
    const t = new URL(u.toString());
    t.hostname = h;
    try {
      res = await fetch(t.toString(), {
        headers: isYahoo ? YAHOO_HEADERS : {},
        signal: AbortSignal.timeout(10000),
        cf: isYahoo ? { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '400-599': 0 } } : undefined
      });
      if (res.ok) return res;
    } catch (e) {
      err = e;
    }
  }
  if (res) return res;
  throw err;
}

export default {
  async fetch(request, env) {
    const reqUrl = new URL(request.url);

    if (reqUrl.pathname !== '/api/proxy') {
      return env.ASSETS.fetch(request);
    }

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
      const r = await upstream(u);
      const text = await r.text();
      return new Response(text, { status: r.status, headers: CORS });
    } catch (e) {
      return J({ error: e.message || 'baglanti hatasi' }, 502);
    }
  }
};
