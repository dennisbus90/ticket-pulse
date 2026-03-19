import type { IssueParsedData } from '../types';
import type { ValidationRule, RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';

export const missingFieldsRule: ValidationRule = {
  id: 'missing-fields',
  name: 'Missing Fields',
  description: 'Checks that essential ticket fields are populated',
  category: 'completeness',
  maxScore: 25,

  validate(data: IssueParsedData): RuleOutcome {
    const findings: Finding[] = [];
    let deductions = 0;

    // Summary checks
    if (!data.summary || data.summary.trim().length === 0) {
      findings.push({
        message: 'Summary is empty',
        suggestion: 'Add a concise summary describing the ticket goal',
        severity: RuleSeverity.ERROR,
      });
      deductions += 10;
    } else if (data.summary.trim().length < 10) {
      findings.push({
        message: `Summary is very short (${data.summary.trim().length} chars)`,
        suggestion: 'Expand the summary to clearly describe what this ticket accomplishes',
        severity: RuleSeverity.ERROR,
      });
      deductions += 10;
    }

    // Description checks
    if (!data.descriptionText || data.descriptionText.trim().length === 0) {
      findings.push({
        message: 'Description is empty',
        suggestion: 'Add a description explaining the context, requirements, and expected behavior',
        severity: RuleSeverity.ERROR,
      });
      deductions += 10;
    } else if (data.descriptionText.trim().length < 50) {
      findings.push({
        message: `Description is very short (${data.descriptionText.trim().length} chars)`,
        suggestion: 'Expand the description with more context and details',
        severity: RuleSeverity.WARNING,
      });
      deductions += 5;
    }

    // Acceptance criteria
    if (!data.acceptanceCriteria || data.acceptanceCriteria.trim().length === 0) {
      findings.push({
        message: 'No acceptance criteria found',
        suggestion: 'Add an "Acceptance Criteria" section with testable conditions',
        severity: RuleSeverity.ERROR,
      });
      deductions += 10;
    }

    // Priority
    if (!data.priority) {
      findings.push({
        message: 'Priority is not set',
        suggestion: 'Set a priority to help with backlog prioritization',
        severity: RuleSeverity.WARNING,
      });
      deductions += 3;
    }

    // Story points
    if (data.storyPoints === null || data.storyPoints === undefined) {
      findings.push({
        message: 'Story points are not estimated',
        suggestion: 'Add a story point estimate to help with sprint planning',
        severity: RuleSeverity.WARNING,
      });
      deductions += 3;
    }

    // Labels/components
    if (data.labels.length === 0 && data.components.length === 0) {
      findings.push({
        message: 'No labels or components assigned',
        suggestion: 'Add labels or components to improve discoverability and filtering',
        severity: RuleSeverity.INFO,
      });
      deductions += 2;
    }

    const score = Math.max(0, this.maxScore - deductions);
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
