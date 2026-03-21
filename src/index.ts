import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";
import { extractTextFromAdf } from "./adf-utils";
import { SYSTEM_PROMPT } from "./prompts";

const resolver = new Resolver();

function textToAdf(text: string): object {
  const paragraphs = text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  }));
  return { version: 1, type: "doc", content: paragraphs };
}

function extractFieldText(fields: any, fieldId: string): string {
  const value = fields[fieldId];
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.type) {
    return extractTextFromAdf(value);
  }
  return String(value);
}

resolver.define("getJiraFields", async ({ context }: any) => {
  const response = await api.asUser().requestJira(
    route`/rest/api/3/field`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch fields: ${response.status}`);
  }

  const allFields: any[] = await response.json();

  const textFields = allFields
    .filter((f: any) => {
      if (f.id === "description" || f.id === "summary") return true;
      if (!f.schema) return false;
      const type = f.schema.type;
      const custom = f.schema.custom;
      return (
        type === "string" ||
        type === "any" ||
        custom === "com.atlassian.jira.plugin.system.customfieldtypes:textarea" ||
        custom === "com.atlassian.jira.plugin.system.customfieldtypes:textfield"
      );
    })
    .map((f: any) => ({ id: f.id, name: f.name }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return textFields;
});

resolver.define("getIssueData", async ({ context }: any) => {
  const issueKey = context.extension.issue.key;
  const accountId = context.accountId;

  const response = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Jira API error:", body);
    throw new Error(`Failed to fetch issue: ${response.status}`);
  }

  const issue = await response.json();
  const fields = issue.fields;

  // Extract text from all fields so the frontend can pick which ones to analyze
  const fieldValues: Record<string, string> = {};
  for (const [fieldId, fieldVal] of Object.entries(fields)) {
    const text = extractFieldText(fields, fieldId);
    if (text) {
      fieldValues[fieldId] = text;
    }
  }

  return {
    key: issueKey,
    summary: fields.summary || "",
    issueType: fields.issuetype?.name ?? "",
    storyPoints: fields.story_points ?? fields.customfield_10016 ?? null,
    priority: fields.priority?.name ?? null,
    labels: fields.labels ?? [],
    components: (fields.components ?? []).map((c: any) => c.name),
    status: fields.status?.name ?? "",
    fieldValues,
  };
});

resolver.define("updateJiraField", async ({ payload, context }: any) => {
  const issueKey = context.extension.issue.key;
  const { fieldId, value, isAdf } = payload;

  if (!fieldId || value === undefined) {
    throw new Error("fieldId and value are required");
  }

  const fieldValue = isAdf ? textToAdf(value) : value;

  const response = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: { [fieldId]: fieldValue },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Update field error:", body);
    throw new Error(`Failed to update field: ${response.status}`);
  }

  return { success: true };
});

resolver.define("analyzeTicket", async ({ payload, context }: any) => {
  const { ticketText } = payload;
  const model = typeof payload.model === "string" ? payload.model : "gpt-4o";
  const accountId = context.accountId;

  const apiKey = await storage.getSecret(`${accountId}:openaiApiKey`);
  if (!apiKey) {
    throw new Error("No API key configured");
  }

  const requestBody = {
    model: model || "gpt-4o",
    max_tokens: 600,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ticketText },
    ],
  };

  const res = await api.fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const json: any = await res.json();
  if (json.error) throw new Error(json.error.message);

  const raw = json.choices[0].message.content
    .replace(/```json?\n?|\n?```/g, "")
    .trim();
  return JSON.parse(raw);
});

resolver.define("getStorageValue", async ({ payload, context }: any) => {
  const userKey = `${context.accountId}:${payload.key}`;
  if (payload.key === "openaiApiKey") {
    const val = await storage.getSecret(userKey);
    return { exists: !!val };
  }
  return await storage.getSecret(userKey);
});

resolver.define("setStorageValue", async ({ payload, context }: any) => {
  const userKey = `${context.accountId}:${payload.key}`;
  if (payload.value === null || payload.value === undefined) {
    await storage.deleteSecret(userKey);
  } else {
    await storage.setSecret(userKey, payload.value);
  }
  return { success: true };
});

export const handler = resolver.getDefinitions();
