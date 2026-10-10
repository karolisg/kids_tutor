import type { Context, Hono } from 'hono';
import type { ChildRow } from '../auth/session.js';
import { clearSession, startSession, writeSessionCookie } from '../auth/session.js';
import { cleanName, cleanPin, field, parseIntegerAnswer } from '../http/read.js';
import { checkAnswer } from '../math/generate.js';
import { difficultyLabel, equation, formatWhen, operationLabel, scorePhrase } from '../math/format.js';
import {
  answerForProblem,
  childForPin,
  finishedSetIds,
  getAttemptForChild,
  getSetForParent,
  listAttemptAnswers,
  listSets,
  nextVisibleProblem,
  openAttemptsForChild,
  recordAnswer,
  resumeOrStartAttempt,
  reviewAnswer,
  type AttemptRow,
} from '../store.js';
import { padScript } from '../views/pad.js';
import { Banner, Layout, render } from '../views/layout.js';
import type { AppEnv } from '../app.js';

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function registerPracticeRoutes(app: Hono<AppEnv>): void {
  app.get('/practice-pad.js', (c) => {
    return c.body(padScript, 200, { 'content-type': 'text/javascript; charset=utf-8' });
  });

  app.get('/practice', (c) => {
    if (c.get('child')) return c.redirect('/practice/sets', 303);
    return render(c, loginPage());
  });

  app.post('/practice/login', async (c) => {
    const body = await c.req.parseBody();
    const name = cleanName(field(body, 'display_name'));
    const pin = cleanPin(field(body, 'pin'));
    if (!name || !pin) return render(c, loginPage('Enter your name and a 4 to 6 digit PIN.'), 400);
    const child = await childForPin(c.get('db'), name, pin);
    if (!child) return render(c, loginPage('That name or PIN is not right.'), 401);
    const sessionId = await startSession(c.get('db'), 'child', child.id);
    writeSessionCookie(c, 'child', sessionId, c.get('sessionSecret'));
    return c.redirect('/practice/sets', 303);
  });

  app.post('/practice/logout', async (c) => {
    await clearSession(c, c.get('db'), 'child', c.get('sessionSecret'));
    return c.redirect('/practice', 303);
  });

  app.get('/practice/sets', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const db = c.get('db');
    const [sets, open, finished] = await Promise.all([
      listSets(db, child.parent_id),
      openAttemptsForChild(db, child.id),
      finishedSetIds(db, child.id),
    ]);
    const openBySet = new Map(open.map((attempt) => [attempt.set_id, attempt.id]));
    const finishedSet = new Set(finished);
    return render(
      c,
      <Layout title="Sets" mode="kid" childName={child.display_name} showParentLink={Boolean(c.get('parent'))}>
        <p class="eyebrow">Hi, {child.display_name}</p>
        <h1>Choose a set</h1>
        {sets.length === 0 ? (
          <section class="card">
            <p>Nothing is ready yet. Ask a parent to make a set.</p>
          </section>
        ) : (
          <div class="grid">
            {sets.map((set) => {
              const resume = openBySet.get(set.id);
              const again = finishedSet.has(set.id);
              const label = resume ? 'Continue' : again ? 'Practice again' : 'Start';
              return (
                <section class="card" key={set.id}>
                  <h2>{operationLabel(set.operation)}</h2>
                  <p class="hint">
                    {difficultyLabel(set.difficulty)} · {set.problem_count} problems · {formatWhen(set.created_at)}
                  </p>
                  <form method="post" action={`/practice/sets/${set.id}/start`}>
                    <button class="button" type="submit">{label}</button>
                  </form>
                </section>
              );
            })}
          </div>
        )}
      </Layout>,
    );
  });

  app.post('/practice/sets/:setId/start', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const set = await getSetForParent(c.get('db'), c.req.param('setId'), child.parent_id);
    if (!set) return missing(c, child);
    const attemptId = await resumeOrStartAttempt(c.get('db'), set, child.id);
    return c.redirect(`/practice/attempt/${attemptId}`, 303);
  });

  app.get('/practice/attempt/:attemptId', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const attempt = await getAttemptForChild(c.get('db'), c.req.param('attemptId'), child.id);
    if (!attempt) return missing(c, child);
    if (attempt.finished_at) return c.redirect(`/practice/attempt/${attempt.id}/score`, 303);
    const problem = await nextVisibleProblem(c.get('db'), attempt);
    if (!problem) return c.redirect(`/practice/attempt/${attempt.id}/score`, 303);
    return problemPage(c, child, attempt, problem);
  });

  app.post('/practice/attempt/:attemptId', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const db = c.get('db');
    const attempt = await getAttemptForChild(db, c.req.param('attemptId'), child.id);
    if (!attempt) return missing(c, child);
    if (attempt.finished_at) return c.redirect(`/practice/attempt/${attempt.id}/score`, 303);
    const problem = await nextVisibleProblem(db, attempt);
    if (!problem) return c.redirect(`/practice/attempt/${attempt.id}/score`, 303);
    const given = parseIntegerAnswer(field(await c.req.parseBody(), 'answer'));
    if (given === null) return problemPage(c, child, attempt, problem, 'Enter a whole number.', 400);
    const expected = await answerForProblem(db, problem.id);
    if (expected === undefined) return missing(c, child);
    const correct = checkAnswer({ answer: expected }, given);
    const finished = problem.position === attempt.total_count;
    try {
      await recordAnswer(db, { attempt, problemId: problem.id, given, correct, finished });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('UNIQUE')) throw error;
    }
    return c.redirect(`/practice/attempt/${attempt.id}/review/${problem.id}`, 303);
  });

  app.get('/practice/attempt/:attemptId/review/:problemId', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const db = c.get('db');
    const attempt = await getAttemptForChild(db, c.req.param('attemptId'), child.id);
    if (!attempt) return missing(c, child);
    const answer = await reviewAnswer(db, attempt.id, c.req.param('problemId'));
    if (!answer) return c.redirect(`/practice/attempt/${attempt.id}`, 303);
    const nextHref = attempt.finished_at
      ? `/practice/attempt/${attempt.id}/score`
      : `/practice/attempt/${attempt.id}`;
    const nextLabel = attempt.finished_at ? 'See your score' : 'Next problem';
    const shown = equation({
      left: answer.left_value,
      right: answer.right_value,
      operation: answer.operation,
    });
    return render(
      c,
      <Layout title="Answer" mode="kid" childName={child.display_name} showParentLink={Boolean(c.get('parent'))}>
        <div data-problem="review">
          <p class="progress">Problem {answer.position} of {attempt.total_count}</p>
          <div class="feedback">
            <p class={answer.is_correct ? 'verdict good' : 'verdict miss'}>
              {answer.is_correct ? 'Yes.' : 'Not this time.'}
            </p>
            <p class="equation">{shown} = {answer.answer}</p>
            <p class="detail">You answered {answer.given_answer}.</p>
            <a id="next-step" class="button" href={nextHref}>{nextLabel}</a>
          </div>
        </div>
      </Layout>,
    );
  });

  app.get('/practice/attempt/:attemptId/score', async (c) => {
    const child = c.get('child');
    if (!child) return c.redirect('/practice', 303);
    const db = c.get('db');
    const attempt = await getAttemptForChild(db, c.req.param('attemptId'), child.id);
    if (!attempt) return missing(c, child);
    if (!attempt.finished_at) return c.redirect(`/practice/attempt/${attempt.id}`, 303);
    const answers = await listAttemptAnswers(db, attempt.id);
    return render(
      c,
      <Layout title="Score" mode="kid" childName={child.display_name} showParentLink={Boolean(c.get('parent'))}>
        <div data-score="done">
          <div class="score-hero">
            <p class="eyebrow">{child.display_name}</p>
            <p class="score-value">{attempt.correct_count}/{attempt.total_count}</p>
            <p>{scorePhrase(attempt.correct_count, attempt.total_count)}</p>
          </div>
          <ul class="recap">
            {answers.map((answer) => (
              <li key={answer.id}>
                <span>
                  {equation({
                    left: answer.left_value,
                    right: answer.right_value,
                    operation: answer.operation,
                  })} = {answer.answer}
                </span>
                <span class={answer.is_correct ? 'good' : 'miss'}>
                  {answer.is_correct ? 'Correct' : `You said ${answer.given_answer}`}
                </span>
              </li>
            ))}
          </ul>
          <p><a class="button" href="/practice/sets">Practice another set</a></p>
        </div>
      </Layout>,
    );
  });
}

