import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { discardPendingCandidatesTool } from './tool.js';

describe('discardPendingCandidatesTool', () => {
  it('defines paput_discard_pending_candidates', () => {
    expectToolDefinition(
      discardPendingCandidatesTool,
      'paput_discard_pending_candidates',
    );
  });
});
