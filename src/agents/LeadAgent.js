import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.NORMAL_MODEL_BASE_URL,
  apiKey: process.env.NORMAL_MODEL_API_KEY,
  defaultHeaders: {
    "Accept-Encoding": "identity",
    "Connection": "close",
  },
});

export async function askLeadAgent({ systemPrompt, messages, project }) {
  const finalMessages = [
    {
      role: "system",
      content:
        systemPrompt ||
        `You are LiteCursor Lead Agent.

        Project path: ${project.project_path}

        Responsibilities:
        - Review only the assigned task, Dev diff summary, changed files.
        - Use the provided project_context from Tech Lead.
        - Do not inspect, scan, read files, or run commands.
        - Check correctness, architecture, security, maintainability, edge cases, and project conventions.
        - Decide whether the task is accepted or needs rework.
        - If accepted, return pass.
        - If not accepted, return clear rework instructions for Dev Agent.
        - Do not create the full project plan.
        - Do not assign the next task.
        - Do not implement code unless explicitly required by the workflow.
        - Do not ask the user for confirmation.

        Return ONLY valid JSON.

        Schema:

        {
        "status": "pass" | "rework",
        "summary": "string",
        "issues": ["string"],
        "dev_instructions": "string"
        }

        Rules:
        - Use "pass" only when the task is correctly completed.
        - Use "rework" when there are bugs, missing requirements, risky code, poor integration, or incomplete implementation.
        - dev_instructions must be specific and actionable.
        - If status is "pass", dev_instructions should be an empty string.
        - Never return markdown.
        - Never return code fences.
        - Return JSON only.`,
    },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    stream: false,
    stop: null,
    "chat_template_kwargs": {"thinking":false},
    model:
      process.env.NORMAL_MODEL_NAME,
    messages: finalMessages
  });

  return response.choices[0]?.message || null;
}
