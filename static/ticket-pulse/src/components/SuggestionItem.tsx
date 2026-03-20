import React from 'react';
import type { Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';

const SEVERITY_INFO: Record<RuleSeverity, { icon: string; className: string }> = {
  [RuleSeverity.ERROR]: { icon: '\u25CF', className: 'suggestion-icon--error' },
  [RuleSeverity.WARNING]: { icon: '\u25B2', className: 'suggestion-icon--warning' },
  [RuleSeverity.INFO]: { icon: '\u24D8', className: 'suggestion-icon--info' },
};

interface SuggestionItemProps {
  finding: Finding;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ finding }) => {
  const info = SEVERITY_INFO[finding.severity];

  return (
    <div className="suggestion-item">
      <div className="suggestion-row">
        <span className={`suggestion-icon ${info.className}`}>
          {info.icon}
        </span>
        <span className="suggestion-message">{finding.message}</span>
      </div>
      {finding.suggestion && (
        <div className="suggestion-hint">
          &rarr; {finding.suggestion}
        </div>
      )}
    </div>
  );
};
