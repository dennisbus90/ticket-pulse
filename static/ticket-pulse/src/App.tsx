import React, { useState, useEffect, useCallback, useRef } from "react";
import { useIssueData } from "./hooks/useIssueData";
import { useStorage } from "./hooks/useStorage";
import { useAnalysis } from "./hooks/useAnalysis";
import { useEstimationAnalysis } from "./hooks/useEstimationAnalysis";
import { useTimeline } from "./hooks/useTimeline";
import { Panel } from "./components/Panel";
import { Settings } from "./components/Settings";
import { sampleTickets, type SampleTicketName } from "./mocks/sample-tickets";
import type { AnalysisFieldMapping, EstimationFieldConfig, AiProvider, ApiKeyEntry } from "./types";
import ZiggeChillContainer from "./components/animations/start/ZiggeChillContainer";

const showDevTools = false;
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
  const [showPanel, setShowPanel] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(
    undefined,
  );
  const [enableHeightTransition, setEnableHeightTransition] = useState(true);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showPanel]);
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

  const apiKeysStore = useStorage<ApiKeyEntry[]>("api_keys", []);
  const activeKeyIdStore = useStorage<string>("active_key_id", "");
  const analysisFields = useStorage<AnalysisFieldMapping[]>(
    "analysis_fields",
    [],
  );
  const estimationFieldStore = useStorage<EstimationFieldConfig | null>(
    "estimation_field",
    null,
  );

  const apiKeys = apiKeysStore.value ?? [];
  const activeKeyId = activeKeyIdStore.value ?? "";
  const activeKey =
    apiKeys.find((k) => k.id === activeKeyId) ??
    (apiKeys.length === 1 ? apiKeys[0] : null);
  const hasApiKey = import.meta.env.DEV ? true : !!activeKey;
  const provider: AiProvider = activeKey?.provider ?? "openai";
  const activeModel = activeKey?.model ?? "gpt-4o";

  const safeFields = Array.isArray(analysisFields.value)
    ? analysisFields.value
    : [];
  const safeEstimationField = estimationFieldStore.value ?? null;
  const {
    analysis,
    loading: analyzing,
    error: analysisError,
    analyze,
  } = useAnalysis(data, activeModel, safeFields, provider, activeKey?.id);
  const {
    estimation,
    loading: estimationLoading,
    error: estimationError,
    analyze: analyzeEstimation,
  } = useEstimationAnalysis(safeEstimationField);

  useEffect(() => {
    if (analyzing) {
      setEnableHeightTransition(true);
    }
  }, [analyzing]);

  const handleRevealComplete = useCallback(() => {
    setEnableHeightTransition(false);
  }, []);

  const {
    timeline,
    loading: timelineLoading,
    error: timelineError,
  } = useTimeline(data?.key ?? null);

  const handleAnalyze = useCallback(() => {
    analyze();
    if (safeEstimationField) {
      analyzeEstimation();
    }
  }, [analyze, analyzeEstimation, safeEstimationField]);

  const handleAddApiKey = useCallback(
    async (entry: ApiKeyEntry, rawKey: string) => {
      if (!import.meta.env.DEV) {
        const { invoke } = await import("@forge/bridge");
        await invoke("setStorageValue", {
          key: `apiKey_${entry.id}`,
          value: rawKey,
        });
      }
      const updated = [...apiKeys, entry];
      await apiKeysStore.save(updated);
      if (updated.length === 1) {
        await activeKeyIdStore.save(entry.id);
      }
    },
    [apiKeys, apiKeysStore, activeKeyIdStore],
  );

  const handleRemoveApiKey = useCallback(
    async (id: string) => {
      if (!import.meta.env.DEV) {
        const { invoke } = await import("@forge/bridge");
        await invoke("setStorageValue", {
          key: `apiKey_${id}`,
          value: null,
        });
      }
      const updated = apiKeys.filter((k) => k.id !== id);
      await apiKeysStore.save(updated);
      if (activeKeyId === id) {
        await activeKeyIdStore.save(
          updated.length > 0 ? updated[0].id : "",
        );
      }
    },
    [apiKeys, apiKeysStore, activeKeyId, activeKeyIdStore],
  );

  const handleActivateKey = useCallback(
    async (id: string) => {
      await activeKeyIdStore.save(id);
    },
    [activeKeyIdStore],
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
    apiKeysStore.loading || analysisFields.loading || estimationFieldStore.loading;

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
    ? hasTriggeredAutoAnalyze.current &&
      !analyzing &&
      !estimationLoading &&
      minTimerDone
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

  return (
    <>
      <ZiggeChillContainer
        expandSun={initialPhaseComplete}
        onHidden={() => setShowPanel(true)}
      >
        {showPanel && (
          <div
            style={{
              backgroundColor: "#e7f1f2",
              borderRadius: 8,
              animation: "expandIn 0.4s ease-out",
              height: containerHeight !== undefined ? containerHeight : "auto",
              overflow: "hidden",
              transition: enableHeightTransition ? "height 0.3s ease-out" : "none",
            }}
          >
            <div ref={contentRef} style={{ position: "relative" }}>
              {import.meta.env.DEV && showDevTools && (
                <DevTicketSelector
                  selected={selectedTicket}
                  onChange={setSelectedTicket}
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
                timeline={timeline}
                timelineLoading={timelineLoading}
                timelineError={timelineError}
                onRevealComplete={handleRevealComplete}
              />
              {showSettings && (
                <div className="settings-overlay">
                  <Settings
                    apiKeys={apiKeys}
                    activeKeyId={activeKey?.id ?? ""}
                    onAddApiKey={handleAddApiKey}
                    onRemoveApiKey={handleRemoveApiKey}
                    onActivateKey={handleActivateKey}
                    analysisFields={safeFields}
                    estimationField={safeEstimationField}
                    onSaveFields={handleSaveFields}
                    onSaveEstimationField={handleSaveEstimationField}
                    onClose={() => setShowSettings(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </ZiggeChillContainer>
    </>
  );
};

export default App;
