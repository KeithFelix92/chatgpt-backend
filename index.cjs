// index.cjs

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const MEMORY_FOLDER = path.join(__dirname, 'PublicUserPrivateData');

// Make sure memory folder exists
if (!fs.existsSync(MEMORY_FOLDER)) {
  fs.mkdirSync(MEMORY_FOLDER, { recursive: true });
}

// Load memory file for a user
function loadMemory(userId) {
  const filePath = path.join(MEMORY_FOLDER, `${userId}.txt`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return '';
}

// Save memory file for a user
function saveMemory(userId, memoryText) {
  const filePath = path.join(MEMORY_FOLDER, `${userId}.txt`);
  fs.writeFileSync(filePath, memoryText, 'utf8');
}

// /chat endpoint
app.post('/chat', async (req, res) => {
  const { messages, userId } = req.body;

  if (!Array.isArray(messages) || !userId) {
    return res.status(400).json({ reply: 'Missing userId or messages array' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-3.5-turbo' if using free tier
      messages: messages,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Chat Error:', error.message);
    res.status(500).json({ reply: 'Error generating reply' });
  }
});

// /load endpoint
app.post('/load', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ memory: '' });
  }

  const memory = loadMemory(userId);
  res.json({ memory });
});

// /save endpoint
app.post('/save', (req, res) => {
  const { userId, memory } = req.body;

  if (!userId || typeof memory !== 'string') {
    return res.status(400).json({ message: 'Missing userId or memory' });
  }

  try {
    saveMemory(userId, memory);
    res.json({ message: 'Memory saved successfully' });
  } catch (error) {
    console.error('Save Error:', error.message);
    res.status(500).json({ message: 'Failed to save memory' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ChatGPT backend listening on port ${PORT}`);
});
