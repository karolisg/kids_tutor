import type { Context, Hono } from 'hono';
import type { ParentRow } from '../auth/session.js';
import { hashSecret } from '../auth/password.js';
import { cleanCount, cleanName, cleanPin, field } from '../http/read.js';
import { difficultyLabel, equation, formatDuration, formatWhen, operationLabel } from '../math/format.js';
import { generateSet, isDifficulty, isOperationChoice } from '../math/generate.js';
import {
  createChild,
  createProblemSet,
  findChildByNameForParent,
  getSessionForParent,
  listChildren,
  listScores,
  listSessionQuestions,
  listSets,
  type ChildSummary,
  type ScoreRow,
  type SessionQuestion,
} from '../store.js';
import { Banner, Layout, render } from '../views/layout.js';
import type { AppEnv } from '../app.js';

export function registerParentRoutes(app: Hono<AppEnv>): void {
  app.get('/parent', async (c) => {
    const parent = c.get('parent');
    if (!parent) return c.redirect('/login', 303);
    return dashboard(c, parent);
  });

  app.post('/parent/children', async (c) => {
    const parent = c.get('parent');
    if (!parent) return c.redirect('/login', 303);
    const body = await c.req.parseBody();
    const name = cleanName(field(body, 'display_name'));
    const pin = cleanPin(field(body, 'pin'));
    if (!name) return dashboard(c, parent, 'Enter a name.', 400);
    if (!pin) return dashboard(c, parent, 'Use a PIN of 4 to 6 digits.', 400);
    const db = c.get('db');
    const existing = await findChildByNameForParent(db, parent.id, name);
    if (existing) return dashboard(c, parent, 'You already have a child with that name.', 400);
    await createChild(db, parent.id, name, await hashSecret(pin));
    return c.redirect('/parent', 303);
  });

  app.post('/parent/sets', async (c) => {
    const parent = c.get('parent');
    if (!parent) return c.redirect('/login', 303);
    const body = await c.req.parseBody();
    const operation = field(body, 'operation');
    const difficulty = field(body, 'difficulty');
    const count = cleanCount(field(body, 'count'));
    if (!isOperationChoice(operation) || !isDifficulty(difficulty) || count === null) {
      return dashboard(c, parent, 'Choose an operation, a difficulty, and a count from 1 to 20.', 400);
    }
    const problems = generateSet(operation, difficulty, count);
    await createProblemSet(c.get('db'), {
      parentId: parent.id,
      operation,
      difficulty,
      problems,
    });
    return c.redirect('/parent', 303);
  });

  app.get('/parent/attempts/:attemptId', async (c) => {
    const parent = c.get('parent');
    if (!parent) return c.redirect('/login', 303);
    const session = await getSessionForParent(c.get('db'), c.req.param('attemptId'), parent.id);
    if (!session) {
      return render(
        c,
        <Layout title="Session" mode="parent" email={parent.email}>
          <h1>That session is not here.</h1>
          <p><a class="button" href="/parent">Back to the dashboard</a></p>
        </Layout>,
        404,
      );
    }
    const questions = await listSessionQuestions(c.get('db'), session.id, session.set_id);
    return render(
      c,
      <Layout title="Session" mode="parent" email={parent.email}>
        <p class="eyebrow">{session.display_name}</p>
        <h1>{operationLabel(session.operation)}</h1>
        <section class="card">
          <p>Started {formatWhen(session.started_at)}</p>
          <p>{session.finished_at ? `Finished ${formatWhen(session.finished_at)}` : 'Still in progress'}</p>
          <p>
            Score {session.finished_at ? `${session.correct_count}/${session.total_count}` : `${session.correct_count}/${session.total_count} so far`}
            {' · '}
            Total time {formatDuration(session.total_ms)}
          </p>
          <ul class="timing-list">
            {questions.map((question) => (
              <li key={question.position}>
                <span>
                  {question.position}. {equation({
                    left: question.left_value,
                    right: question.right_value,
                    operation: question.operation,
                  })}
                </span>
                <span class={question.is_correct === 1 ? 'good' : question.is_correct === 0 ? 'miss' : 'hint'}>
                  {questionLine(question)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <p><a class="button quiet" href="/parent">Back to the dashboard</a></p>
      </Layout>,
    );
  });
}

function questionLine(question: SessionQuestion): string {
  if (question.answered_at === null || question.is_correct === null) return 'Not answered yet';
  const result = question.is_correct === 1 ? 'Correct' : 'Wrong';
  const time = question.shown_at ? formatDuration(question.duration_ms ?? 0) : 'time not recorded';
  return `${result} · ${time}`;
}

async function dashboard(
  c: Context<AppEnv>,
  parent: ParentRow,
  message?: string,
  status: 200 | 400 = 200,
) {
  const db = c.get('db');
  const [children, sets, scores] = await Promise.all([
    listChildren(db, parent.id),
    listSets(db, parent.id),
    listScores(db, parent.id),
  ]);
  return render(
    c,
    <Layout title="Dashboard" mode="parent" email={parent.email}>
      <p class="eyebrow">Parent</p>
      <h1>Your family</h1>
      <p class="lede">Add a child, make a set, then hand over the practice screen.</p>
      <Banner message={message} />
      <div class="grid dashboard">
        <section class="card">
          <h2>Children</h2>
          {children.length === 0 ? <p class="hint">No children yet. A name and a PIN are enough.</p> : null}
          <ul class="child-list">
            {children.map((child) => (
              <li key={child.id}>
                <div class="child-name">{child.display_name}</div>
                <div class="hint">Added {formatWhen(child.created_at)}. The PIN stays hidden.</div>
              </li>
            ))}
          </ul>
          <form method="post" action="/parent/children">
            <div class="inline-fields">
              <label>
                <span>Name</span>
                <input name="display_name" required maxlength={40} autocomplete="off" />
              </label>
              <label>
                <span>PIN</span>
                <input name="pin" required inputmode="numeric" autocomplete="off" minlength={4} maxlength={6} />
              </label>
              <button class="button" type="submit">Add child</button>
            </div>
          </form>
          <p class="hint">4 to 6 digits. Your child types this name and PIN to practice.</p>
        </section>
        <section class="card">
          <h2>New set</h2>
          <p class="hint">Problems are written on the server. Children never see the answers ahead of time.</p>
          <form method="post" action="/parent/sets">
            <div class="generate-grid">
              <label>
                <span>Operation</span>
                <select name="operation" required>
                  <option value="add">Addition</option>
                  <option value="subtract">Subtraction</option>
                  <option value="multiply">Multiplication</option>
                  <option value="divide">Division</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label>
                <span>Difficulty</span>
                <select name="difficulty" required>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label>
                <span>Count</span>
                <input name="count" type="number" min={1} max={20} value="10" required />
              </label>
              <button class="button" type="submit">Create set</button>
            </div>
          </form>
        </section>
        <section class="card span-2">
          <h2>Sets</h2>
          {sets.length === 0 ? <p class="hint">Create a set your child can open.</p> : null}
          <ul class="set-list">
            {sets.map((set) => (
              <li key={set.id}>
                <strong>{operationLabel(set.operation)}</strong>
                <div class="set-meta">
                  {difficultyLabel(set.difficulty)} · {set.problem_count} problems · {formatWhen(set.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section class="card span-2">
          <h2>Scores</h2>
          <ScoreList kids={children} scores={scores} />
        </section>
      </div>
    </Layout>,
    status,
  );
}

function ScoreList(props: { kids: ChildSummary[]; scores: ScoreRow[] }) {
  if (props.kids.length === 0) {
    return <p class="hint">Scores show up here after a child finishes a set.</p>;
  }
  return (
    <div class="score-groups">
      {props.kids.map((child) => {
        const rows = props.scores.filter((score) => score.child_id === child.id);
        return (
          <section key={child.id}>
            <h3>{child.display_name}</h3>
            {rows.length === 0 ? (
              <p class="hint">No scores yet.</p>
            ) : (
              <ul class="score-list">
                {rows.map((score) => (
                  <li class="score" key={score.id}>
                    <a href={`/parent/attempts/${score.id}`}>
                      <span class="score-value">
                        {score.finished_at ? `${score.correct_count}/${score.total_count}` : 'In progress'}
                      </span>
                      <span class="score-meta">
                        {operationLabel(score.operation)} · {difficultyLabel(score.difficulty)}
                        {score.finished_at ? '' : ` · ${score.correct_count}/${score.total_count}`}
                        {' · '}
                        {formatWhen(score.started_at)}
                        {' · '}
                        {formatDuration(score.total_ms)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
