const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;
const MAX_MEMORY_ITEMS = 5;
const sessions = {}; // Per-player memory

function getContextInfo() {
  const now = new Date();
  return `Date: ${now.toDateString()}. Time: ${now.toLocaleTimeString()}.`;
}

function startSession(playerId) {
  sessions[playerId] = {
    chatHistory: [
      {
        role: "system",
        content: "You are GPT-4.1 (gpt-4o). You remember this player's chat session and extract facts."
      },
      {
        role: "system",
        content: getContextInfo()
      }
    ],
    memories: []
  };
}

function addMessage(playerId, role, content) {
  if (!sessions[playerId]) startSession(playerId);
  sessions[playerId].chatHistory.push({ role, content });
}

async function extractFactFromMessage(playerId, messageText) {
  if (!sessions[playerId]) return;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract one small but useful fact from this message to remember. Keep it short."
          },
          { role: "user", content: messageText }
        ],
        temperature: 0.3,
        max_tokens: 30
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const fact = response.data.choices[0].message.content.trim();
    if (fact && fact.length > 2) {
      const mem = sessions[playerId].memories;
      if (mem.length >= MAX_MEMORY_ITEMS) mem.shift(); // Remove oldest
      mem.push(fact);
    }
  } catch (err) {
    console.warn("Memory extract error:", err.message);
  }
}

async function summarizeSession(playerId) {
  if (!sessions[playerId]) return "No session found.";

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Summarize this session from GPT's perspective, include the tone, patterns, and any facts learned."
          },
          ...sessions[playerId].chatHistory
        ],
        temperature: 0.6,
        max_tokens: 300
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const summary = response.data.choices[0].message.content;
    saveSummaryToFile(playerId, summary);
    return summary;
  } catch (error) {
    return "Failed to generate summary.";
  }
}

function saveSummaryToFile(playerId, summary) {
  if (!fs.existsSync("summaries")) fs.mkdirSync("summaries");
  const fileName = `summaries/${playerId}-${Date.now()}.txt`;
  fs.writeFileSync(fileName, summary);
}

app.post("/chat", async (req, res) => {
  const { playerId, message } = req.body;
  if (!playerId || !message) return res.status(400).json({ error: "Missing playerId or message." });

  startSession(playerId);
  addMessage(playerId, "user", message);
  await extractFactFromMessage(playerId, message);

  const memoryText = sessions[playerId].memories.join("; ");
  if (memoryText) {
    addMessage(playerId, "system", "Memories to keep in mind: " + memoryText);
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: sessions[playerId].chatHistory,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const gptReply = response.data.choices[0].message.content;
    addMessage(playerId, "assistant", gptReply);
    res.json({ reply: gptReply });
  } catch (err) {
    res.status(500).json({ error: "OpenAI failed." });
  }
});

app.post("/playerLeft", async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: "Missing playerId" });

  const summary = await summarizeSession(playerId);
  delete sessions[playerId]; // Clean up
  res.json({ summary });
});

app.get("/", (_, res) => {
  res.send("✅ ChatGPT 4.1 Backend with Player Memory and Summary Running");
});

app.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
