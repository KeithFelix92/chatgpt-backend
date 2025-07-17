const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Initialize OpenAI client with your API key from environment variables
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Folder for storing user data files
const dataFolder = path.resolve(__dirname, 'PublicUserPrivateData');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

// Simple GET route to test server health
app.get('/ping', (req, res) => {
  res.json({ message: "pong" });
});

// POST /chat - send user messages to OpenAI and return the reply
app.post('/chat', async (req, res) => {
  const { userId, messages } = req.body;
  if (!userId || !messages) {
    return res.status(400).json({ error: 'Missing userId or messages' });
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini", // Change model if you want
      messages: messages,
    });

    const replyText = completion.data.choices[0].message.content;
    console.log(`ChatGPT reply for user ${userId}:`, replyText);

    res.json({ message: replyText });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

// POST /save - save user conversation memory to disk
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

// POST /load - load user conversation memory from disk
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
