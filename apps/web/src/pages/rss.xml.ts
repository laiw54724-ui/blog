import { getArticles, getPosts } from '../lib/data'

const SITE = 'https://personal-blog-web.personal-blog.workers.dev'
const FEED_TITLE = 'Double River'
const FEED_DESC = '貼文留下當下，文章留下價值。'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const [articles, posts] = await Promise.all([getArticles(), getPosts()])

  const allEntries = [
    ...articles.map((e) => ({ ...e, urlPrefix: 'article' })),
    ...posts.map((e) => ({ ...e, urlPrefix: 'post' })),
  ]
    .filter((e) => e.slug)
    .sort(
      (a, b) =>
        new Date(b.published_at || b.created_at).getTime() -
        new Date(a.published_at || a.created_at).getTime(),
    )
    .slice(0, 50)

  const items = allEntries
    .map((entry) => {
      const title = escapeXml(entry.title || entry.slug || '')
      const link = `${SITE}/${entry.urlPrefix}/${encodeURIComponent(entry.slug!)}`
      const pubDate = new Date(entry.published_at || entry.created_at).toUTCString()
      const desc = escapeXml(
        (entry.content_markdown || '').replace(/[#*`[\]]/g, '').slice(0, 280),
      )
      return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE}</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>zh-TW</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
