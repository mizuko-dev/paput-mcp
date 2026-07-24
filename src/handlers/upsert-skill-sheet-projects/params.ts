import type { UpsertSkillSheetProjectParams } from '../../types/index.js';

export function parseProjectParams(
  params: Record<string, unknown> | undefined,
): UpsertSkillSheetProjectParams | undefined {
  if (!params) return undefined;
  if (
    typeof params.type !== 'number' ||
    typeof params.title !== 'string' ||
    typeof params.start_period !== 'string' ||
    typeof params.description !== 'string' ||
    typeof params.role !== 'string' ||
    typeof params.scale !== 'string' ||
    !Array.isArray(params.technologies) ||
    !Array.isArray(params.processes) ||
    !Array.isArray(params.memos)
  ) {
    return undefined;
  }

  const technologies = params.technologies.filter(isTechnology);
  const processes = params.processes.filter(
    (process): process is number => typeof process === 'number',
  );
  const memos = params.memos.filter(isSkillSheetMemo);

  if (
    technologies.length !== params.technologies.length ||
    processes.length !== params.processes.length ||
    memos.length !== params.memos.length
  ) {
    return undefined;
  }

  const project: UpsertSkillSheetProjectParams = {
    type: params.type,
    title: params.title,
    start_period: params.start_period,
    description: params.description,
    role: params.role,
    scale: params.scale,
    technologies,
    processes,
    memos,
  };

  if (typeof params.id === 'number') {
    project.id = params.id;
  }
  if (typeof params.end_period === 'string' || params.end_period === null) {
    project.end_period = params.end_period;
  }
  if (typeof params.mcp_alias === 'string') {
    project.mcp_alias = params.mcp_alias;
  }
  if (Array.isArray(params.achievements)) {
    if (!params.achievements.every((item) => typeof item === 'string')) {
      return undefined;
    }
    project.achievements = params.achievements;
  }

  return project;
}

function isTechnology(value: unknown): value is { id?: number; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    (!('id' in value) || typeof value.id === 'number')
  );
}

function isSkillSheetMemo(
  value: unknown,
): value is { id: number; title: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}
