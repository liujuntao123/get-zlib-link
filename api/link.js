/**
 * Vercel Serverless Function (Node.js runtime).
 * Deployed as /api/link
 *
 * Uses Node runtime for reliable cheerio parsing.
 * Accepts both Web Fetch-style and Node (req, res) entry points.
 */
import { handleLinkRequest } from '../lib/handler.mjs';

export default async function handler(req, res) {
  // Vercel Node.js serverless: IncomingMessage + ServerResponse
  if (res && typeof res.setHeader === 'function') {
    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const url = `${proto}://${host}${req.url || '/api/link'}`;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
    });

    const response = await handleLinkRequest(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
    return;
  }

  // Edge / Web-standard fallback
  return handleLinkRequest(req);
}
