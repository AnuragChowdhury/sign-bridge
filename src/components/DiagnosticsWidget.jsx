import React from 'react';
import { Activity, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export function DiagnosticsWidget({
  cameraStatus,
  mediaPipeStatus,
  tfLiteStatus,
  handMotionState = 'No Hand',
  currentMotionVal = 0,
  pauseTimeProgress = 0
}) {
  const stageClass = (stage) => {
    if (stage === 'READY') return 'ready';
    if (stage === 'ERROR') return 'error';
    if (stage === 'DISABLED') return 'disabled';
    return 'loading';
  };

  const stageLabel = (stage) => {
    if (stage === 'READY') return 'READY';
    if (stage === 'ERROR') return 'ERROR';
    if (stage === 'DISABLED') return 'N/A';
    return 'LOADING';
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title"><Activity size={13} /> System Status</div>
      </div>
      <div className="status-strip">
        <div className={`status-pill ${stageClass(cameraStatus?.stage)}`}>
          <CheckCircle2 size={10} /> Camera · {stageLabel(cameraStatus?.stage)}
        </div>
        <div className={`status-pill ${stageClass(mediaPipeStatus?.stage)}`}>
          <Cpu size={10} /> MediaPipe · {stageLabel(mediaPipeStatus?.stage)}
        </div>
        <div className={`status-pill ${stageClass(tfLiteStatus?.stage)}`}>
          <Cpu size={10} /> LSTM · {stageLabel(tfLiteStatus?.stage)}
        </div>
      </div>

      <div style={{ padding: '0 1.1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.77rem', fontWeight: 500, color: 'var(--text-muted)' }}>Hand State</span>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700,
            padding: '0.15rem 0.55rem', borderRadius: '20px',
            color: handMotionState === 'Moving' ? 'var(--green)'
              : (handMotionState === 'Static' ? '#D97706' : 'var(--text-light)'),
            background: handMotionState === 'Moving' ? 'var(--green-pale)'
              : (handMotionState === 'Static' ? '#FEF3C7' : 'var(--light)'),
            border: `1px solid ${handMotionState === 'Moving' ? 'rgba(5,150,105,0.25)'
              : (handMotionState === 'Static' ? 'rgba(217,119,6,0.25)' : 'var(--border)')}`,
          }}>
            {handMotionState}
          </span>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.3rem' }}>
            <span>Pause Timer</span>
            <span>{Math.round(pauseTimeProgress)}%</span>
          </div>
          <div className="confidence-bar-bg">
            <div className="confidence-bar-fill" style={{ width: `${pauseTimeProgress}%` }} />
          </div>
        </div>

        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>
          Motion: {currentMotionVal.toFixed(5)}
        </div>
      </div>
    </div>
  );
}
