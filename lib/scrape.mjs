import * as cheerio from 'cheerio';

const WIKI_SOURCES = [
  {
    id: 'zh',
    label: '中文维基百科',
    url: 'https://zh.wikipedia.org/wiki/Z-Library',
  },
  {
    id: 'en',
    label: 'English Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Z-Library',
  },
];

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; GetZlibLink/1.0; +https://github.com/get-zlib-link)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

/**
 * Normalize a potentially protocol-relative or relative URL.
 */
function normalizeUrl(href, baseOrigin) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:')) {
    return null;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  try {
    return new URL(trimmed, baseOrigin).href;
  } catch {
    return null;
  }
}

/**
 * Extract candidate official / external links from a Wikipedia article HTML.
 */
function extractLinksFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const origin = new URL(pageUrl).origin;
  const found = [];
  const seen = new Set();

  const push = (url, source, label = null) => {
    const normalized = normalizeUrl(url, origin);
    if (!normalized) return;
    // Skip Wikipedia internal links
    if (/wikipedia\.org/i.test(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    found.push({ url: normalized, source, label });
  };

  // 1) Infobox rows: 网址 / 官方网站 / Website / URL
  $('table.infobox tr, table.infobox_v2 tr').each((_, row) => {
    const th = $(row).find('th').text().trim();
    const key = th.toLowerCase();
    if (
      th.includes('网址') ||
      th.includes('官方网站') ||
      th.includes('網站') ||
      key.includes('website') ||
      key === 'url' ||
      key.includes('official')
    ) {
      $(row)
        .find('td a[href]')
        .each((__, el) => {
          push($(el).attr('href'), 'infobox', $(el).text().trim() || th);
        });
    }
  });

  // 2) External links section
  const externalHeading = $('#External_links, #外部链接, #外部連結').first();
  if (externalHeading.length) {
    let node = externalHeading.parent().next();
    while (node.length && !/^H[1-6]$/i.test(node.prop('tagName') || '')) {
      node.find('a[href]').each((_, el) => {
        const text = $(el).text().trim();
        if (
          /官方|official|z-?library|zlibrary|网站|website/i.test(text) ||
          /官方|official/i.test($(el).parent().text())
        ) {
          push($(el).attr('href'), 'external-links', text || null);
        }
      });
      node = node.next();
    }
  }

  // 3) Fallback: any external link whose text mentions official / Z-Library domain-ish
  if (found.length === 0) {
    $('a.external[href], a[href^="http"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (/z-?lib|singlelogin|zlib/i.test(href) || /官方网站|official website/i.test(text)) {
        push(href, 'fallback', text || null);
      }
    });
  }

  return found;
}

/**
 * Fetch one Wikipedia page and extract links.
 */
async function scrapeSource(source, { signal } = {}) {
  const response = await fetch(source.url, {
    headers: DEFAULT_HEADERS,
    signal,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`${source.label} HTTP ${response.status}`);
  }

  const html = await response.text();
  const links = extractLinksFromHtml(html, source.url);

  return {
    source: source.id,
    sourceLabel: source.label,
    sourceUrl: source.url,
    links,
  };
}

/**
 * Scrape Z-Library official links from Wikipedia.
 * Tries Chinese first, then English as fallback / supplement.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   primaryUrl: string | null,
 *   links: Array<{url: string, source: string, label: string | null, wiki: string}>,
 *   sources: Array<object>,
 *   fetchedAt: string,
 *   error?: string
 * }>}
 */
export async function getZlibLinks({ timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchedAt = new Date().toISOString();

  try {
    const results = await Promise.all(
      WIKI_SOURCES.map(async (source) => {
        try {
          const value = await scrapeSource(source, { signal: controller.signal });
          return { source, ok: true, value };
        } catch (reason) {
          return {
            source,
            ok: false,
            error:
              reason?.name === 'AbortError'
                ? 'timeout'
                : String(reason?.message || reason),
          };
        }
      })
    );

    const sources = [];
    const links = [];
    const seen = new Set();

    for (const result of results) {
      if (result.ok) {
        const value = result.value;
        sources.push({
          id: value.source,
          label: value.sourceLabel,
          url: value.sourceUrl,
          ok: true,
          count: value.links.length,
        });
        for (const link of value.links) {
          if (seen.has(link.url)) continue;
          seen.add(link.url);
          links.push({
            ...link,
            wiki: value.source,
          });
        }
      } else {
        sources.push({
          id: result.source.id,
          label: result.source.label,
          url: result.source.url,
          ok: false,
          error: result.error,
        });
      }
    }

    // Prefer non-onion http(s) links as primary when possible
    const preferred =
      links.find((l) => !l.url.includes('.onion') && /^https?:/i.test(l.url)) ||
      links[0] ||
      null;

    if (!preferred) {
      const errors = sources.filter((s) => !s.ok).map((s) => s.error).filter(Boolean);
      return {
        ok: false,
        primaryUrl: null,
        links: [],
        sources,
        fetchedAt,
        error:
          errors.length > 0
            ? `未能提取到官方网址（${errors.join('; ')}）`
            : '未能提取到官方网址，页面结构可能已变化。',
      };
    }

    return {
      ok: true,
      primaryUrl: preferred.url,
      links,
      sources,
      fetchedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export { WIKI_SOURCES, extractLinksFromHtml, normalizeUrl };
