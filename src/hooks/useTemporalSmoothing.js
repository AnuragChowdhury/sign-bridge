import { useRef, useCallback } from 'react';

export function useTemporalSmoothing(historySize = 5, minConsistency = 0.6) {
  const historyRef = useRef([]);

  const addPrediction = useCallback((prediction) => {
    if (!prediction || !prediction.label) return null;

    historyRef.current.push(prediction);
    if (historyRef.current.length > historySize) {
      historyRef.current.shift();
    }

    // Count occurrences
    const counts = {};
    for (const p of historyRef.current) {
      counts[p.label] = (counts[p.label] || 0) + 1;
    }

    // Find most frequent
    let maxLabel = null;
    let maxCount = 0;
    for (const [label, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxLabel = label;
      }
    }

    const consistency = maxCount / historyRef.current.length;
    
    if (consistency >= minConsistency) {
      // Find the average confidence for the dominant label
      let totalConf = 0;
      let count = 0;
      for (const p of historyRef.current) {
        if (p.label === maxLabel) {
          totalConf += p.confidence;
          count++;
        }
      }
      return {
        label: maxLabel,
        confidence: totalConf / count
      };
    }

    return null;
  }, [historySize, minConsistency]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { addPrediction, clearHistory };
}
