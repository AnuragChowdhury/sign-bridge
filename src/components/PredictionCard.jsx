import React from 'react';

export function PredictionCard({ prediction }) {
  const label = prediction?.label || '?';
  const confidence = prediction?.confidence || 0;
  const source = prediction?.source || null;
  
  // Calculate percentage for the bar
  const percent = Math.round(confidence * 100);
  
  // Add pulse animation when confidence is high
  const isHighConfidence = confidence > 0.7;

  return (
    <div className={`glass-panel prediction-card ${isHighConfidence ? 'glow-active' : ''}`}>
      <div className="prediction-char">{label}</div>
      <div style={{ width: '100%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="prediction-confidence">
            Confidence: {percent}%
          </span>
          {source && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              {source}
            </span>
          )}
        </div>
        <div className="confidence-bar-bg">
          <div 
            className="confidence-bar-fill" 
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
