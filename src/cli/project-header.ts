import { readFileSync } from 'node:fs';
import { parseLine, projectsFilePath } from './set-project-alias.js';

const ALIAS_PATTERN = /^[a-z0-9]{3,40}$/;

/**
 * 出力は必ず JSON オブジェクト1個。解決できないとき空オブジェクトを返すのは正常系の一部で、
 * 呼び出し元（MCP クライアントの headersHelper）はヘッダを付けずに接続する。
 * 例外を投げないこと・空文字を返さないことが契約。
 */
export function resolveProjectHeaders(
  projectDir: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const alias = resolveAlias(projectDir, env);
  return alias ? { 'X-PaPut-Project-Alias': alias } : {};
}

export function projectHeaderJson(
  projectDir: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return JSON.stringify(resolveProjectHeaders(projectDir, env));
}

function resolveAlias(
  projectDir: string | undefined,
  env: NodeJS.ProcessEnv,
): string | null {
  const fromEnv = env.PAPUT_PROJECT_ALIAS?.trim();
  if (fromEnv) return validate(fromEnv);

  const lines = readConfig(env);
  if (lines.length === 0) return null;

  const dir = normalizeDir(projectDir);
  let fallback: string | null = null;
  let best: { alias: string; length: number } | null = null;

  for (const line of lines) {
    const entry = parseLine(line);
    if (!entry) continue;
    if (!ALIAS_PATTERN.test(entry.alias)) continue;

    if (entry.path === '') {
      fallback ??= entry.alias;
      continue;
    }
    if (dir === null) continue;

    const path = stripTrailingSlashes(entry.path);
    if (path === '') continue;
    // 兄弟ディレクトリが接頭辞を共有していても一致させない（/a/b と /a/bc）。
    if (dir !== path && !dir.startsWith(`${path}/`)) continue;
    if (!best || path.length > best.length) {
      best = { alias: entry.alias, length: path.length };
    }
  }

  return validate(best?.alias ?? fallback ?? '');
}

function readConfig(env: NodeJS.ProcessEnv): string[] {
  if (!env.PAPUT_HOME && !env.HOME && !env.USERPROFILE) return [];
  try {
    return readFileSync(projectsFilePath(env), 'utf8').split('\n');
  } catch {
    // 未設定・権限なし・読めない形式はいずれも「解決できない」に畳む。
    return [];
  }
}

function normalizeDir(projectDir: string | undefined): string | null {
  const value = projectDir?.trim();
  if (!value) return null;
  // ${CLAUDE_PROJECT_DIR} が展開されないクライアントでは、その文字列がそのまま渡る。
  if (value.includes('${')) return null;
  return stripTrailingSlashes(value);
}

function stripTrailingSlashes(value: string): string {
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

function validate(alias: string): string | null {
  return ALIAS_PATTERN.test(alias) ? alias : null;
}

export function projectHeader(args: string[]): void {
  console.log(projectHeaderJson(args[0]));
}
