import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export async function fetchCompletedWorkItems(
  projectName: string,
  currentId: number,
  estimationFieldId: string,
): Promise<Array<{ key: string; summary: string; fields: Record<string, unknown> }>> {
  const client = getClient(WorkItemTrackingRestClient);

  const query = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${projectName}' AND [System.State] = 'Closed' AND [System.Id] <> ${currentId} ORDER BY [System.ChangedDate] DESC`;

  const result = await client.queryByWiql({ query }, projectName, undefined, undefined, 50);

  if (!result.workItems || result.workItems.length === 0) return [];

  const ids = result.workItems.map((wi) => wi.id).filter((id): id is number => id !== undefined);
  const fieldsToFetch = ["System.Id", "System.Title", "System.Description", estimationFieldId];
  const workItems = await client.getWorkItems(ids, projectName, fieldsToFetch);

  return workItems.map((wi) => {
    const desc = wi.fields["System.Description"];
    const descText = typeof desc === "string" && desc.startsWith("<") ? stripHtml(desc) : (desc ?? "");
    void descText; // used by caller via fields
    return {
      key: String(wi.id),
      summary: wi.fields["System.Title"] ?? "",
      fields: wi.fields,
    };
  });
}
