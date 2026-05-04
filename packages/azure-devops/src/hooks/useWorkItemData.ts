import { useState, useEffect, useCallback } from "react";
import * as SDK from "azure-devops-extension-sdk";
import { IWorkItemFormService, WorkItemTrackingServiceIds } from "azure-devops-extension-api/WorkItemTracking";
import type { WorkItemData } from "@ticket-pulse/shared";
import { getWorkItemData } from "../api/work-items";

interface UseWorkItemDataResult {
  data: WorkItemData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  projectName: string | null;
}

export function useWorkItemData(mockData?: WorkItemData | null): UseWorkItemDataResult {
  const [data, setData] = useState<WorkItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV && mockData !== undefined) {
        await new Promise((r) => setTimeout(r, 300));
        setData(mockData);
        setProjectName("TestProject");
      } else {
        const formService = await SDK.getService<IWorkItemFormService>(
          WorkItemTrackingServiceIds.WorkItemFormService
        );
        const id = await formService.getId();
        const workItemData = await getWorkItemData(id);
        setData(workItemData);

        const fieldValues = await formService.getFieldValues(["System.TeamProject"]);
        setProjectName((fieldValues["System.TeamProject"] as string) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch work item data");
    } finally {
      setLoading(false);
    }
  }, [mockData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, projectName };
}
