import type { APIRoute } from 'astro';

interface PostFrontmatter {
  title?: string;
  description?: string;
  pubDate?: string;
  date?: string;
  slug?: string;
}

const SITE = 'https://ai.toolrouteai.com';
const TITLE = 'AI Tools Pro';
const DESCRIPTION = `Practical comparisons, workflows, and buying guides for AI tools used by marketers, creators, and automation teams.`;

export const GET: APIRoute = async () => {
  const modules = import.meta.glob<{ frontmatter: PostFrontmatter }>(
    '../../content/posts/*.md',
    { eager: true }
  );

  const items = Object.entries(modules)
    .map(([path, mod]) => {
      const fm = mod.frontmatter ?? {};
      const slug = fm.slug ?? path.split('/').pop()?.replace(/\.md$/, '') ?? '';
      const date = fm.pubDate ?? fm.date ?? '';
      return {
        title: fm.title ?? 'Untitled',
        description: fm.description ?? '',
        url: `${SITE}/posts/${slug}/`,
        date: date ? new Date(date).toUTCString() : new Date().toUTCString(),
        sortKey: date ? new Date(date).getTime() : 0,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    `    <title><![CDATA[${TITLE}]]></title>\n` +
    `    <link>${SITE}</link>\n` +
    `    <description><![CDATA[${DESCRIPTION}]]></description>\n` +
    `    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
    '    <language>en-us</language>\n' +
    items
      .map(
        (i) =>
          '    <item>\n' +
          `      <title><![CDATA[${i.title}]]></title>\n` +
          `      <link>${i.url}</link>\n` +
          `      <guid isPermaLink="true">${i.url}</guid>\n` +
          `      <pubDate>${i.date}</pubDate>\n` +
          `      <description><![CDATA[${i.description}]]></description>\n` +
          '    </item>'
      )
      .join('\n') +
    '\n  </channel>\n</rss>';

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml' } });
};
