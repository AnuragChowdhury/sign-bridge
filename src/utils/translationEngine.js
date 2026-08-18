export const translationEngines = {
  openai: {
    id: 'openai',
    name: 'OpenAI Translation Engine',
    translate: async (glosses, lastSentence) => {
      let attempts = 0;
      const maxRetries = 2;
      const delay = (ms) => new Promise(res => setTimeout(res, ms));

      while (attempts <= maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const response = await fetch('http://localhost:3001/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              glosses,
              history: lastSentence ? [lastSentence] : []
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${response.status}`);
          }

          const data = await response.json();
          return data.translation;
        } catch (error) {
          attempts++;
          console.warn(`Translation attempt ${attempts} failed:`, error.message);
          
          if (attempts > maxRetries) {
            throw error; // Propagate error on final failure
          }
          
          // Wait before retrying (linear backoff)
          await delay(1000 * attempts);
        }
      }
    }
  },
  local: {
    id: 'local',
    name: 'Local Seq2Seq (Mock)',
    translate: async (glosses) => {
      // Mock local Seq2Seq model translation to verify interface contract
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
      const cleaned = glosses.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!cleaned) return '';
      // Capitalize first letter
      const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return `[Local Model] ${capitalized}.`;
    }
  }
};
