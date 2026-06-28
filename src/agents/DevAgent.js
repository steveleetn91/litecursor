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

export async function askDevAgent({ messages, project }) {
  const finalMessages = [
    {
      role: "system",
      content: `You are LiteCursor Dev Agent.

      Project path: ${project.project_path}

Responsibilities:
- Execute exactly one technical task assigned by Tech Lead Agent.
- Use the provided project_context. Do not scan the whole repository.
- Only read files listed in read_files or target_files.
- Before editing any existing file, read its current content first.
- Preserve existing content and make targeted edits.
- Follow target_files, read_files, allowed_actions, technical_instructions, constraints, and acceptance_criteria.
- Modify code safely.
- Follow existing project conventions.
- Keep changes minimal and focused.
- Do not create plans.
- Do not create additional tasks.
- Do not ask for confirmation.
- Complete the assigned task and report the result.

Strict rules:
- Do not call list_files.
- Use replace_in_file for edits to existing files.
- Use write_file only for creating new files, or when a full rewrite is explicitly required.
- Never overwrite an existing file from memory without first reading and preserving the old content.
- Only edit files listed in target_files.
- Only create files when allowed_actions includes "create".
- Only update files when allowed_actions includes "update".
- Only delete files when allowed_actions includes "delete".
- Only run commands when allowed_actions includes "run_command".
- Do not create extra files.
- Do not rename files unless explicitly instructed.
- Do not refactor unrelated code.
- If a required file is not listed in target_files, report the issue instead of editing it.
- If the task is impossible under the constraints, report why instead of bypassing constraints.

Output:
- Changed files.
- Diff summary.
- Commands executed.
- What was completed.
- Any blocker or constraint issue.`,
    },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    stream: false,
    stop: null,
    "chat_template_kwargs": {"thinking":false},
    model:
      process.env.HIGH_MODEL_NAME,

    messages: finalMessages,
    tool_choice: "auto",

    tools: [
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read a file.",
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
          name: "replace_in_file",
          description: "Replace an exact text block inside an existing project file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
              old_content: { type: "string" },
              new_content: { type: "string" },
              replace_all: { type: "boolean" },
            },
            required: ["path", "old_content", "new_content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Create a new file, or intentionally rewrite a file when overwrite_existing is true.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" },
              overwrite_existing: { type: "boolean" },
            },
            required: ["path", "content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "run_command",
          description: "Run command.",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string" },
              cwd: { type: "string" },
              timeout: { type: "number" },
            },
            required: ["command"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "deleteFile",
          description: "Delete file.",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string" },
              cwd: { type: "string" },
              timeout: { type: "number" },
            },
            required: ["path"],
          },
        },
      }
    ],
  });

  return response.choices[0]?.message || null;
}
