import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDuration } from '../src/math/format.ts';
import {
  buildAchievements,
  isQuickAnswer,
  starLabel,
  type RewardStats,
} from '../src/rewards/achievements.ts';

const empty: RewardStats = {
  finishedSets: 0,
  startedSets: 0,
  perfectSets: 0,
  bestCorrect: 0,
  bestTotal: 0,
  quickAnswers: 0,
  practiceDays: 0,
  stars: 0,
};

function byId(stats: RewardStats, id: string) {
  const achievement = buildAchievements(stats).find((item) => item.id === id);
  assert.ok(achievement);
  return achievement;
}

describe('achievements', () => {
  it('starts locked, with progress still visible', () => {
    const achievements = buildAchievements(empty);
    assert.deepEqual(
      achievements.map((item) => item.state),
      ['locked', 'locked', 'locked', 'locked'],
    );
    assert.equal(byId(empty, 'quick-answers').progress, '0 of 5 quick answers');
    assert.equal(byId(empty, 'back-again').progress, '0 of 2 days');
    assert.equal(starLabel(0), '0 stars');
  });

  it('moves first practice to in progress after a set is started', () => {
    const achievement = byId({ ...empty, startedSets: 1 }, 'first-practice');
    assert.equal(achievement.state, 'in_progress');
    assert.equal(achievement.progress, '0 of 1 sets finished');
  });

  it('earns a badge for a finished set and a gold star for a perfect one', () => {
    const finished = byId({ ...empty, startedSets: 1, finishedSets: 1, bestCorrect: 1, bestTotal: 2 }, 'first-practice');
    assert.equal(finished.state, 'earned');
    assert.equal(finished.reward, 'Badge');

    const imperfect = byId(
      { ...empty, startedSets: 1, finishedSets: 1, bestCorrect: 1, bestTotal: 2 },
      'perfect-set',
    );
    assert.equal(imperfect.state, 'in_progress');
    assert.equal(imperfect.progress, 'Best so far 1 of 2');

    const perfect = byId(
      { ...empty, startedSets: 1, finishedSets: 1, perfectSets: 1, bestCorrect: 2, bestTotal: 2 },
      'perfect-set',
    );
    assert.equal(perfect.state, 'earned');
    assert.equal(perfect.reward, 'Gold star badge');
  });

  it('counts quick answers and practice days toward their badges', () => {
    const quick = byId({ ...empty, quickAnswers: 4 }, 'quick-answers');
    assert.equal(quick.state, 'in_progress');
    assert.equal(quick.current, 4);
    assert.equal(byId({ ...empty, quickAnswers: 5 }, 'quick-answers').state, 'earned');
    assert.equal(byId({ ...empty, quickAnswers: 8 }, 'quick-answers').progress, '5 of 5 quick answers');

    assert.equal(byId({ ...empty, practiceDays: 1 }, 'back-again').state, 'in_progress');
    const streak = byId({ ...empty, practiceDays: 2 }, 'back-again');
    assert.equal(streak.state, 'earned');
    assert.equal(streak.reward, 'Streak badge');
  });

  it('treats only timed answers under 10 seconds as quick', () => {
    assert.equal(isQuickAnswer(9999, '2026-10-10T00:00:00.000Z'), true);
    assert.equal(isQuickAnswer(0, '2026-10-10T00:00:00.000Z'), true);
    assert.equal(isQuickAnswer(10000, '2026-10-10T00:00:00.000Z'), false);
    assert.equal(isQuickAnswer(100, ''), false);
  });
});

describe('formatDuration', () => {
  it('reads as seconds and minutes', () => {
    assert.equal(formatDuration(400), 'under 1 second');
    assert.equal(formatDuration(1000), '1 second');
    assert.equal(formatDuration(8400), '8 seconds');
    assert.equal(formatDuration(60000), '1 min');
    assert.equal(formatDuration(125000), '2 min 5 sec');
  });
});
