import type { IssueParsedData } from '../types';
import type { ValidationRule, RuleOutcome, Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';
import { wordCount, getSentences, findUndefinedAcronyms, isPassiveVoice } from '../utils/text-analysis';

export const clarityRule: ValidationRule = {
  id: 'clarity',
  name: 'Clarity',
  description: 'Evaluates readability, precision, and title quality',
  category: 'readability',
  maxScore: 10,

  validate(data: IssueParsedData): RuleOutcome {
    const findings: Finding[] = [];
    let deductions = 0;

    // Title quality
    const titleWords = wordCount(data.summary);
    if (titleWords < 5) {
      findings.push({
        message: `Summary is too short (${titleWords} words)`,
        suggestion: 'A good summary is 5-15 words and clearly describes the goal',
        severity: RuleSeverity.WARNING,
      });
      deductions += 2;
    } else if (titleWords > 15) {
      findings.push({
        message: `Summary is too long (${titleWords} words)`,
        suggestion: 'Keep the summary under 15 words; move details to the description',
        severity: RuleSeverity.WARNING,
      });
      deductions += 2;
    }

    if (!data.descriptionText || data.descriptionText.trim().length === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        score: Math.max(0, this.maxScore - deductions),
        maxScore: this.maxScore,
        severity: deductions > 0 ? RuleSeverity.WARNING : RuleSeverity.INFO,
        passed: deductions === 0,
        findings,
      };
    }

    // Undefined acronyms
    const undefinedAcronyms = findUndefinedAcronyms(data.descriptionText);
    if (undefinedAcronyms.length > 5) {
      findings.push({
        message: `${undefinedAcronyms.length} undefined acronyms: ${undefinedAcronyms.slice(0, 5).join(', ')}${undefinedAcronyms.length > 5 ? '...' : ''}`,
        suggestion: 'Define acronyms on first use or add a glossary',
        severity: RuleSeverity.INFO,
      });
      deductions += 1;
    }

    // Long sentences
    const sentences = getSentences(data.descriptionText);
    const longSentences = sentences.filter((s) => wordCount(s) > 40);
    if (longSentences.length > 0) {
      findings.push({
        message: `${longSentences.length} sentence${longSentences.length > 1 ? 's' : ''} over 40 words`,
        suggestion: 'Break long sentences into shorter ones for clarity',
        severity: RuleSeverity.WARNING,
      });
      deductions += 2;
    }

    // Passive voice
    if (sentences.length > 0) {
      const passiveCount = sentences.filter(isPassiveVoice).length;
      const passiveRatio = passiveCount / sentences.length;
      if (passiveRatio > 0.3) {
        findings.push({
          message: `${Math.round(passiveRatio * 100)}% of sentences use passive voice`,
          suggestion: 'Use active voice (e.g., "The system displays..." instead of "The result is displayed...")',
          severity: RuleSeverity.INFO,
        });
        deductions += 1;
      }
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
