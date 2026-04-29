import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const modules = import.meta.glob('../../../content/posts/*.md', { eager: true });

  const posts = Object.entries(modules).map(([path, mod]: [string, any]) => {
    const fm = mod.frontmatter ?? {};
    const slug = fm.slug ?? path.split('/').pop()?.replace(/\.md$/, '');
    const date = fm.date ? new Date(fm.date).toISOString().split('T')[0] : '2026-01-01';
    return { slug, date };
  });

  const site = 'https://ai-tools-pro.pages.dev';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${site}/posts/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${posts.map(p => `<url>
    <loc>${site}/posts/${p.slug}/</loc>
    <lastmod>${p.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n  ')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
