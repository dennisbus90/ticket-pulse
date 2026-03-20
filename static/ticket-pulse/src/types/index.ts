export interface AnalysisResult {
  score: number;
  label: "Poor" | "Needs work" | "Good" | "Excellent";
  findings: Finding[];
  suggestion: string;
}

export interface Finding {
  status: "ok" | "warn" | "err";
  field: string;
  msg: string;
}

export interface FieldOption {
  id: string;
  name: string;
}

export interface IssueParsedData {
  key: string;
  summary: string;
  descriptionRaw: object | null;
  userStory: string;
  descriptionText: string;
  acceptanceCriteria: string;
  storyPoints: number | null;
  priority: string | null;
  issueType: string;
  labels: string[];
  components: string[];
  status: string;
}
