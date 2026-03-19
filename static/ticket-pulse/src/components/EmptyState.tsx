import React from 'react';

export const EmptyState: React.FC = () => (
  <div className="empty-container">
    <div className="empty-icon">&#128221;</div>
    <p className="empty-title">No content to validate</p>
    <p className="empty-text">
      Add a description and acceptance criteria to get your ticket quality score.
    </p>
  </div>
);
