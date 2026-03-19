import type { IssueParsedData, ValidationResult } from '../types';
import type { ValidationRule, RuleOutcome } from '../types/rules';
import { calculateOverallScore, scoreToGrade, generateSummary } from '../utils/score';
import { missingFieldsRule } from './missing-fields';
import { acceptanceCriteriaRule } from './acceptance-criteria';
import { scopeCheckRule } from './scope-check';
import { edgeCasesRule } from './edge-cases';
import { clarityRule } from './clarity';
import { buildAIOutcome } from './ai-analysis';

const rules: ValidationRule[] = [
  missingFieldsRule,
  acceptanceCriteriaRule,
  scopeCheckRule,
  edgeCasesRule,
  clarityRule,
];

export function runAll(data: IssueParsedData): ValidationResult {
  const outcomes: RuleOutcome[] = rules.map((rule) => rule.validate(data));

  // AI analysis is advisory — appended but doesn't affect the score
  if (data.aiAnalysis) {
    outcomes.push(buildAIOutcome(data.aiAnalysis));
  }

  // Score is calculated only from text-based rules (maxScore: 0 entries are excluded)
  const overallScore = calculateOverallScore(outcomes);
  const grade = scoreToGrade(overallScore);
  const summary = generateSummary(overallScore, outcomes);

  return {
    overallScore,
    grade,
    outcomes,
    summary,
    timestamp: new Date().toISOString(),
  };
}

export { rules };
