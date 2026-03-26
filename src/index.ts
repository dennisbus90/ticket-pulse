import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";
import { extractTextFromAdf } from "./adf-utils";
import { buildSystemPrompt } from "./prompts";

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
  const response = await api.asUser().requestJira(route`/rest/api/3/field`, {
    headers: { Accept: "application/json" },
  });

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
        custom ===
          "com.atlassian.jira.plugin.system.customfieldtypes:textarea" ||
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

  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}`, {
      headers: { Accept: "application/json" },
    });

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

  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: { [fieldId]: fieldValue },
      }),
    });

  if (!response.ok) {
    const body = await response.text();
    console.error("Update field error:", body);
    throw new Error(`Failed to update field: ${response.status}`);
  }

  return { success: true };
});

async function fetchProjectContext(
  issueKey: string,
): Promise<string | undefined> {
  try {
    const projectKey = issueKey.split("-")[0];
    const jql = `project = ${projectKey} ORDER BY created DESC`;
    const maxResults = 20;
    const fields = "summary,issuetype,status,description";
    const searchRes = await api
      .asUser()
      .requestJira(
        route`/rest/api/3/search/jql?jql=${jql}&maxResults=${maxResults}&fields=${fields}`,
        { headers: { Accept: "application/json" } },
      );

    if (!searchRes.ok) {
      const body = await searchRes.text();
      console.error("Project context search failed:", searchRes.status, body);
      return undefined;
    }

    const data = await searchRes.json();
    const lines: string[] = [];
    for (const issue of data.issues ?? []) {
      if (issue.key === issueKey) continue;
      const f = issue.fields;
      const type = f.issuetype?.name ?? "Task";
      const status = f.status?.name ?? "";
      const summary = f.summary ?? "";
      const desc = extractFieldText(f, "description");
      const snippet = desc
        ? ` — ${desc.slice(0, 100).replace(/\n/g, " ")}`
        : "";
      lines.push(`- ${issue.key} [${type}] ${summary} (${status})${snippet}`);
    }
    const result = lines.length > 0 ? lines.join("\n") : undefined;
    return result;
  } catch (err) {
    console.error("fetchProjectContext error:", err);
    return undefined;
  }
}

resolver.define("analyzeTicket", async ({ payload, context }: any) => {
  const { ticketText } = payload;
  const provider = payload.provider === "claude" ? "claude" : "openai";
  const accountId = context.accountId;
  const issueKey = context.extension.issue.key;
  const keyId = payload.keyId;

  const projectContext = await fetchProjectContext(issueKey);
  const systemPrompt = buildSystemPrompt(projectContext);

  // Fetch API key: by keyId if provided, fallback to legacy storage keys
  const storageKey = keyId
    ? `apiKey_${keyId}`
    : provider === "claude"
      ? "claudeApiKey"
      : "openaiApiKey";

  let raw: string;

  if (provider === "claude") {
    const model =
      typeof payload.model === "string"
        ? payload.model
        : "claude-sonnet-4-5-20250514";
    const apiKey = await storage.getSecret(`${accountId}:${storageKey}`);
    if (!apiKey) throw new Error("No Claude API key configured");

    const res = await api.fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: ticketText }],
      }),
    });

    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message);
    raw = json.content[0].text;
  } else {
    const model =
      typeof payload.model === "string" ? payload.model : "gpt-4o";
    const apiKey = await storage.getSecret(`${accountId}:${storageKey}`);
    if (!apiKey) throw new Error("No OpenAI API key configured");

    const res = await api.fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o",
          max_tokens: 1000,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: ticketText },
          ],
        }),
      },
    );

    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message);
    raw = json.choices[0].message.content;
  }

  return JSON.parse(raw.replace(/```json?\n?|\n?```/g, "").trim());
});

// ── Estimation analysis ──

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "can",
  "could",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "in",
  "on",
  "at",
  "to",
  "from",
  "by",
  "with",
  "as",
  "of",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
  "this",
  "that",
  "these",
  "those",
  "am",
  "not",
  "no",
  "up",
  "down",
  "if",
  "when",
  "where",
  "how",
  "what",
  "which",
  "who",
  "whom",
  "why",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "than",
  "too",
  "very",
  "just",
  "also",
  "about",
  "only",
  "same",
  "here",
  "there",
  "need",
  "needs",
  "like",
  "new",
  "use",
  "used",
  "using",
  "make",
  "add",
  "update",
  "get",
  "set",
  "able",
]);

function normalizeText(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractEstimationValue(
  fields: any,
  fieldId: string,
): string | number | null {
  const value = fields[fieldId];
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.value) return value.value;
  if (typeof value === "object" && value.name) return value.name;
  return null;
}

function computeSuggestion(
  tickets: Array<{ value: string | number; similarity: number }>,
): string | number | null {
  if (tickets.length === 0) return null;

  const allNumeric = tickets.every((t) => typeof t.value === "number");

  if (allNumeric) {
    // Weighted median for numeric values
    const sorted = [...tickets].sort(
      (a, b) => (a.value as number) - (b.value as number),
    );
    const totalWeight = sorted.reduce((s, t) => s + t.similarity, 0);
    let cumWeight = 0;
    for (const t of sorted) {
      cumWeight += t.similarity;
      if (cumWeight >= totalWeight / 2) return t.value;
    }
    return sorted[sorted.length - 1].value;
  }

  // Mode for non-numeric values
  const counts = new Map<string | number, number>();
  for (const t of tickets) {
    counts.set(t.value, (counts.get(t.value) ?? 0) + 1);
  }
  let best: string | number | null = null;
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

resolver.define("getEstimationFields", async () => {
  const response = await api.asUser().requestJira(route`/rest/api/3/field`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fields: ${response.status}`);
  }

  const allFields: any[] = await response.json();

  const estimationFields = allFields
    .filter((f: any) => {
      if (f.id === "story_points" || f.id === "customfield_10016") return true;
      if (!f.schema) return false;
      const type = f.schema.type;
      const custom = f.schema.custom;
      return (
        type === "number" ||
        type === "option" ||
        custom === "com.atlassian.jira.plugin.system.customfieldtypes:float" ||
        custom === "com.atlassian.jira.plugin.system.customfieldtypes:select" ||
        custom ===
          "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons"
      );
    })
    .map((f: any) => ({ id: f.id, name: f.name }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return estimationFields;
});

