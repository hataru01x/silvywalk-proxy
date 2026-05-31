export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'q richiesto' }); return; }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Italia')}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SilvyWalk/1.0 hiking app',
        'Accept-Language': 'it',
      },
    });
    if (!response.ok) throw new Error(`Nominatim status: ${response.status}`);
    const data = await response.json();
    if (data && data.length > 0) {
      res.status(200).json({
        found: true,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name,
      });
    } else {
      res.status(200).json({ found: false });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
