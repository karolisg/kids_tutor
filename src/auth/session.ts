import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { SqlDatabase } from '../db/types.js';

export const PARENT_COOKIE = 'parent_session';
export const CHILD_COOKIE = 'kid_session';

const PARENT_MAX_AGE = 60 * 60 * 24 * 14;
const CHILD_MAX_AGE = 60 * 60 * 12;

export type ParentRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type ChildRow = {
  id: string;
  parent_id: string;
  display_name: string;
  pin_hash: string;
  created_at: string;
};

type SessionKind = 'parent' | 'child';

function cookieName(kind: SessionKind): string {
  return kind === 'parent' ? PARENT_COOKIE : CHILD_COOKIE;
}

function maxAge(kind: SessionKind): number {
  return kind === 'parent' ? PARENT_MAX_AGE : CHILD_MAX_AGE;
}

export function sealSessionId(id: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(id).digest('base64url');
  return `${id}.${signature}`;
}

export function openSessionId(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !signature) return null;
  const expected = createHmac('sha256', secret).update(id).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return id;
}

export async function startSession(
  db: SqlDatabase,
  kind: SessionKind,
  ownerId: string,
): Promise<string> {
  const id = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = new Date(now.getTime() + maxAge(kind) * 1000);
  const table = kind === 'parent' ? 'parent_sessions' : 'child_sessions';
  const column = kind === 'parent' ? 'parent_id' : 'child_id';
  await db.run(
    `INSERT INTO ${table} (id, ${column}, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [id, ownerId, now.toISOString(), expires.toISOString()],
  );
  return id;
}

export function writeSessionCookie(c: Context, kind: SessionKind, id: string, secret: string): void {
  setCookie(c, cookieName(kind), sealSessionId(id, secret), {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: maxAge(kind),
  });
}

export async function clearSession(c: Context, db: SqlDatabase, kind: SessionKind, secret: string): Promise<void> {
  const id = openSessionId(getCookie(c, cookieName(kind)), secret);
  if (id) {
    const table = kind === 'parent' ? 'parent_sessions' : 'child_sessions';
    await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }
  deleteCookie(c, cookieName(kind), { path: '/' });
}

export async function parentFromRequest(
  c: Context,
  db: SqlDatabase,
  secret: string,
): Promise<ParentRow | null> {
  const id = openSessionId(getCookie(c, PARENT_COOKIE), secret);
  if (!id) return null;
  const now = new Date().toISOString();
  const row = await db.get<ParentRow>(
    `SELECT p.id, p.email, p.password_hash, p.created_at
     FROM parent_sessions s
     JOIN parents p ON p.id = s.parent_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [id, now],
  );
  if (!row) {
    await db.run('DELETE FROM parent_sessions WHERE id = ?', [id]);
    return null;
  }
  return row;
}

export async function childFromRequest(
  c: Context,
  db: SqlDatabase,
  secret: string,
): Promise<ChildRow | null> {
  const id = openSessionId(getCookie(c, CHILD_COOKIE), secret);
  if (!id) return null;
  const now = new Date().toISOString();
  const row = await db.get<ChildRow>(
    `SELECT c.id, c.parent_id, c.display_name, c.pin_hash, c.created_at
     FROM child_sessions s
     JOIN children c ON c.id = s.child_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [id, now],
  );
  if (!row) {
    await db.run('DELETE FROM child_sessions WHERE id = ?', [id]);
    return null;
  }
  return row;
}
