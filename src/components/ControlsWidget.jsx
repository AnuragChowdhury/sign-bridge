import React from 'react';
import { Settings } from 'lucide-react';

export function ControlsWidget({
  isStreaming,
  setIsStreaming,
  inputMode,
  setInputMode,
  currentLanguage,
  setCurrentLanguage,
  translationEnabled,
  setTranslationEnabled,
  selectedEngine,
  setSelectedEngine,
  activeContext
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title"><Settings size={13} /> AI Controls</div>
      </div>

      <div className="controls-panel">
        {/* Recognition stream toggle */}
        <div>
          <div className="ctrl-label">Recognition Stream</div>
          <div className="stream-toggle" onClick={() => setIsStreaming(!isStreaming)} role="button">
            <span className="stream-toggle-label">
              {isStreaming ? '▶ Streaming Active' : '⏸ Paused'}
            </span>
            <span className={`stream-pill ${isStreaming ? 'on' : 'off'}`}>
              {isStreaming ? 'LIVE' : 'OFF'}
            </span>
          </div>
        </div>

        <div className="ctrl-divider" />

        {/* AI Translation */}
        <div>
          <div className="ctrl-label">AI Translation</div>
          <div className="stream-toggle" onClick={() => setTranslationEnabled(!translationEnabled)} role="button">
            <span className="stream-toggle-label">Translate Glosses</span>
            <span className={`stream-pill ${translationEnabled ? 'on' : 'off'}`}>
              {translationEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {translationEnabled && (
          <div>
            <div className="ctrl-label">Translation Engine</div>
            <div className="select-wrapper">
              <select value={selectedEngine} onChange={(e) => setSelectedEngine(e.target.value)}>
                <option value="openai">OpenAI GPT-4o mini</option>
                <option value="local">Local Seq2Seq (Mock)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
