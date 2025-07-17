// index.cjs
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Setup OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  const { userId, messages } = req.body;
  console.log("[Backend] Received request:", JSON.stringify(req.body));

  if (!userId || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Missing userId or messages array' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const reply = completion.choices[0].message.content;
    console.log("[Backend] OpenAI reply:", reply);

    res.json({ reply });
  } catch (error) {
    console.error("[Backend] OpenAI Error:", error);
    res.status(500).json({ reply: 'Failed to generate response' });
  }
});

app.listen(port, () => {
  console.log(`✅ ChatGPT backend running on port ${port}`);
});
