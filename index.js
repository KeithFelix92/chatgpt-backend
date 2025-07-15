const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const playerMemory = {};

app.post("/chat", async (req, res) => {
  const { message, playerId, timeZoneOffset } = req.body;

  if (!message || !playerId) {
    return res.status(400).json({ error: "Missing message or playerId" });
  }

  // Format local time
  const offsetMinutes = parseInt(timeZoneOffset || 0);
  const nowUtc = new Date();
  const localTime = new Date(nowUtc.getTime() + offsetMinutes * 60 * 1000);
  const contextTime = `The current local time is ${localTime.toLocaleTimeString()} on ${localTime.toDateString()}.`;

  // Maintain last 5 memory items
  if (!playerMemory[playerId]) playerMemory[playerId] = [];
  const memory = playerMemory[playerId];

  if (message:lower():find("remember") and #memory < 5) {
    const remembered = message:match("remember%s+(.+)")
    if remembered then
      table.insert(memory, remembered)
      return res.json({ reply: `ChatGPT will remember: "${remembered}"` });
    end
  }

  if (#memory >= 5) {
    return res.json({ reply: "⚠️ Error Code M1: Memory full. Please come back after a memory wipe." });
  }

  // Build chat prompt
  const prompt = [
    {
      role: "system",
      content: `You are ChatGPT in a Roblox game. Respond conversationally. ${contextTime}`,
    },
    ...memory.map(mem => ({ role: "system", content: "Remembered: " + mem })),
    { role: "user", content: message }
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4-1106-preview",
      messages: prompt,
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("ChatGPT error:", err.message);
    res.status(500).json({ error: "Failed to contact ChatGPT" });
  }
});

app.listen(3000, () => {
  console.log("✅ GPT-4.1 backend running on port 3000");
});
