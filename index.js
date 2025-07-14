const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4", // <-- switch here if needed
        messages: [
          {
            role: "system",
            content: "You are GPT-4. If asked, clearly identify yourself as GPT-4. Do not say you are ChatGPT 3 or 3.5."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    const modelUsed = response.data.model; // ← OpenAI confirms this
    res.json({ reply: `[${modelUsed}]\n${reply}` });
  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to contact OpenAI" });
  }
});

app.get("/", (_, res) => {
  res.send("ChatGPT backend is running ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
