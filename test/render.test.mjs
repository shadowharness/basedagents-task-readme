import test from 'node:test';
import assert from 'node:assert/strict';
import { START, END, cell, renderTable, updateReadme, fetchTasks } from '../scripts/render.mjs';

const task = (id = 'a', overrides = {}) => ({ task_id: `task_${id}`, title: 'An open task',
  category: 'automation', created_at: '2026-10-01T18:00:00Z', status: 'open', bounty: null, ...overrides });
const now = new Date('2026-10-07T12:00:00Z');

test('only bytes inside markers change, preserving BOM, CRLF, binary bytes and no final newline', () => {
  const prefix = Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from('前文\r\n' + START)]);
  const suffix = Buffer.concat([Buffer.from(END + '\r\n後文'), Buffer.from([255, 0, 128])]);
  const source = Buffer.concat([prefix, Buffer.from('\r\nold\r\n'), suffix]);
  const result = updateReadme(source, renderTable([task()], now));
  assert.deepEqual(result.subarray(0, prefix.length), prefix);
  assert.deepEqual(result.subarray(result.length - suffix.length), suffix);
  assert.ok(result.includes(Buffer.from('\r\n| Task')));
  assert.deepEqual(updateReadme(result, renderTable([task()], now)), result);
});

test('missing markers append at EOF without changing any existing bytes', () => {
  for (const source of [Buffer.alloc(0), Buffer.from('no newline'), Buffer.from('CRLF\r\n'), Buffer.from([255, 128])]) {
    const result = updateReadme(source, renderTable([], now));
    assert.deepEqual(result.subarray(0, source.length), source);
    assert.ok(result.includes(Buffer.from(START)));
    assert.ok(result.includes(Buffer.from(END)));
    assert.deepEqual(updateReadme(result, renderTable([], now)), result);
  }
});

test('ambiguous or partial markers fail without mutating the input', () => {
  for (const text of [START, END, END + START, START + START + END, START + END + END]) {
    const source = Buffer.from(text);
    assert.throws(() => updateReadme(source, 'table'), /marker pair/);
    assert.equal(source.toString(), text);
  }
});

test('pipes, Markdown links, HTML and multiline values stay inert within four cells', () => {
  const table = renderTable([task('safe', { title: 'Pipe | [link](https://example.test) <img> \\ *bold*\nnext',
    category: 'code|data', bounty: { amount_display: '1.25', token: 'USDC' } })], now);
  assert.equal(table.split('\n')[2].split('|').length, 6);
  assert.ok(table.includes('Pipe &#124; &#91;link&#93;'));
  assert.ok(table.includes('&lt;img&gt;'));
  assert.ok(table.includes('1.25 USDC'));
  assert.ok(table.includes('https://basedagents.ai/tasks/task_safe'));
  assert.equal(cell('&amp;'), '&amp;amp;');
});

test('stable ordering, open-only selection and UTC calendar-day ages allow unchanged reruns', () => {
  const rows = [task('b'), task('a'), task('closed', { status: 'claimed' })];
  assert.equal(renderTable(rows, now), renderTable([...rows].reverse(), new Date('2026-10-07T23:59:59Z')));
  assert.ok(renderTable(rows, now).indexOf('task_a') < renderTable(rows, now).indexOf('task_b'));
  assert.ok(renderTable(rows, now).includes('| 6d |'));
  assert.ok(!renderTable(rows, now).includes('task_closed'));
  assert.throws(() => renderTable([task('../unsafe')], now), /Invalid task/);
  assert.throws(() => renderTable([task('a', { created_at: 'invalid' })], now), /Invalid task/);
});

test('fetch uses read-only official endpoint and walks pagination with deduplication', async () => {
  const offsets = [];
  const first = Array.from({ length: 100 }, (_, index) => task(String(index)));
  const result = await fetchTasks(async (url, options) => {
    assert.equal(url.origin, 'https://api.basedagents.ai');
    assert.equal(url.pathname, '/v1/tasks');
    assert.equal(url.searchParams.get('status'), 'open');
    assert.equal(options.redirect, 'error');
    const offset = Number(url.searchParams.get('offset'));
    offsets.push(offset);
    return { ok: true, json: async () => ({ ok: true, tasks: offset === 0 ? first : [task('99'), task('100')] }) };
  });
  assert.deepEqual(offsets, [0, 100]);
  assert.equal(result.tasks.length, 101);
});

test('HTTP errors, malformed responses and stuck pagination fail instead of clearing the table', async () => {
  await assert.rejects(fetchTasks(async () => ({ ok: false, status: 503 })), /HTTP 503/);
  await assert.rejects(fetchTasks(async () => ({ ok: true, json: async () => ({ error: 'oops' }) })), /Invalid task feed/);
  await assert.rejects(fetchTasks(async () => ({ ok: true, json: async () => ({ ok: true,
    tasks: Array.from({ length: 100 }, (_, index) => task(String(index))) }) })), /did not advance/);
});
