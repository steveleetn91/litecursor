import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

export function scanDirectories(rootPath) {
  const results = [];

  const items = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      results.push(item.name);
    }
  }

  return results;
}

const skillsDir = path.resolve("src/skills");

const folders = scanDirectories(skillsDir);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askSkill(messages) {
  const finalMessages = [
    {
      role: "system",
      content:
        `
        You are a Skill Router Agent for LiteCursor.

        Your job is to choose the best skill for the user's request.

        Rules:
        - Return only one skill name.
        - Do not explain.
        - If no skill matches, return [].

        Skills: ${folders.join(", ")}

        Format return as JSON: ["skill1", "skill2"]

        ` +
        "Project directory: " + (process.env.PROJECT_PATH || "unknown")
    },
    ...messages
  ];

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_LOW_MODEL || "gpt-4o-mini",
    messages: finalMessages
  });

  return response.choices[0]?.message || null;
}