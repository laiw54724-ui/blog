import { getArticles, getPosts } from '../lib/data'

const SITE = 'https://personal-blog-web.personal-blog.workers.dev'

const STATIC_ROUTES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/about', priority: '0.8', changefreq: 'monthly' },
  { loc: '/stream', priority: '0.9', changefreq: 'daily' },
  { loc: '/articles', priority: '0.9', changefreq: 'weekly' },
  { loc: '/search', priority: '0.5', changefreq: 'monthly' },
  { loc: '/tags', priority: '0.6', changefreq: 'weekly' },
]

export async function GET() {
  const [articles, posts] = await Promise.all([getArticles(), getPosts()])

  const articleUrls = articles
    .filter((e) => e.slug)
    .map((e) => ({
      loc: `/article/${encodeURIComponent(e.slug!)}`,
      lastmod: (e.published_at || e.created_at).slice(0, 10),
      priority: '0.8',
      changefreq: 'monthly',
    }))

  const postUrls = posts
    .filter((e) => e.slug)
    .map((e) => ({
      loc: `/post/${encodeURIComponent(e.slug!)}`,
      lastmod: e.created_at.slice(0, 10),
      priority: '0.6',
      changefreq: 'never',
    }))

  const allUrls = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: new Date().toISOString().slice(0, 10) })),
    ...articleUrls,
    ...postUrls,
  ]

  const urlElements = allUrls
    .map(
      (u) => `
  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlElements}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
