import type { IssueParsedData } from './index';

export enum RuleSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Finding {
  message: string;
  suggestion?: string;
  severity: RuleSeverity;
}

export interface RuleOutcome {
  ruleId: string;
  ruleName: string;
  score: number;
  maxScore: number;
  severity: RuleSeverity;
  passed: boolean;
  findings: Finding[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  maxScore: number;
  validate(data: IssueParsedData): RuleOutcome;
}
