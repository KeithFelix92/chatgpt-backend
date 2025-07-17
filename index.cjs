const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// GPT client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in your Render environment settings
});

// Save memory to local folder
app.post("/save", (req, res) => {
  const { userId, memory } = req.body;
  if (!userId || !memory) {
    return res.status(400).json({ error: "Missing userId or memory" });
  }

  const folderPath = path.join(__dirname, "PublicUserPrivateData");
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  const filePath = path.join(folderPath, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
  console.log(`[SAVE] Memory saved for user ${userId}`);
  res.json({ success: true });
});

// Load memory from local folder
app.post("/load", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const filePath = path.join(__dirname, "PublicUserPrivateData", `${userId}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`[LOAD] No memory found for user ${userId}`);
    return res.json({ memory: {} });
  }

  const memory = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`[LOAD] Memory loaded for user ${userId}`);
  res.json({ memory });
});

// Summarize memory
app.post("/summarize", async (req, res) => {
  const { userId, memory } = req.body;
  if (!userId || !memory) {
    return res.status(400).json({ error: "Missing userId or memory" });
  }

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Summarize the user's memory into concise and meaningful bullet points. Keep important details. Don't repeat old summaries.",
        },
        {
          role: "user",
          content: JSON.stringify(memory),
        },
      ],
    });

    const summarized = result.choices[0].message.content;
    console.log(`[SUMMARIZE] Memory summarized for user ${userId}`);
    res.json({ summarizedMemory: summarized });
  } catch (err) {
    console.error(`[SUMMARIZE] Failed for user ${userId}:`, err);
    res.status(500).json({ error: "Failed to summarize memory" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
