import { useState, useCallback, useRef, useEffect } from 'react';
import { SPECIAL_GESTURES } from '../constants';
import { translationEngines } from '../utils/translationEngine';

export function useSentenceBuilder(cooldownMs = 1500) {
  // Histories of completed utterances
  const [rawHistory, setRawHistory] = useState([]);
  const [translatedHistory, setTranslatedHistory] = useState([]);
  
  // Active buffer for the current utterance
  const [glossBuffer, setGlossBuffer] = useState([]);
  
  // Settings
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [selectedEngine, setSelectedEngine] = useState('openai');

  // Translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  // Diagnostics and motion tracking
  const [handMotionState, setHandMotionState] = useState('No Hand');
  const [currentMotionVal, setCurrentMotionVal] = useState(0);
  const [pauseTimeProgress, setPauseTimeProgress] = useState(0);

  // Refs for tracking across render cycles
  const glossBufferRef = useRef([]);
  const lastLandmarksRef = useRef(null);
  const lastActiveTimeRef = useRef(Date.now());
  const utteranceStartTimeRef = useRef(null);
  const isTranslatingRef = useRef(false);
  const isLastSpellingRef = useRef(false);

  // Last translation context for history strategy
  const lastTranslatedSentenceRef = useRef('');
  const lastTranslationTimeRef = useRef(0);
  const activeTimeoutsRef = useRef([]);

  // Cooldown tracking for predictions
  const lastAddMsRef = useRef(0);
  const lastCharRef = useRef(null);

  // Constants for boundaries
  const motionThreshold = 0.004;
  const pauseDurationMs = 1500;
  const maxGlossesBuffered = 10;
  const maxWaitTimeMs = 12000;
  const inactivityLimitMs = 60000;

  // Sync ref with state
  useEffect(() => {
    isTranslatingRef.current = isTranslating;
  }, [isTranslating]);

  // Translate a finished sequence
  const translateUtterance = useCallback(async (glossesToTranslate) => {
    if (glossesToTranslate.length === 0) return;

    const glossesStr = glossesToTranslate.join(' ');
    setRawHistory(prev => [...prev, glossesStr]);

    if (!translationEnabled) {
      setTranslatedHistory(prev => [...prev, glossesStr]);
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);

    const now = Date.now();
    const context = (now - lastTranslationTimeRef.current < inactivityLimitMs)
      ? lastTranslatedSentenceRef.current
      : '';

    try {
      const engine = translationEngines[selectedEngine];
      const translation = await engine.translate(glossesStr, context);
      
      setTranslatedHistory(prev => [...prev, translation]);
      lastTranslatedSentenceRef.current = translation;
      lastTranslationTimeRef.current = Date.now();
    } catch (err) {
      console.error("Translation failed:", err);
      // Fallback to raw gloss
      const fallbackStr = `[RAW] ${glossesStr}`;
      setTranslatedHistory(prev => [...prev, fallbackStr]);
      setTranslationError("Translation failed. Displaying raw glosses.");
      
      // Clear error message after 4 seconds
      setTimeout(() => {
        setTranslationError(null);
      }, 4000);
    } finally {
      setIsTranslating(false);
    }
  }, [translationEnabled, selectedEngine, inactivityLimitMs]);

  const lastStateUpdateRef = useRef(0);

  // Main frame updater for motion / pause / fallback boundary checks
  const updateLandmarks = useCallback((landmarks) => {
    const now = Date.now();

    // 1. Calculate movement
    if (landmarks && landmarks.length === 21) {
      if (lastLandmarksRef.current) {
        let totalDist = 0;
        const len = 21;
        for (let i = 0; i < len; i++) {
          const dx = landmarks[i].x - lastLandmarksRef.current[i].x;
          const dy = landmarks[i].y - lastLandmarksRef.current[i].y;
          const dz = (landmarks[i].z || 0) - (lastLandmarksRef.current[i].z || 0);
          totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        const movement = totalDist / len;

        // Throttle state updates to ~6 FPS (every 160ms) to prevent 60 FPS React re-render flicker
        if (now - lastStateUpdateRef.current > 160) {
          lastStateUpdateRef.current = now;
          setCurrentMotionVal(movement);
          setHandMotionState(movement > motionThreshold ? 'Moving' : 'Static');
        }

        if (movement > motionThreshold) {
          lastActiveTimeRef.current = now;
        }
      } else {
        setHandMotionState('Moving');
        lastActiveTimeRef.current = now;
        setCurrentMotionVal(0);
      }
      lastLandmarksRef.current = landmarks;
    } else {
      if (lastLandmarksRef.current !== null) {
        setHandMotionState('No Hand');
        lastLandmarksRef.current = null;
        setCurrentMotionVal(0);
      }
    }

    // 2. Check boundaries if we have glosses in buffer and are not translating
    const bufferCount = glossBufferRef.current.length;
    if (bufferCount > 0 && !isTranslatingRef.current) {
      const timeSinceLastActive = now - lastActiveTimeRef.current;
      const timeSinceStart = utteranceStartTimeRef.current ? (now - utteranceStartTimeRef.current) : 0;

      // Update pause progress percentage
      if (handMotionState === 'Static' || handMotionState === 'No Hand') {
        setPauseTimeProgress(Math.min(100, (timeSinceLastActive / pauseDurationMs) * 100));
      } else {
        setPauseTimeProgress(0);
      }

      // Check conditions
      const isPaused = timeSinceLastActive >= pauseDurationMs;
      const isBufferFull = bufferCount >= maxGlossesBuffered;
      const isTimeout = timeSinceStart >= maxWaitTimeMs;

      if (isPaused || isBufferFull || isTimeout) {
        // Trigger boundary!
        const finalGlosses = [...glossBufferRef.current];
        
        // Flush buffer
        glossBufferRef.current = [];
        setGlossBuffer([]);
        utteranceStartTimeRef.current = null;
        isLastSpellingRef.current = false;
        setPauseTimeProgress(0);

        translateUtterance(finalGlosses);
      }
    } else {
      setPauseTimeProgress(0);
    }
  }, [handMotionState, translateUtterance, pauseDurationMs, maxGlossesBuffered, maxWaitTimeMs]);

  // Process incoming character predictions
  const processPrediction = useCallback((label) => {
    if (!label || label === SPECIAL_GESTURES.NOTHING) return;

    const now = performance.now();
    
    // Cooldown logic to prevent duplicates
    if (label === lastCharRef.current && (now - lastAddMsRef.current) < cooldownMs) {
      return;
    }

    lastCharRef.current = label;
    lastAddMsRef.current = now;

    // Reset last active time so newly added prediction updates activity
    lastActiveTimeRef.current = Date.now();

    if (glossBufferRef.current.length === 0) {
      utteranceStartTimeRef.current = Date.now();
    }

    if (label === SPECIAL_GESTURES.DELETE) {
      if (glossBufferRef.current.length > 0) {
        const lastItem = glossBufferRef.current[glossBufferRef.current.length - 1];
        if (lastItem.length > 1 && isLastSpellingRef.current) {
          // Remove last character of spelling
          glossBufferRef.current[glossBufferRef.current.length - 1] = lastItem.slice(0, -1);
          if (glossBufferRef.current[glossBufferRef.current.length - 1].length === 0) {
            glossBufferRef.current.pop();
            isLastSpellingRef.current = false;
          }
        } else {
          // Remove entire last item
          glossBufferRef.current.pop();
          isLastSpellingRef.current = false;
        }
        setGlossBuffer([...glossBufferRef.current]);
      }
    } else if (label === SPECIAL_GESTURES.SPACE) {
      // Spaces start a new spelling word
      isLastSpellingRef.current = false;
    } else {
      // Standard predicted gloss or finger-spelled character
      if (label.length === 1) {
        const upper = label.toUpperCase();
        if (isLastSpellingRef.current && glossBufferRef.current.length > 0) {
          // Append letter to current spelling word
          glossBufferRef.current[glossBufferRef.current.length - 1] += upper;
        } else {
          // Start spelling word
          glossBufferRef.current.push(upper);
          isLastSpellingRef.current = true;
        }
      } else {
        // Multi-character gloss word
        const formatted = label.replace('_', ' ').toUpperCase();
        glossBufferRef.current.push(formatted);
        isLastSpellingRef.current = false;
      }
      setGlossBuffer([...glossBufferRef.current]);
    }
  }, [cooldownMs]);

  // Clear all states
  const clear = useCallback(() => {
    activeTimeoutsRef.current.forEach(t => clearTimeout(t));
    activeTimeoutsRef.current = [];
    glossBufferRef.current = [];
    setGlossBuffer([]);
    setRawHistory([]);
    setTranslatedHistory([]);
    lastTranslatedSentenceRef.current = '';
    lastTranslationTimeRef.current = 0;
    isLastSpellingRef.current = false;
    utteranceStartTimeRef.current = null;
    setHandMotionState('No Hand');
    setCurrentMotionVal(0);
    setPauseTimeProgress(0);
    setTranslationError(null);
    lastCharRef.current = null;
    lastAddMsRef.current = 0;
  }, []);

  // Expose context info for the UI
  const isContextActive = Date.now() - lastTranslationTimeRef.current < inactivityLimitMs && lastTranslatedSentenceRef.current !== '';
  const activeContext = isContextActive ? lastTranslatedSentenceRef.current : null;

  return {
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
    mockUtterance: (input1, input2) => {
      // Clear existing timeouts
      activeTimeoutsRef.current.forEach(t => clearTimeout(t));
      activeTimeoutsRef.current = [];
      setGlossBuffer([]);

      let glosses = [];
      let translation = '';

      if (Array.isArray(input1)) {
        glosses = input1;
        translation = input2 || input1.join(' ');
      } else if (typeof input1 === 'string') {
        translation = input1;
        // Convert sentence string to uppercase word glosses (limit to 5 words max for cleaner streaming)
        glosses = input1.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toUpperCase().split(/\s+/).slice(0, 5);
      } else {
        return;
      }

      // Stream the gloss tags word-by-word to make it look like active ML predictions
      glosses.forEach((gloss, index) => {
        const t = setTimeout(() => {
          setGlossBuffer(prev => [...prev, gloss]);
        }, index * 260); // 260ms per word
        activeTimeoutsRef.current.push(t);
      });

      // Commit full sentence translation once the gloss stream is finished
      const totalDuration = glosses.length * 260;
      const tCommit = setTimeout(() => {
        setGlossBuffer([]);
        setRawHistory(prev => [...prev, glosses.join(' ')]);
        setTranslatedHistory(prev => [...prev, translation]);
      }, totalDuration + 250);
      activeTimeoutsRef.current.push(tCommit);
    },
    clear
  };
}
