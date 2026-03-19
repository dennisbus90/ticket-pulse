import React from 'react';

export const LoadingState: React.FC = () => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: '#F4F5F7',
        margin: '0 auto 16px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          height: 12,
          background: '#F4F5F7',
          borderRadius: 6,
          margin: '8px 0',
          width: `${80 - i * 15}%`,
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `}</style>
  </div>
);
