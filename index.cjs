const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;
const MEMORY_FOLDER = path.join(__dirname, "PublicUserPrivateData");

app.use(bodyParser.json());

// Ensure memory folder exists
if (!fs.existsSync(MEMORY_FOLDER)) {
    fs.mkdirSync(MEMORY_FOLDER, { recursive: true });
}

// POST /chat – sends messages to OpenAI and returns response
app.post("/chat", async (req, res) => {
    const { messages, userId } = req.body;
    if (!messages || !userId) return res.status(400).json({ error: "Missing messages or userId" });

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error });

        res.json({ content: data.choices[0].message.content });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ error: "Chat failed" });
    }
});

// POST /save – saves memory for a specific user
app.post("/save", (req, res) => {
    const { userId, memory } = req.body;
    if (!userId || !memory) return res.status(400).json({ error: "Missing userId or memory" });

    try {
        const filePath = path.join(MEMORY_FOLDER, `${userId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error("Save error:", err);
        res.status(500).json({ error: "Save failed" });
    }
});

// GET /load?userId=... – loads memory for a specific user
app.get("/load", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
        const filePath = path.join(MEMORY_FOLDER, `${userId}.json`);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "No memory found" });

        const memory = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        res.json({ memory });
    } catch (err) {
        console.error("Load error:", err);
        res.status(500).json({ error: "Load failed" });
    }
});

// POST /summarize – summarizes user memory
app.post("/summarize", async (req, res) => {
    const { memory, userId } = req.body;
    if (!memory || !userId) return res.status(400).json({ error: "Missing memory or userId" });

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Summarize this player's memory concisely but keep important details for continuing future conversations. Output JSON only."
                    },
                    {
                        role: "user",
                        content: JSON.stringify(memory)
                    }
                ],
                temperature: 0.5
            })
        });

        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error });

        const summarized = data.choices[0].message.content;
        const filePath = path.join(MEMORY_FOLDER, `${userId}.json`);
        fs.writeFileSync(filePath, summarized);
        res.json({ summary: summarized });
    } catch (err) {
        console.error("Summarize error:", err);
        res.status(500).json({ error: "Summarize failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
