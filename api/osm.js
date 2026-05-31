export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const r = searchParams.get('r') || '8000';

  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: 'lat e lng richiesti' }), { headers, status: 400 });
  }

  const query = `[out:json][timeout:9];(node["tourism"~"alpine_hut|wilderness_hut"]["name"](around:${r},${lat},${lng});node["natural"="peak"]["name"](around:${r},${lat},${lng});node["mountain_pass"="yes"]["name"](around:${r},${lat},${lng});way["highway"="path"]["name"](around:${r},${lat},${lng});way["highway"="track"]["name"]["sac_scale"](around:${r},${lat},${lng}););out ids tags center qt;`;

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
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) continue;
      const text = await response.text();
      if (text.startsWith('<') || text.startsWith('Error')) continue;
      return new Response(text, { headers, status: 200 });
    } catch (e) {
      continue;
    }
  }

  return new Response(JSON.stringify({ error: 'Server non disponibile' }), { headers, status: 500 });
}
