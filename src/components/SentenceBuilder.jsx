import React from 'react';
import { Trash2, AlertCircle, MessageSquare } from 'lucide-react';

export function SentenceBuilder({
  rawHistory = [],
  translatedHistory = [],
  glossBuffer = [],
  isTranslating = false,
  translationError = null,
  translationEnabled = true,
  onClear
}) {
  const safeGlossBuffer = Array.isArray(glossBuffer) 
    ? glossBuffer 
    : (typeof glossBuffer === 'string' ? [glossBuffer] : []);
  const safeRawHistory = Array.isArray(rawHistory) ? rawHistory : [];
  const safeTranslatedHistory = Array.isArray(translatedHistory) ? translatedHistory : [];

  const historyText = translationEnabled
    ? safeTranslatedHistory.join(' ')
    : safeRawHistory.join(' ');

  const hasHistory = historyText.trim().length > 0;
  const hasBuffer = safeGlossBuffer.length > 0;
  const showPlaceholder = !hasHistory && !hasBuffer && !isTranslating;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <MessageSquare size={13} />
          {translationEnabled ? 'AI Translation Output' : 'Raw Gloss History'}
        </div>
        <button className="btn-clear" onClick={onClear}>
          <Trash2 size={11} /> Clear
        </button>
      </div>

      {hasBuffer && (
        <div className="gloss-row">
          {safeGlossBuffer.map((g, i) => (
            <span key={i} className="gloss-tag">{g}</span>
          ))}
        </div>
      )}

      <div className="translation-body">
        <div className="translation-text">
          {showPlaceholder && (
            <span className="translation-placeholder">
              Start signing to see live translation here...
            </span>
          )}
          {hasHistory && <span>{historyText} </span>}
          {isTranslating && (
            <span className="translating-badge">
              <span className="translating-spinner" />
              Translating...
            </span>
          )}
          <span className="cursor-blink" />
        </div>
      </div>

      {translationError && (
        <div style={{
          margin: '0 1.1rem 1rem',
          padding: '0.6rem 0.85rem',
          background: 'var(--red-pale)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '9px',
          color: 'var(--red)',
          fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', gap: '0.45rem'
        }}>
          <AlertCircle size={13} />
          <span>{translationError}</span>
        </div>
      )}
    </div>
  );
}
