import React, { useEffect, useState } from 'react';
import { getGradeInfo } from '../utils/score';

interface ScoreGaugeProps {
  score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const { grade, label, color } = getGradeInfo(score);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 600;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  // SVG arc parameters
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#F4F5F7"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 0.3s' }}
        />
      </svg>
      <div style={{ marginTop: -20 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color }}>{animatedScore}</span>
        <span style={{ fontSize: 16, color: '#6B778C' }}>/100</span>
      </div>
      <div
        style={{
          display: 'inline-block',
          marginTop: 4,
          padding: '2px 10px',
          borderRadius: 12,
          background: color,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {grade} — {label}
      </div>
    </div>
  );
};
