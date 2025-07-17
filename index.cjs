const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(bodyParser.json());

// Ensure the memory folder exists
const memoryFolder = path.join(__dirname, "PublicUserPrivateData");
if (!fs.existsSync(memoryFolder)) fs.mkdirSync(memoryFolder);

// -- Chat endpoint
app.post("/chat", async (req, res) => {
  const { userId, messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).send("Error with GPT chat");
  }
});

// -- Summarize endpoint
app.post("/summarize", async (req, res) => {
  const { userId, memory } = req.body;

  const system = `You are a memory summarizer for a Roblox AI assistant. Summarize the following JSON memory into a concise, useful summary to help the assistant remember important details.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(memory) },
      ],
    });

    const summary = completion.choices[0].message.content;

    // Save summarized memory locally
    const savePath = path.join(memoryFolder, `${userId}.txt`);
    fs.writeFileSync(savePath, summary);

    res.json({ summarizedMemory: summary });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(404).send("Failed to summarize");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
