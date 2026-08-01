import { request, type IncomingHttpHeaders } from 'node:http';
import { type AddressInfo, type Server as HttpServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createOnboardingContext,
  normalizeProjectAlias,
  pruneExpiredOnboardingCacheEntries,
  resolveProjectAlias,
  startHttpMcpServer,
} from './http.js';

const serverFactoryCall = vi.hoisted(() => vi.fn());
vi.mock('./server.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./server.js')>();
  return {
    ...original,
    createMcpServer(...args: Parameters<typeof original.createMcpServer>) {
      serverFactoryCall(...args);
      return original.createMcpServer(...args);
    },
  };
});

const testServerOptions = {
  apiUrl: 'https://api.example.test',
};

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

describe('HTTP MCP server security handling', () => {
  const servers: HttpServer[] = [];
  const originalPublicOrigin = process.env.PAPUT_PUBLIC_ORIGIN;

  afterEach(async () => {
    if (originalPublicOrigin === undefined) {
      delete process.env.PAPUT_PUBLIC_ORIGIN;
    } else {
      process.env.PAPUT_PUBLIC_ORIGIN = originalPublicOrigin;
    }
    await Promise.all(servers.splice(0).map(closeHttpServer));
    serverFactoryCall.mockReset();
    vi.restoreAllMocks();
  });

  async function startTestServer(): Promise<number> {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });
    servers.push(httpServer);
    return (httpServer.address() as AddressInfo).port;
  }

  it('serves the health check endpoint', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('serves robots.txt for crawlers', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/robots.txt`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toBe('User-agent: *\nAllow: /\n');
  });

  it('returns 404 for unknown paths', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/unknown`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe('Not found');
  });

  it('serves a landing page for browser GET requests', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { accept: 'text/html' },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('href="/favicon.ico"');
  });

  it('serves the landing page even when crawler-like GET requests include an origin', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: {
        accept: 'text/html',
        origin: 'https://www.google.com',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('serves landing page headers for browser HEAD requests', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'HEAD',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('does not treat root SSE requests as MCP endpoint requests', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { accept: 'text/event-stream' },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe('Not found');
  });

  it('rejects non-POST methods on the MCP endpoint', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('does not accept root as the MCP endpoint', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe('Not found');
  });

  it('redirects authorization server metadata to the API origin', async () => {
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-authorization-server`,
      { redirect: 'manual' },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://api.example.test/.well-known/oauth-authorization-server',
    );
  });

  it('challenges requests with an empty bearer token', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      'resource_metadata=',
    );
  });

  it('challenges requests with a non-bearer authorization scheme', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic dXNlcjpwYXNz',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    expect(response.status).toBe(401);
  });

  it('builds the resource URL from X-Forwarded-Proto when no public origin is set', async () => {
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`,
      { headers: { 'x-forwarded-proto': 'https' } },
    );
    const metadata = await response.json();

    expect(metadata.resource).toBe(`https://127.0.0.1:${port}/mcp`);
  });

  it('prefers PAPUT_PUBLIC_ORIGIN over request headers for the resource URL', async () => {
    process.env.PAPUT_PUBLIC_ORIGIN = 'https://mcp.example.test';
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`,
      { headers: { 'x-forwarded-proto': 'https' } },
    );
    const metadata = await response.json();

    expect(metadata.resource).toBe('https://mcp.example.test/mcp');
  });

  it('rejects a declared Content-Length above 5 MiB before creating an MCP server', async () => {
    const port = await startTestServer();
    const apiFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const body = oversizedToolCallBody();

    const response = await rawPost(port, {
      body,
      headers: { 'content-length': String(Buffer.byteLength(body)) },
    });

    expect(response.status).toBe(413);
    expect(JSON.parse(response.body).error.message).toBe(
      'Request body too large.',
    );
    expect(serverFactoryCall).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects a chunked body above 5 MiB before creating an MCP server', async () => {
    const port = await startTestServer();
    const apiFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const body = oversizedToolCallBody();

    const response = await rawPost(port, { body, chunked: true });

    expect(response.status).toBe(413);
    expect(JSON.parse(response.body).error.message).toBe(
      'Request body too large.',
    );
    expect(serverFactoryCall).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before creating an MCP server', async () => {
    const port = await startTestServer();
    const apiFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const response = await rawPost(port, { body: '{"jsonrpc":' });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body).error.message).toBe('Bad request');
    expect(serverFactoryCall).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('completes the handshake with project_alias without calling the API', async () => {
    // apiUrl は到達不能ホスト。handshake で alias 解決の API を呼ぶと失敗するので、
    // 200 が返ること自体が「解決がツール呼び出し時まで遅延されている」ことの検証になる。
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/mcp?project_alias=paput`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer some-token',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        }),
      },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"serverInfo"');
  });

  it('passes the project alias header through to the MCP server factory', async () => {
    serverFactoryCall.mockClear();
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp?alias=paput`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer some-token',
        'X-PaPut-Project-Alias': 'gaikodb',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"serverInfo"');
    // ヘッダがクエリより優先されて factory まで届いていること。
    expect(serverFactoryCall).toHaveBeenCalled();
    const factoryOptions = serverFactoryCall.mock.calls.at(-1)?.[0];
    expect(factoryOptions?.projectAlias).toBe('gaikodb');
    expect(factoryOptions?.resolveProject).toBeTypeOf('function');
  });

  it('does not reject the request when the project alias header is malformed', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer some-token',
        'X-PaPut-Project-Alias': 'Bad Alias',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"serverInfo"');
  });

  it('rejects a malformed project_alias with a validation error', async () => {
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/mcp?project_alias=Bad Alias`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer some-token',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(-32602);
  });

  it('falls back to localhost when the Host header is malformed', async () => {
    const port = await startTestServer();

    const response = await rawRequest(port, {
      path: '/.well-known/oauth-protected-resource',
      headers: { host: 'bad host header!!' },
    });
    const metadata = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(metadata.resource).toBe('http://localhost/mcp');
  });
});

