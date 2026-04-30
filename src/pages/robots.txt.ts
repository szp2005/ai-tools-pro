import type { APIRoute } from 'astro';
export const GET: APIRoute = () =>
  new Response(
    'User-agent: *\nAllow: /\n\nSitemap: https://ai.toolrouteai.com/sitemap.xml\n',
    { headers: { 'Content-Type': 'text/plain' } }
  );
