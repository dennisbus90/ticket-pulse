import { useState, useEffect, useCallback } from "react";
import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import type { TimelineResult, StatusTransition } from "@ticket-pulse/shared";

interface UseTimelineResult {
  timeline: TimelineResult | null;
  loading: boolean;
  error: string | null;
}

const MOCK_TIMELINE: TimelineResult = {
  currentStatus: "Active",
  createdAt: "2026-03-01T09:00:00.000Z",
  transitions: [
    { status: "New", enteredAt: "2026-03-01T09:00:00.000Z", exitedAt: "2026-03-03T14:30:00.000Z", duration: 193800000 },
    { status: "Active", enteredAt: "2026-03-03T14:30:00.000Z", exitedAt: "2026-03-08T11:00:00.000Z", duration: 419400000 },
    { status: "Resolved", enteredAt: "2026-03-08T11:00:00.000Z", exitedAt: "2026-03-10T16:00:00.000Z", duration: 190800000 },
    { status: "Closed", enteredAt: "2026-03-10T16:00:00.000Z", exitedAt: null, duration: 86400000 },
  ],
};

export function useTimeline(workItemId: number | null): UseTimelineResult {
  const [timeline, setTimeline] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (workItemId === null) return;

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 400));
        setTimeline({ ...MOCK_TIMELINE });
        return;
      }

      const client = getClient(WorkItemTrackingRestClient);
      const updates = await client.getUpdates(workItemId);

      const now = Date.now();
      let createdAt = "";
      let currentStatus = "";
      const statusChanges: Array<{ timestamp: string; fromStatus: string; toStatus: string }> = [];

      for (const update of updates) {
        const stateField = update.fields?.["System.State"];
        if (stateField) {
          if (!createdAt && stateField.oldValue === undefined) {
            createdAt = update.revisedDate?.toISOString() ?? new Date().toISOString();
            currentStatus = stateField.newValue ?? "";
          } else if (stateField.oldValue !== undefined) {
            statusChanges.push({
              timestamp: update.revisedDate?.toISOString() ?? new Date().toISOString(),
              fromStatus: stateField.oldValue ?? "",
              toStatus: stateField.newValue ?? "",
            });
            currentStatus = stateField.newValue ?? "";
          }
        }

        // Capture creation date from first rev
        if (update.rev === 1) {
          createdAt = update.revisedDate?.toISOString() ?? new Date().toISOString();
          if (update.fields?.["System.State"]) {
            currentStatus = update.fields["System.State"].newValue ?? currentStatus;
          }
        }
      }

      if (!createdAt) createdAt = new Date().toISOString();

      const transitions: StatusTransition[] = [];

      if (statusChanges.length === 0) {
        transitions.push({
          status: currentStatus,
          enteredAt: createdAt,
          exitedAt: null,
          duration: now - new Date(createdAt).getTime(),
        });
      } else {
        transitions.push({
          status: statusChanges[0].fromStatus || currentStatus,
          enteredAt: createdAt,
          exitedAt: statusChanges[0].timestamp,
          duration: new Date(statusChanges[0].timestamp).getTime() - new Date(createdAt).getTime(),
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
            status: change.toStatus,
            enteredAt,
            exitedAt,
            duration,
          });
        }
      }

      setTimeline({ transitions, currentStatus, createdAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch timeline");
    } finally {
      setLoading(false);
    }
  }, [workItemId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, loading, error };
}
