import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const ALIAS_PATTERN = /^[a-z0-9]{3,40}$/;
const HEADER = '# alias\tpath';

export interface ProjectEntry {
  alias: string;
  path: string;
}

export function projectsFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.PAPUT_HOME || join(homedir(), '.paput'), 'projects');
}

export function normalizePath(value: string): string {
  if (/[\n\r]/.test(value)) {
    // 1行1エントリの書式なので、改行入りのパスは別行として書き出されてしまう。
    throw new Error('A project path cannot contain a line break.');
  }
  const absolute = resolve(value);
  return absolute.length > 1 ? absolute.replace(/\/+$/, '') : absolute;
}

/**
 * プラグイン同梱の project-header.sh と同じ規則で1行を区切る。
 * alias の形式検証は行わないので、有効性は呼び出し側で判定する。
 */
export function parseLine(line: string): ProjectEntry | null {
  const trimmed = line.replace(/^[ \t]+/, '').replace(/[ \t\r]+$/, '');
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  const match = trimmed.match(/[ \t]+/);
  if (!match || match.index === undefined) {
    return { alias: trimmed, path: '' };
  }
  return {
    alias: trimmed.slice(0, match.index),
    path: trimmed.slice(match.index + match[0].length),
  };
}

function readLines(file: string): string[] {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n');
  // 末尾の空行を落としておかないと、追記のたびに空行が挟まる。
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines;
}

function writeLines(file: string, lines: string[]): void {
  mkdirSync(dirname(file), { recursive: true });
  const body = lines.join('\n').replace(/\n+$/, '');
  writeFileSync(file, body === '' ? '' : `${body}\n`);
}

function formatEntry(alias: string, path: string): string {
  return `${alias}\t${path}`;
}

export function setProjectAlias(args: string[]): void {
  const file = projectsFilePath();
  const positional = args.filter((arg) => !arg.startsWith('-'));
  const flags = args.filter((arg) => arg.startsWith('-'));

  const unknown = flags.find(
    (flag) => flag !== '--list' && flag !== '--remove',
  );
  if (unknown) {
    throw new Error(`Unknown option for set-project-alias: ${unknown}`);
  }
  if (flags.includes('--list') && flags.includes('--remove')) {
    throw new Error('--list and --remove cannot be combined.');
  }

  if (flags.includes('--list')) {
    if (positional.length > 0) {
      throw new Error('--list takes no arguments.');
    }
    const entries = readLines(file)
      .map(parseLine)
      .filter((entry): entry is ProjectEntry => entry !== null);
    if (entries.length === 0) {
      console.log(`No project aliases registered in ${file}`);
      return;
    }
    console.log(file);
    for (const entry of entries) {
      // ヘルパは形式に合わない alias の行を捨てるので、一覧でも有効行と区別する。
      const suffix = ALIAS_PATTERN.test(entry.alias)
        ? ''
        : '  (ignored: invalid alias)';
      console.log(
        entry.path === ''
          ? `  ${entry.alias}\t(default)${suffix}`
          : `  ${entry.alias}\t${entry.path}${suffix}`,
      );
    }
    return;
  }

  if (flags.includes('--remove')) {
    if (positional.length > 1) {
      throw new Error('--remove takes at most one path.');
    }
    const target = normalizePath(positional[0] ?? process.cwd());
    const lines = readLines(file);
    const kept = lines.filter((line) => {
      const entry = parseLine(line);
      // 既定行はパスを持たないので、どのパス指定でも削除対象にしない。
      if (entry === null || entry.path === '') return true;
      return normalizePath(entry.path) !== target;
    });
    if (kept.length === lines.length) {
      console.log(`No entry for ${target} in ${file}`);
      return;
    }
    writeLines(file, kept);
    console.log(`Removed ${target} from ${file}`);
    return;
  }

  const alias = positional[0];
  if (!alias || positional.length > 2) {
    throw new Error(
      'Usage: paput-mcp set-project-alias <alias> [path] | --list | --remove [path]',
    );
  }
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error(
      `Invalid alias "${alias}". Use 3-40 lowercase alphanumeric characters.`,
    );
  }

  const target = normalizePath(positional[1] ?? process.cwd());
  const lines = readLines(file);
  let replaced = false;
  const next = lines.map((line) => {
    const entry = parseLine(line);
    if (entry === null || entry.path === '') return line;
    if (normalizePath(entry.path) !== target) return line;
    replaced = true;
    return formatEntry(alias, target);
  });

  if (!replaced) {
    if (next.length === 0) next.push(HEADER);
    next.push(formatEntry(alias, target));
  }
  writeLines(file, next);
  console.log(
    `${replaced ? 'Updated' : 'Added'} ${alias} -> ${target} in ${file}`,
  );
}
