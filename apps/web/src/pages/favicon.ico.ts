const SVG_FAVICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#4f55c8" />
  <circle cx="22" cy="32" r="6" fill="#fcfbf8" />
  <circle cx="42" cy="32" r="6" fill="#fcfbf8" />
  <rect x="26" y="29" width="12" height="6" rx="3" fill="#fcfbf8" />
</svg>
`.trim();

export function GET() {
  return new Response(SVG_FAVICON, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
