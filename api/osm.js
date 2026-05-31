export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { lat, lng, r } = req.query;
  if (!lat || !lng) { res.status(400).json({ error: 'lat e lng richiesti' }); return; }

  const radius = parseInt(r) || 8000;

  // Query ultra leggera — solo nomi, niente geometria
  const query = `[out:json][timeout:9];(node["tourism"~"alpine_hut|wilderness_hut"]["name"](around:${radius},${lat},${lng});node["natural"="peak"]["name"](around:${radius},${lat},${lng});node["mountain_pass"="yes"]["name"](around:${radius},${lat},${lng});way["highway"="path"]["name"](around:${radius},${lat},${lng});way["highway"="track"]["name"]["sac_scale"](around:${radius},${lat},${lng}););out ids tags center qt;`;

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
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
      if (!response.ok) {
        console.log(server, 'status:', response.status);
        continue;
      }
      const text = await response.text();
      if (text.startsWith('<')) continue;
      const data = JSON.parse(text);
      console.log('OK da', server, '- elementi:', data.elements?.length);
      res.status(200).json(data);
      return;
    } catch (e) {
      console.log(server, 'error:', e.message);
      continue;
    }
  }

  res.status(500).json({ error: 'Server non disponibile' });
}
