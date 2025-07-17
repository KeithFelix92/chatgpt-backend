const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Folder for storing user data
const dataFolder = path.resolve(__dirname, 'PublicUserPrivateData');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

// Simple GET test route to verify server is alive
app.get('/ping', (req, res) => {
  res.json({ message: "pong" });
});

// /chat endpoint - dummy reply for testing
app.post('/chat', (req, res) => {
  const { userId, messages } = req.body;
  if (!userId || !messages) {
    return res.status(400).json({ error: 'Missing userId or messages' });
  }

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const replyText = lastUserMessage
    ? `Echo: ${lastUserMessage.content}`
    : "Hello from backend!";

  console.log(`Chat from user ${userId}:`, lastUserMessage?.content);
  res.json({ message: replyText });
});

// /save endpoint - saves user messages to file
app.post('/save', (req, res) => {
  const { userId, messages } = req.body;
  if (!userId || !messages) {
    return res.status(400).json({ error: 'Missing userId or messages' });
  }

  const userFile = path.join(dataFolder, `${userId}.txt`);
  const dataString = JSON.stringify(messages, null, 2);

  try {
    fs.writeFileSync(userFile, dataString, 'utf-8');
    console.log(`Saved data for user ${userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// /load endpoint - loads user messages from file
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
    console.log(`Loaded data for user ${userId}`);
    res.json({ messages });
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
