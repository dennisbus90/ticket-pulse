import { useState, useEffect, useCallback } from "react";
import type { TimelineResult } from "../types";

interface UseTimelineResult {
  timeline: TimelineResult | null;
  loading: boolean;
  error: string | null;
}

const MOCK_TIMELINES: Record<string, TimelineResult> = {
  "PROJ-101": {
    currentStatus: "Done",
    createdAt: "2026-03-01T09:00:00.000Z",
    transitions: [
      {
        status: "To Do",
        enteredAt: "2026-03-01T09:00:00.000Z",
        exitedAt: "2026-03-03T14:30:00.000Z",
        duration: 193800000,
      },
      {
        status: "In Progress",
        enteredAt: "2026-03-03T14:30:00.000Z",
        exitedAt: "2026-03-08T11:00:00.000Z",
        duration: 419400000,
      },
      {
        status: "In Review",
        enteredAt: "2026-03-08T11:00:00.000Z",
        exitedAt: "2026-03-10T16:00:00.000Z",
        duration: 190800000,
      },
      {
        status: "Done",
        enteredAt: "2026-03-10T16:00:00.000Z",
        exitedAt: null,
        duration: 86400000,
      },
    ],
  },
  "PROJ-205": {
    currentStatus: "In Progress",
    createdAt: "2026-03-01T10:00:00.000Z",
    transitions: [
      {
        status: "To Do",
        enteredAt: "2026-03-01T10:00:00.000Z",
        exitedAt: "2026-03-06T09:00:00.000Z",
        duration: 428400000,
      },
      {
        status: "In Progress",
        enteredAt: "2026-03-06T09:00:00.000Z",
        exitedAt: "2026-03-10T15:00:00.000Z",
        duration: 367200000,
      },
      {
        status: "To Do",
        enteredAt: "2026-03-10T15:00:00.000Z",
        exitedAt: "2026-03-16T10:00:00.000Z",
        duration: 500400000,
      },
      {
        status: "In Progress",
        enteredAt: "2026-03-16T10:00:00.000Z",
        exitedAt: null,
        duration: 432000000,
      },
    ],
  },
  "PROJ-150": {
    currentStatus: "In Progress",
    createdAt: "2026-03-20T08:00:00.000Z",
    transitions: [
      {
        status: "To Do",
        enteredAt: "2026-03-20T08:00:00.000Z",
        exitedAt: "2026-03-21T14:00:00.000Z",
        duration: 108000000,
      },
      {
        status: "In Progress",
        enteredAt: "2026-03-21T14:00:00.000Z",
        exitedAt: null,
        duration: 324000000,
      },
    ],
  },
};

export function useTimeline(issueKey: string | null): UseTimelineResult {
  const [timeline, setTimeline] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!issueKey) return;

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 400));
        const mock = MOCK_TIMELINES[issueKey] ?? MOCK_TIMELINES["PROJ-101"];
        setTimeline({ ...mock });
      } else {
        const { invoke } = await import("@forge/bridge");
        const result = await invoke<TimelineResult>("getStatusTimeline");
        setTimeline(result);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch timeline",
      );
    } finally {
      setLoading(false);
    }
  }, [issueKey]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, loading, error };
}
