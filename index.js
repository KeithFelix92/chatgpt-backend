import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder where memory is stored
const memoryDir = path.join(__dirname, "PublicUserPrivateData");
if (!fs.existsSync(memoryDir)) {
	fs.mkdirSync(memoryDir, { recursive: true });
}

// Initialize OpenAI with your key
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

// Chat endpoint
app.post("/chat", async (req, res) => {
	try {
		const { message, playerId } = req.body;

		// Load memory if it exists
		const memoryFile = path.join(memoryDir, `${playerId}.txt`);
		let memoryContext = "";

		if (fs.existsSync(memoryFile)) {
			memoryContext = fs.readFileSync(memoryFile, "utf8");
		}

		// Build prompt
		const messages = [
			{ role: "system", content: `You are ChatGPT in a Roblox game. This is the memory of the player: ${memoryContext}` },
			{ role: "user", content: message }
		];

		const response = await openai.chat.completions.create({
			model: "gpt-4-1106-preview",
			messages: messages,
			temperature: 0.7
		});

		const reply = response.choices[0].message.content;
		res.json({ reply });

	} catch (err) {
		console.error("Chat error:", err);
		res.status(500).json({ reply: "Sorry, something went wrong." });
	}
});

// Save memory endpoint
app.post("/memory", async (req, res) => {
	try {
		const { playerId, memory } = req.body;

		const filePath = path.join(memoryDir, `${playerId}.txt`);
		fs.writeFileSync(filePath, memory);

		res.json({ status: "Saved" });
	} catch (err) {
		console.error("Memory save error:", err);
		res.status(500).json({ error: "Failed to save memory" });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`✅ Backend listening on port ${port}`);
});
