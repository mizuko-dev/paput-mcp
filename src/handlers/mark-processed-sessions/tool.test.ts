import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { markProcessedSessionsTool } from './tool.js';

describe('markProcessedSessionsTool', () => {
  it('defines paput_mark_processed_sessions', () => {
    expectToolDefinition(markProcessedSessionsTool, 'paput_mark_processed_sessions');
  });
});
