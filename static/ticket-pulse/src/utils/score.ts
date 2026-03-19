import type { Grade } from '../types';
import type { RuleOutcome } from '../types/rules';

export function calculateOverallScore(outcomes: RuleOutcome[]): number {
  const totalEarned = outcomes.reduce((sum, o) => sum + o.score, 0);
  const totalPossible = outcomes.reduce((sum, o) => sum + o.maxScore, 0);
  if (totalPossible === 0) return 0;
  return Math.round((totalEarned / totalPossible) * 100);
}

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export interface GradeInfo {
  grade: Grade;
  label: string;
  color: string;
}

export type ColorTier = 'green' | 'cyan' | 'yellow' | 'orange' | 'red';

const GRADE_INFO: Record<Grade, { label: string; color: string; colorTier: ColorTier }> = {
  A: { label: 'Excellent', color: '#36B37E', colorTier: 'green' },
  B: { label: 'Good', color: '#00B8D9', colorTier: 'cyan' },
  C: { label: 'Needs Work', color: '#FFAB00', colorTier: 'yellow' },
  D: { label: 'Poor', color: '#FF5630', colorTier: 'orange' },
  F: { label: 'Insufficient', color: '#DE350B', colorTier: 'red' },
};

export function getGradeInfo(score: number): GradeInfo & { colorTier: ColorTier } {
  const grade = scoreToGrade(score);
  return { grade, ...GRADE_INFO[grade] };
}

export type ScoreTier = 'good' | 'warning' | 'error';

export function getScoreTier(passPercentage: number): ScoreTier {
  if (passPercentage >= 0.8) return 'good';
  if (passPercentage >= 0.5) return 'warning';
  return 'error';
}

export function generateSummary(score: number, outcomes: RuleOutcome[]): string {
  const { label } = getGradeInfo(score);
  const issues = outcomes.reduce((sum, o) => sum + o.findings.length, 0);
  if (issues === 0) return `Score ${score}/100 — ${label}. No issues found.`;
  return `Score ${score}/100 — ${label}. ${issues} issue${issues === 1 ? '' : 's'} found.`;
}
