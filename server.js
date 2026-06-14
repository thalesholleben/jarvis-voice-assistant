require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const Groq = require('groq-sdk');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

function hasSecret(value) {
  const normalized = String(value || '').trim();
  return Boolean(
    normalized &&
    !normalized.startsWith('replace-with-') &&
    !normalized.includes('your_') &&
    !normalized.includes('YOUR_')
  );
}

function hasOpenAIKey() {
  return hasSecret(process.env.OPENAI_API_KEY);
}

function hasGroqKey() {
  return hasSecret(process.env.GROQ_API_KEY);
}

// SDK clients are optional at boot so the portfolio UI can run without secrets.
const groq = hasGroqKey() ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const openai = hasOpenAIKey() ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// --- SOUL.md (system prompt) ---
const soulPath = path.join(__dirname, 'workspace', 'SOUL.md');
let soulPrompt = '';
try {
  soulPrompt = fs.readFileSync(soulPath, 'utf-8').trim();
  console.log('[JARVIS] SOUL.md loaded (%d chars)', soulPrompt.length);
} catch {
  console.warn('[JARVIS] workspace/SOUL.md not found - using empty instructions');
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// --- CORS ---
const ALLOWED_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
if (process.env.ALLOWED_ORIGIN) {
  ALLOWED_ORIGINS.push(process.env.ALLOWED_ORIGIN);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'jarvis-voice-assistant',
    defaultMode: process.env.DEFAULT_MODE || 'pipeline',
    openaiConfigured: hasOpenAIKey(),
    groqConfigured: hasGroqKey(),
  });
});

// --- Body parser for SDP (text/sdp comes as text) ---
app.use('/session', express.text({ type: '*/*', limit: '64kb' }));

// --- Body parser for JSON (tools + pipeline endpoints) ---
app.use('/tools', express.json());
app.use('/api/chat', express.json());
app.use('/api/synthesize', express.json());

// --- Rate limiters ---
const sessionLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sessions — try again in a minute' },
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again in a minute' },
});

// --- GET /config (session config for frontend) ---
app.get('/config', (req, res) => {
  res.json({
    instructions: soulPrompt,
    defaultMode: process.env.DEFAULT_MODE || 'pipeline',
  });
});

