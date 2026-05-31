export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { lat, lng, r, mode } = req.query;
  if (!lat || !lng) { res.status(400).json({ error: 'lat e lng richiesti' }); return; }

  const radius = r || 8000;

  // MODE: list = solo nomi e coordinate (veloce)
  // MODE: detail = geometria completa per un singolo way (al click)
  let query;
  if (mode === 'detail') {
    const { id } = req.query;
    query = `[out:json][timeout:10];way(${id});out geom qt;`;
  } else {
    // Lista leggera — solo nomi, niente geometria
    query = `[out:json][timeout:8];(way["highway"~"path|track"]["name"](around:${radius},${lat},${lng});node["tourism"~"alpine_hut|wilderness_hut"]["name"](around:${radius},${lat},${lng});node["natural"="peak"]["name"](around:${radius},${lat},${lng});node["mountain_pass"="yes"]["name"](around:${radius},${lat},${lng}););out body qt;`;
  }

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  for (const server of servers) {
    try {
      const response = await fetch(server, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SilvyWalk/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (text.startsWith('<')) continue;
      const data = JSON.parse(text);
      res.status(200).json(data);
      return;
    } catch (e) {
      continue;
    }
  }

  res.status(500).json({ error: 'Server non disponibile' });
}
