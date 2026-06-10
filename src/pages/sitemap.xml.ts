import type { APIRoute } from 'astro';

interface PostFrontmatter {
  slug?: string;
  pubDate?: string;
  date?: string;
  dateModified?: string;
}

const SITE = 'https://toolrouteai.com';

function urlEntry(loc: string, lastmod?: string, priority = '0.7') {
  const safeLastmod = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${safeLastmod}\n    <priority>${priority}</priority>\n  </url>`;
}

function dateOnly(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const englishPosts = import.meta.glob<{ frontmatter: PostFrontmatter }>(
    '../../content/posts/*.md',
    { eager: true }
  );
  const chinesePosts = import.meta.glob<{ frontmatter: PostFrontmatter }>(
    '../../content/posts/zh-cn/*.md',
    { eager: true }
  );

  const staticUrls = [
    [`${SITE}/`, '0.9'],
    [`${SITE}/posts/`, '0.8'],
    [`${SITE}/tools/`, '0.8'],
    [`${SITE}/tools/token-cost-calculator/`, '0.8'],
    [`${SITE}/tools/chatgpt-export-pretty/`, '0.8'],
    [`${SITE}/tools/ai-subscription-tracker/`, '0.8'],
    [`${SITE}/zh-cn/`, '0.8'],
    [`${SITE}/zh-cn/posts/`, '0.7'],
    [`${SITE}/zh-cn/tools/`, '0.7'],
    [`${SITE}/zh-cn/tools/token-cost-calculator/`, '0.7'],
    [`${SITE}/zh-cn/tools/chatgpt-export-pretty/`, '0.7'],
    [`${SITE}/zh-cn/tools/ai-subscription-tracker/`, '0.7'],
    [`${SITE}/about/`, '0.5'],
    [`${SITE}/contact/`, '0.4'],
    [`${SITE}/privacy/`, '0.4'],
    [`${SITE}/terms/`, '0.4'],
    [`${SITE}/affiliate-disclosure/`, '0.4'],
    [`${SITE}/editorial-policy/`, '0.4'],
    [`${SITE}/authors/`, '0.5'],
    [`${SITE}/tags/`, '0.5'],
  ];

  const postUrls = Object.entries(englishPosts).map(([path, mod]) => {
    const fm = mod.frontmatter ?? {};
    const slug = fm.slug ?? path.split('/').pop()?.replace(/\.md$/, '') ?? '';
    return urlEntry(`${SITE}/posts/${slug}/`, dateOnly(fm.dateModified ?? fm.pubDate ?? fm.date), '0.7');
  });

  const zhPostUrls = Object.entries(chinesePosts).map(([path, mod]) => {
    const fm = mod.frontmatter ?? {};
    const slug = fm.slug ?? path.split('/').pop()?.replace(/\.md$/, '') ?? '';
    return urlEntry(`${SITE}/zh-cn/posts/${slug}/`, dateOnly(fm.dateModified ?? fm.pubDate ?? fm.date), '0.6');
  });

  const body = [
    ...staticUrls.map(([loc, priority]) => urlEntry(loc, undefined, priority)),
    ...postUrls,
    ...zhPostUrls,
  ].join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
};
