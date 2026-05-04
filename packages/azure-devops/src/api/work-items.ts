import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import type { WorkItemData } from "@ticket-pulse/shared";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export async function getWorkItemData(id: number): Promise<WorkItemData> {
  const client = getClient(WorkItemTrackingRestClient);
  const workItem = await client.getWorkItem(id, undefined, undefined, undefined, WorkItemExpand.All);
  const fields = workItem.fields;

  const fieldValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      // HTML fields like System.Description
      const text = value.startsWith("<") ? stripHtml(value) : value;
      if (text.trim()) fieldValues[key] = text;
    } else if (typeof value === "number") {
      fieldValues[key] = String(value);
    }
  }

  const tags = typeof fields["System.Tags"] === "string"
    ? fields["System.Tags"].split(";").map((t: string) => t.trim()).filter(Boolean)
    : [];

  return {
    key: String(workItem.id),
    summary: fields["System.Title"] ?? "",
    itemType: fields["System.WorkItemType"] ?? "",
    storyPoints: fields["Microsoft.VSTS.Scheduling.StoryPoints"] ?? fields["Microsoft.VSTS.Scheduling.Effort"] ?? null,
    priority: fields["Microsoft.VSTS.Common.Priority"] != null
      ? `P${fields["Microsoft.VSTS.Common.Priority"]}`
      : null,
    labels: tags,
    components: fields["System.AreaPath"] ? [fields["System.AreaPath"]] : [],
    status: fields["System.State"] ?? "",
    fieldValues,
  };
}
