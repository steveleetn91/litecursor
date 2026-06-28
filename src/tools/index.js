import {
  listFiles,
  readFile,
  writeFile,
  replaceInFile,
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
    run: async ({ path, content, overwrite_existing = false }) => {
      return writeFile(path, content, {
        overwriteExisting: overwrite_existing,
      });
    }
  },

  replace_in_file: {
    description: "Replace an exact text block inside an existing project file.",
    run: async ({ path, old_content, new_content, replace_all = false }) => {
      return replaceInFile(path, old_content, new_content, {
        replaceAll: replace_all,
      });
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
    throw `Tool does not exist: ${name}`;
  }

  return await tool.run(args);
}
