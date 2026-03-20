import type { IssueParsedData } from '../types';
import type { ValidationRule, RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';
import { parseBulletItems, findVagueWords, wordCount } from '../utils/text-analysis';

const GWT_PATTERN = /given\s.+when\s.+then\s/i;
const MEASURABLE_KEYWORDS = /\b(should|must|returns?|displays?|shows?|less than|greater than|at least|at most|within|equals?|contains?|exactly|no more than)\b/i;

export const acceptanceCriteriaRule: ValidationRule = {
  id: 'acceptance-criteria',
  name: 'Acceptance Criteria Quality',
  description: 'Evaluates whether acceptance criteria are testable and well-written',
  category: 'quality',
  maxScore: 30,

  validate(data: IssueParsedData): RuleOutcome {
    const findings: Finding[] = [];

    if (!data.acceptanceCriteria || data.acceptanceCriteria.trim().length === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        score: 0,
        maxScore: this.maxScore,
        severity: RuleSeverity.ERROR,
        passed: false,
        findings: [{
          message: 'No acceptance criteria found',
          suggestion: 'Add testable acceptance criteria using Given/When/Then format or clear bullet points',
          severity: RuleSeverity.ERROR,
        }],
      };
    }

    const criteria = parseBulletItems(data.acceptanceCriteria);
    let deductions = 0;
    let gwtBonus = 0;

    // Check criteria count
    if (criteria.length < 2) {
      findings.push({
        message: `Only ${criteria.length} acceptance criterion found`,
        suggestion: 'Add at least 2 acceptance criteria to cover the main scenarios',
        severity: RuleSeverity.WARNING,
      });
      deductions += 5;
    }

    // Evaluate each criterion
    criteria.forEach((criterion, index) => {
      const num = index + 1;

      // Given/When/Then check
      if (GWT_PATTERN.test(criterion)) {
        gwtBonus += 3;
      }

      // Vague words check
      const vagueWords = findVagueWords(criterion);
      if (vagueWords.length > 0) {
        findings.push({
          message: `Criterion #${num} uses vague language: "${vagueWords.join('", "')}"`,
          suggestion: `Replace with measurable outcomes (e.g., instead of "properly", specify the expected behavior)`,
          severity: RuleSeverity.WARNING,
        });
        deductions += 5;
      }

      // Too short check
      if (wordCount(criterion) < 10) {
        findings.push({
          message: `Criterion #${num} is very short (${wordCount(criterion)} words)`,
          suggestion: 'Add more detail about the expected behavior and conditions',
          severity: RuleSeverity.WARNING,
        });
        deductions += 5;
      }

      // Measurable outcome check
      if (!MEASURABLE_KEYWORDS.test(criterion) && !GWT_PATTERN.test(criterion)) {
        findings.push({
          message: `Criterion #${num} may lack a measurable outcome`,
          suggestion: 'Include verifiable conditions like "should display", "must return", or "within 3 seconds"',
          severity: RuleSeverity.INFO,
        });
        deductions += 2;
      }
    });

    // GWT format suggestion if none use it
    if (gwtBonus === 0 && criteria.length > 0) {
      findings.push({
        message: 'No criteria use Given/When/Then format',
        suggestion: 'Consider structuring criteria as: "Given [context], When [action], Then [expected result]"',
        severity: RuleSeverity.INFO,
      });
      deductions += 2;
    }

    const rawScore = this.maxScore - deductions + Math.min(gwtBonus, 5);
    const score = Math.max(0, Math.min(this.maxScore, rawScore));

    const worstSeverity = findings.length === 0
      ? RuleSeverity.INFO
      : findings.some((f) => f.severity === RuleSeverity.ERROR)
        ? RuleSeverity.ERROR
        : findings.some((f) => f.severity === RuleSeverity.WARNING)
          ? RuleSeverity.WARNING
          : RuleSeverity.INFO;

    return {
      ruleId: this.id,
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      severity: worstSeverity,
      passed: findings.length === 0,
      findings,
    };
  },
};
