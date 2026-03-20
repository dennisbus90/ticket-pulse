import { useState, useCallback } from "react";
import type { AnalysisResult, IssueParsedData } from "../types";

interface UseAnalysisResult {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => void;
}

function serializeTicket(data: IssueParsedData): string {
  let text = `Type: ${data.issueType || "task"}\nTitle: ${data.summary || "(empty)"}\n`;
  if (data.userStory) text += `User story: ${data.userStory}\n`;
  text += `Description: ${data.descriptionText || "(empty)"}\n`;
  text += `Acceptance criteria: ${data.acceptanceCriteria || "(none)"}\n`;
  text += `Priority: ${data.priority || "(none)"}\n`;
  text += `Story points: ${data.storyPoints || "(empty)"}\n`;
  if (data.labels.length) text += `Labels: ${data.labels.join(", ")}\n`;
  if (data.components.length) text += `Components: ${data.components.join(", ")}\n`;
  return text;
}

const MOCK_ANALYSIS: AnalysisResult = {
  score: 72,
  label: "Good",
  findings: [
    { status: "ok", field: "Title", msg: "Clear and descriptive title that communicates the feature intent." },
    { status: "warn", field: "Acceptance Criteria", msg: "Criteria lack measurable outcomes. Consider adding specific Given/When/Then scenarios." },
    { status: "err", field: "Edge Cases", msg: "No error handling or edge cases mentioned. What happens on timeout or invalid input?" },
    { status: "ok", field: "Story Points", msg: "Story points are set and reasonable for the scope described." },
  ],
  suggestion: "Given a user submits the form with an invalid email, When the validation runs, Then an inline error message should appear within 200ms and the submit button should remain disabled.",
};

export function useAnalysis(
  data: IssueParsedData | null,
  model: string,
): UseAnalysisResult {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!data) return;

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 800));
        setAnalysis(MOCK_ANALYSIS);
        return;
      }

      const { invoke } = await import("@forge/bridge");
      const ticketText = serializeTicket(data);
      const result = await invoke<AnalysisResult>("analyzeTicket", {
        ticketText,
        model: typeof model === "string" ? model : "gpt-4o",
      });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [data, model]);

  return { analysis, loading, error, analyze };
}
