import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";
import { extractTextFromAdf } from "./adf-utils";
import { SYSTEM_PROMPT } from "./prompts";

const resolver = new Resolver();

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

  // Read field mappings from per-user storage
  const [fieldUserStory, fieldDescription, fieldAC] = await Promise.all([
    storage.getSecret(`${accountId}:field_userStory`),
    storage.getSecret(`${accountId}:field_description`),
    storage.getSecret(`${accountId}:field_acceptanceCriteria`),
  ]);

  const userStory = fieldUserStory
    ? extractFieldText(fields, fieldUserStory as string)
    : "";

  const descriptionText = fieldDescription
    ? extractFieldText(fields, fieldDescription as string)
    : (fields.description ? extractTextFromAdf(fields.description) : "");

  const acceptanceCriteria = fieldAC
    ? extractFieldText(fields, fieldAC as string)
    : "";

  return {
    key: issueKey,
    summary: fields.summary || "",
    descriptionRaw: fields.description,
    userStory,
    descriptionText,
    acceptanceCriteria,
    storyPoints: fields.story_points ?? fields.customfield_10016 ?? null,
    priority: fields.priority?.name ?? null,
    issueType: fields.issuetype?.name ?? "",
    labels: fields.labels ?? [],
    components: (fields.components ?? []).map((c: any) => c.name),
    status: fields.status?.name ?? "",
  };
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
