import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // src/pages/sitemap.xml.ts -> ../../content/posts (2 levels up to project root)
  const modules = import.meta.glob('../../content/posts/*.md', { eager: true });

  const posts = Object.entries(modules).map(([path, mod]: [string, any]) => {
    const fm = mod.frontmatter ?? {};
    const slug = fm.slug ?? path.split('/').pop()?.replace(/\.md$/, '');
    const date = fm.date ? new Date(String(fm.date)).toISOString().split('T')[0] : '2026-01-01';
    return { slug, date };
  }).filter(p => p.slug);

  const site = 'https://ai-tools-pro.pages.dev';
  const staticUrls = [
    { loc: `${site}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${site}/posts/`, priority: '0.9', changefreq: 'daily' },
    { loc: `${site}/about/`, priority: '0.5', changefreq: 'monthly' },
  ];
  const articleUrls = posts.map(p => ({
    loc: `${site}/posts/${p.slug}/`,
    lastmod: p.date,
    priority: '0.8',
    changefreq: 'monthly',
  }));

  const allUrls = [...staticUrls, ...articleUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
