export const MODEL_ENGINES = {
  AUTO: 'AUTO',
  MEDIAPIPE: 'MEDIAPIPE',
  HF_RESNET: 'HF_RESNET',
  CUSTOM_TFLITE: 'CUSTOM_TFLITE'
};

export const INPUT_MODES = {
  WEBCAM: 'WEBCAM',
  VIDEO_URL: 'VIDEO_URL',
  VIDEO_UPLOAD: 'VIDEO_UPLOAD'
};

export const LANGUAGES = [
  { id: 'lsa64', name: 'LSA64 Argentine Sign Language (Continuous Words)' }
];

export const SPECIAL_GESTURES = {
  SPACE: 'SPACE',
  DELETE: 'DELETE',
  NOTHING: 'NOTHING'
};

export const UI_COLORS = {
  primary: '#8A2BE2', // Blue Violet
  secondary: '#00FA9A', // Medium Spring Green
  background: '#0F172A', // Slate 900
  surface: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity for glassmorphism
  text: '#F8FAFC', // Slate 50
  textMuted: '#94A3B8' // Slate 400
};
