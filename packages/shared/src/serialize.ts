import type { WorkItemData, FieldMapping } from "./types";

export function serializeTicket(
  data: WorkItemData,
  fields: FieldMapping[],
): string {
  const seen = new Set<string>();
  let text = `Type: ${data.itemType || "task"}\nTitle: ${data.summary || "(empty)"}\n`;

  for (const field of fields) {
    if (!field.fieldId) continue;
    const value = (data.fieldValues[field.fieldId] ?? "").trim();
    if (!value) {
      text += `${field.fieldName}: (empty)\n`;
    } else if (!seen.has(value)) {
      seen.add(value);
      text += `${field.fieldName}: ${value}\n`;
    }
  }

  return text;
}
