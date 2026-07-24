import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updatePendingCandidatesTool } from './tool.js';

describe('updatePendingCandidatesTool', () => {
  it('defines paput_update_pending_candidates', () => {
    expectToolDefinition(
      updatePendingCandidatesTool,
      'paput_update_pending_candidates',
    );
  });
});
