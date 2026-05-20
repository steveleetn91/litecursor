import {
  listFiles,
  readFile,
  writeFile,
  fileExists,
  getProjectPath
} from "./filesystem.js";

import { runCommand } from "./terminal.js";

export const tools = {
  get_project_path: {
    description: "Check the current project path.",
    run: async () => {
      return getProjectPath() || "PROJECT_PATH is not set.";
    }
  },

  list_files: {
    description: "List files in the project.",
    run: async ({ dir = ".", max = 200 }) => {
      return listFiles(dir, max).join("\n");
    }
  },

  read_file: {
    description: "Read the content of a file in the project.",
    run: async ({ path }) => {
      return readFile(path);
    }
  },

  write_file: {
    description: "Write content to a file in the project.",
    run: async ({ path, content }) => {
      return writeFile(path, content);
    }
  },

  file_exists: {
    description: "Check whether a file exists.",
    run: async ({ path }) => {
      return fileExists(path) ? "true" : "false";
    }
  },

  run_command: {
    description: "Run a command line command.",
    name: "run_command",
    run: async ({ command, cwd, timeout }) => {
      return await runCommand(command, { cwd, timeout });
    }
  }
};

export async function runTool(name, args = {}) {
  const tool = tools[name];

  if (!tool) {
    throw new Error(`Tool does not exist: ${name}`);
  }

  return await tool.run(args);
}