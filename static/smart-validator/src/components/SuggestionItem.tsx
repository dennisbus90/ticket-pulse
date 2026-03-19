import React from 'react';
import type { Finding } from '../types/rules';
import { RuleSeverity } from '../types/rules';

const SEVERITY_STYLES: Record<RuleSeverity, { icon: string; color: string }> = {
  [RuleSeverity.ERROR]: { icon: '\u25CF', color: '#DE350B' },
  [RuleSeverity.WARNING]: { icon: '\u25B2', color: '#FFAB00' },
  [RuleSeverity.INFO]: { icon: '\u24D8', color: '#0065FF' },
};

interface SuggestionItemProps {
  finding: Finding;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ finding }) => {
  const style = SEVERITY_STYLES[finding.severity];

  return (
    <div style={{ padding: '6px 0', fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: style.color, flexShrink: 0, marginTop: 2 }}>
          {style.icon}
        </span>
        <span style={{ color: '#172B4D' }}>{finding.message}</span>
      </div>
      {finding.suggestion && (
        <div style={{ marginLeft: 20, color: '#6B778C', fontSize: 12, marginTop: 2 }}>
          &rarr; {finding.suggestion}
        </div>
      )}
    </div>
  );
};
