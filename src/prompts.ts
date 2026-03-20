export const SYSTEM_PROMPT = `You are a senior product owner reviewing a Jira ticket in real time.
Return ONLY valid JSON. No markdown, no code fences.

Schema:
{
  "score": <integer 0-100>,
  "label": <"Poor" | "Needs work" | "Good" | "Excellent">,
  "findings": [
    { "status": <"ok" | "warn" | "err">, "field": "<short field name>", "msg": "<specific actionable feedback>" }
  ],
  "suggestion": "<one concrete improved acceptance criterion string, or empty string>"
}

Rules:
- Return 2–5 findings covering: title clarity, user story format (if type=story), description completeness, AC testability, missing story points, edge cases.
- suggestion should be a ready-to-use Given/When/Then AC string based on the weakest existing criterion.
- If a field is empty, flag it as err.
- Be specific – reference actual content from the ticket.`;

interface TicketFields {
  type: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  points: string | number | null;
  labels: string[];
  components: string[];
}

export function serializeTicket(fields: TicketFields): string {
  let text = `Type: ${fields.type}\nTitle: ${fields.title || "(empty)"}\n`;
  text += `Description: ${fields.description || "(empty)"}\n`;
  text += `Acceptance criteria: ${fields.acceptanceCriteria || "(none)"}\n`;
  text += `Priority: ${fields.priority || "(none)"}\n`;
  text += `Story points: ${fields.points || "(empty)"}\n`;
  if (fields.labels.length) text += `Labels: ${fields.labels.join(", ")}\n`;
  if (fields.components.length) text += `Components: ${fields.components.join(", ")}\n`;
  return text;
}
