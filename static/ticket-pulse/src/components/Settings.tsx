import React, { useState, useEffect } from "react";
import type {
  FieldOption,
  AnalysisFieldMapping,
  EstimationFieldConfig,
  AiProvider,
  ApiKeyEntry,
} from "../types";

interface SettingsProps {
  apiKeys: ApiKeyEntry[];
  activeKeyId: string;
  onAddApiKey: (entry: ApiKeyEntry, rawKey: string) => Promise<void>;
  onRemoveApiKey: (id: string) => Promise<void>;
  onActivateKey: (id: string) => Promise<void>;
  analysisFields: AnalysisFieldMapping[];
  estimationField: EstimationFieldConfig | null;
  onSaveFields: (fields: AnalysisFieldMapping[]) => Promise<void>;
  onSaveEstimationField: (
    field: EstimationFieldConfig | null,
  ) => Promise<void>;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#6B778C",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  border: "1px solid #DFE1E6",
  borderRadius: 3,
  fontSize: 12,
  background: "#fff",
  color: "#172B4D",
  outline: "none",
};

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "gpt-4o (recommended)" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini (faster)" },
  { value: "gpt-4-turbo", label: "gpt-4-turbo" },
];

const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-5-20250514", label: "Claude Sonnet 4.5 (recommended)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (faster)" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4 (most capable)" },
];

function getModelLabel(model: string): string {
  const all = [...OPENAI_MODELS, ...CLAUDE_MODELS];
  return all.find((m) => m.value === model)?.label ?? model;
}

