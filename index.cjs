// index.cjs

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Summarize helper function
async function summarizeMemory(memoryText) {
  if (!memoryText || memoryText.trim() === "") {
    return "";
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Summarize the following player memory briefly." },
        { role: "user", content: memoryText }
      ],
      max_tokens: 300,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("Summarize failed:", err);
    return "";
  }
}

// === /chat route ===
// Expects: { messages: [...], userId: "123" }
app.post('/chat', async (req, res) => {
  const { messages, userId } = req.body;
  if (!userId || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Missing userId or messages array' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });
    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    res.status(500).json({ reply: 'Failed to generate response' });
  }
});

// === /load/:userId route ===
app.get('/load/:userId', (req, res) => {
  const userId = req.params.userId;
  const filePath = path.join(__dirname, 'PublicUserPrivateData', `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.json({ memory: null });
    }
    const data = fs.readFileSync(filePath, 'utf8');
    res.json({ memory: JSON.parse(data) });
  } catch (error) {
    console.error("Load Error:", error);
    res.status(500).json({ reply: 'Failed to load memory' });
  }
});

// === /save route ===
// Expects: { userId: "123", memory: {...} }
app.post('/save', async (req, res) => {
  const { userId, memory } = req.body;
  if (!userId || !memory) {
    return res.status(400).json({ reply: 'Missing userId or memory' });
  }

  // Summarize memory before saving
  let summarizedMemory = memory;
  try {
    const memoryText = JSON.stringify(memory);
    const summary = await summarizeMemory(memoryText);
    summarizedMemory = { summary, fullMemory: memory };
  } catch (e) {
    console.error("Summarization failed:", e);
  }

  const filePath = path.join(__dirname, 'PublicUserPrivateData', `${userId}.json`);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(summarizedMemory, null, 2));
    res.json({ reply: 'Memory saved' });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ reply: 'Failed to save memory' });
  }
});

app.listen(port, () => {
  console.log(`✅ ChatGPT backend running on port ${port}`);
});
