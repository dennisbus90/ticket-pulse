import { useState, useCallback } from "react";
import type {
  AnalysisResult,
  WorkItemData,
  FieldMapping,
  AiProvider,
} from "@ticket-pulse/shared";
import { serializeTicket } from "@ticket-pulse/shared";
import { analyzeViaProxy } from "../api/proxy";

interface UseAnalysisResult {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => void;
}

const MOCK_ANALYSES: Record<string, AnalysisResult> = {
  "101": {
    score: 92,
    label: "Excellent",
    findings: [
      { status: "ok", field: "Title", msg: "Clear and descriptive title." },
      {
        status: "ok",
        field: "Description",
        msg: "Thorough description with edge cases.",
      },
      {
        status: "ok",
        field: "Acceptance Criteria",
        msg: "Well-structured scenarios.",
      },
      {
        status: "ok",
        field: "Story Points",
        msg: "Story points are set and reasonable.",
      },
    ],
  },
};

export function useAnalysis(
  data: WorkItemData | null,
  model: string,
  analysisFields: FieldMapping[],
  provider: AiProvider = "openai",
  apiKey?: string,
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
        const mock = MOCK_ANALYSES[data.key] ?? MOCK_ANALYSES["101"];
        setAnalysis({ ...mock });
        return;
      }

      if (!apiKey) {
        throw new Error("No API key configured. Please add one in Settings.");
      }

      const ticketText = serializeTicket(data, analysisFields);
      console.log("data", data, ticketText);
      const result = await analyzeViaProxy({
        ticketText,
        provider,
        model,
        apiKey,
      });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [data, model, analysisFields, provider, apiKey]);

  return { analysis, loading, error, analyze };
}
