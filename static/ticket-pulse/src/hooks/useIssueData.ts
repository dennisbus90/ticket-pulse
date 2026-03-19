import { useState, useEffect, useCallback, useRef } from 'react';
import type { IssueParsedData } from '../types';

interface UseIssueDataResult {
  data: IssueParsedData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useIssueData(mockData?: IssueParsedData | null): UseIssueDataResult {
  const [data, setData] = useState<IssueParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef<() => void>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV && mockData !== undefined) {
        await new Promise((r) => setTimeout(r, 300));
        setData(mockData);
      } else {
        const { invoke } = await import('@forge/bridge');
        const result = await invoke<IssueParsedData>('getIssueData');
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issue data');
    } finally {
      setLoading(false);
    }
  }, [mockData]);

  // Keep a stable ref so the event listener always calls the latest fetchData
  fetchRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh when the Jira issue changes (production only)
  useEffect(() => {
    if (import.meta.env.DEV) return;

    let unsubscribe: (() => void) | undefined;

    import('@forge/bridge').then(({ events }) => {
      const handler = () => {
        fetchRef.current?.();
      };
      events.on('JIRA_ISSUE_CHANGED', handler).then((subscription) => {
        unsubscribe = () => subscription.unsubscribe();
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return { data, loading, error, refetch: fetchData };
}
