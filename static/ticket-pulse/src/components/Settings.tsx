import React, { useState, useEffect } from "react";
import type { FieldOption, AnalysisFieldMapping, EstimationFieldConfig, AiProvider } from "../types";

interface SettingsProps {
  hasApiKey: boolean;
  provider: AiProvider;
  model: string;
  analysisFields: AnalysisFieldMapping[];
  estimationField: EstimationFieldConfig | null;
  onSaveApiKey: (key: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
  onChangeProvider: (provider: AiProvider) => Promise<void>;
  onChangeModel: (model: string) => Promise<void>;
  onSaveFields: (fields: AnalysisFieldMapping[]) => Promise<void>;
  onSaveEstimationField: (field: EstimationFieldConfig | null) => Promise<void>;
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

export const Settings: React.FC<SettingsProps> = ({
  hasApiKey,
  provider,
  model,
  analysisFields,
  estimationField,
  onSaveApiKey,
  onRemoveApiKey,
  onChangeProvider,
  onChangeModel,
  onSaveFields,
  onSaveEstimationField,
  onClose,
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "err";
  } | null>(null);
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

  const handleSave = async () => {
    const prefix = provider === "claude" ? "sk-ant-" : "sk-";
    if (!keyInput.startsWith(prefix)) {
      setMessage({
        text: `Key must start with ${prefix}`,
        type: "err",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSaveApiKey(keyInput);
      setKeyInput("");
      setMessage({ text: "Key saved", type: "ok" });
    } catch {
      setMessage({ text: "Failed to save", type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await onRemoveApiKey();
      setMessage({ text: "Key removed", type: "ok" });
    } catch {
      setMessage({ text: "Failed to remove", type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString();
    onSaveFields([...analysisFields, { id, jiraFieldId: "", jiraFieldName: "" }]);
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
          padding: "10px 14px",
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
        {/* Provider selector */}
        <label style={labelStyle}>AI Provider</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["openai", "claude"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onChangeProvider(p)}
              style={{
                flex: 1,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 500,
                border:
                  provider === p
                    ? "1px solid #2c6381"
                    : "1px solid #DFE1E6",
                borderRadius: 3,
                background: provider === p ? "#2c6381" : "#fff",
                color: provider === p ? "#fff" : "#172B4D",
                cursor: "pointer",
              }}
            >
              {p === "openai" ? "OpenAI" : "Claude"}
            </button>
          ))}
        </div>

        {/* API Key status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            marginBottom: 8,
            color: hasApiKey ? "#006644" : "#6B778C",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: hasApiKey ? "#36B37E" : "#DFE1E6",
              display: "inline-block",
            }}
          />
          {hasApiKey ? "API key configured" : "No API key set"}
        </div>

        {/* Key input */}
        <label style={labelStyle}>
          {provider === "claude" ? "Claude API Key" : "OpenAI API Key"}
        </label>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setMessage(null);
            }}
            placeholder={
              hasApiKey
                ? provider === "claude"
                  ? "sk-ant-••••••••"
                  : "sk-••••••••"
                : provider === "claude"
                  ? "sk-ant-..."
                  : "sk-..."
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
            onClick={handleSave}
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
            Save
          </button>
        </div>

        {hasApiKey && (
          <button
            onClick={handleRemove}
            disabled={saving}
            style={{
              background: "none",
              border: "none",
              color: "#BF2600",
              fontSize: 11,
              cursor: saving ? "default" : "pointer",
              padding: 0,
              marginBottom: 4,
            }}
          >
            Remove key
          </button>
        )}

        {message && (
          <div
            style={{
              fontSize: 11,
              color: message.type === "ok" ? "#006644" : "#BF2600",
              marginTop: 4,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Model selector */}
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid #EBECF0",
            paddingTop: 10,
          }}
        >
          <label style={labelStyle}>Model</label>
          <select
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
            style={selectStyle}
          >
            {provider === "claude" ? (
              <>
                <option value="claude-sonnet-4-5-20250514">Claude Sonnet 4.5 (recommended)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (faster)</option>
                <option value="claude-opus-4-20250514">Claude Opus 4 (most capable)</option>
              </>
            ) : (
              <>
                <option value="gpt-4o">gpt-4o (recommended)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (faster)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
              </>
            )}
          </select>
        </div>

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
                onChange={(e) =>
                  handleSelectField(field.id, e.target.value)
                }
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
            Select the field your team uses for estimation (e.g., Story Points, T-shirt Size).
          </div>
          <select
            value={estimationField?.jiraFieldId ?? ""}
            onChange={(e) => {
              const fieldId = e.target.value;
              if (!fieldId) {
                onSaveEstimationField(null);
              } else {
                const selected = estimationFields.find((f) => f.id === fieldId);
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
          Key stored encrypted server-side. Never sent to the browser.
        </div>
      </div>
    </div>
  );
};
