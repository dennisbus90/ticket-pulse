import type { IssueParsedData } from '../types';
import type { ValidationRule, RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';
import { wordCount, parseBulletItems, countPattern } from '../utils/text-analysis';

const COMPOUND_PATTERNS = /\b(and also|additionally|another thing|furthermore|moreover|on top of that|as well as)\b/i;

export const scopeCheckRule: ValidationRule = {
  id: 'scope-check',
  name: 'Scope Check',
  description: 'Detects tickets that may be too large or trying to do too much',
  category: 'scope',
  maxScore: 20,

  validate(data: IssueParsedData): RuleOutcome {
    const findings: Finding[] = [];
    let deductions = 0;

    const descWords = wordCount(data.descriptionText);
    const acItems = data.acceptanceCriteria
      ? parseBulletItems(data.acceptanceCriteria).length
      : 0;

    // Description length check
    if (descWords > 800) {
      findings.push({
        message: `Description is very long (${descWords} words)`,
        suggestion: 'Consider splitting this into multiple tickets or using subtasks',
        severity: RuleSeverity.WARNING,
      });
      deductions += 4;
    }

    // Too many acceptance criteria
    if (acItems > 8) {
      findings.push({
        message: `${acItems} acceptance criteria found — scope may be too large`,
        suggestion: 'Consider breaking this ticket into smaller, focused stories',
        severity: RuleSeverity.WARNING,
      });
      deductions += 4;
    }

    // Multiple concerns detection
    const compoundMatches = countPattern(data.descriptionText, new RegExp(COMPOUND_PATTERNS.source, 'gi'));
    const headingSections = countPattern(data.descriptionText, /\n#{1,3}\s/g);

    if (compoundMatches >= 3 || headingSections >= 4) {
      findings.push({
        message: 'Ticket appears to cover multiple concerns',
        suggestion: 'Each ticket should address a single, well-defined piece of work',
        severity: RuleSeverity.WARNING,
      });
      deductions += 4;
    }

    // Story points vs AC mismatch
    if (data.storyPoints !== null) {
      if (data.storyPoints < 3 && acItems > 5) {
        findings.push({
          message: `Low estimate (${data.storyPoints} points) with ${acItems} acceptance criteria`,
          suggestion: 'The estimate may be too low for the number of requirements, or consider splitting',
          severity: RuleSeverity.INFO,
        });
        deductions += 2;
      }
      if (data.storyPoints > 8) {
        findings.push({
          message: `High estimate (${data.storyPoints} points) — consider breaking down`,
          suggestion: 'Stories over 8 points are harder to estimate accurately; split into smaller pieces',
          severity: RuleSeverity.INFO,
        });
        deductions += 2;
      }
    }

    // Subtask suggestion for stories
    if (data.issueType.toLowerCase() === 'story' && acItems > 6) {
      findings.push({
        message: 'Large story — consider using subtasks',
        suggestion: 'Break acceptance criteria into subtasks for better tracking and parallelization',
        severity: RuleSeverity.INFO,
      });
      deductions += 2;
    }

    const score = Math.max(0, this.maxScore - deductions);

    const worstSeverity = findings.length === 0
      ? RuleSeverity.INFO
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
