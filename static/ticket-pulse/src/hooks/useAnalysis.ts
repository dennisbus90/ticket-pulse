import { useState, useCallback } from "react";
import type { AnalysisResult, IssueParsedData, AnalysisFieldMapping } from "../types";

interface UseAnalysisResult {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => void;
}

function serializeTicket(
  data: IssueParsedData,
  fields: AnalysisFieldMapping[],
): string {
  const seen = new Set<string>();
  let text = `Type: ${data.issueType || "task"}\nTitle: ${data.summary || "(empty)"}\n`;

  for (const field of fields) {
    if (!field.jiraFieldId) continue;
    const value = (data.fieldValues[field.jiraFieldId] ?? "").trim();
    if (!value) {
      text += `${field.jiraFieldName}: (empty)\n`;
    } else if (!seen.has(value)) {
      seen.add(value);
      text += `${field.jiraFieldName}: ${value}\n`;
    }
  }

  return text;
}

const MOCK_ANALYSIS: AnalysisResult = {
  score: 72,
  label: "Good",
  findings: [
    { status: "ok", field: "Title", msg: "Clear and descriptive title that communicates the feature intent." },
    { status: "warn", field: "Acceptance Criteria", msg: "Criteria lack measurable outcomes. Consider adding specific Given/When/Then scenarios.", suggestion: "- Given a registered user, When they click \"Forgot Password\" and enter their email, Then a reset link is sent within 30 seconds\n- Given a valid reset token, When the user submits a new password meeting complexity requirements, Then the password is updated and all previous tokens are invalidated\n- Given an expired token (older than 24 hours), When the user clicks the link, Then they see an error message with a prompt to request a new link" },
    { status: "err", field: "Description", msg: "No error handling or edge cases mentioned. What happens on timeout or invalid input?", suggestion: "The password reset flow sends a time-limited token via email. The user clicks the link, enters a new password, and is redirected to the login page with a success message.\n\n## Edge Cases\n- User requests multiple reset links — only the latest token should be valid\n- Invalid or malformed token — display a clear error, do not expose stack traces\n- Network timeout during email delivery — retry up to 3 times with exponential backoff" },
    { status: "ok", field: "Story Points", msg: "Story points are set and reasonable for the scope described." },
  ],
};

export function useAnalysis(
  data: IssueParsedData | null,
  model: string,
  analysisFields: AnalysisFieldMapping[],
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
        setAnalysis({ ...MOCK_ANALYSIS });
        return;
      }

      const { invoke } = await import("@forge/bridge");
      const ticketText = serializeTicket(data, analysisFields);
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
  }, [data, model, analysisFields]);

  return { analysis, loading, error, analyze };
}
