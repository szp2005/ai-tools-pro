export function GET() {
  return new Response(`User-agent: *
Allow: /

Sitemap: https://ai-tools-pro.pages.dev/sitemap.xml
`);
}
