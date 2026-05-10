import { useState, useCallback } from "react";
import type { EstimationResult, EstimationFieldConfig } from "../types";

interface UseEstimationAnalysisResult {
  estimation: EstimationResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => void;
}

const MOCK_ESTIMATION: EstimationResult = {
  suggested: 5,
  teamSet: 3,
  reason:
    'Most similar completed tickets (PROJ-88, PROJ-72, PROJ-45) were estimated at 5/5/8. Suggestion based on 5 similar tickets.',
  similarTickets: [
    { key: "PROJ-88", summary: "Implement OAuth2 login flow", similarity: 0.42, estimationValue: 5 },
    { key: "PROJ-72", summary: "Add email verification endpoint", similarity: 0.38, estimationValue: 5 },
    { key: "PROJ-45", summary: "Password reset with token validation", similarity: 0.35, estimationValue: 8 },
    { key: "PROJ-91", summary: "User session management API", similarity: 0.28, estimationValue: 3 },
    { key: "PROJ-63", summary: "Add two-factor auth support", similarity: 0.25, estimationValue: 5 },
  ],
  fieldName: "Story Points",
};

export function useEstimationAnalysis(
  estimationField: EstimationFieldConfig | null,
): UseEstimationAnalysisResult {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!estimationField) return;

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 600));
        setEstimation({ ...MOCK_ESTIMATION });
        return;
      }

      const { invoke } = await import("@forge/bridge");
      const result = await invoke<EstimationResult>("analyzeEstimation", {
        estimationFieldId: estimationField.jiraFieldId,
        estimationFieldName: estimationField.jiraFieldName,
      });
      setEstimation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimation analysis failed");
    } finally {
      setLoading(false);
    }
  }, [estimationField]);

  return { estimation, loading, error, analyze };
}
