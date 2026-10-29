export const QUICK_LIMIT_MS = 10_000;
export const QUICK_GOAL = 5;
export const DAY_GOAL = 2;

export type AchievementState = 'locked' | 'in_progress' | 'earned';

export type Achievement = {
  id: 'first-practice' | 'perfect-set' | 'quick-answers' | 'back-again';
  title: string;
  description: string;
  state: AchievementState;
  current: number;
  total: number;
  progress: string;
  badge: 'badge' | 'gold' | 'lightning' | 'streak';
  reward: string;
};

export type RewardStats = {
  finishedSets: number;
  startedSets: number;
  perfectSets: number;
  bestCorrect: number;
  bestTotal: number;
  quickAnswers: number;
  practiceDays: number;
  stars: number;
};

export function starLabel(stars: number): string {
  return stars === 1 ? '1 star' : `${stars} stars`;
}

export function isQuickAnswer(durationMs: number, shownAt: string): boolean {
  return shownAt !== '' && durationMs >= 0 && durationMs < QUICK_LIMIT_MS;
}

export function buildAchievements(stats: RewardStats): Achievement[] {
  return [firstPractice(stats), perfectSet(stats), quickAnswers(stats), backAgain(stats)];
}

function firstPractice(stats: RewardStats): Achievement {
  const state: AchievementState =
    stats.finishedSets >= 1 ? 'earned' : stats.startedSets > 0 ? 'in_progress' : 'locked';
  const current = Math.min(stats.finishedSets, 1);
  return {
    id: 'first-practice',
    title: 'First practice',
    description: 'Finish one set.',
    state,
    current,
    total: 1,
    progress: `${current} of 1 sets finished`,
    badge: 'badge',
    reward: 'Badge',
  };
}

function perfectSet(stats: RewardStats): Achievement {
  const earned = stats.perfectSets >= 1;
  const started = stats.finishedSets > 0;
  const state: AchievementState = earned ? 'earned' : started ? 'in_progress' : 'locked';
  const current = earned ? 1 : started ? stats.bestCorrect : 0;
  const total = earned ? 1 : started ? Math.max(stats.bestTotal, 1) : 1;
  let progress = 'Finish a set with every answer correct';
  if (earned) progress = 'A whole set correct';
  else if (started) progress = `Best so far ${stats.bestCorrect} of ${stats.bestTotal}`;
  return {
    id: 'perfect-set',
    title: 'Perfect set',
    description: 'Every question in a set correct.',
    state,
    current,
    total,
    progress,
    badge: 'gold',
    reward: 'Gold star badge',
  };
}

function quickAnswers(stats: RewardStats): Achievement {
  const current = Math.min(stats.quickAnswers, QUICK_GOAL);
  return {
    id: 'quick-answers',
    title: 'Quick answers',
    description: 'Five answers, each under 10 seconds.',
    state: goalState(stats.quickAnswers, QUICK_GOAL),
    current,
    total: QUICK_GOAL,
    progress: `${current} of ${QUICK_GOAL} quick answers`,
    badge: 'lightning',
    reward: 'Lightning badge',
  };
}

function backAgain(stats: RewardStats): Achievement {
  const current = Math.min(stats.practiceDays, DAY_GOAL);
  return {
    id: 'back-again',
    title: 'Back again',
    description: 'Play on two different days.',
    state: goalState(stats.practiceDays, DAY_GOAL),
    current,
    total: DAY_GOAL,
    progress: `${current} of ${DAY_GOAL} days`,
    badge: 'streak',
    reward: 'Streak badge',
  };
}

function goalState(current: number, goal: number): AchievementState {
  if (current >= goal) return 'earned';
  if (current > 0) return 'in_progress';
  return 'locked';
}
