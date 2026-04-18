const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://komiku.org/';
const API_BASE = 'https://api.komiku.org/';

const httpClient = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  timeout: 15000,
});

function fixLink(link) {
  if (!link) return null;
  return link.startsWith('http') ? link : BASE_URL + link;
}

function normalizeType(type) {
  type = (type || 'manga').toLowerCase().trim();
  const validTypes = ['manga', 'manhwa', 'manhua'];
  return validTypes.includes(type) ? type : 'manga';
}

function normalizePage(page) {
  page = parseInt(page);
  return isNaN(page) || page < 1 ? 1 : page;
}

async function fetchList(url) {
  const { data } = await httpClient.get(url);
  const $ = cheerio.load(data);
  const result = [];

  $('.bge').each((i, el) => {
    const title = $(el).find('h3').text().trim();
    if (!title) return;

    result.push({
      title: title,
      url: fixLink($(el).find('.bgei a').attr('href')),
      thumbnail: $(el).find('img').attr('src'),
      type: $(el).find('.tpe1_inf b').text().trim(),
      genre: $(el).find('.tpe1_inf').text().replace($(el).find('.tpe1_inf b').text(), '').trim(),
      last_update: $(el).find('.up').text().trim(),
      description: $(el).find('p').text().trim(),
      first_chapter: fixLink($(el).find('.new1').eq(0).find('a').attr('href')),
      last_chapter: fixLink($(el).find('.new1').eq(1).find('a').attr('href'))
    });
  });

  return result;
}

async function scrapeHome(type = 'manga', page = 1) {
  type = normalizeType(type);
  page = normalizePage(page);

  const url = page === 1
    ? `${API_BASE}manga/?tipe=${type}`
    : `${API_BASE}manga/page/${page}/?tipe=${type}`;

  const data = await fetchList(url);
  return { type, page, data };
}

async function scrapeSearch(query) {
  if (!query) return [];
  const url = `${API_BASE}?post_type=manga&s=${encodeURIComponent(query)}`;
  return await fetchList(url);
}

async function scrapeDetail(comicUrl) {
  const { data } = await httpClient.get(comicUrl);
  const $ = cheerio.load(data);

  const title = $('#Judul h1 span span').text().trim() || $('#Judul h1').first().text().trim();
  const alternative = $('#Judul .j2').text().trim();
  const thumbnail = $('.ims img').attr('src') || $('img[itemprop="image"]').attr('src');
  const description = $('.desc').text().trim() || $('p[itemprop="description"]').text().trim();

  const metaInfo = {};
  $('.inftable tr').each((i, el) => {
    const key = $(el).find('td').eq(0).text().replace(':', '').trim().toLowerCase();
    const val = $(el).find('td').eq(1).text().trim();
    if (key && val) metaInfo[key] = val;
  });

  const genres = [];
  $('.genre li a span, ul.genre li.genre a span').each((i, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const isAdult = genres.some(g => 
    g.toLowerCase().includes('mature') || 
    g.toLowerCase().includes('adult') || 
    g.toLowerCase().includes('18+') ||
    g.toLowerCase().includes('dewasa')
  ) || (metaInfo['umur pembaca'] && metaInfo['umur pembaca'].includes('18'));

  const chapters = [];
  $('#Daftar_Chapter tr').each((i, el) => {
    if (i === 0 && $(el).find('th').length > 0) return;
    const ch = $(el).find('td.judulseries a');
    const date = $(el).find('td.tanggalseries').text().trim();
    if (ch.length) {
      chapters.push({
        title: ch.text().trim(),
        link: fixLink(ch.attr('href')),
        date: date || 'N/A'
      });
    }
  });

  if (chapters.length === 0) {
    $('.chapter-list tr, .episode-list tr, [class*="chapter"] tr').each((i, el) => {
      if ($(el).find('th').length > 0) return;
      const linkEl = $(el).find('a');
      const chapterTitle = linkEl.find('span').text().trim() || linkEl.text().trim();
      const relHref = linkEl.attr('href');
      if (chapterTitle && relHref) {
        chapters.push({
          title: chapterTitle,
          link: fixLink(relHref),
          date: $(el).find('td:last-child, .date').text().trim() || 'N/A'
        });
      }
    });
  }

  return {
    url: comicUrl,
    title,
    alternative,
    thumbnail_url: thumbnail,
    full_synopsis: description,
    short_description: description.substring(0, 150) + '...',
    metaInfo,
    genres,
    isAdult,
    total_chapter: chapters.length,
    first_chapter: chapters[chapters.length - 1] || null,
    last_chapter: chapters[0] || null,
    episodes: chapters
  };
}

async function scrapeChapterImages(chapterUrl) {
  const { data } = await httpClient.get(chapterUrl);
  const $ = cheerio.load(data);

  const images = [];
  $('#Baca_Komik img').each((i, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src && src.startsWith('http')) images.push(src);
  });

  const title = $('#Judul h1').text().trim();
  const next = $('.pagination a.next').attr('href');
  const prev = $('.nxpr a').first().attr('href');

  return {
    title,
    images,
    total_images: images.length,
    next: fixLink(next),
    prev: fixLink(prev)
  };
}

module.exports = {
  scrapeHome,
  scrapeSearch,
  scrapeDetail,
  scrapeChapterImages
};