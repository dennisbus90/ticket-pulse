import type { RuleOutcome } from './rules';

export interface AIAnalysisResult {
  score: number;
  missingEdgeCases: string[];
  unclearParts: string[];
  suggestions: string[];
}

export interface IssueParsedData {
  key: string;
  summary: string;
  descriptionRaw: object | null;
  descriptionText: string;
  acceptanceCriteria: string;
  storyPoints: number | null;
  priority: string | null;
  issueType: string;
  labels: string[];
  components: string[];
  status: string;
  aiAnalysis?: AIAnalysisResult | null;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ValidationResult {
  overallScore: number;
  grade: Grade;
  outcomes: RuleOutcome[];
  summary: string;
  timestamp: string;
}
