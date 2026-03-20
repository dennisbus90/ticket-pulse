import React, { useState, useEffect } from "react";
import type { FieldOption } from "../types";

interface FieldMapping {
  userStory: string;
  description: string;
  acceptanceCriteria: string;
}

interface SettingsProps {
  hasApiKey: boolean;
  model: string;
  fieldMapping: FieldMapping;
  onSaveApiKey: (key: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
  onChangeModel: (model: string) => Promise<void>;
  onChangeFieldMapping: (
    field: keyof FieldMapping,
    value: string,
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

export const Settings: React.FC<SettingsProps> = ({
  hasApiKey,
  model,
  fieldMapping,
  onSaveApiKey,
  onRemoveApiKey,
  onChangeModel,
  onChangeFieldMapping,
  onClose,
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "err";
  } | null>(null);
  const [jiraFields, setJiraFields] = useState<FieldOption[]>([]);
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
      setFieldsLoading(false);
      return;
    }
    import("@forge/bridge").then(({ invoke }) => {
      invoke<FieldOption[]>("getJiraFields")
        .then((fields) => setJiraFields(fields ?? []))
        .catch(() => setJiraFields([]))
        .finally(() => setFieldsLoading(false));
    });
  }, []);

  const handleSave = async () => {
    if (!keyInput.startsWith("sk-")) {
      setMessage({ text: "Key must start with sk-", type: "err" });
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

  const renderFieldSelect = (label: string, field: keyof FieldMapping) => (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>{label}</label>
      <select
        value={fieldMapping[field]}
        onChange={(e) => onChangeFieldMapping(field, e.target.value)}
        disabled={fieldsLoading}
        style={selectStyle}
      >
        <option value="">(not set)</option>
        {jiraFields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.id})
          </option>
        ))}
      </select>
    </div>
  );

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

      <div>
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
        <label style={labelStyle}>OpenAI API Key</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setMessage(null);
            }}
            placeholder={hasApiKey ? "sk-••••••••" : "sk-..."}
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
            <option value="gpt-4o">gpt-4o (recommended)</option>
            <option value="gpt-4o-mini">gpt-4o-mini (faster)</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
          </select>
        </div>

        {/* Field Mapping */}
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
            Field Mapping
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6B778C",
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            Select which Jira fields to analyze. Leave empty to skip.
          </div>
          {renderFieldSelect("User Story", "userStory")}
          {renderFieldSelect("Description", "description")}
          {renderFieldSelect("Acceptance Criteria", "acceptanceCriteria")}
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
