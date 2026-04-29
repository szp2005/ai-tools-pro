import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ai-tools-pro.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
