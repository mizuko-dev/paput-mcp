import { setupAi } from './setup-ai.js';
import { exportSkill } from './export-skill.js';
import { setProjectAlias } from './set-project-alias.js';
import { projectHeader } from './project-header.js';

export async function runCli(args: string[]): Promise<boolean> {
  const command = args[0];

  if (!command) {
    printHelp();
    return true;
  }

  if (command === 'setup-ai') {
    setupAi(args.slice(1));
    return true;
  }

  if (command === 'export-skill') {
    try {
      exportSkill(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    return true;
  }

  if (command === 'set-project-alias') {
    try {
      setProjectAlias(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    return true;
  }

  if (command === 'project-header') {
    // MCP クライアントの headersHelper から呼ばれる。失敗しても接続を止めないよう、
    // 例外を空のヘッダ集合へ畳んで必ず exit 0 で返す。
    try {
      projectHeader(args.slice(1));
    } catch {
      console.log('{}');
    }
    return true;
  }

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return true;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
  return true;
}

function printHelp(): void {
  console.log(`Usage:
  paput-mcp setup-ai    Set up PaPut integration for Claude/Codex
  paput-mcp export-skill [name]
                         Export PaPut skill ZIP files for Claude Desktop
  paput-mcp set-project-alias <alias> [path]
                         Pin a PaPut project for a directory (defaults to the
                         current one). The plugin sends it on connect.
                         --list shows the registrations, --remove [path] drops one.
  paput-mcp project-header [dir]
                         Print the PaPut project header as JSON for the given
                         directory. Called by the plugin on connect; always
                         exits 0 and prints {} when nothing resolves.

Options:
  --force               Refresh existing PaPut-managed links and rules
  --no-rules            Do not update global rules
  --rules-only          Update global rules without installing skills
                        (e.g. when skills come from the PaPut plugin)
  --remove-skills       Remove CLI-managed skills and their links
                        (rules are kept; for plugin migration run setup-ai --rules-only afterwards)
  --claude-only         Configure Claude only
  --codex-only          Configure Codex only
  --list                List registered project aliases (set-project-alias)
  --remove [PATH]       Drop the registration for PATH, defaulting to the
                        current directory (set-project-alias)
  -o, --output <PATH>   Output directory or ZIP path for export-skill. Defaults to ~/Downloads

PaPut MCP connections use Remote HTTP mode:
  https://mcp.paput.io/mcp
`);
}
