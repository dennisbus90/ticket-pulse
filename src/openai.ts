export interface AIAnalysisResult {
  score: number;
  missingEdgeCases: string[];
  unclearParts: string[];
  suggestions: string[];
}

interface TicketData {
  summary: string;
  descriptionText: string;
  acceptanceCriteria: string;
}

export async function analyzeWithAI(
  ticket: TicketData,
  apiKey: string,
): Promise<AIAnalysisResult | null> {
  const prompt = `You are a Jira ticket quality analyst. Evaluate this ticket and respond in JSON only.

Title: ${ticket.summary}
Description: ${ticket.descriptionText}
Acceptance Criteria: ${ticket.acceptanceCriteria}

Respond with this exact JSON structure (no markdown, no extra text):
{
  "score": <0-100>,
  "missingEdgeCases": ["<edge case 1>", "<edge case 2>"],
  "unclearParts": ["<unclear part 1>", "<unclear part 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"]
}

Guidelines:
- score: overall quality from 0-100
- missingEdgeCases: specific edge cases the ticket should address but doesn't
- unclearParts: parts of the ticket that are ambiguous or need clarification
- suggestions: concrete, actionable improvements to make the ticket better
- Keep each array to 5 items max
- Be specific, not generic`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response, handling potential markdown code blocks
    const jsonStr = content.replace(/```json?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.missingEdgeCases) ||
      !Array.isArray(parsed.unclearParts) ||
      !Array.isArray(parsed.suggestions)
    ) {
      console.error("OpenAI returned invalid structure");
      return null;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      missingEdgeCases: parsed.missingEdgeCases.slice(0, 5),
      unclearParts: parsed.unclearParts.slice(0, 5),
      suggestions: parsed.suggestions.slice(0, 5),
    };
  } catch (err) {
    console.error("OpenAI analysis failed:", err);
    return null;
  }
}
