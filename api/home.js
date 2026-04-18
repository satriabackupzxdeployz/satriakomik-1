const { scrapeHome } = require('./_scraper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { type = 'manga', page = 1 } = req.query;
    const data = await scrapeHome(type, parseInt(page));
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.json({ status: true, ...data });
  } catch (err) {
    console.error('Home error:', err.message);
    res.status(500).json({ error: 'Failed to fetch home', message: err.message });
  }
};