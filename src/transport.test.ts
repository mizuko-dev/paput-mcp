import { type AddressInfo } from 'node:net';
import { createServer as createNodeServer } from 'node:http';
import {
  Client,
  InMemoryTransport,
  INVALID_PARAMS,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import {
  fromJsonSchema,
  McpServer,
  type JsonSchemaType,
} from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startHttpMcpServer } from './http.js';
import { createMcpServer } from './server.js';
import { getRegisteredTools } from './tool.js';

const testServerOptions = {
  apiUrl: 'https://api.example.test',
};
const MODERN_PROTOCOL_VERSION = '2026-07-28';

const clients: Client[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  vi.restoreAllMocks();
});

describe('MCP transports', () => {
  it('serves registered tools through an in-memory transport', async () => {
    const mcpServer = createMcpServer(testServerOptions);
    const client = createTestClient();
    clients.push(client);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toContain(
      'paput_search_memo',
    );
    expect(result.tools.map((tool) => tool.name)).toContain(
      'paput_create_memos',
    );
    expect(result.tools).toHaveLength(39);
    expect(
      result.tools.every((tool) => tool.outputSchema?.type === 'object'),
    ).toBe(true);
    expect(client.getInstructions()).toContain(
      'When a tool response includes an onboarding notice',
    );
    const definitions = getRegisteredTools().map((tool) => tool.definition);
    for (const [index, tool] of result.tools.entries()) {
      expect(tool).toMatchObject(definitions[index]);
    }

    const resources = await client.listResources();
    expect(resources.resources).toEqual([
      expect.objectContaining({
        uri: 'paput://tools',
        name: 'PaPut MCP tools',
        mimeType: 'application/json',
      }),
    ]);
    const resource = await client.readResource({ uri: 'paput://tools' });
    const resourceTools = JSON.parse(
      (resource.contents[0] as { text: string }).text,
    ) as Array<{ name: string }>;
    expect(resourceTools.map((tool) => tool.name)).toEqual(
      definitions.map((tool) => tool.name),
    );

    await mcpServer.close();
  });

  it('serves registered tools through Streamable HTTP', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient();
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          requestInit: {
            headers: { Authorization: 'Bearer test-access-token' },
          },
        },
      );

      await client.connect(transport);
      const result = await client.listTools();

      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_search_memo',
      );
      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_create_memos',
      );
      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_mark_processed_sessions',
      );
      expect(result).not.toHaveProperty('ttlMs');
      expect(result).not.toHaveProperty('cacheScope');
    } finally {
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
  });

  it.each([
    ['auto', 'auto' as const],
    ['pinned', { pin: MODERN_PROTOCOL_VERSION }],
  ])(
    'negotiates the modern era through Streamable HTTP (%s)',
    async (_label, mode) => {
      const httpServer = await startHttpMcpServer({
        ...testServerOptions,
        host: '127.0.0.1',
        port: 0,
      });

      try {
        const address = httpServer.address() as AddressInfo;
        const client = createTestClient({
          capabilities: {},
          versionNegotiation: { mode },
        });
        clients.push(client);
        const transport = new StreamableHTTPClientTransport(
          new URL(`http://127.0.0.1:${address.port}/mcp`),
          {
            requestInit: {
              headers: { Authorization: 'Bearer test-access-token' },
            },
          },
        );

        await client.connect(transport);
        const result = await client.listTools();
        const resources = await client.listResources();
        const resource = await client.readResource({ uri: 'paput://tools' });

        expect(client.getProtocolEra()).toBe('modern');
        expect(result.tools).toHaveLength(39);
        expect(client.getDiscoverResult()).toMatchObject({
          ttlMs: 300_000,
          cacheScope: 'public',
        });
        expect(result).toMatchObject({
          ttlMs: 300_000,
          cacheScope: 'private',
        });
        expect(resources).toMatchObject({
          ttlMs: 3_600_000,
          cacheScope: 'public',
        });
        expect(resource).toMatchObject({
          ttlMs: 300_000,
          cacheScope: 'private',
        });
      } finally {
        await closeHttpServer(httpServer);
      }
    },
  );

  it('keeps alias-specific tool schemas private without resolving the alias during discover', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient({
        capabilities: {},
        versionNegotiation: { mode: 'auto' },
      });
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: 'Bearer test-access-token',
              'X-PaPut-Project-Alias': 'paput',
            },
          },
        },
      );

      await client.connect(transport);
      const result = await client.listTools();
      const projectContext = result.tools.find(
        (tool) => tool.name === 'paput_get_project_context',
      );

      expect(client.getProtocolEra()).toBe('modern');
      expect(result.cacheScope).toBe('private');
      expect(projectContext?.inputSchema.properties).not.toHaveProperty(
        'project',
      );
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('rejects invalid modern tool arguments before the handler runs', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient({
        capabilities: {},
        versionNegotiation: {
          mode: { pin: MODERN_PROTOCOL_VERSION },
        },
      });
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          requestInit: {
            headers: { Authorization: 'Bearer test-access-token' },
          },
        },
      );

      await client.connect(transport);
      const result = await client.callTool({
        name: 'paput_search_memo',
        arguments: { query: 42 },
      });
      expect(result).toMatchObject({
        isError: true,
        content: [
          expect.objectContaining({
            text: expect.stringContaining('Invalid arguments'),
          }),
        ],
      });
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('validates Mcp-Param headers before dispatching typed tool arguments', async () => {
    const handler = vi.fn((args: Record<string, unknown>) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(args) }],
    }));
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
      mcpServerFactory: () => {
        const server = new McpServer({
          name: 'mcp-param-oracle',
          version: '1.0.0',
        });
        server.registerTool(
          'header-param-tool',
          {
            inputSchema: fromJsonSchema<Record<string, unknown>>({
              type: 'object',
              properties: {
                tenant: {
                  type: 'integer',
                  'x-mcp-header': 'Tenant',
                },
              },
              required: ['tenant'],
            } as JsonSchemaType),
          },
          async (args) => handler(args),
        );
        return server;
      },
    });
    const captured: Array<{
      url: string;
      headers: Headers;
      body: string;
    }> = [];
    const nativeFetch = globalThis.fetch;
    const captureFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const request = new Request(input, init);
      if (request.method === 'POST') {
        captured.push({
          url: request.url,
          headers: new Headers(request.headers),
          body: await request.clone().text(),
        });
      }
      return await nativeFetch(request);
    };

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient({
        capabilities: {},
        versionNegotiation: {
          mode: { pin: MODERN_PROTOCOL_VERSION },
        },
      });
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          fetch: captureFetch,
          requestInit: {
            headers: { Authorization: 'Bearer test-access-token' },
          },
        },
      );

      await client.connect(transport);
      await client.listTools();
      const result = await client.callTool({
        name: 'header-param-tool',
        arguments: { tenant: 42 },
      });

      expect(result.isError).not.toBe(true);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ tenant: 42 });
      const normalRequest = captured.find(
        (request) => JSON.parse(request.body).method === 'tools/call',
      );
      expect(normalRequest?.headers.get('Mcp-Param-Tenant')).toBe('42');

      const invalidBody = JSON.parse(normalRequest!.body) as {
        params: { arguments: { tenant: unknown } };
      };
      invalidBody.params.arguments.tenant = 'not-an-integer';
      const invalidHeaders = new Headers(normalRequest?.headers);
      invalidHeaders.set('Mcp-Param-Tenant', 'not-an-integer');
      const invalidResponse = await nativeFetch(normalRequest!.url, {
        method: 'POST',
        headers: invalidHeaders,
        body: JSON.stringify(invalidBody),
      });
      const invalidResult = await invalidResponse.json();

      expect(invalidResponse.status).toBe(200);
      expect(JSON.stringify(invalidResult)).toContain('Invalid arguments');
      expect(handler).toHaveBeenCalledOnce();
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('rejects modern header/body method and tool-name mismatches', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });
    const captured: Array<{
      url: string;
      headers: Headers;
      body: string;
    }> = [];
    const apiCalls: string[] = [];
    const nativeFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (request.url === 'https://api.example.test/api/v1/mcp/categories') {
        apiCalls.push(request.url);
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return await nativeFetch(request);
    });
    const captureFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const request = new Request(input, init);
      if (request.method === 'POST') {
        captured.push({
          url: request.url,
          headers: new Headers(request.headers),
          body: await request.clone().text(),
        });
      }
      return await nativeFetch(request);
    };

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient({
        capabilities: {},
        versionNegotiation: {
          mode: { pin: MODERN_PROTOCOL_VERSION },
        },
      });
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          fetch: captureFetch,
          requestInit: {
            headers: { Authorization: 'Bearer test-access-token' },
          },
        },
      );

      await client.connect(transport);
      await client.listTools();
      const successfulCall = await client.callTool({
        name: 'paput_get_categories',
        arguments: {},
      });
      expect(successfulCall.isError).not.toBe(true);
      expect(apiCalls).toHaveLength(1);

      const listRequest = captured.find(
        (request) => JSON.parse(request.body).method === 'tools/list',
      );
      const callRequest = captured.find(
        (request) => JSON.parse(request.body).method === 'tools/call',
      );
      expect(listRequest).toBeDefined();
      expect(callRequest).toBeDefined();

      const methodHeaders = new Headers(listRequest?.headers);
      methodHeaders.set('Mcp-Method', 'tools/call');
      const methodMismatch = await fetch(listRequest!.url, {
        method: 'POST',
        headers: methodHeaders,
        body: listRequest!.body,
      });
      expect(methodMismatch.status).toBe(400);
      await expect(methodMismatch.json()).resolves.toMatchObject({
        error: expect.objectContaining({ code: expect.any(Number) }),
      });

      const nameHeaders = new Headers(callRequest?.headers);
      nameHeaders.set('Mcp-Name', 'paput_search_memo');
      const nameMismatch = await nativeFetch(callRequest!.url, {
        method: 'POST',
        headers: nameHeaders,
        body: callRequest!.body,
      });
      expect(nameMismatch.status).toBe(400);
      await expect(nameMismatch.json()).resolves.toMatchObject({
        error: expect.objectContaining({ code: expect.any(Number) }),
      });
      expect(apiCalls).toHaveLength(1);
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('does not let a pinned modern check pass against a legacy-only entry', async () => {
    const legacyOnly = createNodeServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
      }
      const message = JSON.parse(body) as { id?: string | number };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32601, message: 'Method not found' },
        }),
      );
    });
    await new Promise<void>((resolve) =>
      legacyOnly.listen(0, '127.0.0.1', resolve),
    );

    try {
      const address = legacyOnly.address() as AddressInfo;
      const client = createTestClient({
        capabilities: {},
        versionNegotiation: {
          mode: { pin: MODERN_PROTOCOL_VERSION },
        },
      });
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
      );

      await expect(client.connect(transport)).rejects.toThrow();
      expect(client.getProtocolEra()).toBeUndefined();
    } finally {
      await closeHttpServer(legacyOnly);
    }
  });

  it('returns a JSON-RPC protocol error for an unknown tool', async () => {
    const mcpServer = createMcpServer(testServerOptions);
    const client = createTestClient();
    clients.push(client);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    await expect(
      client.callTool({ name: 'paput_unknown_tool', arguments: {} }),
    ).rejects.toMatchObject({
      code: INVALID_PARAMS,
      message: expect.stringContaining('paput_unknown_tool'),
    });

    await mcpServer.close();
  });

  it('returns an explicit error when a tool needs authentication but none is configured', async () => {
    const mcpServer = createMcpServer(testServerOptions);
    const client = createTestClient();
    clients.push(client);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.callTool({
      name: 'paput_search_memo',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining(
            'PaPut authentication is not configured',
          ),
        }),
      ]),
    );

    await mcpServer.close();
  });

  it('publishes OAuth protected resource metadata', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource`,
      );
      const metadata = await response.json();

      expect(response.status).toBe(200);
      expect(metadata.resource).toBe(`http://127.0.0.1:${address.port}/mcp`);
      expect(metadata.resource_name).toBe('PaPut');
      expect(metadata.authorization_servers).toEqual([
        'https://api.example.test',
      ]);
      expect(metadata.scopes_supported).toEqual(['paput.read', 'paput.write']);
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('challenges unauthenticated HTTP MCP requests', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain(
        `resource_metadata="http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource"`,
      );
      expect(response.headers.get('www-authenticate')).toContain(
        'scope="paput.read paput.write"',
      );
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('rejects HTTP MCP requests from disallowed origins', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: ['https://allowed.example.test'],
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example.test',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.message).toBe('Forbidden origin.');
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('allows HTTP MCP requests from configured origins', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: ['https://allowed.example.test'],
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://allowed.example.test',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });

      expect(response.status).toBe(401);
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('serves common icon requests from PaPut frontend assets', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/favicon.ico`,
        { redirect: 'manual' },
      );

      // 上流 200 直接配信、失敗時は 307 フォールバック。
      expect([200, 307]).toContain(response.status);
      if (response.status === 307) {
        expect(response.headers.get('location')).toBe(
          'https://paput.io/favicon.ico',
        );
      } else {
        expect(response.headers.get('content-type')).toBeTruthy();
      }
    } finally {
      await closeHttpServer(httpServer);
    }
  });
});

function createTestClient(
  versionNegotiation?: ConstructorParameters<typeof Client>[1],
): Client {
  return new Client(
    {
      name: 'paput-mcp-transport-test',
      version: '1.0.0',
    },
    { capabilities: {}, ...versionNegotiation },
  );
}

async function closeHttpServer(
  httpServer: Awaited<ReturnType<typeof startHttpMcpServer>>,
) {
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
