import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";
import { requireProjectPath } from "./filesystem.js";
import { parse } from "shell-quote";
import fs from "fs";
import path from "path";
import { getProjectPath } from "./filesystem.js";
const execAsync = promisify(exec);

const BLOCKED_COMMANDS = [
  "rm -rf /",
  "mkfs",
  "shutdown",
  "reboot",
  ":(){",
  "dd if=",
  "sudo rm",
];

export async function runCommand(command, options = {}) {
  let basePath = getProjectPath() || process.cwd();
  let cwd = options.cwd || basePath;
  const timeout = Number(options.timeout || process.env.COMMAND_TIMEOUT_MS || 30000);

  if (!path.isAbsolute(cwd)) {
    cwd = path.resolve(basePath, cwd);
  }

  if (!fs.existsSync(cwd)) {
    return `COMMAND FAILED: ${command}\nCWD: ${cwd}\nERROR:\nWorking directory does not exist`;
  }

  const parts = parse(command).filter(x => typeof x === "string");
  const bin = parts[0];
  const args = parts.slice(1);

  return await new Promise((resolve) => {
    let finished = false;
    const child = spawn(bin, args, {
      cwd,
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", data => stdout += data.toString());
    child.stderr?.on("data", data => stderr += data.toString());

    const timer = setTimeout(() => {
      if (finished) return;

      finished = true;
      child.kill("SIGTERM");
      resolve([
        `COMMAND TIMED OUT: ${command}`,
        `CWD: ${cwd}`,
        `TIMEOUT_MS: ${timeout}`,
        stdout ? `STDOUT:\n${stdout}` : "",
        stderr ? `STDERR:\n${stderr}` : ""
      ].filter(Boolean).join("\n"));
    }, timeout);

    child.on("error", err => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      resolve(`COMMAND FAILED: ${command}\nCWD: ${cwd}\nERROR:\n${err.message}`);
    });

    child.on("close", code => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      resolve([
        `COMMAND: ${command}`,
        `CWD: ${cwd}`,
        `EXIT_CODE: ${code}`,
        stdout ? `STDOUT:\n${stdout}` : "",
        stderr ? `STDERR:\n${stderr}` : ""
      ].filter(Boolean).join("\n"));
    });
  });
}
