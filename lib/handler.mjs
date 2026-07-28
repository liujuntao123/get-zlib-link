import { getZlibLinks } from './scrape.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Shared Web-standard handler for GET /api/link
 * Works on Vercel Edge and Cloudflare Pages Functions.
 */
export async function handleLinkRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const data = await getZlibLinks();
    const status = data.ok ? 200 : 502;
    return json(data, status, {
      // Cache at edge for 10 minutes; allow stale for 1 hour
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    });
  } catch (error) {
    return json(
      {
        ok: false,
        primaryUrl: null,
        links: [],
        sources: [],
        fetchedAt: new Date().toISOString(),
        error: error?.message || 'Internal error',
      },
      500
    );
  }
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}
