import React, { useState } from 'react';
import type { ValidationResult } from '../types';
import { ScoreGauge } from './ScoreGauge';
import { RuleSection } from './RuleSection';
import { SettingsPanel } from './SettingsPanel';

interface ValidationPanelProps {
  result: ValidationResult;
  onRevalidate: () => void;
  hasApiKey: boolean;
  onSaveApiKey: (apiKey: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  result,
  onRevalidate,
  hasApiKey,
  onSaveApiKey,
  onRemoveApiKey,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {showSettings && (
        <SettingsPanel
          hasApiKey={hasApiKey}
          onSave={onSaveApiKey}
          onRemove={onRemoveApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          title="AI Settings"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: hasApiKey ? '#36B37E' : '#6B778C',
            padding: '2px 4px',
          }}
        >
          &#x2699;
        </button>
      </div>
      <ScoreGauge score={result.overallScore} />

      <p
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#6B778C',
          margin: '0 0 16px',
        }}
      >
        {result.summary}
      </p>

      <div>
        {result.outcomes.map((outcome) => (
          <RuleSection key={outcome.ruleId} outcome={outcome} />
        ))}
      </div>

      <button
        onClick={onRevalidate}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 12,
          padding: '8px 16px',
          background: '#F4F5F7',
          border: '1px solid #DFE1E6',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          color: '#172B4D',
          cursor: 'pointer',
        }}
      >
        Re-validate
      </button>
      </div>
    </div>
  );
};
