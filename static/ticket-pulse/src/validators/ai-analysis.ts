import type { AIAnalysisResult } from '../types';
import type { RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';

export function buildAIOutcome(aiResult: AIAnalysisResult): RuleOutcome {
  const findings: Finding[] = [];

  // AI score context
  findings.push({
    message: `AI quality score: ${aiResult.score}/100`,
    severity: aiResult.score >= 70 ? RuleSeverity.INFO : RuleSeverity.WARNING,
  });

  // Missing edge cases
  for (const edgeCase of aiResult.missingEdgeCases) {
    findings.push({
      message: `Missing edge case: ${edgeCase}`,
      suggestion: 'Consider adding this scenario to your acceptance criteria or edge cases section',
      severity: RuleSeverity.WARNING,
    });
  }

  // Unclear parts
  for (const unclearPart of aiResult.unclearParts) {
    findings.push({
      message: `Unclear: ${unclearPart}`,
      suggestion: 'Clarify this part of the ticket with more specific language',
      severity: RuleSeverity.WARNING,
    });
  }

  // Suggestions
  for (const suggestion of aiResult.suggestions) {
    findings.push({
      message: suggestion,
      severity: RuleSeverity.INFO,
    });
  }

  return {
    ruleId: 'ai-analysis',
    ruleName: 'AI Analysis',
    score: 0,
    maxScore: 0,
    severity: findings.some((f) => f.severity === RuleSeverity.WARNING)
      ? RuleSeverity.WARNING
      : RuleSeverity.INFO,
    passed: aiResult.missingEdgeCases.length === 0 && aiResult.unclearParts.length === 0,
    findings,
  };
}