resolver.define("analyzeEstimation", async ({ payload, context }: any) => {
  const issueKey = context.extension.issue.key;
  const { estimationFieldId, estimationFieldName } = payload;

  if (!estimationFieldId) {
    throw new Error("estimationFieldId is required");
  }

  const projectKey = issueKey.split("-")[0];

  // Fetch current issue
  const issueRes = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}`, {
      headers: { Accept: "application/json" },
    });

  if (!issueRes.ok) {
    throw new Error(`Failed to fetch issue: ${issueRes.status}`);
  }

  const issue = await issueRes.json();
  const currentFields = issue.fields;
  const currentSummary = currentFields.summary ?? "";
  const currentDesc = extractFieldText(currentFields, "description");
  const teamSet = extractEstimationValue(currentFields, estimationFieldId);

  // Fetch completed tickets from the same project
  const jql = `project = ${projectKey} AND status = Done AND key != ${issueKey} ORDER BY updated DESC`;
  const maxResults = 50;
  const fieldsParam = `summary,description,${estimationFieldId}`;
  const searchRes = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/search/jql?jql=${jql}&maxResults=${maxResults}&fields=${fieldsParam}`,
      { headers: { Accept: "application/json" } },
    );

  if (!searchRes.ok) {
    const body = await searchRes.text();
    console.error("Estimation search failed:", searchRes.status, body);
    return {
      suggested: null,
      teamSet,
      reason: "Could not fetch historical tickets for comparison.",
      similarTickets: [],
      fieldName: estimationFieldName ?? estimationFieldId,
    };
  }

  const searchData = await searchRes.json();
  const currentKeywords = normalizeText(`${currentSummary} ${currentDesc}`);

  const scored: Array<{
    key: string;
    summary: string;
    similarity: number;
    estimationValue: string | number | null;
  }> = [];

  console.log("found historical tickets:", searchData.issues?.length ?? 0);
  for (const hist of searchData.issues ?? []) {
    const hFields = hist.fields;
    const estVal = extractEstimationValue(hFields, estimationFieldId);
    if (estVal === null) continue;

    const hSummary = hFields.summary ?? "";
    const hDesc = extractFieldText(hFields, "description");
    const hKeywords = normalizeText(`${hSummary} ${hDesc}`);
    const sim = jaccardSimilarity(currentKeywords, hKeywords);
    console.log("found sim", sim, "for issue", hist.key);

    if (sim > 0.05) {
      scored.push({
        key: hist.key,
        summary: hSummary,
        similarity: Math.round(sim * 100) / 100,
        estimationValue: estVal,
      });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  const topSimilar = scored.slice(0, 10);

  const suggested = computeSuggestion(
    topSimilar.map((t) => ({
      value: t.estimationValue!,
      similarity: t.similarity,
    })),
  );

  // Build reason
  let reason: string;
  if (topSimilar.length === 0) {
    reason =
      "Not enough similar completed tickets found to suggest an estimation.";
  } else {
    const values = topSimilar.map((t) => String(t.estimationValue));
    const topKeys = topSimilar
      .slice(0, 3)
      .map((t) => t.key)
      .join(", ");
    reason = `Most similar completed tickets (${topKeys}) were estimated at ${values.slice(0, 5).join("/")}. Suggestion based on ${topSimilar.length} similar ticket${topSimilar.length > 1 ? "s" : ""}.`;
  }

  return {
    suggested,
    teamSet,
    reason,
    similarTickets: topSimilar.slice(0, 5),
    fieldName: estimationFieldName ?? estimationFieldId,
  };
});