function loginPage(message?: string) {
  return (
    <Layout title="Practice" mode="kid">
      <p class="eyebrow">Practice</p>
      <h1>Ready?</h1>
      <p class="lede">Type the name a parent used for you, then your PIN.</p>
      <section class="card">
        <Banner message={message} />
        <form method="post" action="/practice/login">
          <label>
            <span>Your name</span>
            <input name="display_name" required maxlength={40} autocomplete="off" />
          </label>
          <label>
            <span>PIN</span>
            <input name="pin" required inputmode="numeric" autocomplete="off" minlength={4} maxlength={6} />
          </label>
          <button class="button" type="submit">Open my sets</button>
        </form>
      </section>
    </Layout>
  );
}

function missing(c: Context<AppEnv>, child: ChildRow) {
  return render(
    c,
    <Layout title="Not found" mode="kid" childName={child.display_name}>
      <h1>That set is not open.</h1>
      <p><a class="button" href="/practice/sets">Back to sets</a></p>
    </Layout>,
    404,
  );
}

function problemPage(
  c: Context<AppEnv>,
  child: ChildRow,
  attempt: AttemptRow,
  problem: { id: string; position: number; left_value: number; right_value: number; operation: string },
  message?: string,
  status: 200 | 400 = 200,
) {
  const percent = Math.round(((problem.position - 1) / attempt.total_count) * 100);
  return render(
    c,
    <Layout title="Practice" mode="kid" childName={child.display_name} showParentLink={Boolean(c.get('parent'))}>
      <div data-problem="open">
        <p class="progress">Problem {problem.position} of {attempt.total_count}</p>
        <div class="track" aria-hidden="true">
          <div class="fill" style={`width: ${percent}%`}></div>
        </div>
        <p class="equation">
          {equation({
            left: problem.left_value,
            right: problem.right_value,
            operation: problem.operation,
          })}
        </p>
        <form class="answer-form" method="post" action={`/practice/attempt/${attempt.id}`}>
          <Banner message={message} />
          <label class="answer-label">
            <span>Your answer</span>
            <input id="answer" name="answer" inputmode="numeric" autocomplete="off" class="answer-input" />
          </label>
          <div class="pad" data-pad>
            {keys.map((key) => (
              <button type="button" data-key={key} key={key}>{key}</button>
            ))}
            <button type="button" data-key="sign" aria-label="Negative">−</button>
            <button type="button" data-key="0">0</button>
            <button type="button" data-key="back" aria-label="Delete">⌫</button>
          </div>
          <button class="button submit" type="submit">Check</button>
        </form>
        <script src="/practice-pad.js"></script>
      </div>
    </Layout>,
    status,
  );
}
