import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Configuration, OpenAIApi } from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Simple in-memory player memory
const playerMemory = {};

app.post("/chat", async (req, res) => {
  const { message, playerId, timeZoneOffset } = req.body;

  if (!message || !playerId) {
    return res.status(400).json({ error: "Missing message or playerId" });
  }

  const offsetMinutes = parseInt(timeZoneOffset || 0);
  const nowUtc = new Date();
  const localTime = new Date(nowUtc.getTime() + offsetMinutes * 60 * 1000);
  const contextTime = `Local time: ${localTime.toLocaleTimeString()} on ${localTime.toDateString()}`;

  if (!playerMemory[playerId]) {
    playerMemory[playerId] = [];
  }

  const memory = playerMemory[playerId];

  if (message.toLowerCase().includes("remember") && memory.length < 5) {
    const match = message.match(/remember\s+(.+)/i);
    if (match && match[1]) {
      memory.push(match[1]);
      return res.json({ reply: `ChatGPT will remember: "${match[1]}"` });
    }
  }

  if (memory.length >= 5) {
    return res.json({ reply: "⚠️ Error Code M1: Memory full. Please come back after a memory wipe." });
  }

  const messages = [
    {
      role: "system",
      content: `You are ChatGPT inside a Roblox game. Be friendly and helpful. ${contextTime}`,
    },
    ...memory.map((mem) => ({ role: "system", content: "Remembered: " + mem })),
    {
      role: "user",
      content: message,
    },
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4-1106-preview",
      messages: messages,
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("ChatGPT error:", error.message);
    res.status(500).json({ error: "ChatGPT failed" });
  }
});

app.listen(3000, () => {
  console.log("✅ GPT backend running on port 3000");
});
