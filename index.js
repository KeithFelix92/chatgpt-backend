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
        model: "gpt-4", // <- GPT-4 model enabled
        messages: [
          {
            role: "system",
            content: "You are GPT-4. Respond concisely and accurately. Identify yourself truthfully if asked."
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
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to contact OpenAI" });
  }
});

app.get("/", (req, res) => {
  res.send("ChatGPT backend is running ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
