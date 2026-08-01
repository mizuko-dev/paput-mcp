import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(
  new URL('./plugin/bin/project-header.sh', import.meta.url),
);

const tempDirs: string[] = [];

function withConfig(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, 'projects'), lines.join('\n') + '\n');
  return dir;
}

interface HelperResult {
  stdout: string;
  status: number | null;
  /** 出力が JSON オブジェクトとして壊れていないことは契約の一部。 */
  parsed: Record<string, string>;
}

function run(
  projectDir: string,
  env: Record<string, string> = {},
): HelperResult {
  const result = spawnSync('sh', [SCRIPT, projectDir], {
    encoding: 'utf8',
    env: { ...process.env, PAPUT_PROJECT_ALIAS: '', ...env },
  });
  return {
    stdout: result.stdout,
    status: result.status,
    parsed: JSON.parse(result.stdout),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('plugin project header helper', () => {
  it('resolves an exactly matching project directory', () => {
    const cfg = withConfig(['# alias\tpath', 'paput\t/repos/paput']);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('resolves a subdirectory of a registered project', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/paput/paput-front', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('prefers the longest matching path', () => {
    const cfg = withConfig([
      'paput\t/repos/paput',
      'paputapi\t/repos/paput/paput-api',
    ]);

    expect(
      run('/repos/paput/paput-api/internal', { PAPUT_HOME: cfg }).stdout,
    ).toBe('{"X-PaPut-Project-Alias":"paputapi"}');
  });

  it('does not match a sibling directory sharing the same prefix string', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/paput-other', { PAPUT_HOME: cfg }).stdout).toBe('{}');
  });

  it('ignores a trailing slash on the registered path', () => {
    const cfg = withConfig(['paput\t/repos/paput/']);

    expect(run('/repos/paput/sub', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('matches paths containing spaces', () => {
    const cfg = withConfig(['spaced\t/repos/my dir']);

    expect(run('/repos/my dir/sub', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"spaced"}',
    );
  });

  it('uses an alias-only line as the fallback for unregistered paths', () => {
    const cfg = withConfig(['paput\t/repos/paput', 'fallbackalias']);

    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"fallbackalias"}',
    );
    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('lets the environment variable win over the config file', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(
      run('/repos/paput', {
        PAPUT_HOME: cfg,
        PAPUT_PROJECT_ALIAS: 'devmethod',
      }).stdout,
    ).toBe('{"X-PaPut-Project-Alias":"devmethod"}');
  });

  it('drops values that fail the alias format check', () => {
    const cfg = withConfig(['Bad Alias\t/repos/paput', 'ab\t/repos/short']);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe('{}');
    expect(run('/repos/short', { PAPUT_HOME: cfg }).stdout).toBe('{}');
    expect(
      run('/repos/paput', {
        PAPUT_HOME: cfg,
        PAPUT_PROJECT_ALIAS: 'ab',
      }).stdout,
    ).toBe('{}');
  });

  it('returns an empty header set for an unregistered path', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).stdout).toBe('{}');
  });

  it('degrades to an empty header set when the config is missing', () => {
    const result = run('/repos/paput', {
      PAPUT_HOME: '/nonexistent-paput-config',
    });

    expect(result.stdout).toBe('{}');
    expect(result.status).toBe(0);
  });

  it('degrades to an empty header set when the config is unparseable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'projects'), Buffer.from([0, 1, 2, 3, 255, 254]));

    const result = run('/repos/paput', { PAPUT_HOME: dir });

    expect(result.stdout).toBe('{}');
    expect(result.status).toBe(0);
  });

  it('degrades to an empty header set when no project directory is given', () => {
    const cfg = withConfig(['paput\t/repos/paput']);
    const result = spawnSync('sh', [SCRIPT], {
      encoding: 'utf8',
      env: { ...process.env, PAPUT_PROJECT_ALIAS: '', PAPUT_HOME: cfg },
    });

    expect(result.stdout).toBe('{}');
    expect(result.status).toBe(0);
  });

  it('exits with code 0 on every resolution path', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).status).toBe(0);
    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).status).toBe(0);
  });

  it('rejects a multi-line alias instead of emitting broken JSON', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    const result = run('/repos/elsewhere', {
      PAPUT_HOME: cfg,
      PAPUT_PROJECT_ALIAS: 'evil"\nabc',
    });

    expect(result.parsed).toEqual({});
    expect(result.status).toBe(0);
  });

  it('degrades to an empty header set when HOME is unset', () => {
    const result = spawnSync('sh', [SCRIPT, '/repos/paput'], {
      encoding: 'utf8',
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) =>
            key !== 'HOME' &&
            key !== 'PAPUT_HOME' &&
            key !== 'PAPUT_PROJECT_ALIAS',
        ),
      ) as NodeJS.ProcessEnv,
    });

    expect(JSON.parse(result.stdout)).toEqual({});
    expect(result.status).toBe(0);
  });

  it('accepts spaces as the separator so the documented example works verbatim', () => {
    const cfg = withConfig([
      '# alias        path',
      'paput          /repos/paput',
      'gaikodb        /repos/gaiko-db',
      'mydefault',
    ]);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
    expect(run('/repos/gaiko-db/sub', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'gaikodb',
    });
    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'mydefault',
    });
  });

  it('keeps a tab inside the registered path', () => {
    const cfg = withConfig(['tabbed\t/repos/has\ttab/dir']);

    expect(run('/repos/has\ttab/dir/sub', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'tabbed',
    });
  });

  it('tolerates CRLF line endings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, 'projects'),
      'paput\t/repos/paput\r\nfallbackalias\r\n',
    );

    expect(run('/repos/paput', { PAPUT_HOME: dir }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
  });

  it('skips a malformed alias line instead of losing a shorter valid match', () => {
    const cfg = withConfig([
      'paput\t/repos/paput',
      'BAD_ALIAS\t/repos/paput/deep',
    ]);

    expect(run('/repos/paput/deep/x', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
  });

  it('falls back to the default line when the project directory is unexpanded', () => {
    const cfg = withConfig(['paput\t/repos/paput', 'fallbackalias']);

    expect(run('${CLAUDE_PROJECT_DIR}', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'fallbackalias',
    });
  });
});

describe('plugin MCP configuration', () => {
  const claudeConfig = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./plugin/mcp/claude.json', import.meta.url)),
      'utf8',
    ),
  ) as {
    mcpServers: Record<string, { url: string; headersHelper?: string }>;
  };

  it('keeps the bundled URL free of a project alias query', () => {
    expect(claudeConfig.mcpServers.paput.url).toBe('https://mcp.paput.io/mcp');
  });

  it('wires the headers helper to the bundled script and the project directory', () => {
    const helper = claudeConfig.mcpServers.paput.headersHelper ?? '';

    expect(helper).toContain('${CLAUDE_PLUGIN_ROOT}/bin/project-header.sh');
    expect(helper).toContain('${CLAUDE_PROJECT_DIR}');
    expect(existsSync(SCRIPT)).toBe(true);
  });
});
