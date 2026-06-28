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
    console.log(`Security warning: Attempt to access file outside of project path: ${fullPath}`);
    throw new Error("Accessing files outside PROJECT_PATH is not allowed.");
  }

  return fullPath;
}

export function listFiles(dir = ".", options = {}) {
  const projectPath = requireProjectPath();
  const startDir = resolveProjectFile(dir);

  const results = [];

  const ignored = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".idea",
    ".vscode",
    "coverage"
  ]);

  const max = options.max ?? Infinity;

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= max) {
        return;
      }

      if (ignored.has(item.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory()) {
        walk(fullPath);
        continue;
      }

      results.push(path.relative(projectPath, fullPath));
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

export function writeFile(filePath, content, options = {}) {
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
  const exists = fs.existsSync(fullPath);

  if (exists && !options.overwriteExisting) {
    throw new Error(
      `File already exists: ${filePath}. Use replace_in_file for targeted edits, or pass overwrite_existing only when a full rewrite is intentional.`
    );
  }

  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(fullPath, content, {
    encoding: "utf8",
    flag: "w"
  });

  return `File written: ${filePath}`;
}

export function replaceInFile(filePath, oldContent, newContent, options = {}) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Missing filePath when replacing file content.");
  }

  if (typeof oldContent !== "string" || oldContent.length === 0) {
    throw new Error("old_content must be a non-empty string.");
  }

  if (newContent === undefined || newContent === null) {
    newContent = "";
  }

  if (typeof newContent !== "string") {
    newContent = JSON.stringify(newContent, null, 2);
  }

  const fullPath = resolveProjectFile(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const currentContent = fs.readFileSync(fullPath, "utf8");

  if (!currentContent.includes(oldContent)) {
    throw new Error(`Could not find old_content in file: ${filePath}`);
  }

  const updatedContent = options.replaceAll
    ? currentContent.split(oldContent).join(newContent)
    : currentContent.replace(oldContent, newContent);

  fs.writeFileSync(fullPath, updatedContent, {
    encoding: "utf8",
    flag: "w"
  });

  return `File updated: ${filePath}`;
}

export function fileExists(filePath) {
  const fullPath = resolveProjectFile(filePath);
  return fs.existsSync(fullPath);
}

export function deleteFile(filePath, options = {}) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Missing filePath when deleting file.");
  }

  const fullPath = resolveProjectFile(filePath);

  if (!fs.existsSync(fullPath)) {
    if (options.ignoreMissing) {
      return `File already missing: ${filePath}`;
    }

    throw new Error(`File does not exist: ${filePath}`);
  }

  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    throw new Error(`Path is a directory, not a file: ${filePath}`);
  }

  fs.unlinkSync(fullPath);

  return `File deleted: ${filePath}`;
}
