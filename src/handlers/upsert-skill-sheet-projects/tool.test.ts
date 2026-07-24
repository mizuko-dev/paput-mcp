import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { upsertSkillSheetProjectsTool } from './tool.js';

describe('upsertSkillSheetProjectsTool', () => {
  it('defines paput_upsert_skill_sheet_projects', () => {
    expectToolDefinition(
      upsertSkillSheetProjectsTool,
      'paput_upsert_skill_sheet_projects',
    );
  });
});
