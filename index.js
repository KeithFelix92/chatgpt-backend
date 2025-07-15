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

// In-memory per-player sessions
const sessions = {};

function getContextInfo() {
  const now = new Date();
  const dateStr = now.toDateString();
  const timeStr = now.toLocaleTimeString();
  return `Current date is ${dateStr}. Current time is ${timeStr}.`;
}

function startSession(playerId) {
  sessions[playerId] = {
    chatHistory: [
      {
        role: "system",
        content: `You are GPT-4.1. Remember the player’s tone and facts.`
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
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "Extract a minor but important fact from this message. Keep it short, only include something the assistant should remember."
          },
          { role: "user", content: messageText }
        ],
        max_tokens: 30,
        temperature: 0.3
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
      if (mem.length >= MAX_MEMORY_ITEMS) mem.shift(); // remove oldest
      mem.push(fact);
    }
  } catch (err) {
    console.error("Fact extraction error:", err.message);
  }
}

async function summarizeSession(playerId) {
  if (!sessions[playerId]) return "No session found.";

  const session = sessions[playerId];

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Summarize the entire conversation from GPT’s perspective. Include personality traits, repeated phrases, and important facts. Be concise."
          },
          ...session.chatHistory
        ],
        max_tokens: 300,
        temperature: 0.6
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
    console.error("Summary error:", error.message);
    return "Failed to summarize session.";
  }
}

function saveSummaryToFile(playerId, summary) {
  if (!fs.existsSync("summaries")) {
    fs.mkdirSync("summaries");
  }

  const filename = `summaries/${playerId}-${Date.now()}.txt`;
  fs.writeFileSync(filename, summary);
}

app.post("/chat", async (req, res) => {
  const { playerId, message } = req.body;

  if (!playerId || !message) {
    return res.status(400).json({ error: "Missing playerId or message" });
  }

  startSession(playerId); // safe to call multiple times
  addMessage(playerId, "user", message);
  await extractFactFromMessage(playerId, message);

  // Add memory as context
  const memoryText = sessions[playerId].memories.join("; ");
  if (memoryText) {
    addMessage(playerId, "system", "Memories to keep in mind: " + memoryText);
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
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

    return res.json({ reply: gptReply });
  } catch (err) {
    console.error("GPT error:", err.message);
    return res.status(500).json({ error: "GPT API failed" });
  }
});

app.post("/playerLeft", async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: "Missing playerId" });

  const summary = await summarizeSession(playerId);
  delete sessions[playerId]; // Clear from memory

  res.json({ summary });
});

app.get("/", (_, res) => {
  res.send("ChatGPT Backend with Memory & Session Summary ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
