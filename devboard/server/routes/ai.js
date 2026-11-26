const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { protect } = require('../middleware/auth');

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const stripMarkdownCodeFences = (value) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

const normalizeComplexity = (value) => {
  const parsed = JSON.parse(stripMarkdownCodeFences(value));
  const numericScore = Number(parsed.score);

  if (!Number.isFinite(numericScore)) {
    throw new Error('Claude returned an invalid complexity score');
  }

  return {
    score: Math.min(10, Math.max(1, Math.round(numericScore))),
    reason:
      typeof parsed.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim().replace(/\s+/g, ' ').slice(0, 240)
        : 'No reason provided.',
  };
};

router.post('/complexity', protect, async (req, res) => {
  const { title, description = '' } = req.body || {};

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.length > 100 ||
    typeof description !== 'string' ||
    description.length > 500
  ) {
    return res.status(400).json({
      error: 'A task title and an optional description within the allowed length are required.',
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Complexity analysis is unavailable: ANTHROPIC_API_KEY is not configured.');
    return res.status(503).json({ error: 'Complexity analysis is not configured.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2026-10-21',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Rate the complexity of this development task from 1 to 10. Reply only with JSON in this exact shape: {"score": 7, "reason": "one concise line"}.\n\nTitle: ${title.trim()}\nDescription: ${description.trim() || 'None provided'}`,
          },
        ],
      }),
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Claude complexity request failed with status:', response.status);
      return res.status(502).json({ error: 'Complexity analysis is temporarily unavailable.' });
    }

    const text = responseBody.content?.find((block) => block.type === 'text')?.text;
    if (typeof text !== 'string') {
      throw new Error('Claude returned no text content');
    }

    return res.status(200).json(normalizeComplexity(text));
  } catch (error) {
    console.error('Error analyzing task complexity:', error.message);
    return res.status(502).json({ error: 'Complexity analysis is temporarily unavailable.' });
  }
});

router.post('/generate-description', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required to generate a description.' });
    }

    const prompt = `Write a concise, professional, 2-3 sentence task description for a task titled: "${title}". Output only the description text without extra formatting or quotes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const description = response.text ? response.text.trim() : '';

    return res.status(200).json({ description });
  } catch (error) {
    console.error('Error generating description with AI:', error);
    return res.status(500).json({ error: 'Failed to generate task description.' });
  }
});


router.post('/suggest-tags', async (req,res) =>{
try {
  const { code } = req.body;
  if(!code || typeof code !== 'string' || code.trim().length === 0){
    return res.status(400).json({error:'Code snippet is required for tag generation'});
  }
  const systemPrompt =`You are a code tagging assistant. Analyze the given code snippet and return exactly 2-3 short, relevant tags.

Rules:
- Tags must reflect the snippet's actual language, framework, or core concept (e.g. "javascript", "react-hooks", "recursion", "async-await", "sql-join")
- Prefer specific tags over generic ones (avoid just "code" or "programming")
- Use lowercase, hyphenated format (e.g. "error-handling" not "Error Handling")
- Return ONLY a raw JSON array of strings, nothing else — no markdown, no explanation, no code fences

Example output: ["python", "list-comprehension", "data-processing"]`;

const userPrompt =`Code snippet:\n\n${code}`;

const fullPrompt =`${systemPrompt}\n\n${userPrompt}`;

const response = await ai.models.generateContent({
  model:'gemini-3.6-flash',
  contents:fullPrompt,
})
const rawResponseText = response.text ? response.text.trim() : '[]';

const cleanedResponseText = rawResponseText.replace(/```json|```/g,'').trim();

let parsedTags;
try{
  parsedTags = JSON.parse(cleanedResponseText);

}catch(err){
  const match = cleanedResponseText.match(/\[.*\]/s);
  parsedTags = match ? JSON.parse(match[0]) : [];
}
let suggestedTags = parsedTags;
if(!Array.isArray(suggestedTags)) suggestedTags = [];

suggestedTags = suggestedTags
  .filter(t => typeof t === 'string' && t.trim().length > 0)
  .map(t => t.trim().toLowerCase())
  .filter((t,i,arr)=> arr.indexOf(t) === i)
  .slice(0,3)

  return res.status(200).json({tags:suggestedTags});
}catch(err){
  console.error('Error generating tags with AI:',err);
  return res.status(500).json({error:'Failed to generate tag suggestions'})
}

})

module.exports = router;