resolver.define("getStatusTimeline", async ({ context }: any) => {
  const issueKey = context.extension.issue.key;

  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueKey}?expand=changelog&fields=created,status`,
      { headers: { Accept: "application/json" } },
    );

  if (!response.ok) {
    const body = await response.text();
    console.error("Timeline API error:", body);
    throw new Error(`Failed to fetch timeline: ${response.status}`);
  }

  const issue = await response.json();
  const createdAt: string = issue.fields.created;
  const currentStatus: string = issue.fields.status?.name ?? "";

  const statusChanges: Array<{
    timestamp: string;
    fromString: string;
    toString: string;
  }> = [];

  for (const history of issue.changelog?.histories ?? []) {
    for (const item of history.items ?? []) {
      if (item.field === "status") {
        statusChanges.push({
          timestamp: history.created,
          fromString: item.fromString ?? "",
          toString: item.toString ?? "",
        });
      }
    }
  }

  statusChanges.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const transitions: Array<{
    status: string;
    enteredAt: string;
    exitedAt: string | null;
    duration: number;
  }> = [];
  const now = Date.now();

  if (statusChanges.length === 0) {
    transitions.push({
      status: currentStatus,
      enteredAt: createdAt,
      exitedAt: null,
      duration: now - new Date(createdAt).getTime(),
    });
  } else {
    transitions.push({
      status: statusChanges[0].fromString,
      enteredAt: createdAt,
      exitedAt: statusChanges[0].timestamp,
      duration:
        new Date(statusChanges[0].timestamp).getTime() -
        new Date(createdAt).getTime(),
    });

    for (let i = 0; i < statusChanges.length; i++) {
      const change = statusChanges[i];
      const nextChange = statusChanges[i + 1];
      const enteredAt = change.timestamp;
      const exitedAt = nextChange ? nextChange.timestamp : null;
      const duration = exitedAt
        ? new Date(exitedAt).getTime() - new Date(enteredAt).getTime()
        : now - new Date(enteredAt).getTime();

      transitions.push({
        status: change.toString,
        enteredAt,
        exitedAt,
        duration,
      });
    }
  }

  return { transitions, currentStatus, createdAt };
});

resolver.define("getStorageValue", async ({ payload, context }: any) => {
  const userKey = `${context.accountId}:${payload.key}`;
  if (payload.key === "openaiApiKey" || payload.key === "claudeApiKey" || payload.key.startsWith("apiKey_")) {
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
