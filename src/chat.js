import "dotenv/config";
import inquirer from "inquirer";
import { select } from "@inquirer/prompts";
import { clearMessages, getMessages, getProjects, saveMessage, saveProject } from "./db.js";
import { runTool } from "./tools/index.js";
import {
  assistantLine,
  divider,
  drawHeader,
  error,
  info,
  userLine
} from "./ui.js";
import { askRouterAgent } from "./agents/RouterAgent.js";
import { askPMAgent } from "./agents/PMAgent.js";
import { askTechLeadAgent } from "./agents/TechLeadAgent.js";
import { askDevAgent } from "./agents/DevAgent.js";
//import { askTestAgent } from "./agents/TestAgent.js";
import { askLeadAgent } from "./agents/LeadAgent.js";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";

let project = null;

const MAX_TOOL_ITERATIONS = 39;
const MAX_REWORK_ROUNDS = 9;

export function parseAgentJson(message, agentName) {
  const content = message?.content || "{}";

  try {

    return JSON.parse(content);
  } catch (e) {
    //throw new Error(`${agentName} returned invalid JSON. ${content}`);
    const repaired = jsonrepair(content);
    return JSON.parse(repaired);
  }
}

export function stringify(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function summarizeArgs(args) {
  const summary = { ...args };
  const longFields = ["content", "old_content", "new_content"];

  for (const field of longFields) {
    if (typeof summary[field] === "string" && summary[field].length > 80) {
      summary[field] = `${summary[field].slice(0, 80)}...`;
    }
  }

  return stringify(summary);
}

export async function runAgentWithTools(agentName, askAgent, messages, project) {
  const transcript = [...messages];

  for (let index = 0; index < MAX_TOOL_ITERATIONS; index += 1) {
    const response = await askAgent({ messages: transcript, project: project });

    if (!response) {
      throw `${agentName} did not return a response.`;
    }

    transcript.push(response);

    const toolCalls = response.tool_calls || [];

    if (toolCalls.length === 0) {
      return {
        message: response,
        transcript,
      };
    }

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name;
      const rawArgs = toolCall.function?.arguments || "{}";
      let args = {};

      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {};
      }

      let result;

      //info(`${agentName} tool: ${name} ${summarizeArgs(args)}`);

      try {
        result = await runTool(name, args);
      } catch (err) {
        result = `TOOL ERROR: ${err?.message || "Unknown tool error."}`;
      }

      transcript.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: stringify(result),
      });
    }
  }

  throw `${agentName} exceeded the tool iteration limit.`;
}

function quotePath(filePath) {
  return `'${String(filePath).replaceAll("'", "'\\''")}'`;
}

async function getDiffSummary(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return "No target files were provided.";
  }

  const command = `git diff --stat -- ${files.map(quotePath).join(" ")}`;
  const result = await runTool("run_command", {
    command,
    timeout: 10000,
  });

  return result || "No diff summary available.";
}

function extractStdout(commandResult) {
  const marker = "STDOUT:\n";
  const index = String(commandResult).indexOf(marker);

  if (index === -1) {
    return "";
  }

  const stdout = String(commandResult).slice(index + marker.length);
  const stderrIndex = stdout.indexOf("\nSTDERR:\n");

  return stderrIndex === -1 ? stdout.trim() : stdout.slice(0, stderrIndex).trim();
}

async function getChangedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const command = `git status --short -- ${files.map(quotePath).join(" ")}`;
  const result = await runTool("run_command", {
    command,
    timeout: 10000,
  });
  const stdout = extractStdout(result);
  const changedFiles = stdout
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean);

  return changedFiles.length ? changedFiles : files;
}

function createDevMessages({ projectContext, task, reworkInstructions }) {
  const content = {
    project_context: projectContext,
    technical_task: {
      id: task.id,
      pm_task_id: task.pm_task_id,
      title: task.title,
      description: task.description,
      read_files: task.read_files || [],
      target_files: task.target_files || [],
      allowed_actions: task.allowed_actions || [],
      technical_instructions: task.technical_instructions || [],
      constraints: task.constraints || [],
      acceptance_criteria: task.acceptance_criteria || [],
    },
  };

  if (reworkInstructions) {
    content.lead_rework_instructions = reworkInstructions;
  }

  return [
    {
      role: "user",
      content: `Work on exactly this technical task:\n${stringify(content)}`,
    },
  ];
}

function createTestMessages({ changedFiles, verificationCommands }) {
  return [
    {
      role: "user",
      content: `Test only these changed files using only these commands:\n${stringify({
        changed_files: changedFiles,
        verification_commands: verificationCommands,
      })}`,
    },
  ];
}

function createLeadMessages({ projectContext, task, changedFiles, diffSummary }) {
  return [
    {
      role: "user",
      content: `Review this completed task using only the provided context:\n${stringify({
        project_context: projectContext,
        task,
        changed_files: changedFiles,
        diff_summary: diffSummary,
        //test_result: testResult,
      })}`,
    },
  ];
}

