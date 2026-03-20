import React, { useState } from 'react';

interface SettingsPanelProps {
  hasApiKey: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  hasApiKey,
  onSave,
  onRemove,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      await onSave(apiKey.trim());
      setApiKey('');
      setMessage('API key saved. Re-validate to use AI analysis.');
    } catch {
      setMessage('Failed to save API key.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setMessage('');
    try {
      await onRemove();
      setMessage('API key removed. AI analysis disabled.');
    } catch {
      setMessage('Failed to remove API key.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && !!apiKey.trim();

  return (
    <div className="settings-container">
      <div className="settings-header">
        <span className="settings-title">AI Settings</span>
        <button onClick={onClose} className="settings-close-btn">
          &#x2715;
        </button>
      </div>

      <div className={`settings-status ${hasApiKey ? 'settings-status--active' : 'settings-status--inactive'}`}>
        <span>{hasApiKey ? '\u25CF' : '\u25CB'}</span>
        <span>{hasApiKey ? 'AI analysis enabled' : 'No API key configured'}</span>
      </div>

      <div className="settings-input-row">
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="settings-input"
        />
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`settings-save-btn ${canSave ? 'settings-save-btn--enabled' : 'settings-save-btn--disabled'}`}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {hasApiKey && (
        <button onClick={handleRemove} disabled={saving} className="settings-remove-btn">
          Remove API key
        </button>
      )}

      {message && <p className="settings-message">{message}</p>}

      <p className="settings-note">
        Your OpenAI API key is stored securely server-side and never sent to the browser.
      </p>
    </div>
  );
};
