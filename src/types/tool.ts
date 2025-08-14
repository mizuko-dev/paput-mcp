import { ApiClient } from '../services/api/client.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolHandler {
  definition: ToolDefinition;
  handler: (
    args: Record<string, unknown> | undefined,
    apiClient: ApiClient,
  ) => Promise<any>;
}
