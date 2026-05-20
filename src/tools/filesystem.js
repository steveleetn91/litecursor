import fs from "fs";
import path from "path";

export function getProjectPath() {
  return process.env.PROJECT_PATH?.trim() || null;
}

export function requireProjectPath() {
  const projectPath = getProjectPath();

  if (!projectPath) {
    throw new Error("PROJECT_PATH is not set. Please ask the user for the project path first.");
  }

  if (!fs.existsSync(projectPath)) {
    throw new Error(`PROJECT_PATH does not exist: ${projectPath}`);
  }

  return projectPath;
}

export function resolveProjectFile(filePath) {
  const projectPath = requireProjectPath();
  const fullPath = path.resolve(projectPath, filePath);
  const rootPath = path.resolve(projectPath);

  if (!fullPath.startsWith(rootPath)) {
    throw new Error("Accessing files outside PROJECT_PATH is not allowed.");
  }

  return fullPath;
}

export function listFiles(dir = ".", max = 200) {
  const projectPath = requireProjectPath();
  const startDir = path.resolve(projectPath, dir);
  const results = [];

  function walk(currentDir) {
    if (results.length >= max) return;

    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= max) break;

      if (
        item.name === "node_modules" ||
        item.name === ".git" ||
        item.name === "dist" ||
        item.name === "build" ||
        item.name === ".next"
      ) {
        continue;
      }

      const fullPath = path.join(currentDir, item.name);
      const relativePath = path.relative(projectPath, fullPath);

      if (item.isDirectory()) {
        results.push(relativePath + "/");
        walk(fullPath);
      } else {
        results.push(relativePath);
      }
    }
  }

  walk(startDir);

  return results;
}

export function readFile(filePath) {
  const fullPath = resolveProjectFile(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

export function writeFile(filePath, content) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Missing filePath when writing file.");
  }

  if (content === undefined || content === null) {
    content = "";
  }

  if (typeof content !== "string") {
    content = JSON.stringify(content, null, 2);
  }

  const fullPath = resolveProjectFile(filePath);
  const dir = path.dirname(fullPath);

  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(fullPath, content, {
    encoding: "utf8",
    flag: "w"
  });

  return `File written: ${filePath}`;
}

export function fileExists(filePath) {
  const fullPath = resolveProjectFile(filePath);
  return fs.existsSync(fullPath);
}