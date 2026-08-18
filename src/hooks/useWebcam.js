import { useEffect, useRef, useState } from 'react';

export function useWebcam(isActive = true) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isActive) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setIsReady(false);
      return;
    }

    let activeStream = null;
    let isMounted = true;
    let intervalId = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);
        setError(null);

        const attachStream = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().catch(e => console.warn("Webcam play error:", e));
                setIsReady(true);
              }
            };
            return true;
          }
          return false;
        };

        if (!attachStream()) {
          // If video element is not rendered yet, poll until it mounts
          intervalId = setInterval(() => {
            if (attachStream()) {
              clearInterval(intervalId);
            }
          }, 100);
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError(err.message || 'Unable to access webcam');
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  return { videoRef, stream, isReady, error };
}
