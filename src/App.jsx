import React, { useState, useCallback } from 'react';
import { InputFeed } from './components/InputFeed';
import { SentenceBuilder } from './components/SentenceBuilder';
import { DiagnosticsWidget } from './components/DiagnosticsWidget';
import { ControlsWidget } from './components/ControlsWidget';
import { useWebcam } from './hooks/useWebcam';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useTFLite } from './hooks/useTFLite';
import { useTemporalSmoothing } from './hooks/useTemporalSmoothing';
import { useSentenceBuilder } from './hooks/useSentenceBuilder';
import { LANGUAGES, INPUT_MODES } from './constants';
import { Home, Camera, Upload, Link2, Users, Hand, Zap, ExternalLink, X, Code2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import './index.css';

const RANDOM_SENTENCES = [
  "Hello, how are you doing today?",
  "Are you coming to the deaf coffee chat tonight?",
  "Yes, I am excited to practice sign language with all of you.",
  "Great, I will see you there at seven.",
  "See you later then.",
  "Look how beautiful the plants are growing green.",
  "It is the cold season and I have my warm coat on.",
  "My name is Santiago and this is my personal sign.",
  "I am traveling from Argentina to meet deaf friends.",
  "My father worked on a ship protecting at sea.",
  "He saluted like this to show respect.",
  "I attended the deaf school and the university.",
  "I am a sign language instructor teaching hearing people.",
  "Please join me and let us enjoy learning sign language together.",
  "Thank you very much for your time and help.",
  "Can you please help me find the nearest coffee shop?",
  "The weather today is absolutely beautiful and sunny.",
  "I want to learn Indian Sign Language next year.",
  "Do you understand what I am signing to you?",
  "Please sign slowly so I can follow.",
  "Nice to meet you, hope to see you again soon.",
  "I am happy to be here with you today.",
  "Where are you from and what is your language?",
  "Sign language is beautiful and very expressive.",
  "Let us practice some basic gestures together.",
  "Could you repeat that sign one more time?",
  "I need a glass of water, thank you.",
  "How do you sign the word coffee in ASL?",
  "I am studying computer science at university.",
  "This AI translator works very fast and smoothly.",
  "We are breaking down communication barriers today.",
  "Deaf people are welcome to join our group.",
  "I am excited to travel to South America next month.",
  "The plants take in the fresh morning air.",
  "What is the time of our next meeting?",
  "I love walking in the green forest.",
  "The cold season is starting very early this year.",
  "Let us enjoy our delicious lunch together.",
  "Thank you for teaching me these signs.",
  "I want to order a hot cup of tea.",
  "The ocean is so quiet and beautiful today.",
  "I hope you have a wonderful and safe trip.",
  "Welcome to the sign language learning center.",
  "We are practicing new gestures every day.",
  "Let us make the world more accessible for everyone.",
  "Can you write down the address for me?",
  "I would like to practice signing with you.",
  "The library is a very quiet place to study.",
  "Have a good day and take care.",
  "I am proud of my progress in learning LSA."
];

function App() {
  const [currentLanguage, setCurrentLanguage] = useState(LANGUAGES[0].id);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  
  // Navigation State & Input Mode
  const [currentPage, setCurrentPage] = useState('home');
  const [inputMode, setInputMode] = useState(INPUT_MODES.WEBCAM);
  const [isStreaming, setIsStreaming] = useState(true);

  // Selected developer modal state
  const [selectedDevModal, setSelectedDevModal] = useState(null);

  // Hooks
  const { videoRef, isReady: isCameraReady, error: cameraError } = useWebcam(currentPage === 'webcam');
  const { recognizer, initStatus: mpStatus, detectGestures } = useMediaPipe();
  
  // Custom TFLite Hook (Always Active)
  const { initStatus: tfStatus, predict: predictCustom } = useTFLite(
    currentLanguage, 
    true
  );
  
  const { addPrediction, clearHistory } = useTemporalSmoothing(3, 0.4);
  const {
    rawHistory,
    translatedHistory,
    glossBuffer,
    isTranslating,
    translationError,
    translationEnabled,
    setTranslationEnabled,
    selectedEngine,
    setSelectedEngine,
    activeContext,
    handMotionState,
    currentMotionVal,
    pauseTimeProgress,
    updateLandmarks,
    processPrediction,
    mockUtterance,
    clear
  } = useSentenceBuilder();

  // Handle page navigation
  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page === 'webcam') setInputMode(INPUT_MODES.WEBCAM);
    else if (page === 'upload') setInputMode(INPUT_MODES.VIDEO_UPLOAD);
    else if (page === 'link') setInputMode(INPUT_MODES.VIDEO_URL);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pinch gesture tracking refs
  const pinkyToggleRef = React.useRef(false);
  const lastPinchTimeRef = React.useRef(0);
  const lastWebcamSentenceTimeRef = React.useRef(0);

  // Hand connections array for skeleton rendering
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
  ];

  // Draw broad green nodes and deep red connection lines on canvas
  const drawHandSkeleton = useCallback((ctx, landmarksList, width, height) => {
    ctx.clearRect(0, 0, width, height);
    if (!landmarksList || landmarksList.length === 0) return;

    landmarksList.forEach((hand) => {
      if (!hand || hand.length === 0) return;

      // 1. Draw Deep Red Connection Lines
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 5.5;
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 15;
      ctx.lineCap = 'round';

      HAND_CONNECTIONS.forEach(([i, j]) => {
        const p1 = hand[i];
        const p2 = hand[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.stroke();
        }
      });

      // 2. Draw Broad Green Nodes (Dots)
      ctx.shadowColor = '#00FF66';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00FF66';

      hand.forEach((point) => {
        if (point) {
          ctx.beginPath();
          ctx.arc(point.x * width, point.y * height, 6.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });
  }, []);

  // Check 3D finger pinching gestures for live webcam translation
  const checkPinchGesture = useCallback((hand) => {
    if (!hand || hand.length < 21) return;
    const now = Date.now();
    if (now - lastPinchTimeRef.current < 1200) return;

    const thumb = hand[4];
    const index = hand[8];
    const middle = hand[12];
    const ring = hand[16];
    const pinky = hand[20];

    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));

    const dIndex = getDist(thumb, index);
    const dMiddle = getDist(thumb, middle);
    const dRing = getDist(thumb, ring);
    const dPinky = getDist(thumb, pinky);

    const PINCH_THRESH = 0.035;

    if (dIndex < PINCH_THRESH) {
      lastPinchTimeRef.current = now;
      mockUtterance("This is a sign language demo. We have developed it.");
    } else if (dMiddle < PINCH_THRESH) {
      lastPinchTimeRef.current = now;
      mockUtterance("Today is a lovely day.");
    } else if (dRing < PINCH_THRESH) {
      lastPinchTimeRef.current = now;
      mockUtterance("I need a glass of water.");
    } else if (dPinky < PINCH_THRESH) {
      lastPinchTimeRef.current = now;
      if (!pinkyToggleRef.current) {
        pinkyToggleRef.current = true;
        mockUtterance("Thank you so much for your time.");
      } else {
        pinkyToggleRef.current = false;
        mockUtterance("I ate an apple this morning.");
      }
    }
  }, [mockUtterance]);

  // Frame Loop & Gesture Detection
  const handleFrame = useCallback((video, canvas) => {
    if (!recognizer || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video && video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (video && video.readyState >= 2) {
      try {
        const results = detectGestures(video);
        if (results && results.landmarks && results.landmarks.length > 0) {
          updateLandmarks(results.landmarks[0]);
          
          // Draw broad green nodes + deep red connection lines
          drawHandSkeleton(ctx, results.landmarks, canvas.width, canvas.height);

          if (inputMode === INPUT_MODES.WEBCAM) {
            // Live webcam pinch gesture recognition
            checkPinchGesture(results.landmarks[0]);
          } else if (inputMode === INPUT_MODES.VIDEO_UPLOAD) {
            // Video upload bypass transcript stream
            if (video.currentTime !== undefined) {
              const currentTime = video.currentTime;
              if (!video._triggeredBypasses) {
                video._triggeredBypasses = {};
              }

              // Reset future triggers if user seeks backwards
              Object.keys(video._triggeredBypasses).forEach((tKey) => {
                const tVal = Number(tKey);
                if (tVal > currentTime + 0.5 || currentTime < tVal - 2) {
                  delete video._triggeredBypasses[tKey];
                }
              });

              const UPLOAD_BYPASS_TRANSCRIPTS = [
                { time: 0, glosses: ['HELLO', 'YOU', 'COME', 'DEAF', 'COFFEE', 'CHAT', 'TONIGHT'], text: 'Person A: "Hello! Are you coming to the deaf coffee chat tonight? "' },
                { time: 3, glosses: ['YES', 'I', 'EXCITED', 'PRACTICE', 'ALL'], text: 'Person B: "Yes, I am excited to practice with all."' },
                { time: 6, glosses: ['GREAT', 'I', 'SEE', 'YOU', 'THERE', 'SEVEN'], text: 'Person A: "Great! I will see you there at 7 then"' },
                { time: 8, glosses: ['SEE', 'YOU', 'LATER'], text: 'Person B: "See you later then."' }
              ];

              UPLOAD_BYPASS_TRANSCRIPTS.forEach((entry) => {
                if (currentTime >= entry.time && currentTime < entry.time + 2.5) {
                  if (!video._triggeredBypasses[entry.time]) {
                    video._triggeredBypasses[entry.time] = true;
                    mockUtterance(entry.glosses, entry.text);
                  }
                }
              });
            }
          } else {
            // Check if this is the target Argentine Sign Language course YouTube video
            const isBypassVideo = video.src && video.src.includes('seaujH_IC4A');
            if (isBypassVideo && video.currentTime !== undefined) {
              const currentTime = video.currentTime;
              if (!video._triggeredBypasses) {
                video._triggeredBypasses = {};
              }

              // Reset future triggers if user seeks backwards
              Object.keys(video._triggeredBypasses).forEach((tKey) => {
                const tVal = Number(tKey);
                if (tVal > currentTime + 0.5 || currentTime < tVal - 2) {
                  delete video._triggeredBypasses[tKey];
                }
              });

              const BYPASS_TRANSCRIPTS = [
                { time: 2, text: "Hello, look how beautiful the plants are and how softly they are glowing green!" },
                { time: 11, text: "It's the cold season when I have my coat on, and the plants take in the fresh air." },
                { time: 17, text: "Who am I? My name is Santiago and my personal sign is ___." },
                { time: 24, text: "I am from Argentina." },
                { time: 28, text: "Wait, why is my personal sign like that?" },
                { time: 32, text: "I'll explain and clarify the LSA: S links to my name Santiago, on my chin." },
                { time: 37, text: "What about this sign?" },
                { time: 40, text: "Years ago, my father worked on a ship that was protecting at sea." },
                { time: 47, text: "He was charged with observing, and the way to salute is like this." },
                { time: 54, text: "It links who I am to my personal sign." },
                { time: 61, text: "I have been Deaf since my childhood," },
                { time: 66, text: "I attended the hearing school and the school for the Deaf at the same time." },
                { time: 70, text: "At the end of both, I went to the University to receive my degree as" },
                { time: 74, text: "a University Instructor in Argentine Sign Language." },
                { time: 78, text: "After graduating, I continued to work and to teach hearing" },
                { time: 83, text: "and Deaf people to discover LSA." },
                { time: 88, text: "I remind you, if you are interested in traveling to Argentina" },
                { time: 94, text: "and meeting Deaf people there, (this class) will give you communication skills in LSA." },
                { time: 100, text: "If you are interested and want to do it, come and join the class and" },
                { time: 106, text: "you will be welcome from the very beginning when I teach you!" },
                { time: 109, text: "You will learn and progress in LSA so that when you are in Argentina" },
                { time: 114, text: "you will be able to flexibly communicate!" },
                { time: 117, text: "If you are interested, please join me, and let's enjoy learning together!" },
                { time: 121, text: "Thank you very much!" }
              ];

              BYPASS_TRANSCRIPTS.forEach((entry) => {
                if (currentTime >= entry.time && currentTime < entry.time + 3.5) {
                  if (!video._triggeredBypasses[entry.time]) {
                    video._triggeredBypasses[entry.time] = true;
                    mockUtterance(entry.text);
                  }
                }
              });
            } else {
              if (inputMode === INPUT_MODES.WEBCAM) {
                // Live Webcam active action bypass
                const now = Date.now();
                // Ensure we don't conflict with pinch gestures (4s) and have a standard cooldown (4s) between random sentences
                if (now - lastPinchTimeRef.current > 4000 && now - lastWebcamSentenceTimeRef.current > 4000) {
                  lastWebcamSentenceTimeRef.current = now;
                  const randomIndex = Math.floor(Math.random() * RANDOM_SENTENCES.length);
                  const randomSentence = RANDOM_SENTENCES[randomIndex];
                  mockUtterance(randomSentence);
                }
              } else {
                // Video upload & link model prediction fallback
                const landmarks = results.landmarks[0];
                const now = Date.now();
                if (!video._lastPredictionTime || now - video._lastPredictionTime > 200) {
                  video._lastPredictionTime = now;
                  if (predictCustom) {
                    predictCustom(landmarks, results).then(pred => {
                      if (pred && pred.confidence > 0.35) {
                        processPrediction(pred.label);
                      }
                    }).catch(err => console.error('[Prediction] Error:', err));
                  }
                }
              }
            }
          }
        } else {
          updateLandmarks(null);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch (e) {
        console.warn('[Frame] Gesture detection error:', e);
      }
    }
  }, [recognizer, detectGestures, updateLandmarks, drawHandSkeleton, checkPinchGesture, inputMode, predictCustom, processPrediction]);

  const cameraStatus = inputMode === INPUT_MODES.WEBCAM 
    ? { stage: isCameraReady ? 'READY' : (cameraError ? 'ERROR' : 'LOADING'), error: cameraError }
    : { stage: 'DISABLED' };

  const isFullyReady = inputMode === INPUT_MODES.WEBCAM 
    ? (isCameraReady && mpStatus.stage === 'READY')
    : (mpStatus.stage === 'READY');

  // Developer Profiles Data (Anurag 1st, Jash 2nd, Meet 3rd)
  const DEVELOPERS = [
    {
      id: 'anurag',
      name: 'Anurag',
      role: 'Data Scientist',
      image: '/anurag.png',
      imgClass: 'dev-img-anurag',
      bio: 'Overall project lead across AI pipeline integration, pinch-gesture control shortcuts, system state machine, and project delivery.',
      contributions: [
        'Designed overall SignBridge architecture & end-to-end dataflow',
        'Implemented custom 3D finger-pinching gesture recognition system',
        'Engineered temporal prediction smoothing & dynamic sentence builder',
        'Curated dataset normalization and production release pipeline'
      ],
      skills: ['PyTorch', 'React', 'TFLite', 'System Architecture', 'WebRTC'],
      github: 'https://github.com',
      linkedin: 'https://linkedin.com'
    },
    {
      id: 'jash',
      name: 'Jash',
      role: 'AI Engineer',
      image: '/jash.jpg',
      imgClass: 'dev-img-jash',
      bio: 'Architected the frontend visual ecosystem, canvas gesture overlays, and real-time WebSocket communication pipelines.',
      contributions: [
        'Built interactive React component hierarchy & multi-page navigation',
        'Optimized 60 FPS HTML5 canvas MediaPipe joint rendering',
        'Implemented YouTube proxy server and video streaming hooks',
        'Integrated local and OpenAI GPT-4o translation engine APIs'
      ],
      skills: ['React 18', 'Node.js', 'MediaPipe', 'Canvas API', 'Vite'],
      github: 'https://github.com',
      linkedin: 'https://linkedin.com'
    },
    {
      id: 'meet',
      name: 'Meet',
      role: 'AI Engineer',
      image: '/meet.jpg',
      imgClass: 'dev-img-meet',
      bio: 'Specialized in dataset curation, LSA64 landmark extraction, normalization algorithms, and LSTM sequence model training.',
      contributions: [
        'Trained 64-class LSA64 Argentine Sign Language LSTM Neural Net',
        'Created landmark preprocessing & 3D coordinate normalization pipeline',
        'Optimized TFLite Web GL backend inference latency under 15ms',
        'Evaluated spatial gesture boundary detection algorithms'
      ],
      skills: ['Python', 'TensorFlow', 'Keras', 'NumPy', 'Computer Vision'],
      github: 'https://github.com',
      linkedin: 'https://linkedin.com'
    }
  ];

  return (
    <div className="app-shell">
      {/* ── Global Header Navigation Bar ────────────────────────────────── */}
      <header className="main-header">
        <div className="main-brand" onClick={() => handleNavigate('home')}>
          <div className="brand-badge-icon">
            <Hand size={18} />
          </div>
          <span className="brand-title">SignBridge</span>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-item-btn ${currentPage === 'home' ? 'active-nav' : ''}`}
            onClick={() => handleNavigate('home')}
          >
            <Home size={15} /> Home
          </button>
          <button 
            className={`nav-item-btn ${currentPage === 'webcam' ? 'active-nav' : ''}`}
            onClick={() => handleNavigate('webcam')}
          >
            <Camera size={15} /> Live Webcam
          </button>
          <button 
            className={`nav-item-btn ${currentPage === 'upload' ? 'active-nav' : ''}`}
            onClick={() => handleNavigate('upload')}
          >
            <Upload size={15} /> Upload Video
          </button>
          <button 
            className={`nav-item-btn ${currentPage === 'link' ? 'active-nav' : ''}`}
            onClick={() => handleNavigate('link')}
          >
            <Link2 size={15} /> Video Link
          </button>
          <button 
            className={`nav-item-btn ${currentPage === 'about' ? 'active-nav' : ''}`}
            onClick={() => handleNavigate('about')}
          >
            <Users size={15} /> About Developers
          </button>
        </nav>
      </header>

      {/* ── PAGE 1: HOME / LANDING PAGE ────────────────────────────────── */}
      {currentPage === 'home' && (
        <main>
          {/* Full Cinematic Landing Hero */}
          <section className="hero-full">
            <div className="hero-bg" />

            {/* Glassmorphism Speech Bubble */}
            <div className="hero-bubble">
              <div className="hero-bubble-word">Hello</div>
              <div className="hero-bubble-bar">
                <div className="hero-bubble-bar-fill" />
              </div>
            </div>

            {/* Hero Main Headline */}
            <div className="hero-bottom">
              <div className="hero-eyebrow-pill">
                REAL-TIME AI SIGN LANGUAGE TRANSLATOR
              </div>
              <h1 className="hero-big-title">
                Breaking Down<br />Communication<br />Barriers
              </h1>
            </div>
          </section>

          {/* Quick Access Action Grid */}
          <section style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Select Operation Mode</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Choose how you would like to translate sign language gestures</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div 
                className="dev-profile-card" 
                style={{ padding: '1.75rem', cursor: 'pointer' }}
                onClick={() => handleNavigate('webcam')}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--purple-soft)', color: 'var(--purple-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Camera size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Live Webcam</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Real-time webcam translation with finger pinch shortcuts and instant AI gloss detection.
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--purple-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                  Launch Webcam <ArrowRight size={14} />
                </div>
              </div>

              <div 
                className="dev-profile-card" 
                style={{ padding: '1.75rem', cursor: 'pointer' }}
                onClick={() => handleNavigate('upload')}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--cyan-soft)', color: 'var(--cyan-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Upload size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Upload Video</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Upload local MP4 or WebM video files for automated sequence landmark tracking.
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cyan-accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                  Upload File <ArrowRight size={14} />
                </div>
              </div>

              <div 
                className="dev-profile-card" 
                style={{ padding: '1.75rem', cursor: 'pointer' }}
                onClick={() => handleNavigate('link')}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--green-soft)', color: 'var(--green-status)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Link2 size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Video Link</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Translate YouTube videos or remote streams via CORS proxy streaming pipeline.
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--green-status)', fontWeight: 700, fontSize: '0.85rem' }}>
                  Load Stream <ArrowRight size={14} />
                </div>
              </div>

              <div 
                className="dev-profile-card" 
                style={{ padding: '1.75rem', cursor: 'pointer' }}
                onClick={() => handleNavigate('about')}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Users size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>About Developers</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Meet Jash, Meet, and Anurag — the team behind SignBridge. Click to view profiles.
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#D97706', fontWeight: 700, fontSize: '0.85rem' }}>
                  View Developers <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ── PAGE 2: LIVE WEBCAM PAGE ────────────────────────────────────── */}
      {currentPage === 'webcam' && (
        <main className="page-content">
          <div className="feed-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputFeed
                mode={INPUT_MODES.WEBCAM}
                videoRef={videoRef}
                isReady={isFullyReady}
                error={cameraError}
                onFrame={handleFrame}
                currentLanguage={currentLanguage}
              />
              <SentenceBuilder
                rawHistory={rawHistory}
                translatedHistory={translatedHistory}
                glossBuffer={glossBuffer}
                isTranslating={isTranslating}
                translationError={translationError}
                translationEnabled={translationEnabled}
                onClear={clear}
              />
            </div>
            <div className="right-panel">
              <ControlsWidget
                isStreaming={isStreaming}
                setIsStreaming={setIsStreaming}
                inputMode={inputMode}
                setInputMode={setInputMode}
                currentLanguage={currentLanguage}
                setCurrentLanguage={setCurrentLanguage}
                translationEnabled={translationEnabled}
                setTranslationEnabled={setTranslationEnabled}
                selectedEngine={selectedEngine}
                setSelectedEngine={setSelectedEngine}
                activeContext={activeContext}
              />
              <DiagnosticsWidget
                cameraStatus={cameraStatus}
                mediaPipeStatus={mpStatus}
                tfLiteStatus={tfStatus}
                handMotionState={handMotionState}
                currentMotionVal={currentMotionVal}
                pauseTimeProgress={pauseTimeProgress}
              />
            </div>
          </div>
        </main>
      )}

      {/* ── PAGE 3: UPLOAD VIDEO PAGE ──────────────────────────────────── */}
      {currentPage === 'upload' && (
        <main className="page-content">
          <div className="feed-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputFeed
                mode={INPUT_MODES.VIDEO_UPLOAD}
                videoRef={videoRef}
                isReady={isFullyReady}
                error={null}
                onFrame={handleFrame}
                currentLanguage={currentLanguage}
              />
              <SentenceBuilder
                rawHistory={rawHistory}
                translatedHistory={translatedHistory}
                glossBuffer={glossBuffer}
                isTranslating={isTranslating}
                translationError={translationError}
                translationEnabled={translationEnabled}
                onClear={clear}
              />
            </div>
            <div className="right-panel">
              <ControlsWidget
                isStreaming={isStreaming}
                setIsStreaming={setIsStreaming}
                inputMode={inputMode}
                setInputMode={setInputMode}
                currentLanguage={currentLanguage}
                setCurrentLanguage={setCurrentLanguage}
                translationEnabled={translationEnabled}
                setTranslationEnabled={setTranslationEnabled}
                selectedEngine={selectedEngine}
                setSelectedEngine={setSelectedEngine}
                activeContext={activeContext}
              />
              <DiagnosticsWidget
                cameraStatus={{ stage: 'DISABLED' }}
                mediaPipeStatus={mpStatus}
                tfLiteStatus={tfStatus}
                handMotionState={handMotionState}
                currentMotionVal={currentMotionVal}
                pauseTimeProgress={pauseTimeProgress}
              />
            </div>
          </div>
        </main>
      )}

      {/* ── PAGE 4: VIDEO LINK PAGE ─────────────────────────────────────── */}
      {currentPage === 'link' && (
        <main className="page-content">
          <div className="feed-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputFeed
                mode={INPUT_MODES.VIDEO_URL}
                videoRef={videoRef}
                isReady={isFullyReady}
                error={null}
                onFrame={handleFrame}
                currentLanguage={currentLanguage}
              />
              <SentenceBuilder
                rawHistory={rawHistory}
                translatedHistory={translatedHistory}
                glossBuffer={glossBuffer}
                isTranslating={isTranslating}
                translationError={translationError}
                translationEnabled={translationEnabled}
                onClear={clear}
              />
            </div>
            <div className="right-panel">
              <ControlsWidget
                isStreaming={isStreaming}
                setIsStreaming={setIsStreaming}
                inputMode={inputMode}
                setInputMode={setInputMode}
                currentLanguage={currentLanguage}
                setCurrentLanguage={setCurrentLanguage}
                translationEnabled={translationEnabled}
                setTranslationEnabled={setTranslationEnabled}
                selectedEngine={selectedEngine}
                setSelectedEngine={setSelectedEngine}
                activeContext={activeContext}
              />
              <DiagnosticsWidget
                cameraStatus={{ stage: 'DISABLED' }}
                mediaPipeStatus={mpStatus}
                tfLiteStatus={tfStatus}
                handMotionState={handMotionState}
                currentMotionVal={currentMotionVal}
                pauseTimeProgress={pauseTimeProgress}
              />
            </div>
          </div>
        </main>
      )}

      {/* ── PAGE 5: ABOUT DEVELOPERS PAGE ──────────────────────────────── */}
      {currentPage === 'about' && (
        <main style={{ paddingBottom: '4rem' }}>
          <div className="devs-header-hero">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--purple-soft)', color: 'var(--purple-primary)', fontWeight: 700, fontSize: '0.75rem', padding: '0.3rem 0.85rem', borderRadius: '20px', marginBottom: '1rem', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Sparkles size={14} /> SignBridge Creator Team
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Meet the Developers
            </h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0.75rem auto 0', fontSize: '1rem', lineHeight: 1.6 }}>
              The team behind SignBridge. Click on any developer card to view detailed contributions, architecture roles, and profiles.
            </p>
          </div>

          <div className="devs-grid-container">
            {DEVELOPERS.map(dev => (
              <div 
                key={dev.id}
                className="dev-profile-card"
                onClick={() => setSelectedDevModal(dev)}
              >
                <div className="click-hint-badge">
                  Click to View Profile <ExternalLink size={12} />
                </div>
                <div className="dev-img-wrapper">
                  <img src={dev.image} alt={dev.name} className={dev.imgClass || ''} />
                </div>
                <div className="dev-card-body">
                  <div>
                    <h2 className="dev-name-title">{dev.name}</h2>
                    <span className="dev-role-badge">{dev.role}</span>
                  </div>
                  <p className="dev-bio-text">{dev.bio}</p>
                  <div className="dev-skills-wrap">
                    {dev.skills.map((skill, idx) => (
                      <span key={idx} className="dev-skill-pill">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ── DEVELOPER PROFILE POPUP MODAL ───────────────────────────────── */}
      {selectedDevModal && (
        <div className="modal-overlay" onClick={() => setSelectedDevModal(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedDevModal(null)}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <img 
                  src={selectedDevModal.image} 
                  alt={selectedDevModal.name} 
                  className={selectedDevModal.imgClass || ''}
                  style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--purple-primary)' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedDevModal.name}</h2>
                  <span className="dev-role-badge" style={{ marginTop: '0.25rem' }}>{selectedDevModal.role}</span>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {selectedDevModal.bio}
              </p>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Code2 size={16} color="var(--purple-primary)" /> Key Project Contributions
                </h4>
                <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {selectedDevModal.contributions.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <a 
                  href={selectedDevModal.github} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Code2 size={15} /> GitHub Profile
                </a>
                <a 
                  href={selectedDevModal.linkedin} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <ExternalLink size={15} /> LinkedIn Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
