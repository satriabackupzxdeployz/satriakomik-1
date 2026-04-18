const { scrapeChapterImages } = require('./_scraper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Query parameter "url" required' });

  try {
    const result = await scrapeChapterImages(url);
    if (!result.images.length) {
      return res.status(404).json({ error: 'Gambar tidak ditemukan atau chapter terkunci.' });
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.json({ status: true, ...result });
  } catch (err) {
    console.error('Chapter error:', err.message);
    res.status(500).json({ error: 'Failed to fetch chapter images', message: err.message });
  }
};