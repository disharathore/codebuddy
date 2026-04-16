import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';

const router = Router();
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function fallbackHint({ level, problem }) {
  const title = problem?.title || 'this problem';
  const category = problem?.category || 'core logic';

  if (level === 1) {
    return `Think about ${title} like organizing information so you can answer a question quickly instead of re-checking everything each time. Focus on the key relationship in this ${category} problem and what information should be remembered as you iterate. What could you store so each new step can instantly tell you whether the needed match already exists?`;
  }

  if (level === 2) {
    return [
      '1. Define what output format the problem expects and handle edge cases first.',
      `2. Iterate through inputs once while tracking useful state for ${category}.`,
      '3. At each step, compute what value/condition would satisfy the requirement.',
      '4. Check whether that requirement is already satisfied by previously seen state.',
      '5. If yes, return the result immediately in the required format.',
      '6. Otherwise update state and continue.',
      '7. If loop completes, return the problem-safe default output.',
      'Try coding each step one at a time.'
    ].join('\n');
  }

  return [
    '```python',
    '# Local fallback hint (provider temporarily unavailable)',
    'def solve(input_data):',
    '    # Step 1: initialize state you need while scanning the input',
    '    state = {}  # ??? choose structure that helps quick lookups',
    '',
    '    # Step 2: iterate through data once',
    '    for idx, item in enumerate(input_data):',
    '        needed = ...  # ??? derive what would satisfy the condition',
    '        if needed in state:',
    '            return ...  # ??? build required output format',
    '        state[item] = idx  # save current item context',
    '',
    '    # Step 3: fallback return when no valid result found',
    '    return ...  # ??? match the problem expected default',
    '```',
    '',
    "You're almost there! Fill in the # ??? sections."
  ].join('\n');
}

async function* streamGeminiChat({ model, systemPrompt, userPrompt, maxTokens = 700, temperature = 0.2 }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const endpoint = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  if (!response.body) {
    throw new Error('Gemini response stream missing body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload) continue;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      const parts = parsed?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (typeof part?.text === 'string' && part.text.length > 0) {
          yield part.text;
        }
      }
    }
  }
}

const HINT_LEVELS = {
  1: {
    name: 'Conceptual',
    icon: '💡',
    instruction: `You are a patient, encouraging CS tutor. Give a LEVEL 1 — Conceptual hint.

STRICT RULES:
- Discuss ONLY the concept or mental model needed. Never name the specific algorithm if it's the key insight.
- Use a real-world analogy or comparison to make it click.
- End with exactly ONE guiding question (e.g. "What if you could look up each number's pair instantly?")
- Absolutely NO code. NO pseudocode. NO variable names.
- Max 3 sentences + 1 question. Be warm and encouraging.
- Tone: like a mentor gently nudging, not a lecturer.`
  },
  2: {
    name: 'Pseudocode',
    icon: '📋',
    instruction: `You are a patient CS tutor. Give a LEVEL 2 — Pseudocode hint.

STRICT RULES:
- Write the solution as a numbered plain-English step list.
- You MAY now name the data structure or algorithm.
- Use indentation to show nested logic. Use arrows (→) for returns.
- No actual code syntax — no colons, no brackets, no Python keywords.
- Include edge case handling in plain English.
- End with: "Try coding each step one at a time."
- Max 10 lines.`
  },
  3: {
    name: 'Near-Code',
    icon: '🔧',
    instruction: `You are a patient CS tutor. Give a LEVEL 3 — Near-Code hint.

STRICT RULES:
- Provide almost-complete Python code with strategic blanks marked as  # ???
- Fill ALL boilerplate — only leave the core 2-3 logic lines blank.
- Each # ??? must have a comment explaining what goes there.
- Add inline comments explaining every section.
- Format as a proper Python code block.
- End with: "You're almost there! Fill in the # ??? sections."`
  }
};

router.post('/', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.id || uuidv4();
  try {
    const { session_id, hint_level, user_code } = req.body;
    if (!session_id || !hint_level || !user_code)
      return res.status(400).json({ success: false, error: 'session_id, hint_level, and user_code required' });

    const level = Number(hint_level);
    if (![1,2,3].includes(level))
      return res.status(400).json({ success: false, error: 'hint_level must be 1, 2, or 3' });

    const session = dbGet('SELECT * FROM sessions WHERE id=?', [session_id]);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const problem = dbGet('SELECT * FROM problems WHERE id=?', [session.problem_id]);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    const lvl = HINT_LEVELS[level];

    const systemPrompt = `${lvl.instruction}

PROBLEM CONTEXT:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Category: ${problem.category}
Description:
${problem.description}`;

    const userMessage = `The student is working on "${problem.title}".

Their current code:
\`\`\`python
${user_code}
\`\`\`

Provide a Level ${level} (${lvl.name}) hint following your instructions exactly.`;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let fullResponse = '';
    let usedFallback = false;

    try {
      for await (const token of streamGeminiChat({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        systemPrompt,
        userPrompt: userMessage,
        maxTokens: 700,
        temperature: 0.2
      })) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ type: 'delta', text: token })}\n\n`);
      }
    } catch (providerErr) {
      usedFallback = true;
      fullResponse = fallbackHint({ level, problem });
      console.error(`[${new Date().toISOString()}] [${requestId}] Hint provider failed, serving fallback`, {
        error: providerErr?.message,
        session_id,
        problem_id: session.problem_id,
        level
      });
      res.write(`data: ${JSON.stringify({ type: 'delta', text: fullResponse })}\n\n`);
    }

    const responseTimeMs = Date.now() - startTime;
    const hintId = uuidv4();

    dbRun(`INSERT INTO hint_requests (id, session_id, problem_id, hint_level, user_code, hint_response, response_time_ms)
           VALUES (?,?,?,?,?,?,?)`,
      [hintId, session_id, session.problem_id, level, user_code, fullResponse, responseTimeMs]);

    // Update session — increment hints_used and track max level reached
    const currentMax = Number(session.max_hint_level) || 0;
    dbRun(`UPDATE sessions SET hints_used = hints_used + 1, max_hint_level = ? WHERE id=?`,
      [Math.max(currentMax, level), session_id]);

    dbRun(`INSERT INTO analytics (id, event, session_id, problem_id, metadata) VALUES (?,?,?,?,?)`,
      [uuidv4(), 'hint_requested', session_id, session.problem_id,
       JSON.stringify({ hint_level: level, response_time_ms: responseTimeMs, fallback: usedFallback })]);

    res.write(`data: ${JSON.stringify({ type: 'done', hint_id: hintId, level_name: lvl.name, level_icon: lvl.icon, fallback: usedFallback })}\n\n`);
    res.end();

    console.log(`[${new Date().toISOString()}] [${requestId}] Hint delivered`, {
      session_id,
      problem_id: session.problem_id,
      level,
      fallback: usedFallback,
      response_time_ms: responseTimeMs
    });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] [${requestId}] Hint route failed`, {
      error: err?.message,
      stack: err?.stack
    });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || 'Failed to generate hint', request_id: requestId });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Failed' })}\n\n`);
      res.end();
    }
  }
});

router.get('/session/:session_id', (req, res) => {
  try {
    const hints = dbAll(
      `SELECT id, hint_level, user_code, hint_response, requested_at, response_time_ms
       FROM hint_requests WHERE session_id=? ORDER BY requested_at ASC`,
      [req.params.session_id]
    );
    res.json({ success: true, hints: hints.map(h => ({
      ...h,
      level_name: HINT_LEVELS[h.hint_level]?.name,
      level_icon: HINT_LEVELS[h.hint_level]?.icon
    }))});
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export default router;
