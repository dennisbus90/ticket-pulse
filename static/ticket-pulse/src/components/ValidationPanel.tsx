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
    <div className="panel-root">
      {showSettings && (
        <SettingsPanel
          hasApiKey={hasApiKey}
          onSave={onSaveApiKey}
          onRemove={onRemoveApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="panel-content">
      <div className="panel-actions">
        <button
          onClick={() => setShowSettings(!showSettings)}
          title="AI Settings"
          className={`settings-toggle-btn ${hasApiKey ? 'settings-toggle-btn--active' : 'settings-toggle-btn--inactive'}`}
        >
          &#x2699;
        </button>
      </div>
      <ScoreGauge score={result.overallScore} />

      <p className="panel-summary">
        {result.summary}
      </p>

      <div>
        {result.outcomes.map((outcome) => (
          <RuleSection key={outcome.ruleId} outcome={outcome} />
        ))}
      </div>

      <button onClick={onRevalidate} className="revalidate-btn">
        Re-validate
      </button>
      </div>
    </div>
  );
};
