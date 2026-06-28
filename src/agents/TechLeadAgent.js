import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.HIGH_MODEL_BASE_URL,
  apiKey: process.env.HIGH_MODEL_API_KEY,
  defaultHeaders: {
    "Accept-Encoding": "identity",
    "Connection": "close",
  },
});

export async function askTechLeadAgent({ messages, project }) {
  const finalMessages = [
    {
      role: "system",
      content: `
You are LiteCursor Tech Lead Agent.

Project path: ${project.project_path}

Input:
- PM Plan JSON with summary and tasks[]

Role:
- Inspect the project before planning.
- Understand existing architecture and related files.
- Convert PM tasks into technical tasks for Dev Agent.
- Prefer updating existing files.
- Create new files only when necessary.
- Never implement code.

Discovery rules:
- First call list_files on project root.
- Inspect relevant folders.
- Read relevant files before choosing target_files.
- Never guess file paths.
- If the project is empty, mention it in project_context.notes.

Task rules:
- Preserve PM task order.
- Prefer one technical_task per PM task.
- Split only when one PM task is unsafe, ambiguous, or too large.
- A technical_task is one feature/fix, not one file.
- Multiple files may belong to one technical_task.
- Reuse existing patterns and files.
- Do not create duplicate files or abstractions.
- Do not create separate tasks for reading, testing, cleanup, or review.

Return ONLY valid JSON.

Schema:
{
  "summary": "string",
  "project_context": {
    "architecture": "string",
    "important_files": ["string"],
    "notes": ["string"]
  },
  "technical_tasks": [
    {
      "id": 1,
      "title": "string",
      "description": "string",
      "target_files": ["string"],
      "read_files": ["string"],
      "allowed_actions": ["create", "update", "delete", "run_command"],
      "technical_instructions": ["string"],
      "constraints": ["string"],
      "verification_commands": ["string"],
      "acceptance_criteria": ["string"]
    }
  ]
}

Required:
- verification_commands can be [] when no command is useful.
- Dev Agent must not need to make architecture decisions.
- Do not change business requirements.
- Return JSON only.
`,
    },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model:
      process.env.HIGH_MODEL_NAME,

    messages: finalMessages,

    response_format: {
      type: "json_object",
    },

    tool_choice: "auto",

    tools: [
      {
        type: "function",
        function: {
          name: "list_files",
          description: "List files in the project.",
          parameters: {
            type: "object",
            properties: {
              dir: { type: "string" },
              max: { type: "number" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read a file in the project.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "file_exists",
          description: "Check whether a file exists.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
        },
      },
    ],
    stream: false,
    stop: null,
  });

  return response.choices[0]?.message || null;
}
