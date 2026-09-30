const internalApiUrl = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

const excludedRequestHeaders = new Set(['connection', 'content-length', 'host', 'transfer-encoding']);
const excludedResponseHeaders = new Set(['connection', 'content-encoding', 'content-length', 'set-cookie', 'transfer-encoding']);

function targetUrl(request: Request) {
  const incoming = new URL(request.url);
  const suffix = incoming.pathname.replace(/^\/api\/v1/, '');
  return `${internalApiUrl}${suffix}${incoming.search}`;
}

async function proxy(request: Request) {
  const requestHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!excludedRequestHeaders.has(key.toLowerCase())) requestHeaders.append(key, value);
  });
  if (process.env.WEB_ORIGIN) requestHeaders.set('origin', process.env.WEB_ORIGIN);

  const init: RequestInit = {
    method: request.method,
    headers: requestHeaders,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl(request), init);
  } catch (error) {
    console.error('[RiveraApiProxy] Upstream request failed', {
      method: request.method,
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { statusCode: 503, code: 'API_UNAVAILABLE', message: 'Rivera cannot reach its API right now.' },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!excludedResponseHeaders.has(key.toLowerCase())) responseHeaders.append(key, value);
  });

  const cookieHeaders = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie') as string] : []);
  cookieHeaders.forEach((cookie) => responseHeaders.append('set-cookie', cookie));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const dynamic = 'force-dynamic';
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
