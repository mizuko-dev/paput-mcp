import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { setGoalsTool } from './tool.js';

describe('setGoalsTool', () => {
  it('defines paput_set_goals', () => {
    expectToolDefinition(setGoalsTool, 'paput_set_goals');
  });
});
