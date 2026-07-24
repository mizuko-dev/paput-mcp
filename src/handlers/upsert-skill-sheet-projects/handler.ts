import { ApiClient } from '../../services/api/client.js';
import {
  bulkUpsertSkillSheetProjects,
  type BulkUpsertProjectResult,
} from '../../services/api/skill-sheet.js';
import type { UpsertSkillSheetProjectParams } from '../../types/index.js';
import { parseProjectParams } from './params.js';

export async function handleUpsertSkillSheetProjects(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.projects)) {
    return {
      content: [{ type: 'text', text: 'projects must be an array' }],
      isError: true,
    };
  }

  const localFailed: BulkUpsertProjectResult[] = [];
  const validProjects: UpsertSkillSheetProjectParams[] = [];
  const originalIndexes: number[] = [];

  for (const [index, rawProject] of args.projects.entries()) {
    if (typeof rawProject !== 'object' || rawProject === null) {
      localFailed.push({
        index,
        id: null,
        title: '',
        action: 'failed',
        error: 'Project item must be an object',
      });
      continue;
    }

    const project = parseProjectParams(rawProject as Record<string, unknown>);
    if (!project) {
      const rawTitle = (rawProject as Record<string, unknown>).title;
      localFailed.push({
        index,
        id: null,
        title: typeof rawTitle === 'string' ? rawTitle : '',
        action: 'failed',
        error: 'Project information is incomplete',
      });
      continue;
    }

    validProjects.push(project);
    originalIndexes.push(index);
  }

  let apiResults: BulkUpsertProjectResult[];
  if (validProjects.length === 0) {
    apiResults = [];
  } else {
    try {
      const response = await bulkUpsertSkillSheetProjects(
        apiClient,
        validProjects,
      );
      apiResults = response.results.map((result) => ({
        ...result,
        index: originalIndexes[result.index] ?? result.index,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      apiResults = validProjects.map((project, index) => ({
        index: originalIndexes[index] ?? index,
        id: project.id ?? null,
        title: project.title,
        action: 'failed',
        error: message,
      }));
    }
  }

  const results = [...localFailed, ...apiResults].sort(
    (a, b) => a.index - b.index,
  );
  const createdCount = results.filter(
    (result) => result.action === 'created',
  ).length;
  const updatedCount = results.filter(
    (result) => result.action === 'updated',
  ).length;
  const failedCount = results.filter(
    (result) => result.action === 'failed',
  ).length;

  const response = {
    success: failedCount === 0,
    created_count: createdCount,
    updated_count: updatedCount,
    failed_count: failedCount,
    results,
  };

  return {
    structuredContent: response,
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    isError: failedCount > 0,
  };
}
