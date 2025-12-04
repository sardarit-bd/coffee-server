import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({
    origin: ['https://coffee-mocha-chi.vercel.app']
}))

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// get path relative to this file
const coffeesPath = path.join(__dirname, "../data/coffees.json");
const pastriesPath = path.join(__dirname, "../data/pastries.json");


// Load data
const coffees = JSON.parse(fs.readFileSync(coffeesPath, "utf8"));
const pastries = JSON.parse(fs.readFileSync(pastriesPath, "utf8"));


// Helper to format pastries for AI
function formatPastries(pastries) {
  return pastries.map(p => `${p.name} (${p.flavors.join(", ")})`).join(", ");
}

app.get("/", (req, res) => {
  res.send("Coffee-Pastry Pairing API is running.");
});

app.post("/api/pairing", async (req, res) => {
  try {
    const { prompt } = req.body;

    const coffeeContext = coffees.map(c => `${c.name}: ${c.tastingNotes.join(", ")}`).join("\n");
    const pastryContext = formatPastries(pastries);

    const systemMessage = `
You are a coffee + pastry pairing assistant.
Coffee data:
${coffeeContext}

Pastry data:
${pastryContext}

Return the top 2–3 pastries that match the coffee, with reasoning. 
ONLY respond in JSON using this structure:
{
  "coffee": "...",
  "pairing": [
    {"pastry": "...", "reason": "..."},
    ...
  ]
}
`;

    // Call OpenAI GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.5
    });

    let aiOutput = response.choices[0].message.content;

    // Clean code blocks if present
    aiOutput = aiOutput.replace(/```json|```/g, "").trim();

    let jsonOutput;
    try {
      jsonOutput = JSON.parse(aiOutput);
    } catch (err) {
      jsonOutput = { error: "AI did not return valid JSON", raw: aiOutput, parser_error: err.message };
    }

    res.json(jsonOutput);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
});


if(process.env.ENVAIRONMENT == 'development'){
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
