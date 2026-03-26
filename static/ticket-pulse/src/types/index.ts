export type AiProvider = "openai" | "claude";

export interface AnalysisResult {
  score: number;
  label: "Poor" | "Needs work" | "Good" | "Excellent";
  findings: Finding[];
}

export interface Finding {
  status: "ok" | "warn" | "err";
  field: string;
  msg: string;
  suggestion?: string;
}

export interface FieldOption {
  id: string;
  name: string;
}

export interface AnalysisFieldMapping {
  id: string;
  jiraFieldId: string;
  jiraFieldName: string;
}

export interface IssueParsedData {
  key: string;
  summary: string;
  issueType: string;
  storyPoints: number | null;
  priority: string | null;
  labels: string[];
  components: string[];
  status: string;
  fieldValues: Record<string, string>;
}

export interface EstimationFieldConfig {
  jiraFieldId: string;
  jiraFieldName: string;
}

export interface SimilarTicket {
  key: string;
  summary: string;
  similarity: number;
  estimationValue: string | number | null;
}

export interface EstimationResult {
  suggested: string | number | null;
  teamSet: string | number | null;
  reason: string;
  similarTickets: SimilarTicket[];
  fieldName: string;
}

export interface StatusTransition {
  status: string;
  enteredAt: string;
  exitedAt: string | null;
  duration: number;
}

export interface TimelineResult {
  transitions: StatusTransition[];
  currentStatus: string;
  createdAt: string;
}
