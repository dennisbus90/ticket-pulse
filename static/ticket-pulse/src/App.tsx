import React, { useState, useCallback } from "react";
import { useIssueData } from "./hooks/useIssueData";
import { useStorage } from "./hooks/useStorage";
import { useAnalysis } from "./hooks/useAnalysis";
import { Panel } from "./components/Panel";
import { Settings } from "./components/Settings";
import { sampleTickets, type SampleTicketName } from "./mocks/sample-tickets";

const ticketNames = Object.keys(sampleTickets) as SampleTicketName[];

const DevTicketSelector: React.FC<{
  selected: SampleTicketName;
  onChange: (name: SampleTicketName) => void;
}> = ({ selected, onChange }) => (
  <div className="dev-selector">
    <span className="dev-label">DEV MODE</span>
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value as SampleTicketName)}
      className="dev-select"
    >
      {ticketNames.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  </div>
);

const App: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<SampleTicketName>(ticketNames[0]);
  const [showSettings, setShowSettings] = useState(false);

  const mockData = import.meta.env.DEV ? sampleTickets[selectedTicket] : undefined;
  const { data, loading: dataLoading, error: dataError, refetch } = useIssueData(mockData);

  const apiKeyStore = useStorage<{ exists: boolean }>("openaiApiKey", { exists: false });
  const modelStore = useStorage<string>("openai_model", "gpt-4o");

  const hasApiKey = import.meta.env.DEV
    ? apiKeyStore.value?.exists ?? true
    : apiKeyStore.value?.exists ?? false;

  const { analysis, loading: analyzing, error: analysisError, analyze } = useAnalysis(data, modelStore.value);

  const handleSaveApiKey = useCallback(async (apiKey: string) => {
    if (import.meta.env.DEV) {
      await apiKeyStore.save({ exists: true });
      return;
    }
    const { invoke } = await import("@forge/bridge");
    await invoke("setStorageValue", { key: "openaiApiKey", value: apiKey });
    await apiKeyStore.save({ exists: true });
  }, [apiKeyStore]);

  const handleRemoveApiKey = useCallback(async () => {
    if (import.meta.env.DEV) {
      await apiKeyStore.save({ exists: false });
      return;
    }
    const { invoke } = await import("@forge/bridge");
    await invoke("setStorageValue", { key: "openaiApiKey", value: null });
    await apiKeyStore.save({ exists: false });
  }, [apiKeyStore]);

  const handleChangeModel = useCallback(async (model: string) => {
    await modelStore.save(model);
  }, [modelStore]);

  if (dataLoading || apiKeyStore.loading) {
    return (
      <>
        {import.meta.env.DEV && (
          <DevTicketSelector selected={selectedTicket} onChange={setSelectedTicket} />
        )}
        <div className="loading-container">
          <div className="loading-bar" />
          <div className="loading-bar" />
          <div className="loading-bar" />
        </div>
      </>
    );
  }

  if (dataError) {
    return (
      <div className="error-container">
        <p className="error-title">Failed to load issue data</p>
        <p>{dataError}</p>
        <button onClick={refetch} className="error-retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <>
      {import.meta.env.DEV && (
        <DevTicketSelector selected={selectedTicket} onChange={setSelectedTicket} />
      )}

      {showSettings && (
        <Settings
          hasApiKey={hasApiKey}
          model={modelStore.value}
          onSaveApiKey={handleSaveApiKey}
          onRemoveApiKey={handleRemoveApiKey}
          onChangeModel={handleChangeModel}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Panel
        analysis={analysis}
        loading={analyzing}
        error={analysisError}
        onAnalyze={analyze}
        onOpenSettings={() => setShowSettings(true)}
        hasApiKey={hasApiKey}
      />
    </>
  );
};

export default App;
