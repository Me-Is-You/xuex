// 本地开发用内嵌 PostgreSQL 服务（仅用于开发/演示环境）
// 数据目录: .pgdata  端口: 5432  库: app_db
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = process.env.PG_DATA_DIR || path.join(root, '.pgdata');

fs.mkdirSync(dataDir, { recursive: true });

const pgBinDir = path.join(root, 'node_modules', '@embedded-postgres', 'linux-x64', 'native', 'bin');

const children = [];
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: dataDir, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    p.stdout?.on('data', d => (out += d));
    p.stderr?.on('data', d => (out += d));
    p.on('error', reject);
    p.on('close', code => resolve({ code, out }));
    children.push(p);
  });
}

const initdb = path.join(pgBinDir, 'initdb');
const pg_ctl = path.join(pgBinDir, 'pg_ctl');
const psql = path.join(pgBinDir, 'psql');
const socketDir = path.join(root, '.pgsock');
fs.mkdirSync(socketDir, { recursive: true });

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  console.log('[pg] initialising data dir ...');
  const init = await run(initdb, [
    '-D', dataDir,
    '-U', 'postgres',
    '--auth', 'trust',
    '--encoding', 'UTF8',
    '-E', 'UTF8',
  ]);
  if (init.code !== 0) {
    console.error('initdb failed:\n' + init.out);
    process.exit(1);
  }
} else {
  console.log('[pg] data dir already initialised');
}

console.log('[pg] starting postgres on port 5432 ...');
const status = await run(pg_ctl, ['status', '-D', dataDir]);
if (status.code !== 0) {
  const start = await run(pg_ctl, [
    'start',
    '-D', dataDir,
    '-o', `-p 5432 -h 127.0.0.1 -k ${socketDir} -c listen_addresses=127.0.0.1`,
    '-l', path.join(root, '.pgdata', 'server.log'),
    '-w',
  ]);
  if (start.code !== 0) {
    console.error('pg_ctl start failed:\n' + start.out);
    process.exit(1);
  }
} else {
  console.log('[pg] already running');
}

// 确保 app_db 存在（embedded-postgres 未捆绑 psql 客户端，改用 node pg）
const { default: pgDefault } = await import('pg');
const { Pool } = pgDefault;
const check = new Pool({ connectionString: 'postgres://postgres@127.0.0.1:5432/postgres' });
const existing = await check.query("SELECT 1 FROM pg_database WHERE datname = 'app_db'");
if (existing.rows.length === 0) {
  await check.query('CREATE DATABASE app_db');
  console.log('[pg] created app_db');
}
await check.end();

console.log('[pg] ready: postgresql://postgres:postgres@127.0.0.1:5432/app_db');

// 保持进程存活；父进程退出时清理
process.on('SIGTERM', async () => {
  await run(pg_ctl, ['stop', '-D', dataDir, '-m', 'fast']);
  process.exit(0);
});
process.on('SIGINT', async () => {
  await run(pg_ctl, ['stop', '-D', dataDir, '-m', 'fast']);
  process.exit(0);
});
setTimeout(() => {}, 1 << 30);
