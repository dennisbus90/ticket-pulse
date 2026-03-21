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
