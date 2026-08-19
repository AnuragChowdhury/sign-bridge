import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import url from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/translate', async (req, res) => {
  const { glosses, history } = req.body;

  if (!glosses || typeof glosses !== 'string' || !glosses.trim()) {
    return res.status(400).json({ error: 'Glosses are required and must be a non-empty string' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.error('OPENAI_API_KEY is not configured on the server');
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server. Please check your .env file.' });
  }

  const systemPrompt = `You are a translator from American Sign Language (ASL) gloss sequences to fluent, grammatical English.
ASL glosses represent concepts and are not word-for-word English. They lack articles, prepositions, and standard English verb conjugations, and the word order is often different (e.g., topic-comment structure).
Your task is to translate the input gloss sequence into natural, grammatically correct English.
Keep the translation concise, accurate, and match the tone of the input.
If a previous sentence is provided as context, use it to ensure pronoun or topic continuity (e.g. resolved references), but ONLY translate the new gloss sequence. Do not repeat the context sentence.
Do not include any explanations, notes, or extra text; output ONLY the final English translation.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (history && Array.isArray(history) && history.length > 0) {
    const lastSentence = history[history.length - 1];
    if (lastSentence && typeof lastSentence === 'string' && lastSentence.trim()) {
      messages.push({
        role: 'system',
        content: `Context (previous translated sentence): "${lastSentence.trim()}"`
      });
    }
  }

  messages.push({
    role: 'user',
    content: `Translate this gloss sequence: ${glosses.trim()}`
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 100
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();

    return res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request to OpenAI timed out' });
    }
    return res.status(500).json({ error: error.message || 'Failed to translate glosses' });
  }
});

// Helper to resolve YouTube/Vimeo/etc. URLs to direct CDN MP4 URLs using child_process yt-dlp
function resolveVideoUrl(videoUrl) {
  return new Promise((resolve) => {
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com');
    if (!isYouTube) {
      resolve(videoUrl);
      return;
    }

    const cmd = `python -m yt_dlp --js-runtimes node --extractor-args "youtube:player-client=web_embedded,web,tv" -g -f 18 "${videoUrl}"`;
    exec(cmd, (err1, stdout1) => {
      const resolved = stdout1.trim();
      if (resolved && resolved.startsWith('http')) {
        resolve(resolved);
      } else {
        // Fallback to lowest format
        const fallbackCmd = `python -m yt_dlp --js-runtimes node --extractor-args "youtube:player-client=web_embedded,web,tv" -g -f "lowest" "${videoUrl}"`;
        exec(fallbackCmd, (err2, stdout2) => {
          const fallbackResolved = stdout2.trim();
          resolve((fallbackResolved && fallbackResolved.startsWith('http')) ? fallbackResolved : videoUrl);
        });
      }
    });
  });
}

// Proxy video endpoint to bypass CORS and resolve stream URLs on the fly
app.get('/api/proxy-video', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('URL query parameter is required');
  }

  try {
    // Resolve stream URL using yt-dlp
    const targetUrl = await resolveVideoUrl(videoUrl);

    const doProxy = (currentUrl, redirectDepth = 0) => {
      if (redirectDepth > 5) {
        console.error('Too many redirects proxying:', videoUrl);
        return res.status(502).send('Too many redirects');
      }

      const parsedUrl = new URL(currentUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Clean headers to bypass CORS and prevent 403 blocks from video CDNs
      const headers = {};
      if (req.headers['range']) {
        headers['range'] = req.headers['range'];
      }
      headers['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const requestOptions = {
        method: 'GET',
        headers: headers
      };

      if (parsedUrl.protocol === 'https:') {
        requestOptions.rejectUnauthorized = false;
      }

      const proxyReq = client.request(currentUrl, requestOptions, (proxyRes) => {
        // Handle HTTP Redirects
        if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
          const redirectUrl = proxyRes.headers.location;
          if (redirectUrl) {
            const resolvedRedirectUrl = new URL(redirectUrl, currentUrl).toString();
            return doProxy(resolvedRedirectUrl, redirectDepth + 1);
          }
        }

        // Forward headers and add CORS
        const responseHeaders = { ...proxyRes.headers };
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Headers'] = 'Range';
        responseHeaders['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range';

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Video proxy error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error proxying video');
        }
      });

      proxyReq.end();
    };

    doProxy(targetUrl);
  } catch (err) {
    console.error('Proxy request error:', err);
    if (!res.headersSent) {
      res.status(500).send('Proxy server error');
    }
  }
});

app.listen(PORT, () => {
  console.log(`Minimal SignBridge Backend Proxy running on http://localhost:${PORT}`);
});
