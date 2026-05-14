import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  console.log(`Usage:
  pnpm init:slide <target> [--force] [--no-install] [--name <package-name>]

Examples:
  pnpm init:slide apps/my-talk
  pnpm init:slide ../my-talk
  pnpm init:slide /tmp/my-talk --no-install`);
}

function parseArgs(argv) {
  const out = {
    target: undefined,
    force: false,
    install: true,
    name: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--force' || arg === '-f') {
      out.force = true;
      continue;
    }
    if (arg === '--no-install') {
      out.install = false;
      continue;
    }
    if (arg === '--name' || arg === '-n') {
      const value = argv[i + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      out.name = value;
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    if (out.target) throw new Error(`Unexpected extra argument: ${arg}`);
    out.target = arg;
  }

  if (!out.target) throw new Error('Missing target directory.');
  return out;
}

function run(command, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function isWorkspaceTarget(target) {
  const rel = relative(repoRoot, target);
  if (rel.startsWith('..') || isAbsolute(rel)) return false;
  const parts = rel.split(sep);
  return parts.length === 2 && (parts[0] === 'apps' || parts[0] === 'packages');
}

function quoteShell(value) {
  if (/^[\w./:@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const target = resolve(process.cwd(), opts.target);
  const cliPath = join(repoRoot, 'packages', 'cli', 'dist', 'cli.js');

  console.log('Building local @open-slide/cli...');
  await run('pnpm', ['--filter', '@open-slide/cli', 'build'], repoRoot);

  if (!existsSync(cliPath)) {
    throw new Error(`CLI build did not create ${cliPath}`);
  }

  const initArgs = [cliPath, 'init', target, '--no-install', '--no-git', '--use-pnpm'];
  if (opts.force) initArgs.push('--force');
  if (opts.name) initArgs.push('--name', opts.name);

  console.log('Creating open-slide workspace from this fork...');
  await run('node', initArgs, repoRoot);

  const pkgPath = join(target, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  const workspaceLinked = isWorkspaceTarget(target);
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies['@open-slide/core'] = workspaceLinked
    ? 'workspace:*'
    : `file:${join(repoRoot, 'packages', 'core')}`;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  if (opts.install) {
    console.log(
      workspaceLinked
        ? 'Installing from the repo root...'
        : 'Installing in the new slide workspace...',
    );
    await run('pnpm', ['install'], workspaceLinked ? repoRoot : target);
  }

  const relTarget = relative(repoRoot, target);
  const cdTarget = relTarget.startsWith('..') || isAbsolute(relTarget) ? target : relTarget;

  console.log('\nDone. Next command:');
  if (workspaceLinked) {
    console.log(`  pnpm --filter ${quoteShell(pkg.name)} dev`);
  } else {
    console.log(`  cd ${quoteShell(cdTarget)}`);
    console.log('  pnpm dev');
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
