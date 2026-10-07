import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const START = '<!-- TASKS:START -->';
export const END = '<!-- TASKS:END -->';
const API = 'https://api.basedagents.ai/v1/tasks';
const DAY = 86_400_000;

// Entities keep buyer-provided text inert, including inside Markdown link labels.
export function cell(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '|': '&#124;',
    '\\': '&#92;', '[': '&#91;', ']': '&#93;', '`': '&#96;', '*': '&#42;',
    '_': '&#95;', '~': '&#126;' };
  return String(value ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ')
    .replace(/[&<>|\\[\]`*_~]/g, character => entities[character]);
}

export function validateTask(task) {
  if (!task || typeof task !== 'object' || !/^task_[A-Za-z0-9_-]+$/.test(task.task_id)
      || typeof task.title !== 'string' || typeof task.category !== 'string'
      || !Number.isFinite(Date.parse(task.created_at))) {
    throw new Error('Invalid task record; README was not changed.');
  }
  if (task.bounty != null && (typeof task.bounty !== 'object'
      || !/^\d+(\.\d+)?$/.test(String(task.bounty.amount_display))
      || typeof task.bounty.token !== 'string')) {
    throw new Error('Invalid bounty record; README was not changed.');
  }
  return task;
}

export async function fetchTasks(fetchImpl = fetch) {
  const tasks = new Map();
  let pages = 0;
  for (let offset = 0; ; offset += 100) {
    // Fail instead of silently publishing a truncated feed if pagination breaks.
    if (++pages > 100) throw new Error('Feed exceeded 100 pages; README was not changed.');
    const url = new URL(API);
    url.search = new URLSearchParams({ status: 'open', limit: '100', offset: String(offset) });
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'ShadowHarness-TaskReadme/1.0' },
      signal: AbortSignal.timeout(30_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Task feed returned HTTP ${response.status}; README was not changed.`);
    const payload = await response.json();
    if (payload.ok !== true || !Array.isArray(payload.tasks) || payload.tasks.length > 100) {
      throw new Error('Invalid task feed; README was not changed.');
    }
    let added = 0;
    for (const task of payload.tasks) {
      if (task.status !== 'open') continue;
      validateTask(task);
      if (!tasks.has(task.task_id)) added++;
      tasks.set(task.task_id, task);
    }
    if (payload.tasks.length < 100) break;
    if (added === 0) throw new Error('Task pagination did not advance; README was not changed.');
  }
  return { tasks: [...tasks.values()], pages };
}

export function renderTable(tasks, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid rendering date.');
  const today = Math.floor(now.getTime() / DAY);
  const sorted = tasks.filter(task => task.status === 'open').map(validateTask)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      || (a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0));
  const lines = ['| Task | Category | Free / bounty | Age |', '| --- | --- | --- | --- |'];
  for (const task of sorted) {
    const age = Math.max(0, today - Math.floor(Date.parse(task.created_at) / DAY));
    const reward = task.bounty == null ? 'Free' : `${task.bounty.amount_display} ${task.bounty.token}`;
    lines.push(`| [${cell(task.title)}](https://basedagents.ai/tasks/${encodeURIComponent(task.task_id)}) | ${cell(task.category)} | ${cell(reward)} | ${age}d |`);
  }
  if (sorted.length === 0) lines.push('| No open tasks | — | — | — |');
  return lines.join('\n');
}

export function updateReadme(original, table) {
  if (!Buffer.isBuffer(original)) throw new TypeError('README must be a Buffer.');
  const start = Buffer.from(START);
  const end = Buffer.from(END);
  const startAt = original.indexOf(start);
  const endAt = original.indexOf(end);
  const firstLf = original.indexOf(10);
  const newline = firstLf > 0 && original[firstLf - 1] === 13 ? '\r\n' : '\n';
  const section = Buffer.from(newline + table.replace(/\n/g, newline) + newline);
  if (startAt === -1 && endAt === -1) {
    // Never normalize/decode/re-encode existing bytes, even when markers are absent.
    const separator = original.length === 0 ? '' : original[original.length - 1] === 10 ? newline : newline + newline;
    return Buffer.concat([original, Buffer.from(separator), start, section, end, Buffer.from(newline)]);
  }
  if (startAt === -1 || endAt === -1 || endAt < startAt
      || original.indexOf(start, startAt + start.length) !== -1
      || original.indexOf(end, endAt + end.length) !== -1) {
    throw new Error('Expected exactly one ordered marker pair (or no markers); README was not changed.');
  }
  return Buffer.concat([original.subarray(0, startAt + start.length), section, original.subarray(endAt)]);
}

export async function main() {
  const filename = resolve('README.md');
  const original = await readFile(filename);
  const { tasks, pages } = await fetchTasks();
  const next = updateReadme(original, renderTable(tasks));
  const changed = !original.equals(next);
  if (changed) await writeFile(filename, next);
  console.log(`Fetched ${tasks.length} open tasks from ${pages} page(s).`);
  console.log(changed ? 'Updated README.md task section.' : 'No change; skipped README.md write and commit.');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
