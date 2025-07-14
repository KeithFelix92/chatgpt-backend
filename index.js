const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// Store chat memory in RAM per session (can be expanded later)
let chatHistory = [
  {
    role: "system",
    content: "You are GPT-4. You remember everything in this session and answer in a helpful, truthful way. Identify yourself as GPT-4 if asked."
  }
];

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Add new user message to chat history
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

    // Save GPT's reply to memory too
    chatHistory.push({ role: "assistant", content: gptReply });

    // Tag response with model name
    const modelUsed = response.data.model;
    res.json({ reply: `[${modelUsed}]\n${gptReply}` });

  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to contact OpenAI" });
  }
});

app.get("/", (_, res) => {
  res.send("ChatGPT backend with memory is running ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