export const loopWork = async (tasks, projectContext,callback = null,project) => {
  const results = [];

  for (const task of tasks) {
    let reworkInstructions = "";

    for (let round = 1; round <= MAX_REWORK_ROUNDS; round += 1) {
      callback(`Dev is working on task ${task.id} (${round}/${MAX_REWORK_ROUNDS}): ${task.title}`);
      const dev = await runAgentWithTools(
        "DevAgent",
        askDevAgent,
        createDevMessages({
          projectContext,
          task,
          reworkInstructions,
        }),
        project
      );

      const changedFiles = await getChangedFiles(task.target_files || []);
      const diffSummary = await getDiffSummary(changedFiles);
      const verificationCommands = task.verification_commands || [];

      callback(`Test is checking task ${task.id} (${round}/${MAX_REWORK_ROUNDS}): ${task.title}`);
      const testMessages = createTestMessages({
        changedFiles,
        verificationCommands,
      });
      //const test = await runAgentWithTools("TestAgent", askTestAgent, testMessages);

      callback(`Lead is reviewing task ${task.id} (${round}/${MAX_REWORK_ROUNDS}): ${task.title}`);
      const leadMessages = createLeadMessages({
        projectContext,
        task,
        changedFiles,
        diffSummary,
        //testResult: test.message.content || "",
      });
      const lead = await runAgentWithTools("LeadAgent", askLeadAgent, leadMessages, project);
      const leadReview = parseAgentJson(lead.message, "LeadAgent");

      if (leadReview.status === "pass") {
        results.push({
          task,
          status: "pass",
          dev: dev.message.content || "",
          //test: test.message.content || "",
          diffSummary,
          changedFiles,
          lead: leadReview,
        });
        break;
      }

      reworkInstructions = leadReview.dev_instructions || leadReview.summary || "";
      callback(`Lead rework for task ${task.id}: ${reworkInstructions}`);

      if (round === MAX_REWORK_ROUNDS) {
        results.push({
          task,
          status: "rework",
          dev: dev.message.content || "",
          //test: test.message.content || "",
          diffSummary,
          changedFiles,
          lead: leadReview,
        });
      } else {
        callback(`Lead requested rework for task ${task.id}. Re-running Dev.`);
      }
    }
  }

  return results;
};

export function summarizeWorkflow(pmPlan, techPlan, taskResults) {
  const failedTasks = taskResults.filter((result) => result.status !== "pass");
  const completedTasks = taskResults.filter((result) => result.status === "pass");

  const lines = [
    pmPlan.summary,
    techPlan.summary,
    "",
    `Completed tasks: ${completedTasks.length}/${taskResults.length}`,
  ];

  for (const result of taskResults) {
    lines.push(`- Task ${result.task.id}: ${result.task.title} - ${result.status}`);

    if (result.lead?.summary) {
      lines.push(`  Lead: ${result.lead.summary}`);
    }

    if (result.status !== "pass" && result.lead?.issues?.length) {
      lines.push(`  Issues: ${result.lead.issues.join("; ")}`);
    }
  }

  if (failedTasks.length) {
    lines.push("");
    lines.push("Some tasks still need rework after the retry limit.");
  }

  return lines.join("\n");
}

export async function callAIWithTools(history,callback = null, project) {
  let messages = [...history];
  const routerAgent = await askRouterAgent({
    messages: messages,
    project: project
  });

  if (!routerAgent?.content) {
    throw "RouterAgent did not return a response.";
  }

  const routerResponse = parseAgentJson(routerAgent, "RouterAgent");

  if (routerResponse.action === "reply") {
    return routerResponse.message || "";
  }

  callback("Project manager is planning...");
  const pmAgent = await askPMAgent({
    messages: [
      ...messages,
      {
        role: "user",
        content: routerResponse.message || "Create a plan for the user's request.",
      },
    ],
    project: project
  });

  if (!pmAgent?.content) {
    throw "PMAgent did not return a response.";
  }

  const plan = parseAgentJson(pmAgent, "PMAgent");

  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    throw "PMAgent did not return any tasks.";
  }

  callback(`Project manager created ${plan.tasks.length} task(s).`)

  callback("Tech lead is converting the PM plan into technical tasks...")
  const techLead = await runAgentWithTools(
    "TechLeadAgent",
    askTechLeadAgent,
    [
      ...messages,
      {
        role: "user",
        content: `Convert this PM plan into technical implementation tasks:\n${stringify(plan)}`,
      },
    ]
  );

  const technicalPlan = parseAgentJson(techLead.message, "TechLeadAgent");

  if (!Array.isArray(technicalPlan.technical_tasks) || technicalPlan.technical_tasks.length === 0) {
    throw "TechLeadAgent did not return any technical tasks.";
  }

  callback(`Tech lead created ${technicalPlan.technical_tasks.length} technical task(s).`);

  const taskResults = await loopWork(
    technicalPlan.technical_tasks,
    technicalPlan.project_context || {},
    callback 
  );

  return summarizeWorkflow(plan, technicalPlan, taskResults);
}

const createProject = async () => {
  const { project_path } = await inquirer.prompt([
    {
      type: "input",
      name: "project_path",
      message: "Project path:"
    }
  ]);
  await saveProject(project_path);
}

const chatAction = async (input,project_id) => {
  await saveMessage("user", input, project_id);

  const history = await getMessages(20, project_id);

  info("LiteCursor is thinking...");

  const answer = await callAIWithTools(history);

  await saveMessage("assistant", answer, project_id);
  return answer;
}

async function main() {
  drawHeader();
  let listProjects = await getProjects();
  while (true) {
    if (!project) {
      if (listProjects.length === 0) {
        await createProject();
        listProjects = await getProjects();
      } else {
        const createNewProject = await select({
          message: "Create new project",
          choices: [
            {
              name: 'Yes',
              value: 1
            },
            {
              name: 'No',
              value: 2
            }
          ],
        });
        if (Number(createNewProject) === 1) {
          await createProject();
          listProjects = await getProjects();
        }
      }

      const selectProjectKey = await select({
        message: "Select Projects",
        choices: listProjects.map((item, index) => {
          return {
            name: item.project_path,
            value: index
          }
        }),
      });
      project = listProjects[selectProjectKey];

    }
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
      await clearMessages(project.id);
      drawHeader();
      info("Chat history cleared.");
      continue;
    }

    try {
      userLine(input);
      const answer = await chatAction(input,project.id);

      assistantLine(answer);
      divider();
    } catch (err) {
      error(err?.message || "An error occurred.");
    }
  }
}

//main();
