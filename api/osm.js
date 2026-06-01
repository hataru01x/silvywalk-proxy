export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { lat, lng, r } = req.query;
  if (!lat || !lng) { res.status(400).json({ error: 'lat e lng richiesti' }); return; }

  const radius = parseInt(r) || 5000;

  // Query ultra minimale — solo nomi e centro, niente geometria
  const query = `[out:json][timeout:6];(way["highway"~"path|track"]["name"](around:${radius},${lat},${lng});node["tourism"="alpine_hut"]["name"](around:${radius},${lat},${lng});node["natural"="peak"]["name"](around:${radius},${lat},${lng}););out ids tags center qt;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'SilvyWalk/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      res.status(500).json({ error: `Overpass status: ${response.status}` });
      return;
    }

    const text = await response.text();
    if (text.startsWith('<')) {
      res.status(500).json({ error: 'Risposta HTML da Overpass' });
      return;
    }

    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
