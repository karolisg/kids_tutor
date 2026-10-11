import { Hono } from 'hono';
import type { ChildRow, ParentRow } from './auth/session.js';
import { childFromRequest, parentFromRequest } from './auth/session.js';
import type { SqlDatabase } from './db/types.js';
import { registerParentRoutes } from './routes/parent.js';
import { registerPracticeRoutes } from './routes/practice.js';
import { registerPublicRoutes } from './routes/public.js';
import { Layout, render } from './views/layout.js';

export type AppEnv = {
  Variables: {
    db: SqlDatabase;
    sessionSecret: string;
    parent: ParentRow | null;
    child: ChildRow | null;
  };
};

export function createApp(deps: { db: SqlDatabase; sessionSecret: string }) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', deps.db);
    c.set('sessionSecret', deps.sessionSecret);
    if (c.req.path === '/health' || c.req.path === '/practice-pad.js') {
      c.set('parent', null);
      c.set('child', null);
    } else {
      const parent = await parentFromRequest(c, deps.db, deps.sessionSecret);
      const child = await childFromRequest(c, deps.db, deps.sessionSecret);
      c.set('parent', parent);
      c.set('child', child);
    }
    await next();
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'same-origin');
  });

  app.get('/health', async (c) => {
    await c.get('db').get('SELECT 1 AS ok');
    return c.text('ok');
  });

  app.get('/favicon.ico', (c) => c.body(null, 204));

  registerPublicRoutes(app);
  registerParentRoutes(app);
  registerPracticeRoutes(app);

  app.notFound((c) => {
    return render(
      c,
      <Layout title="Not found" mode="public">
        <h1>That page is not here.</h1>
        <p><a class="button" href="/">Go home</a></p>
      </Layout>,
      404,
    );
  });

  app.onError((error, c) => {
    console.error(error);
    return render(
      c,
      <Layout title="Something went wrong" mode="public">
        <h1>Something went wrong.</h1>
        <p>Please try that again.</p>
        <p><a class="button" href="/">Go home</a></p>
      </Layout>,
      500,
    );
  });

  return app;
}
