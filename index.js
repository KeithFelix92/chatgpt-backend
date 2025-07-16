const express = require('express');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

// Directories for memory storage
const PUBLIC_DIR = path.join(__dirname, 'PublicUserPrivateData');
const SERVER_DIR = path.join(__dirname, 'ServerStorageMemories');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
if (!fs.existsSync(SERVER_DIR)) fs.mkdirSync(SERVER_DIR);

// GET raw memory
app.get('/memory/:userId', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, `${req.params.userId}.txt`);
  if (fs.existsSync(filePath)) {
    return res.json({ memory: fs.readFileSync(filePath, 'utf8') });
  }
  res.json({ memory: '' });
});

// POST raw memory
app.post('/memory/:userId', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, `${req.params.userId}.txt`);
  fs.writeFileSync(filePath, req.body.memory || '', 'utf8');
  res.json({ status: 'Memory saved' });
});

// POST summarize memory and save as JSON
app.post('/summarize/:userId', async (req, res) => {
  const userId = req.params.userId;
  const rawMemory = req.body.memory || '';

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: "Summarize this player's chat history into a compact JSON format with useful minor facts and persistent preferences. Use concise keys." },
        { role: 'user', content: rawMemory }
      ]
    });

    const summary = completion.data.choices[0].message.content.trim();

    // Save readable text version
    fs.writeFileSync(path.join(PUBLIC_DIR, `${userId}.txt`), rawMemory, 'utf8');

    // Save JSON summary to ServerStorageMemories
    const safeJson = JSON.parse(summary); // ensure it's valid JSON
    fs.writeFileSync(path.join(SERVER_DIR, `${userId}.json`), JSON.stringify(safeJson, null, 2));

    res.json({ status: 'Summarized and saved', summary: safeJson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

// Main chat route
app.post('/chat', async (req, res) => {
  const { userId, message, memory } = req.body;
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `You're a smart NPC in Roblox who remembers personal info and helps players.` },
        { role: 'user', content: `Player memory: ${memory}` },
        { role: 'user', content: message }
      ]
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ChatGPT error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
