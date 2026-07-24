import { ToolHandler } from '../../types/index.js';
import { handleUpsertSkillSheetProjects } from './handler.js';

const projectItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'number',
      description: 'Project ID to update. Omit when creating a new project.',
    },
    type: {
      type: 'number',
      description:
        'Project type: 1 business, 2 personal, 3 private (hidden from public profile)',
    },
    title: {
      type: 'string',
      description: 'Project title',
    },
    mcp_alias: {
      type: 'string',
      description:
        'Project alias used in remote MCP URLs. Use 3-40 lowercase alphanumeric characters, e.g. paput.',
    },
    start_period: {
      type: 'string',
      description: 'Start period in YYYY-MM format',
    },
    end_period: {
      type: 'string',
      description: 'End period in YYYY-MM format',
    },
    description: {
      type: 'string',
      description: 'Project description',
    },
    role: {
      type: 'string',
      description: 'Role',
    },
    scale: {
      type: 'string',
      description: 'Team or project scale',
    },
    technologies: {
      type: 'array',
      description: 'Technologies used',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'Technology ID for an existing technology',
          },
          name: {
            type: 'string',
            description: 'Technology name',
          },
        },
        required: ['name'],
      },
    },
    processes: {
      type: 'array',
      description:
        'Development process IDs: 1 requirements, 2 basic design, 3 detailed design, 4 implementation, 5 testing, 6 maintenance',
      items: {
        type: 'number',
      },
    },
    memos: {
      type: 'array',
      description: 'Related memos',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'Memo ID',
          },
          title: {
            type: 'string',
            description: 'Memo title',
          },
        },
        required: ['id', 'title'],
      },
    },
    achievements: {
      type: 'array',
      description:
        'Achievement bullets owned by the user. Omit to keep existing values; pass an empty array to clear them. Maximum 10 items, 100 characters each.',
      maxItems: 10,
      items: {
        type: 'string',
        maxLength: 100,
      },
    },
  },
  required: [
    'type',
    'title',
    'start_period',
    'description',
    'role',
    'scale',
    'technologies',
    'processes',
    'memos',
  ],
};

export const upsertSkillSheetProjectsTool: ToolHandler = {
  definition: {
    name: 'paput_upsert_skill_sheet_projects',
    description:
      'Add or update multiple PaPut skill sheet projects in one tool call. This bulk version does not consume the API rate limit per item, and each project is processed independently so one failure does not block the others. Per item: if an ID is provided the owned project is updated; otherwise an exact title match is updated or a new project is created. Project types 1 and 2 may appear on the public profile; type 3 is private.',
    inputSchema: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          description: 'Projects to add or update',
          items: projectItemSchema,
        },
      },
      required: ['projects'],
    },
  },
  handler: handleUpsertSkillSheetProjects,
};
