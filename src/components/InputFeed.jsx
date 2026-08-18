import React, { useRef, useEffect, useState } from 'react';
import { Upload, Link2, Camera, Loader2 } from 'lucide-react';
import { INPUT_MODES } from '../constants';

export function InputFeed({
  mode = INPUT_MODES.WEBCAM,
  videoRef,
  isReady,
  error,
  onFrame,
  currentLanguage = 'lsa64'
}) {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const fileInputRef = useRef(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoSrc, setVideoSrc] = useState('');

  const getVideoProxyUrl = (src) => {
    if (!src) return '';
    if (
      src.startsWith('blob:') ||
      src.startsWith('/') ||
      src.includes('localhost') ||
      src.includes('127.0.0.1')
    ) return src;
    return `http://localhost:3001/api/proxy-video?url=${encodeURIComponent(src)}`;
  };

  // Frame render loop
  useEffect(() => {
    if (!videoRef.current) return;

    const renderLoop = () => {
      if (onFrame && canvasRef.current && videoRef.current) {
        onFrame(videoRef.current, canvasRef.current);
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    const handlePlay = () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    const handlePause = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (onFrame) onFrame(null, canvasRef.current);
    };

    const videoEl = videoRef.current;
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handlePause);

    if (mode === INPUT_MODES.WEBCAM || !videoEl.paused) {
      requestRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handlePause);
    };
  }, [mode, isReady, onFrame, videoRef, videoSrc]);

  const handleLoadUrl = () => {
    if (videoUrlInput.trim()) {
      setVideoSrc(videoUrlInput.trim());
      if (videoRef.current) videoRef.current.load();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      if (videoRef.current) videoRef.current.load();
    }
  };

  // ── WEBCAM ──────────────────────────────────────────────────────────────
  if (mode === INPUT_MODES.WEBCAM) {
    return (
      <div className="feed-panel" style={{ height: '460px' }}>
        {/* top header bar */}
        <div className="feed-header">
          <div className="feed-label">
            <Camera size={13} />
            Live Webcam
          </div>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        </div>

        {/* Loading / Error overlay */}
        {error && (
          <div className="feed-overlay" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          </div>
        )}
        {!isReady && !error && (
          <div className="feed-overlay">
            <div className="feed-spinner" />
            <p>Initializing Camera & AI Models...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className="video-element"
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          className="canvas-element"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none'
          }}
        />
      </div>
    );
  }

  // ── VIDEO URL ────────────────────────────────────────────────────────────
  if (mode === INPUT_MODES.VIDEO_URL) {
    return (
      <div className="feed-panel" style={{ minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
        <div className="feed-header" style={{ flexShrink: 0, gap: '1rem', flexWrap: 'wrap' }}>
          <div className="feed-label">
            <Link2 size={13} />
            Video Link
          </div>
          {/* Positioned YouTube input in the header to avoid blocking player play controls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
            <input
              className="feed-input"
              type="text"
              placeholder="Paste YouTube / MP4 URL here..."
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
              style={{ width: '280px', height: '32px', fontSize: '0.8rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--off-white)', color: '#000000' }}
            />
            <button className="btn-primary" onClick={handleLoadUrl} style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', height: '32px' }}>
              <Link2 size={12} /> Load
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden' }}>
          {!isReady && (
            <div className="feed-overlay">
              <div className="feed-spinner" />
              <p>Loading AI Recognition Core...</p>
            </div>
          )}

          <video
            ref={videoRef}
            src={getVideoProxyUrl(videoSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            playsInline
            controls
            crossOrigin="anonymous"
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
        </div>
      </div>
    );
  }

  // ── VIDEO UPLOAD ─────────────────────────────────────────────────────────
  if (mode === INPUT_MODES.VIDEO_UPLOAD) {
    return (
      <div className="feed-panel" style={{ minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
        <div className="feed-header" style={{ flexShrink: 0, gap: '1rem', flexWrap: 'wrap' }}>
          <div className="feed-label">
            <Upload size={13} />
            Uploaded Video
          </div>
          {/* Positioned Choose File button in the header to avoid blocking player play controls */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {videoSrc?.startsWith('blob:') ? '✓ File selected' : 'No file selected'}
            </span>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', height: '32px' }}>
              <Upload size={12} /> Choose File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden' }}>
          {!isReady && (
            <div className="feed-overlay">
              <div className="feed-spinner" />
              <p>Loading AI Recognition Core...</p>
            </div>
          )}

          {/* If no file loaded yet — show drop zone */}
          {(!videoSrc || !videoSrc.startsWith('blob:')) && (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '1rem', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 5, background: 'rgba(255,255,255,0.95)'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} strokeWidth={1.2} color="var(--purple-primary)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>Click to upload a video file</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>MP4, WebM, MOV supported</div>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            src={getVideoProxyUrl(videoSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            playsInline
            controls
            crossOrigin="anonymous"
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
        </div>
      </div>
    );
  }

  return null;
}
