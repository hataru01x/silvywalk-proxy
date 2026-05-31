export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { lat, lng, r } = req.query;
  if (!lat || !lng) { res.status(400).json({ error: 'lat e lng richiesti' }); return; }

  const radius = r || 8000;
  const bbox_offset = (radius / 111000);
  const minlat = parseFloat(lat) - bbox_offset;
  const maxlat = parseFloat(lat) + bbox_offset;
  const minlon = parseFloat(lng) - bbox_offset;
  const maxlon = parseFloat(lng) + bbox_offset;

  // Usa OSM API invece di Overpass — molto più veloce
  // Cerca rifugi e punti interesse con bbox
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=30&bounded=1&viewbox=${minlon},${maxlat},${maxlon},${minlat}&q=rifugio+sentiero&accept-language=it`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SilvyWalk/1.0 hiking app',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    res.status(200).json({ elements: data, source: 'nominatim' });
    return;
  } catch (e) {
    console.log('Nominatim error:', e.message);
  }

  res.status(500).json({ error: 'Servizio non disponibile' });
}
