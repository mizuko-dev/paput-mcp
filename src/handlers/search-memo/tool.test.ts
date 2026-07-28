import { describe, expect, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { searchMemoTool } from './tool.js';

describe('searchMemoTool', () => {
  it('defines paput_search_memo', () => {
    expectToolDefinition(searchMemoTool, 'paput_search_memo');
    expect(searchMemoTool.definition.inputSchema.properties.project_id).toEqual(
      {
        type: 'number',
        description: 'Project ID filter',
      },
    );
    expect(searchMemoTool.definition.description).toContain(
      'compact index entries',
    );
    expect(searchMemoTool.definition.description).toContain('ids:[id]');
  });
});
