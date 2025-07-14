const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

let chatHistory = [
  {
    role: "system",
    content:
      "You are GPT-4. You remember everything in this session and answer truthfully."
  }
];
let explicitMemories = [];
const MAX_MEMORIES = 5;

function getContextInfo() {
  const now = new Date();
  const dateStr = now.toDateString();
  const timeStr = now.toLocaleTimeString();
  return `Current date is ${dateStr}. Current time is ${timeStr}. Remember these facts when answering.`;
}

function extractMemory(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes("remember")) {
    const index = lower.indexOf("remember");
    return userMessage.slice(index + "remember".length).trim();
  }
  return null;
}

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Check if user is trying to add a memory
  const memoryText = extractMemory(userMessage);
  if (memoryText) {
    if (explicitMemories.length >= MAX_MEMORIES) {
      // Memory full - send error
      return res.json({
        reply:
          "Error code M1: Memory full in ChatGPT backend. Please come back later when a memory wipe has occurred."
      });
    }

    explicitMemories.push(memoryText);

    // Confirm memory added
    return res.json({
      reply: `ChatGPT will remember: "${memoryText}" (memory ${explicitMemories.length}/${MAX_MEMORIES})`
    });
  }

  // Remove old context messages
  chatHistory = chatHistory.filter((m) => !m.isContext);

  // Add dynamic context info
  chatHistory.unshift({
    role: "system",
    content: getContextInfo(),
    isContext: true
  });

  // Add explicit memories as system message
  if (explicitMemories.length > 0) {
    chatHistory.unshift({
      role: "system",
      content:
        "Remember these things from past chats: " + explicitMemories.join("; "),
      isContext: true
    });
  }

  // Add user message
  chatHistory.push({ role: "user", content: userMessage });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: chatHistory,
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
    chatHistory.push({ role: "assistant", content: gptReply });

    const modelUsed = response.data.model;
    res.json({ reply: `[${modelUsed}]\n${gptReply}` });
  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to contact OpenAI" });
  }
});

app.get("/", (_, res) => {
  res.send("ChatGPT backend with explicit memory is running ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
