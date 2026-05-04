import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import type { FieldOption } from "@ticket-pulse/shared";

export async function getTextFields(): Promise<FieldOption[]> {
  const client = getClient(WorkItemTrackingRestClient);
  const allFields = await client.getFields();

  return allFields
    .filter((f) => {
      if (f.referenceName === "System.Title" || f.referenceName === "System.Description") return true;
      // FieldType: 0=String, 7=Html, 9=PlainText, 13=History
      const t = f.type;
      return t === 0 || t === 7 || t === 9;
    })
    .map((f) => ({ id: f.referenceName, name: f.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEstimationFields(): Promise<FieldOption[]> {
  const client = getClient(WorkItemTrackingRestClient);
  const allFields = await client.getFields();

  return allFields
    .filter((f) => {
      if (f.referenceName === "Microsoft.VSTS.Scheduling.StoryPoints" ||
          f.referenceName === "Microsoft.VSTS.Scheduling.Effort") return true;
      // FieldType: 1=Integer, 2=Double
      const t = f.type;
      return t === 1 || t === 2;
    })
    .map((f) => ({ id: f.referenceName, name: f.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
