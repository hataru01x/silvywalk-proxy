export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { lat, lng, rmin, rmax } = req.query;
  if (!lat || !lng) { res.status(400).json({ error: 'lat e lng richiesti' }); return; }

  const radiusMin = parseInt(rmin) || 0;
  const radiusMax = parseInt(rmax) || 2000;

  // Query solo nella fascia rmin-rmax — molto più leggera
  const query = `[out:json][timeout:8];(node["tourism"~"alpine_hut|wilderness_hut"]["name"](around:${radiusMax},${lat},${lng});node["natural"="peak"]["name"](around:${radiusMax},${lat},${lng});node["mountain_pass"="yes"]["name"](around:${radiusMax},${lat},${lng});way["highway"="path"]["name"](around:${radiusMax},${lat},${lng});way["highway"="track"]["name"]["sac_scale"](around:${radiusMax},${lat},${lng}););out ids tags center qt;`;

  const servers = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
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
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (text.startsWith('<') || text.startsWith('Error')) continue;
      const data = JSON.parse(text);
      res.status(200).json(data);
      return;
    } catch (e) {
      continue;
    }
  }

  res.status(500).json({ error: 'Server non disponibile' });
}
