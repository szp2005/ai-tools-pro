import type { APIRoute } from 'astro';
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: https://ai.toolrouteai.com/sitemap.xml
`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
