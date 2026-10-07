// Vercel sunucu fonksiyonu: oda durumunu Upstash Redis'te tutar.
// GET  /api/room?code=AB12C  -> oda JSON'u (yoksa 404)
// POST /api/room?code=AB12C  -> gövdedeki oda JSON'unu kaydeder (24 saat sonra silinir)
// Gerekli ortam değişkenleri (Vercel Marketplace > Upstash entegrasyonu otomatik ekler):
//   KV_REST_API_URL + KV_REST_API_TOKEN   ya da   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL_SECONDS = 60 * 60 * 24;
const MAX_BYTES = 512 * 1024;

async function redis(cmd){
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || ('Redis HTTP ' + r.status));
  return data.result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Upstash Redis bağlı değil (ortam değişkenleri eksik).' });
  const code = String((req.query && req.query.code) || '').toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return res.status(400).json({ error: 'Geçersiz oda kodu.' });
  const key = 'okey101:room:' + code;
  try {
    if (req.method === 'GET') {
      const v = await redis(['GET', key]);
      if (v == null) return res.status(404).json({ error: 'Oda bulunamadı.' });
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(v);
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || null);
      if (!body || body === 'null') return res.status(400).json({ error: 'Boş gövde.' });
      if (Buffer.byteLength(body) > MAX_BYTES) return res.status(413).json({ error: 'Oda verisi çok büyük.' });
      JSON.parse(body); // geçerli JSON mu
      await redis(['SET', key, body, 'EX', String(TTL_SECONDS)]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor.' });
  } catch (e) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
};
