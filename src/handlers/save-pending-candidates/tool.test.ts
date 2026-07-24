import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { savePendingCandidatesTool } from './tool.js';

describe('savePendingCandidatesTool', () => {
  it('defines paput_save_pending_candidates', () => {
    expectToolDefinition(
      savePendingCandidatesTool,
      'paput_save_pending_candidates',
    );
  });
});
