import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.LOW_MODEL_BASE_URL,
  apiKey: process.env.LOW_MODEL_API_KEY,
  defaultHeaders: {
    "Accept-Encoding": "identity",
    "Connection": "close",
  },
});

export async function askRouterAgent({
  messages, project
}) {

  const finalMessages = [
    {
      role: "system",
      content:
        `You are LiteCursor Router Agent.

        Project path: ${project.project_path}

Responsibilities:
- Determine whether the user is asking for information or asking LiteCursor to perform work.

Return ONLY valid JSON.

Schema:

{
  "action": "reply" | "call_pm",
  "message": "string"
}

Rules:

Use "reply" when:
- User asks a question.
- User asks for explanation.
- User asks for advice.
- User asks for architecture discussion.
- User asks for brainstorming.
- User asks about LiteCursor features.
- User asks about programming concepts.

Example:

{
  "action": "reply",
  "message": "Repository Pattern is..."
}

Use "call_pm" when:
- User wants code changed.
- User wants a bug fixed.
- User wants a new feature.
- User wants refactoring.
- User wants implementation.
- User wants project modifications.
- User wants files created, edited, deleted.
- User asks LiteCursor to perform work.

Example:

{
  "action": "call_pm",
  "message": "Implement Google Login feature."
}

Never return markdown.
Never return code fences.
Return JSON only.`,
    },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model: process.env.LOW_MODEL_NAME,
    messages: finalMessages,
    stream: false,
    stop: null,
  });

  return response.choices[0]?.message || null;
}