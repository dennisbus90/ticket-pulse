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

  return (
    <div
      style={{
        padding: '12px',
        background: '#FAFBFC',
        borderBottom: '1px solid #DFE1E6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>AI Settings</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: '#6B778C',
            padding: '0 4px',
          }}
        >
          &#x2715;
        </button>
      </div>

      <div
        style={{
          fontSize: 12,
          color: hasApiKey ? '#36B37E' : '#6B778C',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>{hasApiKey ? '\u25CF' : '\u25CB'}</span>
        <span>{hasApiKey ? 'AI analysis enabled' : 'No API key configured'}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            fontSize: 12,
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          style={{
            padding: '6px 12px',
            background: '#0052CC',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: saving || !apiKey.trim() ? 'default' : 'pointer',
            opacity: saving || !apiKey.trim() ? 0.5 : 1,
          }}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {hasApiKey && (
        <button
          onClick={handleRemove}
          disabled={saving}
          style={{
            background: 'none',
            border: 'none',
            color: '#DE350B',
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Remove API key
        </button>
      )}

      {message && (
        <p style={{ fontSize: 11, color: '#6B778C', margin: '6px 0 0' }}>{message}</p>
      )}

      <p style={{ fontSize: 11, color: '#97A0AF', margin: '8px 0 0' }}>
        Your OpenAI API key is stored securely server-side and never sent to the browser.
      </p>
    </div>
  );
};
