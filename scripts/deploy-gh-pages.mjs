import { cp, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const distDir = join(rootDir, 'dist');
const push = process.argv.includes('--push');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  run('npm', ['run', 'build'], { cwd: rootDir });
  await assertDirectory(distDir, 'dist does not exist after build');

  run('git', ['fetch', 'origin', 'gh-pages'], { cwd: rootDir });

  const worktree = await mkdtemp(join(tmpdir(), 'beerjs-gh-pages-'));
  run('git', ['worktree', 'add', '--detach', worktree, 'origin/gh-pages'], { cwd: rootDir });

  await assertFile(join(worktree, 'CNAME'), 'CNAME is missing in gh-pages worktree; aborting');
  await cleanWorktree(worktree);
  await cp(distDir, worktree, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });

  run('git', ['status', '--short'], { cwd: worktree, allowEmptyOutput: true });
  run('git', ['diff', '--stat'], { cwd: worktree, allowEmptyOutput: true });
  run('git', ['add', '-A'], { cwd: worktree });

  const status = capture('git', ['status', '--short'], { cwd: worktree });
  if (!status.trim()) {
    console.log(`No gh-pages changes. Worktree: ${worktree}`);
    return;
  }

  run('git', ['commit', '-m', 'Deploy static BeerJS Moscow site'], { cwd: worktree });

  if (push) {
    run('git', ['push', 'origin', 'HEAD:gh-pages'], { cwd: worktree });
    console.log('Pushed gh-pages.');
  } else {
    console.log(`Prepared gh-pages commit without push. Worktree: ${worktree}`);
    console.log('Run npm run deploy:gh-pages -- --push to push automatically.');
  }
}

async function cleanWorktree(worktree) {
  const entries = await readdir(worktree);
  await Promise.all(
    entries
      .filter((entry) => entry !== '.git' && entry !== 'CNAME')
      .map((entry) => rm(join(worktree, entry), { recursive: true, force: true })),
  );
}

async function assertDirectory(path, message) {
  const info = await stat(path).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(message);
  }
}

async function assertFile(path, message) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    throw new Error(message);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: options.allowEmptyOutput ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });

  if (options.allowEmptyOutput && result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (options.allowEmptyOutput && result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result.stdout;
}
