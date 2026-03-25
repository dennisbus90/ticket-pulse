import React, { useState, useEffect, useCallback, useRef } from "react";
import { useIssueData } from "./hooks/useIssueData";
import { useStorage } from "./hooks/useStorage";
import { useAnalysis } from "./hooks/useAnalysis";
import { useEstimationAnalysis } from "./hooks/useEstimationAnalysis";
import { Panel, AnalysisSkeleton } from "./components/Panel";
import { Settings } from "./components/Settings";
import { sampleTickets, type SampleTicketName } from "./mocks/sample-tickets";
import type { AnalysisFieldMapping, EstimationFieldConfig } from "./types";

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
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  </div>
);

const App: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<SampleTicketName>(
    ticketNames[0],
  );
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [pendingReanalyze, setPendingReanalyze] = useState(false);
  const hasTriggeredAutoAnalyze = useRef(false);
  const [minTimerDone, setMinTimerDone] = useState(false);

  const mockData = import.meta.env.DEV
    ? sampleTickets[selectedTicket]
    : undefined;
  const {
    data,
    loading: dataLoading,
    error: dataError,
    refetch,
  } = useIssueData(mockData);

  const modelStore = useStorage<string>("openai_model", "gpt-4o");
  const analysisFields = useStorage<AnalysisFieldMapping[]>(
    "analysis_fields",
    [],
  );
  const estimationFieldStore = useStorage<EstimationFieldConfig | null>(
    "estimation_field",
    null,
  );

  useEffect(() => {
    if (import.meta.env.DEV) {
      setHasApiKey(true);
      setApiKeyLoading(false);
      return;
    }
    import("@forge/bridge").then(({ invoke }) => {
      invoke("getStorageValue", { key: "openaiApiKey" }).then((val: any) => {
        setHasApiKey(val?.exists ?? false);
        setApiKeyLoading(false);
      });
    });
  }, []);

  const safeFields = Array.isArray(analysisFields.value)
    ? analysisFields.value
    : [];
  const safeEstimationField = estimationFieldStore.value ?? null;
  const {
    analysis,
    loading: analyzing,
    error: analysisError,
    analyze,
  } = useAnalysis(data, modelStore.value, safeFields);
  const {
    estimation,
    loading: estimationLoading,
    error: estimationError,
    analyze: analyzeEstimation,
  } = useEstimationAnalysis(safeEstimationField);

  const handleAnalyze = useCallback(() => {
    analyze();
    if (safeEstimationField) {
      analyzeEstimation();
    }
  }, [analyze, analyzeEstimation, safeEstimationField]);

  const handleSaveApiKey = useCallback(async (apiKey: string) => {
    if (import.meta.env.DEV) {
      setHasApiKey(true);
      return;
    }
    const { invoke } = await import("@forge/bridge");
    await invoke("setStorageValue", { key: "openaiApiKey", value: apiKey });
    setHasApiKey(true);
  }, []);

  const handleRemoveApiKey = useCallback(async () => {
    if (import.meta.env.DEV) {
      setHasApiKey(false);
      return;
    }
    const { invoke } = await import("@forge/bridge");
    await invoke("setStorageValue", { key: "openaiApiKey", value: null });
    setHasApiKey(false);
  }, []);

  const handleChangeModel = useCallback(
    async (model: string) => {
      await modelStore.save(model);
    },
    [modelStore],
  );

  const handleSaveFields = useCallback(
    async (fields: AnalysisFieldMapping[]) => {
      await analysisFields.save(fields);
    },
    [analysisFields.save],
  );

  const handleSaveEstimationField = useCallback(
    async (field: EstimationFieldConfig | null) => {
      await estimationFieldStore.save(field);
    },
    [estimationFieldStore.save],
  );

  const handleUpdateField = useCallback(
    async (fieldId: string, value: string, isAdf: boolean) => {
      if (import.meta.env.DEV) {
        console.log("DEV: updateJiraField", { fieldId, value, isAdf });
        await new Promise((r) => setTimeout(r, 500));
        setPendingReanalyze(true);
        refetch();
        return;
      }
      const { invoke, router } = await import("@forge/bridge");
      await invoke("updateJiraField", { fieldId, value, isAdf });
      router.reload();
    },
    [refetch],
  );

  useEffect(() => {
    if (pendingReanalyze && !dataLoading) {
      setPendingReanalyze(false);
      handleAnalyze();
    }
  }, [pendingReanalyze, dataLoading, handleAnalyze]);

  const prevTicketRef = useRef(selectedTicket);
  useEffect(() => {
    if (prevTicketRef.current === selectedTicket) return;
    prevTicketRef.current = selectedTicket;
    setPendingReanalyze(true);
  }, [selectedTicket]);

  const settingsLoading =
    apiKeyLoading || analysisFields.loading || estimationFieldStore.loading;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimerDone(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      hasTriggeredAutoAnalyze.current ||
      dataLoading ||
      settingsLoading ||
      !hasApiKey ||
      !data
    ) {
      return;
    }
    hasTriggeredAutoAnalyze.current = true;
    handleAnalyze();
  }, [dataLoading, settingsLoading, hasApiKey, data, handleAnalyze]);

  const initialPhaseComplete = hasApiKey
    ? hasTriggeredAutoAnalyze.current && !analyzing && !estimationLoading && minTimerDone
    : !dataLoading && !settingsLoading;

  if (dataError) {
    return (
      <div className="error-container">
        <p className="error-title">Failed to load issue data</p>
        <p>{dataError}</p>
        <button onClick={refetch} className="error-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!initialPhaseComplete) {
    return (
      <div style={{ backgroundColor: "#e7f1f2", borderRadius: 8 }}>
        {import.meta.env.DEV && (
          <DevTicketSelector
            selected={selectedTicket}
            onChange={setSelectedTicket}
          />
        )}
        <AnalysisSkeleton />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#e7f1f2", borderRadius: 8 }}>
      {import.meta.env.DEV && (
        <DevTicketSelector
          selected={selectedTicket}
          onChange={setSelectedTicket}
        />
      )}

      {showSettings && (
        <Settings
          hasApiKey={hasApiKey}
          model={modelStore.value}
          analysisFields={safeFields}
          estimationField={safeEstimationField}
          onSaveApiKey={handleSaveApiKey}
          onRemoveApiKey={handleRemoveApiKey}
          onChangeModel={handleChangeModel}
          onSaveFields={handleSaveFields}
          onSaveEstimationField={handleSaveEstimationField}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Panel
        analysis={analysis}
        loading={analyzing}
        error={analysisError}
        onAnalyze={handleAnalyze}
        onOpenSettings={() => setShowSettings(true)}
        onUpdateField={handleUpdateField}
        analysisFields={safeFields}
        hasApiKey={hasApiKey}
        estimation={estimation}
        estimationLoading={estimationLoading}
        estimationError={estimationError}
        estimationField={safeEstimationField}
      />
    </div>
  );
};

export default App;
