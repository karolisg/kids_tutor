import type { Operation } from './generate.js';

export function operationLabel(operation: string): string {
  switch (operation) {
    case 'add':
      return 'Addition';
    case 'subtract':
      return 'Subtraction';
    case 'multiply':
      return 'Multiplication';
    case 'divide':
      return 'Division';
    case 'add_subtract':
      return 'Add and subtract';
    case 'mixed':
      return 'Mixed operations';
    default:
      return 'Practice';
  }
}

export function difficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    default:
      return difficulty;
  }
}

export function operationSymbol(operation: string): string {
  switch (operation as Operation) {
    case 'add':
      return '+';
    case 'subtract':
      return '−';
    case 'multiply':
      return '×';
    case 'divide':
      return '÷';
    default:
      return '?';
  }
}

export function equation(problem: { left: number; right: number; operation: string }): string {
  return `${problem.left} ${operationSymbol(problem.operation)} ${problem.right}`;
}

export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
  if (safe < 1000) return 'under 1 second';
  const seconds = Math.round(safe / 1000);
  if (seconds < 60) return seconds === 1 ? '1 second' : `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const minuteLabel = minutes === 1 ? '1 min' : `${minutes} min`;
  if (rest === 0) return minuteLabel;
  return `${minuteLabel} ${rest} sec`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function scorePhrase(correct: number, total: number): string {
  if (total > 0 && correct === total) return 'Every one. Well done.';
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio >= 0.8) return 'Strong set.';
  if (ratio >= 0.5) return 'Good practice.';
  return 'That was a hard set. Another try will help.';
}
