// index.cjs

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// POST /chat - get chat completion from OpenAI
app.post('/chat', async (req, res) => {
  const { messages, userId } = req.body;

  if (!userId || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Missing userId or messages array' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });  // <-- IMPORTANT: use 'reply' key here

  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ reply: 'Failed to generate response' });
  }
});

// GET /load/:userId - load saved memory for a user
app.get('/load/:userId', (req, res) => {
  const userId = req.params.userId;
  const filePath = path.join(__dirname, 'PublicUserPrivateData', `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.json({ memory: null });
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    res.json({ memory: JSON.parse(data) });
  } catch (error) {
    console.error("Load Error:", error);
    res.status(500).json({ reply: 'Failed to load memory' });
  }
});

// POST /save - save memory for a user
app.post('/save', (req, res) => {
  const { userId, memory } = req.body;
  if (!userId || !memory) {
    return res.status(400).json({ reply: 'Missing userId or memory' });
  }

  const filePath = path.join(__dirname, 'PublicUserPrivateData', `${userId}.json`);

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
    res.json({ reply: 'Memory saved' });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ reply: 'Failed to save memory' });
  }
});

app.listen(port, () => {
  console.log(`✅ ChatGPT backend running on port ${port}`);
});