export const Settings: React.FC<SettingsProps> = ({
  apiKeys,
  activeKeyId,
  onAddApiKey,
  onRemoveApiKey,
  onActivateKey,
  analysisFields,
  estimationField,
  onSaveFields,
  onSaveEstimationField,
  onClose,
}) => {
  const [newProvider, setNewProvider] = useState<AiProvider>("openai");
  const [newModel, setNewModel] = useState("gpt-4o");
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "err";
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [jiraFields, setJiraFields] = useState<FieldOption[]>([]);
  const [estimationFields, setEstimationFields] = useState<FieldOption[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setJiraFields([
        { id: "summary", name: "Summary" },
        { id: "description", name: "Description" },
        { id: "customfield_10037", name: "Acceptance Criteria" },
        { id: "customfield_10038", name: "User Story" },
        { id: "customfield_10039", name: "Definition of Done" },
      ]);
      setEstimationFields([
        { id: "story_points", name: "Story Points" },
        { id: "customfield_10016", name: "Story point estimate" },
        { id: "customfield_10050", name: "T-Shirt Size" },
      ]);
      setFieldsLoading(false);
      return;
    }
    import("@forge/bridge").then(({ invoke }) => {
      Promise.all([
        invoke<FieldOption[]>("getJiraFields")
          .then((fields) => setJiraFields(fields ?? []))
          .catch(() => setJiraFields([])),
        invoke<FieldOption[]>("getEstimationFields")
          .then((fields) => setEstimationFields(fields ?? []))
          .catch(() => setEstimationFields([])),
      ]).finally(() => setFieldsLoading(false));
    });
  }, []);

  const handleProviderChange = (p: AiProvider) => {
    setNewProvider(p);
    setNewModel(p === "claude" ? "claude-sonnet-4-5-20250514" : "gpt-4o");
    setMessage(null);
  };

  const handleAddKey = async () => {
    const prefix = newProvider === "claude" ? "sk-ant-" : "sk-";
    if (!keyInput.startsWith(prefix)) {
      setMessage({ text: `Key must start with ${prefix}`, type: "err" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();
      const maskedKey = "..." + keyInput.slice(-4);
      const entry: ApiKeyEntry = {
        id,
        provider: newProvider,
        model: newModel,
        maskedKey,
      };
      await onAddApiKey(entry, keyInput);
      setKeyInput("");
      setMessage({ text: "Key added", type: "ok" });
    } catch {
      setMessage({ text: "Failed to add key", type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setSaving(true);
    try {
      await onRemoveApiKey(id);
      setConfirmDeleteId(null);
    } catch {
      setMessage({ text: "Failed to remove key", type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();
    onSaveFields([
      ...analysisFields,
      { id, jiraFieldId: "", jiraFieldName: "" },
    ]);
  };

  const handleSelectField = (id: string, jiraFieldId: string) => {
    const selected = jiraFields.find((f) => f.id === jiraFieldId);
    const updated = analysisFields.map((f) =>
      f.id === id
        ? { ...f, jiraFieldId, jiraFieldName: selected?.name ?? "" }
        : f,
    );
    onSaveFields(updated);
  };

  const handleRemoveField = (id: string) => {
    onSaveFields(analysisFields.filter((f) => f.id !== id));
  };

  const models = newProvider === "claude" ? CLAUDE_MODELS : OPENAI_MODELS;

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderBottom: "1px solid #EBECF0",
        background: "#FAFBFC",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid #EBECF0",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "#172B4D" }}>
          Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#6B778C",
            padding: "0 2px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "10px 14px" }}>
        {/* Add API Key */}
        <label style={labelStyle}>Add API Key</label>

        {/* Provider toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["openai", "claude"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              style={{
                flex: 1,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 500,
                border:
                  newProvider === p
                    ? "1px solid #2c6381"
                    : "1px solid #DFE1E6",
                borderRadius: 3,
                background: newProvider === p ? "#2c6381" : "#fff",
                color: newProvider === p ? "#fff" : "#172B4D",
                cursor: "pointer",
              }}
            >
              {p === "openai" ? "OpenAI" : "Claude"}
            </button>
          ))}
        </div>

        {/* Model selector */}
        <select
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          style={{ ...selectStyle, marginBottom: 8 }}
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Key input + Add button */}
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setMessage(null);
            }}
            placeholder={
              newProvider === "claude" ? "sk-ant-..." : "sk-..."
            }
            style={{
              flex: 1,
              padding: "5px 8px",
              border: "1px solid #DFE1E6",
              borderRadius: 3,
              fontSize: 12,
              fontFamily: "monospace",
              background: "#fff",
              outline: "none",
            }}
          />
          <button
            onClick={handleAddKey}
            disabled={!keyInput || saving}
            style={{
              padding: "5px 12px",
              background: !keyInput || saving ? "#F4F5F7" : "#0052CC",
              color: !keyInput || saving ? "#A5ADBA" : "#fff",
              border: !keyInput || saving ? "1px solid #DFE1E6" : "none",
              borderRadius: 3,
              fontSize: 12,
              fontWeight: 500,
              cursor: !keyInput || saving ? "default" : "pointer",
            }}
          >
            Add
          </button>
        </div>

        {message && (
          <div
            style={{
              fontSize: 11,
              color: message.type === "ok" ? "#006644" : "#BF2600",
              marginBottom: 6,
            }}
          >
            {message.text}
          </div>
        )}

        {/* API Key List */}
        {apiKeys.length > 0 && (
          <div
            style={{
              marginTop: 10,
              borderTop: "1px solid #EBECF0",
              paddingTop: 10,
            }}
          >
            <label style={labelStyle}>API Keys</label>
            {apiKeys.map((entry) => {
              const isActive =
                entry.id === activeKeyId ||
                (apiKeys.length === 1 && !activeKeyId);
              const isConfirming = confirmDeleteId === entry.id;
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    marginBottom: 4,
                    borderRadius: 3,
                    border: isActive
                      ? "1px solid #ABF5D1"
                      : "1px solid #DFE1E6",
                    background: isActive ? "#E3FCEF" : "#fff",
                  }}
                >
                  {/* Provider badge */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      background:
                        entry.provider === "claude" ? "#D97706" : "#0052CC",
                      borderRadius: 2,
                      padding: "1px 5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {entry.provider === "claude" ? "Claude" : "OpenAI"}
                  </span>

                  {/* Masked key */}
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "#6B778C",
                      flexShrink: 0,
                    }}
                  >
                    {entry.maskedKey}
                  </span>

                  {/* Model */}
                  <span
                    style={{
                      fontSize: 10,
                      color: "#97A0AF",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getModelLabel(entry.model)}
                  </span>

                  {/* Use / Active button */}
                  {isActive ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#006644",
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => onActivateKey(entry.id)}
                      style={{
                        background: "none",
                        border: "1px solid #DFE1E6",
                        borderRadius: 3,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#172B4D",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Use
                    </button>
                  )}

                  {/* Delete */}
                  {isConfirming ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleConfirmDelete(entry.id)}
                        disabled={saving}
                        style={{
                          background: "#BF2600",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          background: "#F4F5F7",
                          color: "#172B4D",
                          border: "1px solid #DFE1E6",
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(entry.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#6B778C",
                        padding: "0 2px",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                      title="Remove key"
                    >
                      &#128465;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Analysis Fields */}
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid #EBECF0",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#172B4D",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Fields to Analyze
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6B778C",
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            Add the Jira fields you want the AI to review.
          </div>

          {analysisFields.map((field) => (
            <div
              key={field.id}
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                alignItems: "center",
              }}
            >
              <select
                value={field.jiraFieldId}
                onChange={(e) => handleSelectField(field.id, e.target.value)}
                disabled={fieldsLoading}
                style={{ ...selectStyle, flex: 1 }}
              >
                <option value="">(select field)</option>
                {jiraFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.id})
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleRemoveField(field.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#6B778C",
                  padding: "2px 4px",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title="Remove field"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={handleAddField}
            disabled={fieldsLoading}
            style={{
              background: "none",
              border: "1px dashed #DFE1E6",
              borderRadius: 3,
              padding: "5px 10px",
              fontSize: 12,
              color: "#0052CC",
              cursor: fieldsLoading ? "default" : "pointer",
              width: "100%",
              marginTop: 2,
            }}
          >
            + Add field
          </button>
        </div>

        {/* Estimation Field */}
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid #EBECF0",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#172B4D",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Estimation Field
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6B778C",
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            Select the field your team uses for estimation (e.g., Story Points,
            T-shirt Size).
          </div>
          <select
            value={estimationField?.jiraFieldId ?? ""}
            onChange={(e) => {
              const fieldId = e.target.value;
              if (!fieldId) {
                onSaveEstimationField(null);
              } else {
                const selected = estimationFields.find(
                  (f) => f.id === fieldId,
                );
                onSaveEstimationField({
                  jiraFieldId: fieldId,
                  jiraFieldName: selected?.name ?? fieldId,
                });
              }
            }}
            disabled={fieldsLoading}
            style={selectStyle}
          >
            <option value="">None (disable estimation analysis)</option>
            {estimationFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.id})
              </option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div
          style={{
            fontSize: 10,
            color: "#97A0AF",
            marginTop: 10,
            lineHeight: 1.4,
          }}
        >
          Keys stored encrypted server-side. Never sent to the browser.
        </div>
      </div>
    </div>
  );
};
