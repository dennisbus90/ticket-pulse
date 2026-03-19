import Resolver from "@forge/resolver";
import { requestJira, route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { extractTextFromAdf } from "./adf-utils";
import { analyzeWithAI } from "./openai";

const resolver = new Resolver();

function extractAcceptanceCriteria(
  fields: any,
  descriptionText: string,
): string {
  // Try common custom field IDs for acceptance criteria
  const customFieldIds = [
    "customfield_10037",
    "customfield_10038",
    "customfield_10039",
    "customfield_10040",
  ];

  for (const fieldId of customFieldIds) {
    const value = fields[fieldId];
    if (value) {
      return typeof value === "string" ? value : extractTextFromAdf(value);
    }
  }

  // Fall back to parsing description for AC section
  const acPatterns = [
    /(?:acceptance\s+criteria|definition\s+of\s+done|AC|DoD)\s*[:：\n]/i,
  ];

  for (const pattern of acPatterns) {
    const match = descriptionText.match(pattern);
    if (match && match.index !== undefined) {
      const startIdx = match.index + match[0].length;
      // Extract until the next heading-like pattern or end of text
      const remaining = descriptionText.slice(startIdx);
      const nextSection = remaining.search(
        /\n(?:#{1,3}\s|[A-Z][a-z]+(?: [A-Z][a-z]+)*\s*[:：]\s*\n)/,
      );
      return nextSection !== -1
        ? remaining.slice(0, nextSection).trim()
        : remaining.trim();
    }
  }

  return "";
}

resolver.define("getIssueData", async ({ context }: any) => {
  console.log("Context extension:", JSON.stringify(context.extension));
  const issueKey = context.extension.issue.key;
  console.log("Fetching issue:", issueKey);

  const response = await requestJira(route`/rest/api/3/issue/${issueKey}`, {
    headers: { Accept: "application/json" },
  });

  console.log("Jira API response status:", response.status);
  if (!response.ok) {
    const body = await response.text();
    console.error("Jira API error body:", body);
    throw new Error(`Failed to fetch issue: ${response.status}`);
  }

  const issue = await response.json();
  const fields = issue.fields;

  const descriptionText = fields.description
    ? extractTextFromAdf(fields.description)
    : "";

  const acceptanceCriteria = extractAcceptanceCriteria(fields, descriptionText);
  const summary = fields.summary || "";

  // Run AI analysis if API key is configured
  let aiAnalysis = null;
  try {
    const apiKey = await kvs.get("openaiApiKey");
    if (apiKey) {
      aiAnalysis = await analyzeWithAI(
        { summary, descriptionText, acceptanceCriteria },
        apiKey as string,
      );
    }
  } catch {
    // AI analysis is optional — continue without it
  }

  return {
    key: issueKey,
    summary,
    descriptionRaw: fields.description,
    descriptionText,
    acceptanceCriteria,
    storyPoints: fields.story_points ?? fields.customfield_10016 ?? null,
    priority: fields.priority?.name ?? null,
    issueType: fields.issuetype?.name ?? "",
    labels: fields.labels ?? [],
    components: (fields.components ?? []).map((c: any) => c.name),
    status: fields.status?.name ?? "",
    aiAnalysis,
  };
});

resolver.define("saveSettings", async ({ payload }: any) => {
  const { apiKey } = payload;
  if (apiKey) {
    await kvs.set("openaiApiKey", apiKey);
  } else {
    await kvs.delete("openaiApiKey");
  }
  return { success: true };
});

resolver.define("getSettings", async () => {
  const apiKey = await kvs.get("openaiApiKey");
  return { hasApiKey: !!apiKey };
});

export const handler = resolver.getDefinitions();
