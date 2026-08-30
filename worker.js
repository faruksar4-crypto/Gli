const ALLOWED = [
  'api.stlouisfed.org',
  'www.bitstamp.net',
  'stablecoins.llama.fi',
  'stats.bis.org',
  'api.db.nomics.world',
  'api.kraken.com',
  'api.exchange.coinbase.com'
];

const CORS = {
  'content-type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const J = (obj, status) => new Response(JSON.stringify(obj), {
  status: status,
  headers: CORS
});

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
      const r = await fetch(u.toString(), { signal: AbortSignal.timeout(10000) });
      const text = await r.text();
      return new Response(text, { status: r.status, headers: CORS });
    } catch (e) {
      return J({ error: e.message || 'baglanti hatasi' }, 502);
    }
  }
};
