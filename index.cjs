const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage } = require('@langchain/core/messages');
require('dotenv').config();

const app = express();
const port = 10000;

app.use(cors());
app.use(express.json());

const memoryPath = './PublicUserPrivateData';

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7
});

app.post('/chat', async (req, res) => {
  try {
    const { userId, messages } = req.body;
    if (!userId || !messages) return res.status(400).json({ error: "Missing userId or messages" });

    const memoryFile = `${memoryPath}/${userId}.txt`;
    let pastMemory = "";

    if (fs.existsSync(memoryFile)) {
      pastMemory = fs.readFileSync(memoryFile, 'utf8');
    }

    const fullPrompt = `${pastMemory}\n\nUser: ${messages[0].content}`;
    const response = await model.invoke([new HumanMessage(fullPrompt)]);
    const reply = response.content;

    fs.writeFileSync(memoryFile, `${pastMemory}\nUser: ${messages[0].content}\nAssistant: ${reply}`, 'utf8');
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

app.listen(port, () => {
  console.log(`ChatGPT backend listening on port ${port}`);
});
