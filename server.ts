import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchRateLimits = new Map<string, { count: number; windowStartedAt: number }>();
const SEARCH_RATE_LIMIT = 20;
const SEARCH_RATE_WINDOW_MS = 60_000;

function allowSearchRequest(key: string): boolean {
  const now = Date.now();
  const current = searchRateLimits.get(key);
  if (!current || now - current.windowStartedAt >= SEARCH_RATE_WINDOW_MS) {
    searchRateLimits.set(key, { count: 1, windowStartedAt: now });
    return true;
  }
  if (current.count >= SEARCH_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase API key is not configured for server-side token verification.');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(5000)
    }
  );
  if (!response.ok) return null;
  const result = await response.json() as { users?: Array<{ localId?: string }> };
  return result.users?.[0]?.localId || null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));

  app.post('/api/search-grounding', async (req, res) => {
    try {
      const clientKey = req.ip || 'unknown-client';
      if (!allowSearchRequest(`ip:${clientKey}`)) {
        return res.status(429).json({ error: 'Search limit reached. Try again shortly.' });
      }

      const authorization = req.header('authorization') || '';
      const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
      if (!tokenMatch) return res.status(401).json({ error: 'Authentication is required.' });

      const userId = await verifyFirebaseIdToken(tokenMatch[1]);
      if (!userId) return res.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' });
      if (!allowSearchRequest(`user:${userId}`)) {
        return res.status(429).json({ error: 'Search limit reached. Try again shortly.' });
      }

      const queryText = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      if (!queryText || queryText.length > 500) {
        return res.status(400).json({ error: 'Query must contain between 1 and 500 characters.' });
      }
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) return res.status(503).json({ error: 'Search service is not configured.' });
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are the VidyaOS Academic & Board Examination Intelligence Assistant for Indian coaching & education centers, teachers, and parents.
Provide accurate, up-to-date, and concise information for the following query regarding Indian educational boards (CBSE, CISCE/ICSE, State Boards), competitive exams (JEE Main/Advanced, NEET, CUET, NDA), syllabus updates, or coaching institute guidelines.
Query: "${queryText}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const candidate = response.candidates?.[0];
      const text = response.text || '';
      const groundingMetadata = candidate?.groundingMetadata;

      const sources = (groundingMetadata?.groundingChunks || [])
        .map((chunk: any) => ({
          title: chunk.web?.title || 'Web Reference',
          url: chunk.web?.uri || '',
        }))
        .filter((s: any) => s.url);

      const searchQueries = groundingMetadata?.webSearchQueries || [];

      res.json({
        text,
        sources,
        searchQueries,
      });
    } catch (err: any) {
      console.error('Error during search grounding:', err);
      res.status(500).json({ error: 'Search is temporarily unavailable. Please try again.' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
