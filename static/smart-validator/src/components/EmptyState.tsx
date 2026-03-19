import React from 'react';

export const EmptyState: React.FC = () => (
  <div
    style={{
      padding: '32px 16px',
      textAlign: 'center',
      color: '#6B778C',
    }}
  >
    <div style={{ fontSize: 48, marginBottom: 12 }}>&#128221;</div>
    <p style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', margin: '0 0 8px' }}>
      No content to validate
    </p>
    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
      Add a description and acceptance criteria to get your ticket quality score.
    </p>
  </div>
);
