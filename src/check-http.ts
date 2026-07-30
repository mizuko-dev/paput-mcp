#!/usr/bin/env node

import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';

const MODERN_PROTOCOL_VERSION = '2026-07-28';

const endpoint = process.env.MCP_HTTP_URL ?? process.argv[2];
const accessToken = process.env.MCP_ACCESS_TOKEN;

if (!endpoint) {
  console.error(
    'Usage: MCP_HTTP_URL=https://example.onrender.com npm run check:http',
  );
  process.exit(1);
}

const client = new Client(
  {
    name: 'paput-mcp-http-check',
    version: '1.0.0',
  },
  {
    capabilities: {},
    versionNegotiation: {
      mode: { pin: MODERN_PROTOCOL_VERSION },
    },
  },
);

try {
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
  await client.connect(transport);
  if (client.getProtocolEra() !== 'modern') {
    throw new Error(
      `Expected modern protocol era, got ${String(client.getProtocolEra())}`,
    );
  }

  const result = await client.listTools();
  const toolNames = result.tools.map((tool) => tool.name);
  if (toolNames.length !== 39) {
    throw new Error(`Expected 39 tools, got ${toolNames.length}`);
  }

  console.log(`Connected to ${endpoint}`);
  console.log(`Protocol era: ${client.getProtocolEra()}`);
  console.log(`Tools: ${toolNames.length}`);
  console.log(toolNames.join('\n'));
} finally {
  await client.close();
}