function rawRequest(
  port: number,
  options: { path: string; headers?: Record<string, string> },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: options.path,
        headers: options.headers,
        setHost: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function rawPost(
  port: number,
  options: {
    body: string;
    headers?: Record<string, string>;
    chunked?: boolean;
  },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      authorization: 'Bearer test-access-token',
      'content-type': 'application/json',
      ...options.headers,
    };
    if (options.chunked) {
      headers['transfer-encoding'] = 'chunked';
    }
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/mcp',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    if (options.chunked) {
      const midpoint = Math.floor(options.body.length / 2);
      req.write(options.body.slice(0, midpoint));
      req.end(options.body.slice(midpoint));
      return;
    }
    req.end(options.body);
  });
}

function oversizedToolCallBody(): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'paput_get_categories',
      arguments: { padding: 'x'.repeat(5 * 1024 * 1024) },
    },
  });
}

async function closeHttpServer(httpServer: HttpServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

describe('normalizeProjectAlias', () => {
  it('treats empty and unexpanded placeholder values as no alias', () => {
    expect(normalizeProjectAlias(null)).toBeNull();
    expect(normalizeProjectAlias('')).toBeNull();
    expect(normalizeProjectAlias('${user_config.project_alias}')).toBeNull();
  });

  it('accepts a valid alias and rejects malformed values', () => {
    expect(normalizeProjectAlias('paput')).toBe('paput');
    expect(normalizeProjectAlias('Pa Put')).toBe(false);
    expect(normalizeProjectAlias('ab')).toBe(false);
  });
});

describe('resolveProjectAlias', () => {
  const url = (search = '') => new URL(`https://mcp.example.test/mcp${search}`);

  it('reads the alias from the header', () => {
    expect(resolveProjectAlias('gaikodb', url())).toBe('gaikodb');
  });

  it('prefers the header over both query parameters', () => {
    expect(
      resolveProjectAlias('gaikodb', url('?project_alias=paput&alias=other')),
    ).toBe('gaikodb');
  });

  it('falls back to the query when no header is present', () => {
    expect(resolveProjectAlias(null, url('?project_alias=paput'))).toBe(
      'paput',
    );
    expect(resolveProjectAlias(undefined, url('?alias=paput'))).toBe('paput');
  });

  it('ignores a malformed header and falls through to the query', () => {
    expect(resolveProjectAlias('Bad Alias', url('?project_alias=paput'))).toBe(
      'paput',
    );
  });

  it('returns no alias for a malformed header without a query', () => {
    expect(resolveProjectAlias('Bad Alias', url())).toBeNull();
    expect(resolveProjectAlias('ab', url())).toBeNull();
  });

  it('treats an unexpanded placeholder header as no alias', () => {
    expect(
      resolveProjectAlias('${user_config.project_alias}', url()),
    ).toBeNull();
  });

  it('keeps rejecting a malformed query so the caller can return 400', () => {
    expect(resolveProjectAlias(null, url('?project_alias=Bad Alias'))).toBe(
      false,
    );
  });

  it('stops evaluating the query once a valid header is found', () => {
    expect(
      resolveProjectAlias('gaikodb', url('?project_alias=Bad Alias')),
    ).toBe('gaikodb');
  });
});

describe('onboarding status cache', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('caches an incomplete status for 10 minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z'));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        onboardingResponse({ memo_count: 0, has_skill_sheet: false }),
      );
    const context = createOnboardingContext(
      'https://api.example.test',
      'incomplete-status-token',
    );

    await context.getStatus();
    vi.advanceTimersByTime(9 * 60 * 1000);
    await context.getStatus();
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60 * 1000);
    await context.getStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caches a completed status for 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z'));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        onboardingResponse({ memo_count: 1, has_skill_sheet: true }),
      );
    const context = createOnboardingContext(
      'https://api.example.test',
      'completed-status-token',
    );

    await context.getStatus();
    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    await context.getStatus();
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60 * 60 * 1000);
    await context.getStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates only the current access token status', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        onboardingResponse({ memo_count: 1, has_skill_sheet: true }),
      );
    const first = createOnboardingContext(
      'https://api.example.test',
      'invalidate-first-token',
    );
    const second = createOnboardingContext(
      'https://api.example.test',
      'invalidate-second-token',
    );

    await first.getStatus();
    await second.getStatus();
    first.invalidateStatus();
    await first.getStatus();
    await second.getStatus();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('allows one nudge per access token every 30 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z'));
    const first = createOnboardingContext(
      'https://api.example.test',
      'cooldown-first-token',
    );
    const sameUser = createOnboardingContext(
      'https://api.example.test',
      'cooldown-first-token',
    );
    const otherUser = createOnboardingContext(
      'https://api.example.test',
      'cooldown-second-token',
    );

    expect(first.claimNudge()).toBe(true);
    first.invalidateStatus();
    expect(sameUser.claimNudge()).toBe(false);
    expect(otherUser.claimNudge()).toBe(true);

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(sameUser.claimNudge()).toBe(true);
  });

  it('reports physically removed status and cooldown entries', async () => {
    pruneExpiredOnboardingCacheEntries(Number.MAX_SAFE_INTEGER);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z'));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      onboardingResponse({ memo_count: 0, has_skill_sheet: false }),
    );
    const expired = createOnboardingContext(
      'https://api.example.test',
      'expired-onboarding-token',
    );
    await expired.getStatus();
    expect(expired.claimNudge()).toBe(true);

    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(pruneExpiredOnboardingCacheEntries()).toEqual({
      statuses: 1,
      cooldowns: 0,
    });
    vi.advanceTimersByTime(60 * 1000);
    expect(pruneExpiredOnboardingCacheEntries()).toEqual({
      statuses: 0,
      cooldowns: 1,
    });
  });

  it('prunes expired entries when a new onboarding context is created', async () => {
    pruneExpiredOnboardingCacheEntries(Number.MAX_SAFE_INTEGER);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z'));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      onboardingResponse({ memo_count: 0, has_skill_sheet: false }),
    );
    const expired = createOnboardingContext(
      'https://api.example.test',
      'implicit-cleanup-token',
    );
    await expired.getStatus();
    expect(expired.claimNudge()).toBe(true);

    vi.advanceTimersByTime(29 * 60 * 1000);
    createOnboardingContext('https://api.example.test', 'status-trigger-token');
    expect(pruneExpiredOnboardingCacheEntries()).toEqual({
      statuses: 0,
      cooldowns: 0,
    });
    vi.advanceTimersByTime(60 * 1000);
    createOnboardingContext(
      'https://api.example.test',
      'cooldown-trigger-token',
    );

    expect(pruneExpiredOnboardingCacheEntries()).toEqual({
      statuses: 0,
      cooldowns: 0,
    });
  });
});

function onboardingResponse(status: {
  memo_count: number;
  has_skill_sheet: boolean;
}): Response {
  return new Response(JSON.stringify(status), { status: 200 });
}
