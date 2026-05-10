import { useState, useCallback } from "react";
import type { EstimationResult, EstimationFieldConfig } from "@ticket-pulse/shared";
import { normalizeText, jaccardSimilarity, computeSuggestion } from "@ticket-pulse/shared";
import { fetchCompletedWorkItems } from "../api/wiql";

interface UseEstimationAnalysisResult {
  estimation: EstimationResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => void;
}

const MOCK_ESTIMATION: EstimationResult = {
  suggested: 5,
  teamSet: 3,
  reason: "Most similar completed work items (101, 72, 45) were estimated at 5/5/8. Suggestion based on 5 similar items.",
  similarTickets: [
    { key: "101", summary: "Implement OAuth2 login flow", similarity: 0.42, estimationValue: 5 },
    { key: "72", summary: "Add email verification endpoint", similarity: 0.38, estimationValue: 5 },
    { key: "45", summary: "Password reset with token validation", similarity: 0.35, estimationValue: 8 },
  ],
  fieldName: "Story Points",
};

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export function useEstimationAnalysis(
  estimationField: EstimationFieldConfig | null,
  currentSummary: string | null,
  currentDescription: string | null,
  currentEstimationValue: string | number | null,
  projectName: string | null,
  workItemId: number | null,
): UseEstimationAnalysisResult {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!estimationField || !projectName || workItemId === null) return;

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 600));
        setEstimation({ ...MOCK_ESTIMATION });
        return;
      }

      const historicalItems = await fetchCompletedWorkItems(
        projectName,
        workItemId,
        estimationField.fieldId,
      );

      const summaryText = currentSummary ?? "";
      const descText = currentDescription ? (currentDescription.startsWith("<") ? stripHtml(currentDescription) : currentDescription) : "";
      const currentKeywords = normalizeText(`${summaryText} ${descText}`);

      const scored: Array<{
        key: string;
        summary: string;
        similarity: number;
        estimationValue: string | number | null;
      }> = [];

      for (const item of historicalItems) {
        const estVal = item.fields[estimationField.fieldId];
        if (estVal === null || estVal === undefined) continue;

        const hDesc = item.fields["System.Description"] ?? "";
        const hDescStr = typeof hDesc === "string" ? hDesc : "";
        const hDescText = hDescStr.startsWith("<") ? stripHtml(hDescStr) : hDescStr;
        const hKeywords = normalizeText(`${item.summary} ${hDescText}`);
        const sim = jaccardSimilarity(currentKeywords, hKeywords);

        if (sim > 0.05) {
          const estValue = typeof estVal === "number" ? estVal : typeof estVal === "string" ? estVal : null;
          scored.push({
            key: item.key,
            summary: item.summary,
            similarity: Math.round(sim * 100) / 100,
            estimationValue: estValue,
          });
        }
      }

      scored.sort((a, b) => b.similarity - a.similarity);
      const topSimilar = scored.slice(0, 10);

      const suggested = computeSuggestion(
        topSimilar
          .filter((t) => t.estimationValue !== null)
          .map((t) => ({ value: t.estimationValue!, similarity: t.similarity })),
      );

      let reason: string;
      if (topSimilar.length === 0) {
        reason = "Not enough similar completed work items found to suggest an estimation.";
      } else {
        const values = topSimilar.map((t) => String(t.estimationValue));
        const topKeys = topSimilar.slice(0, 3).map((t) => t.key).join(", ");
        reason = `Most similar completed items (${topKeys}) were estimated at ${values.slice(0, 5).join("/")}. Suggestion based on ${topSimilar.length} similar item${topSimilar.length > 1 ? "s" : ""}.`;
      }

      setEstimation({
        suggested,
        teamSet: currentEstimationValue,
        reason,
        similarTickets: topSimilar.slice(0, 5),
        fieldName: estimationField.fieldName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimation analysis failed");
    } finally {
      setLoading(false);
    }
  }, [estimationField, currentSummary, currentDescription, currentEstimationValue, projectName, workItemId]);

  return { estimation, loading, error, analyze };
}
