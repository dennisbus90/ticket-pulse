import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useIssueData } from './hooks/useIssueData';
import { runAll } from './validators/registry';
import { ValidationPanel } from './components/ValidationPanel';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { sampleTickets, type SampleTicketName } from './mocks/sample-tickets';

const ticketNames = Object.keys(sampleTickets) as SampleTicketName[];

const DevTicketSelector: React.FC<{
  selected: SampleTicketName;
  onChange: (name: SampleTicketName) => void;
}> = ({ selected, onChange }) => (
  <div
    style={{
      padding: '8px 12px',
      background: '#DEEBFF',
      borderBottom: '1px solid #B3D4FF',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <span style={{ fontWeight: 600, color: '#0747A6' }}>DEV MODE</span>
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value as SampleTicketName)}
      style={{
        flex: 1,
        padding: '4px 8px',
        border: '1px solid #B3D4FF',
        borderRadius: 4,
        fontSize: 12,
        background: '#fff',
      }}
    >
      {ticketNames.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  </div>
);

const App: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<SampleTicketName>(ticketNames[0]);
  const [hasApiKey, setHasApiKey] = useState(false);

  const mockData = import.meta.env.DEV ? sampleTickets[selectedTicket] : undefined;
  const { data, loading, error, refetch } = useIssueData(mockData);

  const result = useMemo(() => {
    if (!data) return null;
    return runAll(data);
  }, [data]);

  // Fetch settings on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      // In dev mode, simulate AI being enabled for tickets that have aiAnalysis
      setHasApiKey(true);
      return;
    }
    import('@forge/bridge').then(({ invoke }) => {
      invoke<{ hasApiKey: boolean }>('getSettings').then((settings) => {
        setHasApiKey(settings.hasApiKey);
      });
    });
  }, []);

  const handleSaveApiKey = useCallback(async (apiKey: string) => {
    if (import.meta.env.DEV) {
      setHasApiKey(true);
      return;
    }
    const { invoke } = await import('@forge/bridge');
    await invoke('saveSettings', { apiKey });
    setHasApiKey(true);
  }, []);

  const handleRemoveApiKey = useCallback(async () => {
    if (import.meta.env.DEV) {
      setHasApiKey(false);
      return;
    }
    const { invoke } = await import('@forge/bridge');
    await invoke('saveSettings', { apiKey: null });
    setHasApiKey(false);
  }, []);

  return (
    <>
      {import.meta.env.DEV && (
        <DevTicketSelector selected={selectedTicket} onChange={setSelectedTicket} />
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div style={{ padding: 16, color: '#DE350B', fontSize: 13 }}>
          <p style={{ fontWeight: 600 }}>Failed to load issue data</p>
          <p>{error}</p>
          <button
            onClick={refetch}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              background: '#F4F5F7',
              border: '1px solid #DFE1E6',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      ) : !data || (!data.descriptionText && !data.acceptanceCriteria && !data.summary) ? (
        <EmptyState />
      ) : !result ? (
        <EmptyState />
      ) : (
        <ValidationPanel
          result={result}
          onRevalidate={refetch}
          hasApiKey={hasApiKey}
          onSaveApiKey={handleSaveApiKey}
          onRemoveApiKey={handleRemoveApiKey}
        />
      )}
    </>
  );
};

export default App;
