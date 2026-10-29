import type { Child, FC } from 'hono/jsx';
import type { Context } from 'hono';
import { css } from './styles.js';

type Mode = 'public' | 'parent' | 'kid';

export const Layout: FC<{
  title: string;
  mode?: Mode;
  email?: string | null;
  childName?: string | null;
  showParentLink?: boolean;
  children?: Child;
}> = (props) => {
  const mode = props.mode ?? 'public';
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title} · Kids Tutor</title>
        <style>{css}</style>
      </head>
      <body class={mode}>
        <a class="skip" href="#main">Skip to content</a>
        <header class="top">
          <a class="brand" href={mode === 'kid' ? '/practice/sets' : mode === 'parent' ? '/parent' : '/'}>
            <span class="mark" aria-hidden="true"></span>
            Kids Tutor
          </a>
          <nav class="nav">
            {mode === 'public' ? (
              <>
                <a href="/practice">Practice</a>
                <a href="/login">Log in</a>
              </>
            ) : null}
            {mode === 'parent' ? (
              <>
                <span>{props.email}</span>
                <a href="/practice">Practice</a>
                <form method="post" action="/logout">
                  <button class="text-button" type="submit">Log out</button>
                </form>
              </>
            ) : null}
            {mode === 'kid' ? (
              <>
                {props.childName ? <span>{props.childName}</span> : <a href="/">Home</a>}
                {props.childName ? <a href="/practice/achievements">Awards</a> : null}
                {props.showParentLink ? <a href="/parent">Parent</a> : null}
                {props.childName ? (
                  <form method="post" action="/practice/logout">
                    <button class="text-button" type="submit">Finish</button>
                  </form>
                ) : null}
              </>
            ) : null}
          </nav>
        </header>
        <main id="main" class="wrap">
          {props.children}
        </main>
      </body>
    </html>
  );
};

export function Banner(props: { message?: string | null }) {
  if (!props.message) return null;
  return <p class="banner" role="alert">{props.message}</p>;
}

export function render(c: Context, node: unknown, status: 200 | 400 | 401 | 404 | 500 = 200) {
  return c.html(`<!DOCTYPE html>\n${String(node)}`, status);
}
