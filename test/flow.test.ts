import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import type { Hono } from 'hono';
import { createApp } from '../src/app.tsx';
import { migrate } from '../src/db/migrate.ts';
import { openSqlite } from '../src/db/sqlite.ts';

const symbols: Record<string, (left: number, right: number) => number> = {
  '+': (left, right) => left + right,
  '−': (left, right) => left - right,
  '×': (left, right) => left * right,
  '÷': (left, right) => left / right,
};

function showsNumber(html: string, value: number): boolean {
  const region = html.match(/<div data-problem="open">[\s\S]*$/)?.[0] ?? html;
  const cleaned = region
    .replace(/<p class="progress">[\s\S]*?<\/p>/, '')
    .replace(/<div class="pad"[\s\S]*?<\/div>/, '')
    .replace(/\/practice\/attempt\/[A-Za-z0-9_-]+/g, '')
    .replace(/width:\s*\d+%/g, '');
  const token = String(value).replace('-', '\\-');
  return new RegExp(`(?<![0-9])${token}(?![0-9])`).test(cleaned);
}

function absorb(jar: Map<string, string>, response: Response): void {
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const cookie of cookies) {
    const pair = cookie.split(';')[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function send(
  app: Hono,
  jar: Map<string, string>,
  url: string,
  fields?: Record<string, string>,
): Promise<Response> {
  const response = await app.request(url, {
    method: fields ? 'POST' : 'GET',
    headers: {
      cookie: cookieHeader(jar),
      ...(fields ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: fields ? new URLSearchParams(fields).toString() : undefined,
  });
  absorb(jar, response);
  return response;
}

async function follow(app: Hono, jar: Map<string, string>, response: Response): Promise<Response> {
  let current = response;
  for (let hop = 0; hop < 6; hop += 1) {
    if (current.status !== 303 && current.status !== 302) return current;
    const location = current.headers.get('location');
    assert.ok(location);
    current = await send(app, jar, location);
  }
  return current;
}

test('a child solves a set without receiving answers early, and the parent sees the score', async () => {
  const db = openSqlite(':memory:');
  await migrate(db, path.resolve('migrations'));
  const app = createApp({ db, sessionSecret: 'test-session-secret-value' });
  const jar = new Map<string, string>();

  const registered = await send(app, jar, '/register', {
    email: 'parent@example.com',
    password: 'correct-horse',
    password_confirm: 'correct-horse',
  });
  const dashboard = await follow(app, jar, registered);
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Your family/);

  const added = await send(app, jar, '/parent/children', {
    display_name: 'Mina',
    pin: '2468',
  });
  assert.equal((await follow(app, jar, added)).status, 200);

  const created = await send(app, jar, '/parent/sets', {
    operation: 'multiply',
    difficulty: 'easy',
    count: '2',
  });
  const withSet = await follow(app, jar, created);
  assert.match(await withSet.text(), /Multiplication/);

  const loggedIn = await send(app, jar, '/practice/login', {
    display_name: 'Mina',
    pin: '2468',
  });
  const sets = await follow(app, jar, loggedIn);
  const setsHtml = await sets.text();
  assert.match(setsHtml, /Choose a set/);
  const start = setsHtml.match(/action="(\/practice\/sets\/[^"]+\/start)"/);
  assert.ok(start?.[1]);

  let page = await follow(app, jar, await send(app, jar, start[1], {}));
  let html = await page.text();
  let solved = 0;

  for (let step = 0; step < 8 && solved < 2; step += 1) {
    if (html.includes('data-problem="open"')) {
      const equation = html.match(/class="equation">\s*([^<]+)\s*</);
      assert.ok(equation?.[1]);
      const parts = equation[1].trim().split(/\s+/);
      assert.equal(parts.length, 3);
      const left = Number(parts[0]);
      const symbol = parts[1] ?? '';
      const right = Number(parts[2]);
      const solve = symbols[symbol];
      assert.ok(solve);
      const answer = solve(left, right);
      if (answer !== left && answer !== right) {
        assert.equal(showsNumber(html, answer), false);
      }
      const given = solved === 0 ? answer + 1 : answer;
      const action = html.match(/action="(\/practice\/attempt\/[^"]+)"/);
      assert.ok(action?.[1]);
      page = await follow(app, jar, await send(app, jar, action[1], { answer: String(given) }));
      html = await page.text();
      assert.match(html, /data-problem="review"/);
      assert.match(html, new RegExp(`= ${answer < 0 ? `\\${String(answer)}` : answer}`));
      if (solved === 0) assert.match(html, /Not this time/);
      solved += 1;
    }
    const next = html.match(/id="next-step"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*id="next-step"/);
    const href = next?.[1] ?? next?.[2];
    assert.ok(href);
    page = await send(app, jar, href);
    html = await page.text();
  }

  assert.match(html, /data-score="done"/);
  assert.match(html, /1\/2/);

  const parent = await send(app, jar, '/parent');
  const parentHtml = await parent.text();
  assert.match(parentHtml, /Mina/);
  assert.match(parentHtml, /1\/2/);
});
