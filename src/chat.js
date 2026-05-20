import "dotenv/config";
import inquirer from "inquirer";
import { askDeveloper } from "./agents/DevAgent.js";
import { clearMessages, getMessages, saveMessage } from "./db.js";
import { runTool } from "./tools/index.js";
import {
  assistantLine,
  divider,
  drawHeader,
  error,
  info,
  userLine
} from "./ui.js";
import { askBAAgent } from "./agents/BAAgent.js";

async function callAIWithTools(history) {
  let messages = [...history];
  const maxRounds = 8;

  for (let round = 0; round < maxRounds; round++) {
    const devMessage = await askDeveloper({
      systemPrompt: `
${process.env.SYSTEM_PROMPT}

You are the Developer Agent.
If after reviewing the tool result you still need to run more tools to complete the request, continue calling tools.
If there are enough results, reply briefly in text that the task is done.
Do not say "I will run" if you have not called the tool yet.
`,
      messages
    });

    // If Dev no longer calls tools => then transfer to BA
    if (!devMessage?.tool_calls?.length) {
      messages.push(devMessage);

      const baMessage = await askBAAgent({
        systemPrompt: `
You are the BA Agent of LiteCursor.
You receive the full history, including the user request, tool calls, and tool results that were actually executed.
Reply to the user in natural language, briefly.
Do not say "I will run", "I will do it", or "please wait".
Only state what was done, which command/file/tool was run, and the final result.
If a tool reports an error that has not been fixed, briefly explain the error and suggest the next step.
`,
        messages
      });

      return baMessage?.content || devMessage?.content || "";
    }

    messages.push(devMessage);

    for (const toolCall of devMessage.tool_calls) {
      const name = toolCall.function.name;
      let args = {};

      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      info(`Running tool: ${name}`);

      let result = "";

      try {
        result = await runTool(name, args);
      } catch (err) {
        result = `Tool error: ${err?.message || "Unknown error"}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          tool: name,
          args,
          result
        })
      });
    }
  }

  const baMessage = await askBAAgent({
    systemPrompt: `
You are the BA Agent of LiteCursor.
The agent has reached the tool round limit.
Briefly summarize which tools were run, the current result, and the next step to take.
Do not say that you will continue running tools.
`,
    messages
  });

  return baMessage?.content || "Tool processing round limit reached.";
}

async function main() {
  drawHeader();

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: "input",
        name: "message",
        message: "You:"
      }
    ]);

    const input = String(message || "").trim();

    if (!input) continue;

    if (input === "/exit") {
      info("Bye haha.");
      process.exit(0);
    }

    if (input === "/clear") {
      await clearMessages();
      drawHeader();
      info("Chat history cleared.");
      continue;
    }

    try {
      userLine(input);
      await saveMessage("user", input);

      const history = await getMessages(20);

      info("LiteCursor is thinking...");

      const answer = await callAIWithTools(history);

      await saveMessage("assistant", answer);

      assistantLine(answer);
      divider();
    } catch (err) {
      error(err?.message || "An error occurred.");
    }
  }
}

main();