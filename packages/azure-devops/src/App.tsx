import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWorkItemData } from "./hooks/useWorkItemData";
import { useStorage } from "./hooks/useStorage";
import { useAnalysis } from "./hooks/useAnalysis";
import { useEstimationAnalysis } from "./hooks/useEstimationAnalysis";
import { useTimeline } from "./hooks/useTimeline";
import { Panel } from "./components/Panel";
import { Settings } from "./components/Settings";
import { sampleTickets, type SampleTicketName } from "./mocks/sample-tickets";
import { setProxyUrl } from "./api/proxy";
import type {
  FieldMapping,
  EstimationFieldConfig,
  AiProvider,
  ApiKeyEntry,
} from "@ticket-pulse/shared";
import * as SDK from "azure-devops-extension-sdk";
import { IWorkItemFormService, WorkItemTrackingServiceIds } from "azure-devops-extension-api/WorkItemTracking";
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
    projectName,
  } = useWorkItemData(mockData);

  const apiKeysStore = useStorage<ApiKeyEntry[]>("api_keys", []);
  const activeKeyIdStore = useStorage<string>("active_key_id", "");
  const analysisFields = useStorage<FieldMapping[]>("analysis_fields", []);
  const estimationFieldStore = useStorage<EstimationFieldConfig | null>(
    "estimation_field",
    null,
  );
  const proxyUrlStore = useStorage<string>("proxy_url", "");
  const rawApiKeyStore = useStorage<Record<string, string>>("raw_api_keys", {});

  // Sync proxy URL on load and change
  useEffect(() => {
    if (proxyUrlStore.value) {
      setProxyUrl(proxyUrlStore.value);
    }
  }, [proxyUrlStore.value]);

  const apiKeys = Array.isArray(apiKeysStore.value) ? apiKeysStore.value : [];
  const activeKeyId = activeKeyIdStore.value ?? "";
  const activeKey =
    apiKeys.find((k) => k.id === activeKeyId) ??
    (apiKeys.length === 1 ? apiKeys[0] : null);
  const hasApiKey = import.meta.env.DEV ? true : !!activeKey;
  const provider: AiProvider = activeKey?.provider ?? "openai";
  const activeModel = activeKey?.model ?? "gpt-4o";

  // Get raw key for the active key
  const rawKeys = rawApiKeyStore.value ?? {};
  const activeRawKey = activeKey ? rawKeys[activeKey.id] : undefined;

  const safeFields = Array.isArray(analysisFields.value)
    ? analysisFields.value
    : [];
  const safeEstimationField = estimationFieldStore.value ?? null;

  const {
    analysis,
    loading: analyzing,
    error: analysisError,
    analyze,
  } = useAnalysis(data, activeModel, safeFields, provider, activeRawKey);

  const workItemId = data ? parseInt(data.key, 10) : null;
  const currentDescription = data?.fieldValues["System.Description"] ?? null;

  const {
    estimation,
    loading: estimationLoading,
    error: estimationError,
    analyze: analyzeEstimation,
  } = useEstimationAnalysis(
    safeEstimationField,
    data?.summary ?? null,
    currentDescription,
    data?.storyPoints ?? null,
    projectName,
    workItemId,
  );

  useEffect(() => {
    if (analyzing) {
      setEnableHeightTransition(true);
    }
  }, [analyzing]);

  const handleRevealComplete = useCallback(() => {
    setEnableHeightTransition(false);
  }, []);

  const [contentMinHeight, setContentMinHeight] = useState<number | undefined>(
    undefined,
  );

  const handleCountUpDone = useCallback(() => {
    setContentMinHeight(400);
  }, []);

  const {
    timeline,
    loading: timelineLoading,
    error: timelineError,
  } = useTimeline(workItemId);

  const handleAnalyze = useCallback(() => {
    analyze();
    if (safeEstimationField) {
      analyzeEstimation();
    }
  }, [analyze, analyzeEstimation, safeEstimationField]);

  const handleAddApiKey = useCallback(
    async (entry: ApiKeyEntry, rawKey: string) => {
      // Store the raw key alongside the masked entry
      const updatedRawKeys = { ...rawKeys, [entry.id]: rawKey };
      await rawApiKeyStore.save(updatedRawKeys);

      const updated = [...apiKeys, entry];
      await apiKeysStore.save(updated);
      if (updated.length === 1) {
        await activeKeyIdStore.save(entry.id);
      }
    },
    [apiKeys, apiKeysStore, activeKeyIdStore, rawKeys, rawApiKeyStore],
  );

  const handleRemoveApiKey = useCallback(
    async (id: string) => {
      // Remove the raw key
      const updatedRawKeys = { ...rawKeys };
      delete updatedRawKeys[id];
      await rawApiKeyStore.save(updatedRawKeys);

      const updated = apiKeys.filter((k) => k.id !== id);
      await apiKeysStore.save(updated);
      if (activeKeyId === id) {
        await activeKeyIdStore.save(updated.length > 0 ? updated[0].id : "");
      }
    },
    [apiKeys, apiKeysStore, activeKeyId, activeKeyIdStore, rawKeys, rawApiKeyStore],
  );

  const handleActivateKey = useCallback(
    async (id: string) => {
      await activeKeyIdStore.save(id);
    },
    [activeKeyIdStore],
  );

  const handleSaveFields = useCallback(
    async (fields: FieldMapping[]) => {
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

  const handleSaveProxyUrl = useCallback(
    async (url: string) => {
      setProxyUrl(url);
      await proxyUrlStore.save(url);
    },
    [proxyUrlStore.save],
  );

  const handleUpdateField = useCallback(
    async (fieldId: string, value: string) => {
      if (import.meta.env.DEV) {
        console.log("DEV: updateField", { fieldId, value });
        await new Promise((r) => setTimeout(r, 500));
        setPendingReanalyze(true);
        refetch();
        return;
      }
      const formService = await SDK.getService<IWorkItemFormService>(
        WorkItemTrackingServiceIds.WorkItemFormService
      );
      await formService.setFieldValue(fieldId, value);
      await formService.save();
      setPendingReanalyze(true);
      refetch();
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
    apiKeysStore.loading ||
    analysisFields.loading ||
    estimationFieldStore.loading ||
    proxyUrlStore.loading ||
    rawApiKeyStore.loading;

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

  const [initDone, setInitDone] = useState(false);
  useEffect(() => {
    if (minTimerDone) setInitDone(true);
  }, [minTimerDone]);

  if (dataError) {
    return (
      <div className="error-container">
        <p className="error-title">Failed to load work item data</p>
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
        expandSun={initDone}
        onHidden={() => setShowPanel(true)}
      >
        {showPanel && (
          <div
            style={{
              backgroundColor: "#e7f1f2",
              borderRadius: 8,
              minHeight: enableHeightTransition ? "none" : 452,
              animation: "expandIn 0.4s ease-out",
              height:
                containerHeight !== undefined
                  ? Math.max(containerHeight, contentMinHeight ?? 0)
                  : "auto",
              overflow: "hidden",
              transition: enableHeightTransition
                ? "height 0.3s ease-out"
                : "none",
            }}
          >
            <div
              ref={contentRef}
              style={{ position: "relative", height: "100%" }}
            >
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
                onCountUpDone={handleCountUpDone}
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
                    proxyUrl={proxyUrlStore.value ?? ""}
                    onSaveProxyUrl={handleSaveProxyUrl}
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
