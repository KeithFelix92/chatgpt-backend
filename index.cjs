const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Folder for storing user data files
const dataFolder = path.resolve(__dirname, 'PublicUserPrivateData');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

// Health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: "pong" });
});

// POST /chat endpoint - call OpenAI chat completion
app.post('/chat', async (req, res) => {
  const { userId, messages } = req.body;
  if (!userId || !messages) {
    return res.status(400).json({ error: 'Missing userId or messages' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // replace with your desired model
      messages: messages,
    });

    const replyText = completion.choices[0].message.content;
    console.log(`ChatGPT reply for user ${userId}:`, replyText);

    res.json({ message: replyText });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

// POST /save - save user messages to disk
app.post('/save', (req, res) => {
  const { userId, messages } = req.body;
  if (!userId || !messages) {
    return res.status(400).json({ error: 'Missing userId or messages' });
  }

  const userFile = path.join(dataFolder, `${userId}.txt`);
  const dataString = JSON.stringify(messages, null, 2);

  try {
    fs.writeFileSync(userFile, dataString, 'utf-8');
    console.log(`Saved memory for user ${userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// POST /load - load user messages from disk
app.post('/load', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const userFile = path.join(dataFolder, `${userId}.txt`);
  if (!fs.existsSync(userFile)) {
    return res.json({ messages: [] });
  }

  try {
    const dataString = fs.readFileSync(userFile, 'utf-8');
    const messages = JSON.parse(dataString);
    console.log(`Loaded memory for user ${userId}`);
    res.json({ messages });
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
