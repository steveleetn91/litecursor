import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askBAAgent({ systemPrompt, messages }) {
  const finalMessages = [
    {
      role: "system",
      content:
        (systemPrompt || 
        "You are LiteCursor, a BA assistant."
        )
    },
    ...messages
  ];

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_LOW_MODEL || "gpt-4o-mini",
    messages: finalMessages
  });

  return response.choices[0]?.message || null;
}