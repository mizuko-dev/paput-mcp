import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/server';
import { setupTool } from './tool.js';
import { setupErrorHandling } from './utils/error-handler.js';
import type {
  OnboardingContext,
  ResolvedProjectContext,
} from './types/index.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export interface MCPServerOptions {
  apiUrl?: string;
  accessToken?: string;
  projectId?: number;
  projectTitle?: string;
  projectAlias?: string;
  resolveProject?: () => Promise<ResolvedProjectContext | null>;
  onboarding?: OnboardingContext;
}

export function createMcpServer(options: MCPServerOptions = {}): McpServer {
  const accessToken = options.accessToken;
  const apiUrl =
    options.apiUrl ?? process.env.PAPUT_API_URL ?? 'https://api.paput.io';

  const server = new McpServer(
    {
      name: 'paput-mcp',
      title: 'PaPut',
      version: packageJson.version,
      websiteUrl: 'https://paput.io',
      icons: [
        {
          src: 'https://paput.io/icons/icon-192x192.png',
          mimeType: 'image/png',
          sizes: ['192x192'],
        },
        {
          src: 'https://paput.io/icons/icon-512x512.png',
          mimeType: 'image/png',
          sizes: ['512x512'],
        },
      ],
    },
    {
      instructions:
        'When a tool response includes an onboarding notice, offer to guide the user through the initial PaPut setup. Treat the notice as guidance and keep the user in control of any local reads or writes.',
      cacheHints: {
        'server/discover': {
          ttlMs: 300_000,
          cacheScope: 'public',
        },
        'tools/list': {
          ttlMs: 300_000,
          cacheScope: 'private',
        },
        'resources/list': {
          ttlMs: 3_600_000,
          cacheScope: 'public',
        },
        'resources/read': {
          ttlMs: 300_000,
          cacheScope: 'private',
        },
      },
    },
  );

  setupTool(server, apiUrl, accessToken, {
    projectId: options.projectId,
    projectTitle: options.projectTitle,
    projectAlias: options.projectAlias,
    resolveProject: options.resolveProject,
    onboarding: options.onboarding,
  });
  setupErrorHandling(server);

  return server;
}
