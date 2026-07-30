import type { McpServer } from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupErrorHandling } from './error-handler.js';

describe('setupErrorHandling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs MCP errors through server.onerror', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lowLevelServer: {
      onerror?: (error: Error) => void;
    } = {};
    const server = {
      server: lowLevelServer,
      close: vi.fn(),
    } as unknown as McpServer;

    setupErrorHandling(server);
    const error = new Error('mcp failed');
    lowLevelServer.onerror?.(error);

    expect(errorSpy).toHaveBeenCalledWith('[MCP Error]', error);
  });
});
