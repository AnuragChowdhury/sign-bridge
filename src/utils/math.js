/**
 * Normalizes 3D hand landmarks according to the exact same logic
 * used in the Python training script.
 * @param {Array<{x: number, y: number, z: number}>} landmarks 
 * @returns {Float32Array} 63-element array of normalized coordinates
 */
export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) {
    throw new Error('Expected exactly 21 landmarks');
  }

  // Use wrist (landmark 0) as the origin
  const wristX = landmarks[0].x;
  const wristY = landmarks[0].y;
  const wristZ = landmarks[0].z;

  const centered = landmarks.map(lm => ({
    x: lm.x - wristX,
    y: lm.y - wristY,
    z: lm.z - wristZ
  }));

  let maxDist = 0.0;
  for (const lm of centered) {
    const dist = lm.x * lm.x + lm.y * lm.y + lm.z * lm.z;
    if (dist > maxDist) maxDist = dist;
  }

  if (maxDist < 1e-6) maxDist = 1.0;

  const result = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    result[i * 3] = centered[i].x / maxDist;
    result[i * 3 + 1] = centered[i].y / maxDist;
    result[i * 3 + 2] = centered[i].z / maxDist;
  }

  return result;
}

/**
 * Normalizes an entire 30-frame sequence to preserve motion trajectory.
 * Anchors the sequence to the wrist position of the first frame.
 * @param {Array<Array<{x: number, y: number, z: number}>>} sequence 
 * @returns {Float32Array} Flattened array of [frames * 63]
 */
export function normalizeSequence(sequence) {
  if (!sequence || sequence.length === 0) return new Float32Array(0);
  
  const frames = sequence.length;
  const result = new Float32Array(frames * 63);
  
  // Anchor wrist is from the FIRST frame
  const anchorWrist = sequence[0][0];
  
  let maxDistSq = 0.0;
  const centeredSequence = [];
  
  for (let f = 0; f < frames; f++) {
    const landmarks = sequence[f];
    const centeredFrame = [];
    
    for (let i = 0; i < 21; i++) {
      const cx = landmarks[i].x - anchorWrist.x;
      const cy = landmarks[i].y - anchorWrist.y;
      const cz = landmarks[i].z - anchorWrist.z;
      
      centeredFrame.push({x: cx, y: cy, z: cz});
      
      const distSq = cx * cx + cy * cy + cz * cz;
      if (distSq > maxDistSq) maxDistSq = distSq;
    }
    centeredSequence.push(centeredFrame);
  }
  
  let maxDist = Math.sqrt(maxDistSq);
  if (maxDist < 1e-6) maxDist = 1.0;
  
  for (let f = 0; f < frames; f++) {
    const centeredFrame = centeredSequence[f];
    for (let i = 0; i < 21; i++) {
      result[f * 63 + i * 3]     = centeredFrame[i].x / maxDist;
      result[f * 63 + i * 3 + 1] = centeredFrame[i].y / maxDist;
      result[f * 63 + i * 3 + 2] = centeredFrame[i].z / maxDist;
    }
  }
  
  return result;
}
