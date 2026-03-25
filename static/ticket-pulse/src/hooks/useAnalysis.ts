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

const MOCK_ANALYSES: Record<string, AnalysisResult> = {
  "PROJ-101": {
    score: 92,
    label: "Excellent",
    findings: [
      { status: "ok", field: "Title", msg: "Clear and descriptive title that communicates the feature intent." },
      { status: "ok", field: "Description", msg: "Thorough description with edge cases, error handling, and implementation details." },
      { status: "ok", field: "Acceptance Criteria", msg: "Well-structured Given/When/Then scenarios covering happy path, edge cases, and security." },
      { status: "ok", field: "Story Points", msg: "Story points are set and reasonable for the scope described." },
    ],
  },
  "PROJ-205": {
    score: 18,
    label: "Poor",
    findings: [
      { status: "err", field: "Title", msg: "Title is too vague — 'Fix bug' gives no context about what is broken or where.", suggestion: "Fix display rendering glitch on invoice PDF export" },
      { status: "err", field: "Description", msg: "Description is unfocused. Mixes bug fix, styling, new features, refactoring, performance, and tests into one ticket.", suggestion: "The invoice PDF export renders line items with overlapping text when the description exceeds 120 characters.\n\n## Steps to Reproduce\n1. Create an invoice with a line item description over 120 characters\n2. Click 'Export PDF'\n3. Observe overlapping text in the line items section\n\n## Expected Behavior\nLong descriptions should wrap cleanly within the column bounds." },
      { status: "err", field: "Acceptance Criteria", msg: "Criteria are not measurable. 'It works' and 'Looks good' cannot be verified.", suggestion: "- Given an invoice with line items exceeding 120 characters, When the PDF is exported, Then text wraps within column boundaries without overlap\n- Given any invoice, When exported, Then the PDF matches the on-screen preview layout" },
      { status: "err", field: "Story Points", msg: "No story points set. The scope is unclear so estimation is impossible." },
    ],
  },
  "PROJ-150": {
    score: 45,
    label: "Needs work",
    findings: [
      { status: "ok", field: "Title", msg: "Title is descriptive and communicates the task clearly." },
      { status: "warn", field: "Description", msg: "Description states what needs to change but lacks specifics about the new design, breakpoints, or component states.", suggestion: "Update the user profile page to match the new design system (Figma link: ...).\n\n## Scope\n- Header section: new gradient background, updated typography\n- Avatar upload: drag-and-drop zone, crop dialog, max 5MB\n- Form fields: migrate to new TextField component with validation states\n\n## Out of Scope\n- Password change flow (separate ticket)" },
      { status: "err", field: "Acceptance Criteria", msg: "No acceptance criteria provided. Add testable criteria for each UI section.", suggestion: "- Given a logged-in user, When they visit /profile, Then the page renders with the new header, avatar section, and form fields\n- Given a user uploading an avatar, When the file exceeds 5MB, Then an error message is shown\n- Given a user on mobile (< 768px), When viewing the profile page, Then the layout stacks vertically" },
      { status: "warn", field: "Story Points", msg: "No story points set. Consider estimating based on the number of components to update." },
    ],
  },
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
        const mock = MOCK_ANALYSES[data.key] ?? MOCK_ANALYSES["PROJ-101"];
        setAnalysis({ ...mock });
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
