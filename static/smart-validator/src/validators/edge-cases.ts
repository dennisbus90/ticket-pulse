import type { IssueParsedData } from '../types';
import type { ValidationRule, RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';
import { containsKeywords } from '../utils/text-analysis';

const EDGE_CASE_KEYWORDS = [
  'error', 'edge case', 'boundary', 'null', 'empty',
  'invalid', 'timeout', 'retry', 'fallback', 'offline',
  'concurrent', 'race condition', 'permission', 'unauthorized',
  'limit', 'overflow', 'max', 'min', 'negative',
  'duplicate', 'conflict', 'failure', 'exception',
];

const SECTION_HEADINGS = /(?:edge\s+cases?|error\s+handling|considerations|assumptions|constraints|risks)/i;

export const edgeCasesRule: ValidationRule = {
  id: 'edge-cases',
  name: 'Edge Case Coverage',
  description: 'Checks whether error scenarios and edge cases are addressed',
  category: 'thoroughness',
  maxScore: 15,

  validate(data: IssueParsedData): RuleOutcome {
    const findings: Finding[] = [];
    const fullText = `${data.descriptionText}\n${data.acceptanceCriteria}`;

    const foundKeywords = containsKeywords(fullText, EDGE_CASE_KEYWORDS);
    const hasDedicatedSection = SECTION_HEADINGS.test(fullText);

    let score: number;
    let severity: RuleSeverity;

    if (foundKeywords.length === 0) {
      score = 0;
      severity = RuleSeverity.ERROR;
      findings.push({
        message: 'No edge case or error handling considerations found',
        suggestion: 'Add a section covering error scenarios, boundary conditions, and failure modes',
        severity: RuleSeverity.ERROR,
      });
    } else if (foundKeywords.length <= 2) {
      score = 5;
      severity = RuleSeverity.WARNING;
      findings.push({
        message: `Minimal edge case coverage (found: ${foundKeywords.join(', ')})`,
        suggestion: 'Consider adding more edge cases: What happens with invalid input? Network failures? Concurrent access?',
        severity: RuleSeverity.WARNING,
      });
    } else if (foundKeywords.length <= 5) {
      score = 10;
      severity = RuleSeverity.INFO;
      findings.push({
        message: `Decent edge case coverage (found: ${foundKeywords.join(', ')})`,
        suggestion: 'Good coverage. Consider if there are additional failure modes specific to this feature',
        severity: RuleSeverity.INFO,
      });
    } else {
      score = 15;
      severity = RuleSeverity.INFO;
    }

    // Bonus for dedicated section
    if (hasDedicatedSection && score < this.maxScore) {
      score = Math.min(this.maxScore, score + 3);
    } else if (!hasDedicatedSection && foundKeywords.length > 0) {
      findings.push({
        message: 'No dedicated "Edge Cases" or "Error Handling" section',
        suggestion: 'Consider adding a dedicated section to organize edge case considerations',
        severity: RuleSeverity.INFO,
      });
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      severity,
      passed: foundKeywords.length >= 6,
      findings,
    };
  },
};
