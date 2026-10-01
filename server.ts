import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API endpoint for Google Search Grounding using gemini-3.5-flash
  app.post('/api/search-grounding', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI(apiKey ? { apiKey } : undefined);

      const prompt = `You are the VidyaOS Academic & Board Examination Intelligence Assistant for Indian coaching & education centers, teachers, and parents.
Provide accurate, up-to-date, and concise information for the following query regarding Indian educational boards (CBSE, CISCE/ICSE, State Boards), competitive exams (JEE Main/Advanced, NEET, CUET, NDA), syllabus updates, or coaching institute guidelines.
Query: "${query}"`;

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
      res.status(500).json({ error: err.message || 'Internal Search Grounding Error' });
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
