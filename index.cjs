const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

const PUBLIC_USER_DATA_DIR = path.join(__dirname, "PublicUserPrivateData");

if (!fs.existsSync(PUBLIC_USER_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_USER_DATA_DIR, { recursive: true });
}

// Simulated GPT-4o-mini response (replace with OpenAI API if needed)
async function getChatGPTReply(userId, message) {
    return `Hello ${userId}, you said: ${message}`;
}

function getUserFile(userId) {
    return path.join(PUBLIC_USER_DATA_DIR, `${userId}.json`);
}

// /chat – main endpoint
app.post("/chat", async (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message) {
        return res.status(400).json({ reply: "Missing userId or message." });
    }

    const reply = await getChatGPTReply(userId, message);

    // Load old memory
    const userFile = getUserFile(userId);
    let memory = [];

    if (fs.existsSync(userFile)) {
        const content = fs.readFileSync(userFile, "utf8");
        memory = JSON.parse(content);
    }

    // Add current message
    memory.push({ role: "user", content: message });
    memory.push({ role: "assistant", content: reply });

    // Save updated memory
    fs.writeFileSync(userFile, JSON.stringify(memory, null, 2));

    res.json({ reply });
});

// /load – load memory
app.post("/load", (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const file = getUserFile(userId);
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        res.json({ memory: JSON.parse(content) });
    } else {
        res.json({ memory: [] });
    }
});

// /save – save memory manually (optional)
app.post("/save", (req, res) => {
    const { userId, memory } = req.body;
    if (!userId || !memory) return res.status(400).json({ error: "Missing userId or memory" });

    const file = getUserFile(userId);
    fs.writeFileSync(file, JSON.stringify(memory, null, 2));
    res.json({ status: "Saved" });
});

// /summarize – placeholder (or returns 404)
app.post("/summarize", (req, res) => {
    res.status(404).send("Not implemented");
});

// Start server
app.listen(port, () => {
    console.log(`✅ ChatGPT backend listening at http://localhost:${port}`);
});
