import { useState, useEffect, useRef } from 'react';
import { normalizeSequence, normalizeLandmarks } from '../utils/math';

// TFLite is loaded via CDN and available globally as window.tflite
// TF is available globally as window.tf

if (window.tflite) {
  window.tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.9/dist/');
}

export function useTFLite(languageId, isEnabled = true) {
  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState({});
  const [initStatus, setInitStatus] = useState({ stage: 'WAITING', error: null });
  const sequenceBuffer = useRef([]);

  useEffect(() => {
    let isMounted = true;

    async function loadModelAndLabels() {
      if (!isEnabled) {
        setInitStatus({ stage: 'DISABLED', error: null });
        return;
      }

      setInitStatus({ stage: 'LOADING_LABELS', error: null });
      try {
        const labelsResponse = await fetch(`/models/${languageId}/labels.json`);
        if (!labelsResponse.ok) throw new Error('Labels file not found');
        
        const labelsData = await labelsResponse.json();
        const indexToLabel = {};

        if (Array.isArray(labelsData)) {
          labelsData.forEach((label, idx) => {
            indexToLabel[idx] = label;
          });
        } else {
          Object.entries(labelsData).forEach(([key, val]) => {
            if (!isNaN(Number(key))) {
              indexToLabel[Number(key)] = val;
            } else {
              indexToLabel[Number(val)] = key;
            }
          });
        }

        setInitStatus({ stage: 'LOADING_TFLITE', error: null });
        const tfliteModel = await window.tflite.loadTFLiteModel(`/models/${languageId}/model.tflite`);
        
        if (isMounted) {
          setLabels(indexToLabel);
          setModel(tfliteModel);
          setInitStatus({ stage: 'READY', error: null });
          sequenceBuffer.current = [];
        }
      } catch (err) {
        console.error(`Failed to load model for ${languageId}:`, err);
        if (isMounted) {
          setInitStatus({ stage: 'ERROR', error: err.message || 'Failed to load TFLite model' });
        }
      }
    }

    loadModelAndLabels();

    return () => {
      isMounted = false;
    };
  }, [languageId, isEnabled]);

  const predict = (landmarks, mpResults = null) => {
    if (!model || initStatus.stage !== 'READY' || !isEnabled) {
      sequenceBuffer.current = [];
      return null;
    }

    try {
      const inputShape = model.inputs && model.inputs[0] ? model.inputs[0].shape : [1, 63];
      const isSequence = inputShape.length === 3;
      const numFeatures = inputShape[inputShape.length - 1] || 63;

      if (isSequence) {
        let frameFeatures = landmarks;

        if (numFeatures === 144) {
          // Assemble 144 features: 6 pose landmarks + 21 left hand + 21 right hand
          const features = new Float32Array(144);
          
          // Mock static pose shoulders and elbows (constant resting positions)
          features[0] = 0.58; features[1] = 0.49; features[2] = -0.1; // Left shoulder
          features[3] = 0.38; features[4] = 0.50; features[5] = -0.1; // Right shoulder
          features[6] = 0.64; features[7] = 0.75; features[8] = -0.01; // Left elbow
          features[9] = 0.36; features[10] = 0.78; features[11] = -0.34; // Right elbow

          let leftWrist = [0.65, 0.95, -0.2];
          let rightWrist = [0.35, 0.95, -0.2];

          if (mpResults && mpResults.landmarks) {
            mpResults.landmarks.forEach((handLms, idx) => {
              const handedness = mpResults.handedness && mpResults.handedness[idx] && mpResults.handedness[idx][0]
                ? mpResults.handedness[idx][0].categoryName
                : 'Right';

              const isLeft = handedness === 'Left';
              const offset = isLeft ? 18 : 81; // indices 6-26 vs 27-47

              for (let i = 0; i < 21; i++) {
                const lm = handLms[i];
                if (lm) {
                  features[offset + i * 3] = lm.x;
                  features[offset + i * 3 + 1] = lm.y;
                  features[offset + i * 3 + 2] = lm.z;
                }
              }

              if (isLeft) {
                leftWrist = [handLms[0].x, handLms[0].y, handLms[0].z];
              } else {
                rightWrist = [handLms[0].x, handLms[0].y, handLms[0].z];
              }
            });
          }

          // Link actual wrists into pose landmarks
          features[12] = leftWrist[0]; features[13] = leftWrist[1]; features[14] = leftWrist[2];
          features[15] = rightWrist[0]; features[16] = rightWrist[1]; features[17] = rightWrist[2];

          frameFeatures = Array.from(features);
        }

        if (!frameFeatures) {
          sequenceBuffer.current = [];
          return null;
        }

        // Buffer frame features
        sequenceBuffer.current.push(frameFeatures);
        if (sequenceBuffer.current.length > 30) {
          sequenceBuffer.current.shift();
        }

        if (sequenceBuffer.current.length >= 10) {
          let framesToUse = [...sequenceBuffer.current];
          while (framesToUse.length < 30) {
            framesToUse.push(framesToUse[framesToUse.length - 1]);
          }

          let flatSequence;
          if (numFeatures === 144) {
            // LSA64 (144 features) was trained using the same normalizeSequence logic,
            // which anchors the sequence to index 0 of the first frame (the Left Shoulder!).
            const framesAsLandmarks = framesToUse.map(frame => {
              const lms = [];
              for (let i = 0; i < 48; i++) {
                lms.push({
                  x: frame[i * 3],
                  y: frame[i * 3 + 1],
                  z: frame[i * 3 + 2]
                });
              }
              return lms;
            });
            
            const anchor = framesAsLandmarks[0][0];
            let maxDistSq = 0.0;
            const centered = [];
            
            for (let f = 0; f < 30; f++) {
              const lms = framesAsLandmarks[f];
              const centeredFrame = [];
              for (let i = 0; i < 48; i++) {
                const cx = lms[i].x - anchor.x;
                const cy = lms[i].y - anchor.y;
                const cz = lms[i].z - anchor.z;
                centeredFrame.push({x: cx, y: cy, z: cz});
                const distSq = cx * cx + cy * cy + cz * cz;
                if (distSq > maxDistSq) maxDistSq = distSq;
              }
              centered.push(centeredFrame);
            }
            
            let maxDist = Math.sqrt(maxDistSq);
            if (maxDist < 1e-6) maxDist = 1.0;
            
            const result = new Float32Array(30 * 144);
            for (let f = 0; f < 30; f++) {
              const frame = centered[f];
              for (let i = 0; i < 48; i++) {
                result[f * 144 + i * 3]     = frame[i].x / maxDist;
                result[f * 144 + i * 3 + 1] = frame[i].y / maxDist;
                result[f * 144 + i * 3 + 2] = frame[i].z / maxDist;
              }
            }
            flatSequence = result;
          } else {
            flatSequence = normalizeSequence(framesToUse);
          }

          const inputTensor = window.tf.tensor(flatSequence, [1, 30, numFeatures]);
          const outputTensor = model.predict(inputTensor);
          const probabilities = outputTensor.dataSync();
          inputTensor.dispose();

          let maxProb = 0;
          let maxIndex = 0;
          for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
              maxProb = probabilities[i];
              maxIndex = i;
            }
          }
          outputTensor.dispose();

          const predictedLabel = labels[maxIndex] || 'UNKNOWN';
          return { label: predictedLabel, confidence: maxProb };
        }
      } else {
        if (!landmarks) return null;
        const flatFrame = normalizeLandmarks(landmarks);
        const inputTensor = window.tf.tensor(flatFrame, [1, 63]);
        const outputTensor = model.predict(inputTensor);
        const probabilities = outputTensor.dataSync();
        inputTensor.dispose();

        let maxProb = 0;
        let maxIndex = 0;
        for (let i = 0; i < probabilities.length; i++) {
          if (probabilities[i] > maxProb) {
            maxProb = probabilities[i];
            maxIndex = i;
          }
        }
        outputTensor.dispose();

        const predictedLabel = labels[maxIndex] || 'UNKNOWN';
        return { label: predictedLabel, confidence: maxProb };
      }

      return null;
    } catch (err) {
      console.error("Prediction error in TFLite model:", err);
      return null;
    }
  };

  return { initStatus, predict };
}