// --- POST /session  (Unified Interface) ---
app.post('/session', sessionLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
  }

  // Validate Origin
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Validate we received an SDP offer
  const sdpOffer = req.body;
  if (!sdpOffer || typeof sdpOffer !== 'string' || !sdpOffer.startsWith('v=')) {
    return res.status(400).json({ error: 'Invalid SDP offer' });
  }

  try {
    // Relay SDP offer to OpenAI Realtime API (WebRTC unified interface)
    // Session config (voice, instructions, VAD) is sent via DataChannel after connect
    const model = process.env.REALTIME_MODEL || 'gpt-4o-mini-realtime-preview';
    const response = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[JARVIS] OpenAI error %d: %s', response.status, errText);
      return res.status(response.status).json({
        error: 'OpenAI API error',
        detail: errText,
      });
    }

    const sdpAnswer = await response.text();
    res.type('application/sdp').send(sdpAnswer);
    console.log('[JARVIS] Session created successfully');
  } catch (err) {
    console.error('[JARVIS] Fetch error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /tools/web-search (proxy to Responses API with gpt-4o-mini) ---
app.post('/tools/web-search', sessionLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          { role: 'system', content: 'Voce e um assistente de pesquisa. Use web search para responder de forma concisa em portugues brasileiro. Inclua fontes quando relevante.' },
          { role: 'user', content: query },
        ],
        tools: [{ type: 'web_search_preview', search_context_size: 'medium' }],
        tool_choice: 'required',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[JARVIS] Web search error:', err);
      return res.status(502).json({ error: 'Web search failed' });
    }

    const data = await response.json();
    const textItems = (data.output || [])
      .filter(item => item.type === 'message')
      .flatMap(item => item.content || [])
      .filter(c => c.type === 'output_text')
      .map(c => c.text);

    res.json({
      result: textItems.join('\n') || 'Sem resultados.',
      usage: data.usage || null,
    });
  } catch (err) {
    console.error('[JARVIS] Web search fetch error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ============================================================
// PIPELINE ECONÔMICA: STT + LLM + TTS
// ============================================================

// --- POST /api/transcribe — STT via Groq Whisper ---
app.post('/api/transcribe', apiLimiter, (req, res) => {
  if (!hasGroqKey()) {
    return res.status(503).json({ error: 'GROQ_API_KEY not configured' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Expected multipart/form-data' });
  }

  const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB
  let totalBytes = 0;
  let audioBuffer = null;
  let audioMimeType = 'audio/webm';

  let bb;
  try {
    bb = busboy({ headers: req.headers, limits: { fileSize: MAX_AUDIO_BYTES } });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid multipart request' });
  }

  bb.on('file', (fieldname, fileStream, info) => {
    const { mimeType } = info;
    // Accept webm, ogg/opus, mp4/m4a, wav
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'application/octet-stream'];
    if (!allowed.some(t => mimeType.startsWith(t.split('/')[0])) && mimeType !== 'application/octet-stream') {
      fileStream.resume(); // drain
    }
    audioMimeType = mimeType || 'audio/webm';

    const chunks = [];
    fileStream.on('data', (chunk) => {
      totalBytes += chunk.length;
      chunks.push(chunk);
    });
    fileStream.on('limit', () => {
      console.warn('[JARVIS] Audio upload exceeds 10MB limit');
    });
    fileStream.on('end', () => {
      audioBuffer = Buffer.concat(chunks);
    });
  });

  bb.on('finish', async () => {
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    try {
      // Groq Whisper accepts a File-like object via SDK
      const { toFile } = require('openai');
      const audioFile = await toFile(audioBuffer, 'audio.webm', { type: audioMimeType });

      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        response_format: 'json',
      });

      console.log('[JARVIS] Transcribed: "%s"', transcription.text?.slice(0, 60));
      res.json({ text: transcription.text || '' });
    } catch (err) {
      console.error('[JARVIS] Groq transcription error:', err.message);
      res.status(502).json({ error: 'Transcription failed', detail: err.message });
    }
  });

  bb.on('error', (err) => {
    console.error('[JARVIS] Busboy error:', err.message);
    res.status(400).json({ error: 'Upload error' });
  });

  req.pipe(bb);
});

// --- POST /api/chat — LLM via GPT-4o-mini (SSE streaming) ---
// Body: { messages: [{role, content}] }
// The web_search tool uses the same contract as /tools/web-search
app.post('/api/chat', apiLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Inject system prompt as first message
  const fullMessages = [
    { role: 'system', content: soulPrompt || 'You are JARVIS, a helpful voice assistant.' },
    ...messages,
  ];

  // Tool definition — same contract as /tools/web-search
  const tools = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for up-to-date information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
          },
          required: ['query'],
        },
      },
    },
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let currentMessages = [...fullMessages];
    let continueLoop = true;

    while (continueLoop) {
      continueLoop = false;

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: currentMessages,
        tools,
        tool_choice: 'auto',
        stream: true,
      });

      let assistantContent = '';
      let toolCalls = [];
      let currentToolCall = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Text delta
        if (delta.content) {
          assistantContent += delta.content;
          sendSSE({ type: 'content', content: delta.content });
        }

        // Tool call delta
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
              }
              if (tc.id) toolCalls[tc.index].id = tc.id;
              if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }
      }

      // Handle tool calls (web_search)
      if (toolCalls.length > 0) {
        currentMessages.push({
          role: 'assistant',
          content: assistantContent || null,
          tool_calls: toolCalls,
        });

        for (const tc of toolCalls) {
          if (tc.function.name === 'web_search') {
            let args;
            try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
            const query = args.query || '';

            sendSSE({ type: 'tool_start', tool: 'web_search', query });

            try {
              const wsRes = await fetch(`http://localhost:${PORT}/tools/web-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
              });
              const wsData = await wsRes.json();
              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: wsData.result || 'Sem resultados.',
              });
              sendSSE({ type: 'tool_end', tool: 'web_search' });
            } catch (err) {
              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: 'Erro ao buscar na web.',
              });
            }
          }
        }

        continueLoop = true; // run another pass with tool results
      }
    }

    sendSSE({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('[JARVIS] Chat error:', err.message);
    sendSSE({ type: 'error', message: err.message });
    res.end();
  }
});

// --- POST /api/synthesize — TTS via OpenAI (stream MP3) ---
// Body: { text: "...", voice: "ash" }
app.post('/api/synthesize', apiLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { text, voice = 'ash' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text required' });
  }

  const MAX_TEXT_CHARS = 2000;
  const truncated = text.slice(0, MAX_TEXT_CHARS);

  try {
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: truncated,
      response_format: 'mp3',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    // Pipe the ReadableStream from OpenAI SDK → response
    const audioStream = ttsResponse.body;
    if (audioStream && typeof audioStream.pipe === 'function') {
      audioStream.pipe(res);
    } else {
      // Fallback: read as ArrayBuffer
      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      res.send(buffer);
    }
  } catch (err) {
    console.error('[JARVIS] TTS error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'TTS failed', detail: err.message });
    }
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log('[JARVIS] Server running at http://localhost:%d', PORT);
  if (!hasOpenAIKey()) {
    console.warn('[JARVIS] Configure OPENAI_API_KEY in .env to enable realtime, chat, TTS, and web search');
  }
  if (!hasGroqKey()) {
    console.warn('[JARVIS] Configure GROQ_API_KEY in .env to enable pipeline transcription');
  }
  console.log('[JARVIS] Modo padrão: %s', process.env.DEFAULT_MODE || 'pipeline');
});
