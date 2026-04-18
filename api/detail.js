const { scrapeDetail } = require('./_scraper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Query parameter "url" required' });

  try {
    const detail = await scrapeDetail(url);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.json({ status: true, ...detail });
  } catch (err) {
    console.error('Detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch detail', message: err.message });
  }
};