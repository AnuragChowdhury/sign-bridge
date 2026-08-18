import { useState, useEffect, useRef } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

export function useMediaPipe() {
  const [recognizer, setRecognizer] = useState(null);
  const [initStatus, setInitStatus] = useState({ stage: 'WAITING', error: null });
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    async function initGestureRecognizer() {
      try {
        setInitStatus({ stage: 'DOWNLOADING_WASM', error: null });
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        setInitStatus({ stage: 'DOWNLOADING_MODEL', error: null });
        // The GestureRecognizer includes HandLandmarker logic PLUS a pretrained ASL model
        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        setRecognizer(gestureRecognizer);
        setInitStatus({ stage: 'READY', error: null });
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setInitStatus({ stage: 'ERROR', error: error.message || 'Failed to load MediaPipe' });
      }
    }

    initGestureRecognizer();

    return () => {
      if (recognizer) recognizer.close();
    };
  }, []);

  const detectGestures = (videoElement) => {
    if (!recognizer || !videoElement) return null;

    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== videoElement.currentTime) {
      lastVideoTimeRef.current = videoElement.currentTime;
      return recognizer.recognizeForVideo(videoElement, startTimeMs);
    }
    return null;
  };

  return { recognizer, initStatus, detectGestures };
}
