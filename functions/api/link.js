/**
 * Cloudflare Pages Function.
 * Deployed as /api/link
 *
 * https://developers.cloudflare.com/pages/functions/
 */
import { handleLinkRequest } from '../../lib/handler.mjs';

export async function onRequest(context) {
  return handleLinkRequest(context.request);
}
