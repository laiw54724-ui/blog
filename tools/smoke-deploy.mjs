const DEFAULT_WEB_BASE = 'https://personal-blog-web.personal-blog.workers.dev';
const DEFAULT_API_BASE = 'https://personal-blog-api.personal-blog.workers.dev';

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'personal-blog-smoke/1.0',
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    },
  });
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkPage(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const { response, text } = await fetchText(url);

  assert(response.ok, `Expected ${url} to return 2xx, got ${response.status}`);

  if (options.mustInclude) {
    assert(
      text.includes(options.mustInclude),
      `Expected ${url} to include "${options.mustInclude}"`
    );
  }

  if (options.mustNotInclude) {
    assert(
      !text.includes(options.mustNotInclude),
      `Expected ${url} not to include "${options.mustNotInclude}"`
    );
  }

  return { url, status: response.status };
}

async function getDetailSlugs(apiBase) {
  const [postRes, articleRes] = await Promise.all([
    fetch(`${apiBase}/api/entries?type=post&visibility=public&limit=1`, {
      headers: { accept: 'application/json' },
    }),
    fetch(`${apiBase}/api/entries?type=article&visibility=public&limit=1`, {
      headers: { accept: 'application/json' },
    }),
  ]);

  assert(postRes.ok, `Failed to fetch public post list: ${postRes.status}`);
  assert(articleRes.ok, `Failed to fetch public article list: ${articleRes.status}`);

  const postJson = await postRes.json();
  const articleJson = await articleRes.json();

  const postSlug = postJson.data?.[0]?.slug;
  const articleSlug = articleJson.data?.[0]?.slug;

  assert(postSlug, 'No public post slug found for smoke test.');
  assert(articleSlug, 'No public article slug found for smoke test.');

  return { postSlug, articleSlug };
}

async function main() {
  const webBase = ensureTrailingSlash(process.env.SMOKE_WEB_BASE || process.argv[2] || DEFAULT_WEB_BASE);
  const apiBase = ensureTrailingSlash(process.env.SMOKE_API_BASE || process.argv[3] || DEFAULT_API_BASE);

  const results = [];

  results.push(await checkPage(webBase, '/', { mustInclude: 'Double River' }));
  results.push(await checkPage(webBase, '/stream', { mustInclude: 'stream' }));
  results.push(await checkPage(webBase, '/articles', { mustInclude: 'articles' }));
  results.push(await checkPage(webBase, '/reading', { mustInclude: 'reading' }));
  results.push(await checkPage(webBase, '/search?q=demo', { mustInclude: 'search' }));
  results.push(await checkPage(webBase, '/favicon.ico'));

  const { postSlug, articleSlug } = await getDetailSlugs(apiBase);
  results.push(await checkPage(webBase, `/post/${encodeURIComponent(postSlug)}`));
  results.push(await checkPage(webBase, `/article/${encodeURIComponent(articleSlug)}`));

  const apiHealth = await fetch(`${apiBase}/api/health`, {
    headers: { accept: 'application/json' },
  });
  assert(apiHealth.ok, `Expected ${apiBase}/api/health to return 2xx, got ${apiHealth.status}`);

  const healthJson = await apiHealth.json().catch(() => null);
  assert(healthJson, 'Expected /api/health to return JSON');

  console.log('Smoke test passed');
  console.table(results);
  console.log(`API health ok: ${apiBase}/api/health`);
}

main().catch((error) => {
  console.error('Smoke test failed');
  console.error(error);
  process.exit(1);
});
