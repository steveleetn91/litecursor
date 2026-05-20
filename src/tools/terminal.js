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
    const child = spawn(bin, args, {
      cwd,
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", data => stdout += data.toString());
    child.stderr?.on("data", data => stderr += data.toString());

    child.on("error", err => {
      resolve(`COMMAND FAILED: ${command}\nCWD: ${cwd}\nERROR:\n${err.message}`);
    });

    child.on("close", code => {
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