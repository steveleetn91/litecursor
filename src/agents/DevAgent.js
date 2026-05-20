import "dotenv/config";
import OpenAI from "openai";
import {askSkill} from "./SkillAgent.js";
import fs from "fs";
import {
  assistantLine,
  divider,
  drawHeader,
  error,
  info,
  userLine
} from "../ui.js";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function loadSkills(messages) {
   const skills = await askSkill(messages);
   const skillArray =  skills?.content ? JSON.parse(skills.content) : [];
   let skillData = "";
   for (const skill of skillArray) {
     skillData += fs.readFileSync(`./src/skills/${skill}/prompt.md`, "utf-8");
   }
   info(`Selected skills: ${skillArray.join(", ")}`);
   return skillData;
}

export async function askDeveloper({ systemPrompt, messages }) {
  const finalMessages = [
    {
      role: "system",
      content:
        (systemPrompt ||
        `
        You are LiteCursor, a Senior Developer with 5 years of experience. When you receive a request, you must execute it
        without asking again.
        `) +
        (await loadSkills(messages))
        +
        "Project directory: " + (process.env.PROJECT_PATH || "unknown")
    },
    ...messages
  ];

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    messages: finalMessages,
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
              max: { type: "number" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read the content of a file in the project.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" }
            },
            required: ["path"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Write content to a file in the project.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" }
            },
            required: ["path", "content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "file_exists",
          description: "Check whether a file exists.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" }
            },
            required: ["path"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "run_command",
          description: "Run a command line command.",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string" },
              cwd: { type: "string" },
              timeout: { type: "number" }
            },
            required: ["command"]
          }
        }
      }
    ]
  });

  return response.choices[0]?.message || null;
}