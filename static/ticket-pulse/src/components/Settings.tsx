import React, { useState } from "react";

interface SettingsProps {
  hasApiKey: boolean;
  model: string;
  onSaveApiKey: (key: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
  onChangeModel: (model: string) => Promise<void>;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  hasApiKey,
  model,
  onSaveApiKey,
  onRemoveApiKey,
  onChangeModel,
  onClose,
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);

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

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      borderBottom: "1px solid #EBECF0",
      background: "#FAFBFC",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderBottom: "1px solid #EBECF0",
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#172B4D",
        }}>
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

      <div style={{ padding: "12px 14px" }}>
        {/* API Key status */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          marginBottom: 8,
          color: hasApiKey ? "#006644" : "#6B778C",
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: hasApiKey ? "#36B37E" : "#DFE1E6",
            display: "inline-block",
          }} />
          {hasApiKey ? "API key configured" : "No API key set"}
        </div>

        {/* Key input */}
        <label style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "#6B778C",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}>
          OpenAI API Key
        </label>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); setMessage(null); }}
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
          <div style={{
            fontSize: 11,
            color: message.type === "ok" ? "#006644" : "#BF2600",
            marginTop: 4,
          }}>
            {message.text}
          </div>
        )}

        {/* Model selector */}
        <div style={{ marginTop: 12, borderTop: "1px solid #EBECF0", paddingTop: 10 }}>
          <label style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: "#6B778C",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}>
            Model
          </label>
          <select
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
            style={{
              width: "100%",
              padding: "5px 8px",
              border: "1px solid #DFE1E6",
              borderRadius: 3,
              fontSize: 12,
              background: "#fff",
              color: "#172B4D",
              outline: "none",
            }}
          >
            <option value="gpt-4o">gpt-4o (recommended)</option>
            <option value="gpt-4o-mini">gpt-4o-mini (faster)</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
          </select>
        </div>

        {/* Note */}
        <div style={{
          fontSize: 10,
          color: "#97A0AF",
          marginTop: 10,
          lineHeight: 1.4,
        }}>
          Key stored encrypted server-side. Never sent to the browser.
        </div>
      </div>
    </div>
  );
};
