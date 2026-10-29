import type { Hono } from 'hono';
import { hashSecret, verifySecret } from '../auth/password.js';
import { clearSession, startSession, writeSessionCookie } from '../auth/session.js';
import { cleanEmail, cleanPassword, field } from '../http/read.js';
import { createParent, findParentByEmail } from '../store.js';
import { Banner, Layout, render } from '../views/layout.js';
import type { AppEnv } from '../app.js';

export function registerPublicRoutes(app: Hono<AppEnv>): void {
  app.get('/', (c) => {
    const parent = c.get('parent');
    const child = c.get('child');
    return render(
      c,
      <Layout title="Home" mode="public">
        <p class="eyebrow">Arithmetic practice</p>
        <h1>A calm way to practice math.</h1>
        <p class="lede">
          Parents make a short set. Children solve one problem at a time. Scores stay with the family.
        </p>
        <div class="grid split">
          <section class="card">
            <h2>Parents</h2>
            <p>Create an account, add your children, and choose the kind of practice.</p>
            <div class="actions">
              {parent ? (
                <a class="button" href="/parent">Go to your dashboard</a>
              ) : (
                <>
                  <a class="button" href="/register">Create account</a>
                  <a class="button quiet" href="/login">Log in</a>
                </>
              )}
            </div>
          </section>
          <section class="card">
            <h2>Practice</h2>
            <p>Pick your name and enter the PIN a parent chose for you.</p>
            <div class="actions">
              <a class="button" href={child ? '/practice/sets' : '/practice'}>
                {child ? `Continue as ${child.display_name}` : 'Start practicing'}
              </a>
            </div>
          </section>
        </div>
      </Layout>,
    );
  });

  app.get('/register', (c) => {
    if (c.get('parent')) return c.redirect('/parent', 303);
    return render(c, registerPage());
  });

  app.post('/register', async (c) => {
    const body = await c.req.parseBody();
    const email = cleanEmail(field(body, 'email'));
    const password = cleanPassword(field(body, 'password'));
    const confirm = field(body, 'password_confirm');
    if (!email) return render(c, registerPage('Enter a valid email address.', field(body, 'email')), 400);
    if (!password) return render(c, registerPage('Use at least 8 characters.', email), 400);
    if (password !== confirm) return render(c, registerPage('Those passwords do not match.', email), 400);
    const db = c.get('db');
    const existing = await findParentByEmail(db, email);
    if (existing) return render(c, registerPage('An account with that email already exists.', email), 400);
    const parentId = await createParent(db, email, await hashSecret(password));
    const sessionId = await startSession(db, 'parent', parentId);
    writeSessionCookie(c, 'parent', sessionId, c.get('sessionSecret'));
    return c.redirect('/parent', 303);
  });

  app.get('/login', (c) => {
    if (c.get('parent')) return c.redirect('/parent', 303);
    return render(c, loginPage());
  });

  app.post('/login', async (c) => {
    const body = await c.req.parseBody();
    const email = cleanEmail(field(body, 'email'));
    const password = field(body, 'password');
    const db = c.get('db');
    const parent = email ? await findParentByEmail(db, email) : undefined;
    const valid = parent ? await verifySecret(password, parent.password_hash) : false;
    if (!parent || !valid) {
      return render(c, loginPage('Email or password is not right.', field(body, 'email')), 401);
    }
    const sessionId = await startSession(db, 'parent', parent.id);
    writeSessionCookie(c, 'parent', sessionId, c.get('sessionSecret'));
    return c.redirect('/parent', 303);
  });

  app.post('/logout', async (c) => {
    await clearSession(c, c.get('db'), 'parent', c.get('sessionSecret'));
    return c.redirect('/', 303);
  });
}

function registerPage(message?: string, email = '') {
  return (
    <Layout title="Create account" mode="public">
      <h1>Create a parent account</h1>
      <p class="lede">You will add children and practice sets after this.</p>
      <section class="card">
        <Banner message={message} />
        <form method="post" action="/register">
          <label>
            <span>Email</span>
            <input name="email" type="email" autocomplete="email" required value={email} />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="new-password" required minLength={8} />
          </label>
          <label>
            <span>Confirm password</span>
            <input name="password_confirm" type="password" autocomplete="new-password" required minLength={8} />
          </label>
          <button class="button" type="submit">Create account</button>
        </form>
        <p class="hint">Already registered? <a href="/login">Log in</a></p>
      </section>
    </Layout>
  );
}

function loginPage(message?: string, email = '') {
  return (
    <Layout title="Log in" mode="public">
      <h1>Welcome back</h1>
      <section class="card">
        <Banner message={message} />
        <form method="post" action="/login">
          <label>
            <span>Email</span>
            <input name="email" type="email" autocomplete="email" required value={email} />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="button" type="submit">Log in</button>
        </form>
        <p class="hint">New here? <a href="/register">Create an account</a></p>
      </section>
    </Layout>
  );
}
