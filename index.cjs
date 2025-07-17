const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { OpenAI } = require("openai");

const app = express();
const port = process.env.PORT || 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());

const DATA_DIR = path.join(__dirname, "PublicUserPrivateData");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { userId, messages } = req.body;
    let memoryText = "";
    const memoryFile = path.join(DATA_DIR, `${userId}.txt`);

    if (fs.existsSync(memoryFile)) {
      memoryText = fs.readFileSync(memoryFile, "utf-8");
    }

    const fullMessages = [
      {
        role: "system",
        content:
          "You are ChatGPT helping a Roblox player. Remember this memory:\n" +
          memoryText,
      },
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: fullMessages,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});

// Save endpoint
app.post("/save", (req, res) => {
  try {
    const { userId, memory } = req.body;
    const filePath = path.join(DATA_DIR, `${userId}.txt`);
    fs.writeFileSync(filePath, memory, "utf-8");
    res.json({ success: true });
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Save failed" });
  }
});

// Load endpoint
app.post("/load", (req, res) => {
  try {
    const { userId } = req.body;
    const filePath = path.join(DATA_DIR, `${userId}.txt`);
    if (!fs.existsSync(filePath)) {
      return res.json({ memory: "" });
    }
    const data = fs.readFileSync(filePath, "utf-8");
    res.json({ memory: data });
  } catch (error) {
    console.error("Load error:", error);
    res.status(500).json({ error: "Load failed" });
  }
});

// Summarize endpoint
app.post("/summarize", async (req, res) => {
  try {
    const { userId, memory } = req.body;
    const promptMessages = [
      {
        role: "system",
        content:
          "Summarize this memory concisely for future interactions:",
      },
      { role: "user", content: memory },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: promptMessages,
    });

    const summarized = completion.choices[0].message.content;
    res.json({ summary: summarized });
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: "Summarization failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
