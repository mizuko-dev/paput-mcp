import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectHeaderJson } from './project-header.js';
import {
  parseLine,
  projectsFilePath,
  setProjectAlias,
} from './set-project-alias.js';

let home: string;
let file: string;
let logs: string[];

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'paput-set-alias-'));
  file = join(home, 'projects');
  process.env.PAPUT_HOME = home;
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.join(' '));
  });
});

afterEach(() => {
  delete process.env.PAPUT_HOME;
  rmSync(home, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function read(): string {
  return readFileSync(file, 'utf8');
}

/** 書き込んだ内容を headersHelper の実装が実際に解決できることまで確認する。 */
function resolveWithHelper(projectDir: string): string {
  const stdout = projectHeaderJson(projectDir, {
    ...process.env,
    PAPUT_PROJECT_ALIAS: '',
    PAPUT_HOME: home,
  } as NodeJS.ProcessEnv);
  const parsed = JSON.parse(stdout) as Record<string, string>;
  return parsed['X-PaPut-Project-Alias'] ?? '';
}

describe('parseLine', () => {
  it('splits on the first run of whitespace and keeps the rest as the path', () => {
    expect(parseLine('paput   /repos/my dir')).toEqual({
      alias: 'paput',
      path: '/repos/my dir',
    });
  });

  it('treats a line without a separator as a default entry', () => {
    expect(parseLine('mydefault')).toEqual({ alias: 'mydefault', path: '' });
  });

  it('ignores comments and blank lines', () => {
    expect(parseLine('# alias\tpath')).toBeNull();
    expect(parseLine('   ')).toBeNull();
  });
});

describe('projectsFilePath', () => {
  it('honours PAPUT_HOME', () => {
    expect(projectsFilePath({ PAPUT_HOME: '/custom' })).toBe(
      '/custom/projects',
    );
  });
});

describe('set-project-alias', () => {
  it('creates the file with a header and registers the given path', () => {
    setProjectAlias(['paput', '/repos/paput']);

    expect(read()).toBe('# alias\tpath\npaput\t/repos/paput\n');
    expect(resolveWithHelper('/repos/paput/sub')).toBe('paput');
    expect(logs.join('\n')).toContain('Added paput -> /repos/paput');
  });

  it('defaults to the current working directory', () => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue('/repos/current');

    setProjectAlias(['currentone']);

    expect(read()).toContain('currentone\t/repos/current');
    cwd.mockRestore();
  });

  it('replaces the alias of an already registered path instead of duplicating', () => {
    setProjectAlias(['paput', '/repos/paput']);
    setProjectAlias(['renamed', '/repos/paput/']);

    expect(read()).toBe('# alias\tpath\nrenamed\t/repos/paput\n');
    expect(resolveWithHelper('/repos/paput')).toBe('renamed');
  });

  it('keeps comments, other entries and the default line untouched', () => {
    writeFileSync(
      file,
      '# alias        path\nother          /repos/other\nmydefault\n',
    );

    setProjectAlias(['paput', '/repos/paput']);

    const content = read();
    expect(content).toContain('# alias        path');
    expect(content).toContain('other          /repos/other');
    expect(content).toContain('mydefault');
    expect(resolveWithHelper('/repos/other')).toBe('other');
    expect(resolveWithHelper('/repos/nowhere')).toBe('mydefault');
    expect(resolveWithHelper('/repos/paput')).toBe('paput');
  });

  it('rejects a malformed alias without touching the file', () => {
    setProjectAlias(['paput', '/repos/paput']);
    const before = read();

    expect(() => setProjectAlias(['Bad Alias', '/repos/x'])).toThrow(
      /Invalid alias/,
    );
    expect(() => setProjectAlias(['ab', '/repos/x'])).toThrow(/Invalid alias/);
    expect(read()).toBe(before);
  });

  it('requires an alias', () => {
    expect(() => setProjectAlias([])).toThrow(/Usage/);
  });

  it('rejects unknown options', () => {
    expect(() => setProjectAlias(['--nope'])).toThrow(/Unknown option/);
  });

  it('removes the entry for a path', () => {
    setProjectAlias(['paput', '/repos/paput']);
    setProjectAlias(['other', '/repos/other']);

    setProjectAlias(['--remove', '/repos/paput']);

    expect(read()).toContain('other\t/repos/other');
    expect(read()).not.toContain('paput\t/repos/paput');
    expect(resolveWithHelper('/repos/paput')).toBe('');
  });

  it('reports when there is nothing to remove', () => {
    setProjectAlias(['paput', '/repos/paput']);

    setProjectAlias(['--remove', '/repos/absent']);

    expect(logs.join('\n')).toContain('No entry for /repos/absent');
    expect(read()).toContain('paput\t/repos/paput');
  });

  it('lists registrations including the default entry', () => {
    setProjectAlias(['paput', '/repos/paput']);
    writeFileSync(file, `${read()}mydefault\n`);

    setProjectAlias(['--list']);

    const output = logs.join('\n');
    expect(output).toContain('paput');
    expect(output).toContain('/repos/paput');
    expect(output).toContain('(default)');
  });

  it('reports an empty registry', () => {
    setProjectAlias(['--list']);

    expect(logs.join('\n')).toContain('No project aliases registered');
  });

  it('appends without leaving a blank line behind', () => {
    writeFileSync(file, '# alias\tpath\npaput\t/repos/paput\n');

    setProjectAlias(['other', '/repos/other']);

    expect(read()).toBe(
      '# alias\tpath\npaput\t/repos/paput\nother\t/repos/other\n',
    );
  });

  it('writes a header when the existing file is empty', () => {
    writeFileSync(file, '');

    setProjectAlias(['paput', '/repos/paput']);

    expect(read()).toBe('# alias\tpath\npaput\t/repos/paput\n');
  });

  it('never removes the default line, even for the root path', () => {
    writeFileSync(file, 'mydefault\npaput\t/repos/paput\n');

    setProjectAlias(['--remove', '/']);

    expect(read()).toContain('mydefault');
    expect(resolveWithHelper('/repos/nowhere')).toBe('mydefault');
  });

  it('treats an equivalent path spelling as the same entry', () => {
    setProjectAlias(['paput', '/repos/paput']);

    setProjectAlias(['renamed', '/repos/sub/../paput/']);

    expect(read()).toBe('# alias\tpath\nrenamed\t/repos/paput\n');
  });

  it('refuses to combine --list with --remove instead of silently listing', () => {
    setProjectAlias(['paput', '/repos/paput']);

    expect(() =>
      setProjectAlias(['--list', '--remove', '/repos/paput']),
    ).toThrow(/cannot be combined/);
    expect(read()).toContain('paput\t/repos/paput');
  });

  it('rejects extra positional arguments instead of dropping them', () => {
    expect(() => setProjectAlias(['paput', '/repos/a', '/repos/b'])).toThrow(
      /Usage/,
    );
    expect(() => setProjectAlias(['--remove', '/repos/a', '/repos/b'])).toThrow(
      /at most one path/,
    );
    expect(() => setProjectAlias(['--list', '/repos/a'])).toThrow(
      /takes no arguments/,
    );
  });

  it('rejects a path containing a line break so no stray default line is written', () => {
    setProjectAlias(['paput', '/repos/paput']);
    const before = read();

    expect(() => setProjectAlias(['paput', '/repos/a\nzzz /'])).toThrow(
      /line break/,
    );
    expect(read()).toBe(before);
    expect(resolveWithHelper('/repos/anywhere')).toBe('');
  });

  it('marks entries the helper would ignore because of a malformed alias', () => {
    writeFileSync(file, 'BadAlias\t/repos/bad\nxy\t/repos/short\n');

    setProjectAlias(['--list']);

    const output = logs.join('\n');
    expect(output).toContain('(ignored: invalid alias)');
    expect(resolveWithHelper('/repos/bad')).toBe('');
  });

  it('round-trips a path containing spaces through the helper', () => {
    setProjectAlias(['spaced', '/repos/my dir']);

    expect(resolveWithHelper('/repos/my dir/sub')).toBe('spaced');
  });
});
